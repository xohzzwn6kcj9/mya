<script lang="ts">
  import { onMount } from 'svelte';
  import { fonts, textColors, gradients, animations } from '$lib/config/displayOptions';
  import { getRandomIndex } from '$lib/utils/styleUtils';
  import { isTargetDevice, shouldSetCookie, setCookie, hasLoveCookie } from '$lib/utils/userContextUtils';
  import { SPECIAL_MESSAGE_PROBABILITY, EXCLAMATION_PROBABILITY, SINGLE_DAY_FONT_PROBABILITY, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_DEFAULT } from '$lib/constants';
  import '$lib/styles/animations.css';

  // 텍스트 아이템 타입
  interface TextItem {
    fontIndex: number;
    colorIndex: number;
    animationIndex: number;
    fontSize: number;
    positionX: number;
    positionY: number;
    showSpecialMessage: boolean;
    showExclamation: boolean;
  }

  // 텍스트 개수 확률 (1개: 60%, 2개: 30%, 3개: 10%)
  const TEXT_COUNT_PROBABILITIES = [0.6, 0.3, 0.1];

  let currentGradientIndex = getRandomIndex(gradients.length);
  let textItems: TextItem[] = [{
    fontIndex: getRandomIndex(fonts.length),
    colorIndex: getRandomIndex(textColors.length),
    animationIndex: getRandomIndex(animations.length),
    fontSize: FONT_SIZE_DEFAULT,
    positionX: 50,
    positionY: 50,
    showSpecialMessage: false,
    showExclamation: false
  }];

  // 텍스트 개수 결정 (1~3개)
  function getTextCount(): number {
    const rand = Math.random();
    if (rand < TEXT_COUNT_PROBABILITIES[0]) return 1;
    if (rand < TEXT_COUNT_PROBABILITIES[0] + TEXT_COUNT_PROBABILITIES[1]) return 2;
    return 3;
  }

  // 단일 텍스트 아이템 생성
  function createTextItem(prevFontIndex: number): TextItem {
    // 폰트 선택
    let fontIndex;
    if (Math.random() < SINGLE_DAY_FONT_PROBABILITY) {
      const singleDayIndex = fonts.indexOf('Single Day');
      fontIndex = singleDayIndex !== -1 ? singleDayIndex : getRandomIndex(fonts.length);
    } else {
      do {
        fontIndex = getRandomIndex(fonts.length);
      } while (fontIndex === prevFontIndex);
    }

    // 애니메이션 선택
    const animationIndex = getRandomIndex(animations.length);

    // 색상 선택
    const colorIndex = getRandomIndex(textColors.length);

    // 애니메이션 여유 공간 (vh 단위)
    const ANIMATION_MARGIN = 5;
    const TEXT_WIDTH_RATIO = 2;

    // 최소 폰트 크기가 들어갈 수 있는 여유 확보
    const minMarginY = FONT_SIZE_MIN / 2 + ANIMATION_MARGIN;
    const minMarginX = (FONT_SIZE_MIN * TEXT_WIDTH_RATIO) / 2 + ANIMATION_MARGIN;

    // 랜덤 위치 선택
    const positionX = Math.random() * (100 - 2 * minMarginX) + minMarginX;
    const positionY = Math.random() * (100 - 2 * minMarginY) + minMarginY;

    // 최대 폰트 크기 계산
    const maxFromTop = (positionY - ANIMATION_MARGIN) * 2;
    const maxFromBottom = (100 - positionY - ANIMATION_MARGIN) * 2;
    const maxFromLeft = (positionX - ANIMATION_MARGIN) * 2 / TEXT_WIDTH_RATIO;
    const maxFromRight = (100 - positionX - ANIMATION_MARGIN) * 2 / TEXT_WIDTH_RATIO;

    // 화면 1/3 제한
    const maxByHeight = 100 / 3 - ANIMATION_MARGIN * 2;
    const aspectRatio = window.innerWidth / window.innerHeight;
    const screenWidthInVh = aspectRatio * 100;
    const maxByWidth = (screenWidthInVh / 3 - ANIMATION_MARGIN * 2) / TEXT_WIDTH_RATIO;

    const maxFontSize = Math.min(
      maxFromTop,
      maxFromBottom,
      maxFromLeft,
      maxFromRight,
      maxByHeight,
      maxByWidth,
      FONT_SIZE_MAX
    );

    const effectiveMax = Math.max(maxFontSize, FONT_SIZE_MIN);
    const fontSize = Math.floor(Math.random() * (effectiveMax - FONT_SIZE_MIN + 1)) + FONT_SIZE_MIN;

    // 특별 메시지 및 느낌표
    const showSpecialMessage = hasLoveCookie() && Math.random() < SPECIAL_MESSAGE_PROBABILITY;
    const showExclamation = Math.random() < EXCLAMATION_PROBABILITY;

    return {
      fontIndex,
      colorIndex,
      animationIndex,
      fontSize,
      positionX,
      positionY,
      showSpecialMessage,
      showExclamation
    };
  }

  function handleClick() {
    // 배경색 변경
    let newGradientIndex;
    do {
      newGradientIndex = getRandomIndex(gradients.length);
    } while (newGradientIndex === currentGradientIndex);
    currentGradientIndex = newGradientIndex;

    // 텍스트 개수 결정 및 생성
    const count = getTextCount();
    const newItems: TextItem[] = [];
    let prevFontIndex = textItems[0]?.fontIndex ?? -1;

    for (let i = 0; i < count; i++) {
      const item = createTextItem(prevFontIndex);
      newItems.push(item);
      prevFontIndex = item.fontIndex;
    }

    textItems = newItems;
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
  {#each textItems as item, i (i)}
    <h1
      style="font-family: {fonts[item.fontIndex]}; color: {textColors[item.colorIndex]}; font-size: {item.fontSize}vh; left: {item.positionX}%; top: {item.positionY}%; transform: translate(-50%, -50%);"
      class={animations[item.animationIndex]}
    >
      {item.showSpecialMessage ? '사랑해' : '먀'}{item.showExclamation ? '!' : ''}
    </h1>
  {/each}
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
