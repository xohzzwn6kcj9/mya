// 먀의 목소리 — 탭 시 글자 하나당 짧은 음 1개를 재생한다.
// 오디오 정책: AudioContext는 F0(audio.ts)가 첫 제스처에서만 lazy 생성하며,
//   여기서는 getAudioContext()가 이미 만들어진 컨텍스트(또는 null)를 받아 쓰기만 한다.
//   null이면 즉시 return → SSR/미탭 테스트(render-only) graceful.
// 물리/렌더는 일절 건드리지 않는 순수 부수효과(소리)만 담당한다.

import { get } from 'svelte/store';
import { getAudioContext, getMasterGain, muted } from './audio';
import type { SoundSkin } from './soundSkins';
import { FONT_SIZE_MIN, FONT_SIZE_MAX } from '$lib/constants';

// '사랑해' 전용 숨은 멜로디 (4음 아르페지오, MIDI 음정 → 주파수). 개인정보 아님.
const LOVE_MELODY_MIDI = [60, 64, 67, 72]; // C E G C' (장3화음 + 옥타브)
const LOVE_NOTE_DURATION_S = 0.16; // 각 음 길이
const LOVE_NOTE_GAP_S = 0.11; // 음 시작 간격 (살짝 겹쳐 레가토)
const LOVE_PEAK_GAIN = 0.18; // 멜로디 피크 게인 (letter voice와 동일하게 낮게)
const LOVE_VIBRATE_PATTERN = [60, 40, 60]; // navigator.vibrate 패턴

// MIDI 음정 → 주파수(Hz). 69 = A4 = 440Hz 기준.
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 한 글자의 음을 결정하는 입력값.
export interface LetterVoiceOpts {
  colorIndex: number; // 음정의 degree 선택에 사용
  fontSize: number; // 글자 크기 → 옥타브 매핑 (작을수록 높은 옥타브)
  positionX: number; // 0~100(%) → 스테레오 팬 -1~1
  showMyu: boolean; // '뮤' 글자면 detune으로 약간 다른 톤
}

// 0~1 클램프.
function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

// 스테레오 팬 -1~1 클램프.
function clampPan(v: number): number {
  if (v < -1) return -1;
  if (v > 1) return 1;
  return v;
}

// 글자 하나의 목소리를 재생한다. 컨텍스트가 없거나 예외면 조용히 무음.
export function playLetterVoice(opts: LetterVoiceOpts, skin: SoundSkin): void {
  const audio = getAudioContext();
  if (!audio) return; // SSR/미지원/미탭 → 무음 graceful

  try {
    const master = getMasterGain();
    if (!master) return; // masterGain 미생성 시 연결 대상 없음 → 무음

    // ── 음정 계산 ──
    // colorIndex를 음계 degree로 (음수/초과 안전).
    const degree = ((opts.colorIndex % skin.scale.length) + skin.scale.length) % skin.scale.length;
    const semi = skin.scale[degree];
    // 글자 크기 → 옥타브: 작은 글자 +1, 큰 글자 -1 (작을수록 높게).
    const t = (opts.fontSize - FONT_SIZE_MIN) / (FONT_SIZE_MAX - FONT_SIZE_MIN);
    const octave = Math.round((1 - clamp01(t)) * 2) - 1;
    const freq = skin.baseFreq * Math.pow(2, (semi + octave * 12) / 12);

    // ── 노드 체인: osc → gain → panner → masterGain ──
    const osc = audio.createOscillator();
    osc.type = skin.wave;
    const gain = audio.createGain();
    const panner = audio.createStereoPanner();
    panner.pan.value = clampPan((opts.positionX / 100) * 2 - 1);

    // 뮤('뮤')는 detune으로 약간 다른 톤 — 먀/뮤 음색 분리.
    osc.detune.value = opts.showMyu ? skin.detune : 0;

    osc.connect(gain).connect(panner).connect(master);

    // ── 엔벨로프(지수 감쇠) ──
    const now = audio.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    const peak = 0.18; // 동시 최대 6음 합산 클리핑 방지용 낮은 피크
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + skin.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + skin.attack + skin.decay);

    // ── 수명 + 노드 정리 ──
    osc.start(now);
    osc.stop(now + skin.attack + skin.decay + 0.05);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
        panner.disconnect();
      } catch {
        // 정리 실패는 무시 (이미 끊긴 노드 등)
      }
    };
  } catch {
    // 오디오 미지원/예외 graceful degrade — 소리만 안 남
  }
}

// '사랑해'(special) 메시지가 뜬 탭에서만 재생되는 숨은 멜로디.
// playLetterVoice와 동일한 인프라(getAudioContext/getMasterGain) 위에 데이터만 얹는다.
// 뮤트는 masterGain에서 처리되므로 별도 게이트 없이 라우팅만 하면 되고,
// navigator.vibrate만 master 버스를 거치지 않으므로 muted 스토어로 따로 가드한다.
// 컨텍스트 null(SSR/미지원/미탭)/예외 시 무음·무진동 graceful.
export function playLoveMelody(skin: SoundSkin): void {
  const audio = getAudioContext();
  if (!audio) return; // SSR/미지원/미탭 → 무음 graceful

  try {
    const master = getMasterGain();
    if (!master) return; // masterGain 미생성 시 연결 대상 없음 → 무음

    // AudioParam 스케줄(setTimeout 체인 아님) — 탭 백그라운드 전환에도 시퀀스가 살아남고
    // 동기 실행이라 테스트에도 안전하다. 음색은 현재 테마 음색(skin.wave)을 따른다.
    const t0 = audio.currentTime;
    LOVE_MELODY_MIDI.forEach((midi, i) => {
      const start = t0 + i * LOVE_NOTE_GAP_S;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = skin.wave;
      osc.frequency.setValueAtTime(midiToFreq(midi), start);

      // 짧은 엔벨로프: 빠른 attack, 부드러운 지수 release.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(LOVE_PEAK_GAIN, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + LOVE_NOTE_DURATION_S);

      osc.connect(gain).connect(master);
      osc.start(start);
      osc.stop(start + LOVE_NOTE_DURATION_S + 0.05);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // 정리 실패는 무시 (이미 끊긴 노드 등)
        }
      };
    });

    // 햅틱: master 버스를 안 거치므로 뮤트 시 진동도 멈춘다 (vibrate 미지원이면 no-op).
    if (!get(muted) && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(LOVE_VIBRATE_PATTERN);
    }
  } catch {
    // 오디오 미지원/컨텍스트 실패 시 무음으로 degrade (정책: graceful)
  }
}
