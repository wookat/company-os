// 导入学科专家人工命制的精编补练题到 D1 curated_questions
// 用法：node scripts/import_curated.mjs <questions.json> [--dry]
// JSON 数组字段：kp_name, subject, qtype(single/multi), stem, opt_a..opt_d, answer, analysis
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const KP_WHITELIST = new Set([
  "毛泽东思想的形成与发展",
  "习近平新时代中国特色社会主义思想",
  "抗美援朝",
  "道德的本质与功能",
  "中华传统美德",
]);

const file = process.argv[2];
const dry = process.argv.includes("--dry");
if (!file) { console.error("usage: node scripts/import_curated.mjs <questions.json> [--dry]"); process.exit(1); }
const rows = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(rows)) { console.error("JSON 必须是数组"); process.exit(1); }

const errs = [];
const seen = new Set();
rows.forEach((q, i) => {
  const tag = `#${i} [${q.kp_name}]`;
  if (!KP_WHITELIST.has(q.kp_name)) errs.push(`${tag} kp_name 不在白名单`);
  for (const f of ["stem", "opt_a", "opt_b", "opt_c", "opt_d", "answer", "analysis"]) {
    if (!q[f] || !String(q[f]).trim()) errs.push(`${tag} 缺字段 ${f}`);
  }
  const ans = [...new Set(String(q.answer || "").toUpperCase().split("").filter(c => "ABCD".includes(c)))].sort().join("");
  if (!ans) errs.push(`${tag} 答案非法: ${q.answer}`);
  q.answer = ans;
  if (q.qtype === "single" && ans.length !== 1) errs.push(`${tag} 单选答案应恰 1 个: ${ans}`);
  if (q.qtype === "multi" && ans.length < 2) errs.push(`${tag} 多选答案应 ≥2 个: ${ans}`);
  if (!["single", "multi"].includes(q.qtype)) errs.push(`${tag} qtype 非法: ${q.qtype}`);
  const key = String(q.stem).replace(/\s+/g, "").slice(0, 60);
  if (seen.has(key)) errs.push(`${tag} 题干疑似重复`);
  seen.add(key);
});
if (errs.length) { console.error("校验失败：\n" + errs.join("\n")); process.exit(1); }
console.log(`校验通过：${rows.length} 道（${rows.filter(q => q.qtype === "single").length} 单选 / ${rows.filter(q => q.qtype === "multi").length} 多选）`);
if (dry) process.exit(0);

const esc = (s) => String(s).replace(/'/g, "''");
const sql = rows.map(q =>
  `INSERT INTO curated_questions (kp_name,subject,qtype,stem,opt_a,opt_b,opt_c,opt_d,answer,analysis) VALUES ('${esc(q.kp_name)}','${esc(q.subject || "")}','${q.qtype}','${esc(q.stem)}','${esc(q.opt_a)}','${esc(q.opt_b)}','${esc(q.opt_c)}','${esc(q.opt_d)}','${q.answer}','${esc(q.analysis)}');`
).join("\n");
writeFileSync("/tmp/curated_import.sql", sql);
execSync(`npx wrangler d1 execute zhentigongfang --remote --file /tmp/curated_import.sql`, { stdio: "inherit", cwd: new URL("..", import.meta.url).pathname });
console.log("导入完成");
