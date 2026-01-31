<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import {
    HEART_COUNT_MIN,
    HEART_COUNT_MAX,
    HEART_SIZE_MIN,
    HEART_SIZE_MAX,
    HEART_SPREAD_RADIUS
  } from '$lib/constants';
  import '$lib/styles/animations.css';

  export let x: number;
  export let y: number;
  export let heartColors: string[];

  const dispatch = createEventDispatcher();

  interface Heart {
    id: number;
    offsetX: number;
    offsetY: number;
    size: number;
    color: string;
    delay: number;
    duration: number;
  }

  let hearts: Heart[] = [];

  function getRandomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  function generateHearts(): Heart[] {
    const count = Math.floor(getRandomInRange(HEART_COUNT_MIN, HEART_COUNT_MAX + 1));
    const result: Heart[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * HEART_SPREAD_RADIUS;

      result.push({
        id: i,
        offsetX: Math.cos(angle) * distance,
        offsetY: Math.sin(angle) * distance,
        size: getRandomInRange(HEART_SIZE_MIN, HEART_SIZE_MAX),
        color: heartColors[Math.floor(Math.random() * heartColors.length)],
        delay: Math.random() * 100,
        duration: getRandomInRange(800, 1200)
      });
    }

    return result;
  }

  onMount(() => {
    hearts = generateHearts();

    const timer = setTimeout(() => {
      dispatch('complete');
    }, 1200 + 150); // 최대 duration + 여유

    return () => clearTimeout(timer);
  });
</script>

<div class="heart-container" style="left: {x}px; top: {y}px;">
  {#each hearts as heart (heart.id)}
    <span
      class="heart"
      style="
        left: {heart.offsetX}px;
        top: {heart.offsetY}px;
        font-size: {heart.size}px;
        color: {heart.color};
        animation-delay: {heart.delay}ms;
        animation-duration: {heart.duration}ms;
      "
    >
      &#x2665;
    </span>
  {/each}
</div>

<style>
  .heart-container {
    position: fixed;
    pointer-events: none;
    z-index: 1000;
  }

  .heart {
    position: absolute;
    animation: heart-bubble ease-out forwards;
    transform-origin: center center;
    text-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
  }
</style>
