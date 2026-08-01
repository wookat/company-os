#!/usr/bin/env node
// 真题低置信考点映射复核：对 kp_confidence<1 的题让 DeepSeek 在 109 官方考点中重选，
// 与现标注一致则升为 1；不一致则改为模型选择并记录（kp_confidence 保持 0.5 供人工抽查）。
// 用法：DEEPSEEK_KEY=... node scripts/audit_real_kp.mjs [--dir data/realexam] [--concurrency 6]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LIBRARY } from "../src/library.js";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const dir = opt("dir", "data/realexam");
const conc = parseInt(opt("concurrency", "6"));
const KEY = process.env.DEEPSEEK_KEY || process.env.DEEPSEEK_API_KEY;
if (!KEY) { console.error("缺 DEEPSEEK_KEY"); process.exit(1); }

const kpIndex = [];
for (const l of LIBRARY) for (const s of l.sections) for (const k of s.kps) kpIndex.push({ subject: l.subject, name: k.name });
const kpNames = new Set(kpIndex.map(k => k.name));
const listText = LIBRARY.map(l => `${l.subject}：${l.sections.flatMap(s => s.kps.map(k => k.name)).join("、")}`).join("\n");

async function pick(q) {
  const body = {
    model: "deepseek-chat",
    temperature: 0,
    messages: [
      { role: "system", content: "你是考研政治命题研究专家。给定一道历年真题，从提供的官方考点清单中选出最贴切的一个考点，只输出考点名，不输出其他任何内容。" },
      { role: "user", content: `考点清单：\n${listText}\n\n真题（${q.year} 年第 ${q.seq} 题）：${q.stem}\nA.${q.opt_a} B.${q.opt_b} C.${q.opt_c} D.${q.opt_d}\n答案：${q.answer}` },
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
      const raw = (d.choices?.[0]?.message?.content || "").trim().replace(/^["「『]|["」』]$/g, "");
      if (kpNames.has(raw)) return raw;
      // 归一化：去科目前缀（如「形势与政策：xxx」「马原·哲学：xxx」）后再匹配，或与清单互为包含
      for (const seg of raw.split(/[：:·]/).reverse()) {
        const s = seg.trim();
        if (kpNames.has(s)) return s;
      }
      const hit = kpIndex.filter(k => raw.includes(k.name) || (raw.length >= 4 && k.name.includes(raw)));
      if (hit.length === 1) return hit[0].name;
      throw new Error("非法考点: " + raw.slice(0, 30));
    } catch (e) {
      if (t === 2) throw e;
      await new Promise((res) => setTimeout(res, 2000 * (t + 1)));
    }
  }
}

let confirmed = 0, changed = 0, failed = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const path = join(dir, f);
  const qs = JSON.parse(readFileSync(path, "utf8"));
  const todo = qs.filter((q) => q.kp_confidence < 1);
  if (!todo.length) continue;
  const queue = [...todo];
  await Promise.all(Array.from({ length: conc }, async () => {
    while (queue.length) {
      const q = queue.shift();
      try {
        const name = await pick(q);
        if (name === q.kp_name) { q.kp_confidence = 1; confirmed++; }
        else {
          console.error(`${f} seq=${q.seq}: ${q.kp_name} -> ${name}`);
          q.kp_name = name;
          const subj = kpIndex.find(k => k.name === name);
          if (subj) q.subject = subj.subject;
          changed++;
        }
      } catch (e) { failed++; console.error(`${f} seq=${q.seq} 失败: ${e.message}`); }
    }
  }));
  writeFileSync(path, JSON.stringify(qs, null, 1) + "\n");
}
console.error(`确认一致 ${confirmed}，改映射 ${changed}，失败 ${failed}`);
