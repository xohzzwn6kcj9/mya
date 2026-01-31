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

  // 텍스트 아이템 ID 카운터 (textItems 초기화 전에 선언 필요)
  let nextItemId = 0;

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
    exclamationFirst: true
  }];

  // 하트 이펙트 상태
  let heartEffects: HeartEffect[] = [];
  let nextHeartId = 0;

  // 드래그 상태 추적 (배경 드래그용)
  let isBackgroundDragging = false;
  let lastHeartTime = 0;
  const HEART_THROTTLE_MS = 20; // 드래그 시 하트 생성 간격 (ms)

  // 물리 상수
  const FRICTION = 0.997;  // 마찰 계수 (1에 가까울수록 덜 감속) - 낮은 마찰로 오래 미끄러짐
  const MIN_VELOCITY = 0.05;  // 최소 속도 (이하면 정지) - 더 오래 움직임
  const BOUNCE_DAMPING = 0.95;  // 벽 반사 시 에너지 손실 - 완전탄성충돌에 가까움
  const THROW_MULTIPLIER = 2.5;  // 던질 때 속도 배수 - 강하게 던져짐
  const COLLISION_RESTITUTION = 0.98;  // 글자간 충돌 반발계수 (완전탄성충돌에 가까움)

  // 글자 드래그 상태
  let draggedItemId: number | null = null;
  let dragOffsetX = 0;  // 드래그 시작 시 글자 중심과의 오프셋
  let dragOffsetY = 0;

  // 드래그 이력 (속도 계산용) - 최근 몇 개의 위치를 저장
  interface DragPoint { x: number; y: number; time: number; }
  let dragHistory: DragPoint[] = [];
  const DRAG_HISTORY_SIZE = 5;  // 저장할 이력 개수
  const DRAG_VELOCITY_WINDOW = 150;  // 속도 계산에 사용할 시간 윈도우 (ms)

  // 물리 시뮬레이션 활성화
  let animationFrameId: number | null = null;

  function removeHeartEffect(id: number) {
    heartEffects = heartEffects.filter(effect => effect.id !== id);
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
  }

  // 글자 드래그 이동 (전역)
  function handleGlobalDragMove(event: MouseEvent | TouchEvent) {
    // 글자 드래그 중이면 글자 이동
    if (draggedItemId !== null) {
      event.preventDefault();
      const coords = getEventCoords(event);
      if (!coords) return;

      const newPos = pixelToPercent(coords.x - dragOffsetX, coords.y - dragOffsetY);
      const now = Date.now();

      textItems = textItems.map(t => {
        if (t.id === draggedItemId) {
          return { ...t, positionX: newPos.x, positionY: newPos.y };
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
      const hasVelocity = Math.abs(velocityX) > MIN_VELOCITY || Math.abs(velocityY) > MIN_VELOCITY;

      textItems = textItems.map(t =>
        t.id === draggedItemId
          ? { ...t, isDragging: false, velocityX: hasVelocity ? velocityX : 0, velocityY: hasVelocity ? velocityY : 0 }
          : t
      );

      draggedItemId = null;
      dragHistory = [];  // 이력 초기화
    }
    handleBackgroundDragEnd();
  }

  // 글자의 충돌 반경 계산 (원형 근사)
  function getCollisionRadius(item: TextItem): number {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const heightVh = item.fontSize + ANIMATION_MARGIN;
    const widthVh = item.fontSize * TEXT_WIDTH_RATIO + ANIMATION_MARGIN;
    // 타원의 평균 반경 (원형 근사)
    return (heightVh + widthVh / aspectRatio) / 4;
  }

  // 두 글자 사이 거리 계산 (vw/vh 혼합이므로 픽셀로 변환)
  function getDistance(item1: TextItem, item2: TextItem): number {
    const aspectRatio = window.innerWidth / window.innerHeight;
    // vw%를 vh%로 변환해서 같은 단위로 비교
    const dx = (item1.positionX - item2.positionX) * aspectRatio;
    const dy = item1.positionY - item2.positionY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 완전탄성충돌 처리 (2D 당구공 물리)
  function resolveCollision(item1: TextItem, item2: TextItem): { vel1: {x: number, y: number}, vel2: {x: number, y: number} } {
    const aspectRatio = window.innerWidth / window.innerHeight;

    // 위치 차이 (vh 단위로 통일)
    const dx = (item1.positionX - item2.positionX) * aspectRatio;
    const dy = item1.positionY - item2.positionY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      // 완전히 겹친 경우 임의의 방향으로 밀어냄
      return {
        vel1: { x: item1.velocityX + 0.5, y: item1.velocityY },
        vel2: { x: item2.velocityX - 0.5, y: item2.velocityY }
      };
    }

    // 충돌 법선 벡터 (item1에서 item2 방향)
    const nx = dx / dist;
    const ny = dy / dist;

    // 속도를 vh 단위로 변환
    const v1x = item1.velocityX * aspectRatio;
    const v1y = item1.velocityY;
    const v2x = item2.velocityX * aspectRatio;
    const v2y = item2.velocityY;

    // 상대 속도
    const dvx = v1x - v2x;
    const dvy = v1y - v2y;

    // 충돌 법선 방향 상대 속도
    const dvn = dvx * nx + dvy * ny;

    // 서로 멀어지고 있으면 충돌 처리 안함
    if (dvn > 0) {
      return {
        vel1: { x: item1.velocityX, y: item1.velocityY },
        vel2: { x: item2.velocityX, y: item2.velocityY }
      };
    }

    // 질량은 fontSize에 비례 (큰 글자가 더 무거움)
    const m1 = item1.fontSize;
    const m2 = item2.fontSize;

    // 완전탄성충돌 임펄스 계산
    const impulse = (2 * dvn) / (m1 + m2) * COLLISION_RESTITUTION;

    // 새 속도 계산 (vh 단위)
    const newV1x = v1x - impulse * m2 * nx;
    const newV1y = v1y - impulse * m2 * ny;
    const newV2x = v2x + impulse * m1 * nx;
    const newV2y = v2y + impulse * m1 * ny;

    // vw 단위로 다시 변환
    return {
      vel1: { x: newV1x / aspectRatio, y: newV1y },
      vel2: { x: newV2x / aspectRatio, y: newV2y }
    };
  }

  // 물리 시뮬레이션 업데이트
  function updatePhysics() {
    let hasMovingItems = false;
    const aspectRatio = window.innerWidth / window.innerHeight;

    // 1단계: 위치 업데이트 및 벽 충돌 처리
    textItems = textItems.map(item => {
      if (item.isDragging) {
        hasMovingItems = true;
        return item;
      }

      // 속도가 충분히 작으면 정지
      if (Math.abs(item.velocityX) < MIN_VELOCITY && Math.abs(item.velocityY) < MIN_VELOCITY) {
        return { ...item, velocityX: 0, velocityY: 0 };
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
        newVelX = -newVelX * BOUNCE_DAMPING;
      } else if (newX + halfWidthVw > 100) {
        newX = 100 - halfWidthVw;
        newVelX = -newVelX * BOUNCE_DAMPING;
      }

      // 상하 벽 반사
      if (newY - halfHeightVh < 0) {
        newY = halfHeightVh;
        newVelY = -newVelY * BOUNCE_DAMPING;
      } else if (newY + halfHeightVh > 100) {
        newY = 100 - halfHeightVh;
        newVelY = -newVelY * BOUNCE_DAMPING;
      }

      return {
        ...item,
        positionX: newX,
        positionY: newY,
        velocityX: newVelX,
        velocityY: newVelY
      };
    });

    // 2단계: 글자간 충돌 감지 및 처리 (완전탄성충돌)
    const updatedItems = [...textItems];
    for (let i = 0; i < updatedItems.length; i++) {
      for (let j = i + 1; j < updatedItems.length; j++) {
        const item1 = updatedItems[i];
        const item2 = updatedItems[j];

        // 드래그 중인 아이템도 충돌 처리 (밀어내는 효과)
        const r1 = getCollisionRadius(item1);
        const r2 = getCollisionRadius(item2);
        const dist = getDistance(item1, item2);

        // 충돌 감지
        if (dist < r1 + r2) {
          // 충돌 시 속도 교환 (완전탄성충돌)
          const { vel1, vel2 } = resolveCollision(item1, item2);

          // 속도 업데이트
          updatedItems[i] = { ...updatedItems[i], velocityX: vel1.x, velocityY: vel1.y };
          updatedItems[j] = { ...updatedItems[j], velocityX: vel2.x, velocityY: vel2.y };

          // 겹침 해소: 충돌 방향으로 서로 밀어냄
          const overlap = r1 + r2 - dist;
          if (overlap > 0 && dist > 0) {
            const dx = (item1.positionX - item2.positionX) * aspectRatio;
            const dy = item1.positionY - item2.positionY;
            const nx = dx / dist;
            const ny = dy / dist;

            const totalMass = item1.fontSize + item2.fontSize;
            const push1 = overlap * (item2.fontSize / totalMass) * 0.5;
            const push2 = overlap * (item1.fontSize / totalMass) * 0.5;

            updatedItems[i] = {
              ...updatedItems[i],
              positionX: updatedItems[i].positionX + (nx / aspectRatio) * push1,
              positionY: updatedItems[i].positionY + ny * push1
            };
            updatedItems[j] = {
              ...updatedItems[j],
              positionX: updatedItems[j].positionX - (nx / aspectRatio) * push2,
              positionY: updatedItems[j].positionY - ny * push2
            };
          }

          hasMovingItems = true;
        }
      }
    }
    textItems = updatedItems;

    // 움직이는 아이템이 있으면 계속 애니메이션
    if (hasMovingItems) {
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
  $: if (textItems.some(t => t.velocityX !== 0 || t.velocityY !== 0 || t.isDragging)) {
    startPhysicsIfNeeded();
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
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<main
  style="background: {currentTheme.gradients[currentGradientIndex]}"
  on:click={handleClick}
  on:mousedown={handleBackgroundDragStart}
  on:mousemove={handleGlobalDragMove}
  on:mouseup={handleGlobalDragEnd}
  on:mouseleave={handleGlobalDragEnd}
  on:touchstart={handleBackgroundDragStart}
  on:touchmove={handleGlobalDragMove}
  on:touchend={handleGlobalDragEnd}
>
  {#each textItems as item (item.id)}
    <h1
      style="font-family: {fonts[item.fontIndex]}; color: {currentTheme.textColors[item.colorIndex]}; font-size: {item.fontSize}vh; left: {item.positionX}%; top: {item.positionY}%; transform: translate(-50%, -50%); {item.isDragging ? 'cursor: grabbing; z-index: 100;' : 'cursor: grab;'}"
      class="{animations[item.animationIndex]} {item.isDragging ? 'dragging' : ''}"
      on:mousedown={(e) => handleItemDragStart(e, item.id)}
      on:touchstart={(e) => handleItemDragStart(e, item.id)}
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

  h1.dragging {
    animation: none !important;
    transform: translate(-50%, -50%) scale(1.05);
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
  }
</style>
