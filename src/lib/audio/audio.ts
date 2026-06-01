import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

// 오디오 토대 모듈.
// 핵심 안전장치: 모듈 로드/import 시점에는 AudioContext를 절대 생성하지 않는다.
// 모든 생성은 getAudioContext()의 첫 호출(=첫 사용자 제스처) 안에서만 일어난다.
// (jsdom 테스트는 컴포넌트를 render만 하고 탭하지 않으므로, import만으로 컨텍스트가 생기면 깨진다.)

// 모듈 레벨 상태 — 생성하지 않고 null 초기화만 한다.
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const MASTER_VOLUME = 0.5; // 약 -6dB, 동시다발음 클리핑 방지
const MUTE_STORAGE_KEY = 'mya_muted';

// localStorage에서 초기 뮤트 상태를 읽는다.
// browser 가드 + try/catch — localStorage 읽기는 AudioContext 생성과 무관하므로 모듈 평가 시 안전.
function loadMutedInitial(): boolean {
  if (!browser) return false;
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// 뮤트 스토어 — 컴포넌트에서 $muted 자동 구독으로 사용.
export const muted: Writable<boolean> = writable(loadMutedInitial());

// subscribe 콜백 안에서 게인을 즉시 읽기 위한 closure 미러.
// store 초기값과 동일하게 loadMutedInitial()로 계산해 불일치를 방지한다.
let currentMuted = loadMutedInitial();

// ※ 생성하지 않는 접근자 — subscribe 콜백 전용.
// 컨텍스트가 이미 있을 때만 ctx를 돌려주고, 없으면 null을 반환해
// 뮤트 토글이 컨텍스트를 implicit 생성하지 않도록 한다.
function getExistingContext(): AudioContext | null {
  return ctx;
}

// 지연 싱글톤 AudioContext — 반드시 첫 제스처 안에서만 호출된다.
export function getAudioContext(): AudioContext | null {
  if (!browser) return null;
  if (ctx) return ctx;
  try {
    // webkit 폴백 (구형 Safari)
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null; // jsdom 등 미지원 환경 → null (테스트 graceful)
    ctx = new AC();
    masterGain = ctx.createGain();
    // 초기 게인: 현재 뮤트 상태 반영 (closure 미러를 즉시 읽음)
    masterGain.gain.value = currentMuted ? 0 : MASTER_VOLUME;
    masterGain.connect(ctx.destination);
    // 제스처 내 resume — 브라우저 자동재생 정책 통과
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  } catch {
    ctx = null;
    masterGain = null;
    return null;
  }
}

// masterGain 접근자 — 후속 오디오 모듈(F1/F2/F3)이 자기 노드를 여기에 connect.
// 컨텍스트 생성을 보장한 뒤 반환하며, 미지원/SSR이면 null.
export function getMasterGain(): GainNode | null {
  getAudioContext();
  return masterGain;
}

// 뮤트 변경 시: localStorage 저장 + (컨텍스트가 이미 있을 때만) 게인을 부드럽게 조정.
// 이 subscribe는 import 시 즉시 1회 실행되지만, 그 시점엔 ctx가 null이라
// 게인 분기를 건너뛰고 localStorage write만 수행한다 → AudioContext를 만들지 않음.
muted.subscribe((m) => {
  currentMuted = m;
  if (browser) {
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, m ? '1' : '0');
    } catch {
      // localStorage 미사용/차단 환경 graceful degrade
    }
  }
  const c = getExistingContext();
  if (c && masterGain) {
    try {
      masterGain.gain.setTargetAtTime(m ? 0 : MASTER_VOLUME, c.currentTime, 0.02);
    } catch {
      // 게인 조정 실패는 무시 (소리만 안 바뀜)
    }
  }
});

// 첫 탭 1회 — 컨텍스트 생성/resume + (뮤트 아니면) 짧은 진동.
// +page.svelte handleClick에서 컴포넌트 플래그로 1회만 호출한다. onMount 호출 금지.
export function initAudioOnFirstGesture(): void {
  try {
    getAudioContext(); // 생성 + resume (제스처 컨텍스트)
    if (
      browser &&
      !currentMuted &&
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator
    ) {
      navigator.vibrate(15);
    }
  } catch {
    // 오디오/진동 미지원 graceful degrade
  }
}

// 후속 오디오 모듈이 재생을 감싸는 try/catch 래퍼.
export function playSafe<T>(fn: () => T): T | undefined {
  if (!browser) return undefined;
  try {
    return fn();
  } catch {
    return undefined;
  }
}
