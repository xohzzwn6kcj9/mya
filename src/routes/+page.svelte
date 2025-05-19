<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

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
    'linear-gradient(45deg, #FFE5E5, #E5F5F5)',
    'linear-gradient(45deg, #F0FFF0, #F5F5F0)',
    'linear-gradient(45deg, #FFF0F0, #F0F0FF)',
    'linear-gradient(45deg, #F5F5FF, #FFF5F5)',
    'linear-gradient(45deg, #FFFFF0, #F0FFFF)',
    'linear-gradient(45deg, #F0F5FF, #FFF0F5)',
    'linear-gradient(45deg, #FFF5F0, #F0FFF5)',
    'linear-gradient(45deg, #F5FFF0, #FFF0F0)',
    'linear-gradient(45deg, #F0F0F5, #FFF5F0)',
    'linear-gradient(45deg, #FFF0F0, #F0F5FF)',
    'radial-gradient(circle, #FFE5E5, #E5F5F5)',
    'radial-gradient(circle, #F0FFF0, #F5F5F0)',
    'radial-gradient(circle, #FFF0F0, #F0F0FF)',
    'radial-gradient(circle, #F5F5FF, #FFF5F5)',
    'radial-gradient(circle, #FFFFF0, #F0FFFF)'
  ];

  let currentFontIndex = 0;
  let currentColorIndex = 0;
  let currentGradientIndex = 0;
  let showSpecialMessage = false;

  function getRandomIndex(max: number): number {
    return Math.floor(Math.random() * max);
  }

  function getContrastColor(backgroundColor: string): string {
    // 배경색의 밝기를 계산
    const rgb = backgroundColor.match(/\d+/g);
    if (!rgb) return textColors[0];
    
    const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
    
    // 밝은 배경에는 어두운 색상, 어두운 배경에는 밝은 색상 선택
    const darkColors = textColors.filter(color => {
      const colorRgb = color.match(/\d+/g);
      if (!colorRgb) return false;
      const colorBrightness = (parseInt(colorRgb[0]) * 299 + parseInt(colorRgb[1]) * 587 + parseInt(colorRgb[2]) * 114) / 1000;
      return colorBrightness < 128;
    });
    
    const lightColors = textColors.filter(color => {
      const colorRgb = color.match(/\d+/g);
      if (!colorRgb) return false;
      const colorBrightness = (parseInt(colorRgb[0]) * 299 + parseInt(colorRgb[1]) * 587 + parseInt(colorRgb[2]) * 114) / 1000;
      return colorBrightness >= 128;
    });

    return brightness >= 128 ? 
      darkColors[getRandomIndex(darkColors.length)] : 
      lightColors[getRandomIndex(lightColors.length)];
  }

  function isTargetDevice(): boolean {
    if (!browser) return false;
    
    const userAgent = navigator.userAgent;
    return (
      userAgent.includes('SM-S908') || // Galaxy S22 Ultra
      userAgent.includes('iPhone15,3') // iPhone 14 Pro Max
    );
  }

  function shouldSetCookie(): boolean {
    if (!browser) return false;
    
    const now = new Date();
    const targetDate = new Date('2025-05-19T19:00:00+09:00');
    
    return now < targetDate && isTargetDevice();
  }

  function setCookie() {
    if (browser) {
      const oneYear = 365 * 24 * 60 * 60;
      document.cookie = `love=hy; path=/; max-age=${oneYear}`;
    }
  }

  function hasLoveCookie(): boolean {
    if (!browser) return false;
    
    return document.cookie.split(';').some(cookie => 
      cookie.trim().startsWith('love=hy')
    );
  }

  function handleClick() {
    // 이전 값과 다른 새로운 랜덤 값 선택
    let newFontIndex;
    do {
      newFontIndex = getRandomIndex(fonts.length);
    } while (newFontIndex === currentFontIndex);
    currentFontIndex = newFontIndex;

    let newGradientIndex;
    do {
      newGradientIndex = getRandomIndex(gradients.length);
    } while (newGradientIndex === currentGradientIndex);
    currentGradientIndex = newGradientIndex;

    // 배경색에 맞는 대비되는 텍스트 색상 선택
    currentColorIndex = getRandomIndex(textColors.length);

    // 특별 메시지 표시 여부 결정
    if (hasLoveCookie()) {
      showSpecialMessage = Math.random() < 0.5; // 50% 확률
    }
  }

  onMount(() => {
    // 폰트 프리로드
    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(' ', '+')}&display=swap`;
      document.head.appendChild(link);
    });

    // 쿠키 설정
    setCookie();
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
    {showSpecialMessage ? '사랑해' : '먀'}
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
    transition: background 0.2s ease;
  }

  h1 {
    font-size: 33vh;
    margin: 0;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  }

  h1:active {
    transform: scale(0.95);
  }
</style>
