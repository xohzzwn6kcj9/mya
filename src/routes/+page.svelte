<script lang="ts">
  import { onMount } from 'svelte';

  const fonts = [
    'Noto Sans KR',
    'Nanum Gothic',
    'Nanum Myeongjo',
    'Nanum Pen Script',
    'Gaegu',
    'Dongle',
    'Black Han Sans',
    'Do Hyeon',
    'Jua',
    'Poor Story',
    'Stylish',
    'Sunflower',
    'Yeon Sung',
    'Single Day',
    'Hi Melody'
  ];

  const textColors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEEAD',
    '#D4A5A5',
    '#9B59B6',
    '#3498DB',
    '#E74C3C',
    '#2ECC71',
    '#F1C40F',
    '#1ABC9C',
    '#E67E22',
    '#34495E',
    '#16A085'
  ];

  const backgroundColors = [
    '#F8F9FA',
    '#F1F3F5',
    '#E9ECEF',
    '#DEE2E6',
    '#E3F2FD',
    '#E8F5E9',
    '#FFF3E0',
    '#F3E5F5',
    '#E0F7FA',
    '#F1F8E9',
    '#FFF8E1',
    '#FCE4EC',
    '#F3E5F5',
    '#E8EAF6',
    '#E0F2F1'
  ];

  let currentFontIndex = 0;
  let currentColorIndex = 0;
  let currentBgIndex = 0;

  function handleClick() {
    currentFontIndex = (currentFontIndex + 1) % fonts.length;
    currentColorIndex = (currentColorIndex + 1) % textColors.length;
    currentBgIndex = (currentBgIndex + 1) % backgroundColors.length;
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

<main style="background-color: {backgroundColors[currentBgIndex]}">
  <h1 
    style="font-family: {fonts[currentFontIndex]}; color: {textColors[currentColorIndex]};"
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
  }

  main {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: background-color 0.5s ease;
  }

  h1 {
    font-size: 22vh;
    margin: 0;
    cursor: pointer;
    user-select: none;
    transition: all 0.3s ease;
  }

  h1:active {
    transform: scale(0.95);
  }
</style>
