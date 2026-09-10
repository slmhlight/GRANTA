/*
 * 콘텐츠 SSOT(JSON) 를 **타입으로** 읽기 위한 최소 도구.
 *
 * 배경(H6 F2): 리더들이 `(json as any).k as T` 로 읽고 있었다. 이 꼴은 tsc 를 두 번
 * 우회한다 — any 로 실제 타입을 지운 뒤 원하는 타입을 씌우므로, JSON 의 모양이 T 와
 * 아무리 달라도 컴파일이 통과한다. W4-7 에서 machining 블록을 문자열→객체로 바꿨을 때
 * `pnpm check` 가 아무 말도 못 한 이유가 이것이었다.
 *
 * `const X: T = json.k` 로 쓰면 resolveJsonModule 이 추론한 실제 모양과의 대입 가능성을
 * tsc 가 검사한다. 다만 구멍이 하나 있다: **JSON 의 문자열은 리터럴 유니온이 아니라
 * `string` 으로 추론된다.** 그래서 verdict·risk·band 같은 필드는 tsc 가 값을 못 본다.
 * 거기에 `as` 를 쓰면 SSOT 에 오타가 들어가도 조용히 통과하므로, 대신 **검사해서 좁힌다**.
 *
 * ## 실패했을 때 무엇을 할 것인가
 *
 * 처음에는 예외를 던지게 썼는데, 이 리더들은 `useMaterialFilter` 가 정적으로 import 한다.
 * 즉 모듈 로드 시점의 예외는 React 가 뜨기도 전에 **앱 전체를 백지로 만든다** —
 * ErrorBoundary 도 못 잡는다. 데이터 오타 하나가 치를 대가로는 과하다.
 *
 * 그래서 값을 지어내지도(fabricate) 않고 앱을 죽이지도 않는 쪽을 택했다: **그 항목만
 * 미수록**하고(프로젝트 원칙 — 검증 안 된 값은 안 보여준다), 무슨 일이 있었는지
 * `SSOT_ISSUES` 에 남긴다. 게이트가 이 배열이 비어 있음을 검사하므로 CI 에서 반드시 걸리고,
 * 만에 하나 새어 나가도 화면에서 한 줄이 빠질 뿐 앱은 산다.
 */

/** 로드 중 버려진 항목의 기록 — 게이트가 "비어 있어야 한다" 로 검사한다. */
export const SSOT_ISSUES: string[] = [];

/** 문자열을 허용된 리터럴 유니온으로 좁힌다. 허용 밖이면 기록하고 null (= 그 항목 미수록). */
export function narrowEnum<T extends string>(allowed: readonly T[], v: string, where: string): T | null {
  const hit = allowed.find((a) => a === v);
  if (!hit) {
    SSOT_ISSUES.push(`${where}: "${v}" 는 ${allowed.join('|')} 중 하나가 아니다`);
    return null;
  }
  return hit;
}

/** null 을 걸러내며 타입도 좁힌다 (미수록 처리 후 배열을 다시 조립할 때). */
export function compact<T>(xs: (T | null)[]): T[] {
  return xs.filter((x): x is T => x !== null);
}

/** 값이 있는 항목만 남기는 타입 가드 — JSON 의 선택적 필드가 `T | undefined` 로 추론될 때 쓴다. */
export function definedEntries<T>(rec: Record<string, T | undefined>): [string, T][] {
  return Object.entries(rec).filter((e): e is [string, T] => e[1] !== undefined);
}
