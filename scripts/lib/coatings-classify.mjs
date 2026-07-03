/*
 * R226p Phase 5 — 코팅 적용성 빌드타임 분류기 (런타임 name-regex 제거용).
 *
 * client/src/lib/coatings.ts 의 COATINGS(substrateMatch·applicableTo)를 파싱해, 각 재료가
 * **alloy-specific 매칭**되는 coating id 집합을 계산 → m.profiles.coatings 로 스탬프.
 * 런타임 recommendedCoatings 는 이 집합 + 'all' 코팅만 쓰므로 regex 불요.
 *
 * behavior identical: 구 호출부가 {category, name, process}만 넘겼으므로(subcategory 미전달)
 * concat = lower(name)+' '+lower(process)+' ' 로 동일 재현. 게이트 테스트가 regex 오라클과 대조.
 */
import fs from 'node:fs';

/** coatings.ts 파싱 → [{id, applicableTo:Set, re:RegExp|null('all')}] */
export function parseCoatings(coatingsTsPath) {
  const src = fs.readFileSync(coatingsTsPath, 'utf8');
  // COATINGS 배열 범위
  const start = src.indexOf('export const COATINGS');
  const body = src.slice(start);
  const out = [];
  // 각 coating 블록: id → applicableTo → substrateMatch (순서 가정, 파일 규약)
  const re = /id:\s*'([^']+)'[\s\S]*?applicableTo:\s*\[([^\]]*)\][\s\S]*?substrateMatch:\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(body))) {
    const id = m[1];
    const applicableTo = new Set([...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]));
    const raw = m[3];
    if (raw === 'all') { out.push({ id, applicableTo, re: null }); continue; }
    // JS 문자열 escape 해제 → 정규식 소스
    const pattern = raw.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    out.push({ id, applicableTo, re: new RegExp(pattern, 'i') });
  }
  return out;
}

/** 재료 → alloy-specific 매칭 coating id 배열 (구 호출부 입력 재현: category/name/process, subcat 미사용). */
export function classifyCoatings(coatingDefs, category, name, process) {
  const concat = `${String(name || '').toLowerCase()} ${String(process || '').toLowerCase()} `;
  const ids = [];
  for (const c of coatingDefs) {
    if (category && !c.applicableTo.has(category) && !c.applicableTo.has('All')) continue;
    if (c.re && c.re.test(concat)) ids.push(c.id);   // 'all'(re=null)은 런타임이 별도 처리
  }
  return ids;
}
