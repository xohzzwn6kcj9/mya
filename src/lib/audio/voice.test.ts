import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SoundSkin } from './soundSkins';

// playCollision 재설계(화이트노이즈 'tok' → 귀여운 sine 'boop')가 실제 소스에서
// 의도대로 발화하는지 객관 검증하는 회귀 가드.
// './audio'를 가짜 AudioContext로 대체해 playCollision이 만든 노드/파라미터를 계측한다.
// (jsdom엔 Web Audio가 없어 실 컨텍스트는 null → 직접 호출 검증 불가하므로 모듈 모킹으로 우회.
//  svelte 컴포넌트를 render하지 않아 worktree 심볼릭 링크 vitest 함정과도 무관.)

// vi.hoisted: vi.mock 팩토리가 import보다 먼저 평가되므로, 레코더/가짜컨텍스트를
// hoist 블록 안에서 만들어 TDZ(ReferenceError)를 피한다.
const h = vi.hoisted(() => {
  type FreqOp = { op: 'set' | 'ramp'; v: number; t: number };
  type GainOp = { op: 'set' | 'ramp'; v: number; t: number };

  const created = {
    oscillators: [] as { type: string; freqOps: FreqOp[] }[],
    gains: [] as { gainOps: GainOp[] }[],
    bufferSources: 0, // 옛 화이트노이즈 경로(createBufferSource) 호출 수 — 0이어야 함
    buffers: 0
  };

  function reset() {
    created.oscillators = [];
    created.gains = [];
    created.bufferSources = 0;
    created.buffers = 0;
  }

  const fakeCtx = {
    currentTime: 0,
    sampleRate: 44100,
    createOscillator() {
      const rec = { type: '', freqOps: [] as FreqOp[] };
      created.oscillators.push(rec);
      return {
        set type(v: string) {
          rec.type = v;
        },
        get type() {
          return rec.type;
        },
        frequency: {
          setValueAtTime: (v: number, t: number) => rec.freqOps.push({ op: 'set', v, t }),
          exponentialRampToValueAtTime: (v: number, t: number) =>
            rec.freqOps.push({ op: 'ramp', v, t })
        },
        connect: (n: unknown) => n,
        start() {},
        stop() {},
        disconnect() {},
        onended: null as (() => void) | null
      };
    },
    createGain() {
      const rec = { gainOps: [] as GainOp[] };
      created.gains.push(rec);
      return {
        gain: {
          value: 0,
          setValueAtTime: (v: number, t: number) => rec.gainOps.push({ op: 'set', v, t }),
          exponentialRampToValueAtTime: (v: number, t: number) =>
            rec.gainOps.push({ op: 'ramp', v, t })
        },
        connect: (n: unknown) => n,
        disconnect() {}
      };
    },
    // playCollision은 더 이상 이들을 쓰면 안 된다(옛 화이트노이즈 경로). 호출되면 카운트만 올려 검출.
    createBufferSource() {
      created.bufferSources++;
      return {
        buffer: null,
        connect: (n: unknown) => n,
        start() {},
        stop() {},
        disconnect() {},
        onended: null
      };
    },
    createBuffer() {
      created.buffers++;
      return { getChannelData: () => new Float32Array(8) };
    },
    createBiquadFilter() {
      return {
        type: '',
        frequency: { setValueAtTime() {} },
        Q: { setValueAtTime() {} },
        connect: (n: unknown) => n,
        disconnect() {}
      };
    },
    createStereoPanner() {
      return { pan: { value: 0 }, connect: (n: unknown) => n, disconnect() {} };
    }
  };

  return { created, reset, fakeCtx };
});

vi.mock('./audio', () => ({
  getAudioContext: () => h.fakeCtx,
  getMasterGain: () => ({ connect: () => {}, disconnect: () => {} }),
  isMuted: () => false
}));

// 모킹 선언 후 import (vitest가 자동 hoist하지만 명시적 순서로 가독성 유지).
import { playCollision } from './voice';

// 결정적 검증용 음색: MAJOR_PENTATONIC, C4 기준.
const SKIN: SoundSkin = {
  wave: 'triangle',
  scale: [0, 2, 4, 7, 9, 12],
  attack: 0.01,
  decay: 0.6,
  detune: 10,
  baseFreq: 261.63
};

describe('playCollision — 귀여운 sine boop 재설계', () => {
  beforeEach(() => {
    h.reset();
    // degree 랜덤 고정 → scale[0]=0 (결정적). fontSize=15는 옥타브 0(중간 글자)이라 target=baseFreq.
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('화이트노이즈가 아니라 부드러운 sine 오실레이터를 쓴다', () => {
    playCollision(1, 15, SKIN);
    expect(h.created.bufferSources).toBe(0); // 옛 'tok' 화이트노이즈 경로 제거 확인
    expect(h.created.buffers).toBe(0);
    expect(h.created.oscillators).toHaveLength(1);
    expect(h.created.oscillators[0].type).toBe('sine');
  });

  test('하향 피치 글라이드 — 살짝 위에서 펜타토닉 목표음으로 내려온다', () => {
    playCollision(1, 15, SKIN);
    const { freqOps } = h.created.oscillators[0];
    // [setValueAtTime(startFreq), exponentialRampToValueAtTime(targetFreq)]
    expect(freqOps).toHaveLength(2);
    const start = freqOps[0].v;
    const target = freqOps[1].v;
    expect(start).toBeGreaterThan(target); // 위→아래 글라이드(통통 튀는 'ploink')
    // fontSize=15 → octave 0, degree 0 → target = baseFreq(261.63Hz)에 양자화.
    expect(target).toBeCloseTo(261.63, 1);
    // 모든 주파수는 유한·양수(exponentialRamp 안전).
    for (const op of freqOps) {
      expect(Number.isFinite(op.v)).toBe(true);
      expect(op.v).toBeGreaterThan(0);
    }
  });

  test('볼륨 피크는 0.15 이하 — 좋아하는 화면전환음(0.18)을 덮지 않는다', () => {
    playCollision(8, 15, SKIN); // 최대 impact
    const { gainOps } = h.created.gains[0];
    // [set 0.0001, ramp peak, ramp 0.0001]
    const peak = gainOps[1].v;
    expect(peak).toBeLessThanOrEqual(0.15 + 1e-9);
    expect(peak).toBeGreaterThan(0);
  });

  test('작은 글자는 더 높게, 큰 글자는 더 낮게 (질량감 유지)', () => {
    playCollision(1, 8, SKIN); // 가장 작은 글자 → 옥타브 +1
    const small = h.created.oscillators[0].freqOps[1].v;
    h.reset();
    playCollision(1, 22, SKIN); // 가장 큰 글자 → 옥타브 -1
    const big = h.created.oscillators[0].freqOps[1].v;
    expect(small).toBeGreaterThan(big);
  });
});
