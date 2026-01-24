import { themes, seasonIds, baseThemeIds, type SeasonId, type ThemeId, type Theme } from '$lib/config/themes';

// Re-export for convenience
export type { ThemeId, Theme, SeasonId };

// 계절별 날짜 범위 (월-일)
const seasonRanges: Array<{ season: SeasonId; start: [number, number]; end: [number, number] }> = [
  { season: 'winter', start: [1, 1], end: [2, 14] },
  { season: 'earlySpring', start: [2, 15], end: [3, 31] },
  { season: 'spring', start: [4, 1], end: [5, 15] },
  { season: 'earlySummer', start: [5, 16], end: [6, 30] },
  { season: 'summer', start: [7, 1], end: [8, 14] },
  { season: 'earlyAutumn', start: [8, 15], end: [9, 30] },
  { season: 'autumn', start: [10, 1], end: [11, 14] },
  { season: 'earlyWinter', start: [11, 15], end: [12, 31] },
];

// 8계절 내 거리별 확률 (정규분포)
// 거리 0: 60%, 거리 1: 14%, 거리 2: 4%, 거리 3: 1.5%, 거리 4: 1%
const distanceProbabilities = [0.60, 0.14, 0.04, 0.015, 0.01];

/**
 * 현재 날짜로부터 계절 인덱스 반환 (0-7)
 */
export function getCurrentSeasonIndex(date: Date = new Date()): number {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  for (let i = 0; i < seasonRanges.length; i++) {
    const { start, end } = seasonRanges[i];
    const afterStart = month > start[0] || (month === start[0] && day >= start[1]);
    const beforeEnd = month < end[0] || (month === end[0] && day <= end[1]);

    if (afterStart && beforeEnd) {
      return i;
    }
  }

  // 기본값 (도달하지 않음)
  return 0;
}

/**
 * 현재 계절 ID 반환
 */
export function getCurrentSeason(date: Date = new Date()): SeasonId {
  return seasonIds[getCurrentSeasonIndex(date)];
}

/**
 * 두 계절 사이의 거리 계산 (원형, 0-4)
 */
export function getSeasonDistance(index1: number, index2: number): number {
  const diff = Math.abs(index1 - index2);
  return Math.min(diff, 8 - diff); // 원형이므로 최단 거리
}

/**
 * 확률 분배에 따라 테마 선택
 *
 * - 80%: 8계절 테마 (현재 계절 60%, 정규분포)
 * - 10%: 파스텔 팝
 * - 10%: 나머지 3개 (네온, 선셋, 홀로그램) 균등 분배
 */
export function selectTheme(date: Date = new Date()): Theme {
  const rand = Math.random();

  // 10%: 파스텔 팝
  if (rand < 0.10) {
    return themes.pastel;
  }

  // 10%: 나머지 3개 균등 분배 (네온, 선셋, 홀로그램)
  if (rand < 0.20) {
    const otherThemes: ThemeId[] = ['neon', 'sunset', 'hologram'];
    const selectedId = otherThemes[Math.floor(Math.random() * otherThemes.length)];
    return themes[selectedId];
  }

  // 80%: 8계절 테마 (정규분포)
  return selectSeasonTheme(date);
}

/**
 * 8계절 내에서 정규분포에 따라 테마 선택
 */
function selectSeasonTheme(date: Date): Theme {
  const currentIndex = getCurrentSeasonIndex(date);
  const rand = Math.random();

  // 거리별 확률 누적
  // 거리 0: 60%
  // 거리 1: 28% (14% × 2)
  // 거리 2: 8% (4% × 2)
  // 거리 3: 3% (1.5% × 2)
  // 거리 4: 1%

  let cumulative = 0;

  for (let distance = 0; distance <= 4; distance++) {
    // 해당 거리에 있는 계절들 찾기
    const seasonsAtDistance: number[] = [];
    for (let i = 0; i < 8; i++) {
      if (getSeasonDistance(currentIndex, i) === distance) {
        seasonsAtDistance.push(i);
      }
    }

    // 각 계절의 확률
    const probPerSeason = distanceProbabilities[distance];

    for (const seasonIndex of seasonsAtDistance) {
      cumulative += probPerSeason;
      if (rand < cumulative) {
        return themes[seasonIds[seasonIndex]];
      }
    }
  }

  // 기본값 (도달하지 않음)
  return themes[seasonIds[currentIndex]];
}

/**
 * 현재 테마와 다른 테마 선택 (테마 변경 시 사용)
 */
export function selectDifferentTheme(currentThemeId: ThemeId, date: Date = new Date()): Theme {
  let newTheme: Theme;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    newTheme = selectTheme(date);
    attempts++;
  } while (newTheme.id === currentThemeId && attempts < maxAttempts);

  return newTheme;
}

/**
 * 테마 변경 여부 결정 (10% 확률)
 */
export function shouldChangeTheme(): boolean {
  return Math.random() < 0.10;
}
