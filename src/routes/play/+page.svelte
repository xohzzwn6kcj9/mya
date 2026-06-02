<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { fonts, animations } from '$lib/config/displayOptions';
  import { getRandomIndex } from '$lib/utils/styleUtils';
  import { selectTheme, type ThemeId, type Theme } from '$lib/utils/themeUtils';
  import '$lib/styles/animations.css';
  import HeartBubbles from '$lib/components/HeartBubbles.svelte';
  import BokehField from '$lib/components/BokehField.svelte';
  import { initAudioOnFirstGesture, muted } from '$lib/audio/audio';
  import { soundSkinFor } from '$lib/audio/soundSkins';
  import { playLetterVoice, playCollision, playMerge, playLoveMelody } from '$lib/audio/voice';
  import { randomBaseWord, mergeResult, type MergeOutcome } from '$lib/game/mergeTree';
  import { FONT_SIZE_BY_TIER, CONSOLATION_FADE_MS } from '$lib/game/constants';

  // 잔상 위치
  interface TrailPosition {
    x: number;
    y: number;
    opacity: number;
  }

  // 게임 글자 아이템 — 메인의 TextItem을 머지 게임용으로 단순화(text+tier로 메시지/계열을 대체).
  interface GameItem {
    id: number;
    text: string; // 표시 글자 (먀 · 뮤 · 먀아 · 뮤우 · 사랑해 · 꽝)
    tier: 1 | 2 | 3;
    fontIndex: number;
    colorIndex: number;
    animationIndex: number;
    fontSize: number; // vh — tier로 결정(합칠수록 커짐)
    positionX: number;
    positionY: number;
    velocityX: number;
    velocityY: number;
    isDragging: boolean;
    trail: TrailPosition[];
    fadeOut?: boolean; // 꽝(3글자)이 잠깐 보인 뒤 사라지는 중인지
  }

  // 하트 이펙트
  interface HeartEffect {
    id: number;
    x: number;
    y: number;
  }

  // 레이아웃/물리 상수 (메인 +page.svelte와 동일 튜닝)
  const TEXT_WIDTH_RATIO = 1.5; // 글자 너비 비율
  const ANIMATION_MARGIN = 1; // 애니메이션 여유 공간
  const COLLISION_PADDING = 0.5; // 충돌 박스 패딩 (vh)
  const TRAIL_LENGTH = 12;
  const TRAIL_OPACITY_START = 0.35;
  const TRAIL_MIN_VELOCITY = 0.15;
  const FRICTION = 0.97;
  const MIN_VELOCITY = 0.03;
  const BOUNCE_DAMPING = 0.5;
  const THROW_MULTIPLIER = 1.2;
  const COLLISION_RESTITUTION = 0.7;
  const MERGE_VELOCITY_DAMPING = 0.55; // 합쳐진 글자는 두 속도 평균을 줄여 차분히 안착
  const CONSOLATION_FADEOUT_MS = 450; // 꽝 사라질 때 opacity 트랜지션 길이(단일 소스 → CSS --fade-ms)

  // 충돌음 throttle (프레임당 최대 3회)
  let collisionSoundsThisFrame = 0;
  const COLLISION_SOUNDS_PER_FRAME = 3;
  const MIN_WALL_IMPACT = 0.25;
  const MIN_LETTER_IMPACT = 0.3;

  // 드래그 상태
  const HEART_THROTTLE_MS = 20;
  const DRAG_HISTORY_SIZE = 5;
  const DRAG_VELOCITY_WINDOW = 150;
  interface DragPoint { x: number; y: number; time: number; }

  // 테마는 세션 동안 고정 (탭은 글자 생성에 쓰이므로 테마 전환 없음)
  const currentTheme: Theme = selectTheme();
  const displayGradient = currentTheme.gradients[getRandomIndex(currentTheme.gradients.length)];

  let nextItemId = 0;
  let nextHeartId = 0;
  let gameItems: GameItem[] = [];
  let heartEffects: HeartEffect[] = [];
  let consolationTimers: ReturnType<typeof setTimeout>[] = []; // 꽝 페이드/제거 타이머 (정리용)

  // 게임 상태: 'playing' → (사랑해 합성) 'won' → (다시 하기) 'playing'. 실패 상태는 없다.
  let gameState: 'playing' | 'won' = 'playing';
  let wonText = ''; // 승리 시 만들어진 글자(사랑해/사랑뮤) — 오버레이에 표시

  let draggedItemId: number | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragHistory: DragPoint[] = [];

  let isBackgroundDragging = false;
  let lastHeartTime = 0;
  let suppressNextClick = false; // 글자를 만지고 뗀 직후 따라오는 click(생성) 무시
  let audioInitialized = false;
  let animationFrameId: number | null = null;

  const skin = soundSkinFor(currentTheme.id as ThemeId); // 테마가 세션 동안 고정이라 상수

  // 새 글자 아이템 — 탭 생성과 (커밋3) 머지 결과가 공유한다.
  function makeItem(opts: {
    text: string;
    tier: 1 | 2 | 3;
    positionX: number;
    positionY: number;
    velocityX?: number;
    velocityY?: number;
    colorIndex?: number;
    fontSize?: number; // tier 기본 크기 대신 명시(좁은 화면 폭 맞춤 등)
  }): GameItem {
    return {
      id: nextItemId++,
      text: opts.text,
      tier: opts.tier,
      fontIndex: getRandomIndex(fonts.length),
      colorIndex: opts.colorIndex ?? getRandomIndex(currentTheme.textColors.length),
      animationIndex: getRandomIndex(animations.length),
      fontSize: opts.fontSize ?? FONT_SIZE_BY_TIER[opts.tier],
      positionX: opts.positionX,
      positionY: opts.positionY,
      velocityX: opts.velocityX ?? 0,
      velocityY: opts.velocityY ?? 0,
      isDragging: false,
      trail: []
    };
  }

  // 좁은 세로 화면(예: 갤럭시 S22U)에서 3글자(사랑해/꽝)가 가로로 넘치지 않도록, 글자 수·화면
  // 너비에 맞춰 tier 기본 크기를 위에서만 줄인다(넓은 화면은 기본값 유지). 머지는 클라이언트에서만
  // 일어나므로 window 사용 안전. JS fontSize 자체를 줄여 충돌 박스(물리)와 시각을 일치시킨다.
  const CHAR_ADVANCE = 1.25; // 보수적 글자 폭 추정(폰트별 advance 상한 여유)
  function sizeForTierVh(tier: 1 | 2 | 3, text: string): number {
    const base = FONT_SIZE_BY_TIER[tier];
    const capPx = (window.innerWidth * 0.9) / (text.length * CHAR_ADVANCE);
    return Math.min(base, (capPx / window.innerHeight) * 100);
  }

  // 큰 글자(특히 3글자)가 화면 밖으로 삐져나오지 않게 중심을 글자 폭/높이 기준으로 클램프(%).
  // sizeForTierVh가 글자 폭 ≤ 0.9×화면너비를 보장하므로 클램프 범위는 항상 유효하다.
  function clampCenterForWord(xPct: number, yPct: number, fontVh: number, text: string) {
    const fontPx = (fontVh / 100) * window.innerHeight;
    const halfW = (text.length * fontPx * CHAR_ADVANCE) / 2;
    const halfH = fontPx / 2 + (ANIMATION_MARGIN / 100) * window.innerHeight;
    const clamp = (v: number, half: number, span: number) => Math.min(Math.max(v, half), span - half);
    return {
      x: (clamp((xPct / 100) * window.innerWidth, halfW, window.innerWidth) / window.innerWidth) * 100,
      y: (clamp((yPct / 100) * window.innerHeight, halfH, window.innerHeight) / window.innerHeight) * 100
    };
  }

  // 같은 글자 두 개가 합쳐진 결과 아이템 — 중점에서 두 속도의 평균(감쇠)으로 안착, 색은 승계.
  function makeMergedItem(a: GameItem, b: GameItem, outcome: MergeOutcome): GameItem {
    const fontSize = sizeForTierVh(outcome.tier, outcome.text);
    const pos = clampCenterForWord((a.positionX + b.positionX) / 2, (a.positionY + b.positionY) / 2, fontSize, outcome.text);
    return makeItem({
      text: outcome.text,
      tier: outcome.tier,
      positionX: pos.x,
      positionY: pos.y,
      velocityX: ((a.velocityX + b.velocityX) / 2) * MERGE_VELOCITY_DAMPING,
      velocityY: ((a.velocityY + b.velocityY) / 2) * MERGE_VELOCITY_DAMPING,
      colorIndex: a.colorIndex,
      fontSize
    });
  }

  function removeItem(id: number) {
    gameItems = gameItems.filter((it) => it.id !== id);
  }

  // 꽝(3글자): CONSOLATION_FADE_MS 동안 보여준 뒤 부드럽게 사라뜨려 보드를 비운다.
  function scheduleConsolationFade(id: number) {
    const showTimer = setTimeout(() => {
      gameItems = gameItems.map((it) => (it.id === id ? { ...it, fadeOut: true } : it));
      const removeTimer = setTimeout(() => removeItem(id), CONSOLATION_FADEOUT_MS);
      consolationTimers = [...consolationTimers, removeTimer];
    }, CONSOLATION_FADE_MS);
    consolationTimers = [...consolationTimers, showTimer];
  }

  // 사랑해(WIN) 합성 — 숨은 멜로디 + 하트 샤워 + 승리 오버레이. 한 판에 한 번만.
  function triggerWin(winItem: GameItem) {
    if (gameState !== 'playing') return;
    gameState = 'won';
    wonText = winItem.text;
    playLoveMelody(skin);
    burstCelebrationHearts(winItem);
  }

  // 승리 하트 샤워: 승리 글자 위치 + 화면 곳곳에서 한꺼번에 피어오른다.
  function burstCelebrationHearts(winItem: GameItem) {
    const center = percentToPixel(winItem.positionX, winItem.positionY);
    const spots = [center];
    for (let i = 0; i < 12; i++) {
      spots.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight });
    }
    heartEffects = [...heartEffects, ...spots.map((p) => ({ id: nextHeartId++, x: p.x, y: p.y }))];
  }

  // 다시 하기: 진행 중 타이머·하트를 정리하고 새 시드 보드로 리셋(테마는 세션 유지).
  function resetGame() {
    consolationTimers.forEach((t) => clearTimeout(t));
    consolationTimers = [];
    heartEffects = [];
    wonText = '';
    gameState = 'playing';
    seedBoard();
  }

  // 글자가 화면 밖으로 나가지 않게 위치를 안전 마진 안으로 클램프
  function clampToBoard(positionX: number, positionY: number, fontSize: number) {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const halfH = fontSize / 2 + ANIMATION_MARGIN;
    const halfW = ((fontSize * TEXT_WIDTH_RATIO) / 2 + ANIMATION_MARGIN) / aspectRatio;
    return {
      x: Math.min(Math.max(positionX, halfW), 100 - halfW),
      y: Math.min(Math.max(positionY, halfH), 100 - halfH)
    };
  }

  // 빈 곳 탭 시 1글자(먀/뮤) 탄약 생성 + 글자 목소리
  function spawnLetter(clientX: number, clientY: number) {
    const text = randomBaseWord();
    const fontSize = FONT_SIZE_BY_TIER[1];
    const raw = pixelToPercent(clientX, clientY);
    const pos = clampToBoard(raw.x, raw.y, fontSize);
    const item = makeItem({ text, tier: 1, positionX: pos.x, positionY: pos.y });
    gameItems = [...gameItems, item];
    playLetterVoice(
      { colorIndex: item.colorIndex, fontSize: item.fontSize, positionX: item.positionX, showMyu: text === '뮤' },
      skin
    );
  }

  function removeHeartEffect(id: number) {
    heartEffects = heartEffects.filter((e) => e.id !== id);
  }

  function createHeartAtPosition(clientX: number, clientY: number) {
    heartEffects = [...heartEffects, { id: nextHeartId++, x: clientX, y: clientY }];
  }

  // ── 좌표 헬퍼 ───────────────────────────────────────────────
  function getEventCoords(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
    if ('touches' in event && event.touches.length > 0) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if ('clientX' in event) {
      return { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
    }
    return null;
  }

  function pixelToPercent(px: number, py: number) {
    return { x: (px / window.innerWidth) * 100, y: (py / window.innerHeight) * 100 };
  }

  function percentToPixel(vw: number, vh: number) {
    return { x: (vw / 100) * window.innerWidth, y: (vh / 100) * window.innerHeight };
  }

  // ── 탭(생성) / 배경 드래그(하트) ────────────────────────────
  function handleClick(event: MouseEvent | TouchEvent) {
    if (gameState !== 'playing') return; // 승리 화면에선 탭으로 글자를 만들지 않는다
    // 글자를 만지고 뗀 직후 따라오는 합성 click은 무시 (탭한 글자 위에 새 글자가 생기지 않게)
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (!audioInitialized) {
      audioInitialized = true;
      initAudioOnFirstGesture();
    }
    const coords = getEventCoords(event) ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    createHeartAtPosition(coords.x, coords.y);
    spawnLetter(coords.x, coords.y);
  }

  function handleBackgroundDragStart() {
    if (draggedItemId !== null) return;
    isBackgroundDragging = true;
    lastHeartTime = Date.now();
  }

  function handleBackgroundDragMove(event: MouseEvent | TouchEvent) {
    if (!isBackgroundDragging || draggedItemId !== null) return;
    const now = Date.now();
    if (now - lastHeartTime < HEART_THROTTLE_MS) return;
    lastHeartTime = now;
    const coords = getEventCoords(event);
    if (coords) createHeartAtPosition(coords.x, coords.y);
  }

  // ── 글자 드래그/던지기 ──────────────────────────────────────
  function handleItemDragStart(event: MouseEvent | TouchEvent, itemId: number) {
    event.preventDefault();
    event.stopPropagation();
    const coords = getEventCoords(event);
    const item = gameItems.find((t) => t.id === itemId);
    if (!coords || !item) return;

    const center = percentToPixel(item.positionX, item.positionY);
    draggedItemId = itemId;
    dragOffsetX = coords.x - center.x;
    dragOffsetY = coords.y - center.y;
    dragHistory = [{ x: coords.x, y: coords.y, time: Date.now() }];
    gameItems = gameItems.map((t) =>
      t.id === itemId ? { ...t, isDragging: true, velocityX: 0, velocityY: 0 } : t
    );
  }

  function handleGlobalDragMove(event: MouseEvent | TouchEvent) {
    if (draggedItemId === null) {
      handleBackgroundDragMove(event);
      return;
    }
    event.preventDefault();
    const coords = getEventCoords(event);
    if (!coords) return;

    const newPos = pixelToPercent(coords.x - dragOffsetX, coords.y - dragOffsetY);
    const now = Date.now();

    // 드래그 중 즉시 속도(잔상용)
    let dragVelX = 0;
    let dragVelY = 0;
    if (dragHistory.length > 0) {
      const last = dragHistory[dragHistory.length - 1];
      const dt = Math.max(now - last.time, 1);
      dragVelX = (((coords.x - last.x) / dt) * 16) / window.innerWidth * 100;
      dragVelY = (((coords.y - last.y) / dt) * 16) / window.innerHeight * 100;
    }

    gameItems = gameItems.map((t) =>
      t.id === draggedItemId
        ? { ...t, positionX: newPos.x, positionY: newPos.y, velocityX: dragVelX, velocityY: dragVelY }
        : t
    );

    dragHistory.push({ x: coords.x, y: coords.y, time: now });
    if (dragHistory.length > DRAG_HISTORY_SIZE) dragHistory.shift();
  }

  // 드래그 이력 → 던지기 속도(최근 움직임에 지수 가중)
  function calculateVelocityFromHistory(): { vx: number; vy: number } {
    const now = Date.now();
    const recent = dragHistory.filter((p) => now - p.time < DRAG_VELOCITY_WINDOW);
    if (recent.length < 2) return { vx: 0, vy: 0 };

    let totalVx = 0;
    let totalVy = 0;
    let totalWeight = 0;
    for (let i = 1; i < recent.length; i++) {
      const dt = Math.max(recent[i].time - recent[i - 1].time, 1);
      const weight = Math.pow(2, i);
      totalVx += ((recent[i].x - recent[i - 1].x) / dt) * weight;
      totalVy += ((recent[i].y - recent[i - 1].y) / dt) * weight;
      totalWeight += weight;
    }
    if (totalWeight === 0) return { vx: 0, vy: 0 };
    return { vx: (totalVx / totalWeight) * 16, vy: (totalVy / totalWeight) * 16 };
  }

  function handleGlobalDragEnd(event: MouseEvent | TouchEvent) {
    if (draggedItemId !== null) {
      const coords = getEventCoords(event);
      if (coords) dragHistory.push({ x: coords.x, y: coords.y, time: Date.now() });

      const { vx, vy } = calculateVelocityFromHistory();
      const velocityX = (vx / window.innerWidth) * 100 * THROW_MULTIPLIER;
      const velocityY = (vy / window.innerHeight) * 100 * THROW_MULTIPLIER;
      const hasVelocity = Math.abs(velocityX) > MIN_VELOCITY || Math.abs(velocityY) > MIN_VELOCITY;

      gameItems = gameItems.map((t) =>
        t.id === draggedItemId
          ? { ...t, isDragging: false, velocityX: hasVelocity ? velocityX : 0, velocityY: hasVelocity ? velocityY : 0 }
          : t
      );

      // 글자를 만진 상호작용이므로 뒤따르는 click(생성)을 막는다
      if (event.type === 'mouseup' || event.type === 'touchend') suppressNextClick = true;
      draggedItemId = null;
      dragHistory = [];
    }
    isBackgroundDragging = false;
  }

  // ── 충돌 ────────────────────────────────────────────────────
  interface BoundingBox {
    left: number; right: number; top: number; bottom: number;
    width: number; height: number; centerX: number; centerY: number;
  }

  function getBoundingBox(item: GameItem): BoundingBox {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const heightVh = item.fontSize + COLLISION_PADDING * 2;
    const widthVw = (item.fontSize * TEXT_WIDTH_RATIO + COLLISION_PADDING * 2) / aspectRatio;
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

  function checkAABBCollision(box1: BoundingBox, box2: BoundingBox) {
    const overlapX = Math.min(box1.right, box2.right) - Math.max(box1.left, box2.left);
    const overlapY = Math.min(box1.bottom, box2.bottom) - Math.max(box1.top, box2.top);
    if (overlapX > 0 && overlapY > 0) {
      const aspectRatio = window.innerWidth / window.innerHeight;
      const overlapXInVh = overlapX * aspectRatio;
      let normalX = 0;
      let normalY = 0;
      if (overlapXInVh < overlapY) {
        normalX = box1.centerX < box2.centerX ? -1 : 1;
      } else {
        normalY = box1.centerY < box2.centerY ? -1 : 1;
      }
      return { colliding: true, overlapX, overlapY, normalX, normalY };
    }
    return { colliding: false, overlapX: 0, overlapY: 0, normalX: 0, normalY: 0 };
  }

  // 비탄성 충돌(질량 ∝ fontSize²) — 충돌 후 위치/속도 반환
  function resolveAABBCollision(
    item1: GameItem,
    item2: GameItem,
    collision: { overlapX: number; overlapY: number; normalX: number; normalY: number }
  ) {
    const { normalX, normalY, overlapX, overlapY } = collision;
    const m1 = item1.fontSize * item1.fontSize;
    const m2 = item2.fontSize * item2.fontSize;
    const totalMass = m1 + m2;
    const e = COLLISION_RESTITUTION;

    let newPos1X = item1.positionX;
    let newPos1Y = item1.positionY;
    let newPos2X = item2.positionX;
    let newPos2Y = item2.positionY;
    if (normalX !== 0) {
      newPos1X += normalX * overlapX * (m2 / totalMass) * 0.5;
      newPos2X -= normalX * overlapX * (m1 / totalMass) * 0.5;
    } else {
      newPos1Y += normalY * overlapY * (m2 / totalMass) * 0.5;
      newPos2Y -= normalY * overlapY * (m1 / totalMass) * 0.5;
    }

    let newVel1X = item1.velocityX;
    let newVel1Y = item1.velocityY;
    let newVel2X = item2.velocityX;
    let newVel2Y = item2.velocityY;
    if (normalX !== 0) {
      const v1 = item1.velocityX;
      const v2 = item2.velocityX;
      if ((normalX > 0 && v1 < v2) || (normalX < 0 && v1 > v2)) {
        newVel1X = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / totalMass;
        newVel2X = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / totalMass;
      }
    } else {
      const v1 = item1.velocityY;
      const v2 = item2.velocityY;
      if ((normalY > 0 && v1 < v2) || (normalY < 0 && v1 > v2)) {
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

  function updateTrail(item: GameItem): TrailPosition[] {
    const speed = Math.sqrt(item.velocityX * item.velocityX + item.velocityY * item.velocityY);
    if (speed > TRAIL_MIN_VELOCITY) {
      const dynamicStart = TRAIL_OPACITY_START * Math.min(1 + speed * 0.15, 1.5);
      const newTrail: TrailPosition[] = [
        { x: item.positionX, y: item.positionY, opacity: dynamicStart },
        ...item.trail
      ];
      return newTrail.slice(0, TRAIL_LENGTH).map((t, i) => ({
        ...t,
        opacity: dynamicStart * (1 - (i + 1) / (TRAIL_LENGTH + 1))
      }));
    }
    if (item.trail.length > 0) {
      return item.trail.map((t) => ({ ...t, opacity: t.opacity * 0.7 })).filter((t) => t.opacity > 0.02);
    }
    return [];
  }

  function emitCollisionSound(impact: number, fontSize: number, minImpact: number) {
    if (impact < minImpact) return;
    if (collisionSoundsThisFrame >= COLLISION_SOUNDS_PER_FRAME) return;
    collisionSoundsThisFrame++;
    playCollision(impact, fontSize, skin);
  }

  // ── 물리 루프 ───────────────────────────────────────────────
  function updatePhysics() {
    let hasMovingItems = false;
    const aspectRatio = window.innerWidth / window.innerHeight;
    collisionSoundsThisFrame = 0;

    // 1단계: 위치/속도/벽 반사
    gameItems = gameItems.map((item) => {
      if (item.isDragging) {
        hasMovingItems = true;
        return { ...item, trail: updateTrail(item) };
      }
      if (Math.abs(item.velocityX) < MIN_VELOCITY && Math.abs(item.velocityY) < MIN_VELOCITY) {
        const fadingTrail = item.trail.map((t) => ({ ...t, opacity: t.opacity * 0.5 })).filter((t) => t.opacity > 0.02);
        return { ...item, velocityX: 0, velocityY: 0, trail: fadingTrail };
      }
      hasMovingItems = true;

      let newX = item.positionX + item.velocityX;
      let newY = item.positionY + item.velocityY;
      let newVelX = item.velocityX * FRICTION;
      let newVelY = item.velocityY * FRICTION;

      const halfHeightVh = item.fontSize / 2 + ANIMATION_MARGIN;
      const halfWidthVw = ((item.fontSize * TEXT_WIDTH_RATIO) / 2 + ANIMATION_MARGIN) / aspectRatio;

      if (newX - halfWidthVw < 0) {
        newX = halfWidthVw;
        emitCollisionSound(Math.abs(newVelX), item.fontSize, MIN_WALL_IMPACT);
        newVelX = -newVelX * BOUNCE_DAMPING;
      } else if (newX + halfWidthVw > 100) {
        newX = 100 - halfWidthVw;
        emitCollisionSound(Math.abs(newVelX), item.fontSize, MIN_WALL_IMPACT);
        newVelX = -newVelX * BOUNCE_DAMPING;
      }
      if (newY - halfHeightVh < 0) {
        newY = halfHeightVh;
        emitCollisionSound(Math.abs(newVelY), item.fontSize, MIN_WALL_IMPACT);
        newVelY = -newVelY * BOUNCE_DAMPING;
      } else if (newY + halfHeightVh > 100) {
        newY = 100 - halfHeightVh;
        emitCollisionSound(Math.abs(newVelY), item.fontSize, MIN_WALL_IMPACT);
        newVelY = -newVelY * BOUNCE_DAMPING;
      }

      return { ...item, positionX: newX, positionY: newY, velocityX: newVelX, velocityY: newVelY, trail: updateTrail(item) };
    });

    // 2단계: 글자간 충돌 → 같은 글자면 합치기(머지), 아니면 튕김.
    const updated = [...gameItems];
    const mergedIds = new Set<number>();
    const mergeSpawns: GameItem[] = [];
    for (let i = 0; i < updated.length; i++) {
      for (let j = i + 1; j < updated.length; j++) {
        const item1 = updated[i];
        const item2 = updated[j];
        if (mergedIds.has(item1.id) || mergedIds.has(item2.id)) continue; // 이 프레임에 이미 합쳐짐
        const collision = checkAABBCollision(getBoundingBox(item1), getBoundingBox(item2));
        if (!collision.colliding) continue;

        const outcome = mergeResult(item1.text, item2.text);
        if (outcome) {
          // 같은 글자 → 합치기 (각 글자는 프레임당 한 번만 합쳐진다)
          mergedIds.add(item1.id);
          mergedIds.add(item2.id);
          const merged = makeMergedItem(item1, item2, outcome);
          mergeSpawns.push(merged);
          if (outcome.isWin) {
            triggerWin(merged); // 사랑해 — 숨은 멜로디 + 하트 샤워 + 승리 오버레이
          } else {
            playMerge(outcome.tier, skin);
            if (outcome.tier === 3) scheduleConsolationFade(merged.id); // 꽝은 잠깐 보였다 사라짐
          }
          hasMovingItems = true;
          continue;
        }

        // 다른 글자 → 튕김
        const result = resolveAABBCollision(item1, item2, collision);
        const dvx = item1.velocityX - item2.velocityX - (result.vel1.x - result.vel2.x);
        const dvy = item1.velocityY - item2.velocityY - (result.vel1.y - result.vel2.y);
        const impact = Math.sqrt(dvx * dvx + dvy * dvy);
        emitCollisionSound(impact, Math.max(item1.fontSize, item2.fontSize), MIN_LETTER_IMPACT);

        updated[i] = { ...item1, velocityX: result.vel1.x, velocityY: result.vel1.y, positionX: result.pos1.x, positionY: result.pos1.y };
        updated[j] = { ...item2, velocityX: result.vel2.x, velocityY: result.vel2.y, positionX: result.pos2.x, positionY: result.pos2.y };
        hasMovingItems = true;
      }
    }
    gameItems =
      mergedIds.size > 0 ? [...updated.filter((it) => !mergedIds.has(it.id)), ...mergeSpawns] : updated;

    const hasTrails = gameItems.some((t) => t.trail.length > 0);
    animationFrameId = hasMovingItems || hasTrails ? requestAnimationFrame(updatePhysics) : null;
  }

  function startPhysicsIfNeeded() {
    if (animationFrameId === null) animationFrameId = requestAnimationFrame(updatePhysics);
  }

  $: if (gameItems.some((t) => t.velocityX !== 0 || t.velocityY !== 0 || t.isDragging || t.trail.length > 0)) {
    startPhysicsIfNeeded();
  }

  // 시작 보드: 던질 짝이 바로 보이게 먀·뮤 2쌍을 고정 위치(2×2)에 둔다.
  // 위치를 고정해 정적 프리렌더(SSR)와 클라이언트가 일치한다(첫 페인트 좌표 점프 없음).
  function seedBoard() {
    const seeds = [
      { text: '먀', x: 32, y: 38 },
      { text: '먀', x: 68, y: 38 },
      { text: '뮤', x: 32, y: 64 },
      { text: '뮤', x: 68, y: 64 }
    ];
    gameItems = seeds.map((s) => makeItem({ text: s.text, tier: 1, positionX: s.x, positionY: s.y }));
  }

  seedBoard();

  onMount(() => {
    function setViewportHeight() {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    }
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);

    fonts.forEach((font) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${font.replaceAll(' ', '+')}&display=swap`;
      document.head.appendChild(link);
    });

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      consolationTimers.forEach((t) => clearTimeout(t));
      consolationTimers = [];
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<main
  style="background: {displayGradient}; --fade-ms: {CONSOLATION_FADEOUT_MS}ms"
  on:click={handleClick}
  on:mousedown={handleBackgroundDragStart}
  on:mousemove={handleGlobalDragMove}
  on:mouseup={handleGlobalDragEnd}
  on:mouseleave={handleGlobalDragEnd}
  on:touchstart={handleBackgroundDragStart}
  on:touchmove={handleGlobalDragMove}
  on:touchend={handleGlobalDragEnd}
>
  <BokehField colors={currentTheme.heartColors} />

  {#each gameItems as item (item.id)}
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
      >{item.text}</span>
    {/each}
    <h1
      style="font-family: {fonts[item.fontIndex]}; color: {currentTheme.textColors[item.colorIndex]}; font-size: {item.fontSize}vh; left: {item.positionX}%; top: {item.positionY}%; transform: translate(-50%, -50%); opacity: {item.fadeOut ? 0 : 1}; {item.isDragging ? 'cursor: grabbing; z-index: 100;' : 'cursor: grab;'}"
      class="{animations[item.animationIndex]} {item.isDragging ? 'dragging' : ''}"
      on:mousedown={(e) => handleItemDragStart(e, item.id)}
      on:touchstart={(e) => handleItemDragStart(e, item.id)}
    >
      {item.text}
    </h1>
  {/each}
</main>

<button
  class="mute-toggle"
  type="button"
  aria-label={$muted ? '소리 켜기' : '소리 끄기'}
  on:click|stopPropagation={() => muted.update((m) => !m)}
>{$muted ? '🔇' : '🔊'}</button>

<!-- 처음(메인)으로 — 좌하단, main의 형제라 전체화면 탭과 분리(버블링 없음) -->
<a class="home-link" href="{base}/" aria-label="처음으로">🏠</a>

{#if gameState === 'won'}
  <div class="win-overlay">
    <div class="win-card">
      <div class="win-word">{wonText}</div>
      <button class="replay" type="button" on:click={resetGame}>다시 하기</button>
    </div>
  </div>
{/if}

{#each heartEffects as effect (effect.id)}
  <HeartBubbles x={effect.x} y={effect.y} heartColors={currentTheme.heartColors} on:complete={() => removeHeartEffect(effect.id)} />
{/each}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    height: calc(var(--vh, 1vh) * 100);
    overflow: hidden;
    position: fixed;
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
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  h1 {
    margin: 0;
    user-select: none;
    /* opacity 길이는 JS CONSOLATION_FADEOUT_MS를 단일 소스로 --fade-ms에 주입(아래 main) */
    transition: color 0.2s ease, font-size 0.2s ease, filter 0.2s ease, opacity var(--fade-ms, 450ms) ease;
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
    z-index: 200;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    transition: opacity 0.2s ease;
  }

  .mute-toggle:hover,
  .mute-toggle:focus-visible {
    opacity: 0.8;
  }

  /* 처음으로(메인) 링크 — 좌하단 고정 (뮤트 토글과 대칭) */
  .home-link {
    position: fixed;
    bottom: 12px;
    left: 12px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.4;
    font-size: 20px;
    line-height: 1;
    text-decoration: none;
    cursor: pointer;
    z-index: 200;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    transition: opacity 0.2s ease;
  }

  .home-link:hover,
  .home-link:focus-visible {
    opacity: 0.8;
  }

  /* 승리 오버레이 — 사랑해를 크게 보여주고 다시 하기 제공. 하트 샤워(z:1000)는 이 위로 떠오른다. */
  .win-overlay {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, 0.18);
    -webkit-tap-highlight-color: transparent;
  }

  .win-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
    padding: 32px 40px;
  }

  .win-word {
    /* 좁은 세로 화면에서 가로로 넘치지 않게 너비(vw)로도 상한 */
    font-size: min(18vh, 26vw);
    color: #fff;
    text-shadow: 0 0 24px rgba(255, 255, 255, 0.9), 0 0 48px rgba(255, 255, 255, 0.6);
    user-select: none;
    animation: win-pulse 1.5s ease-in-out infinite;
  }

  /* 제자리 크기 펄스 (animations.css의 .pulse는 absolute용 translate를 포함하므로 로컬로 정의) */
  @keyframes win-pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.06);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .win-word {
      animation: none;
    }
  }

  .replay {
    padding: 12px 30px;
    border: 2px solid rgba(255, 255, 255, 0.85);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    transition: background 0.2s ease, transform 0.1s ease;
  }

  .replay:hover,
  .replay:focus-visible {
    background: rgba(255, 255, 255, 0.3);
  }

  .replay:active {
    transform: scale(0.95);
  }
</style>
