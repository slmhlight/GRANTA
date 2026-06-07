import fs from 'node:fs';
const f = 'client/src/lib/query-dsl.ts';
let s = fs.readFileSync(f, 'utf8');
/* Single occurrence in current file. */
const old = 'return withPlaceholders.replace(/(\\d+)/g, (_, idx) => `"${quoted[parseInt(idx, 10)]}"`);';
const nw  = 'return withPlaceholders.replace(/__QQ(\\d+)__/g, (_, idx) => `"${quoted[parseInt(idx, 10)]}"`);';
console.log('Found at:', s.indexOf(old));
if (s.indexOf(old) >= 0) {
  s = s.replace(old, nw);
  fs.writeFileSync(f, s);
  console.log('Written.');
}
