// 먀-머지 게임 (/play) 전용 튜너블. 메인 화면 상수($lib/constants)와 분리한다.

// 최상위 합성(2글자+2글자)에서 '사랑해'(WIN)가 나올 확률. 나머지는 꽝(평범한 3글자).
export const LOVE_WIN_PROBABILITY = 0.15;

// 꽝 3글자가 화면에 잠깐 보였다 사라지기까지(ms). 종착 조각이 보드를 막지 않게 한다.
export const CONSOLATION_FADE_MS = 1200;

// 단계별 글자 크기(vh) — 합칠수록 커져 진행이 한눈에 보인다. tierOf() 결과(1/2/3)로 인덱싱.
export const FONT_SIZE_BY_TIER: Record<1 | 2 | 3, number> = { 1: 10, 2: 15, 3: 20 };
