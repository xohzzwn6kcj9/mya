// 먀-사전 / 사투리 어휘 데이터.
//
// 둘만의 언어 "먀/뮤"의 실제 변형 폼과 뜻. 의성어·애교어미·일반 호칭뿐이라
// 외부인이 의미를 추측하기 어렵고 식별 정보(실명/주소/사건)는 0건 — public repo 안전.
// (생성 로직과 롱프레스 뜻풀이가 같은 이 데이터를 공유해 form↔meaning 1:1 매핑)
//
// 물리 안정성: 모든 표시 폼은 기존 '사랑해'(3글자)와 같은 3글자 이하로 유지해
// 충돌 박스 계산(TEXT_WIDTH_RATIO)을 그대로 쓴다.

export interface MyaVariant {
  text: string; // 화면 표시 폼
  weight: number; // 생성 가중치 (실제 카톡 빈도 기반 상대값)
  meaning: string; // 먀-사전 뜻 (롱프레스 시 표시 — 짧게)
}

// 먀 계열 — 밝은 톤의 부름·감탄
export const MYA_VARIANTS: MyaVariant[] = [
  { text: '먀', weight: 1.0, meaning: '둘만의 기본 부름말·대답' },
  { text: '먀아', weight: 0.6, meaning: '늘여 부르는 다정한 코맹맹이 부름' },
  { text: '먀먀', weight: 0.12, meaning: '받아치는 메아리, 가벼운 깐죽' },
  { text: '먀먀먀', weight: 0.1, meaning: '신나서 쏟아내는 들뜬 부름' },
  { text: '먀아아', weight: 0.05, meaning: '벅참·감격이 터지는 외침' },
  { text: '먀앙', weight: 0.06, meaning: '응석 섞인 애교 부름' },
];

// 뮤 계열 — 먀의 짝꿍, 무르고 칭얼대는 톤
export const MYU_VARIANTS: MyaVariant[] = [
  { text: '뮤', weight: 0.5, meaning: '먀의 짝꿍, 나직한 보챔' },
  { text: '뮤우', weight: 0.4, meaning: '늘인 칭얼·반가움 (느낌표와 한 몸)' },
  { text: '뮤뮤', weight: 0.1, meaning: '장난·삐짐의 들뜬 부름' },
  { text: '뮤뮤뮤', weight: 0.06, meaning: '토라짐·투정 (길수록 강도↑)' },
  { text: '뮤웅', weight: 0.05, meaning: '둥글게 수긍하는 칭얼' },
];

// 사랑해 계열 — 쿠키 보유자에게만 뜨는 숨은 메시지
export const LOVE_VARIANTS: MyaVariant[] = [
  { text: '사랑해', weight: 0.6, meaning: '사랑해' },
  { text: '사랑뮤', weight: 0.4, meaning: "'사랑해'의 둘만의 사투리 (X뮤 어미)" },
];

// 카테고리 선택자 (기존 showMyu/showSpecialMessage 분기와 매핑)
export function variantsFor(showSpecialMessage: boolean, showMyu: boolean): MyaVariant[] {
  if (showSpecialMessage) return LOVE_VARIANTS;
  return showMyu ? MYU_VARIANTS : MYA_VARIANTS;
}

// 가중치 기반 변형 추첨 → 인덱스
export function pickVariantIndex(variants: MyaVariant[]): number {
  const total = variants.reduce((s, v) => s + v.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < variants.length; i++) {
    r -= variants[i].weight;
    if (r < 0) return i;
  }
  return 0;
}
