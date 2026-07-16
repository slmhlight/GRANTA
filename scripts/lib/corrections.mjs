/*
 * H6 D5 — corrections 도메인 분할 로더 (888줄 단일 파일 > 600줄 트리거 도달로 분할).
 * data/corrections/*.json 을 병합해 구 r226-value-corrections.json 과 동일 형태의 단일 객체 반환.
 *
 * 규칙:
 *  - 같은 top-level 도메인 키가 두 파일에 정의되면 즉시 throw (silent clobber 차단 — 빌드 게이트).
 *  - '_' 로 시작하는 키(_meta·_note)는 파일 로컬 주석 — 병합 결과에서 제외 (도메인 아님).
 *  - 파일은 이름순으로 읽음 (결정적).
 *
 * 소비처: build-registry.mjs (remove·값교정) · tests/corrections-schema.test.ts · tests/registry-integrity.test.ts.
 * 도메인 → 파일 매핑: values(ranges·fields) · aliases(aliasesByBase) · sources(sourcesBySubcategory)
 *   · classification(subcategoryByBase·compositionByBase) · remove(remove).
 */
import fs from 'node:fs';
import path from 'node:path';

export function loadCorrections(rootDir) {
  const dir = path.join(rootDir, 'data', 'corrections');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) throw new Error(`corrections 디렉터리가 비어 있음: ${dir}`);
  const merged = {};
  const owner = {};
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const [k, v] of Object.entries(j)) {
      if (k.startsWith('_')) continue; // 파일 로컬 주석
      if (k in merged) throw new Error(`corrections 도메인 충돌: '${k}' 가 ${owner[k]} 와 ${f} 양쪽에 정의됨 — 한 도메인은 한 파일에만`);
      merged[k] = v;
      owner[k] = f;
    }
  }
  return merged;
}
