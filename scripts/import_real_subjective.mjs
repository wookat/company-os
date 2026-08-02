#!/usr/bin/env node
// 真题分析题导入：读 data/realexam_subjective/*.json 生成幂等 INSERT SQL（先按年 DELETE 再 INSERT）
// 用法：node scripts/import_real_subjective.mjs [--dir data/realexam_subjective] [--out data/realexam_subjective.sql]
// JSON 格式（每年一个文件，数组或 {year, questions}）：
//   { "year": 2023, "seq": 34, "subject": "马原·哲学", "stem": "材料+设问全文",
//     "questions": ["设问1", "设问2"], "answer_points": ["要点1", ...],
//     "kp_name": "", "kp_confidence": 1, "third_party_material": 0 }
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const dir = opt("dir", "data/realexam_subjective");
const out = opt("out", "data/realexam_subjective.sql");

const esc = (s) => String(s ?? "").replace(/'/g, "''");

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
if (!files.length) {
  console.error(`未在 ${dir} 找到 .json 文件`);
  process.exit(1);
}

const lines = ["-- 由 scripts/import_real_subjective.mjs 生成，勿手改"];
let total = 0;
for (const f of files) {
  const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const qs = Array.isArray(raw) ? raw : raw.questions;
  const fileYear = Array.isArray(raw) ? null : raw.year;
  if (!Array.isArray(qs) || !qs.length) {
    console.error(`跳过 ${f}：无 questions`);
    continue;
  }
  const years = new Set();
  const rows = qs.map((q, i) => {
    const year = parseInt(q.year ?? fileYear);
    const seq = parseInt(q.seq ?? i + 34);
    for (const [k, v] of Object.entries({ year, seq })) {
      if (!Number.isInteger(v) || v <= 0) throw new Error(`${f} 第 ${i + 1} 题 ${k} 非法`);
    }
    if (!q.stem) throw new Error(`${f} ${year}-${seq} 缺 stem`);
    const subqs = Array.isArray(q.questions) ? q.questions : [];
    const points = Array.isArray(q.answer_points) ? q.answer_points : [];
    if (!q.third_party_material && !points.length) throw new Error(`${f} ${year}-${seq} 缺 answer_points`);
    years.add(year);
    const vals = [
      year, seq, `'${esc(q.subject || "")}'`, `'${esc(q.stem)}'`,
      `'${esc(JSON.stringify(subqs))}'`, `'${esc(JSON.stringify(points))}'`,
      `'${esc(q.kp_name || "")}'`,
      Number.isFinite(+q.kp_confidence) ? +q.kp_confidence : 1,
      q.third_party_material ? 1 : 0,
    ];
    return `INSERT INTO real_subjective (year,seq,subject,stem,questions,answer_points,kp_name,kp_confidence,third_party_material) VALUES (${vals.join(",")});`;
  });
  for (const y of [...years].sort()) lines.push(`DELETE FROM real_subjective WHERE year=${y};`);
  lines.push(...rows);
  total += rows.length;
  console.error(`${f}: ${rows.length} 题（${[...years].join(",")}）`);
}
writeFileSync(out, lines.join("\n") + "\n");
console.error(`共 ${total} 题 → ${out}\n导入：npx wrangler d1 execute zhentigongfang [--local] --file ${out}`);
