#!/usr/bin/env node
// 真题解析批量生成：读 data/realexam/*.json，为 analysis 为空的题调用 DeepSeek 自写解析，写回 JSON。
// 用法：DEEPSEEK_KEY=... node scripts/gen_real_analysis.mjs [--dir data/realexam] [--concurrency 4]
// 解析全部为原创生成，不参考、不复制任何机构解析文本。
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const dir = opt("dir", "data/realexam");
const conc = parseInt(opt("concurrency", "4"));
const KEY = process.env.DEEPSEEK_KEY || process.env.DEEPSEEK_API_KEY;
if (!KEY) { console.error("缺 DEEPSEEK_KEY"); process.exit(1); }

async function gen(q) {
  const typ = q.qtype === "multi" ? "多选题" : "单选题";
  const body = {
    model: "deepseek-chat",
    temperature: 0.3,
    messages: [
      { role: "system", content: "你是考研政治资深讲师。为给定真题撰写原创解析：先一句话点明考点与解题关键，再逐一说明正确选项为何正确、干扰项为何错误。150-250 字，条理清晰，不要重复题干，不要出现「解析：」前缀。" },
      { role: "user", content: `${q.year} 年考研政治第 ${q.seq} 题（${typ}，正确答案 ${q.answer}）\n题干：${q.stem}\nA. ${q.opt_a}\nB. ${q.opt_b}\nC. ${q.opt_c}\nD. ${q.opt_d}` },
    ],
  };
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      const txt = (d.choices?.[0]?.message?.content || "").trim();
      if (txt.length >= 50) return txt;
      throw new Error("解析过短");
    } catch (e) {
      if (t === 2) throw e;
      await new Promise((res) => setTimeout(res, 2000 * (t + 1)));
    }
  }
}

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
for (const f of files) {
  const path = join(dir, f);
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const qs = Array.isArray(raw) ? raw : raw.questions;
  const todo = qs.filter((q) => !q.analysis);
  if (!todo.length) { console.error(`${f}: 已全部有解析，跳过`); continue; }
  let done = 0;
  const workers = Array.from({ length: conc }, async () => {
    while (todo.length) {
      const q = todo.shift();
      try { q.analysis = await gen(q); done++; }
      catch (e) { console.error(`${f} seq=${q.seq} 失败: ${e.message}`); }
    }
  });
  await Promise.all(workers);
  writeFileSync(path, JSON.stringify(raw, null, 2) + "\n");
  console.error(`${f}: 新增解析 ${done} 题`);
}
