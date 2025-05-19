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
    'Hi Melody',
    'Gamja Flower',
    'Kirang Haerang',
    'Nanum Brush Script',
    'Nanum Gothic Coding',
    'Nanum Square',
    'Noto Serif KR',
    'Song Myung',
    'East Sea Dokdo',
    'Gugi',
    'Hanna',
    'Hanna Air',
    'Hanna Pro',
    'Maplestory',
    'Noto Sans KR',
    'Noto Serif KR'
  ];

  const textColors = [
    '#FF0000', '#FF4500', '#FF8C00', '#FFA500', '#FFD700',
    '#00FF00', '#32CD32', '#7FFF00', '#ADFF2F', '#9ACD32',
    '#0000FF', '#1E90FF', '#00BFFF', '#87CEEB', '#00CED1',
    '#FF00FF', '#FF1493', '#FF69B4', '#FFB6C1', '#FFC0CB',
    '#800080', '#4B0082', '#8A2BE2', '#9400D3', '#9932CC',
    '#FFD700', '#FFA500', '#FF8C00', '#FF4500', '#FF6347',
    '#00FF7F', '#3CB371', '#2E8B57', '#20B2AA', '#48D1CC',
    '#FF1493', '#FF69B4', '#FFB6C1', '#FFC0CB', '#FF69B4'
  ];

  const gradients = [
    'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
    'linear-gradient(45deg, #A8E6CF, #DCEDC1)',
    'linear-gradient(45deg, #FFD3B6, #FFAAA5)',
    'linear-gradient(45deg, #FF8B94, #FFAAA5)',
    'linear-gradient(45deg, #FFD3B6, #FFE66D)',
    'linear-gradient(45deg, #B5EAD7, #C7CEEA)',
    'linear-gradient(45deg, #E2F0CB, #B5EAD7)',
    'linear-gradient(45deg, #C7CEEA, #E2F0CB)',
    'linear-gradient(45deg, #FFDAC1, #E2F0CB)',
    'linear-gradient(45deg, #B5EAD7, #C7CEEA)',
    'radial-gradient(circle, #FF6B6B, #4ECDC4)',
    'radial-gradient(circle, #A8E6CF, #DCEDC1)',
    'radial-gradient(circle, #FFD3B6, #FFAAA5)',
    'radial-gradient(circle, #FF8B94, #FFAAA5)',
    'radial-gradient(circle, #FFD3B6, #FFE66D)'
  ];

  let currentFontIndex = 0;
  let currentColorIndex = 0;
  let currentGradientIndex = 0;

  function getRandomIndex(max: number): number {
    return Math.floor(Math.random() * max);
  }

  function handleClick() {
    // 이전 값과 다른 새로운 랜덤 값 선택
    let newFontIndex;
    do {
      newFontIndex = getRandomIndex(fonts.length);
    } while (newFontIndex === currentFontIndex);
    currentFontIndex = newFontIndex;

    let newColorIndex;
    do {
      newColorIndex = getRandomIndex(textColors.length);
    } while (newColorIndex === currentColorIndex);
    currentColorIndex = newColorIndex;

    let newGradientIndex;
    do {
      newGradientIndex = getRandomIndex(gradients.length);
    } while (newGradientIndex === currentGradientIndex);
    currentGradientIndex = newGradientIndex;
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

<main style="background: {gradients[currentGradientIndex]}">
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
    transition: background 0.5s ease;
  }

  h1 {
    font-size: 33vh;
    margin: 0;
    cursor: pointer;
    user-select: none;
    transition: all 0.3s ease;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  }

  h1:active {
    transform: scale(0.95);
  }
</style>
