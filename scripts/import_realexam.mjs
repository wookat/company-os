#!/usr/bin/env node
// 真题导入：读 data/realexam/*.json 生成幂等 INSERT SQL（先按年 DELETE 再 INSERT）
// 用法：node scripts/import_realexam.mjs [--dir data/realexam] [--out data/realexam.sql]
// JSON 格式（每年一个文件）：
//   { "year": 2023, "questions": [ { "seq": 1, "qtype": "single|multi", "stem": "...",
//     "opt_a": "...", "opt_b": "...", "opt_c": "...", "opt_d": "...", "answer": "A|BCD",
//     "subject": "马原·哲学", "kp_name": "唯物论", "kp_confidence": 0.9,
//     "answer_disputed": 0, "third_party_material": 0, "analysis": "" } ] }
// 也兼容纯数组格式：[ { "year": 2023, "seq": 1, ... }, ... ]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const dir = opt("dir", "data/realexam");
const out = opt("out", "data/realexam.sql");

const esc = (s) => String(s ?? "").replace(/'/g, "''");
const QTYPES = new Set(["single", "multi"]);

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
if (!files.length) {
  console.error(`未在 ${dir} 找到 .json 文件`);
  process.exit(1);
}

// 不生成 BEGIN/COMMIT：Cloudflare D1 remote 不支持 SQL 事务语句，wrangler 批量执行自带原子性
const lines = ["-- 由 scripts/import_realexam.mjs 生成，勿手改"];
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
    const seq = parseInt(q.seq ?? i + 1);
    const qtype = QTYPES.has(q.qtype) ? q.qtype : "single";
    const answer = String(q.answer || "").toUpperCase().replace(/[^ABCD]/g, "");
    for (const [k, v] of Object.entries({ year, seq })) {
      if (!Number.isInteger(v) || v <= 0) throw new Error(`${f} 第 ${i + 1} 题 ${k} 非法`);
    }
    if (!q.stem || !answer) throw new Error(`${f} 第 ${i + 1} 题缺 stem/answer`);
    if (qtype === "single" && answer.length !== 1) throw new Error(`${f} ${year}-${seq} 单选答案应为单字母`);
    years.add(year);
    const vals = [
      year, seq, `'${qtype}'`, `'${esc(q.stem)}'`,
      `'${esc(q.opt_a)}'`, `'${esc(q.opt_b)}'`, `'${esc(q.opt_c)}'`, `'${esc(q.opt_d)}'`,
      `'${[...answer].sort().join("")}'`, `'${esc(q.analysis || "")}'`,
      `'${esc(q.subject || "")}'`, `'${esc(q.kp_name || "")}'`,
      Number.isFinite(+q.kp_confidence) ? +q.kp_confidence : 1,
      q.answer_disputed ? 1 : 0, q.third_party_material ? 1 : 0,
    ];
    return `INSERT INTO real_questions (year,seq,qtype,stem,opt_a,opt_b,opt_c,opt_d,answer,analysis,subject,kp_name,kp_confidence,answer_disputed,third_party_material) VALUES (${vals.join(",")});`;
  });
  for (const y of [...years].sort()) lines.push(`DELETE FROM real_questions WHERE year=${y};`);
  lines.push(...rows);
  total += rows.length;
  console.error(`${f}: ${rows.length} 题（${[...years].join(",")}）`);
}
writeFileSync(out, lines.join("\n") + "\n");
console.error(`共 ${total} 题 → ${out}\n导入：npx wrangler d1 execute zhentigongfang [--local] --file ${out}`);
