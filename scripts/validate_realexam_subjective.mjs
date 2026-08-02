// Validate data/realexam_subjective/{year}.json against dataset invariants.
import { readFileSync } from 'node:fs';

const libSrc = readFileSync('src/library.js', 'utf8');
const kpNames = new Set([...libSrc.matchAll(/name:\s*["']([^"']+)["']/g)].map((m) => m[1]));

let total = 0, tp = 0, low = 0, errs = 0;
const err = (msg) => { console.error('ERROR:', msg); errs++; };

for (let y = 2010; y <= 2025; y++) {
  const arr = JSON.parse(readFileSync(`data/realexam_subjective/${y}.json`, 'utf8'));
  if (arr.length !== 5) err(`${y}: expected 5 items, got ${arr.length}`);
  const seqs = arr.map((e) => e.seq).sort().join(',');
  if (seqs !== '34,35,36,37,38') err(`${y}: seq set ${seqs}`);
  for (const e of arr) {
    const id = `${y}-${e.seq}`;
    if (e.year !== y) err(`${id}: bad year`);
    if (!e.subject) err(`${id}: empty subject`);
    if (!e.stem || e.stem.length < 50) err(`${id}: stem too short`);
    if (!Array.isArray(e.questions) || e.questions.length < 1) err(`${id}: no questions`);
    if (!Array.isArray(e.answer_points) || e.answer_points.length < 3 || e.answer_points.length > 6)
      err(`${id}: answer_points count ${e.answer_points?.length}`);
    if (![0, 1].includes(e.third_party_material)) err(`${id}: bad third_party_material`);
    if (![0.5, 1].includes(e.kp_confidence)) err(`${id}: bad kp_confidence`);
    if (e.kp_name === '' && e.kp_confidence !== 0.5) err(`${id}: empty kp_name needs 0.5`);
    if (e.kp_name && !kpNames.has(e.kp_name)) err(`${id}: kp_name not in library: ${e.kp_name}`);
    if (!Array.isArray(e.sources) || e.sources.length < 1) err(`${id}: no sources`);
    total++; tp += e.third_party_material; if (e.kp_confidence === 0.5) low++;
  }
}
console.log(`total=${total} third_party=${tp} low_confidence=${low} errors=${errs}`);
process.exit(errs ? 1 : 0);
