<script lang="ts">
  import { onMount } from 'svelte';
  import { fonts, textColors, gradients, animations } from '$lib/config/displayOptions';
  import { getRandomIndex } from '$lib/utils/styleUtils';
  import { isTargetDevice, shouldSetCookie, setCookie, hasLoveCookie } from '$lib/utils/userContextUtils';
  import { SPECIAL_MESSAGE_PROBABILITY, EXCLAMATION_PROBABILITY, SINGLE_DAY_FONT_PROBABILITY, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_DEFAULT } from '$lib/constants';
  import '$lib/styles/animations.css';

  let currentFontIndex = getRandomIndex(fonts.length);
  let currentColorIndex = getRandomIndex(textColors.length);
  let currentGradientIndex = getRandomIndex(gradients.length);
  let currentAnimationIndex = getRandomIndex(animations.length);
  let currentFontSize = FONT_SIZE_DEFAULT;
  let showSpecialMessage = false;
  let showExclamation = false;
  let positionX = 50;  // % 단위 (기본: 중앙)
  let positionY = 50;  // % 단위 (기본: 중앙)

  function handleClick() {
    // 이전 값과 다른 새로운 랜덤 값 선택
    let newFontIndex;
    if (Math.random() < SINGLE_DAY_FONT_PROBABILITY) { // 30% 확률로 Single Day 선택
      const singleDayIndex = fonts.indexOf('Single Day');
      newFontIndex = singleDayIndex !== -1 ? singleDayIndex : getRandomIndex(fonts.length);
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

    // 랜덤 위치 (15% ~ 85%)
    positionX = Math.random() * 70 + 15;
    positionY = Math.random() * 70 + 15;

    // 가장자리 거리에 따른 최대 폰트 크기 계산
    const edgeDistance = Math.min(positionX, 100 - positionX, positionY, 100 - positionY);
    const sizeMultiplier = edgeDistance / 50;  // 0~1 범위
    const maxFontSize = FONT_SIZE_MIN + (FONT_SIZE_MAX - FONT_SIZE_MIN) * sizeMultiplier;

    // 조정된 범위 내에서 랜덤 크기
    currentFontSize = Math.floor(Math.random() * (maxFontSize - FONT_SIZE_MIN + 1)) + FONT_SIZE_MIN;

    // 특별 메시지 표시 여부 결정 (첫 클릭 이후에만)
    if (hasLoveCookie()) {
      showSpecialMessage = Math.random() < SPECIAL_MESSAGE_PROBABILITY;
    }

    // 느낌표 표시 여부 결정
    showExclamation = Math.random() < EXCLAMATION_PROBABILITY;
  }

  onMount(() => {
    // 뷰포트 높이 설정 (모바일 브라우저 대응)
    function setViewportHeight() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);

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

    // cleanup
    return () => {
      window.removeEventListener('resize', setViewportHeight);
    };
  });
</script>

<main 
  style="background: {gradients[currentGradientIndex]}"
  on:click={handleClick}
>
  <h1
    style="font-family: {fonts[currentFontIndex]}; color: {textColors[currentColorIndex]}; font-size: {currentFontSize}vh; left: {positionX}%; top: {positionY}%; transform: translate(-50%, -50%);"
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
    height: 100vh; /* 폴백 */
    height: 100dvh; /* 최신 브라우저 */
    height: calc(var(--vh, 1vh) * 100); /* JS 폴백 */
    overflow: hidden;
    position: fixed; /* 스크롤 완전 방지 */
    top: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  main {
    width: 100%;
    height: 100%;
    position: relative;
    transition: background 0.2s ease;
    cursor: pointer;
  }

  h1 {
    margin: 0;
    user-select: none;
    transition: all 0.2s ease;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    text-align: center;
    position: absolute;
    transform-origin: center center;
  }


  h1:active {
    transform: translate(-50%, -50%) scale(0.95);
  }
</style>
