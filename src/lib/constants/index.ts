export const SPECIAL_MESSAGE_PROBABILITY = 0.1;
export const EXCLAMATION_PROBABILITY = 0.3;
export const QUESTION_MARK_PROBABILITY = 0.3;
export const SINGLE_DAY_FONT_PROBABILITY = 0.3;
export const DIALECT_PROBABILITY = 0.3; // 와이프 전용: 뮤 메시지가 X뮤 사투리(괜찮뮤 등)로 뜰 확률

// Love-gate ("사랑해" reveal) — wife-only soft gate. No date gate, no cookie.
// loveActive turns on via either (A) device-model match or (B) the secret URL token,
// and is persisted in a self-healing, non-expiring localStorage flag.
export const LOVE_STORAGE_KEY = 'mya_love'; // localStorage key (mirrors audio.ts 'mya_muted'), value '1'
export const LOVE_MODEL_TOKEN = 'SM-S908'; // substring matched against userAgentData high-entropy model; covers regional suffixes (N/B/0…)
export const LOVE_URL_PARAM = 'k'; // secret activation query param (?k=<token>)
export const LOVE_URL_TOKEN = '5804f4fc963d49910a110bca'; // backup link token; ships in the static bundle — a soft gesture, not a security boundary

// Font size range (vh units)
export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 22;
export const FONT_SIZE_DEFAULT = 16;

// Heart bubble effect
export const HEART_COUNT_MIN = 3;
export const HEART_COUNT_MAX = 5;
export const HEART_SIZE_MIN = 14;
export const HEART_SIZE_MAX = 24;
export const HEART_ANIMATION_DURATION = 800;
export const HEART_SPREAD_RADIUS = 30; 