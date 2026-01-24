// 테마 타입 정의
export interface Theme {
  id: string;
  name: string;
  gradients: string[];
  textColors: string[];
  heartColors: string[];
}

// 계절 타입
export type SeasonId = 'winter' | 'earlySpring' | 'spring' | 'earlySummer' | 'summer' | 'earlyAutumn' | 'autumn' | 'earlyWinter';

// 기본 테마 ID
export type BaseThemeId = 'neon' | 'sunset' | 'hologram' | 'pastel';

// 전체 테마 ID
export type ThemeId = SeasonId | BaseThemeId;

// ============================================
// 기본 테마 (4종)
// ============================================

export const neonTheme: Theme = {
  id: 'neon',
  name: '네온 사이버펑크',
  gradients: [
    'linear-gradient(45deg, #0D0221, #1A0A2E)',
    'linear-gradient(45deg, #0F0F23, #1E1E3F)',
    'linear-gradient(45deg, #150525, #2D1B4E)',
    'radial-gradient(circle, #1A0533, #0D0221)',
  ],
  textColors: [
    '#FF00FF', '#00FFFF', '#FF1493', '#00FF00',
    '#FFFF00', '#FF6600', '#7B68EE', '#00FFCC',
    '#FF3366', '#66FF33',
  ],
  heartColors: [
    '#FF00FF', '#00FFFF', '#FF1493', '#00FF99', '#FFFF00',
  ],
};

export const sunsetTheme: Theme = {
  id: 'sunset',
  name: '선셋 그라데이션',
  gradients: [
    'linear-gradient(45deg, #FF6B35, #F7931A)',
    'linear-gradient(45deg, #FF8E53, #FE6B8B)',
    'linear-gradient(45deg, #F7931A, #FF6B95)',
    'linear-gradient(45deg, #FF6B8B, #9C27B0)',
    'linear-gradient(45deg, #FFA726, #FF7043)',
    'radial-gradient(circle, #FFB347, #FF6B35)',
  ],
  textColors: [
    '#FFFFFF', '#FFF8DC', '#FFE4B5', '#FFFAF0',
    '#8B0000', '#4A0E0E', '#2C1810', '#800020',
  ],
  heartColors: [
    '#00CED1', '#40E0D0', '#7FFFD4', '#FFFFFF', '#E0FFFF',
  ],
};

export const hologramTheme: Theme = {
  id: 'hologram',
  name: '홀로그램 / 오로라',
  gradients: [
    'linear-gradient(45deg, #ff0080, #7928ca, #00d4ff)',
    'linear-gradient(45deg, #00ff87, #60efff, #ff00e5)',
    'linear-gradient(45deg, #7928ca, #ff0080, #ff8c00)',
    'linear-gradient(45deg, #00f5d4, #00bbf9, #9b5de5)',
    'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
    'radial-gradient(circle, #ff0080, #7928ca, #00d4ff)',
  ],
  textColors: [
    '#FF0080', '#7928CA', '#00D4FF', '#00FF87',
    '#FFFF00', '#FF8C00', '#00F5D4', '#F093FB',
    '#5EEAD4', '#C084FC', '#FFFFFF',
  ],
  heartColors: [
    '#FFFFFF', '#FFD700', '#FFF8DC', '#FFFACD',
  ],
};

export const pastelTheme: Theme = {
  id: 'pastel',
  name: '파스텔 팝',
  gradients: [
    'linear-gradient(45deg, #FFF0F5, #F0F8FF)',
    'linear-gradient(45deg, #F0FFF0, #FFFFF0)',
    'linear-gradient(45deg, #F5F0FF, #FFF0F0)',
    'linear-gradient(45deg, #F0FFFF, #FFF5EE)',
    'linear-gradient(45deg, #FFF5E6, #F8F0FF)',
    'radial-gradient(circle, #FFF0F8, #F0FAFF)',
  ],
  textColors: [
    '#FF006E', '#8338EC', '#3A86FF', '#06D6A0',
    '#FFBE0B', '#FB5607', '#E500A4', '#7209B7',
    '#00B4D8', '#2EC4B6',
  ],
  heartColors: [
    '#FF006E', '#8338EC', '#3A86FF', '#FB5607', '#E500A4',
  ],
};

// ============================================
// 8계절 테마
// ============================================

export const winterTheme: Theme = {
  id: 'winter',
  name: '겨울',
  gradients: [
    'linear-gradient(45deg, #F8F9FA, #E3F2FD)',
    'linear-gradient(45deg, #ECEFF1, #CFD8DC)',
    'linear-gradient(45deg, #E8EAF6, #C5CAE9)',
    'linear-gradient(45deg, #FAFAFA, #E0E0E0)',
    'radial-gradient(circle, #FFFFFF, #E3F2FD)',
  ],
  textColors: [
    '#1976D2', '#5C6BC0', '#0D47A1', '#3F51B5',
    '#1565C0', '#7986CB', '#78909C', '#546E7A',
  ],
  heartColors: [
    '#FF69B4', '#FF85A2', '#FFC0CB', '#FF6B8B', '#E91E63',
  ],
};

export const earlySpringTheme: Theme = {
  id: 'earlySpring',
  name: '초봄',
  gradients: [
    'linear-gradient(45deg, #F3E5F5, #E8F5E9)',
    'linear-gradient(45deg, #EDE7F6, #E0F2F1)',
    'linear-gradient(45deg, #FCE4EC, #E8F5E9)',
    'linear-gradient(45deg, #F8BBD9, #C8E6C9)',
    'radial-gradient(circle, #F3E5F5, #E8F5E9)',
  ],
  textColors: [
    '#9575CD', '#4DB6AC', '#7E57C2', '#26A69A',
    '#AB47BC', '#66BB6A', '#8E24AA', '#43A047',
  ],
  heartColors: [
    '#FF69B4', '#FF6B8B', '#E91E63', '#FF85A2', '#F06292',
  ],
};

export const springTheme: Theme = {
  id: 'spring',
  name: '봄',
  gradients: [
    'linear-gradient(45deg, #FFE4EC, #E8F5E9)',
    'linear-gradient(45deg, #FFEEF8, #F0FFF4)',
    'linear-gradient(45deg, #FFF0F5, #F5FFF0)',
    'linear-gradient(45deg, #FFE8F0, #E0F8E0)',
    'radial-gradient(circle, #FFE4EC, #F0FFF4)',
  ],
  textColors: [
    '#FF69B4', '#FFB7C5', '#98D8AA', '#FF85A2',
    '#7CB342', '#E91E63', '#4CAF50', '#F8BBD9',
  ],
  heartColors: [
    '#E91E63', '#D81B60', '#C2185B', '#FF1744', '#F50057',
  ],
};

export const earlySummerTheme: Theme = {
  id: 'earlySummer',
  name: '초여름',
  gradients: [
    'linear-gradient(45deg, #E0F7FA, #F1F8E9)',
    'linear-gradient(45deg, #B2EBF2, #DCEDC8)',
    'linear-gradient(45deg, #E0F2F1, #F0FFF0)',
    'linear-gradient(45deg, #B2DFDB, #C5E1A5)',
    'radial-gradient(circle, #E0F7FA, #F1F8E9)',
  ],
  textColors: [
    '#00ACC1', '#7CB342', '#26C6DA', '#8BC34A',
    '#00897B', '#43A047', '#0097A7', '#689F38',
  ],
  heartColors: [
    '#FF69B4', '#FF6B8B', '#FF8A65', '#E91E63', '#FF7043',
  ],
};

export const summerTheme: Theme = {
  id: 'summer',
  name: '여름',
  gradients: [
    'linear-gradient(45deg, #E0F7FA, #B2EBF2)',
    'linear-gradient(45deg, #B3E5FC, #4FC3F7)',
    'linear-gradient(45deg, #E1F5FE, #81D4FA)',
    'linear-gradient(45deg, #00BCD4, #0097A7)',
    'radial-gradient(circle, #E0F7FA, #80DEEA)',
  ],
  textColors: [
    '#00CED1', '#FFD700', '#FF6347', '#00BFFF',
    '#FF4500', '#20B2AA', '#FF8C00', '#1E90FF',
  ],
  heartColors: [
    '#FF6347', '#FF7043', '#FF8A65', '#FF69B4', '#FFA726',
  ],
};

export const earlyAutumnTheme: Theme = {
  id: 'earlyAutumn',
  name: '초가을',
  gradients: [
    'linear-gradient(45deg, #E0F7FA, #FFF8E1)',
    'linear-gradient(45deg, #B2EBF2, #FFE0B2)',
    'linear-gradient(45deg, #E0F2F1, #FFF3E0)',
    'linear-gradient(45deg, #B2DFDB, #FFCC80)',
    'radial-gradient(circle, #E0F7FA, #FFF8E1)',
  ],
  textColors: [
    '#26A69A', '#FFB74D', '#00ACC1', '#FF8A65',
    '#009688', '#FFA726', '#0097A7', '#FF7043',
  ],
  heartColors: [
    '#E91E63', '#FF69B4', '#D81B60', '#FF1744', '#C2185B',
  ],
};

export const autumnTheme: Theme = {
  id: 'autumn',
  name: '가을',
  gradients: [
    'linear-gradient(45deg, #FFF3E0, #FFE0B2)',
    'linear-gradient(45deg, #FFECB3, #FFD54F)',
    'linear-gradient(45deg, #FFE4C4, #FFCC80)',
    'linear-gradient(45deg, #FFF8E1, #FFCA28)',
    'radial-gradient(circle, #FFF3E0, #FFCC80)',
  ],
  textColors: [
    '#FF6B35', '#8B4513', '#D84315', '#BF360C',
    '#795548', '#FF8F00', '#6D4C41', '#E65100',
  ],
  heartColors: [
    '#00CED1', '#26A69A', '#4DB6AC', '#00ACC1', '#009688',
  ],
};

export const earlyWinterTheme: Theme = {
  id: 'earlyWinter',
  name: '초겨울',
  gradients: [
    'linear-gradient(45deg, #EFEBE9, #ECEFF1)',
    'linear-gradient(45deg, #D7CCC8, #CFD8DC)',
    'linear-gradient(45deg, #FFF8E1, #E8EAF6)',
    'linear-gradient(45deg, #BCAAA4, #B0BEC5)',
    'radial-gradient(circle, #EFEBE9, #ECEFF1)',
  ],
  textColors: [
    '#8D6E63', '#78909C', '#A1887F', '#607D8B',
    '#6D4C41', '#546E7A', '#5D4037', '#455A64',
  ],
  heartColors: [
    '#FF69B4', '#FF6B8B', '#E91E63', '#FF8A65', '#F06292',
  ],
};

// ============================================
// 테마 맵
// ============================================

export const themes: Record<ThemeId, Theme> = {
  // 기본 테마
  neon: neonTheme,
  sunset: sunsetTheme,
  hologram: hologramTheme,
  pastel: pastelTheme,
  // 계절 테마
  winter: winterTheme,
  earlySpring: earlySpringTheme,
  spring: springTheme,
  earlySummer: earlySummerTheme,
  summer: summerTheme,
  earlyAutumn: earlyAutumnTheme,
  autumn: autumnTheme,
  earlyWinter: earlyWinterTheme,
};

// 계절 테마 ID 배열 (순서대로)
export const seasonIds: SeasonId[] = [
  'winter', 'earlySpring', 'spring', 'earlySummer',
  'summer', 'earlyAutumn', 'autumn', 'earlyWinter',
];

// 기본 테마 ID 배열
export const baseThemeIds: BaseThemeId[] = ['neon', 'sunset', 'hologram', 'pastel'];

// 전체 테마 ID 배열
export const allThemeIds: ThemeId[] = [...baseThemeIds, ...seasonIds];
