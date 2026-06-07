import fs from 'node:fs';
const f = 'client/src/lib/query-dsl.ts';
let s = fs.readFileSync(f, 'utf8');
const SOH = String.fromCharCode(1);
const old = 'return withPlaceholders.replace(/' + SOH + '(\\d+)' + SOH + '/g, (_, idx) => `"${quoted[parseInt(idx, 10)]}"`);';
const nw  = 'return withPlaceholders.replace(/__QQ(\\d+)__/g, (_, idx) => `"${quoted[parseInt(idx, 10)]}"`);';
console.log('Old found at:', s.indexOf(old));
if (s.indexOf(old) >= 0) {
  s = s.replace(old, nw);
  fs.writeFileSync(f, s);
  console.log('Written.');
}
