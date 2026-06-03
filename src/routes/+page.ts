// 루트(/)를 정적 파일로 프리렌더 → 크롤러(카톡 등)가 JS 없이 OG 메타를 읽도록 index.html에
// 메타를 굽는다. 미프리렌더 시 SPA 셸(빈 head)만 받아 미리보기가 안 떴음(/play와 동일 처리).
// 게이트·기기인식 등 상호작용은 전부 클라이언트(onMount)라 프리렌더 결과는 셸이고 하이드레이션으로 살아난다.
export const prerender = true;
