// 먀-머지 게임 합성 트리 — 순수 로직 (DOM·전역 랜덤 없음, RNG는 주입받는다).
//
// 트리:
//   1글자(탄약):  먀 · 뮤
//   2글자:        먀+먀→먀아 · 뮤+뮤→뮤우
//   3글자(종착):  먀아+먀아 또는 뮤우+뮤우 → 🎲 15% 사랑해(WIN) / 85% 꽝(평범한 3글자)
//
// 매칭은 '완전히 같은 글자'만. 다른 글자·다른 단계는 합쳐지지 않고(호출부에서 튕김),
// 3글자는 종착이라 더 합쳐지지 않는다.

import { LOVE_VARIANTS, DIALECT_VARIANTS, pickVariantIndex } from '$lib/config/myaLexicon';
import { LOVE_WIN_PROBABILITY } from './constants';

// 0 이상 1 미만을 돌려주는 난수원. 기본은 Math.random, 테스트는 결정론적 스텁을 주입한다.
export type Rng = () => number;

// 1글자 탄약 (빈 곳 탭 시 생성)
export const BASE_WORDS: readonly string[] = ['먀', '뮤'];

// 1글자 → 2글자 (계열별 승급)
const TIER2_OF: Readonly<Record<string, string>> = { 먀: '먀아', 뮤: '뮤우' };
const TIER2_WORDS: ReadonlySet<string> = new Set(Object.values(TIER2_OF)); // 먀아 · 뮤우

// 최상위 합성 결과 풀
export const WIN_WORDS: readonly string[] = LOVE_VARIANTS.map((v) => v.text); // 사랑해 · 사랑뮤
export const CONSOLATION_WORDS: readonly string[] = [
  '뭘알뮤',
  ...DIALECT_VARIANTS.map((v) => v.text), // 괜찮뮤 · 이쁘뮤 · 바부뮤 · 나만믿뮤
];

export interface MergeOutcome {
  text: string;
  tier: 2 | 3;
  isWin: boolean; // 사랑해(또는 사랑뮤) — 승리 연출 트리거
}

// 글자의 단계 (1 / 2 / 3). 알 수 없는 글자는 종착(3)으로 취급한다.
export function tierOf(text: string): 1 | 2 | 3 {
  if (BASE_WORDS.includes(text)) return 1;
  if (TIER2_WORDS.has(text)) return 2;
  return 3;
}

function uniformText(pool: readonly string[], rng: Rng): string {
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

// 최상위 합성 주사위: 15% 사랑해(WIN) / 85% 꽝. WIN은 가중 추첨(사랑해 우세), 꽝은 균등.
export function rollTier3(rng: Rng = Math.random): MergeOutcome {
  if (rng() < LOVE_WIN_PROBABILITY) {
    return { text: LOVE_VARIANTS[pickVariantIndex(LOVE_VARIANTS, rng)].text, tier: 3, isWin: true };
  }
  return { text: uniformText(CONSOLATION_WORDS, rng), tier: 3, isWin: false };
}

// 두 글자를 합친 결과. 합쳐지지 않으면 null(호출부는 기존 물리로 튕긴다).
export function mergeResult(a: string, b: string, rng: Rng = Math.random): MergeOutcome | null {
  if (a !== b) return null; // 완전히 같은 글자만 합쳐진다
  const promoted = TIER2_OF[a];
  if (promoted) return { text: promoted, tier: 2, isWin: false }; // 1글자 → 2글자
  if (TIER2_WORDS.has(a)) return rollTier3(rng); // 2글자 → 3글자(주사위)
  return null; // 3글자(종착) 또는 미지의 글자
}

// 빈 곳 탭 시 생성할 1글자 탄약 하나.
export function randomBaseWord(rng: Rng = Math.random): string {
  return uniformText(BASE_WORDS, rng);
}
