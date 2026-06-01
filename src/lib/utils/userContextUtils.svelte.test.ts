// jsdom(client) 워크스페이스에서 실행되도록 `.svelte.test.ts` 네이밍 사용:
// browser 가드가 통과해야 하므로 node가 아닌 jsdom 환경이 필요하다.
// 단 전역 localStorage/navigator는 jsdom·Node22 충돌로 불안정하므로 stubGlobal로 고정한다.
// (프로덕션 모듈은 실제 브라우저 전역을 그대로 사용 — 여기선 환경만 고정)
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasLoveFlag, setLoveFlag, hasLoveToken, resolveWifeDevice } from './userContextUtils';
import { LOVE_STORAGE_KEY, LOVE_URL_PARAM, LOVE_URL_TOKEN } from '$lib/constants';

class MemoryStorage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
}

// navigator.userAgentData만 갈아끼운다 (전체 navigator 스텁; 모듈은 bare navigator를 읽음).
function setUserAgentData(value: unknown) {
  vi.stubGlobal('navigator', { userAgentData: value });
}

describe('userContextUtils — 사랑해 게이트', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('hasLoveFlag / setLoveFlag (영구 플래그)', () => {
    test('기본 false, setLoveFlag 후 true로 영속', () => {
      expect(hasLoveFlag()).toBe(false);
      setLoveFlag();
      expect(hasLoveFlag()).toBe(true);
      expect(localStorage.getItem(LOVE_STORAGE_KEY)).toBe('1');
    });
  });

  describe('hasLoveToken (순수함수)', () => {
    test('정확한 토큰일 때만 true (string·URLSearchParams 모두)', () => {
      expect(hasLoveToken(`${LOVE_URL_PARAM}=${LOVE_URL_TOKEN}`)).toBe(true);
      expect(hasLoveToken(new URLSearchParams(`${LOVE_URL_PARAM}=${LOVE_URL_TOKEN}`))).toBe(true);
    });
    test('틀린/없는 토큰은 false', () => {
      expect(hasLoveToken(`${LOVE_URL_PARAM}=wrong`)).toBe(false);
      expect(hasLoveToken('')).toBe(false);
      expect(hasLoveToken('other=1')).toBe(false);
    });
  });

  describe('resolveWifeDevice (userAgentData 고엔트로피 model)', () => {
    test('userAgentData 미지원(iOS Safari·Firefox)이면 false', async () => {
      setUserAgentData(undefined);
      await expect(resolveWifeDevice()).resolves.toBe(false);
    });

    test('model에 SM-S908 포함이면 true', async () => {
      setUserAgentData({ getHighEntropyValues: async () => ({ model: 'SM-S908N' }) });
      await expect(resolveWifeDevice()).resolves.toBe(true);
    });

    test('빈 model이면 false', async () => {
      setUserAgentData({ getHighEntropyValues: async () => ({ model: '' }) });
      await expect(resolveWifeDevice()).resolves.toBe(false);
    });

    test('다른 기기 model이면 false', async () => {
      setUserAgentData({ getHighEntropyValues: async () => ({ model: 'Pixel 7' }) });
      await expect(resolveWifeDevice()).resolves.toBe(false);
    });

    test('getHighEntropyValues가 reject해도(NotAllowedError) graceful false', async () => {
      setUserAgentData({
        getHighEntropyValues: async () => {
          throw new Error('NotAllowedError');
        }
      });
      await expect(resolveWifeDevice()).resolves.toBe(false);
    });
  });
});
