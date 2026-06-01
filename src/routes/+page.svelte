<script lang="ts">
  import { onMount } from 'svelte';
  import { fonts, animations } from '$lib/config/displayOptions';
  import { getRandomIndex } from '$lib/utils/styleUtils';
  import { selectTheme, selectDifferentTheme, shouldChangeTheme, type ThemeId, type Theme } from '$lib/utils/themeUtils';
  import { hasLoveFlag, setLoveFlag, hasLoveToken, resolveWifeDevice } from '$lib/utils/userContextUtils';
  import { SPECIAL_MESSAGE_PROBABILITY, EXCLAMATION_PROBABILITY, QUESTION_MARK_PROBABILITY, SINGLE_DAY_FONT_PROBABILITY, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_DEFAULT } from '$lib/constants';
  import '$lib/styles/animations.css';
  import HeartBubbles from '$lib/components/HeartBubbles.svelte';
  import BokehField from '$lib/components/BokehField.svelte';
  import { variantsFor, pickVariantIndex, type MyaVariant } from '$lib/config/myaLexicon';
  import { anecdoteFor } from '$lib/config/secretDictionary';
  import { initAudioOnFirstGesture, muted } from '$lib/audio/audio';
  import { soundSkinFor } from '$lib/audio/soundSkins';
  import { playLetterVoice, playLoveMelody, playCollision } from '$lib/audio/voice';

  // 잔상 위치 타입
  interface TrailPosition {
    x: number;
    y: number;
    opacity: number;
  }

  // 텍스트 아이템 타입
  interface TextItem {
    id: number;
    fontIndex: number;
    colorIndex: number;
    animationIndex: number;
    fontSize: number;
    positionX: number;
    positionY: number;
    velocityX: number;  // 속도 (당구공 물리)
    velocityY: number;
    isDragging: boolean;
    showSpecialMessage: boolean;
    showMyu: boolean;
    showExclamation: boolean;
    showQuestionMark: boolean;
    exclamationFirst: boolean;  // !?와 ?! 순서 결정
    variantIndex: number;  // 먀/뮤/사랑해 계열 내 변형 폼 인덱스 (사투리·먀사전)
    trail: TrailPosition[];  // 잔상 효과용 이전 위치들
  }

  // 잔상 설정
  const TRAIL_LENGTH = 12;  // 잔상 개수 (더 길게)
  const TRAIL_OPACITY_START = 0.35;  // 첫 번째 잔상 투명도
  const TRAIL_MIN_VELOCITY = 0.15;  // 잔상이 보이는 최소 속도 (느린 속도에서도 보이도록)

  // 하트 이펙트 타입
  interface HeartEffect {
    id: number;
    x: number;
    y: number;
  }

  // 잔향 메아리(echo) 타입
  interface EchoItem {
    id: number;
    text: string;
    fontIndex: number;
    color: string;  // 생성 시점 색을 스냅샷 (테마 변경과 무관하게 메아리 색 유지)
    fontSize: number;
    x: number;
    y: number;
  }

  // 먀/뮤 각각의 개수 확률 (0개: 15%, 1개: 40%, 2개: 25%, 3개: 12%, 4개: 5%, 5개: 3%)
  const TEXT_TYPE_COUNT_PROBABILITIES = [0.15, 0.4, 0.25, 0.12, 0.05, 0.03];
  const TEXT_WIDTH_RATIO = 1.5;  // 글자 너비 비율 (줄임)
  const ANIMATION_MARGIN = 1;   // 애니메이션 여유 공간 (줄임)
  const COLLISION_PADDING = 0.5; // 충돌 박스 패딩 (vh 단위)

  // 디버깅 모드 (경계 박스 시각화)
  const DEBUG_SHOW_BOUNDS = false;

  // 현재 테마 (새로고침 시 선택)
  let currentTheme: Theme = selectTheme();
  let currentGradientIndex = getRandomIndex(currentTheme.gradients.length);

  // main 배경에 실제로 그려지는 그라데이션. 테마 디졸브 동안엔 옛 값을 유지하다 끝에서 커밋한다.
  let displayGradient = currentTheme.gradients[currentGradientIndex];

  // 테마 전환 잉크 디졸브 상태 (탭 지점에서 새 계절이 원형으로 번짐)
  interface ThemeDissolve { id: number; gradient: string; x: number; y: number; r: number; }
  let dissolve: ThemeDissolve | null = null;
  let dissolveId = 0;
  let dissolveTimer: ReturnType<typeof setTimeout> | null = null;
  const DISSOLVE_MS = 600;  // CSS .theme-dissolve transition(0.6s)과 일치 — 미만이면 전환 중 배경이 끊김

  // 텍스트 아이템 ID 카운터 (textItems 초기화 전에 선언 필요)
  let nextItemId = 0;

  // 하트 이펙트 ID 카운터
  let nextHeartId = 0;

  // 잔향 메아리(echo) 상태
  let echoes: EchoItem[] = [];
  let nextEchoId = 0;
  // echo 자동 제거 타이머 추적 (컴포넌트 파괴 시 정리용)
  let echoTimers: ReturnType<typeof setTimeout>[] = [];
  const ECHO_DURATION_MS = 800;  // animations.css의 echo-ripple 0.8s와 일치
  const ECHO_MAX = 40;            // echo 폭증 방지용 가벼운 상한

  let textItems: TextItem[] = [{
    id: nextItemId++,
    fontIndex: getRandomIndex(fonts.length),
    colorIndex: getRandomIndex(currentTheme.textColors.length),
    animationIndex: getRandomIndex(animations.length),
    fontSize: FONT_SIZE_DEFAULT,
    positionX: 50,
    positionY: 50,
    velocityX: 0,
    velocityY: 0,
    isDragging: false,
    showSpecialMessage: false,
    showMyu: false,
    showExclamation: false,
    showQuestionMark: false,
    exclamationFirst: true,
    variantIndex: 0,
    trail: []
  }];

  // 하트 이펙트 상태
  let heartEffects: HeartEffect[] = [];

  // 드래그 상태 추적 (배경 드래그용)
  let isBackgroundDragging = false;
  let lastHeartTime = 0;
  const HEART_THROTTLE_MS = 20; // 드래그 시 하트 생성 간격 (ms)

  // 물리 상수
  const FRICTION = 0.97;  // 마찰 계수 (1에 가까울수록 덜 감속) - 천천히 오래 움직임
  const MIN_VELOCITY = 0.03;  // 최소 속도 (이하면 정지) - 더 오래 움직임
  const BOUNCE_DAMPING = 0.5;  // 벽 반사 시 에너지 손실 - 벽에 부딪히면 확 느려짐
  const THROW_MULTIPLIER = 1.2;  // 던질 때 속도 배수 - 빠르게 던져짐
  const COLLISION_RESTITUTION = 0.7;  // 글자간 충돌 반발계수 (0 = 비탄성, 1 = 완전탄성)

  // 충돌음 throttle 상태 (프레임당 최대 3회, 프레임 경계는 updatePhysics 진입마다 리셋)
  // ※ 일반 let — textItems와 무관하므로 변경해도 $: 물리 가드를 재트리거하지 않는다.
  let collisionSoundsThisFrame = 0;         // 현재 프레임에서 재생한 충돌음 수
  const COLLISION_SOUNDS_PER_FRAME = 3;     // 프레임당 최대 충돌음 (폭주 방지)
  const MIN_WALL_IMPACT = 0.25;             // 이 미만 벽 반사 속도는 무음 (미세 떨림 무시)
  const MIN_LETTER_IMPACT = 0.3;            // 이 미만 글자간 상대속도차는 무음

  // 글자 드래그 상태
  let draggedItemId: number | null = null;
  let dragOffsetX = 0;  // 드래그 시작 시 글자 중심과의 오프셋
  let dragOffsetY = 0;

  // 드래그 이력 (속도 계산용) - 최근 몇 개의 위치를 저장
  interface DragPoint { x: number; y: number; time: number; }
  let dragHistory: DragPoint[] = [];
  const DRAG_HISTORY_SIZE = 5;  // 저장할 이력 개수
  const DRAG_VELOCITY_WINDOW = 150;  // 속도 계산에 사용할 시간 윈도우 (ms)

  // 체온 글로우(길게 누르기) 상태 — 기존 드래그-던지기와 배타: 일정 이상 움직이면 취소된다.
  let heldItemId: number | null = null;   // 길게 누르는 중인 글자
  let holdGlow = 0;                        // 0~1, 누르는 동안 차오르는 흰 후광 세기
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let holdRaf: number | null = null;
  let holdStartX = 0;
  let holdStartY = 0;
  const HOLD_DELAY_MS = 350;               // 이 시간 정지 유지 시 hold 모드 진입
  const HOLD_MOVE_THRESHOLD = 10;          // px, 이 이상 움직이면 드래그로 간주(hold 취소)
  const HOLD_RAMP_MS = 1100;               // 후광이 최대로 차오르는 시간
  // 길게 누름 툴팁(먀-사전 뜻풀이 + 일화) 비활성화 플래그.
  // UI 재검토 + 일화 내용 직접 검수 위해 일단 OFF. 체온 글로우(후광)는 유지.
  // 데이터/로더는 그대로라 true 로만 바꾸면 즉시 재개.
  const SHOW_HOLD_TOOLTIP: boolean = false;
  let suppressNextClick = false;           // 체온 글로우 릴리스 직후 따라오는 합성 click 무시용

  // 물리 시뮬레이션 활성화
  let animationFrameId: number | null = null;

  // 첫 제스처에서 오디오를 1회만 초기화하기 위한 가드 플래그
  let audioInitialized = false;

  // 사랑해-게이트(와이프 전용): 영구 플래그/비밀 링크/와이프 기기 중 하나라도 충족 시 true.
  // onMount에서 1회 해소(비동기 모델 체크 포함)하고, createTextItem이 매 탭 이 값을 동기로 읽는다.
  let loveActive = false;

  function removeHeartEffect(id: number) {
    heartEffects = heartEffects.filter(effect => effect.id !== id);
  }

  // echo 제거 (id로 필터)
  function removeEcho(id: number) {
    echoes = echoes.filter(e => e.id !== id);
  }

  // echo 생성: 각 신규 글자 item에 대해 메아리 push + 자동 제거 타이머 등록
  function spawnEchoes(items: TextItem[]) {
    for (const item of items) {
      const id = nextEchoId++;
      echoes = [...echoes, {
        id,
        text: buildMessageText(item),
        fontIndex: item.fontIndex,
        color: currentTheme.textColors[item.colorIndex],
        fontSize: item.fontSize,
        x: item.positionX,
        y: item.positionY
      }];
      const timerId = setTimeout(() => {
        removeEcho(id);
        echoTimers = echoTimers.filter(t => t !== timerId);
      }, ECHO_DURATION_MS);
      echoTimers = [...echoTimers, timerId];
    }
    // 가벼운 상한: 폭증 시 오래된 echo부터 잘라냄 (타이머는 만료 시 removeEcho가 no-op이 되므로 무해)
    if (echoes.length > ECHO_MAX) {
      echoes = echoes.slice(echoes.length - ECHO_MAX);
    }
  }

  // 하트만 생성하는 함수 (드래그용)
  function createHeartAtPosition(clientX: number, clientY: number) {
    heartEffects = [...heartEffects, { id: nextHeartId++, x: clientX, y: clientY }];
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

  // 변형 폼 객체 (showSpecialMessage/showMyu 분기 + variantIndex 안전 접근)
  function variantOf(item: TextItem): MyaVariant {
    const variants = variantsFor(item.showSpecialMessage, item.showMyu);
    return variants[item.variantIndex] ?? variants[0];
  }

  // 메시지 문자열 조합 (변형 폼 base + 부호, exclamationFirst 순서 반영)
  function buildMessageText(item: TextItem): string {
    const base = variantOf(item).text;
    const exclamation = item.showExclamation ? '!' : '';
    const question = item.showQuestionMark ? '?' : '';
    const marks = item.exclamationFirst ? exclamation + question : question + exclamation;
    return base + marks;
  }

  // 부호가 얹는 뉘앙스 (먀? = 되묻기, 먀! = 반가움 — 실제 카톡 용례 기반)
  function punctuationNuance(item: TextItem): string {
    if (item.showSpecialMessage) return '';
    if (item.showExclamation && item.showQuestionMark) return ' · 놀라 들뜬 톤';
    if (item.showQuestionMark) return ' · 살짝 되묻듯';
    if (item.showExclamation) return ' · 반가움 가득';
    return '';
  }

  // 먀-사전: 글자의 변형 폼 + 부호에 대응하는 뜻 (롱프레스 시 표시)
  function lookupMeaning(item: TextItem): string {
    return variantOf(item).meaning + punctuationNuance(item);
  }

  // 경계 박스 타입
  interface BoundingBox {
    left: number;   // vw %
    right: number;  // vw %
    top: number;    // vh %
    bottom: number; // vh %
    width: number;  // vw %
    height: number; // vh %
    centerX: number; // vw %
    centerY: number; // vh %
  }

  // 텍스트 아이템의 경계 박스 계산 (충돌용 - 타이트한 박스)
  function getBoundingBox(item: TextItem): BoundingBox {
    const aspectRatio = window.innerWidth / window.innerHeight;
    // 텍스트 높이 (vh %) - 충돌 패딩만 추가
    const heightVh = item.fontSize + COLLISION_PADDING * 2;
    // 텍스트 너비 (vh → vw % 변환) - 충돌 패딩만 추가
    const widthVh = item.fontSize * TEXT_WIDTH_RATIO + COLLISION_PADDING * 2;
    const widthVw = widthVh / aspectRatio;

    return {
      left: item.positionX - widthVw / 2,
      right: item.positionX + widthVw / 2,
      top: item.positionY - heightVh / 2,
      bottom: item.positionY + heightVh / 2,
      width: widthVw,
      height: heightVh,
      centerX: item.positionX,
      centerY: item.positionY
    };
  }

  // 벽 충돌용 경계 박스 (애니메이션 마진 포함)
  function getWallBoundingBox(item: TextItem): BoundingBox {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const heightVh = item.fontSize + ANIMATION_MARGIN * 2;
    const widthVh = item.fontSize * TEXT_WIDTH_RATIO + ANIMATION_MARGIN * 2;
    const widthVw = widthVh / aspectRatio;

    return {
      left: item.positionX - widthVw / 2,
      right: item.positionX + widthVw / 2,
      top: item.positionY - heightVh / 2,
      bottom: item.positionY + heightVh / 2,
      width: widthVw,
      height: heightVh,
      centerX: item.positionX,
      centerY: item.positionY
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
    const showSpecialMessage = loveActive && Math.random() < SPECIAL_MESSAGE_PROBABILITY;
    const showMyu = isMyu;  // 파라미터로 전달받음
    const showExclamation = Math.random() < EXCLAMATION_PROBABILITY;
    // 물음표는 사랑해가 아닐 때만 적용
    const showQuestionMark = !showSpecialMessage && Math.random() < QUESTION_MARK_PROBABILITY;
    // !?와 ?! 순서 랜덤 결정
    const exclamationFirst = Math.random() < 0.5;
    // 사투리: 먀/뮤/사랑해 계열 내에서 실제 카톡 빈도 가중으로 변형 폼 추첨
    const variantIndex = pickVariantIndex(variantsFor(showSpecialMessage, showMyu));

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
        id: nextItemId++,
        fontIndex,
        colorIndex,
        animationIndex,
        fontSize,
        positionX,
        positionY,
        velocityX: 0,
        velocityY: 0,
        isDragging: false,
        showSpecialMessage,
        showMyu,
        showExclamation,
        showQuestionMark,
        exclamationFirst,
        variantIndex,
        trail: []
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

  // 탭 지점에서 새 그라데이션이 원형으로 번지는 잉크 디졸브 시작.
  // 위치 이동 애니메이션이 아니라 clip-path reveal이라 애니메이션 원칙에 부합한다.
  function startThemeDissolve(gradient: string, x: number, y: number) {
    if (dissolveTimer !== null) clearTimeout(dissolveTimer);
    const id = ++dissolveId;
    dissolve = { id, gradient, x, y, r: 0 };
    // 다음 프레임에 반지름을 키워 clip-path 트랜지션을 발동(enter 트랜지션 트릭)
    requestAnimationFrame(() => {
      if (dissolve && dissolve.id === id) dissolve = { ...dissolve, r: 150 };
    });
    dissolveTimer = setTimeout(() => {
      displayGradient = gradient; // 배경을 새 그라데이션으로 이음매 없이 커밋
      dissolve = null;
      dissolveTimer = null;
    }, DISSOLVE_MS);
  }

  function handleClick(event: MouseEvent | TouchEvent) {
    // 체온 글로우 릴리스 직후 따라오는 합성 click은 무시 (붙잡고 있던 글자를 갈아엎지 않게)
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    // 오디오 진입 의식: 첫 사용자 제스처에서 1회만 AudioContext 생성/resume
    if (!audioInitialized) {
      audioInitialized = true;
      initAudioOnFirstGesture();
    }

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
    const themeChanging = shouldChangeTheme();
    if (themeChanging) {
      currentTheme = selectDifferentTheme(currentTheme.id as ThemeId);
    }

    // 배경색 변경 (변경됐을 수 있는 현재 테마 내에서)
    let newGradientIndex;
    do {
      newGradientIndex = getRandomIndex(currentTheme.gradients.length);
    } while (newGradientIndex === currentGradientIndex && currentTheme.gradients.length > 1);
    currentGradientIndex = newGradientIndex;
    const newGradient = currentTheme.gradients[currentGradientIndex];

    if (themeChanging || dissolve !== null) {
      // 새 계절(또는 디졸브 진행 중의 색 변경)은 탭 지점에서 원형으로 번지는 잉크 디졸브로.
      // dissolve 활성 중 displayGradient를 밑에서 직접 쓰면 배경이 튀고, 대기 중이던 타이머가
      // 나중에 그라데이션을 되돌려 state desync를 만들므로 반드시 디졸브 경로로 라우팅한다.
      startThemeDissolve(newGradient, clientX, clientY);
    } else {
      // 같은 테마 내 색 변경은 즉시 (main의 0.2s 배경 트랜지션)
      displayGradient = newGradient;
    }

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

    // 잔향 메아리 생성 (newItems가 확정된 시점)
    spawnEchoes(newItems);

    // 사운드 재생 (음색은 현재 테마).
    // AudioContext는 위 initAudioOnFirstGesture가 만든 것을 재사용하며, 없으면 무음.
    // F2: 이번 탭에 '사랑해'(special)가 하나라도 있으면 숨은 멜로디만 재생하고,
    //     아니면 F1처럼 각 글자에 일반 목소리를 재생한다(이중 재생 방지).
    const skin = soundSkinFor(currentTheme.id as ThemeId);
    const hasSpecial = newItems.some((it) => it.showSpecialMessage);
    if (hasSpecial) {
      playLoveMelody(skin);
    } else {
      for (const item of newItems) {
        playLetterVoice(
          {
            colorIndex: item.colorIndex,
            fontSize: item.fontSize,
            positionX: item.positionX,
            showMyu: item.showMyu,
          },
          skin
        );
      }
    }

    textItems = newItems;
  }

  // 배경 드래그 시작 (글자가 아닌 곳에서 드래그 시)
  function handleBackgroundDragStart(event: MouseEvent | TouchEvent) {
    // 글자를 드래그 중이면 배경 드래그 무시
    if (draggedItemId !== null) return;
    isBackgroundDragging = true;
    lastHeartTime = Date.now();
  }

  // 배경 드래그 중 하트 생성
  function handleBackgroundDragMove(event: MouseEvent | TouchEvent) {
    if (!isBackgroundDragging || draggedItemId !== null) return;

    const now = Date.now();
    if (now - lastHeartTime < HEART_THROTTLE_MS) return;
    lastHeartTime = now;

    let clientX: number, clientY: number;
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ('clientX' in event) {
      clientX = (event as MouseEvent).clientX;
      clientY = (event as MouseEvent).clientY;
    } else {
      return;
    }

    createHeartAtPosition(clientX, clientY);
  }

  // 배경 드래그 종료
  function handleBackgroundDragEnd() {
    isBackgroundDragging = false;
  }

  // 좌표 추출 헬퍼
  function getEventCoords(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
    if ('touches' in event && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if ('clientX' in event) {
      return { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
    }
    return null;
  }

  // 픽셀 좌표를 vw/vh %로 변환
  function pixelToPercent(px: number, py: number): { x: number; y: number } {
    return {
      x: (px / window.innerWidth) * 100,
      y: (py / window.innerHeight) * 100
    };
  }

  // vw/vh %를 픽셀로 변환
  function percentToPixel(vwPercent: number, vhPercent: number): { x: number; y: number } {
    return {
      x: (vwPercent / 100) * window.innerWidth,
      y: (vhPercent / 100) * window.innerHeight
    };
  }

  // 글자 드래그 시작
  // 체온 글로우 정리 (타이머/RAF 취소 + 상태 리셋).
  function cancelHold() {
    if (holdTimer !== null) { clearTimeout(holdTimer); holdTimer = null; }
    if (holdRaf !== null) { cancelAnimationFrame(holdRaf); holdRaf = null; }
    heldItemId = null;
    holdGlow = 0;
  }

  // 길게 누름이 확정되면 흰 후광을 0→1로 서서히 차오르게 한다(제자리, 위치 이동 없음).
  function startHoldGlow(itemId: number) {
    holdTimer = null;
    heldItemId = itemId;
    // 모션 민감 사용자: 램프 없이 즉시 최대 후광 (BokehField/echo와 동일한 대응)
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      holdGlow = 1;
      return;
    }
    let startTs: number | null = null;
    const ramp = (ts: number) => {
      if (startTs === null) startTs = ts;
      holdGlow = Math.min((ts - startTs) / HOLD_RAMP_MS, 1);
      if (holdGlow < 1 && heldItemId === itemId) {
        holdRaf = requestAnimationFrame(ramp);
      } else {
        holdRaf = null;
      }
    };
    holdRaf = requestAnimationFrame(ramp);
  }

  function handleItemDragStart(event: MouseEvent | TouchEvent, itemId: number) {
    event.preventDefault();
    event.stopPropagation();

    const coords = getEventCoords(event);
    if (!coords) return;

    const item = textItems.find(t => t.id === itemId);
    if (!item) return;

    // 글자 중심 위치 (픽셀)
    const itemCenter = percentToPixel(item.positionX, item.positionY);

    draggedItemId = itemId;
    dragOffsetX = coords.x - itemCenter.x;
    dragOffsetY = coords.y - itemCenter.y;

    // 드래그 이력 초기화
    dragHistory = [{ x: coords.x, y: coords.y, time: Date.now() }];

    // 드래그 중인 아이템 상태 업데이트
    textItems = textItems.map(t =>
      t.id === itemId
        ? { ...t, isDragging: true, velocityX: 0, velocityY: 0 }
        : t
    );

    // 체온 글로우 후보: 정지 길게누름 감지 시작 (움직이면 handleGlobalDragMove에서 취소)
    cancelHold();
    holdStartX = coords.x;
    holdStartY = coords.y;
    holdTimer = setTimeout(() => startHoldGlow(itemId), HOLD_DELAY_MS);
  }

  // 글자 드래그 이동 (전역)
  function handleGlobalDragMove(event: MouseEvent | TouchEvent) {
    // 글자 드래그 중이면 글자 이동
    if (draggedItemId !== null) {
      event.preventDefault();
      const coords = getEventCoords(event);
      if (!coords) return;

      // 체온 글로우: 일정 이상 움직이면 드래그로 간주하고 hold 취소
      if ((heldItemId !== null || holdTimer !== null) &&
          Math.hypot(coords.x - holdStartX, coords.y - holdStartY) > HOLD_MOVE_THRESHOLD) {
        cancelHold();
      }

      const newPos = pixelToPercent(coords.x - dragOffsetX, coords.y - dragOffsetY);
      const now = Date.now();

      // 드래그 중 속도 계산 (잔상 효과용)
      let dragVelX = 0;
      let dragVelY = 0;
      if (dragHistory.length > 0) {
        const lastPoint = dragHistory[dragHistory.length - 1];
        const dt = Math.max(now - lastPoint.time, 1);
        // 픽셀 속도를 % 단위로 변환
        dragVelX = ((coords.x - lastPoint.x) / dt) * 16 / window.innerWidth * 100;
        dragVelY = ((coords.y - lastPoint.y) / dt) * 16 / window.innerHeight * 100;
      }

      textItems = textItems.map(t => {
        if (t.id === draggedItemId) {
          return { ...t, positionX: newPos.x, positionY: newPos.y, velocityX: dragVelX, velocityY: dragVelY };
        }
        return t;
      });

      // 드래그 이력에 추가 (최근 DRAG_HISTORY_SIZE개만 유지)
      dragHistory.push({ x: coords.x, y: coords.y, time: now });
      if (dragHistory.length > DRAG_HISTORY_SIZE) {
        dragHistory.shift();
      }
    } else {
      // 배경 드래그
      handleBackgroundDragMove(event);
    }
  }

  // 드래그 이력에서 속도 계산 (가중 평균)
  function calculateVelocityFromHistory(): { vx: number; vy: number } {
    const now = Date.now();

    // 시간 윈도우 내의 이력만 사용
    const recentHistory = dragHistory.filter(p => now - p.time < DRAG_VELOCITY_WINDOW);

    if (recentHistory.length < 2) {
      return { vx: 0, vy: 0 };
    }

    // 가중 평균 속도 계산 (최근 움직임에 더 높은 가중치)
    let totalVx = 0;
    let totalVy = 0;
    let totalWeight = 0;

    for (let i = 1; i < recentHistory.length; i++) {
      const p1 = recentHistory[i - 1];
      const p2 = recentHistory[i];
      const dt = Math.max(p2.time - p1.time, 1);

      // 속도 (픽셀/ms)
      const vx = (p2.x - p1.x) / dt;
      const vy = (p2.y - p1.y) / dt;

      // 최근일수록 높은 가중치 (지수 가중)
      const weight = Math.pow(2, i);
      totalVx += vx * weight;
      totalVy += vy * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return { vx: 0, vy: 0 };
    }

    // 평균 속도 (픽셀/ms → 픽셀/프레임, 약 60fps = 16ms)
    const avgVx = (totalVx / totalWeight) * 16;
    const avgVy = (totalVy / totalWeight) * 16;

    return { vx: avgVx, vy: avgVy };
  }

  // 글자 드래그 종료 (전역)
  function handleGlobalDragEnd(event: MouseEvent | TouchEvent) {
    if (draggedItemId !== null) {
      // 체온 글로우 릴리스: hold이 활성이었으면 글자에서 풍성한 하트를 터뜨린다(던지기 아님)
      const wasHold = heldItemId !== null;
      if (wasHold) {
        const heldItem = textItems.find(t => t.id === heldItemId);
        if (heldItem) {
          const center = percentToPixel(heldItem.positionX, heldItem.positionY);
          const bursts = 1 + Math.round(holdGlow * 3); // 후광 세기에 비례해 1~4회
          for (let b = 0; b < bursts; b++) {
            heartEffects = [...heartEffects, { id: nextHeartId++, x: center.x, y: center.y }];
          }
        }
        // 이어지는 합성 click이 붙잡던 글자를 재생성하지 않게 (click을 내는 mouseup/touchend에서만)
        if (event.type === 'mouseup' || event.type === 'touchend') {
          suppressNextClick = true;
        }
      }

      // 현재 위치도 이력에 추가
      const coords = getEventCoords(event);
      if (coords) {
        dragHistory.push({ x: coords.x, y: coords.y, time: Date.now() });
      }

      // 드래그 이력 기반 속도 계산
      const { vx, vy } = calculateVelocityFromHistory();

      // 픽셀 속도를 % 단위로 변환
      const velocityX = (vx / window.innerWidth) * 100 * THROW_MULTIPLIER;
      const velocityY = (vy / window.innerHeight) * 100 * THROW_MULTIPLIER;

      // 최소 속도 이상일 때만 던지기 적용
      // hold(정지 길게누름)였으면 미세 지터로도 던져지지 않게 속도 무효화
      const hasVelocity = (Math.abs(velocityX) > MIN_VELOCITY || Math.abs(velocityY) > MIN_VELOCITY) && !wasHold;

      textItems = textItems.map(t =>
        t.id === draggedItemId
          ? { ...t, isDragging: false, velocityX: hasVelocity ? velocityX : 0, velocityY: hasVelocity ? velocityY : 0 }
          : t
      );

      draggedItemId = null;
      dragHistory = [];  // 이력 초기화
    }
    cancelHold();  // 누름 종료 시 hold 후보/글로우 정리 (빠른 탭-릴리스 포함)
    handleBackgroundDragEnd();
  }

  // AABB 충돌 감지 및 겹침 정보 반환
  function checkAABBCollision(box1: BoundingBox, box2: BoundingBox): {
    colliding: boolean;
    overlapX: number;
    overlapY: number;
    normalX: number;
    normalY: number;
  } {
    const overlapX = Math.min(box1.right, box2.right) - Math.max(box1.left, box2.left);
    const overlapY = Math.min(box1.bottom, box2.bottom) - Math.max(box1.top, box2.top);

    if (overlapX > 0 && overlapY > 0) {
      // 충돌 법선 방향 결정 (최소 겹침 축 방향)
      const aspectRatio = window.innerWidth / window.innerHeight;
      // vw를 vh로 변환해서 비교
      const overlapXInVh = overlapX * aspectRatio;

      let normalX = 0;
      let normalY = 0;

      if (overlapXInVh < overlapY) {
        // X축 방향 충돌
        normalX = box1.centerX < box2.centerX ? -1 : 1;
      } else {
        // Y축 방향 충돌
        normalY = box1.centerY < box2.centerY ? -1 : 1;
      }

      return { colliding: true, overlapX, overlapY, normalX, normalY };
    }

    return { colliding: false, overlapX: 0, overlapY: 0, normalX: 0, normalY: 0 };
  }

  // AABB 기반 비탄성 충돌 처리 (질량은 글자 크기의 제곱에 비례 - 면적 기반)
  function resolveAABBCollision(
    item1: TextItem,
    item2: TextItem,
    collision: { overlapX: number; overlapY: number; normalX: number; normalY: number }
  ): {
    vel1: {x: number, y: number},
    vel2: {x: number, y: number},
    pos1: {x: number, y: number},
    pos2: {x: number, y: number}
  } {
    const { normalX, normalY, overlapX, overlapY } = collision;

    // 질량은 fontSize의 제곱에 비례 (면적 기반 - 큰 글자가 훨씬 무거움)
    const m1 = item1.fontSize * item1.fontSize;
    const m2 = item2.fontSize * item2.fontSize;
    const totalMass = m1 + m2;
    const e = COLLISION_RESTITUTION;  // 반발계수

    // 겹침 해소 (질량에 반비례하여 밀어냄 - 무거운 글자는 적게 밀림)
    let newPos1X = item1.positionX;
    let newPos1Y = item1.positionY;
    let newPos2X = item2.positionX;
    let newPos2Y = item2.positionY;

    if (normalX !== 0) {
      // X축 분리
      const push1 = overlapX * (m2 / totalMass) * 0.5;
      const push2 = overlapX * (m1 / totalMass) * 0.5;
      newPos1X += normalX * push1;
      newPos2X -= normalX * push2;
    } else {
      // Y축 분리
      const push1 = overlapY * (m2 / totalMass) * 0.5;
      const push2 = overlapY * (m1 / totalMass) * 0.5;
      newPos1Y += normalY * push1;
      newPos2Y -= normalY * push2;
    }

    // 속도 교환 (충돌 축 방향만 - 비탄성 충돌 공식)
    let newVel1X = item1.velocityX;
    let newVel1Y = item1.velocityY;
    let newVel2X = item2.velocityX;
    let newVel2Y = item2.velocityY;

    if (normalX !== 0) {
      // X축 충돌 - X 속도 교환
      const v1 = item1.velocityX;
      const v2 = item2.velocityX;

      // 서로 가까워지는 경우에만 충돌 처리
      if ((normalX > 0 && v1 < v2) || (normalX < 0 && v1 > v2)) {
        // 비탄성 충돌 공식: v1' = ((m1 - e*m2)*v1 + (1+e)*m2*v2) / (m1+m2)
        newVel1X = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / totalMass;
        newVel2X = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / totalMass;
      }
    } else {
      // Y축 충돌 - Y 속도 교환
      const v1 = item1.velocityY;
      const v2 = item2.velocityY;

      // 서로 가까워지는 경우에만 충돌 처리
      if ((normalY > 0 && v1 < v2) || (normalY < 0 && v1 > v2)) {
        // 비탄성 충돌 공식: v1' = ((m1 - e*m2)*v1 + (1+e)*m2*v2) / (m1+m2)
        newVel1Y = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / totalMass;
        newVel2Y = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / totalMass;
      }
    }

    return {
      vel1: { x: newVel1X, y: newVel1Y },
      vel2: { x: newVel2X, y: newVel2Y },
      pos1: { x: newPos1X, y: newPos1Y },
      pos2: { x: newPos2X, y: newPos2Y }
    };
  }

  // 잔상 업데이트 함수
  function updateTrail(item: TextItem, newX: number, newY: number): TrailPosition[] {
    const speed = Math.sqrt(item.velocityX * item.velocityX + item.velocityY * item.velocityY);

    // 속도가 충분히 빠를 때만 잔상 추가
    if (speed > TRAIL_MIN_VELOCITY) {
      // 속도가 클수록 잔상이 약간 더 진하게 (상한 1.5배로 클램프, 위치/속도 계산은 불변)
      const speedBoost = Math.min(1 + speed * 0.15, 1.5);
      const dynamicStart = TRAIL_OPACITY_START * speedBoost;

      // 현재 위치를 잔상으로 추가 (앞에 추가)
      const newTrail: TrailPosition[] = [
        { x: item.positionX, y: item.positionY, opacity: dynamicStart },
        ...item.trail
      ];

      // 잔상 개수 제한 및 투명도 감소
      return newTrail.slice(0, TRAIL_LENGTH).map((t, i) => ({
        ...t,
        opacity: dynamicStart * (1 - (i + 1) / (TRAIL_LENGTH + 1))
      }));
    }

    // 속도가 느리면 잔상 점점 제거 (페이드 아웃)
    if (item.trail.length > 0) {
      return item.trail
        .map(t => ({ ...t, opacity: t.opacity * 0.7 }))
        .filter(t => t.opacity > 0.02);
    }

    return [];
  }

  // 충돌음 게이트: 임계값/프레임상한 통과 시에만 playCollision 호출 (위치·속도 불변).
  // playCollision 내부에서 뮤트/SSR/미지원이 모두 graceful — throw하지 않는다.
  function emitCollisionSound(impact: number, fontSize: number, minImpact: number) {
    if (impact < minImpact) return;                                      // 미세 충돌 무시
    if (collisionSoundsThisFrame >= COLLISION_SOUNDS_PER_FRAME) return;  // 프레임당 상한
    collisionSoundsThisFrame++;
    playCollision(impact, fontSize);
  }

  // 물리 시뮬레이션 업데이트
  function updatePhysics() {
    let hasMovingItems = false;
    const aspectRatio = window.innerWidth / window.innerHeight;

    // 충돌음 프레임 경계: 매 rAF tick마다 카운터 리셋 ('프레임당 최대 3회' 정확히 추적)
    collisionSoundsThisFrame = 0;

    // 1단계: 위치 업데이트 및 벽 충돌 처리
    textItems = textItems.map(item => {
      if (item.isDragging) {
        hasMovingItems = true;
        // 드래그 중에도 잔상 업데이트
        const newTrail = updateTrail(item, item.positionX, item.positionY);
        return { ...item, trail: newTrail };
      }

      // 속도가 충분히 작으면 정지
      if (Math.abs(item.velocityX) < MIN_VELOCITY && Math.abs(item.velocityY) < MIN_VELOCITY) {
        // 정지 시 잔상 페이드 아웃
        const fadingTrail = item.trail
          .map(t => ({ ...t, opacity: t.opacity * 0.5 }))
          .filter(t => t.opacity > 0.02);
        return { ...item, velocityX: 0, velocityY: 0, trail: fadingTrail };
      }

      hasMovingItems = true;

      // 위치 업데이트
      let newX = item.positionX + item.velocityX;
      let newY = item.positionY + item.velocityY;
      let newVelX = item.velocityX * FRICTION;
      let newVelY = item.velocityY * FRICTION;

      // 글자 크기 계산 (경계 반사용)
      const halfHeightVh = item.fontSize / 2 + ANIMATION_MARGIN;
      const halfWidthVh = (item.fontSize * TEXT_WIDTH_RATIO) / 2 + ANIMATION_MARGIN;
      const halfWidthVw = halfWidthVh / aspectRatio;

      // 좌우 벽 반사
      if (newX - halfWidthVw < 0) {
        newX = halfWidthVw;
        emitCollisionSound(Math.abs(newVelX), item.fontSize, MIN_WALL_IMPACT); // 반사 직전 속도 크기
        newVelX = -newVelX * BOUNCE_DAMPING;
      } else if (newX + halfWidthVw > 100) {
        newX = 100 - halfWidthVw;
        emitCollisionSound(Math.abs(newVelX), item.fontSize, MIN_WALL_IMPACT); // 반사 직전 속도 크기
        newVelX = -newVelX * BOUNCE_DAMPING;
      }

      // 상하 벽 반사
      if (newY - halfHeightVh < 0) {
        newY = halfHeightVh;
        emitCollisionSound(Math.abs(newVelY), item.fontSize, MIN_WALL_IMPACT); // 반사 직전 속도 크기
        newVelY = -newVelY * BOUNCE_DAMPING;
      } else if (newY + halfHeightVh > 100) {
        newY = 100 - halfHeightVh;
        emitCollisionSound(Math.abs(newVelY), item.fontSize, MIN_WALL_IMPACT); // 반사 직전 속도 크기
        newVelY = -newVelY * BOUNCE_DAMPING;
      }

      // 잔상 업데이트
      const newTrail = updateTrail(item, newX, newY);

      return {
        ...item,
        positionX: newX,
        positionY: newY,
        velocityX: newVelX,
        velocityY: newVelY,
        trail: newTrail
      };
    });

    // 2단계: 글자간 충돌 감지 및 처리 (AABB 충돌)
    const updatedItems = [...textItems];
    for (let i = 0; i < updatedItems.length; i++) {
      for (let j = i + 1; j < updatedItems.length; j++) {
        const item1 = updatedItems[i];
        const item2 = updatedItems[j];

        // AABB 충돌 감지
        const box1 = getBoundingBox(item1);
        const box2 = getBoundingBox(item2);
        const collision = checkAABBCollision(box1, box2);

        // 충돌 감지
        if (collision.colliding) {
          // AABB 충돌 해결
          const result = resolveAABBCollision(item1, item2, collision);

          // 충돌 전후 상대속도 변화량 = 충돌 세기(impact). 위치·속도는 아래에서 result로 그대로 대입.
          // item1/item2는 아직 충돌 전 속도를 보유 (resolveAABBCollision은 새 객체만 반환, mutate 안 함).
          const dvx = (item1.velocityX - item2.velocityX) - (result.vel1.x - result.vel2.x);
          const dvy = (item1.velocityY - item2.velocityY) - (result.vel1.y - result.vel2.y);
          const impact = Math.sqrt(dvx * dvx + dvy * dvy);
          // 더 큰(둔탁한) 글자 기준으로 음색 결정.
          // ※ approaching 가드가 false면 result 속도 = 입력 속도라 impact≈0 → MIN_LETTER_IMPACT가 무음 처리.
          const hitFontSize = Math.max(item1.fontSize, item2.fontSize);
          emitCollisionSound(impact, hitFontSize, MIN_LETTER_IMPACT);

          // 속도 및 위치 업데이트
          updatedItems[i] = {
            ...updatedItems[i],
            velocityX: result.vel1.x,
            velocityY: result.vel1.y,
            positionX: result.pos1.x,
            positionY: result.pos1.y
          };
          updatedItems[j] = {
            ...updatedItems[j],
            velocityX: result.vel2.x,
            velocityY: result.vel2.y,
            positionX: result.pos2.x,
            positionY: result.pos2.y
          };

          hasMovingItems = true;
        }
      }
    }
    textItems = updatedItems;

    // 움직이는 아이템이나 잔상이 있으면 계속 애니메이션
    const hasTrails = textItems.some(t => t.trail.length > 0);
    if (hasMovingItems || hasTrails) {
      animationFrameId = requestAnimationFrame(updatePhysics);
    } else {
      animationFrameId = null;
    }
  }

  // 물리 시뮬레이션 시작 (움직이는 아이템이 있을 때)
  function startPhysicsIfNeeded() {
    if (animationFrameId === null) {
      animationFrameId = requestAnimationFrame(updatePhysics);
    }
  }

  // textItems가 변경될 때마다 물리 시뮬레이션 확인
  $: if (textItems.some(t => t.velocityX !== 0 || t.velocityY !== 0 || t.isDragging || t.trail.length > 0)) {
    startPhysicsIfNeeded();
  }

  // 먀-사전 롱프레스: 현재 누르고 있는 글자 (뜻풀이 툴팁용)
  $: heldItem = heldItemId !== null ? textItems.find((t) => t.id === heldItemId) : null;
  // 비밀 사전: 사랑해-게이트(loveActive, 와이프 전용) 또는 dev 프리뷰일 때만 일화 노출.
  // 공개 URL 일반 방문자는 일반 뜻만 본다 (파일/일화 없으면 자동 null).
  $: heldAnecdote =
    (loveActive || import.meta.env.DEV) && heldItem ? anecdoteFor(variantOf(heldItem).text) : null;

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
      link.href = `https://fonts.googleapis.com/css2?family=${font.replaceAll(' ', '+')}&display=swap`;
      document.head.appendChild(link);
    });

    // 사랑해-게이트 해소 (1회):
    // 1) 영구 플래그가 있으면 동기로 즉시 활성 (재방문 시 비동기 레이스 없음)
    loveActive = hasLoveFlag();
    // 2) 비밀 링크(?k=<토큰>) 진입이면 활성 + 플래그 기록 후 쿼리 제거 (/mya base·hash 보존)
    const loveParams = new URL(location.href).searchParams;
    if (hasLoveToken(loveParams)) {
      loveActive = true;
      setLoveFlag();
      history.replaceState(null, '', location.pathname + location.hash);
    }
    // 3) 아직 비활성일 때만 와이프 기기 비동기 판별 → 활성 + 자가복구.
    //    이미 플래그/링크로 켜졌으면 매 방문 getHighEntropyValues 호출을 생략하고,
    //    플래그가 지워졌을 때만 다시 돌아 자가복구한다(동작 동일, 호출만 절약).
    if (!loveActive) {
      resolveWifeDevice().then((isWife) => {
        if (isWife) {
          loveActive = true;
          setLoveFlag();
        }
      });
    }

    // cleanup
    return () => {
      window.removeEventListener('resize', setViewportHeight);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      // 남은 echo 타이머 정리
      echoTimers.forEach(t => clearTimeout(t));
      echoTimers = [];
      // 디졸브 타이머 정리
      if (dissolveTimer !== null) clearTimeout(dissolveTimer);
      // 체온 글로우 타이머/RAF 정리
      if (holdTimer !== null) clearTimeout(holdTimer);
      if (holdRaf !== null) cancelAnimationFrame(holdRaf);
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<main
  style="background: {displayGradient}"
  on:click={handleClick}
  on:mousedown={handleBackgroundDragStart}
  on:mousemove={handleGlobalDragMove}
  on:mouseup={handleGlobalDragEnd}
  on:mouseleave={handleGlobalDragEnd}
  on:touchstart={handleBackgroundDragStart}
  on:touchmove={handleGlobalDragMove}
  on:touchend={handleGlobalDragEnd}
>
  {#if dissolve}
    {#key dissolve.id}
      <div class="theme-dissolve" style="background: {dissolve.gradient}; clip-path: circle({dissolve.r}% at {dissolve.x}px {dissolve.y}px);"></div>
    {/key}
  {/if}

  <BokehField colors={currentTheme.heartColors} />

  <!-- 디버깅: 화면 경계 표시 -->
  {#if DEBUG_SHOW_BOUNDS}
    <div class="debug-screen-boundary"></div>
  {/if}

  <!-- 잔향 메아리(echo) 렌더링 -->
  {#each echoes as e (e.id)}
    <span
      class="echo-ripple"
      style="
        font-family: {fonts[e.fontIndex]};
        color: {e.color};
        font-size: {e.fontSize}vh;
        left: {e.x}%;
        top: {e.y}%;
      "
    >{e.text}</span>
  {/each}

  {#each textItems as item (item.id)}
    <!-- 잔상 효과 렌더링 -->
    {#each item.trail as trailPos, i (i)}
      <span
        class="trail-ghost"
        style="
          font-family: {fonts[item.fontIndex]};
          color: {currentTheme.textColors[item.colorIndex]};
          color: color-mix(in oklch, {currentTheme.textColors[item.colorIndex]} {Math.round((1 - i / TRAIL_LENGTH) * 100)}%, {currentTheme.textColors[(item.colorIndex + 1) % currentTheme.textColors.length]});
          font-size: {item.fontSize}vh;
          left: {trailPos.x}%;
          top: {trailPos.y}%;
          opacity: {trailPos.opacity};
          filter: blur({1 + i * 0.3}px);
          transform: translate(-50%, -50%) scale({1 - (i + 1) * 0.05});
        "
      >
        {buildMessageText(item)}
      </span>
    {/each}
    <!-- 디버깅: 각 글자의 충돌 박스 표시 -->
    {#if DEBUG_SHOW_BOUNDS}
      {@const box = getBoundingBox(item)}
      <div
        class="debug-collision-box"
        style="left: {box.left}%; top: {box.top}%; width: {box.width}%; height: {box.height}%;"
      ></div>
    {/if}
    <h1
      style="font-family: {fonts[item.fontIndex]}; color: {currentTheme.textColors[item.colorIndex]}; font-size: {item.fontSize}vh; left: {item.positionX}%; top: {item.positionY}%; transform: translate(-50%, -50%); {item.isDragging ? 'cursor: grabbing; z-index: 100;' : 'cursor: grab;'} {item.id === heldItemId ? `text-shadow: 0 0 ${Math.round(6 + holdGlow * 26)}px rgba(255,255,255,${(0.25 + holdGlow * 0.6).toFixed(2)}), 0 0 ${Math.round(holdGlow * 50)}px rgba(255,255,255,${(holdGlow * 0.45).toFixed(2)});` : ''}"
      class="{animations[item.animationIndex]} {item.isDragging ? 'dragging' : ''}"
      on:mousedown={(e) => handleItemDragStart(e, item.id)}
      on:touchstart={(e) => handleItemDragStart(e, item.id)}
    >
      {buildMessageText(item)}
    </h1>
  {/each}

  <!-- 먀-사전 뜻풀이 툴팁 (글자를 길게 누르면 떠오름, 체온 글로우와 연동) -->
  {#if SHOW_HOLD_TOOLTIP && heldItem}
    <div
      class="mya-meaning"
      class:above={heldItem.positionY > 70}
      class:has-anecdote={heldAnecdote}
      style="left: {heldItem.positionX}%; top: {heldItem.positionY}%; --off: {heldItem.fontSize / 2 + 1.5}vh; opacity: {Math.min(holdGlow * 1.6, 1)};"
    >
      <span class="mya-meaning-def">{lookupMeaning(heldItem)}</span>
      {#if heldAnecdote}
        <span class="mya-anecdote-title">{heldAnecdote.title}</span>
        <span class="mya-anecdote-story">{heldAnecdote.story}</span>
      {/if}
    </div>
  {/if}
</main>

<!-- 뮤트 토글: main의 형제로 배치해 전체화면 탭(handleClick)과 분리, stopPropagation으로 방어 -->
<button
  class="mute-toggle"
  type="button"
  aria-label={$muted ? '소리 켜기' : '소리 끄기'}
  on:click|stopPropagation={() => muted.update((m) => !m)}
>{$muted ? '🔇' : '🔊'}</button>

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

  /* 테마 전환 잉크 디졸브: 탭 지점에서 새 그라데이션이 원형으로 reveal (위치 이동 아님 → 원칙 부합) */
  .theme-dissolve {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    transition: clip-path 0.6s ease;
  }

  /* 모션 민감 사용자: 디졸브 전환 없이 즉시 (BokehField/echo와 동일한 대응) */
  @media (prefers-reduced-motion: reduce) {
    .theme-dissolve {
      transition: none;
    }
  }

  /* 먀-사전 뜻풀이 툴팁 (롱프레스 시 글자 옆에 떠오름) */
  .mya-meaning {
    position: absolute;
    transform: translate(-50%, var(--off, 8vh));
    max-width: 70vw;
    padding: 6px 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.88);
    color: #4a4a4a;
    font-size: 14px;
    line-height: 1.35;
    text-align: center;
    pointer-events: none;
    z-index: 150;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    transition: opacity 0.2s ease;
    -webkit-backdrop-filter: blur(2px);
    backdrop-filter: blur(2px);
  }

  /* 화면 아래쪽 글자는 툴팁을 위로 띄움 */
  .mya-meaning.above {
    transform: translate(-50%, calc(-100% - var(--off, 8vh)));
  }

  /* 일화가 딸린 툴팁은 조금 더 넓게 (1~2문장 가독) */
  .mya-meaning.has-anecdote {
    max-width: 80vw;
    padding: 10px 16px;
  }

  .mya-meaning-def {
    display: block;
    font-weight: 500;
  }

  /* 둘만의 비밀 사전 일화 — 뜻 아래에 다정하게 피어남 */
  .mya-anecdote-title {
    display: block;
    margin-top: 7px;
    font-size: 13px;
    font-weight: 600;
    color: #c2185b;
  }

  .mya-anecdote-story {
    display: block;
    margin-top: 3px;
    font-size: 12.5px;
    line-height: 1.45;
    color: #5a5a5a;
  }

  h1 {
    margin: 0;
    user-select: none;
    /* 위치 이동은 물리 엔진이 직접 제어하므로 transition 제외 */
    transition: color 0.2s ease, filter 0.2s ease;
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

  h1.dragging {
    animation: none !important;
    transform: translate(-50%, -50%) scale(1.05);
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
  }

  /* 잔상 효과 스타일 */
  .trail-ghost {
    position: absolute;
    margin: 0;
    user-select: none;
    pointer-events: none;
    white-space: nowrap;
    text-align: center;
    transform-origin: center center;
    z-index: 1;
  }

  /* 잔향 메아리(echo) 레이아웃 - 애니메이션은 :global(.echo-ripple) (animations.css) */
  .echo-ripple {
    position: absolute;
    margin: 0;
    user-select: none;
    pointer-events: none;
    white-space: nowrap;
    text-align: center;
    transform-origin: center center;
    filter: blur(8px);
    z-index: 1;
  }

  /* 뮤트 토글 버튼 — 우하단 고정, 낮은 opacity, 정적(위치이동 애니메이션 없음) */
  .mute-toggle {
    position: fixed;
    bottom: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: transparent;
    opacity: 0.4;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    z-index: 200; /* 드래그 글자 z-index:100 보다 위 */
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    transition: opacity 0.2s ease;
  }

  .mute-toggle:hover,
  .mute-toggle:focus-visible {
    opacity: 0.8;
  }

  /* 디버깅용 화면 경계 박스 */
  .debug-screen-boundary {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 3px solid rgba(255, 0, 0, 0.7);
    box-sizing: border-box;
    pointer-events: none;
    z-index: 1000;
  }

  /* 디버깅용 충돌 박스 */
  .debug-collision-box {
    position: absolute;
    border: 2px solid rgba(0, 255, 0, 0.8);
    background-color: rgba(0, 255, 0, 0.1);
    box-sizing: border-box;
    pointer-events: none;
    z-index: 999;
  }
</style>
