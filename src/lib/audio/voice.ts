// 먀의 목소리 — 탭 시 글자 하나당 짧은 음 1개를 재생한다.
// 오디오 정책: AudioContext는 F0(audio.ts)가 첫 제스처에서만 lazy 생성하며,
//   여기서는 getAudioContext()가 이미 만들어진 컨텍스트(또는 null)를 받아 쓰기만 한다.
//   null이면 즉시 return → SSR/미탭 테스트(render-only) graceful.
// 물리/렌더는 일절 건드리지 않는 순수 부수효과(소리)만 담당한다.

import { getAudioContext, getMasterGain } from './audio';
import type { SoundSkin } from './soundSkins';
import { FONT_SIZE_MIN, FONT_SIZE_MAX } from '$lib/constants';

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
