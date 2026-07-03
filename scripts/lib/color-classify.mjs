/*
 * R226p Phase 5b — family-color 빌드타임 분류기 (런타임 name-regex 제거용).
 *
 * client/src/lib/material-colors.ts 의 CLASSES(순수 데이터: key·color·category|pattern)를 파싱해
 * 각 재료의 color key 를 계산 → m.profiles.colorFamily 로 스탬프. 런타임은 CLASS_COLOR 조회만.
 *
 * behavior identical: 구 classOf 와 동일 — concat = lower(subcategory + ' ' + name), category
 * 클래스는 category 일치, pattern 클래스는 regex(플래그 없음; concat 이 이미 소문자) first-match.
 */
import fs from 'node:fs';

/** material-colors.ts 파싱 → [{key, color, category|null, re|null}] (CLASSES 순서 보존) */
export function parseColorClasses(tsPath) {
  const src = fs.readFileSync(tsPath, 'utf8');
  const start = src.indexOf('export const CLASSES');
  const end = src.indexOf('];', start);
  if (start < 0 || end < 0) throw new Error('material-colors.ts CLASSES 파싱 실패');
  const body = src.slice(start, end);
  const out = [];
  // 각 { key:'..', color:'..', category:'..'? , pattern:'..'? } (필드 순서 규약)
  const re = /\{\s*key:\s*'([^']+)',\s*color:\s*'([^']+)'(?:,\s*category:\s*'([^']+)')?(?:,\s*pattern:\s*'((?:[^'\\]|\\.)*)')?\s*\}/g;
  let m;
  while ((m = re.exec(body))) {
    const key = m[1], color = m[2], category = m[3] || null;
    let reg = null;
    if (m[4]) {
      const pattern = m[4].replace(/\\'/g, "'").replace(/\\\\/g, '\\');   // JS 문자열 escape 해제
      reg = new RegExp(pattern);   // 플래그 없음 (구 코드와 동일; concat 이 소문자)
    }
    out.push({ key, color, category, re: reg });
  }
  return out;
}

/** 재료 → color key (구 classOf 동치). */
export function classifyColorKey(classes, subcategory, name, category) {
  const s = `${subcategory || ''} ${name || ''}`.toLowerCase();
  for (const c of classes) {
    if (c.category) { if (category === c.category) return c.key; }
    else if (c.re && c.re.test(s)) return c.key;
  }
  return 'Other';
}
