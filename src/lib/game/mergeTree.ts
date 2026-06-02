// 먀-머지 게임 합성 트리 — 순수 로직 (DOM·전역 랜덤 없음, RNG는 주입받는다).
//
// 트리 (매칭은 '같은 계열·같은 단계'. 표시 글자는 계열·단계별 베이스 풀에서 랜덤 + 마크):
//   1글자(탄약):  먀 계열[먀]            · 뮤 계열[뮤]
//   2글자:        먀 계열[먀아·먀먀]      · 뮤 계열[뮤우·뮤뮤]
//   3글자(종착):  먀아+먀먀 등 같은 계열 2글자 둘 → 🎲 15% 사랑해(WIN) / 85% 꽝
// 같은 계열의 2글자 변형은 서로 합쳐진다(먀아+먀먀 ✓). 계열·단계가 다르면 튕긴다.
// 마크(! ?)는 표시용 랜덤 장식이라 매칭에 영향 없다(먀! 와 먀? 는 합쳐진다). 3글자는 종착.

import { LOVE_VARIANTS, DIALECT_VARIANTS, pickVariantIndex } from '$lib/config/myaLexicon';
import { LOVE_WIN_PROBABILITY } from './constants';

// 0 이상 1 미만을 돌려주는 난수원. 기본은 Math.random, 테스트는 결정론적 스텁을 주입한다.
export type Rng = () => number;

export type Lineage = 'mya' | 'myu';
export const LINEAGES: readonly Lineage[] = ['mya', 'myu'];

// 계열·단계별 표시 베이스 (마크는 marksFor로 따로 부착)
const BASES: Record<Lineage, { 1: readonly string[]; 2: readonly string[] }> = {
  mya: { 1: ['먀'], 2: ['먀아', '먀먀'] },
  myu: { 1: ['뮤'], 2: ['뮤우', '뮤뮤'] }
};

// 최상위(3글자) 결과 풀
export const WIN_WORDS: readonly string[] = LOVE_VARIANTS.map((v) => v.text); // 사랑해 · 사랑뮤
export const CONSOLATION_WORDS: readonly string[] = [
  '뭘알뮤',
  ...DIALECT_VARIANTS.map((v) => v.text) // 괜찮뮤 · 이쁘뮤 · 바부뮤 · 나만믿뮤
];

// 마크: 없음 / ! / ? 중 하나 (한 글자당 최대 1개)
const MARK_NONE_PROB = 0.4; // 40% 없음, 30% ! , 30% ?
export function marksFor(rng: Rng = Math.random): string {
  const r = rng();
  if (r < MARK_NONE_PROB) return '';
  return r < MARK_NONE_PROB + (1 - MARK_NONE_PROB) / 2 ? '!' : '?';
}

function pick<T>(pool: readonly T[], rng: Rng): T {
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

export interface MergeOutcome {
  lineage: Lineage | null; // 3글자(종착)는 계열 무관 → null
  tier: 2 | 3;
  base: string; // 마크 없는 표시 베이스
  isWin: boolean; // 사랑해(또는 사랑뮤) — 승리 연출 트리거
}

// 빈 곳 탭 시 생성할 1글자 계열 하나.
export function randomLineage(rng: Rng = Math.random): Lineage {
  return pick(LINEAGES, rng);
}

// 계열·단계의 표시 베이스 하나 (스폰·머지 결과 표시용).
export function baseFor(lineage: Lineage, tier: 1 | 2, rng: Rng = Math.random): string {
  return pick(BASES[lineage][tier], rng);
}

// 최상위 합성 주사위: 15% 사랑해(WIN) / 85% 꽝. WIN은 가중 추첨(사랑해 우세), 꽝은 균등.
export function rollTier3(rng: Rng = Math.random): MergeOutcome {
  if (rng() < LOVE_WIN_PROBABILITY) {
    return { lineage: null, tier: 3, base: WIN_WORDS[pickVariantIndex(LOVE_VARIANTS, rng)], isWin: true };
  }
  return { lineage: null, tier: 3, base: pick(CONSOLATION_WORDS, rng), isWin: false };
}

// 두 글자(계열·단계)를 합친 결과. 같은 계열·같은 단계만 합쳐지고, 아니면 null(호출부는 튕김).
// 3글자(tier 3, lineage null)는 종착이라 합쳐지지 않는다.
export function mergeResult(
  aLineage: Lineage | null,
  aTier: 1 | 2 | 3,
  bLineage: Lineage | null,
  bTier: 1 | 2 | 3,
  rng: Rng = Math.random
): MergeOutcome | null {
  if (aLineage !== bLineage || aTier !== bTier) return null; // 같은 계열·같은 단계만
  if (aLineage && aTier === 1) return { lineage: aLineage, tier: 2, base: baseFor(aLineage, 2, rng), isWin: false };
  if (aLineage && aTier === 2) return rollTier3(rng); // 2글자 둘 → 3글자(주사위)
  return null; // 3글자(종착) 또는 계열 불명
}
