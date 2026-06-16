// R208 — Dead URL 일괄 교체. data/r208-url-replacements.json 의 매핑을 모든 data/*.json
// 의 sources / ref_urls 필드에 적용. matweb 등은 verified=false 로 강등.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'r208-url-replacements.json'), 'utf8'));
const REPL = map.replacements || {};
const DOWNGRADE = map.downgrade_to_unverified || [];

const TARGETS = [
  'data/supplementary-materials.json',
  'data/material_db.json',
  'data/ceramics-data.json',
  'data/composites-data.json',
  'data/polymers-data.json',
  'data/r173-handbook-sources.json',
  'data/r199-source-urls.json',
  'data/standard-datasheets.json',
];

function isDowngrade(url) {
  if (!url) return false;
  return DOWNGRADE.some(p => url.startsWith(p));
}

let totalReplaced = 0, totalDowngraded = 0;

function walk(node) {
  if (Array.isArray(node)) {
    for (const x of node) walk(x);
    return;
  }
  if (node && typeof node === 'object') {
    // sources[] entry — { url, label, verified, ... }
    if ('url' in node && typeof node.url === 'string') {
      if (REPL[node.url]) {
        node.url = REPL[node.url];
        totalReplaced++;
      }
      if (node.verified === true && isDowngrade(node.url)) {
        node.verified = false;
        totalDowngraded++;
      }
    }
    // ref_urls[] - flat string array
    for (const [k, v] of Object.entries(node)) {
      if (k === 'ref_urls' && Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
          if (typeof v[i] === 'string' && REPL[v[i]]) {
            v[i] = REPL[v[i]];
            totalReplaced++;
          }
        }
      } else {
        walk(v);
      }
    }
  }
}

for (const f of TARGETS) {
  const full = path.join(ROOT, f);
  if (!fs.existsSync(full)) continue;
  const before = fs.readFileSync(full, 'utf8');
  const data = JSON.parse(before);
  const beforeR = totalReplaced, beforeD = totalDowngraded;
  walk(data);
  if (totalReplaced > beforeR || totalDowngraded > beforeD) {
    fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`[${f}] +${totalReplaced - beforeR} replaced, +${totalDowngraded - beforeD} downgraded`);
  }
}
console.log(`\nTotal: ${totalReplaced} URL replaced · ${totalDowngraded} downgraded to verified=false`);
