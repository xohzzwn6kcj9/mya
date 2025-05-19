<script lang="ts">
  import { onMount } from 'svelte';

  const fonts = [
    'Noto Sans KR',
    'Nanum Gothic',
    'Nanum Myeongjo',
    'Nanum Pen Script',
    'Gaegu',
    'Dongle'
  ];

  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEEAD',
    '#D4A5A5',
    '#9B59B6',
    '#3498DB'
  ];

  let currentFontIndex = 0;
  let currentColorIndex = 0;

  function handleClick() {
    currentFontIndex = (currentFontIndex + 1) % fonts.length;
    currentColorIndex = (currentColorIndex + 1) % colors.length;
  }

  onMount(() => {
    // 폰트 프리로드
    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(' ', '+')}&display=swap`;
      document.head.appendChild(link);
    });
  });
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
</svelte:head>

<main>
  <h1 
    style="font-family: {fonts[currentFontIndex]}; color: {colors[currentColorIndex]};"
    on:click={handleClick}
  >
    먀
  </h1>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f5f5f5;
  }

  main {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  h1 {
    font-size: 15vh;
    margin: 0;
    cursor: pointer;
    user-select: none;
    transition: all 0.3s ease;
  }

  h1:active {
    transform: scale(0.95);
  }
</style>
