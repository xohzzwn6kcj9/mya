<script lang="ts">
  import { onMount } from 'svelte';
  import { fonts, textColors, gradients, animations } from '$lib/config/displayOptions';
  import { getRandomIndex, getContrastColor } from '$lib/utils/styleUtils';
  import { isTargetDevice, shouldSetCookie, setCookie, hasLoveCookie } from '$lib/utils/userContextUtils';
  import { SPECIAL_MESSAGE_PROBABILITY, EXCLAMATION_PROBABILITY, SINGLE_DAY_FONT_PROBABILITY, TARGET_DATE } from '$lib/constants';
  import '$lib/styles/animations.css';

  let currentFontIndex = getRandomIndex(fonts.length);
  let currentColorIndex = getRandomIndex(textColors.length);
  let currentGradientIndex = getRandomIndex(gradients.length);
  let currentAnimationIndex = getRandomIndex(animations.length);
  let showSpecialMessage = false;
  let showExclamation = false;

  function handleClick() {
    // 이전 값과 다른 새로운 랜덤 값 선택
    let newFontIndex;
    if (Math.random() < SINGLE_DAY_FONT_PROBABILITY) { // 30% 확률로 Single Day 선택
      newFontIndex = fonts.indexOf('Single Day');
    } else {
      do {
        newFontIndex = getRandomIndex(fonts.length);
      } while (newFontIndex === currentFontIndex);
    }
    currentFontIndex = newFontIndex;

    let newGradientIndex;
    do {
      newGradientIndex = getRandomIndex(gradients.length);
    } while (newGradientIndex === currentGradientIndex);
    currentGradientIndex = newGradientIndex;

    let newAnimationIndex;
    do {
      newAnimationIndex = getRandomIndex(animations.length);
    } while (newAnimationIndex === currentAnimationIndex);
    currentAnimationIndex = newAnimationIndex;

    // 배경색에 맞는 대비되는 텍스트 색상 선택
    currentColorIndex = getRandomIndex(textColors.length);

    // 특별 메시지 표시 여부 결정 (첫 클릭 이후에만)
    if (hasLoveCookie()) {
      showSpecialMessage = Math.random() < SPECIAL_MESSAGE_PROBABILITY;
    }
    
    // 느낌표 표시 여부 결정
    showExclamation = Math.random() < EXCLAMATION_PROBABILITY;
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
    if (shouldSetCookie()) {
      setCookie();
    }
  });
</script>

<main 
  style="background: {gradients[currentGradientIndex]}"
  on:click={handleClick}
>
  <h1 
    style="font-family: {fonts[currentFontIndex]}; color: {textColors[currentColorIndex]}; font-size: {showSpecialMessage ? '15vh' : '30vh'};"
    class={animations[currentAnimationIndex]}
  >
    {showSpecialMessage ? '사랑해' : '먀'}{showExclamation ? '!' : ''}
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
    cursor: pointer;
  }

  h1 {
    margin: 0;
    user-select: none;
    transition: all 0.2s ease;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    width: 80%;
    text-align: center;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    transform-origin: center center;
  }

  /* 애니메이션 효과 */
  @keyframes bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-20px); }
  }

  @keyframes pulse {
    0% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.1); }
    100% { transform: translateX(-50%) scale(1); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(-50%); }
    25% { transform: translateX(calc(-50% - 10px)); }
    75% { transform: translateX(calc(-50% + 10px)); }
  }

  @keyframes scale {
    0% { transform: translateX(-50%) scale(0.8); }
    50% { transform: translateX(-50%) scale(1.2); }
    100% { transform: translateX(-50%) scale(0.8); }
  }

  @keyframes fade {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes slide {
    0% { transform: translateX(calc(-50% - 20px)); }
    100% { transform: translateX(calc(-50% + 20px)); }
  }

  @keyframes wiggle {
    0%, 100% { transform: translateX(-50%) rotate(0deg); }
    25% { transform: translateX(-50%) rotate(-5deg); }
    75% { transform: translateX(-50%) rotate(5deg); }
  }

  .bounce { animation: bounce 1s infinite; }
  .pulse { animation: pulse 1s infinite; }
  .shake { animation: shake 0.5s infinite; }
  .scale { animation: scale 1s infinite; }
  .fade { animation: fade 1s infinite; }
  .slide { animation: slide 1s infinite alternate; }
  .wiggle { animation: wiggle 0.5s infinite; }

  h1:active {
    transform: translateX(-50%) scale(0.95);
  }
</style>
