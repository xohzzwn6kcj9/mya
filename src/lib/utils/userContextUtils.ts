import { browser } from '$app/environment';
import { LOVE_STORAGE_KEY, LOVE_MODEL_TOKEN, LOVE_URL_PARAM, LOVE_URL_TOKEN } from '$lib/constants';

// 사랑해-게이트 (와이프 전용 소프트 게이트).
// 만료되던 1년 쿠키 + 기념일 날짜게이트를 버리고, 무기한 자가복구 localStorage 플래그로 교체했다.
// 플래그는 (A) 기기 모델 매칭 또는 (B) 비밀 URL 토큰으로 켜지며, 켜질 때마다 다시 기록되어 자가복구된다.
// localStorage 관용구(browser 가드 + try/catch, 값 '1')는 audio.ts와 동일.

// 영구 플래그 읽기. 재방문 시 onMount에서 동기로 즉시 평가된다(비동기 레이스 없음).
export function hasLoveFlag(): boolean {
  if (!browser) return false;
  try {
    return localStorage.getItem(LOVE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// 영구 플래그 기록 (자가복구: 조건 충족 시마다 다시 써서 스토리지 삭제에도 다음 방문에 복원).
export function setLoveFlag(): void {
  if (!browser) return;
  try {
    localStorage.setItem(LOVE_STORAGE_KEY, '1');
  } catch {
    // localStorage 미사용/차단 환경 graceful degrade
  }
}

// 비밀 URL 토큰 확인 — 순수함수(브라우저 의존 없음, 단위테스트 용이).
// 문자열(?k=...) 또는 URLSearchParams 모두 허용.
export function hasLoveToken(search: string | URLSearchParams): boolean {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return params.get(LOVE_URL_PARAM) === LOVE_URL_TOKEN;
}

// 와이프 기기(갤럭시 S22 Ultra) 자동 판별.
// 레거시 navigator.userAgent의 모델 토큰은 'K'로 동결되어 죽었으므로(Chrome M110+, 삼성인터넷 v24+),
// userAgentData 고엔트로피 'model'을 비동기로 읽어 진짜 모델(SM-S908…)을 확인한다.
// iOS Safari·Firefox엔 userAgentData가 없어 자동으로 false → 와이프 전용이 보장된다.
export async function resolveWifeDevice(): Promise<boolean> {
  if (!browser) return false;
  const uaData = (navigator as unknown as {
    userAgentData?: { getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string }> };
  }).userAgentData;
  if (!uaData || typeof uaData.getHighEntropyValues !== 'function') return false;
  try {
    const { model } = await uaData.getHighEntropyValues(['model']);
    return typeof model === 'string' && model.includes(LOVE_MODEL_TOKEN);
  } catch {
    // NotAllowedError / 미지원 / 빈 모델 → 매칭 실패로 간주 (토큰 백업이 보장)
    return false;
  }
}
