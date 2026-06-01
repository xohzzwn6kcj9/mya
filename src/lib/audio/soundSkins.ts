// 테마별 음색(sound skin) 데이터 모듈.
// 순수 데이터만 정의 — 부수효과 0, AudioContext 생성 절대 금지.
// themes.ts는 색 균형 보호 파일이므로 수정하지 않고, id(ThemeId) 기반으로 별도 매핑한다.

import type { ThemeId } from '$lib/config/themes';

// 한 테마의 음색 정의.
// wave: 오실레이터 파형 / scale: 반음 오프셋 배열(음계) / attack·decay: 엔벨로프 시간(초)
// detune: 뮤(뮤트 아님, '뮤' 글자) 디튠 폭(cent) / baseFreq: 기준 주파수(Hz)
export interface SoundSkin {
  wave: OscillatorType;
  scale: number[];
  attack: number;
  decay: number;
  detune: number;
  baseFreq: number;
}

// 자주 쓰는 음계(반음 오프셋) — 가독성용 상수.
const MAJOR_PENTATONIC = [0, 2, 4, 7, 9, 12]; // 밝고 따뜻함
const MINOR_PENTATONIC = [0, 3, 5, 7, 10]; // 차갑고 전자적
const SUS_SOFT = [0, 2, 4, 7, 9]; // 부드럽고 맑음
const CALM_SCALE = [0, 2, 5, 7, 9, 12]; // 차분·청량

// 12 테마 전수 매핑.
// allThemeIds: neon, sunset, hologram, pastel, winter, earlySpring, spring,
//              earlySummer, summer, earlyAutumn, autumn, earlyWinter
// ※ themes.ts에 신규 테마 추가 시 이 맵도 갱신해야 함(미갱신이면 soundSkinFor가 DEFAULT_SKIN으로 폴백).
const SKINS: Record<ThemeId, SoundSkin> = {
  // ── 차가운/전자 음색군 ──
  neon: { wave: 'sawtooth', scale: MINOR_PENTATONIC, attack: 0.005, decay: 0.45, detune: 25, baseFreq: 261.63 }, // C4
  hologram: { wave: 'square', scale: SUS_SOFT, attack: 0.008, decay: 0.5, detune: 30, baseFreq: 293.66 }, // D4

  // ── 따뜻한 음색군 (봄/여름/sunset 계열) ──
  sunset: { wave: 'triangle', scale: MAJOR_PENTATONIC, attack: 0.01, decay: 0.7, detune: 12, baseFreq: 261.63 }, // C4
  earlySpring: { wave: 'sine', scale: MAJOR_PENTATONIC, attack: 0.012, decay: 0.7, detune: 10, baseFreq: 277.18 }, // C#4
  spring: { wave: 'sine', scale: MAJOR_PENTATONIC, attack: 0.012, decay: 0.75, detune: 10, baseFreq: 293.66 }, // D4
  earlySummer: { wave: 'triangle', scale: MAJOR_PENTATONIC, attack: 0.01, decay: 0.65, detune: 9, baseFreq: 311.13 }, // D#4
  summer: { wave: 'triangle', scale: MAJOR_PENTATONIC, attack: 0.008, decay: 0.6, detune: 8, baseFreq: 329.63 }, // E4

  // ── 맑은/차분 음색군 (가을/겨울 계열) ──
  earlyAutumn: { wave: 'triangle', scale: CALM_SCALE, attack: 0.01, decay: 0.6, detune: 8, baseFreq: 261.63 }, // C4
  autumn: { wave: 'triangle', scale: CALM_SCALE, attack: 0.012, decay: 0.55, detune: 7, baseFreq: 246.94 }, // B3
  earlyWinter: { wave: 'triangle', scale: CALM_SCALE, attack: 0.014, decay: 0.6, detune: 6, baseFreq: 233.08 }, // A#3
  winter: { wave: 'triangle', scale: CALM_SCALE, attack: 0.014, decay: 0.65, detune: 5, baseFreq: 220.0 }, // A3

  // ── 밝은 파스텔 ──
  pastel: { wave: 'sine', scale: MAJOR_PENTATONIC, attack: 0.01, decay: 0.55, detune: 12, baseFreq: 329.63 }, // E4
};

// 미지정/미지원 테마 id 방어용 기본 음색.
const DEFAULT_SKIN: SoundSkin = {
  wave: 'sine',
  scale: MAJOR_PENTATONIC,
  attack: 0.01,
  decay: 0.6,
  detune: 10,
  baseFreq: 261.63, // C4
};

// themeId → SoundSkin. 미지정 id(테마 추가 후 맵 미갱신)면 DEFAULT_SKIN으로 graceful 폴백.
export function soundSkinFor(themeId: ThemeId): SoundSkin {
  return SKINS[themeId] ?? DEFAULT_SKIN;
}
