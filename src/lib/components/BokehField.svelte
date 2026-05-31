<script lang="ts">
  import { onMount } from 'svelte';
  import '$lib/styles/animations.css';

  export let colors: string[];  // 호출부에서 currentTheme.heartColors 전달

  // 보케 입자 타입
  interface BokehParticle {
    size: number;       // vmax 단위 원 지름
    top: number;        // % 위치
    left: number;       // % 위치
    colorIndex: number; // colors 배열 순환 인덱스 (색은 reactive로 매핑)
    duration: number;   // s, 22~40
    delay: number;      // s, 음수 가능 (시작 위상 분산)
    opacity: number;    // 0.25~0.5
    driftX: string;     // keyframe var --bx, 예: '4%'
    driftY: string;     // keyframe var --by, 예: '-3%'
  }

  // 입자 수 (7~10 사이 고정값)
  const PARTICLE_COUNT = 8;

  function rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  function randSign(): number {
    return Math.random() < 0.5 ? -1 : 1;
  }

  // 위치/크기/표류량은 생성 시 1회만 결정 (매 렌더 재계산 금지)
  // 색만 colors prop에 reactive 매핑
  let particles: BokehParticle[] = [];
  onMount(() => {
    particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      size: rand(28, 55),
      top: rand(-5, 95),
      left: rand(-5, 95),
      colorIndex: i,
      duration: rand(22, 40),
      delay: -rand(0, 30),
      opacity: rand(0.25, 0.5),
      driftX: `${(rand(3, 6) * randSign()).toFixed(1)}%`,
      driftY: `${(rand(3, 6) * randSign()).toFixed(1)}%`
    }));
  });
</script>

<div class="bokeh-field" aria-hidden="true">
  {#each particles as p, i (i)}
    <div
      class="bokeh-particle"
      style="
        width: {p.size}vmax;
        height: {p.size}vmax;
        top: {p.top}%;
        left: {p.left}%;
        opacity: {p.opacity};
        background: radial-gradient(circle, {colors.length ? colors[p.colorIndex % colors.length] : 'transparent'} 0%, transparent 70%);
        animation-duration: {p.duration}s;
        animation-delay: {p.delay}s;
        --bx: {p.driftX};
        --by: {p.driftY};
      "
    ></div>
  {/each}
</div>

<style>
  .bokeh-field {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .bokeh-particle {
    position: absolute;
    border-radius: 50%;
    /* translate(-50%, -50%)로 중심정렬 후 keyframe이 거기에 미세 표류만 더함 */
    transform: translate(-50%, -50%);
    filter: blur(40px);
    will-change: transform;
    /* 테마 전환 시 색이 부드럽게 따라오도록 */
    transition: background 1s ease;
    animation-name: bokeh-drift;
    animation-timing-function: ease-in-out;
    animation-iteration-count: infinite;
    animation-direction: alternate;
  }

  /* 모션 민감 사용자를 위해 표류 정지 */
  @media (prefers-reduced-motion: reduce) {
    .bokeh-particle {
      animation: none;
    }
  }
</style>
