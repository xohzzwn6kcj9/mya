import { describe, test, expect } from 'vitest';
import {
  mergeResult,
  rollTier3,
  tierOf,
  randomBaseWord,
  BASE_WORDS,
  WIN_WORDS,
  CONSOLATION_WORDS,
} from './mergeTree';

// 결정론적 RNG 스텁: 주어진 값들을 순서대로 반환(소진되면 마지막 값 반복).
const seq = (...vals: number[]): (() => number) => {
  let i = 0;
  return () => vals[Math.min(i++, vals.length - 1)];
};
const constant = (v: number) => () => v;

describe('tierOf', () => {
  test('1글자 = tier 1', () => {
    expect(tierOf('먀')).toBe(1);
    expect(tierOf('뮤')).toBe(1);
  });
  test('2글자 = tier 2', () => {
    expect(tierOf('먀아')).toBe(2);
    expect(tierOf('뮤우')).toBe(2);
  });
  test('3글자(승리/꽝) = tier 3', () => {
    expect(tierOf('사랑해')).toBe(3);
    expect(tierOf('뭘알뮤')).toBe(3);
  });
});

describe('mergeResult — 1글자 → 2글자', () => {
  test('먀 + 먀 → 먀아', () => {
    expect(mergeResult('먀', '먀', constant(0))).toEqual({ text: '먀아', tier: 2, isWin: false });
  });
  test('뮤 + 뮤 → 뮤우', () => {
    expect(mergeResult('뮤', '뮤', constant(0))).toEqual({ text: '뮤우', tier: 2, isWin: false });
  });
});

describe('mergeResult — 합쳐지지 않으면 null', () => {
  test('다른 글자', () => {
    expect(mergeResult('먀', '뮤', constant(0))).toBeNull();
  });
  test('다른 계열 2글자', () => {
    expect(mergeResult('먀아', '뮤우', constant(0))).toBeNull();
  });
  test('다른 단계', () => {
    expect(mergeResult('먀', '먀아', constant(0))).toBeNull();
  });
  test('3글자(종착)는 더 합쳐지지 않음', () => {
    expect(mergeResult('사랑해', '사랑해', constant(0))).toBeNull();
    expect(mergeResult('뭘알뮤', '뭘알뮤', constant(0))).toBeNull();
  });
});

describe('mergeResult — 2글자 → 3글자 (주사위)', () => {
  test('운 좋으면 사랑해(WIN)', () => {
    const r = mergeResult('먀아', '먀아', constant(0.1)); // < 0.15
    expect(r).not.toBeNull();
    expect(r!.tier).toBe(3);
    expect(r!.isWin).toBe(true);
    expect(WIN_WORDS).toContain(r!.text);
  });
  test('운 나쁘면 꽝(평범한 3글자)', () => {
    const r = mergeResult('뮤우', '뮤우', constant(0.9)); // >= 0.15
    expect(r).not.toBeNull();
    expect(r!.tier).toBe(3);
    expect(r!.isWin).toBe(false);
    expect(CONSOLATION_WORDS).toContain(r!.text);
  });
  test('먀 계열·뮤 계열 모두 같은 주사위로 들어감', () => {
    expect(mergeResult('먀아', '먀아', constant(0.05))!.isWin).toBe(true);
    expect(mergeResult('뮤우', '뮤우', constant(0.05))!.isWin).toBe(true);
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
  test('WIN 단어 가중 추첨 — 사랑해/사랑뮤 모두 도달 가능', () => {
    expect(rollTier3(seq(0.0, 0.0)).text).toBe('사랑해'); // 첫 가중치(사랑해)
    expect(rollTier3(seq(0.0, 0.999)).text).toBe('사랑뮤'); // 마지막 가중치(사랑뮤)
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

describe('randomBaseWord', () => {
  test('rng로 먀/뮤 결정', () => {
    expect(randomBaseWord(constant(0))).toBe('먀');
    expect(randomBaseWord(constant(0.99))).toBe('뮤');
  });
  test('항상 BASE_WORDS 중 하나', () => {
    expect(BASE_WORDS).toContain(randomBaseWord(constant(0.5)));
  });
});
