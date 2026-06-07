import fs from 'node:fs';
const f = 'client/src/lib/query-dsl.ts';
let s = fs.readFileSync(f, 'utf8');
const SOH = String.fromCharCode(1);
/* 현재 라인: /([^\s<>=~"<SOH>]+)\s+(...)/g — SOH 제거 + ; 추가 */
const old = '/([^\\s<>=~"' + SOH + ']+)\\s+([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s+(미만|이하|이상|초과|이내)/g';
const nw  = '/([^\\s;<>=~"]+)\\s+([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s+(미만|이하|이상|초과|이내)/g';
console.log('Found at:', s.indexOf(old));
if (s.indexOf(old) >= 0) {
  s = s.replace(old, nw);
  fs.writeFileSync(f, s);
  console.log('Written.');
}
