/* R167 — Replace fragile U+0001-based placeholders in preprocessKoreanComparators with safe __QQ<idx>__ marker. */
import fs from 'node:fs';

const f = 'client/src/lib/query-dsl.ts';
let s = fs.readFileSync(f, 'utf8');

const SOH = String.fromCharCode(1);
const oldFn1 =
`  const quoted: string[] = [];
  let withPlaceholders = input.replace(/"([^"]*)"/g, (_, inner) => {
    quoted.push(inner);
    return \`${SOH}\${quoted.length - 1}${SOH}\`;
  });`;

const newFn1 =
`  const quoted: string[] = [];
  let withPlaceholders = input.replace(/"([^"]*)"/g, (_, inner) => {
    const idx = quoted.length;
    quoted.push(inner);
    return \`__QQ\${idx}__\`;
  });`;

const i1 = s.indexOf(oldFn1);
console.log('Old fn1 found at:', i1);
if (i1 >= 0) s = s.replace(oldFn1, newFn1);

/* Restore line uses /(\d+)/g currently — replace with /__QQ(\d+)__/g */
const oldRestore = 'return withPlaceholders.replace(/(\\d+)/g, (_, idx) => `"${quoted[parseInt(idx, 10)]}"`);';
const newRestore = 'return withPlaceholders.replace(/__QQ(\\d+)__/g, (_, idx) => `"${quoted[parseInt(idx, 10)]}"`);';
console.log('Old restore found at:', s.indexOf(oldRestore));
s = s.replace(oldRestore, newRestore);

fs.writeFileSync(f, s);
console.log('Written.');
