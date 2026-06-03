import { describe, test, expect } from 'vitest';
import {
  mergeResult,
  rollTier3,
  baseFor,
  marksFor,
  randomLineage,
  LINEAGES,
  WIN_WORDS,
  CONSOLATION_WORDS
} from './mergeTree';

// 결정론적 RNG 스텁: 주어진 값들을 순서대로 반환(소진되면 마지막 값 반복).
const seq = (...vals: number[]): (() => number) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};
const constant = (v: number) => () => v;

describe('randomLineage', () => {
  test('rng로 mya/myu 결정', () => {
    expect(randomLineage(constant(0))).toBe('mya');
    expect(randomLineage(constant(0.99))).toBe('myu');
  });
  test('항상 LINEAGES 중 하나', () => {
    expect(LINEAGES).toContain(randomLineage(constant(0.5)));
  });
});

describe('baseFor — 계열·단계별 표시 베이스', () => {
  test('1글자는 계열 기본형 (뮤 계열은 뮤·뮷)', () => {
    expect(baseFor('mya', 1, constant(0))).toBe('먀');
    expect(baseFor('myu', 1, constant(0))).toBe('뮤');
    expect(baseFor('myu', 1, constant(0.99))).toBe('뮷');
  });
  test('2글자는 계열별 변형 중 하나 (뮤 계열은 뮤우·뮤뮤·쁫뮤)', () => {
    expect(baseFor('mya', 2, constant(0))).toBe('먀아');
    expect(baseFor('mya', 2, constant(0.99))).toBe('먀먀');
    expect(baseFor('myu', 2, constant(0))).toBe('뮤우');
    expect(baseFor('myu', 2, constant(0.5))).toBe('뮤뮤');
    expect(baseFor('myu', 2, constant(0.99))).toBe('쁫뮤');
  });
});

describe('marksFor — 없음/!/? (한 글자당 최대 1개)', () => {
  test('확률 구간 (40% 없음 / 30% ! / 30% ?)', () => {
    expect(marksFor(constant(0))).toBe('');
    expect(marksFor(constant(0.39))).toBe('');
    expect(marksFor(constant(0.4))).toBe('!');
    expect(marksFor(constant(0.69))).toBe('!');
    expect(marksFor(constant(0.7))).toBe('?');
    expect(marksFor(constant(0.99))).toBe('?');
  });
  test('항상 빈문자열·!·? 중 하나', () => {
    expect(['', '!', '?']).toContain(marksFor(constant(0.55)));
  });
});

describe('mergeResult — 1글자 → 2글자 (같은 계열)', () => {
  test('먀+먀 → 먀 계열 2글자', () => {
    const r = mergeResult('mya', 1, 'mya', 1, constant(0));
    expect(r).toEqual({ lineage: 'mya', tier: 2, base: '먀아', isWin: false });
  });
  test('먀+먀 변형도 가능 (먀먀)', () => {
    expect(mergeResult('mya', 1, 'mya', 1, constant(0.99))!.base).toBe('먀먀');
  });
  test('뮤+뮤 → 뮤 계열 2글자', () => {
    expect(mergeResult('myu', 1, 'myu', 1, constant(0))).toEqual({ lineage: 'myu', tier: 2, base: '뮤우', isWin: false });
  });
});

describe('mergeResult — 합쳐지지 않으면 null', () => {
  test('다른 계열 (먀 vs 뮤)', () => {
    expect(mergeResult('mya', 1, 'myu', 1, constant(0))).toBeNull();
    expect(mergeResult('mya', 2, 'myu', 2, constant(0))).toBeNull();
  });
  test('다른 단계 (1글자 vs 2글자)', () => {
    expect(mergeResult('mya', 1, 'mya', 2, constant(0))).toBeNull();
  });
  test('3글자(종착)는 더 합쳐지지 않음', () => {
    expect(mergeResult(null, 3, null, 3, constant(0))).toBeNull();
  });
});

describe('mergeResult — 2글자 → 3글자 (주사위, 계열 무관 결과)', () => {
  test('같은 계열 2글자 둘이면 발동 (먀아+먀먀도 같은 먀 계열)', () => {
    const win = mergeResult('mya', 2, 'mya', 2, constant(0.1)); // < 0.15
    expect(win).not.toBeNull();
    expect(win!.tier).toBe(3);
    expect(win!.isWin).toBe(true);
    expect(WIN_WORDS).toContain(win!.base);
  });
  test('운 나쁘면 꽝(평범한 3글자)', () => {
    const lose = mergeResult('myu', 2, 'myu', 2, constant(0.9)); // >= 0.15
    expect(lose!.tier).toBe(3);
    expect(lose!.isWin).toBe(false);
    expect(CONSOLATION_WORDS).toContain(lose!.base);
  });
  test('먀 계열·뮤 계열 모두 같은 주사위로 들어감', () => {
    expect(mergeResult('mya', 2, 'mya', 2, constant(0.05))!.isWin).toBe(true);
    expect(mergeResult('myu', 2, 'myu', 2, constant(0.05))!.isWin).toBe(true);
  });
});

describe('rollTier3 — 확률 경계 (LOVE_WIN_PROBABILITY = 0.15)', () => {
  test('0.15 미만은 WIN', () => {
    expect(rollTier3(constant(0.149)).isWin).toBe(true);
  });
  test('0.15 이상은 꽝', () => {
    expect(rollTier3(constant(0.15)).isWin).toBe(false);
    expect(rollTier3(constant(0.151)).isWin).toBe(false);
  });
  test('WIN 베이스 가중 추첨 — 사랑해/사랑뮤 모두 도달 가능', () => {
    expect(rollTier3(seq(0.0, 0.0)).base).toBe('사랑해'); // 첫 가중치(사랑해)
    expect(rollTier3(seq(0.0, 0.999)).base).toBe('사랑뮤'); // 마지막 가중치(사랑뮤)
  });
  test('3글자 결과는 계열 무관(null)', () => {
    expect(rollTier3(constant(0.1)).lineage).toBeNull();
    expect(rollTier3(constant(0.9)).lineage).toBeNull();
  });
});

describe('결과 풀 구성', () => {
  test('꽝 풀 = 뭘알뮤 + 사투리 4개', () => {
    expect(CONSOLATION_WORDS).toEqual(
      expect.arrayContaining(['뭘알뮤', '괜찮뮤', '이쁘뮤', '바부뮤', '나만믿뮤'])
    );
    expect(CONSOLATION_WORDS).toHaveLength(5);
  });
  test('WIN 풀 = 사랑해·사랑뮤', () => {
    expect(WIN_WORDS).toEqual(['사랑해', '사랑뮤']);
  });
});
