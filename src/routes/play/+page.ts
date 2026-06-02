// /play를 정적 파일로 프리렌더 → GitHub Pages가 /mya/play를 직접 서빙(하위경로 404 방지).
// 게임 상호작용은 전부 클라이언트(onMount/이벤트)라 프리렌더 결과는 셸이고 하이드레이션으로 살아난다.
export const prerender = true;
