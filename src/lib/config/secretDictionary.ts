// 둘만의 비밀 사전 — 선택적 로더 + 난독 해제.
//
// 실제 일화는 gitignore된 ./myaLexicon.private.ts 의 SECRET_BLOB(XOR+base64 난독화)에 있다.
// 공개 빌드 번들엔 평문이 아니라 이 블롭만 실려 grep·검색엔진·우연한 노출을 막는다.
// ⚠️ 난독화는 '캐주얼 차단'이지 암호화가 아니다 — 디코더와 키가 번들에 함께 실리므로
//    작정하고 역공학하면 복원 가능 (soft gesture, not a security boundary).
// 파일이 없으면(CI에서 secret 미설정) 블롭이 없어 빈 사전으로 graceful degrade.

export interface MyaAnecdote {
  word: string; // 일화가 묶이는 표현
  title: string; // 짧은 제목
  story: string; // 1~2문장 일화
  emotionalTruth: string; // 감정의 결
  date: string; // YYYY-MM-DD
}

// 난독 키 (비밀 아님 — 평문 grep / 온라인 base64 디코드를 막는 용도).
const OBFUSCATION_KEY = 'mya-우리만의-사전';

// base64 → bytes → XOR(반복키) → UTF-8 문자열. (atob/TextEncoder/TextDecoder 는 브라우저·Node18+ 공통)
function deobfuscate(blob: string): string {
  const bin = atob(blob);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const key = new TextEncoder().encode(OBFUSCATION_KEY);
  for (let i = 0; i < bytes.length; i++) bytes[i] ^= key[i % key.length];
  return new TextDecoder().decode(bytes);
}

interface PrivateModule {
  SECRET_BLOB?: string;
}
interface DictData {
  dict?: Record<string, MyaAnecdote>;
  bonus?: MyaAnecdote[];
}

// 리터럴 경로여야 Vite 가 정적 분석. 파일이 없으면 매칭 0 → 블롭 undefined.
const modules = import.meta.glob('./myaLexicon.private.ts', { eager: true }) as Record<
  string,
  PrivateModule
>;
const blob = Object.values(modules)[0]?.SECRET_BLOB;

let data: DictData = {};
if (blob) {
  try {
    data = JSON.parse(deobfuscate(blob)) as DictData;
  } catch {
    data = {};
  }
}

export const SECRET_DICTIONARY: Record<string, MyaAnecdote> = data.dict ?? {};
export const BONUS_GEMS: MyaAnecdote[] = data.bonus ?? [];

// 표시 형태(먀/먀아/뮤우…)에 대응하는 일화 (없으면 null)
export function anecdoteFor(form: string): MyaAnecdote | null {
  return SECRET_DICTIONARY[form] ?? null;
}
