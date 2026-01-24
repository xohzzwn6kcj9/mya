<script lang="ts">
  import { onMount } from 'svelte';
  import { fonts, animations } from '$lib/config/displayOptions';
  import { getRandomIndex } from '$lib/utils/styleUtils';
  import { selectTheme, selectDifferentTheme, shouldChangeTheme, type ThemeId, type Theme } from '$lib/utils/themeUtils';
  import { isTargetDevice, shouldSetCookie, setCookie, hasLoveCookie } from '$lib/utils/userContextUtils';
  import { SPECIAL_MESSAGE_PROBABILITY, EXCLAMATION_PROBABILITY, QUESTION_MARK_PROBABILITY, SINGLE_DAY_FONT_PROBABILITY, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_DEFAULT } from '$lib/constants';
  import '$lib/styles/animations.css';
  import HeartBubbles from '$lib/components/HeartBubbles.svelte';

  // 텍스트 아이템 타입
  interface TextItem {
    fontIndex: number;
    colorIndex: number;
    animationIndex: number;
    fontSize: number;
    positionX: number;
    positionY: number;
    showSpecialMessage: boolean;
    showMyu: boolean;
    showExclamation: boolean;
    showQuestionMark: boolean;
    exclamationFirst: boolean;  // !?와 ?! 순서 결정
  }

  // 하트 이펙트 타입
  interface HeartEffect {
    id: number;
    x: number;
    y: number;
  }

  // 먀/뮤 각각의 개수 확률 (0개: 20%, 1개: 50%, 2개: 20%, 3개: 10%)
  const TEXT_TYPE_COUNT_PROBABILITIES = [0.2, 0.5, 0.2, 0.1];
  const TEXT_WIDTH_RATIO = 2;
  const ANIMATION_MARGIN = 5;

  // 현재 테마 (새로고침 시 선택)
  let currentTheme: Theme = selectTheme();
  let currentGradientIndex = getRandomIndex(currentTheme.gradients.length);

  let textItems: TextItem[] = [{
    fontIndex: getRandomIndex(fonts.length),
    colorIndex: getRandomIndex(currentTheme.textColors.length),
    animationIndex: getRandomIndex(animations.length),
    fontSize: FONT_SIZE_DEFAULT,
    positionX: 50,
    positionY: 50,
    showSpecialMessage: false,
    showMyu: false,
    showExclamation: false,
    showQuestionMark: false,
    exclamationFirst: true
  }];

  // 하트 이펙트 상태
  let heartEffects: HeartEffect[] = [];
  let nextHeartId = 0;

  function removeHeartEffect(id: number) {
    heartEffects = heartEffects.filter(effect => effect.id !== id);
  }

  // 먀 또는 뮤의 개수 결정 (0~3개)
  function getTypeCount(): number {
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < TEXT_TYPE_COUNT_PROBABILITIES.length; i++) {
      cumulative += TEXT_TYPE_COUNT_PROBABILITIES[i];
      if (rand < cumulative) return i;
    }
    return 0;
  }

  // 경계 박스 타입
  interface BoundingBox {
    left: number;   // vw %
    right: number;  // vw %
    top: number;    // vh %
    bottom: number; // vh %
  }

  // 텍스트 아이템의 경계 박스 계산 (애니메이션 여유 포함)
  function getBoundingBox(item: TextItem): BoundingBox {
    const aspectRatio = window.innerWidth / window.innerHeight;
    // 텍스트 높이 (vh %)
    const heightVh = item.fontSize + ANIMATION_MARGIN * 2;
    // 텍스트 너비 (vh → vw % 변환)
    const widthVh = item.fontSize * TEXT_WIDTH_RATIO + ANIMATION_MARGIN * 2;
    const widthVw = widthVh / aspectRatio;

    return {
      left: item.positionX - widthVw / 2,
      right: item.positionX + widthVw / 2,
      top: item.positionY - heightVh / 2,
      bottom: item.positionY + heightVh / 2
    };
  }

  // 두 경계 박스가 겹치는지 확인
  function isOverlapping(box1: BoundingBox, box2: BoundingBox): boolean {
    return !(box1.right < box2.left || box1.left > box2.right ||
             box1.bottom < box2.top || box1.top > box2.bottom);
  }

  // 기존 아이템들과 겹치는지 확인
  function isOverlappingWithExisting(newItem: TextItem, existingItems: TextItem[]): boolean {
    const newBox = getBoundingBox(newItem);
    for (const existing of existingItems) {
      if (isOverlapping(newBox, getBoundingBox(existing))) {
        return true;
      }
    }
    return false;
  }

  // 단일 텍스트 아이템 생성 (겹침 방지)
  function createTextItem(prevFontIndex: number, existingItems: TextItem[], isMyu: boolean): TextItem {
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

    // 색상 선택 (현재 테마에서)
    const colorIndex = getRandomIndex(currentTheme.textColors.length);

    // 특별 메시지, 느낌표, 물음표 (위치 계산 전에 결정)
    const showSpecialMessage = hasLoveCookie() && Math.random() < SPECIAL_MESSAGE_PROBABILITY;
    const showMyu = isMyu;  // 파라미터로 전달받음
    const showExclamation = Math.random() < EXCLAMATION_PROBABILITY;
    // 물음표는 사랑해가 아닐 때만 적용
    const showQuestionMark = !showSpecialMessage && Math.random() < QUESTION_MARK_PROBABILITY;
    // !?와 ?! 순서 랜덤 결정
    const exclamationFirst = Math.random() < 0.5;

    // 최소 폰트 크기가 들어갈 수 있는 여유 확보
    const minMarginY = FONT_SIZE_MIN / 2 + ANIMATION_MARGIN;
    const minMarginX = (FONT_SIZE_MIN * TEXT_WIDTH_RATIO) / 2 + ANIMATION_MARGIN;

    // 화면 1/3 제한 계산
    const maxByHeight = 100 / 3 - ANIMATION_MARGIN * 2;
    const aspectRatio = window.innerWidth / window.innerHeight;
    const screenWidthInVh = aspectRatio * 100;
    const maxByWidth = (screenWidthInVh / 3 - ANIMATION_MARGIN * 2) / TEXT_WIDTH_RATIO;

    // 겹침 방지: 최대 50번 시도
    const MAX_ATTEMPTS = 50;
    let bestItem: TextItem | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // 랜덤 위치 선택
      const positionX = Math.random() * (100 - 2 * minMarginX) + minMarginX;
      const positionY = Math.random() * (100 - 2 * minMarginY) + minMarginY;

      // 최대 폰트 크기 계산
      const maxFromTop = (positionY - ANIMATION_MARGIN) * 2;
      const maxFromBottom = (100 - positionY - ANIMATION_MARGIN) * 2;
      const maxFromLeft = (positionX - ANIMATION_MARGIN) * 2 / TEXT_WIDTH_RATIO;
      const maxFromRight = (100 - positionX - ANIMATION_MARGIN) * 2 / TEXT_WIDTH_RATIO;

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

      const candidateItem: TextItem = {
        fontIndex,
        colorIndex,
        animationIndex,
        fontSize,
        positionX,
        positionY,
        showSpecialMessage,
        showMyu,
        showExclamation,
        showQuestionMark,
        exclamationFirst
      };

      // 겹침 확인
      if (!isOverlappingWithExisting(candidateItem, existingItems)) {
        return candidateItem;
      }

      // 첫 번째 후보 저장 (모든 시도가 실패할 경우 사용)
      if (!bestItem) {
        bestItem = candidateItem;
      }
    }

    // 모든 시도 실패 시 첫 번째 후보 반환
    return bestItem!;
  }

  function handleClick(event: MouseEvent | TouchEvent) {
    // 터치/클릭 좌표 추출
    let clientX: number, clientY: number;
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = window.innerWidth / 2;
      clientY = window.innerHeight / 2;
    }

    // 하트 이펙트 생성
    heartEffects = [...heartEffects, { id: nextHeartId++, x: clientX, y: clientY }];

    // 10% 확률로 테마 변경
    if (shouldChangeTheme()) {
      currentTheme = selectDifferentTheme(currentTheme.id as ThemeId);
    }

    // 배경색 변경 (현재 테마 내에서)
    let newGradientIndex;
    do {
      newGradientIndex = getRandomIndex(currentTheme.gradients.length);
    } while (newGradientIndex === currentGradientIndex && currentTheme.gradients.length > 1);
    currentGradientIndex = newGradientIndex;

    // 먀와 뮤 개수 독립적으로 결정
    let myaCount = getTypeCount();
    let myuCount = getTypeCount();

    // 합이 0이면 둘 중 하나를 1개로
    if (myaCount + myuCount === 0) {
      if (Math.random() < 0.5) {
        myaCount = 1;
      } else {
        myuCount = 1;
      }
    }

    // 텍스트 아이템 생성
    const newItems: TextItem[] = [];
    let prevFontIndex = textItems[0]?.fontIndex ?? -1;

    // 먀 아이템 생성
    for (let i = 0; i < myaCount; i++) {
      const item = createTextItem(prevFontIndex, newItems, false);
      newItems.push(item);
      prevFontIndex = item.fontIndex;
    }

    // 뮤 아이템 생성
    for (let i = 0; i < myuCount; i++) {
      const item = createTextItem(prevFontIndex, newItems, true);
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

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<main
  style="background: {currentTheme.gradients[currentGradientIndex]}"
  on:click={handleClick}
>
  {#each textItems as item, i (i)}
    <h1
      style="font-family: {fonts[item.fontIndex]}; color: {currentTheme.textColors[item.colorIndex]}; font-size: {item.fontSize}vh; left: {item.positionX}%; top: {item.positionY}%; transform: translate(-50%, -50%);"
      class={animations[item.animationIndex]}
    >
      {item.showSpecialMessage ? '사랑해' : (item.showMyu ? '뮤' : '먀')}{#if item.exclamationFirst}{item.showExclamation ? '!' : ''}{item.showQuestionMark ? '?' : ''}{:else}{item.showQuestionMark ? '?' : ''}{item.showExclamation ? '!' : ''}{/if}
    </h1>
  {/each}
</main>

{#each heartEffects as effect (effect.id)}
  <HeartBubbles x={effect.x} y={effect.y} heartColors={currentTheme.heartColors} on:complete={() => removeHeartEffect(effect.id)} />
{/each}

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
    -webkit-tap-highlight-color: transparent;
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
    -webkit-tap-highlight-color: transparent;
  }


  h1:active {
    transform: translate(-50%, -50%) scale(0.95);
  }
</style>
