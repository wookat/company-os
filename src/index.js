// 真题工坊 - Cloudflare Worker API
import { LIBRARY } from "./library.js";
const enc = new TextEncoder();

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...SECURITY_HEADERS },
  });
}

// 基于 D1 的固定窗口计数限流（KV 免费写配额有限，D1 写配额充裕）
async function rateLimit(env, key, limit, windowSec) {
  try {
    const bucket = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
    const r = await env.DB.prepare(
      "INSERT INTO rate_limits (k,n,expires_at) VALUES (?,1,?) " +
      "ON CONFLICT(k) DO UPDATE SET n=n+1 WHERE n<?")
      .bind(bucket, Date.now() + (windowSec + 60) * 1000, limit).run();
    if (Math.random() < 0.05) {
      await env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(Date.now()).run();
    }
    return r.meta.changes > 0;
  } catch (e) {
    return true; // 限流故障时放行，不阻断核心功能
  }
}
function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}
function err(status, message) { return json({ error: message }, status); }

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signJWT(payload, secret) {
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}
async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch (e) { return null; }
}

async function hashPassword(password, saltHex) {
  const salt = saltHex ? Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const hex = a => [...new Uint8Array(a)].map(b => b.toString(16).padStart(2, "0")).join("");
  return { hash: hex(bits), salt: hex(salt.buffer ? salt.buffer : salt) };
}

async function getUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const payload = await verifyJWT(auth.slice(7), env.JWT_SECRET);
  if (!payload) return null;
  const user = await env.DB.prepare("SELECT id,email,plan,plan_expires_at FROM users WHERE id=?").bind(payload.uid).first();
  return user || null;
}

function isPro(user) {
  return user.plan === "pro" && user.plan_expires_at && new Date(user.plan_expires_at) > new Date();
}

// ---------- LLM helpers ----------
async function llm(env, system, user, temperature = 0.5, maxTokens = 6000) {
  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      temperature,
      max_tokens: maxTokens,
    }),
  });
  if (!resp.ok) throw new Error(`LLM ${resp.status}`);
  const data = await resp.json();
  return JSON.parse(data.choices[0].message.content);
}

const KP_SYSTEM = `你是一位考试命题研究专家。从用户提供的复习资料中抽取可命题的考点清单。
每个考点是一个可独立命一道选择题的知识单元（如"量变质变规律""实践是检验真理的唯一标准"）。
按资料的章节归组，考点名与章节名使用与资料相同的语言。输出 JSON：{"knowledge_points":[{"name":"考点名","section":"所属章节"}]}，最多 20 个，按重要性排序。`;

// 分段抽取考点，避免长资料被静默截断
async function extractKnowledgePoints(env, content) {
  const CHUNK = 20000;
  const chunks = [];
  for (let i = 0; i < content.length && chunks.length < 6; i += CHUNK) chunks.push(content.slice(i, i + CHUNK));
  const results = await Promise.allSettled(chunks.map(c => llm(env, KP_SYSTEM, c, 0.2)));
  const seen = new Set();
  const points = [];
  for (const r of results) {
    if (r.status !== "fulfilled" || !Array.isArray(r.value.knowledge_points)) continue;
    for (const k of r.value.knowledge_points) {
      if (!k || !k.name) continue;
      const name = k.name.trim();
      // 归一化后跨分段去重（忽略“的”、空白与标点差异）
      const key = name.replace(/[的\s、，（）()·・]/g, "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      points.push({ name, section: k.section || "" });
    }
  }
  return points.slice(0, 60);
}

const GEN_SYSTEM = `你是全国研究生招生考试单项选择题命题专家。严格模仿真题风格：
- 题干以经典引文、领导人论述或现实情境切入，落点考基本原理；
- 四个选项仅一个正确，干扰项须似是而非（偷换概念/绝对化/无关但正确）；
- 附答案与解析，解析指明考点并逐一排错；
- 考点必须严格来自给定资料内容，不得超纲，不得照抄用户提供的任何样题。
- 题干、选项、解析使用与复习资料相同的语言。
输出 JSON：{"questions":[{"stem":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","analysis":"..."}]}`;

const GEN_MULTI_SYSTEM = `你是全国研究生招生考试多项选择题命题专家。严格模仿真题风格：
- 题干以经典引文、领导人论述或现实情境切入，落点考基本原理；
- 四个选项中有 2-4 个正确，错误项须似是而非（偷换概念/绝对化/无关但正确）；
- 附答案与解析，解析指明考点并逐一说明每个选项当选/不当选的理由；
- 考点必须严格来自给定资料内容，不得超纲，不得照抄用户提供的任何样题。
- 题干、选项、解析使用与复习资料相同的语言。
输出 JSON：{"questions":[{"stem":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"ABD","analysis":"..."}]}，answer 为 2-4 个字母组合。`;

const ESSAY_SYSTEM = `你是考研政治命题专家，擅长命制材料分析题（主观题）。要求：
- 材料 150-300 字，可为时事、案例或经典论述，与给定考点紧密相关；
- 设问针对材料，要求运用考点原理分析，难度对标考研真题；
- 参考答案要点 3-5 条，每条一句话，覆盖采分点；
- 解析说明答题思路与考点对应关系。
输出 JSON：{"material":"...","question":"...","key_points":["..."],"analysis":"..."}`;

const REVIEW_SYSTEM = `你是考试题目审校专家。逐题审查以下选择题（含单选题与多选题，多选题答案为多个字母），检查：
1. 答案是否正确（单选题答案唯一；多选题所标字母应全部正确且无遗漏）；2. 解析是否与答案一致且无事实错误；3. 干扰项是否成立；4. 题目是否完整可作答。
输出 JSON：{"results":[{"index":0,"pass":true,"reason":""}]}，index 与输入顺序对应，不通过时给出简短原因。`;

function similarity(a, b) {
  // 基于字符 bigram 的 Dice 系数
  const grams = s => { const g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); return g; };
  const ga = grams(a), gb = grams(b);
  let inter = 0;
  for (const x of ga) if (gb.has(x)) inter++;
  return (2 * inter) / (ga.size + gb.size || 1);
}

// 增量式生成：每次处理若干批次并把题目/进度落库；剩余工作通过 SELF
// service binding 自链下一步，前端轮询仅作兼容兼底
async function genStep(env, paperId, ctx) {
  // 锁与生成状态存 D1（KV 免费写配额有限，不适合高频写）
  const now = Date.now();
  const lock = await env.DB.prepare(
    "UPDATE gen_state SET lock_until=? WHERE paper_id=? AND lock_until<?")
    .bind(now + 90000, paperId, now).run();
  if (!lock.meta.changes) return;
  let more = false;
  try {
    const row = await env.DB.prepare("SELECT state FROM gen_state WHERE paper_id=?").bind(paperId).first();
    if (!row || !row.state) return;
    const st = JSON.parse(row.state); // {content,count,perKp,queue,allKps,rounds}
    const doneRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM questions WHERE paper_id=?").bind(paperId).first();
    let cur = doneRow.c;
    const finish = async () => {
      if (cur > 0 && st.essay) {
        const has = await env.DB.prepare("SELECT COUNT(*) AS c FROM questions WHERE paper_id=? AND qtype='essay'").bind(paperId).first();
        if (!has.c) {
          try {
            const kp = st.allKps[Math.floor(Math.random() * st.allKps.length)];
            const e = await llm(env, ESSAY_SYSTEM,
              `复习资料（命题范围）：\n${st.content}\n\n请针对考点「${kp.name}」（${kp.section || ""}）命制 1 道材料分析题。`, 0.7);
            if (e && e.material && e.question && Array.isArray(e.key_points) && e.key_points.length) {
              // 原子防重：并发 finish 时只允许插入一道材料题
              const ins = await env.DB.prepare(
                "INSERT INTO questions (paper_id,seq,stem,opt_a,opt_b,opt_c,opt_d,answer,analysis,knowledge_point,qtype) SELECT ?,?,?,'','','','',?,?,?,'essay' WHERE NOT EXISTS (SELECT 1 FROM questions WHERE paper_id=? AND qtype='essay')")
                .bind(paperId, cur + 1, `【材料】${e.material}\n\n【设问】${e.question}`,
                  e.key_points.map((k, i) => `${i + 1}. ${k}`).join("\n"), e.analysis || "", kp.name, paperId).run();
              if (ins.meta.changes) cur += 1;
            }
          } catch (e) { /* 材料题生成失败不影响整卷 */ }
          // 以实际入库数为准，避免 meta.changes 口径差异导致计数偏差
          const fin = await env.DB.prepare("SELECT COUNT(*) AS c FROM questions WHERE paper_id=?").bind(paperId).first();
          cur = fin.c;
        }
      }
      await env.DB.prepare("UPDATE papers SET status=?, question_count=?, fail_reason=? WHERE id=?")
        .bind(cur > 0 ? "ready" : "failed", cur, cur > 0 ? null : (st.lastErr || null), paperId).run();
      await env.DB.prepare("DELETE FROM gen_state WHERE paper_id=?").bind(paperId).run();
    };
    if (cur >= st.count) return finish();
    // 单次调用预算约 20 秒（waitUntil 宽限期约 30 秒），剩余工作自链下一步
    const stepStart = Date.now();
    while (true) {
    if (st.queue.length === 0) {
      if (st.rounds >= 4) return finish();
      st.rounds++; st.queue = [...st.allKps].sort(() => Math.random() - 0.5);
      // 补题轮提高每考点候选量，对冲查重/审校淘汰造成的缺口
      if (st.rounds >= 1) st.perKp = Math.min(3, st.perKp + 1);
    }
    const hist = await env.DB.prepare(
      "SELECT q.stem FROM questions q JOIN papers pp ON q.paper_id=pp.id WHERE pp.user_id=(SELECT user_id FROM papers WHERE id=?) ORDER BY q.id DESC LIMIT 300"
    ).bind(paperId).all();
    const existing = hist.results;
    // 多选题目标：≥ 8 题的卷约 40% 为多选，对标考研政治真题题型结构
    const multiTarget = st.count >= 8 ? Math.round(st.count * 0.4) : 0;
    const multiDoneRow = multiTarget ? await env.DB.prepare("SELECT COUNT(*) AS c FROM questions WHERE paper_id=? AND qtype='multi'").bind(paperId).first() : { c: 0 };
    let multiNeed = Math.max(0, multiTarget - multiDoneRow.c);
    const batch = st.queue.splice(0, 5);
    const types = batch.map(() => { if (multiNeed > 0) { multiNeed -= st.perKp; return "multi"; } return "single"; });
    const results = await Promise.allSettled(batch.map((kp, i) =>
      llm(env, types[i] === "multi" ? GEN_MULTI_SYSTEM : GEN_SYSTEM,
        `复习资料（命题范围）：\n${st.content}\n\n请针对考点「${kp.name}」（${kp.section || ""}）命制 ${st.perKp} 道${types[i] === "multi" ? "多项" : "单项"}选择题，难度对标考研真题。`,
        0.7)));
    let candidates = [];
    if (results.length && results.every(r => r.status === "rejected")) {
      const msg = String(results[0].reason && results[0].reason.message || "");
      st.lastErr = /402|401/.test(msg) ? "生成服务额度不足，请联系管理员" : /429/.test(msg) ? "生成服务繁忙，请稍后重试" : "生成服务暂时不可用，请稍后重试";
    }
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && Array.isArray(r.value.questions)) {
        for (const q of r.value.questions) {
          if (q && q.stem && q.options && q.answer && q.analysis) {
            const ans = [...new Set(String(q.answer).toUpperCase().split("").filter(c => "ABCD".includes(c)))].sort().join("");
            if (!ans) continue;
            const qtype = types[i] === "multi" && ans.length >= 2 ? "multi" : "single";
            if (types[i] === "multi" && ans.length < 2) continue;
            if (types[i] === "single" && ans.length > 1) continue;
            candidates.push({ ...q, answer: ans, qtype, knowledge_point: batch[i] ? batch[i].name : "" });
          }
        }
      }
    }
    // 查重：与本批次内部 & 用户已有题目
    const kept = [];
    for (const q of candidates) {
      let dup = false;
      for (const prev of [...kept, ...existing]) {
        if (similarity(q.stem, prev.stem) > 0.6) { dup = true; break; }
      }
      if (!dup) kept.push(q);
    }
    let reviewed = kept;
    if (kept.length) {
      try {
        const reviewInput = kept.map((q, i) =>
          `[${i}]（${q.qtype === "multi" ? "多选题" : "单选题"}）题干：${q.stem}\nA.${q.options.A}\nB.${q.options.B}\nC.${q.options.C}\nD.${q.options.D}\n答案：${q.answer}\n解析：${q.analysis}`).join("\n\n");
        const rv = await llm(env, REVIEW_SYSTEM, reviewInput, 0.1);
        const passSet = new Set((rv.results || []).filter(r => r.pass).map(r => r.index));
        if (rv.results && rv.results.length) reviewed = kept.filter((_, i) => passSet.has(i));
      } catch (e) { /* 审校失败时保留候选题 */ }
    }
    // 卷内考点均衡：前几轮限制单考点题量上限，避免补题轮集中在少数考点
    if (st.rounds < 3 && st.allKps && st.allKps.length > 1) {
      const perCap = Math.max(1, Math.ceil(st.count / st.allKps.length));
      const kpCount = {};
      const exRows = await env.DB.prepare(
        "SELECT knowledge_point AS k, COUNT(*) AS c FROM questions WHERE paper_id=? GROUP BY knowledge_point").bind(paperId).all();
      for (const r of exRows.results) kpCount[r.k] = r.c;
      reviewed = reviewed.filter(q => {
        const c = kpCount[q.knowledge_point] || 0;
        if (c >= perCap) return false;
        kpCount[q.knowledge_point] = c + 1;
        return true;
      });
    }
    reviewed = reviewed.slice(0, st.count - cur);
    if (reviewed.length) {
      const stmts = reviewed.map((q, i) => env.DB.prepare(
        "INSERT INTO questions (paper_id,seq,stem,opt_a,opt_b,opt_c,opt_d,answer,analysis,knowledge_point,qtype) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(paperId, cur + i + 1, q.stem, q.options.A, q.options.B, q.options.C, q.options.D, q.answer, q.analysis, q.knowledge_point, q.qtype || "single"));
      await env.DB.batch(stmts);
      cur += reviewed.length;
    }
    if (cur >= st.count || (st.queue.length === 0 && st.rounds >= 4)) return finish();
    if (Date.now() - stepStart > 20000) { more = true; break; }
    }
    await env.DB.prepare("UPDATE gen_state SET state=? WHERE paper_id=?").bind(JSON.stringify(st), paperId).run();
  } catch (e) {
    // 单步失败不标记整卷失败，等下次轮询重试；彻底卡死由看门狗兑底
  } finally {
    await env.DB.prepare("UPDATE gen_state SET lock_until=0 WHERE paper_id=?").bind(paperId).run().catch(() => {});
    if (more && ctx && env.SELF) {
      ctx.waitUntil(env.SELF.fetch(`https://internal/api/gen-tick?paper=${paperId}`).catch(() => {}));
    }
  }
}

// ---------- 易支付协议（ZPay 等）----------
const PLANS = { month: { name: "冲刺月卡", amount: "19.90", days: 31 }, season: { name: "考季通票", amount: "49.90", days: 160 } };

async function md5hex(s) {
  const buf = await crypto.subtle.digest("MD5", enc.encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function epaySign(params, key) {
  const str = Object.keys(params).filter(k => k !== "sign" && k !== "sign_type" && params[k] !== "")
    .sort().map(k => `${k}=${params[k]}`).join("&");
  return md5hex(str + key);
}

// ---------- 公开真题库 SEO 页 ----------
const hesc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function zhentiCrumbs(items) {
  // BreadcrumbList 结构化数据（SEO 富媒体结果）
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item }))
  })}</script>`;
}
function zhentiShell(title, desc, canonical, body, extraHead = "") {
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${hesc(title)}</title><meta name="description" content="${hesc(desc)}"><link rel="canonical" href="${hesc(canonical)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="真题工坊"><meta property="og:title" content="${hesc(title)}"><meta property="og:description" content="${hesc(desc)}"><meta property="og:url" content="${hesc(canonical)}"><meta property="og:image" content="https://zhenti.zalize.com/icon-512.png"><meta name="twitter:card" content="summary">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"><meta name="theme-color" content="#3D7FFF"><link rel="stylesheet" href="/tailwind.css">
<style media="print">header,footer,nav,button,details,#stfab,#anchmore,.noprint{display:none!important}body{background:#fff}article,section{break-inside:avoid;box-shadow:none!important;border-color:#ddd!important}a{text-decoration:none;color:inherit}</style>
${extraHead}</head><body class="bg-page text-ink font-sans antialiased"><div class="mx-auto max-w-3xl px-4 py-8">
<header class="flex items-center justify-between gap-3"><a href="/" class="font-extrabold text-lg">真题工坊</a>
<span class="flex items-center gap-2"><a href="/zhenti/search" class="h-9 px-3 inline-flex items-center rounded-xl bg-white border border-black/5 shadow-card text-sm text-slate-600 hover:border-rose-200" aria-label="搜真题">🔍<span class="hidden sm:inline ml-1">搜真题</span></a><a href="/app" class="h-9 px-4 inline-flex items-center rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold">在线刷真题（免费判分）→</a></span></header>
${body}
<footer class="mt-10 pt-6 border-t border-black/5 text-xs text-slate-500"><p class="flex flex-wrap gap-x-4 gap-y-1"><a class="inline-flex items-center min-h-[32px] underline decoration-dotted underline-offset-2 hover:text-rose-600" href="/zhenti">按年份刷真题</a><a class="inline-flex items-center min-h-[32px] underline decoration-dotted underline-offset-2 hover:text-rose-600" href="/zhenti/kaodian">按考点看真题</a><a class="inline-flex items-center min-h-[32px] underline decoration-dotted underline-offset-2 hover:text-rose-600" href="/zhenti/fenxiti">分析题及答案</a><a class="inline-flex items-center min-h-[32px] underline decoration-dotted underline-offset-2 hover:text-rose-600" href="/zhenti/search">搜真题</a><a class="inline-flex items-center min-h-[32px] underline decoration-dotted underline-offset-2 hover:text-rose-600" href="/zhenti#daily">今天的每日一题</a></p><p class="mt-2">题目为历年全国硕士研究生招生考试思想政治理论真题，解析为真题工坊原创整理 · <a class="inline-flex items-center min-h-[32px] underline" href="/">返回首页</a></p></footer>
</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
// 公开考点真题页：/zhenti/kaodian（索引）与 /zhenti/kaodian/{考点名}
async function zhentiKpPage(env, p) {
  const m = p.match(/^\/zhenti\/kaodian\/(.+)$/);
  if (!m) {
    const rows = await env.DB.prepare(
      "SELECT subject, kp_name, COUNT(*) AS n FROM real_questions WHERE third_party_material=0 AND kp_name<>'' GROUP BY subject, kp_name ORDER BY subject, n DESC").all();
    const groups = {};
    for (const r of rows.results) (groups[r.subject] = groups[r.subject] || []).push(r);
    const order = ["马原", "毛中特", "史纲", "思修", "形势与政策"];
    const rank = (s) => { const i = order.findIndex(o => String(s).startsWith(o.slice(0, 2))); return i < 0 ? 99 : i; };
    const subjects = Object.keys(groups).sort((a, b) => rank(a) - rank(b));
    const body = `<h1 class="mt-8 text-2xl font-extrabold">考研政治真题考点索引</h1>
<p class="mt-2 text-sm text-slate-500">2010-2026 历年真题按官方考点整理，点考点看该考点全部真题（含答案与原创解析）。<a class="text-rose-600 underline" href="/zhenti">按年份看 →</a> · <a class="text-rose-600 underline" href="/zhenti/fenxiti">历年分析题及参考答案 →</a></p>
<nav class="mt-3 flex flex-wrap gap-2 text-sm">${subjects.map((s, i) => `<a href="#s${i}" data-s="${i}" class="sanav min-h-[32px] inline-flex items-center px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-medium">${hesc(s)}</a>`).join("")}</nav>
<input id="kpq" type="search" placeholder="🔍 输入关键词筛选考点，如「矛盾」「共同体」" class="mt-4 w-full sm:max-w-sm h-11 px-4 rounded-xl bg-white border border-black/10 shadow-card text-sm outline-none focus:border-rose-300" oninput="kpfilter(this.value)">
<p id="kpempty" class="hidden mt-4 text-sm text-slate-500">没有匹配「<b id="kpemptyq" class="text-slate-700"></b>」的考点，试试更短的关键词，或 <a href="#" onclick="event.preventDefault();var q=document.getElementById('kpq');q.value='';kpfilter('');q.focus()" class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline">清空筛选</a>。</p>
<script>function kpfilter(v){v=v.trim().toLowerCase();var any=false;document.querySelectorAll('.kpchip').forEach(function(a){var on=!v||a.textContent.toLowerCase().indexOf(v)>=0;a.style.display=on?'':'none';if(on)any=true});document.querySelectorAll('h2[id^=s]').forEach(function(h){var d=h.nextElementSibling;var vis=d&&Array.prototype.some.call(d.children,function(c){return c.style.display!=='none'});h.style.display=vis?'':'none';if(d)d.style.display=vis?'':'none';var nav=document.querySelector('.sanav[href="#'+h.id+'"]');if(nav)nav.style.display=vis?'':'none'});document.getElementById('kpemptyq').textContent=v;document.getElementById('kpempty').classList.toggle('hidden',any)}</script>
${subjects.map((s, i) => { const slug = Object.keys(FX_SUBJECT_SLUGS).find(k => FX_SUBJECT_SLUGS[k] === s); return `<h2 id="s${i}" class="mt-6 text-lg font-bold scroll-mt-4">${hesc(s)}${slug ? ` <a class="ml-1 inline-flex items-center min-h-[32px] align-middle text-xs font-medium text-slate-500 underline decoration-dotted underline-offset-2 hover:text-rose-600" href="/zhenti/kemu/${slug}">${hesc(s)}全部真题 ›</a>` : ""}</h2>
<div class="mt-2 flex flex-wrap gap-2">${groups[s].map(k => `<a href="/zhenti/kaodian/${encodeURIComponent(k.kp_name)}" class="kpchip min-h-[32px] inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-black/5 shadow-card text-sm hover:border-rose-200">${hesc(k.kp_name)} <span class="ml-1 text-xs text-slate-500 font-num">${k.n}</span></a>`).join("")}</div>`; }).join("")}`;
    return zhentiShell("考研政治真题考点索引（按考点看历年真题）· 真题工坊", "考研政治 2010-2026 历年真题按官方考点分类，马原/毛中特/史纲/思修/形势与政策逐考点看真题、答案与原创解析。", "https://zhenti.zalize.com/zhenti/kaodian", body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["历年真题库", "https://zhenti.zalize.com/zhenti"], ["考点索引", "https://zhenti.zalize.com/zhenti/kaodian"]]));
  }
  let kp = "";
  try { kp = decodeURIComponent(m[1]); } catch { return new Response("Not Found", { status: 404 }); }
  if (!kp || kp.length > 60) return new Response("Not Found", { status: 404 });
  const qs = await env.DB.prepare(
    "SELECT year, seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject FROM real_questions WHERE kp_name=? AND third_party_material=0 ORDER BY year DESC, seq").bind(kp).all();
  if (!qs.results.length) return new Response("Not Found", { status: 404 });
  const L = { A: "opt_a", B: "opt_b", C: "opt_c", D: "opt_d" };
  const subj = qs.results[0].subject || "";
  const sj = await env.DB.prepare("SELECT year, seq, stem FROM real_subjective WHERE kp_name=? ORDER BY year DESC").bind(kp).all();
  const body = `<h1 class="mt-8 text-2xl font-extrabold">「${hesc(kp)}」历年真题（${qs.results.length} 道）</h1>
<p class="mt-2 text-sm text-slate-500">${hesc(subj)}考点「${hesc(kp)}」在 2010-2026 考研政治真题中的全部客观题，含答案与原创解析。<a class="text-rose-600 underline" href="/app#realsearch/${encodeURIComponent(kp)}">注册后可按考点抽练、自动判分 →</a></p>
<nav class="mt-3 text-xs text-slate-500"><a class="inline-block py-1.5 underline hover:text-rose-600" href="/zhenti/kaodian">← 全部考点索引</a> · <a class="inline-block py-1.5 underline hover:text-rose-600" href="/zhenti">按年份看</a></nav>
${(() => {
    const yrs = [...new Set(qs.results.map(q => q.year))];
    return `<div class="mt-4"><p class="text-xs font-semibold text-slate-500">考过的年份（点击看当年整卷）</p><div class="mt-2 flex flex-wrap gap-2">${yrs.map(y => `<a href="/zhenti/${y}" class="inline-flex items-center min-h-[32px] px-2.5 py-1.5 rounded-full bg-rose-50 text-rose-600 text-xs font-num hover:bg-rose-100">${y}</a>`).join("")}</div></div>`;
  })()}
<details class="mt-4 ansbox"><summary class="cursor-pointer inline-flex items-center min-h-[32px] text-xs font-semibold text-slate-500 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600">📋 答案速查表（${qs.results.length} 道）▾</summary><div class="mt-2 rounded-2xl bg-white border border-black/5 shadow-card p-3 flex flex-wrap gap-1.5">${qs.results.map(q => `<a href="/zhenti/${q.year}/${q.seq}" class="inline-flex items-center min-h-[32px] px-2 py-1 rounded-lg bg-page text-xs font-num text-slate-600 hover:text-rose-600" title="${q.year} 年第 ${q.seq} 题详页"><span class="text-slate-400">${q.year}-${q.seq}</span><b class="ml-1 text-slate-700">${hesc(q.answer)}</b></a>`).join("")}</div><p class="mt-1.5 text-xs text-slate-500">点击题号可看题干与解析</p></details>
<div class="mt-6 flex items-center gap-2"><button id="stbtn" onclick="stToggle()" class="min-h-[36px] px-4 py-1.5 inline-flex items-center rounded-full border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-xs font-semibold text-rose-600">✏️ 自测模式：隐藏答案</button><span class="text-xs text-slate-400">隐藏 ✓ 与解析，先自己做一遍</span><button onclick="window.print()" class="hidden sm:inline-flex min-h-[36px] px-4 py-1.5 items-center rounded-full border border-black/10 bg-white hover:border-rose-200 text-xs font-semibold text-slate-600">🖨 打印 / 存 PDF</button></div>
<style>body.selftest{padding-bottom:4.5rem}.selftest .ansmark{visibility:hidden}.selftest .ansbox{display:none}.selftest .ansok{color:#475569;font-weight:400}</style>
<button id="stfab" onclick="stToggle()" class="hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 min-h-[36px] px-4 py-1.5 items-center rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg">✏️ 自测中 · 点我显示答案</button>
<script>function stApply(on){document.body.classList.toggle('selftest',on);document.getElementById('stbtn').textContent=on?'👁 显示答案（自测中）':'✏️ 自测模式：隐藏答案';var f=document.getElementById('stfab');f.classList.toggle('hidden',!on);f.classList.toggle('inline-flex',on)}
function stToggle(){var on=!document.body.classList.contains('selftest');stApply(on);try{localStorage.setItem('zt_selftest',on?'1':'')}catch(e){}}
try{if(localStorage.getItem('zt_selftest')==='1')stApply(true)}catch(e){}</script>
<div class="mt-4 space-y-4">${qs.results.map(q => `<article class="bg-white rounded-2xl border border-black/5 shadow-card p-4">
<p class="text-xs text-slate-500 font-num"><a class="inline-flex items-center min-h-[32px] -my-2 hover:text-rose-600 underline decoration-dotted underline-offset-2" href="/zhenti/${q.year}#q${q.seq}">${q.year} 年第 ${q.seq} 题</a> · ${q.qtype === "multi" ? "多选" : "单选"} · ${hesc(q.subject || "")} · <a class="inline-flex items-center min-h-[32px] -my-2 hover:text-slate-700 underline decoration-dotted underline-offset-2" href="/zhenti/${q.year}/${q.seq}">本题详页 ›</a></p>
<p class="mt-1.5 text-sm leading-6 text-slate-800">${hesc(q.stem)}</p>
<div class="mt-2 space-y-1.5">${["A", "B", "C", "D"].map(o => `<p class="text-sm leading-6 ${q.answer.includes(o) ? "ansok text-ok-700 font-medium" : "text-slate-600"}"><span class="ansmark">${q.answer.includes(o) ? "✓" : "&nbsp;&nbsp;"}</span> ${o}. ${hesc(q[L[o]])}</p>`).join("")}</div>
<div class="ansbox mt-2.5 rounded-xl bg-page px-3 py-2.5 text-xs leading-5 text-slate-600"><b class="text-slate-700">答案 ${hesc(q.answer)}</b><br>${hesc(q.analysis || "")}</div>
</article>`).join("")}</div>
${(() => {
    if (!sj.results.length) return "";
    return `<h2 class="mt-10 text-xl font-bold">相关分析题（${sj.results.length} 道）</h2>
<div class="mt-3 space-y-2">${sj.results.map(s => `<div class="bg-white rounded-2xl border border-black/5 shadow-card p-4 hover:border-rose-200">
<a href="/zhenti/fenxiti/${s.year}-${s.seq}" class="block">
<p class="text-xs text-slate-500 font-num">${s.year} 年第 ${s.seq} 题 · 分析题</p>
<p class="mt-1 text-sm leading-6 text-slate-700">${hesc(s.stem.length > 100 ? s.stem.slice(0, 100) + "…" : s.stem)}</p></a>
<span class="mt-1 flex flex-wrap items-center gap-x-3"><a class="inline-flex items-center min-h-[32px] text-xs font-medium text-rose-600 hover:underline" href="/app#realsubj/${s.year}-${s.seq}">背这道参考要点（免费）›</a><a class="inline-flex items-center min-h-[32px] text-xs text-slate-500 hover:text-slate-700 underline decoration-dotted underline-offset-2" href="/zhenti/fenxiti/${s.year}-${s.seq}">这道题详页 ›</a><a class="inline-flex items-center min-h-[32px] text-xs font-medium text-slate-500 hover:text-slate-700" href="/zhenti/${s.year}#q${s.seq}">在 ${s.year} 年整卷中看 ›</a></span></div>`).join("")}</div>`;
  })()}
<div class="mt-8 text-center"><a href="/app#realsearch/${encodeURIComponent(kp)}" class="inline-flex h-11 px-6 items-center rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold">按这个考点在线抽练（免费判分）→</a>
<p class="mt-3 text-xs text-slate-500">不想只练一个考点？<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline font-medium" href="/app#realrand">🎲 全库随机 20 题快刷 →</a></p></div>
${await (async () => {
    if (!subj) return "";
    const rel = await env.DB.prepare(
      "SELECT kp_name, COUNT(*) AS n FROM real_questions WHERE subject=? AND kp_name IS NOT NULL AND kp_name<>? AND third_party_material=0 GROUP BY kp_name ORDER BY n DESC, kp_name LIMIT 12").bind(subj, kp).all();
    if (!rel.results.length) return "";
    const slug = Object.keys(FX_SUBJECT_SLUGS).find(k => FX_SUBJECT_SLUGS[k] === subj);
    return `<section class="mt-10"><h2 class="text-xl font-bold">${hesc(subj)}其他高频考点</h2>
<div class="mt-3 flex flex-wrap gap-2">${rel.results.map(r => `<a href="/zhenti/kaodian/${encodeURIComponent(r.kp_name)}" class="min-h-[32px] inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-black/5 shadow-card text-sm hover:border-rose-200">${hesc(r.kp_name)} <span class="ml-1 text-xs text-slate-500 font-num">${r.n}</span></a>`).join("")}</div>
${slug ? `<p class="mt-2 text-xs text-slate-500"><a class="inline-flex items-center min-h-[32px] underline decoration-dotted underline-offset-2 hover:text-rose-600" href="/zhenti/kemu/${slug}">${hesc(subj)}全部考点与历年真题 →</a></p>` : ""}</section>`;
  })()}
${(() => {
    const yrs = [...new Set(qs.results.map(q => q.year))].sort((a, b) => b - a);
    const faqs = [
      [`「${kp}」在考研政治真题中考过几次？`, `2010-2026 共考过 ${qs.results.length} 道客观题（${yrs.join("、")} 年）${sj.results.length ? `，另有 ${sj.results.length} 道分析题涉及该考点` : ""}，最近一次出现在 ${yrs[0]} 年。`],
      [`「${kp}」属于哪一科？`, `${(() => { const cnt2 = {}; for (const q of qs.results) if (q.subject) cnt2[q.subject] = (cnt2[q.subject] || 0) + 1; const ss = Object.keys(cnt2).sort((a, b) => cnt2[b] - cnt2[a]); return ss.length > 1 ? `主要属于${ss[0]}，也在${ss.slice(1).join("、")}真题中考查过` : `属于${ss[0] || "考研政治"}`; })()}。本页收录该考点全部历年真题原题、答案与原创解析，免费在线阅读。`],
      [`怎么针对「${kp}」刷题？`, `先在本页逐题看解析弄懂考法，再注册后按考点抽练自动判分，错题会自动进错题本循环复习；掌握后可用全库随机快刷检验。`],
    ];
    return `<section class="mt-10"><h2 class="text-xl font-bold">常见问题</h2><div class="mt-3 space-y-3">${faqs.map(([q, a]) => `<details class="group bg-white rounded-2xl border border-black/5 shadow-card px-4 py-3"><summary class="cursor-pointer flex items-center justify-between gap-2 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600"><span>${hesc(q)}</span><svg class="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></summary><p class="mt-2 text-sm leading-6 text-slate-600">${hesc(a)}</p></details>`).join("")}</div></section>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
  })()}
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: `「${kp}」考研政治历年真题`, numberOfItems: qs.results.length, itemListElement: qs.results.map((q, i) => ({ "@type": "ListItem", position: i + 1, name: `${q.year} 年考研政治真题第 ${q.seq} 题（${q.qtype === "multi" ? "多选" : "单选"}）`, url: `https://zhenti.zalize.com/zhenti/${q.year}/${q.seq}` })) })}</script>`;
  return zhentiShell(`${kp} 考研政治历年真题及答案解析 · 真题工坊`, `考研政治考点「${kp}」历年真题客观题 ${qs.results.length} 道（2010-2026），含答案与原创解析，可在线免费按考点抽练判分。`, `https://zhenti.zalize.com/zhenti/kaodian/${encodeURIComponent(kp)}`, body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["考点索引", "https://zhenti.zalize.com/zhenti/kaodian"], [kp, `https://zhenti.zalize.com/zhenti/kaodian/${encodeURIComponent(kp)}`]]));
}
const FX_SUBJECT_SLUGS = { mayuan: "马原·哲学", maozhongte: "毛中特", shigang: "史纲", sixiu: "思修法基", xingshi: "形势与政策" };
// 公开真题全文搜索：/zhenti/search?q=（结果页 noindex，只作站内查找）
async function zhentiSearchPage(env, rawQ) {
  const q = String(rawQ || "").trim().slice(0, 40);
  const like = "%" + q.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
  const L = { A: "opt_a", B: "opt_b", C: "opt_c", D: "opt_d" };
  const qs = q ? await env.DB.prepare("SELECT year, seq, qtype, subject, kp_name, substr(stem,1,100) AS brief FROM real_questions WHERE third_party_material=0 AND (stem LIKE ? ESCAPE '\\' OR kp_name LIKE ? ESCAPE '\\') ORDER BY year DESC, seq LIMIT 20").bind(like, like).all() : { results: [] };
  const sj = q ? await env.DB.prepare("SELECT year, seq, subject, kp_name, substr(stem,1,100) AS brief FROM real_subjective WHERE stem LIKE ? ESCAPE '\\' OR kp_name LIKE ? ESCAPE '\\' OR questions LIKE ? ESCAPE '\\' ORDER BY year DESC, seq LIMIT 6").bind(like, like, like).all() : { results: [] };
  const kpHit = q ? await env.DB.prepare("SELECT kp_name, COUNT(*) AS n, MIN(subject) AS subject FROM real_questions WHERE third_party_material=0 AND kp_name=?1 GROUP BY kp_name").bind(q).first() : null;
  const yearHit = (() => { const ym = q.match(/^(20(1[0-9]|2[0-6]))\s*年?$/); return ym ? +ym[1] : 0; })();
  // 「年份+题号」直达：如「2019 30」「2019年第30题」「2019-30」
  const yqHit = await (async () => {
    const m = q.match(/^(20(?:1[0-9]|2[0-6]))\s*年?\s*[\-第\s]?\s*(\d{1,2})\s*题?$/);
    if (!m) return null;
    const y = +m[1], s = +m[2];
    const obj = await env.DB.prepare("SELECT 1 FROM real_questions WHERE third_party_material=0 AND year=?1 AND seq=?2").bind(y, s).first();
    if (obj) return { y, s, kind: "obj" };
    const sub = await env.DB.prepare("SELECT 1 FROM real_subjective WHERE year=?1 AND seq=?2").bind(y, s).first();
    return sub ? { y, s, kind: "subj" } : { y, s, kind: "none" };
  })();
  const body = `<h1 class="mt-8 text-2xl font-extrabold">搜真题</h1>
<p class="mt-2 text-sm text-slate-500">输入关键词或考点名，搜 2010-2026 年考研政治客观题与分析题原题。</p>
<form method="GET" action="/zhenti/search" class="mt-4 flex gap-2"><input name="q" value="${hesc(q)}" maxlength="40" placeholder="🔍 如「矛盾」「抗日战争」「人类命运共同体」" class="flex-1 h-11 px-4 rounded-xl bg-white border border-black/5 shadow-card text-sm focus:outline-none focus:border-rose-300"><button class="h-11 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold shrink-0">搜索</button></form>
<p class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">常搜：${["矛盾", "抗日战争", "人类命运共同体", "实践", "改革开放"].map(k => `<a href="/zhenti/search?q=${encodeURIComponent(k)}" class="min-h-[32px] inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-black/5 shadow-card text-slate-600 hover:border-rose-200">${k}</a>`).join("")}</p>
${(() => {
    if (!yqHit) return "";
    const { y, s, kind } = yqHit;
    if (kind === "none") return `<div class="mt-6 rounded-2xl bg-white border border-rose-200 shadow-card p-4"><p class="text-sm font-semibold text-slate-800">${y} 年真题没有第 ${s} 题</p><p class="mt-2 text-sm"><a class="inline-flex items-center min-h-[32px] text-rose-600 underline font-medium" href="/zhenti/${y}">看 ${y} 年全卷（含题号导航）→</a></p></div>`;
    const href = kind === "obj" ? `/zhenti/${y}/${s}` : `/zhenti/fenxiti/${y}-${s}`;
    return `<div class="mt-6 rounded-2xl bg-white border border-rose-200 shadow-card p-4"><p class="text-sm font-semibold text-slate-800">直达 ${y} 年第 ${s} 题</p><p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><a class="inline-flex items-center min-h-[32px] text-rose-600 underline font-medium" href="${href}">${y} 年第 ${s} 题${kind === "subj" ? "（分析题）及参考答案" : "题目与解析"} →</a><a class="inline-flex items-center min-h-[32px] text-rose-600 underline font-medium" href="/zhenti/${y}">${y} 年全卷 →</a></p></div>`;
  })()}
${(() => {
    if (!yearHit) return "";
    const y = yearHit;
    return `<div class="mt-6 rounded-2xl bg-white border border-rose-200 shadow-card p-4"><p class="text-sm font-semibold text-slate-800">直达 ${y} 年真题</p><p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><a class="inline-flex items-center min-h-[32px] text-rose-600 underline font-medium" href="/zhenti/${y}">${y} 年客观题整卷（含解析）→</a><a class="inline-flex items-center min-h-[32px] text-rose-600 underline font-medium" href="/zhenti/fenxiti/${y}">${y} 年分析题及参考答案 →</a></p>${qs.results.length || sj.results.length ? "" : `<p class="mt-2 text-xs text-slate-500">题干原文不含年份字样，请从上方链接进入。</p>`}</div>`;
  })()}
${kpHit ? `<div class="mt-6 rounded-2xl bg-white border border-rose-200 shadow-card p-4"><p class="text-sm font-semibold text-slate-800">「${hesc(kpHit.kp_name)}」是${hesc(kpHit.subject || "")}考点</p><p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><a class="inline-flex items-center min-h-[32px] text-rose-600 underline font-medium" href="/zhenti/kaodian/${encodeURIComponent(kpHit.kp_name)}">看该考点历年真题（${kpHit.n} 道）→</a></p></div>` : ""}
${q ? (qs.results.length || sj.results.length ? `${qs.results.length ? `<h2 class="mt-6 text-lg font-bold">客观题（${qs.results.length}${qs.results.length === 20 ? "+" : ""} 道）</h2>
<div class="mt-2 space-y-2">${qs.results.map(r => `<a href="/zhenti/${r.year}/${r.seq}" class="block bg-white rounded-2xl border border-black/5 shadow-card p-3.5 hover:border-rose-200"><span class="text-xs text-slate-500 font-num">${r.year} 年第 ${r.seq} 题 · ${r.qtype === "multi" ? "多选" : "单选"} · ${hesc(r.subject || "")}${r.kp_name ? " · " + hesc(r.kp_name) : ""}</span><span class="mt-0.5 block text-sm leading-6 text-slate-700">${hesc(r.brief)}…</span></a>`).join("")}</div>` : ""}
${sj.results.length ? `<h2 class="mt-6 text-lg font-bold">分析题（${sj.results.length} 道）</h2>
<div class="mt-2 space-y-2">${sj.results.map(r => `<a href="/zhenti/fenxiti/${r.year}-${r.seq}" class="block bg-white rounded-2xl border border-black/5 shadow-card p-3.5 hover:border-rose-200"><span class="text-xs text-slate-500 font-num">${r.year} 年第 ${r.seq} 题 · 分析题 · ${hesc(r.subject || "")}${r.kp_name ? " · " + hesc(r.kp_name) : ""}</span><span class="mt-0.5 block text-sm leading-6 text-slate-700">${hesc(r.brief)}…</span></a>`).join("")}</div>` : ""}
<p class="mt-6 text-sm text-slate-500">想按这个关键词组卷练习？<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline font-medium" href="/app#realsearch/${encodeURIComponent(q)}">注册后在线抽练「${hesc(q)}」（免费判分）→</a></p>` : yearHit || kpHit || yqHit ? "" : `<p class="mt-6 text-sm text-slate-500">没有匹配「${hesc(q)}」的真题，试试更短的关键词，或<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline" href="/zhenti/kaodian">浏览考点索引 →</a></p>`) : ""}
<p class="mt-8 text-xs text-slate-500"><a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti">← 返回真题库</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/kaodian">考点索引</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti">分析题索引</a></p>`;
  return zhentiShell(q ? `「${q}」考研政治真题搜索结果 · 真题工坊` : "搜真题 · 真题工坊", "搜索 2010-2026 年考研政治历年真题客观题与分析题原题。", "https://zhenti.zalize.com/zhenti/search", body, `<meta name="robots" content="noindex,follow">` + zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["历年真题库", "https://zhenti.zalize.com/zhenti"], ["搜真题", "https://zhenti.zalize.com/zhenti/search"]]));
}
async function zhentiPage(env, p) {
  if (p === "/zhenti/kaodian" || p.startsWith("/zhenti/kaodian/")) return zhentiKpPage(env, p);
  if (p === "/zhenti/fenxiti") {
    const sj = await env.DB.prepare("SELECT year, seq, subject, kp_name, stem, questions FROM real_subjective ORDER BY year DESC, seq").all();
    const kpset = new Set((await env.DB.prepare("SELECT DISTINCT kp_name FROM real_questions WHERE third_party_material=0 AND kp_name<>''").all()).results.map(r => r.kp_name));
    const byYear = {};
    for (const s of sj.results) (byYear[s.year] = byYear[s.year] || []).push(s);
    const years = Object.keys(byYear).sort((a, b) => b - a);
    const body = `<h1 class="mt-8 text-2xl font-extrabold">考研政治历年分析题及参考答案<span class="fxh">（${sj.results.length} 道）</span></h1>
<p class="mt-2 text-sm text-slate-500">2010-2026 历年考研政治分析题（34-38 题）全收录，每道附原创参考答案要点，注册后可免费背要点、支持先想再看与背诵进度。<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline font-medium" href="/app#realsubj">去在线背要点 →</a></p>
<nav class="mt-3 text-xs text-slate-500"><a class="inline-block py-1.5 underline hover:text-rose-600" href="/zhenti">← 按年份看客观题</a> · <a class="inline-block py-1.5 underline hover:text-rose-600" href="/zhenti/kaodian">按考点看</a></nav>
<div class="mt-3 flex flex-wrap gap-2">${years.map(y => `<a href="#y${y}" class="min-h-[32px] inline-flex items-center px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-xs font-medium font-num">${y}</a>`).join("")}</div>
${(() => {
      const subs = [...new Set(sj.results.map(s => s.subject).filter(Boolean))];
      if (subs.length < 2) return "";
      return `<div class="mt-3 flex flex-wrap items-center gap-2 text-xs"><span class="text-slate-500">按科目看：</span><button onclick="fxfilter('',this)" class="fxtab min-h-[32px] px-3 py-1.5 rounded-full bg-slate-800 text-white font-medium" data-s="">全部 ${sj.results.length}</button>${subs.map(s2 => { const slug = Object.keys(FX_SUBJECT_SLUGS).find(k => FX_SUBJECT_SLUGS[k] === s2); return `<a href="${slug ? `/zhenti/fenxiti/kemu/${slug}` : "#"}" onclick="fxfilter('${hesc(s2)}',this);return false" class="fxtab min-h-[32px] px-3 py-1.5 rounded-full bg-white border border-black/5 shadow-card text-slate-600 font-medium" data-s="${hesc(s2)}">${hesc(s2)} ${sj.results.filter(x => x.subject === s2).length}</a>`; }).join("")}</div>
<script>function fxfilter(s,btn){document.querySelectorAll('.fxtab').forEach(function(b){var on=b===btn;b.className='fxtab min-h-[32px] px-3 py-1.5 rounded-full font-medium '+(on?'bg-slate-800 text-white':'bg-white border border-black/5 shadow-card text-slate-600')});document.querySelectorAll('.fxcard').forEach(function(a){a.style.display=!s||a.dataset.sub===s?'':'none'});document.querySelectorAll('h2[id^=y]').forEach(function(h){var d=h.nextElementSibling;var kids=d?Array.prototype.filter.call(d.children,function(c){return c.style.display!=='none'}):[];var vis=kids.length>0;h.style.display=vis?'':'none';if(d)d.style.display=vis?'':'none';var ns=h.querySelectorAll('.fxn'),x=h.querySelector('.fxs');if(ns.length&&x){ns.forEach(function(n){n.classList.toggle('hidden',!!s)});x.classList.toggle('hidden',!s);if(s)x.textContent=' · '+s+' '+kids.length+' 道'}});var dc=document.querySelector('.fxtoday');if(dc)dc.style.display=s?'none':'';var hh=document.querySelector('.fxh');if(hh)hh.textContent=s?'（'+s+' '+document.querySelectorAll('.fxcard:not([style*=none])').length+' 道）':'（'+document.querySelectorAll('.fxcard').length+' 道）'}</script>`;
    })()}
${(() => {
      if (!sj.results.length) return "";
      const ds = sj.results[((Math.floor(Date.now() / 86400000) * 2654435761) >>> 0) % sj.results.length];
      let dqs = []; try { dqs = JSON.parse(ds.questions || "[]"); } catch {}
      return `<section class="fxtoday mt-5 bg-white rounded-2xl border border-rose-200 shadow-card p-4">
<p class="text-xs font-semibold text-rose-500">今日一道分析题 · ${ds.year} 年第 ${ds.seq} 题 · ${hesc(ds.subject || "")}${ds.kp_name ? " · " + hesc(ds.kp_name) : ""}</p>
<p class="mt-1.5 text-sm leading-6 text-slate-800">${hesc(ds.stem.length > 100 ? ds.stem.slice(0, 100) + "…" : ds.stem)}</p>
${dqs.length ? `<div class="mt-2 space-y-1">${dqs.map((q, i) => `<p class="text-sm leading-6 font-medium text-slate-700 line-clamp-1 sm:line-clamp-none">（${i + 1}）${hesc(q)}</p>`).join("")}</div>` : ""}
<p class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1"><a href="/app#realsubj/${ds.year}-${ds.seq}" class="inline-flex items-center min-h-[36px] px-4 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold">先想思路，再看参考要点（免费）→</a><a href="/zhenti/fenxiti/${ds.year}-${ds.seq}" class="inline-flex items-center min-h-[32px] text-xs text-slate-500 hover:text-slate-700 underline decoration-dotted underline-offset-2">看这道题详页 ›</a></p>
</section>`;
    })()}
${years.map(y => `<h2 id="y${y}" class="mt-6 text-lg font-bold scroll-mt-4">${y} 年分析题<span class="fxn">（${byYear[y].length} 道）</span><span class="fxs hidden font-normal text-base text-slate-500"></span><a class="fxn ml-2 inline-flex items-center min-h-[32px] text-xs font-normal text-slate-500 hover:text-rose-600 underline decoration-dotted underline-offset-2" href="/zhenti/fenxiti/${y}">这年分析题页 ›</a></h2>
<div class="mt-2 space-y-2">${byYear[y].map(s => `<article data-sub="${hesc(s.subject || "")}" class="fxcard bg-white rounded-2xl border border-black/5 shadow-card p-4 hover:border-rose-200">
<p class="text-xs text-slate-500 font-num">第 ${s.seq} 题 · ${hesc(s.subject || "")}${s.kp_name ? " · " + (kpset.has(s.kp_name) ? `<a class="inline-flex items-center min-h-[32px] -my-2 text-slate-600 underline decoration-dotted decoration-rose-300 underline-offset-2 hover:text-rose-600" href="/zhenti/kaodian/${encodeURIComponent(s.kp_name)}">${hesc(s.kp_name)}</a>` : hesc(s.kp_name)) : ""}</p>
<a class="mt-1 block text-sm leading-6 text-slate-700 hover:text-rose-600" href="/zhenti/${y}#q${s.seq}">${hesc(s.stem.length > 90 ? s.stem.slice(0, 90) + "…" : s.stem)}</a>${(() => { let qs = []; try { qs = JSON.parse(s.questions || "[]"); } catch {} return qs.length ? `<ol class="mt-1.5 space-y-0.5 text-xs leading-5 text-slate-500">${qs.map((q, i) => `<li>（${i + 1}）${hesc(q)}</li>`).join("")}</ol>` : ""; })()}
<span class="mt-1 flex flex-wrap items-center gap-x-3"><a class="inline-flex items-center min-h-[32px] text-xs font-medium text-rose-600 hover:underline" href="/app#realsubj/${y}-${s.seq}">背这道参考要点（免费）›</a><a class="inline-flex items-center min-h-[32px] text-xs font-medium text-slate-500 hover:text-slate-700" href="/zhenti/fenxiti/${y}-${s.seq}">看这道真题详页 ›</a></span></article>`).join("")}</div>`).join("")}
<div class="mt-8 text-center"><a href="/app#realsubj" class="inline-flex h-11 px-6 items-center rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold">在线背分析题参考要点（免费）→</a></div>
${(() => {
      const faqs = [
        ["考研政治分析题有几道，各考什么科目？", "每年 5 道（第 34-38 题，每道 10 分共 50 分）：34 题考马原、35 题考毛中特、36 题考史纲、37 题考思修法基、38 题考形势与政策及当代世界经济与政治。"],
        ["历年分析题的参考答案哪里看？", "本页收录 2010-2026 共 " + sj.results.length + " 道分析题原题与设问，每道均配原创参考答案要点，注册后可免费在线背诵，支持先想再看、按科目抽背与背诵进度记录。"],
        ["分析题参考答案要点是官方答案吗？", "为原创整理的参考要点，供背诵梳理答题思路使用，正式口径以教育部《考试分析》为准。"],
      ];
      return `<section class="mt-10"><h2 class="text-xl font-bold">常见问题</h2><div class="mt-3 space-y-3">${faqs.map(([q, a]) => `<details class="group bg-white rounded-2xl border border-black/5 shadow-card px-4 py-3"><summary class="cursor-pointer flex items-center justify-between gap-2 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600"><span>${q}</span><svg class="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></summary><p class="mt-2 text-sm leading-6 text-slate-600">${a}</p></details>`).join("")}</div></section>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
    })()}
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: "考研政治历年分析题（2010-2026）", numberOfItems: sj.results.length, itemListElement: sj.results.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: `${s.year} 年考研政治分析题第 ${s.seq} 题（${s.subject || ""}）`, url: `https://zhenti.zalize.com/zhenti/fenxiti/${s.year}-${s.seq}` })) })}</script>`;
    return zhentiShell("考研政治分析题历年真题及参考答案（2010-2026）· 真题工坊", `考研政治 2010-2026 历年分析题（34-38 题）共 ${sj.results.length} 道全收录，每道配原创参考答案要点，免费在线背诵。`, "https://zhenti.zalize.com/zhenti/fenxiti", body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["历年真题库", "https://zhenti.zalize.com/zhenti"], ["分析题", "https://zhenti.zalize.com/zhenti/fenxiti"]]));
  }
  const km = p.match(/^\/zhenti\/fenxiti\/kemu\/([a-z]+)$/);
  if (km) {
    const sub = FX_SUBJECT_SLUGS[km[1]];
    if (!sub) return new Response("Not Found", { status: 404 });
    const sj = await env.DB.prepare("SELECT year, seq, subject, kp_name, stem, questions FROM real_subjective WHERE subject=? ORDER BY year DESC, seq").bind(sub).all();
    if (!sj.results.length) return new Response("Not Found", { status: 404 });
    const canon = `https://zhenti.zalize.com/zhenti/fenxiti/kemu/${km[1]}`;
    const others = Object.entries(FX_SUBJECT_SLUGS).filter(([k2]) => k2 !== km[1]);
    const body = `<h1 class="mt-8 text-2xl font-extrabold">考研政治${hesc(sub)}历年分析题及参考答案（${sj.results.length} 道）</h1>
<p class="mt-2 text-sm text-slate-500">2010-2026 每年 1 道${hesc(sub)}分析题，共 ${sj.results.length} 道全收录，每道附原创参考答案要点。<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline font-medium" href="/app#realsubj">注册后免费按科目抽背 →</a></p>
<nav class="mt-3 text-xs text-slate-500"><a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti">← 全部分析题</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti">按年份看客观题</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/kemu/${km[1]}">${hesc(sub)}客观题真题 →</a></nav>
<div class="mt-4 space-y-2">${sj.results.map(s => `<article class="bg-white rounded-2xl border border-black/5 shadow-card p-4 hover:border-rose-200">
<p class="text-xs text-slate-500 font-num">${s.year} 年第 ${s.seq} 题${s.kp_name ? " · " + hesc(s.kp_name) : ""}</p>
<a class="mt-1 block text-sm leading-6 text-slate-700 hover:text-rose-600" href="/zhenti/fenxiti/${s.year}-${s.seq}">${hesc(s.stem.length > 90 ? s.stem.slice(0, 90) + "…" : s.stem)}</a>
${(() => { let qq = []; try { qq = JSON.parse(s.questions || "[]"); } catch {} return qq.length ? `<ol class="mt-1.5 space-y-0.5 text-xs leading-5 text-slate-500">${qq.map((q2, i) => `<li>（${i + 1}）${hesc(q2)}</li>`).join("")}</ol>` : ""; })()}
<span class="mt-1 flex flex-wrap items-center gap-x-3"><a class="inline-flex items-center min-h-[32px] text-xs font-medium text-rose-600 hover:underline" href="/app#realsubj/${s.year}-${s.seq}">背这道参考要点（免费）›</a><a class="inline-flex items-center min-h-[32px] text-xs text-slate-500 hover:text-slate-700 underline decoration-dotted underline-offset-2" href="/zhenti/fenxiti/${s.year}-${s.seq}">看这道真题详页 ›</a></span></article>`).join("")}</div>
<section class="mt-8"><h2 class="text-lg font-bold">其他科目分析题</h2>
<div class="mt-3 flex flex-wrap gap-2">${others.map(([k2, v2]) => `<a href="/zhenti/fenxiti/kemu/${k2}" class="min-h-[32px] inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-black/5 shadow-card text-sm text-slate-600 hover:border-rose-200">${hesc(v2)}</a>`).join("")}</div></section>
<div class="mt-8 text-center"><a href="/app#realsubj" class="inline-flex h-11 px-6 items-center rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold">在线背${hesc(sub)}分析题要点（免费）→</a></div>
${(() => {
      const seqNo = sj.results[0].seq;
      const faqs = [
        [`考研政治${sub}分析题每年考几道？`, `每年 1 道（第 ${seqNo} 题，10 分）。2010-2026 共 ${sj.results.length} 道，本页全部收录，含真题设问原文。`],
        [`${sub}分析题的参考答案哪里看？`, `每道题都有原创参考答案要点，注册后免费在线背诵，支持先想再看、按科目抽背、要点自评与 7 天防遗忘温习。`],
        [`${sub}分析题怎么复习？`, `建议按年份顺背本页 ${sj.results.length} 道真题要点，熟悉该科分析题的设问方式与答题结构，再配合同考点客观题巩固。`],
      ];
      return `<section class="mt-10"><h2 class="text-xl font-bold">常见问题</h2><div class="mt-3 space-y-3">${faqs.map(([q, a]) => `<details class="group bg-white rounded-2xl border border-black/5 shadow-card px-4 py-3"><summary class="cursor-pointer flex items-center justify-between gap-2 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600"><span>${hesc(q)}</span><svg class="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></summary><p class="mt-2 text-sm leading-6 text-slate-600">${hesc(a)}</p></details>`).join("")}</div></section>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
    })()}
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: `考研政治${sub}历年分析题`, numberOfItems: sj.results.length, itemListElement: sj.results.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: `${s.year} 年考研政治分析题第 ${s.seq} 题`, url: `https://zhenti.zalize.com/zhenti/fenxiti/${s.year}-${s.seq}` })) })}</script>`;
    return zhentiShell(`考研政治${sub}历年分析题及参考答案（2010-2026）· 真题工坊`, `考研政治${sub}分析题 2010-2026 共 ${sj.results.length} 道全收录，含真题设问原文与原创参考答案要点，免费在线背诵。`, canon, body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["分析题", "https://zhenti.zalize.com/zhenti/fenxiti"], [`${sub}分析题`, canon]]));
  }
  const fy = p.match(/^\/zhenti\/fenxiti\/(\d{4})$/);
  if (fy) {
    const year = +fy[1];
    const sj = await env.DB.prepare("SELECT year, seq, subject, kp_name, stem, questions FROM real_subjective WHERE year=? ORDER BY seq").bind(year).all();
    if (!sj.results.length) return new Response("Not Found", { status: 404 });
    const canon = `https://zhenti.zalize.com/zhenti/fenxiti/${year}`;
    const body = `<h1 class="mt-8 text-2xl font-extrabold">${year} 年考研政治分析题真题及参考答案（${sj.results.length} 道）</h1>
<p class="mt-2 text-sm text-slate-500">${year} 年全国硕士研究生招生考试思想政治理论第 34-38 题全收录，含真题设问原文，每道附原创参考答案要点。<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline font-medium" href="/app#realsubj/${year}">注册后免费在线背这套要点 →</a></p>
<nav class="mt-3 text-xs text-slate-500"><a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti">← 全部分析题</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/${year}">${year} 年客观题整卷</a>${year > 2010 ? ` · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti/${year - 1}">‹ ${year - 1} 年分析题</a>` : ""}${year < 2026 ? ` · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti/${year + 1}">${year + 1} 年分析题 ›</a>` : ""}</nav>
<div class="mt-4 space-y-2">${sj.results.map(s => `<article class="bg-white rounded-2xl border border-black/5 shadow-card p-4 hover:border-rose-200">
<p class="text-xs text-slate-500 font-num">第 ${s.seq} 题 · ${hesc(s.subject || "")}${s.kp_name ? " · " + hesc(s.kp_name) : ""}</p>
<a class="mt-1 block text-sm leading-6 text-slate-700 hover:text-rose-600" href="/zhenti/fenxiti/${year}-${s.seq}">${hesc(s.stem.length > 90 ? s.stem.slice(0, 90) + "…" : s.stem)}</a>
${(() => { let qq = []; try { qq = JSON.parse(s.questions || "[]"); } catch {} return qq.length ? `<ol class="mt-1.5 space-y-0.5 text-xs leading-5 text-slate-500">${qq.map((q2, i) => `<li>（${i + 1}）${hesc(q2)}</li>`).join("")}</ol>` : ""; })()}
<span class="mt-1 flex flex-wrap items-center gap-x-3"><a class="inline-flex items-center min-h-[32px] text-xs font-medium text-rose-600 hover:underline" href="/app#realsubj/${year}-${s.seq}">背这道参考要点（免费）›</a><a class="inline-flex items-center min-h-[32px] text-xs text-slate-500 hover:text-slate-700 underline decoration-dotted underline-offset-2" href="/zhenti/fenxiti/${year}-${s.seq}">看这道真题详页 ›</a></span></article>`).join("")}</div>
<div class="mt-8 text-center"><a href="/app#realsubj/${year}" class="inline-flex h-11 px-6 items-center rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold">在线背 ${year} 年分析题要点（免费）→</a></div>
${(() => {
      const faqs = [
        [`${year} 年考研政治分析题考了什么？`, `共 5 道（第 34-38 题，每道 10 分）：${sj.results.map(s => `第 ${s.seq} 题考${s.subject || ""}${s.kp_name ? "（" + s.kp_name + "）" : ""}`).join("、")}。`],
        [`${year} 年分析题的参考答案哪里看？`, `本页 5 道题均配原创参考答案要点，点进题详页可看完整材料与设问，注册后免费在线背诵、要点自评与防遗忘温习。`],
        [`${year} 年的客观题在哪里刷？`, `同年 1-33 题客观题（单选+多选）见 ${year} 年整卷页，注册后可在线模考自动判分。`],
      ];
      return `<section class="mt-10"><h2 class="text-xl font-bold">常见问题</h2><div class="mt-3 space-y-3">${faqs.map(([q, a]) => `<details class="group bg-white rounded-2xl border border-black/5 shadow-card px-4 py-3"><summary class="cursor-pointer flex items-center justify-between gap-2 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600"><span>${hesc(q)}</span><svg class="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></summary><p class="mt-2 text-sm leading-6 text-slate-600">${hesc(a)}</p></details>`).join("")}</div></section>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
    })()}
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: `${year} 年考研政治分析题`, numberOfItems: sj.results.length, itemListElement: sj.results.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: `${year} 年考研政治分析题第 ${s.seq} 题（${s.subject || ""}）`, url: `https://zhenti.zalize.com/zhenti/fenxiti/${year}-${s.seq}` })) })}</script>`;
    return zhentiShell(`${year} 年考研政治分析题真题及参考答案 · 真题工坊`, `${year} 年考研政治分析题（34-38 题）5 道全收录，含真题设问原文与原创参考答案要点，免费在线背诵。`, canon, body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["分析题", "https://zhenti.zalize.com/zhenti/fenxiti"], [`${year} 年分析题`, canon]]));
  }
  const fm = p.match(/^\/zhenti\/fenxiti\/(\d{4})-(\d{2})$/);
  if (fm) {
    const year = +fm[1], seq = +fm[2];
    const s = await env.DB.prepare("SELECT year, seq, subject, kp_name, stem, questions, answer_points FROM real_subjective WHERE year=? AND seq=?").bind(year, seq).first();
    if (!s) return new Response("Not Found", { status: 404 });
    let qs = []; try { qs = JSON.parse(s.questions || "[]"); } catch {}
    const rel = s.kp_name ? await env.DB.prepare("SELECT year, seq, qtype, substr(stem,1,80) AS brief FROM real_questions WHERE kp_name=? AND third_party_material=0 ORDER BY year DESC, seq LIMIT 6").bind(s.kp_name).all() : { results: [] };
    const kpOk = rel.results.length > 0;
    const sib = await env.DB.prepare("SELECT year, seq, subject, kp_name FROM real_subjective WHERE subject=? AND NOT (year=? AND seq=?) ORDER BY year DESC LIMIT 8").bind(s.subject || "", year, seq).all();
    const yrSib = await env.DB.prepare("SELECT seq, subject, kp_name FROM real_subjective WHERE year=? AND seq!=? ORDER BY seq").bind(year, seq).all();
    const title = `${year} 年考研政治分析题第 ${seq} 题（${s.subject || ""}${s.kp_name ? "·" + s.kp_name : ""}）真题与参考答案要点`;
    const desc = `${year} 年考研政治分析题第 ${seq} 题真题原文与设问，配原创参考答案要点，注册后可免费在线背诵与要点自评。`;
    const body = `<h1 class="mt-8 text-2xl font-extrabold">${year} 年考研政治分析题第 ${seq} 题</h1>
<p class="mt-2 text-sm text-slate-500">${hesc(s.subject || "")}${s.kp_name ? " · " + (kpOk ? `<a class="text-rose-600 underline" href="/zhenti/kaodian/${encodeURIComponent(s.kp_name)}">${hesc(s.kp_name)}</a>` : hesc(s.kp_name)) : ""} · ${s.stem.includes("材料概述") ? "材料为原创概述" : "材料为真题原文节选"}，设问为真题原文。</p>
<nav class="mt-3 text-xs text-slate-500"><a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti">← 全部分析题</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti/${year}">${year} 年分析题</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/${year}">${year} 年整卷</a>${seq > 34 ? ` · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti/${year}-${seq - 1}">上一题（第 ${seq - 1} 题）</a>` : year > 2010 ? ` · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti/${year - 1}-38">上一题（${year - 1} 年第 38 题）</a>` : ""}${seq < 38 ? ` · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti/${year}-${seq + 1}">下一题（第 ${seq + 1} 题）</a>` : year < 2026 ? ` · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti/${year + 1}-34">下一题（${year + 1} 年第 34 题）</a>` : ""}</nav>
<article class="mt-5 bg-white rounded-2xl border border-black/5 shadow-card p-4">
<p class="text-sm leading-7 text-slate-800 whitespace-pre-line">${hesc((() => {
      // 设问已单列时从材料段落去掉重复的设问行
      if (!qs.length) return s.stem;
      const keys = qs.map(t => String(t).slice(0, 12));
      return s.stem.split("\n").filter(line => {
        const l = line.replace(/^\s*[（(]\d+[）)]\s*/, "");
        return !keys.some(k => k && l.startsWith(k));
      }).join("\n").trim() || s.stem;
    })())}</p>
${qs.length ? `<ol class="mt-3 space-y-1.5 text-sm leading-6 font-medium text-slate-700">${qs.map((q, i) => `<li>（${i + 1}）${hesc(q)}</li>`).join("")}</ol>` : ""}
</article>
<div class="mt-5 rounded-2xl bg-white border border-rose-200 shadow-card p-4">
<p class="text-sm font-semibold text-slate-800">参考答案要点</p>
${(() => { let ap = []; try { ap = JSON.parse(s.answer_points || "[]"); } catch {} if (!ap.length) return ""; const first = String(ap[0]); const brief = first.length > 90 ? first.slice(0, 90) + "…" : first; return `<p class="mt-2 rounded-xl bg-page px-3 py-2.5 text-sm leading-6 text-slate-700"><b class="text-slate-500 text-xs">要点 1/${ap.length}（免费预览）</b><br>${hesc(brief)}</p>`; })()}
<p class="mt-2 text-sm leading-6 text-slate-600">全部要点已整理好，注册后可免费在线背诵：支持先想再看、逐条要点自评命中、背会标记与 7 天防遗忘温习。</p>
<p class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2"><a href="/app#realsubj/${year}-${seq}" class="inline-flex items-center h-11 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold">背这道参考要点（免费）→</a>${rel.results.length ? `<a href="/app#realsearch/${encodeURIComponent(s.kp_name)}" class="inline-flex items-center min-h-[32px] text-xs text-rose-600 underline decoration-dotted underline-offset-2">🎯 在线练「${hesc(s.kp_name)}」客观真题 ›</a>` : ""}</p>
</div>
${rel.results.length ? `<section class="mt-8"><h2 class="text-xl font-bold">同考点客观真题（${hesc(s.kp_name)}）</h2>
<p class="mt-1 text-xs text-slate-500">同一考点也常出客观题，一起看能补全考法。<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline" href="/zhenti/kaodian/${encodeURIComponent(s.kp_name)}">该考点全部真题 →</a></p>
<div class="mt-2 space-y-2">${rel.results.map(r => `<a href="/zhenti/${r.year}/${r.seq}" class="block bg-white rounded-2xl border border-black/5 shadow-card p-3.5 hover:border-rose-200"><span class="text-xs text-slate-500 font-num">${r.year} 年第 ${r.seq} 题 · ${r.qtype === "multi" ? "多选" : "单选"}</span><span class="mt-0.5 block text-sm leading-6 text-slate-700">${hesc(r.brief)}…</span></a>`).join("")}</div></section>` : ""}
${sib.results.length ? `<section class="mt-8"><h2 class="text-xl font-bold">同科目其他年份分析题</h2>
${(() => { const slug = Object.keys(FX_SUBJECT_SLUGS).find(k => FX_SUBJECT_SLUGS[k] === s.subject); return slug ? `<p class="mt-1 text-xs text-slate-500"><a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti/kemu/${slug}">${hesc(s.subject)}分析题全部 16 道 →</a></p>` : ""; })()}
<div class="mt-3 flex flex-wrap gap-2">${sib.results.map(r => `<a href="/zhenti/fenxiti/${r.year}-${r.seq}" class="min-h-[32px] inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-black/5 shadow-card text-sm hover:border-rose-200"><span class="font-num">${r.year}</span>${r.kp_name ? ` <span class="ml-1 text-xs text-slate-500">${hesc(r.kp_name)}</span>` : ""}</a>`).join("")}</div></section>` : ""}
${yrSib.results.length ? `<section class="mt-8"><h2 class="text-xl font-bold">${year} 年其他分析题</h2>
<div class="mt-3 flex flex-wrap gap-2">${yrSib.results.map(r => `<a href="/zhenti/fenxiti/${year}-${r.seq}" class="min-h-[32px] inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-black/5 shadow-card text-sm hover:border-rose-200"><span class="font-num">第 ${r.seq} 题</span><span class="ml-1 text-xs text-slate-500">${hesc(r.subject || "")}${r.kp_name ? " · " + hesc(r.kp_name) : ""}</span></a>`).join("")}</div></section>` : ""}
${(() => {
      const faqs = [
        [`${year} 年考研政治分析题第 ${seq} 题考的是什么？`, `第 ${seq} 题属于${s.subject || "分析题"}${s.kp_name ? "，对应考点「" + s.kp_name + "」（按现行考纲口径归类，早年真题的当年提法可能不同）" : ""}，分值 10 分。分析题固定为第 34-38 题，每年 5 道共 50 分。`],
        [`这道分析题的参考答案在哪里看？`, `本页给出真题材料概述与设问原文，参考答案要点在应用内免费开放：注册后进入「分析题背诵」即可逐条对照要点、自评命中率并记录背诵进度。`],
        [`参考答案要点是官方答案吗？`, `为真题工坊原创整理的参考要点，用于梳理答题思路与背诵，正式口径以教育部《考试分析》为准。`],
      ];
      return `<section class="mt-10"><h2 class="text-xl font-bold">常见问题</h2><div class="mt-3 space-y-3">${faqs.map(([q, a]) => `<details class="group bg-white rounded-2xl border border-black/5 shadow-card px-4 py-3"><summary class="cursor-pointer flex items-center justify-between gap-2 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600"><span>${hesc(q)}</span><svg class="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></summary><p class="mt-2 text-sm leading-6 text-slate-600">${hesc(a)}</p></details>`).join("")}</div></section>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
    })()}`;
    return zhentiShell(title + " · 真题工坊", desc, `https://zhenti.zalize.com/zhenti/fenxiti/${year}-${seq}`, body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["历年真题库", "https://zhenti.zalize.com/zhenti"], ["分析题", "https://zhenti.zalize.com/zhenti/fenxiti"], [`${year} 年第 ${seq} 题`, `https://zhenti.zalize.com/zhenti/fenxiti/${year}-${seq}`]]));
  }
  const qkm = p.match(/^\/zhenti\/kemu\/([a-z]+)$/);
  if (qkm) {
    const sub = FX_SUBJECT_SLUGS[qkm[1]];
    if (!sub) return new Response("Not Found", { status: 404 });
    const kps = await env.DB.prepare("SELECT kp_name, COUNT(*) AS n FROM real_questions WHERE subject=? AND third_party_material=0 AND kp_name IS NOT NULL GROUP BY kp_name ORDER BY n DESC, kp_name").bind(sub).all();
    const yrs = await env.DB.prepare("SELECT year, COUNT(*) AS n FROM real_questions WHERE subject=? AND third_party_material=0 GROUP BY year ORDER BY year DESC").bind(sub).all();
    if (!kps.results.length) return new Response("Not Found", { status: 404 });
    const total = yrs.results.reduce((a, r) => a + r.n, 0);
    const canon = `https://zhenti.zalize.com/zhenti/kemu/${qkm[1]}`;
    const others = Object.entries(FX_SUBJECT_SLUGS).filter(([k2]) => k2 !== qkm[1]);
    const body = `<h1 class="mt-8 text-2xl font-extrabold">考研政治${hesc(sub)}历年真题（${total} 道客观题）</h1>
<p class="mt-2 text-sm text-slate-500">2010-2026 考研政治${hesc(sub)}客观题 ${total} 道、覆盖 ${kps.results.length} 个考点，含答案与原创解析。<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline font-medium" href="/app#realrand">注册后免费在线抽练判分 →</a></p>
<nav class="mt-3 text-xs text-slate-500"><a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti">← 全部年份真题</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/kaodian">全部考点索引</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/fenxiti/kemu/${qkm[1]}">${hesc(sub)}分析题 →</a></nav>
<section class="mt-6"><h2 class="text-lg font-bold">${hesc(sub)}考点（按真题出题量排序）</h2>
<p class="mt-1 text-xs text-slate-500">点考点看该考点历年全部真题（含答案解析，支持自测模式）。</p>
<div class="mt-3 flex flex-wrap gap-2">${kps.results.map(r => `<a href="/zhenti/kaodian/${encodeURIComponent(r.kp_name)}" class="inline-flex items-center min-h-[32px] px-3 py-1.5 rounded-full bg-white border border-black/5 shadow-card text-sm text-slate-700 hover:border-rose-200">${hesc(r.kp_name)} <span class="ml-1 text-xs text-slate-400 font-num">×${r.n}</span></a>`).join("")}</div></section>
<section class="mt-8"><h2 class="text-lg font-bold">按年份看${hesc(sub)}出题量</h2>
<div class="mt-3 flex flex-wrap gap-2">${yrs.results.map(r => `<a href="/zhenti/${r.year}" class="inline-flex items-center min-h-[32px] px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 text-sm font-num hover:bg-rose-100">${r.year} <span class="ml-1 text-xs">${r.n} 道</span></a>`).join("")}</div></section>
<section class="mt-8"><h2 class="text-lg font-bold">其他科目真题</h2>
<div class="mt-3 flex flex-wrap gap-2">${others.map(([k2, v2]) => `<a href="/zhenti/kemu/${k2}" class="min-h-[32px] inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-black/5 shadow-card text-sm text-slate-600 hover:border-rose-200">${hesc(v2)}</a>`).join("")}</div></section>
<div class="mt-8 text-center"><a href="/app#realrand" class="inline-flex h-11 px-6 items-center rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold">在线刷${hesc(sub)}真题（免费判分）→</a></div>
${(() => {
      const faqs = [
        [`考研政治${sub}客观题一共考了多少道？`, `2010-2026 共 ${total} 道（不含第三方版权材料题），覆盖 ${kps.results.length} 个考点，本页按考点与年份两个维度全部收录。`],
        [`${sub}哪些考点考得最多？`, `出题量前三的考点是：${kps.results.slice(0, 3).map(r => `「${r.kp_name}」（${r.n} 道）`).join("、")}。点击考点可看该考点历年全部真题及解析。`],
        [`可以在线练${sub}真题吗？`, `可以。注册后免费按考点抽练、整卷模考并自动判分，错题自动进错题本循环复习。`],
      ];
      return `<section class="mt-10"><h2 class="text-xl font-bold">常见问题</h2><div class="mt-3 space-y-3">${faqs.map(([q, a]) => `<details class="group bg-white rounded-2xl border border-black/5 shadow-card px-4 py-3"><summary class="cursor-pointer flex items-center justify-between gap-2 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600"><span>${hesc(q)}</span><svg class="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></summary><p class="mt-2 text-sm leading-6 text-slate-600">${hesc(a)}</p></details>`).join("")}</div></section>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
    })()}
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: `考研政治${sub}考点真题列表`, numberOfItems: kps.results.length, itemListElement: kps.results.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.kp_name, url: `https://zhenti.zalize.com/zhenti/kaodian/${encodeURIComponent(r.kp_name)}` })) })}</script>`;
    return zhentiShell(`考研政治${sub}历年真题及答案（2010-2026 共 ${total} 道）· 真题工坊`, `考研政治${sub}客观题 2010-2026 共 ${total} 道全收录，按 ${kps.results.length} 个考点与年份导航，含答案与原创解析，免费在线刷题判分。`, canon, body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["历年真题库", "https://zhenti.zalize.com/zhenti"], [`${sub}真题`, canon]]));
  }
  const qm = p.match(/^\/zhenti\/(\d{4})\/(\d{1,2})$/);
  if (qm) {
    const year = +qm[1], seq = +qm[2];
    const q = await env.DB.prepare("SELECT year, seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject, kp_name, answer_disputed FROM real_questions WHERE year=? AND seq=? AND third_party_material=0").bind(year, seq).first();
    if (!q) {
      const nf = `<div class="mt-16 text-center"><h1 class="text-2xl font-extrabold">这道题暂无详页</h1><p class="mt-2 text-sm text-slate-500">题号不存在，或该题因材料版权原因未收录独立详页。</p><p class="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">${year >= 2010 && year <= 2026 ? `<a class="inline-flex items-center min-h-[32px] text-rose-600 underline" href="/zhenti/${year}">← ${year} 年整卷</a>` : ""}<a class="inline-flex items-center min-h-[32px] text-rose-600 underline" href="/zhenti">全部年份真题</a><a class="inline-flex items-center min-h-[32px] text-slate-500 underline decoration-dotted underline-offset-2" href="/zhenti/kaodian">按考点看</a></p></div>`;
      return new Response(await zhentiShell("页面不存在 · 真题工坊", "该题详页不存在。", "https://zhenti.zalize.com/zhenti", nf, `<meta name="robots" content="noindex">`).text(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    const L = { A: "opt_a", B: "opt_b", C: "opt_c", D: "opt_d" };
    const prev = await env.DB.prepare("SELECT seq FROM real_questions WHERE year=? AND seq<? AND third_party_material=0 ORDER BY seq DESC LIMIT 1").bind(year, seq).first();
    const next = await env.DB.prepare("SELECT seq FROM real_questions WHERE year=? AND seq>? AND third_party_material=0 ORDER BY seq LIMIT 1").bind(year, seq).first();
    const rel = q.kp_name ? await env.DB.prepare("SELECT year, seq, qtype, substr(stem,1,80) AS brief FROM real_questions WHERE kp_name=? AND third_party_material=0 AND NOT (year=? AND seq=?) ORDER BY year DESC, seq LIMIT 6").bind(q.kp_name, year, seq).all() : { results: [] };
    const sjq = q.kp_name ? await env.DB.prepare("SELECT year, seq FROM real_subjective WHERE kp_name=? ORDER BY year DESC LIMIT 2").bind(q.kp_name).all() : { results: [] };
    const ty = q.qtype === "multi" ? "多选" : "单选";
    const title = `${year} 年考研政治真题第 ${seq} 题（${ty}${q.kp_name ? "·" + q.kp_name : ""}）答案与解析`;
    const canon = `https://zhenti.zalize.com/zhenti/${year}/${seq}`;
    const body = `<h1 class="mt-8 text-2xl font-extrabold">${year} 年考研政治真题第 ${seq} 题（${ty}）</h1>
<p class="mt-2 text-sm text-slate-500">${hesc(q.subject || "")}${q.kp_name ? ` · <a class="text-rose-600 underline" href="/zhenti/kaodian/${encodeURIComponent(q.kp_name)}">${hesc(q.kp_name)}</a>` : ""} · 真题原题，含答案与原创解析。</p>
<nav class="mt-3 text-xs text-slate-500"><a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/${year}#q${seq}">← ${year} 年整卷</a> · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti">全部年份</a>${prev ? ` · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/${year}/${prev.seq}">上一题（第 ${prev.seq} 题）</a>` : ""}${next ? ` · <a class="inline-flex items-center min-h-[32px] underline hover:text-rose-600" href="/zhenti/${year}/${next.seq}">下一题（第 ${next.seq} 题）</a>` : ""}${(() => { const sg = Object.keys(FX_SUBJECT_SLUGS).find(k => FX_SUBJECT_SLUGS[k] === q.subject); return sg ? ` · <a class="inline-flex items-center min-h-[32px] underline decoration-dotted underline-offset-2 hover:text-rose-600" href="/zhenti/kemu/${sg}">更多${hesc(q.subject)}真题 ›</a>` : ""; })()}</nav>
<article class="mt-5 bg-white rounded-2xl border border-black/5 shadow-card p-4">
<p class="text-sm leading-7 text-slate-800">${hesc(q.stem)}</p>
<div class="mt-2.5 space-y-1.5">${["A", "B", "C", "D"].map(o => `<p class="qdopt text-sm leading-6 text-slate-600" data-ok="${q.answer.includes(o) ? 1 : 0}">&nbsp;&nbsp;${o}. ${hesc(q[L[o]])}</p>`).join("")}</div>
<details class="mt-2.5" open><summary class="cursor-pointer min-h-[36px] px-4 py-1.5 inline-flex items-center rounded-full border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-xs font-semibold text-rose-600 list-none [&::-webkit-details-marker]:hidden" onclick="if(!this.dataset.d){this.dataset.d=1;this.textContent='答案与解析 ▾';this.closest('article').querySelectorAll('.qdopt[data-ok=&quot;1&quot;]').forEach(e=>{e.classList.remove('text-slate-600');e.classList.add('text-ok-700','font-medium');e.innerHTML='✓ '+e.innerHTML.replace(/^(&amp;nbsp;|\\s)+/,'')})}">先想好答案，再点我揭晓 ›</summary>
<div class="mt-1 rounded-xl bg-page px-3 py-2.5 text-xs leading-5 text-slate-600"><b class="text-slate-700">答案 ${hesc(q.answer)}</b>${q.answer_disputed ? `<br><span class="text-amber-600">注：该题各机构答案存在分歧，以官方《考试分析》为准</span>` : ""}<br>${hesc(q.analysis || "")}</div></details>
<script>(function(){var d=document.currentScript.previousElementSibling;d.removeAttribute('open')})()</script>
</article>
<div class="mt-5 rounded-2xl bg-white border border-rose-200 shadow-card p-4">
<p class="text-sm font-semibold text-slate-800">在线刷这套卷</p>
<p class="mt-1 text-sm leading-6 text-slate-600">注册后可免费在线模考 ${year} 年整卷：自动判分、按考场分值折算，错题自动进错题本循环复习。</p>
<p class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2"><a href="/app#realyear/${year}" class="inline-flex items-center h-11 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold">在线做 ${year} 年整卷（免费）→</a><a href="/app#realrand" class="inline-flex items-center min-h-[32px] text-xs text-rose-600 underline decoration-dotted underline-offset-2">🎲 全库随机 20 题快刷 ›</a>${q.kp_name && rel.results.length ? `<a href="/app#realsearch/${encodeURIComponent(q.kp_name)}" class="inline-flex items-center min-h-[32px] text-xs text-rose-600 underline decoration-dotted underline-offset-2">🎯 在线练「${hesc(q.kp_name)}」同考点真题 ›</a>` : ""}</p>
</div>
${rel.results.length ? `<section class="mt-8"><h2 class="text-xl font-bold">同考点其他真题（${hesc(q.kp_name)}）</h2>
<p class="mt-1 text-xs text-slate-500"><a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline" href="/zhenti/kaodian/${encodeURIComponent(q.kp_name)}">该考点全部真题 →</a></p>
<div class="mt-2 space-y-2">${rel.results.map(r => `<a href="/zhenti/${r.year}/${r.seq}" class="block bg-white rounded-2xl border border-black/5 shadow-card p-3.5 hover:border-rose-200"><span class="text-xs text-slate-500 font-num">${r.year} 年第 ${r.seq} 题 · ${r.qtype === "multi" ? "多选" : "单选"}</span><span class="mt-0.5 block text-sm leading-6 text-slate-700">${hesc(r.brief)}…</span></a>`).join("")}</div></section>` : ""}
${sjq.results.length ? `<p class="mt-6 text-sm text-slate-600">📖 「${hesc(q.kp_name)}」也考过分析题：${sjq.results.map(s => `<a class="inline-flex items-center min-h-[32px] text-rose-600 underline decoration-dotted underline-offset-2 hover:text-rose-700" href="/zhenti/fenxiti/${s.year}-${s.seq}">${s.year} 年第 ${s.seq} 题</a>`).join("、")}，客观题选得对，分析题要点也要背得出。</p>` : ""}
${(() => {
      const faqs = [
        [`${year} 年考研政治第 ${seq} 题的答案是什么？`, `答案为 ${q.answer}（${ty}题）。本页给出真题原题、答案与原创解析，答案经双来源校对。`],
        [`这道题考的是哪个考点？`, `${q.kp_name ? `对应考点「${q.kp_name}」（按现行考纲口径归类，早年真题的当年提法可能不同），属于${q.subject || "考研政治"}。可在考点页查看该考点全部历年真题。` : `属于${q.subject || "考研政治"}。`}`],
        [`可以在线做 ${year} 年整卷并判分吗？`, `可以。注册后免费在线作答 ${year} 年真题整卷，自动判分并按考场分值折算客观题得分，错题自动进入错题本。`],
      ];
      return `<section class="mt-10"><h2 class="text-xl font-bold">常见问题</h2><div class="mt-3 space-y-3">${faqs.map(([fq, fa]) => `<details class="group bg-white rounded-2xl border border-black/5 shadow-card px-4 py-3"><summary class="cursor-pointer flex items-center justify-between gap-2 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600"><span>${hesc(fq)}</span><svg class="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></summary><p class="mt-2 text-sm leading-6 text-slate-600">${hesc(fa)}</p></details>`).join("")}</div></section>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([fq, fa]) => ({ "@type": "Question", name: fq, acceptedAnswer: { "@type": "Answer", text: fa } })) })}</script>`;
    })()}
<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org", "@type": "Quiz",
      name: `${year} 年考研政治真题第 ${seq} 题`,
      educationalAlignment: [{ "@type": "AlignmentObject", alignmentType: "educationalSubject", targetName: "考研政治" }],
      hasPart: [{
        "@type": "Question", eduQuestionType: q.qtype === "multi" ? "Checkbox" : "Multiple choice", learningResourceType: "Practice problem",
        name: q.stem, text: q.stem,
        acceptedAnswer: q.answer.split("").map(o => ({ "@type": "Answer", text: `${o}. ${q[L[o]]}`, ...(q.analysis ? { answerExplanation: { "@type": "Comment", text: q.analysis } } : {}) })),
        suggestedAnswer: ["A", "B", "C", "D"].filter(o => !q.answer.includes(o)).map(o => ({ "@type": "Answer", text: `${o}. ${q[L[o]]}` })),
      }],
    })}</script>`;
    return zhentiShell(title + " · 真题工坊", `${year} 年考研政治真题第 ${seq} 题（${ty}）原题、答案与原创解析，免费在线阅读，注册后可在线模考判分。`, canon, body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["历年真题库", "https://zhenti.zalize.com/zhenti"], [`${year} 年真题`, `https://zhenti.zalize.com/zhenti/${year}`], [`第 ${seq} 题`, canon]]));
  }
  const m = p.match(/^\/zhenti\/(\d{4})$/);
  if (!m) {
    const ys = await env.DB.prepare("SELECT year, COUNT(*) AS n FROM real_questions WHERE third_party_material=0 GROUP BY year ORDER BY year DESC").all();
    // 每日一题（与应用内同款按日期确定性抽题，给索引页每天新鲜内容）
    const cnt = await env.DB.prepare("SELECT COUNT(*) AS n FROM real_questions WHERE third_party_material=0").first();
    const off = ((Math.floor(Date.now() / 86400000) * 2654435761) >>> 0) % cnt.n;
    const dq = await env.DB.prepare("SELECT year, seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject, kp_name FROM real_questions WHERE third_party_material=0 ORDER BY year, seq LIMIT 1 OFFSET ?").bind(off).first();
    const L = { A: "opt_a", B: "opt_b", C: "opt_c", D: "opt_d" };
    const daily = dq ? `<section id="daily" class="mt-6 scroll-mt-4 bg-white rounded-2xl border border-rose-200 shadow-card p-4">
<p class="text-xs font-semibold text-rose-500">每日一题 · ${dq.year} 年第 ${dq.seq} 题 · ${dq.qtype === "multi" ? "多选" : "单选"} · ${hesc(dq.subject || "")}${dq.kp_name ? " · " + hesc(dq.kp_name) : ""}</p>
<p class="mt-1.5 text-sm leading-6 text-slate-800">${hesc(dq.stem)}</p>
<div class="mt-2 space-y-1">${["A", "B", "C", "D"].map(o => `<p class="zdopt text-sm leading-6 text-slate-600" data-ok="${dq.answer.includes(o) ? 1 : 0}">${o}. ${hesc(dq[L[o]])}</p>`).join("")}</div>
<details class="mt-1"><summary class="cursor-pointer min-h-[32px] py-1.5 inline-flex items-center text-xs font-semibold text-rose-500 list-none [&::-webkit-details-marker]:hidden" onclick="if(!this.dataset.d){this.dataset.d=1;this.textContent='答案与解析 ▾';this.closest('section').querySelectorAll('.zdopt[data-ok=&quot;1&quot;]').forEach(e=>{e.classList.remove('text-slate-600');e.classList.add('text-ok-700','font-medium');e.textContent='✓ '+e.textContent});fetch('/api/daily-reveal?src=pub',{method:'POST'}).catch(()=>{})}">先想好答案，再点我揭晓 ›</summary>
<div class="rounded-xl bg-page px-3 py-2.5 text-xs leading-5 text-slate-600"><b class="text-slate-700">答案 ${hesc(dq.answer)}</b><br>${hesc(dq.analysis || "")}<span class="mt-1.5 flex flex-wrap items-center gap-x-3">${dq.kp_name ? `<a href="/zhenti/kaodian/${encodeURIComponent(dq.kp_name)}" class="min-h-[32px] inline-flex items-center text-rose-600 hover:text-rose-700 font-semibold">看「${hesc(dq.kp_name)}」历年真题 ›</a>` : ""}<a href="/zhenti/${dq.year}/${dq.seq}" class="min-h-[32px] inline-flex items-center text-slate-500 hover:text-slate-700 font-medium">本题详页 ›</a><a href="/zhenti/${dq.year}#q${dq.seq}" class="min-h-[32px] inline-flex items-center text-slate-500 hover:text-slate-700 font-medium">看 ${dq.year} 年整卷 ›</a></span><span class="mt-1 block text-slate-400">明天换新题 · <a href="/app" class="inline-flex items-center min-h-[32px] py-1.5 underline hover:text-rose-600">注册领每日任务+打卡 ›</a></span></div></details>
</section>` : "";
    const body = `<h1 class="mt-8 text-2xl font-extrabold">考研政治历年真题库（在线免费）</h1>
<p class="mt-2 text-sm text-slate-500">2010-2026 共 ${ys.results.length} 年真题客观题，每题配原创解析。可在线答题自动判分、错题本循环复习、按考点搜索与弱项组卷。</p>
${daily}
<form method="GET" action="/zhenti/search" class="mt-6 flex gap-2"><input name="q" maxlength="40" placeholder="🔍 搜真题：如「矛盾」「抗日战争」" class="flex-1 h-11 px-4 rounded-xl bg-white border border-black/5 shadow-card text-sm focus:outline-none focus:border-rose-300"><button class="h-11 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold shrink-0">搜索</button></form>
<div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">${ys.results.map(y => `<a href="/zhenti/${y.year}" class="relative bg-white rounded-2xl border border-black/5 shadow-card p-4 text-center hover:border-rose-200">${y.year === 2026 ? `<span class="absolute -top-2 right-2 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-semibold">新</span>` : ""}<span class="block text-lg font-bold">${y.year} 年</span><span class="mt-0.5 block text-xs text-slate-400">${y.n} 题 · 含解析</span></a>`).join("")}</div>
<p class="mt-6 text-sm text-slate-500">也可以<a class="text-rose-600 underline" href="/zhenti/kaodian">按官方考点看真题（考点索引）→</a> · <a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline" href="/zhenti/fenxiti">历年分析题及参考答案 →</a></p>
<p class="mt-1 text-xs text-slate-500">分析题按科目看：${Object.entries(FX_SUBJECT_SLUGS).map(([k, v]) => `<a class="inline-flex items-center min-h-[32px] mr-2 text-rose-600 underline decoration-dotted underline-offset-2 hover:text-rose-700" href="/zhenti/fenxiti/kemu/${k}">${hesc(v)}</a>`).join("")}</p>
<p class="mt-1 text-xs text-slate-500">客观题按科目看：${Object.entries(FX_SUBJECT_SLUGS).map(([k, v]) => `<a class="inline-flex items-center min-h-[32px] mr-2 text-rose-600 underline decoration-dotted underline-offset-2 hover:text-rose-700" href="/zhenti/kemu/${k}">${hesc(v)}</a>`).join("")}</p>
<div class="mt-3 text-sm text-slate-500">碎片时间？<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline font-medium" href="/app#realrand">🎲 全库随机 20 题快刷（注册后免费判分）→</a></div>
${(() => {
      const faqs = [
        ["考研政治历年真题在这里免费看吗？", "是的。2010-2026 年考研政治真题客观题全部免费在线阅读，每题附答案与原创解析，无需登录；注册后还可在线模考自动判分、错题进错题本循环复习。"],
        ["真题答案和解析可靠吗？", "客观题答案经双来源校对，解析为本站原创撰写并持续人工复核，不照录任何机构答案；发现疑义可在应用内一键报错。"],
        ["可以在线做整卷并判分吗？", "可以。每个年份页都有「在线做这套卷」入口，注册后免费在线作答自动判分，并按考场分值折算客观题得分，错题自动进入错题本。"],
        ["分析题（34-38 题）有参考答案吗？", "有。2010-2026 共 85 道分析题均提供原创参考答案要点，注册后可免费背诵，支持先想再看、要点自评与背诵进度记录。"],
      ];
      return `<section class="mt-10"><h2 class="text-xl font-bold">常见问题</h2><div class="mt-3 space-y-3">${faqs.map(([q, a]) => `<details class="group bg-white rounded-2xl border border-black/5 shadow-card px-4 py-3"><summary class="cursor-pointer flex items-center justify-between gap-2 text-sm font-semibold text-slate-800 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600"><span>${q}</span><svg class="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg></summary><p class="mt-2 text-sm leading-6 text-slate-600">${a}</p></details>`).join("")}</div></section>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) })}</script>`;
    })()}`;
    return zhentiShell("考研政治历年真题库 2010-2026（在线免费刷题）· 真题工坊", "考研政治 2010-2026 历年真题在线刷，单选多选全收录，每题原创解析，免费判分+错题本+按考点练。", "https://zhenti.zalize.com/zhenti", body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["历年真题库", "https://zhenti.zalize.com/zhenti"]]));
  }
  const year = +m[1];
  const qs = await env.DB.prepare("SELECT seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject, kp_name FROM real_questions WHERE year=? AND third_party_material=0 ORDER BY seq").bind(year).all();
  if (!qs.results.length) return new Response("Not Found", { status: 404 });
  const L = { A: "opt_a", B: "opt_b", C: "opt_c", D: "opt_d" };
  const sj = await env.DB.prepare("SELECT seq, subject, kp_name, stem, questions FROM real_subjective WHERE year=? ORDER BY seq").bind(year).all();
  const body = `<h1 class="mt-8 text-2xl font-extrabold">${year} 年考研政治真题及答案解析</h1>
<p class="mt-2 text-sm text-slate-500">${year} 年全国硕士研究生招生考试思想政治理论真题客观题 ${qs.results.length} 道，含答案与原创解析。<a class="text-rose-600 underline" href="/app#realyear/${year}">注册后可在线模考判分、错题自动进错题本 →</a></p>
<nav class="mt-3 text-xs text-slate-500"><a class="inline-block py-1.5 underline hover:text-rose-600" href="/zhenti">← 全部年份</a> · <a class="inline-block py-1.5 underline hover:text-rose-600" href="/zhenti/kaodian">按考点看</a> · 其他年份：${Array.from({ length: 17 }, (_, i) => 2026 - i).filter(y => y !== year).map(y => `<a class="inline-block py-1.5 underline hover:text-rose-600" href="/zhenti/${y}">${y}</a>`).join(" · ")}</nav>
${await (async () => {
    const cnt = {};
    for (const q of qs.results.concat(sj.results)) if (q.kp_name) cnt[q.kp_name] = (cnt[q.kp_name] || 0) + 1;
    // 考点页仅对有客观真题的考点存在，纯分析题考点不出 chip 以免 404
    const subjOnly = [...new Set(sj.results.map(s => s.kp_name).filter(k => k && !qs.results.some(q => q.kp_name === k)))];
    if (subjOnly.length) {
      const ok = await env.DB.prepare(`SELECT DISTINCT kp_name FROM real_questions WHERE kp_name IN (${subjOnly.map(() => "?").join(",")}) AND third_party_material=0`).bind(...subjOnly).all();
      const okSet = new Set(ok.results.map(r => r.kp_name));
      for (const k of subjOnly) if (!okSet.has(k)) delete cnt[k];
    }
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 12);
    return top.length ? `<div class="mt-4"><p class="text-xs font-semibold text-slate-500">本卷考点（点击看该考点历年真题）</p><div class="mt-2 flex flex-wrap gap-2">${top.map(([k, n]) => `<a href="/zhenti/kaodian/${encodeURIComponent(k)}" class="inline-flex items-center min-h-[32px] px-2.5 py-1.5 rounded-full bg-rose-50 text-rose-600 text-xs hover:bg-rose-100">${hesc(k)}${n > 1 ? ` <span class="ml-1 text-rose-500 font-num">×${n}</span>` : ""}</a>`).join("")}</div></div>` : "";
  })()}
<div class="mt-3"><p class="text-xs font-semibold text-slate-500">跳到题号<span class="ml-1 font-normal text-slate-400">（玫红为分析题）</span></p><div id="anchbar" class="mt-1.5 flex flex-wrap gap-1.5 max-h-10 overflow-hidden sm:max-h-none">${qs.results.map(q => `<a href="#q${q.seq}" class="inline-flex items-center justify-center min-w-[32px] min-h-[32px] px-1 rounded-lg bg-white border border-black/5 shadow-card text-xs font-num text-slate-600 hover:border-rose-200 hover:text-rose-600">${q.seq}</a>`).join("")}${sj.results.map(s => `<a href="#q${s.seq}" class="inline-flex items-center justify-center min-w-[32px] min-h-[32px] px-1 rounded-lg bg-rose-50 border border-rose-100 text-xs font-num text-rose-600 hover:bg-rose-100" title="分析题">${s.seq}</a>`).join("")}</div><button id="anchmore" onclick="var b=document.getElementById('anchbar');var on=b.classList.toggle('max-h-10');this.textContent=on?'展开全部题号 ▾':'收起题号 ▴'" class="sm:hidden mt-1 inline-flex items-center min-h-[32px] text-xs text-slate-500 underline decoration-dotted underline-offset-2">展开全部题号 ▾</button><noscript><style>#anchbar{max-height:none!important}#anchmore{display:none}</style></noscript></div>
<details class="mt-4 ansbox"><summary class="cursor-pointer inline-flex items-center min-h-[32px] text-xs font-semibold text-slate-500 list-none [&::-webkit-details-marker]:hidden hover:text-rose-600">📋 答案速查表（1-${qs.results[qs.results.length - 1].seq} 题）▾</summary><div class="mt-2 rounded-2xl bg-white border border-black/5 shadow-card p-3 flex flex-wrap gap-1.5">${qs.results.map(q => `<a href="/zhenti/${year}/${q.seq}" class="inline-flex items-center min-h-[32px] px-2 py-1 rounded-lg bg-page text-xs font-num text-slate-600 hover:text-rose-600" title="第 ${q.seq} 题详页"><span class="text-slate-400">${q.seq}.</span><b class="ml-0.5 text-slate-700">${hesc(q.answer)}</b></a>`).join("")}</div><p class="mt-1.5 text-xs text-slate-500">点击题号可看题干与解析${sj.results.length ? `；34-38 分析题见<a class="inline-flex items-center min-h-[32px] py-1 text-rose-600 underline decoration-dotted underline-offset-2 hover:text-rose-700" href="/zhenti/fenxiti/${year}">${year} 年分析题参考答案</a>` : ""}</p></details>
<div class="mt-6 flex items-center gap-2"><button id="stbtn" onclick="stToggle()" class="min-h-[36px] px-4 py-1.5 inline-flex items-center rounded-full border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-xs font-semibold text-rose-600">✏️ 自测模式：隐藏答案</button><span class="text-xs text-slate-400">隐藏 ✓ 与解析，先自己做一遍</span><button onclick="window.print()" class="hidden sm:inline-flex min-h-[36px] px-4 py-1.5 items-center rounded-full border border-black/10 bg-white hover:border-rose-200 text-xs font-semibold text-slate-600">🖨 打印 / 存 PDF</button></div>
<style>body.selftest{padding-bottom:4.5rem}.selftest .ansmark{visibility:hidden}.selftest .ansbox{display:none}.selftest .ansok{color:#475569;font-weight:400}</style>
<button id="stfab" onclick="stToggle()" class="hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 min-h-[36px] px-4 py-1.5 items-center rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg">✏️ 自测中 · 点我显示答案</button>
<script>function stApply(on){document.body.classList.toggle('selftest',on);document.getElementById('stbtn').textContent=on?'👁 显示答案（自测中）':'✏️ 自测模式：隐藏答案';var f=document.getElementById('stfab');f.classList.toggle('hidden',!on);f.classList.toggle('inline-flex',on)}
function stToggle(){var on=!document.body.classList.contains('selftest');stApply(on);try{localStorage.setItem('zt_selftest',on?'1':'')}catch(e){}}
try{if(localStorage.getItem('zt_selftest')==='1')stApply(true)}catch(e){}</script>
<div class="mt-4 space-y-4">${qs.results.map(q => `<article id="q${q.seq}" class="scroll-mt-4 bg-white rounded-2xl border border-black/5 shadow-card p-4">
<p class="text-xs text-slate-500 font-num">第 ${q.seq} 题 · ${q.qtype === "multi" ? "多选" : "单选"} · ${hesc(q.subject || "")}${q.kp_name ? " · " + hesc(q.kp_name) : ""} · <a class="inline-flex items-center min-h-[32px] text-slate-500 hover:text-slate-700 underline decoration-dotted underline-offset-2" href="/zhenti/${year}/${q.seq}">本题详页 ›</a></p>
<p class="mt-1.5 text-sm leading-6 text-slate-800">${hesc(q.stem)}</p>
<div class="mt-2 space-y-1.5">${["A", "B", "C", "D"].map(o => `<p class="text-sm leading-6 ${q.answer.includes(o) ? "ansok text-ok-700 font-medium" : "text-slate-600"}"><span class="ansmark">${q.answer.includes(o) ? "✓" : "&nbsp;&nbsp;"}</span> ${o}. ${hesc(q[L[o]])}</p>`).join("")}</div>
<div class="ansbox mt-2.5 rounded-xl bg-page px-3 py-2.5 text-xs leading-5 text-slate-600"><b class="text-slate-700">答案 ${hesc(q.answer)}</b><br>${hesc(q.analysis || "")}</div>
</article>`).join("")}</div>
${(() => {
    if (!sj.results.length) return "";
    return `<h2 class="mt-10 text-xl font-bold">${year} 年分析题（第 34-38 题）</h2>
<p class="mt-1 text-sm text-slate-500">材料为真题原文节选或原创概述，设问为真题原文；参考答案要点可在应用内免费背诵。<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline" href="/zhenti/fenxiti/${year}">${year} 年分析题专页 →</a> · <a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline" href="/zhenti/fenxiti">全部年份分析题索引 →</a></p>
<div class="mt-4 space-y-4">${sj.results.map(s => {
      let qs = []; try { qs = JSON.parse(s.questions || "[]"); } catch { }
      // 设问已单列时从材料段落去掉重复的设问行，再截断
      const keys = qs.map(t => String(t).slice(0, 12));
      const stem = qs.length ? s.stem.split("\n").filter(line => {
        const l = line.replace(/^\s*[（(]\d+[）)]\s*/, "");
        return !keys.some(k => k && l.startsWith(k));
      }).join("\n").trim() : s.stem;
      return `<article id="q${s.seq}" class="scroll-mt-4 bg-white rounded-2xl border border-black/5 shadow-card p-4">
<p class="text-xs text-slate-500 font-num">第 ${s.seq} 题 · ${hesc(s.subject || "")}${s.kp_name ? " · " + hesc(s.kp_name) : ""}</p>
<p class="mt-1.5 text-sm leading-6 text-slate-700">${hesc(stem.length > 220 ? stem.slice(0, 220) + "…" : stem)}</p>
${qs.length ? `<ol class="mt-2 space-y-1 text-sm leading-6 text-slate-800 font-medium">${qs.map((q, i) => `<li>(${i + 1}) ${hesc(q)}</li>`).join("")}</ol>` : ""}
<p class="mt-2.5 flex flex-wrap items-center gap-x-3"><a href="/app#realsubj/${year}-${s.seq}" class="inline-flex items-center min-h-[32px] text-xs text-rose-600 underline decoration-dotted underline-offset-2">背这道参考要点（免费）›</a><a href="/zhenti/fenxiti/${year}-${s.seq}" class="inline-flex items-center min-h-[32px] text-xs text-slate-500 hover:text-slate-700 underline decoration-dotted underline-offset-2">这道题详页 ›</a></p>
</article>`;
    }).join("")}</div>`;
  })()}
<div class="mt-8 text-center"><a href="/app#realyear/${year}" class="inline-flex h-11 px-6 items-center rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold">在线做这套卷（免费判分+错题本）→</a>
<p class="mt-3 text-xs text-slate-500">时间不够整卷？<a class="inline-flex items-center min-h-[32px] py-1.5 text-rose-600 underline font-medium" href="/app#realrand">🎲 全库随机 20 题快刷 →</a></p></div>
<nav class="mt-6 flex items-center justify-between text-sm">${year > 2010 ? `<a class="inline-flex items-center min-h-[32px] py-1.5 text-slate-500 hover:text-rose-600 underline decoration-dotted underline-offset-2" href="/zhenti/${year - 1}">← ${year - 1} 年真题</a>` : "<span></span>"}<a class="inline-flex items-center min-h-[32px] py-1.5 text-slate-500 hover:text-rose-600 underline decoration-dotted underline-offset-2" href="/zhenti">全部年份</a>${year < 2026 ? `<a class="inline-flex items-center min-h-[32px] py-1.5 text-slate-500 hover:text-rose-600 underline decoration-dotted underline-offset-2" href="/zhenti/${year + 1}">${year + 1} 年真题 →</a>` : "<span></span>"}</nav>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: `${year} 年考研政治真题客观题`, numberOfItems: qs.results.length, itemListElement: qs.results.map((q, i) => ({ "@type": "ListItem", position: i + 1, name: `${year} 年考研政治真题第 ${q.seq} 题（${q.qtype === "multi" ? "多选" : "单选"}）`, url: `https://zhenti.zalize.com/zhenti/${year}/${q.seq}` })) })}</script>`;
  return zhentiShell(`${year} 考研政治真题及答案解析（在线刷题）· 真题工坊`, `${year} 年考研政治真题客观题 ${qs.results.length} 道，含答案与原创解析，可在线免费模考判分。`, `https://zhenti.zalize.com/zhenti/${year}`, body, zhentiCrumbs([["首页", "https://zhenti.zalize.com/"], ["历年真题库", "https://zhenti.zalize.com/zhenti"], [`${year} 年真题`, `https://zhenti.zalize.com/zhenti/${year}`]]));
}

// ---------- Router ----------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.protocol === "http:" || request.headers.get("x-forwarded-proto") === "http") {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    const p = url.pathname;
    // 公开真题库 SEO 页（免登录可读，服务端渲染）
    if (p === "/zhenti/search") {
      ctx.waitUntil((async () => {
        const d = new Date().toISOString().slice(0, 10);
        const k = "pv:zt-se:" + d;
        const n = parseInt(await env.RATELIMIT.get(k) || "0", 10) + 1;
        await env.RATELIMIT.put(k, String(n), { expirationTtl: 86400 * 35 });
        const q0 = String(url.searchParams.get("q") || "").replace(/\s+/g, " ").trim().slice(0, 30);
        if (q0) {
          const sk = "sqp:" + q0;
          const sn = parseInt(await env.RATELIMIT.get(sk) || "0", 10) + 1;
          await env.RATELIMIT.put(sk, String(sn), { expirationTtl: 86400 * 30 });
        }
      })().catch(() => {}));
      return zhentiSearchPage(env, url.searchParams.get("q"));
    }
    if (p === "/zhenti" || p === "/zhenti/kaodian" || p === "/zhenti/fenxiti" || p.startsWith("/zhenti/kaodian/") || /^\/zhenti\/fenxiti\/\d{4}-\d{2}$/.test(p) || /^\/zhenti\/fenxiti\/\d{4}$/.test(p) || /^\/zhenti\/fenxiti\/kemu\/[a-z]+$/.test(p) || /^\/zhenti\/kemu\/[a-z]+$/.test(p) || /^\/zhenti\/20(1[0-9]|2[0-9])$/.test(p) || /^\/zhenti\/20(1[0-9]|2[0-9])\/\d{1,2}$/.test(p)) {
      // SEO 页 PV 计数（按天，运营观测，尽力而为）
      ctx.waitUntil((async () => {
        const d = new Date().toISOString().slice(0, 10);
        const keys = ["pv:zhenti:" + d, "pv:zt-" + (p.startsWith("/zhenti/kaodian") ? "kp" : /^\/zhenti\/fenxiti\/\d{4}-\d{2}$/.test(p) ? "fxd" : /^\/zhenti\/fenxiti\/\d{4}$/.test(p) ? "fxy" : p.startsWith("/zhenti/fenxiti/kemu/") ? "fxk" : p.startsWith("/zhenti/fenxiti") ? "fx" : p.startsWith("/zhenti/kemu/") ? "qk" : /^\/zhenti\/\d{4}\/\d{1,2}$/.test(p) ? "qd" : /\d{4}$/.test(p) ? "yr" : "ix") + ":" + d];
        for (const k of keys) {
          const n = parseInt(await env.RATELIMIT.get(k) || "0", 10) + 1;
          await env.RATELIMIT.put(k, String(n), { expirationTtl: 86400 * 35 });
        }
      })().catch(() => {}));
      return zhentiPage(env, p);
    }
    // 每日一题揭晓计数（免登录，运营观测，尽力而为；应用内/公开页分渠道）
    if (p === "/api/daily-reveal" && request.method === "POST") {
      ctx.waitUntil((async () => {
        const d = new Date().toISOString().slice(0, 10);
        const s = url.searchParams.get("src");
        const src = s === "pub" ? "pub" : s === "act" ? "act" : s === "y26" ? "y26" : "app";
        const k = "dr:" + src + ":" + d;
        const n = parseInt(await env.RATELIMIT.get(k) || "0", 10) + 1;
        await env.RATELIMIT.put(k, String(n), { expirationTtl: 86400 * 35 });
      })().catch(() => {}));
      return json({ ok: true });
    }
    // IndexNow 站点验证 key（用于向 Bing 等推送新页面）
    if (p === "/8f4b2c1de6a94570a3c9d1f7b5e28a64.txt") return new Response("8f4b2c1de6a94570a3c9d1f7b5e28a64", { headers: { "Content-Type": "text/plain" } });
    // sitemap 动态生成：静态页 + 16 个年份页 + 全部考点页
    if (p === "/sitemap.xml") {
      const kps = await env.DB.prepare("SELECT DISTINCT kp_name FROM real_questions WHERE third_party_material=0 AND kp_name<>'' ORDER BY kp_name").all();
      const fxs = await env.DB.prepare("SELECT year, seq FROM real_subjective ORDER BY year DESC, seq").all();
      const u = (loc, pr, cf, lm) => `  <url><loc>${loc}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}<changefreq>${cf}</changefreq><priority>${pr}</priority></url>`;
      const base = "https://zhenti.zalize.com";
      const today = new Date().toISOString().slice(0, 10);
      const lines = [
        u(base + "/", "1.0", "weekly"), u(base + "/sample", "0.8", "monthly"),
        u(base + "/zhenti", "0.9", "daily", today), u(base + "/zhenti/kaodian", "0.8", "monthly"), u(base + "/zhenti/fenxiti", "0.8", "daily", today),
        ...Array.from({ length: 17 }, (_, i) => 2026 - i).map(y => u(`${base}/zhenti/${y}`, y >= 2023 ? "0.8" : "0.7", "yearly")),
        ...kps.results.map(k => u(`${base}/zhenti/kaodian/${encodeURIComponent(k.kp_name)}`, "0.6", "monthly")),
        ...Object.keys(FX_SUBJECT_SLUGS).map(k => u(`${base}/zhenti/fenxiti/kemu/${k}`, "0.7", "monthly")),
        ...Object.keys(FX_SUBJECT_SLUGS).map(k => u(`${base}/zhenti/kemu/${k}`, "0.7", "monthly")),
        ...Array.from({ length: 17 }, (_, i) => 2026 - i).map(y => u(`${base}/zhenti/fenxiti/${y}`, "0.7", "yearly")),
        ...fxs.results.map(s => u(`${base}/zhenti/fenxiti/${s.year}-${s.seq}`, "0.6", "monthly")),
        ...(await env.DB.prepare("SELECT year, seq FROM real_questions WHERE third_party_material=0 ORDER BY year DESC, seq").all()).results.map(r => u(`${base}/zhenti/${r.year}/${r.seq}`, "0.5", "yearly")),
      ];
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}\n</urlset>`, {
        headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" }
      });
    }
    if (!p.startsWith("/api/")) {
      const res = await env.ASSETS.fetch(request);
      const h = new Headers(res.headers);
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) h.set(k, v);
      h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      return new Response(res.body, { status: res.status, headers: h });
    }

    try {
      // 生成任务自链入口（SELF binding 调用；仅推进已存在的生成状态，genlock 防并发）
      if (p === "/api/gen-tick") {
        const pid = parseInt(url.searchParams.get("paper"));
        if (Number.isInteger(pid) && pid > 0) ctx.waitUntil(genStep(env, pid, ctx));
        return json({ ok: true });
      }

      // --- auth ---
      if (p === "/api/register" && request.method === "POST") {
        if (!(await rateLimit(env, `reg:${clientIp(request)}`, 5, 3600))) return err(429, "注册过于频繁，请稍后再试");
        const { email, password, invite, src, si } = await request.json();
        if (!email || email.length > 254 || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return err(400, "邮箱格式不正确");
        if (!password || password.length < 6) return err(400, "密码至少 6 位");
        const exists = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email.toLowerCase()).first();
        if (exists) return err(409, "该邮箱已注册，请直接登录");
        // 邀请码：Z+邀请人 id 的 36 进制；有效则双方各得 3 天会员，邀请人奖励上限 10 位
        let inviter = null;
        if (typeof invite === "string" && /^Z[0-9a-z]{1,8}$/i.test(invite)) {
          const iid = parseInt(invite.slice(1), 36);
          if (Number.isInteger(iid) && iid > 0) inviter = await env.DB.prepare("SELECT id,plan_expires_at FROM users WHERE id=?").bind(iid).first();
        }
        const ip = clientIp(request);
        // 反作弊：同一 IP 已为该邀请人注册过账号，或该邀请人当日已获 3 次奖励，则本次不发奖励
        if (inviter) {
          const abuse = await env.DB.prepare(
            "SELECT (SELECT COUNT(*) FROM users WHERE invited_by=? AND reg_ip=?) AS same_ip, (SELECT COUNT(*) FROM users WHERE invited_by=? AND date(created_at)=date('now')) AS today"
          ).bind(inviter.id, ip, inviter.id).first();
          if (abuse.same_ip > 0 || abuse.today >= 3) inviter = null;
        }
        const { hash, salt } = await hashPassword(password);
        const r = await env.DB.prepare("INSERT INTO users (email,pw_hash,pw_salt,invited_by,reg_ip,reg_src) VALUES (?,?,?,?,?,?)").bind(email.toLowerCase(), hash, salt, inviter ? inviter.id : null, ip, src === "seo" ? "seo" : "").run();
        const uid = r.meta.last_row_id;
        let invite_bonus = false;
        if (inviter) {
          const ext = (row) => {
            const base = (row && row.plan_expires_at && new Date(row.plan_expires_at) > new Date()) ? new Date(row.plan_expires_at) : new Date();
            return new Date(base.getTime() + 3 * 86400000).toISOString();
          };
          const cnt = await env.DB.prepare("SELECT COUNT(*) AS c FROM users WHERE invited_by=?").bind(inviter.id).first();
          const batch = [env.DB.prepare("UPDATE users SET plan='pro', plan_expires_at=? WHERE id=?").bind(ext(null), uid)];
          if (cnt.c <= 10) batch.push(env.DB.prepare("UPDATE users SET plan='pro', plan_expires_at=? WHERE id=?").bind(ext(inviter), inviter.id));
          await env.DB.batch(batch);
          invite_bonus = true;
        }
        if (src === "seo") ctx.waitUntil((async () => {
          const d = new Date().toISOString().slice(0, 10);
          const keys = ["seoreg:" + d];
          if (["realsubj", "realrand", "realyear", "realsearch", "realbrowse", "real"].includes(si)) keys.push("seoregint:" + si + ":" + d);
          for (const k of keys) {
            const n = parseInt(await env.RATELIMIT.get(k) || "0", 10) + 1;
            await env.RATELIMIT.put(k, String(n), { expirationTtl: 86400 * 35 });
          }
        })().catch(() => {}));
        const token = await signJWT({ uid, exp: Math.floor(Date.now() / 1000) + 30 * 86400 }, env.JWT_SECRET);
        return json({ token, invite_bonus, user: { id: uid, email: email.toLowerCase(), plan: invite_bonus ? "pro" : "free" } });
      }
      if (p === "/api/login" && request.method === "POST") {
        if (!(await rateLimit(env, `login:${clientIp(request)}`, 20, 600))) return err(429, "尝试过于频繁，请 10 分钟后再试");
        const { email, password } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind((email || "").toLowerCase()).first();
        if (!user) return err(401, "邮箱或密码错误");
        const { hash } = await hashPassword(password || "", user.pw_salt);
        if (hash !== user.pw_hash) return err(401, "邮箱或密码错误");
        const token = await signJWT({ uid: user.id, exp: Math.floor(Date.now() / 1000) + 30 * 86400 }, env.JWT_SECRET);
        return json({ token, user: { id: user.id, email: user.email, plan: user.plan, plan_expires_at: user.plan_expires_at } });
      }

      // --- 找回密码 ---
      if (p === "/api/forgot" && request.method === "POST") {
        if (!env.RESEND_KEY) return err(503, "找回密码功能即将开通，暂时请联系管理员重置");
        if (!(await rateLimit(env, `forgot:${clientIp(request)}`, 5, 3600))) return err(429, "请求过于频繁，请稍后再试");
        const { email } = await request.json().catch(() => ({}));
        const u = typeof email === "string" ? await env.DB.prepare("SELECT id,email FROM users WHERE email=?").bind(email.toLowerCase()).first() : null;
        if (u) {
          const raw = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, "0")).join("");
          const th = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)))].map(b => b.toString(16).padStart(2, "0")).join("");
          await env.DB.prepare("INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,datetime('now','+30 minutes'))").bind(u.id, th).run();
          const link = `https://zhenti.zalize.com/app#reset-${raw}`;
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.RESEND_KEY}` },
            body: JSON.stringify({
              from: env.MAIL_FROM || "真题工坊 <noreply@zalize.com>",
              to: [u.email],
              subject: "真题工坊 · 重置密码",
              html: `<p>你请求了重置真题工坊的登录密码。点击下面的链接设置新密码（30 分钟内有效，仅可使用一次）：</p><p><a href="${link}">${link}</a></p><p>如果不是你本人操作，请忽略本邮件，你的密码不会改变。</p>`,
            }),
          }).catch(() => {});
        }
        return json({ ok: true }); // 无论邮箱是否存在都返回成功，防止撞库
      }
      if (p === "/api/reset" && request.method === "POST") {
        if (!(await rateLimit(env, `reset:${clientIp(request)}`, 10, 3600))) return err(429, "请求过于频繁，请稍后再试");
        const { token: raw, password } = await request.json().catch(() => ({}));
        if (!password || password.length < 6) return err(400, "密码至少 6 位");
        if (typeof raw !== "string" || !/^[0-9a-f]{48}$/.test(raw)) return err(400, "重置链接无效或已过期");
        const th = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)))].map(b => b.toString(16).padStart(2, "0")).join("");
        const row = await env.DB.prepare("SELECT id,user_id FROM password_resets WHERE token_hash=? AND used=0 AND expires_at > datetime('now')").bind(th).first();
        if (!row) return err(400, "重置链接无效或已过期");
        const { hash, salt } = await hashPassword(password);
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET pw_hash=?, pw_salt=? WHERE id=?").bind(hash, salt, row.user_id),
          env.DB.prepare("UPDATE password_resets SET used=1 WHERE id=?").bind(row.id),
        ]);
        return json({ ok: true });
      }

      // 支付异步通知（平台服务器调用，无需登录态）
      if (p === "/api/pay/notify") {
        if (!env.ZPAY_KEY) return new Response("fail", { status: 400 });
        const q = Object.fromEntries(url.searchParams.entries());
        const sign = await epaySign(q, env.ZPAY_KEY);
        if (sign !== q.sign || q.trade_status !== "TRADE_SUCCESS") return new Response("fail", { status: 400 });
        const order = await env.DB.prepare("SELECT * FROM orders WHERE out_trade_no=?").bind(q.out_trade_no).first();
        if (!order) return new Response("fail", { status: 404 });
        if (order.status !== "paid" && q.money === order.amount) {
          const plan = PLANS[order.plan];
          const u = await env.DB.prepare("SELECT plan_expires_at FROM users WHERE id=?").bind(order.user_id).first();
          const base = (u && u.plan_expires_at && new Date(u.plan_expires_at) > new Date()) ? new Date(u.plan_expires_at) : new Date();
          const expires = new Date(base.getTime() + plan.days * 86400000).toISOString();
          await env.DB.batch([
            env.DB.prepare("UPDATE orders SET status='paid', paid_at=datetime('now') WHERE out_trade_no=?").bind(q.out_trade_no),
            env.DB.prepare("UPDATE users SET plan='pro', plan_expires_at=? WHERE id=?").bind(expires, order.user_id),
          ]);
        }
        return new Response("success");
      }

      // 运营后台（需 ADMIN_KEY：Bearer / X-Admin-Key 均可）
      if (p.startsWith("/api/admin/")) {
        const auth = request.headers.get("Authorization") || "";
        const key = (auth.startsWith("Bearer ") ? auth.slice(7) : "") ||
          request.headers.get("X-Admin-Key") || url.searchParams.get("key") || "";
        if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
          await rateLimit(env, `adminfail:${clientIp(request)}`, 20, 600);
          return err(401, "无权限");
        }
        if (!(await rateLimit(env, `admin:${clientIp(request)}`, 120, 60))) return err(429, "操作过于频繁，请稍后再试");

        // ① 数据看板：核心指标 + 近 14 天日趋势
        if (p === "/api/admin/stats" && request.method === "GET") {
          const totals = await env.DB.prepare(
            `SELECT
               (SELECT COUNT(*) FROM users) AS users_total,
               (SELECT COUNT(*) FROM users WHERE date(created_at)=date('now')) AS users_today,
               (SELECT COUNT(DISTINCT user_id) FROM attempts WHERE date(created_at)=date('now')) AS active_today,
               (SELECT COUNT(*) FROM papers WHERE date(created_at)=date('now')) AS papers_today,
               (SELECT COUNT(*) FROM papers WHERE date(created_at)=date('now') AND status='failed') AS papers_failed_today,
               (SELECT COUNT(*) FROM papers WHERE created_at>=datetime('now','-14 days')) AS papers_14d,
               (SELECT COUNT(*) FROM papers WHERE created_at>=datetime('now','-14 days') AND status='failed') AS papers_failed_14d,
               (SELECT COUNT(*) FROM attempts WHERE date(created_at)=date('now')) AS attempts_today,
               (SELECT COUNT(*) FROM attempts) AS attempts_total,
               (SELECT COUNT(*) FROM question_flags) AS flags_open,
               (SELECT COUNT(DISTINCT user_id) FROM subj_memo) AS subjmemo_users,
               (SELECT COUNT(*) FROM subj_memo) AS subjmemo_total,
               (SELECT COUNT(*) FROM subj_memo WHERE date(created_at)=date('now')) AS subjmemo_today,
               (SELECT COUNT(*) FROM subj_memo WHERE last_reviewed_at IS NOT NULL) AS subjrev_total,
               (SELECT COUNT(DISTINCT user_id) FROM subj_memo WHERE last_reviewed_at IS NOT NULL) AS subjrev_users,
               (SELECT COUNT(*) FROM subj_hit) AS subjhit_total,
               (SELECT COUNT(DISTINCT user_id) FROM subj_hit) AS subjhit_users,
               (SELECT COUNT(DISTINCT user_id) FROM real_favs) AS realfav_users,
               (SELECT COUNT(*) FROM real_favs) AS realfav_total,
               (SELECT COUNT(*) FROM real_favs WHERE date(created_at)=date('now')) AS realfav_today,
               (SELECT COUNT(*) FROM papers WHERE title LIKE '真题收藏自测卷%') AS favpaper_total,
               (SELECT COUNT(*) FROM papers WHERE title LIKE '真题弱项组卷%') AS weakpaper_total,
               (SELECT COUNT(DISTINCT user_id) FROM papers WHERE title LIKE '真题弱项组卷%') AS weakpaper_users,
               (SELECT COUNT(*) FROM papers WHERE title LIKE '真题特训%') AS kppaper_total,
               (SELECT COUNT(*) FROM papers WHERE title LIKE '真题乱序快刷%') AS randpaper_total,
               (SELECT COUNT(DISTINCT user_id) FROM papers WHERE title LIKE '真题乱序快刷%') AS randpaper_users,
               (SELECT COUNT(*) FROM users WHERE email LIKE '%@test.com' OR email LIKE 'qa%@%' OR email LIKE 'ux%@%' OR email LIKE 'design%@%') AS test_users,
               (SELECT COUNT(*) FROM users WHERE reg_src='seo') AS seo_users,
               (SELECT COUNT(DISTINCT u.id) FROM users u JOIN attempts a ON a.user_id=u.id WHERE u.reg_src='seo') AS seo_users_active`).first();
          const [regs, actives, papers, fails, atts] = (await env.DB.batch([
            env.DB.prepare("SELECT date(created_at) AS d, COUNT(*) AS n FROM users WHERE created_at>=date('now','-13 days') GROUP BY d"),
            env.DB.prepare("SELECT date(created_at) AS d, COUNT(DISTINCT user_id) AS n FROM attempts WHERE created_at>=date('now','-13 days') GROUP BY d"),
            env.DB.prepare("SELECT date(created_at) AS d, COUNT(*) AS n FROM papers WHERE created_at>=date('now','-13 days') GROUP BY d"),
            env.DB.prepare("SELECT date(created_at) AS d, COUNT(*) AS n FROM papers WHERE created_at>=date('now','-13 days') AND status='failed' GROUP BY d"),
            env.DB.prepare("SELECT date(created_at) AS d, COUNT(*) AS n FROM attempts WHERE created_at>=date('now','-13 days') GROUP BY d"),
          ])).map(r => Object.fromEntries(r.results.map(x => [x.d, x.n])));
          const trend = [];
          for (let i = 13; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
            trend.push({ date: d, registers: regs[d] || 0, active_users: actives[d] || 0, papers: papers[d] || 0, papers_failed: fails[d] || 0, attempts: atts[d] || 0 });
          }
          // 留存：近 14 天（截至昨天）注册用户的次日留存与 7 日内留存
          const ret = await env.DB.prepare(
            `SELECT COUNT(*) AS cohort,
               SUM(EXISTS(SELECT 1 FROM attempts a WHERE a.user_id=u.id AND date(a.created_at)=date(u.created_at,'+1 day'))) AS d1,
               SUM(EXISTS(SELECT 1 FROM attempts a WHERE a.user_id=u.id AND date(a.created_at)>date(u.created_at) AND date(a.created_at)<=date(u.created_at,'+7 days'))) AS d7
             FROM users u WHERE u.created_at>=date('now','-14 days') AND date(u.created_at)<date('now')`).first();
          const retention = {
            cohort: ret.cohort || 0,
            d1_pct: ret.cohort ? Math.round((ret.d1 || 0) * 100 / ret.cohort) : null,
            d7_pct: ret.cohort ? Math.round((ret.d7 || 0) * 100 / ret.cohort) : null,
          };
          return json({ totals, trend, retention });
        }

        // ② 反馈工单
        if (p === "/api/admin/flags" && request.method === "GET") {
          const rows = await env.DB.prepare(
            `SELECT f.id, f.question_id, f.reason, f.detail, f.created_at, f.user_id,
                    q.stem, q.answer, q.analysis, q.knowledge_point, q.qtype
             FROM question_flags f JOIN questions q ON q.id=f.question_id
             ORDER BY f.id DESC LIMIT 200`).all();
          return json({ flags: rows.results });
        }
        {
          const dm = p.match(/^\/api\/admin\/flags\/(\d+)$/);
          if (dm && request.method === "DELETE") {
            await env.DB.prepare("DELETE FROM question_flags WHERE id=?").bind(+dm[1]).run();
            return json({ ok: true });
          }
        }

        // ②a 热门搜索词（近 30 天，KV 计数）
        if (p === "/api/admin/searches" && request.method === "GET") {
          const l = await env.RATELIMIT.list({ prefix: "sq:", limit: 500 });
          const items = await Promise.all(l.keys.map(async k => ({ q: k.name.slice(3), n: parseInt(await env.RATELIMIT.get(k.name) || "0", 10) })));
          items.sort((a, b) => b.n - a.n);
          const lp = await env.RATELIMIT.list({ prefix: "sqp:", limit: 500 });
          const pitems = await Promise.all(lp.keys.map(async k => ({ q: k.name.slice(4), n: parseInt(await env.RATELIMIT.get(k.name) || "0", 10) })));
          pitems.sort((a, b) => b.n - a.n);
          // 近 7 日公开真题库 PV
          const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)).reverse();
          const pv = await Promise.all(days.map(async d => ({
            d,
            n: parseInt(await env.RATELIMIT.get("pv:zhenti:" + d) || "0", 10),
            yr: parseInt(await env.RATELIMIT.get("pv:zt-yr:" + d) || "0", 10),
            kp: parseInt(await env.RATELIMIT.get("pv:zt-kp:" + d) || "0", 10),
            ix: parseInt(await env.RATELIMIT.get("pv:zt-ix:" + d) || "0", 10),
            fx: parseInt(await env.RATELIMIT.get("pv:zt-fx:" + d) || "0", 10),
            fxd: parseInt(await env.RATELIMIT.get("pv:zt-fxd:" + d) || "0", 10),
            fxk: parseInt(await env.RATELIMIT.get("pv:zt-fxk:" + d) || "0", 10),
            fxy: parseInt(await env.RATELIMIT.get("pv:zt-fxy:" + d) || "0", 10),
            qd: parseInt(await env.RATELIMIT.get("pv:zt-qd:" + d) || "0", 10),
            se: parseInt(await env.RATELIMIT.get("pv:zt-se:" + d) || "0", 10),
          })));
          const dr = await Promise.all(days.map(async d => ({
            d,
            app: parseInt(await env.RATELIMIT.get("dr:app:" + d) || "0", 10),
            pub: parseInt(await env.RATELIMIT.get("dr:pub:" + d) || "0", 10),
            act: parseInt(await env.RATELIMIT.get("dr:act:" + d) || "0", 10),
            y26: parseInt(await env.RATELIMIT.get("dr:y26:" + d) || "0", 10),
            seoreg: parseInt(await env.RATELIMIT.get("seoreg:" + d) || "0", 10),
          })));
          const ints = ["realsubj", "realrand", "realyear", "realsearch", "realbrowse", "real"];
          const si = {};
          for (const t of ints) {
            let n = 0;
            for (const d of days) n += parseInt(await env.RATELIMIT.get("seoregint:" + t + ":" + d) || "0", 10);
            if (n) si[t] = n;
          }
          return json({ searches: items.slice(0, 30), pub_searches: pitems.slice(0, 30), zhenti_pv: pv, daily_reveal: dr, seo_intents_7d: si });
        }

        // ②b 真题低置信考点人工复核
        if (p === "/api/admin/realkp" && request.method === "GET") {
          const rows = await env.DB.prepare(
            `SELECT id, year, seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, subject, kp_name
             FROM real_questions WHERE kp_confidence<1 ORDER BY year DESC, seq LIMIT 300`).all();
          const kps = LIBRARY.map(l => ({ subject: l.subject, names: l.sections.flatMap(s => s.kps.map(k => k.name)) }));
          return json({ questions: rows.results, kps });
        }
        if (p === "/api/admin/realkp" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const id = +b.id, name = (b.kp_name || "").trim();
          if (!id) return err(400, "参数无效");
          if (name) {
            const lib = LIBRARY.find(l => l.sections.some(s => s.kps.some(k => k.name === name)));
            if (!lib) return err(400, "考点不在官方清单中");
            await env.DB.prepare("UPDATE real_questions SET kp_name=?, subject=?, kp_confidence=1 WHERE id=?")
              .bind(name, lib.subject, id).run();
          } else {
            await env.DB.prepare("UPDATE real_questions SET kp_confidence=1 WHERE id=?").bind(id).run();
          }
          return json({ ok: true });
        }

        // ②c 分析题低置信考点人工复核
        if (p === "/api/admin/subjkp" && request.method === "GET") {
          const rows = await env.DB.prepare(
            `SELECT id, year, seq, subject, stem, kp_name
             FROM real_subjective WHERE kp_confidence<1 ORDER BY year DESC, seq LIMIT 100`).all();
          const kps = LIBRARY.map(l => ({ subject: l.subject, names: l.sections.flatMap(s => s.kps.map(k => k.name)) }));
          return json({ questions: rows.results, kps });
        }
        if (p === "/api/admin/subjkp" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const id = +b.id, name = (b.kp_name || "").trim();
          if (!id) return err(400, "参数无效");
          if (name) {
            const lib = LIBRARY.find(l => l.sections.some(s => s.kps.some(k => k.name === name)));
            if (!lib) return err(400, "考点不在官方清单中");
            await env.DB.prepare("UPDATE real_subjective SET kp_name=?, subject=?, kp_confidence=1 WHERE id=?")
              .bind(name, lib.subject, id).run();
          } else {
            await env.DB.prepare("UPDATE real_subjective SET kp_confidence=1 WHERE id=?").bind(id).run();
          }
          return json({ ok: true });
        }

        // ③ 兑换码管理
        if (p === "/api/admin/codes" && request.method === "GET") {
          const status = url.searchParams.get("status") || "";
          const cond = status === "unused" ? "WHERE c.used_by IS NULL" : status === "used" ? "WHERE c.used_by IS NOT NULL" : "";
          const rows = await env.DB.prepare(
            `SELECT c.code, c.plan, c.days, c.used_by, c.used_at, u.email AS used_by_email
             FROM redeem_codes c LEFT JOIN users u ON u.id=c.used_by ${cond}
             ORDER BY c.used_at IS NOT NULL, c.rowid DESC LIMIT 500`).all();
          return json({ codes: rows.results });
        }
        if (p === "/api/admin/codes" && request.method === "POST") {
          const { days, count } = await request.json().catch(() => ({}));
          const d = parseInt(days), n = parseInt(count);
          if (!Number.isInteger(d) || d < 1 || d > 3650) return err(400, "days 应为 1-3650 的整数");
          if (!Number.isInteger(n) || n < 1 || n > 100) return err(400, "count 应为 1-100 的整数");
          const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
          const seg = () => [...crypto.getRandomValues(new Uint8Array(4))].map(b => alphabet[b % 32]).join("");
          const codes = Array.from({ length: n }, () => `ZTGF-${seg()}-${seg()}`);
          await env.DB.batch(codes.map(c =>
            env.DB.prepare("INSERT INTO redeem_codes (code,plan,days) VALUES (?,?,?)").bind(c, "pro", d)));
          return json({ codes: codes.map(c => ({ code: c, plan: "pro", days: d })) });
        }
        {
          const cm = p.match(/^\/api\/admin\/codes\/([A-Z0-9-]+)$/);
          if (cm && request.method === "DELETE") {
            const r = await env.DB.prepare("DELETE FROM redeem_codes WHERE code=? AND used_by IS NULL").bind(cm[1]).run();
            if (!r.meta.changes) return err(400, "兑换码不存在或已被使用，无法作废");
            return json({ ok: true });
          }
        }

        // ④ 用户查询 + 手动延长会员
        if (p === "/api/admin/user" && request.method === "GET") {
          const email = (url.searchParams.get("email") || "").trim().toLowerCase();
          if (!email) return err(400, "缺少 email 参数");
          const u = await env.DB.prepare(
            "SELECT id,email,plan,plan_expires_at,invited_by,created_at FROM users WHERE email=?").bind(email).first();
          if (!u) return err(404, "未找到该用户");
          const agg = await env.DB.prepare(
            `SELECT
               (SELECT COUNT(*) FROM users WHERE invited_by=?1) AS invited_count,
               (SELECT COUNT(*) FROM papers WHERE user_id=?1) AS papers_total,
               (SELECT COUNT(*) FROM papers WHERE user_id=?1 AND date(created_at)=date('now') AND status!='failed') AS papers_today,
               (SELECT COUNT(*) FROM attempts WHERE user_id=?1) AS attempts_total,
               (SELECT COUNT(*) FROM wrong_book WHERE user_id=?1) AS wrong_count`).bind(u.id).first();
          const attempts = await env.DB.prepare(
            `SELECT a.id, a.score, a.total, a.duration_sec, a.created_at, pp.title AS paper_title
             FROM attempts a LEFT JOIN papers pp ON pp.id=a.paper_id
             WHERE a.user_id=? ORDER BY a.id DESC LIMIT 5`).bind(u.id).all();
          const pro = u.plan === "pro" && u.plan_expires_at && new Date(u.plan_expires_at) > new Date();
          return json({ user: u, pro, ...agg, recent_attempts: attempts.results });
        }
        if (p === "/api/admin/user/extend" && request.method === "POST") {
          const { user_id, days } = await request.json().catch(() => ({}));
          const uid = parseInt(user_id), d = parseInt(days);
          if (!Number.isInteger(uid) || uid < 1) return err(400, "user_id 无效");
          if (!Number.isInteger(d) || d < 1 || d > 3650) return err(400, "days 应为 1-3650 的整数");
          const u = await env.DB.prepare("SELECT id,plan_expires_at FROM users WHERE id=?").bind(uid).first();
          if (!u) return err(404, "未找到该用户");
          const base = (u.plan_expires_at && new Date(u.plan_expires_at) > new Date()) ? new Date(u.plan_expires_at) : new Date();
          const expires = new Date(base.getTime() + d * 86400000).toISOString();
          await env.DB.prepare("UPDATE users SET plan='pro', plan_expires_at=? WHERE id=?").bind(expires, uid).run();
          return json({ ok: true, plan: "pro", plan_expires_at: expires });
        }

        return err(404, "接口不存在");
      }

      const user = await getUser(request, env);
      if (!user) return err(401, "请先登录");
      if (!(await rateLimit(env, `u:${user.id}`, 600, 300))) return err(429, "操作过于频繁，请稍后再试");

      // 创建支付订单 → 返回收银台跳转 URL
      if (p === "/api/pay/create" && request.method === "POST") {
        if (!env.ZPAY_PID || !env.ZPAY_KEY) return err(503, "在线支付暂未开通，请先使用兑换码");
        const { plan, channel } = await request.json();
        const pl = PLANS[plan];
        if (!pl) return err(400, "无效的套餐");
        const payType = channel === "wxpay" ? "wxpay" : "alipay";
        const outTradeNo = `ZT${Date.now()}${user.id}`;
        await env.DB.prepare("INSERT INTO orders (out_trade_no,user_id,plan,amount) VALUES (?,?,?,?)")
          .bind(outTradeNo, user.id, plan, pl.amount).run();
        const gateway = env.ZPAY_GATEWAY || "https://z-pay.cn";
        const params = {
          pid: env.ZPAY_PID, type: payType, out_trade_no: outTradeNo,
          notify_url: `${url.origin}/api/pay/notify`,
          return_url: `${url.origin}/app.html`,
          name: `真题工坊·${pl.name}`, money: pl.amount, sign_type: "MD5",
        };
        params.sign = await epaySign(params, env.ZPAY_KEY);
        const qs2 = new URLSearchParams(params).toString();
        return json({ pay_url: `${gateway}/submit.php?${qs2}`, out_trade_no: outTradeNo });
      }
      if (p === "/api/pay/status" && request.method === "GET") {
        const no = url.searchParams.get("out_trade_no") || "";
        const order = await env.DB.prepare("SELECT status FROM orders WHERE out_trade_no=? AND user_id=?").bind(no, user.id).first();
        return json({ status: order ? order.status : "unknown" });
      }

      if (p === "/api/me") {
        if (request.method !== "GET") return err(405, "方法不允许");
        const pro = isPro(user);
        let quota = null;
        if (!pro) {
          const today = new Date().toISOString().slice(0, 10);
          const usedN = await env.DB.prepare("SELECT COUNT(*) AS c FROM papers WHERE user_id=? AND created_at>=? AND status!='failed' AND material_id>0 AND title NOT LIKE '%快练卷'").bind(user.id, today).first();
          const usedQ = await env.DB.prepare("SELECT COUNT(*) AS c FROM papers WHERE user_id=? AND created_at>=? AND status!='failed' AND material_id>0 AND title LIKE '%快练卷'").bind(user.id, today).first();
          quota = { paper_left: Math.max(0, 1 - usedN.c), quick_left: Math.max(0, 1 - usedQ.c) };
        }
        const invitedCnt = await env.DB.prepare("SELECT COUNT(*) AS c FROM users WHERE invited_by=?").bind(user.id).first();
        const invite_code = "Z" + user.id.toString(36).toUpperCase();
        return json({ user, pro, quota, invite_code, invited_count: invitedCnt.c, pay_enabled: !!(env.ZPAY_PID && env.ZPAY_KEY) });
      }

      if (p === "/api/password" && request.method === "PUT") {
        if (!(await rateLimit(env, `pwchg:${user.id}`, 5, 3600))) return err(429, "尝试过于频繁，请稍后再试");
        const { old_password, new_password } = await request.json();
        if (typeof new_password !== "string" || new_password.length < 6) return err(400, "新密码至少 6 位");
        const row = await env.DB.prepare("SELECT pw_hash,pw_salt FROM users WHERE id=?").bind(user.id).first();
        const { hash: oldHash } = await hashPassword(old_password || "", row.pw_salt);
        if (oldHash !== row.pw_hash) return err(401, "当前密码错误");
        const { hash, salt } = await hashPassword(new_password);
        await env.DB.prepare("UPDATE users SET pw_hash=?, pw_salt=? WHERE id=?").bind(hash, salt, user.id).run();
        return json({ ok: true });
      }

      if (p === "/api/redeem" && request.method === "POST") {
        const { code } = await request.json();
        if (typeof code !== "string" || !code.trim()) return err(400, "参数错误：兑换码应为字符串");
        const row = await env.DB.prepare("SELECT * FROM redeem_codes WHERE code=? AND used_by IS NULL").bind(code.trim()).first();
        if (!row) return err(400, "兑换码无效或已被使用");
        const expires = new Date(Date.now() + row.days * 86400000).toISOString();
        await env.DB.batch([
          env.DB.prepare("UPDATE redeem_codes SET used_by=?, used_at=datetime('now') WHERE code=?").bind(user.id, row.code),
          env.DB.prepare("UPDATE users SET plan='pro', plan_expires_at=? WHERE id=?").bind(expires, user.id),
        ]);
        return json({ ok: true, plan: "pro", plan_expires_at: expires });
      }

      // --- materials ---
      if (p === "/api/materials" && request.method === "POST") {
        const { title, content } = await request.json();
        if (title != null && typeof title !== "string") return err(400, "参数错误：标题应为字符串");
        if (title && title.length > 100) return err(400, "标题过长（100 字以内）");
        if (typeof content !== "string" || content.length < 200) return err(400, "资料内容太短（至少 200 字），请粘贴完整的讲义/笔记");
        if (content.length > 100000) return err(400, "资料过长，请分段上传（单份 10 万字以内）");
        if (!(await rateLimit(env, `mat:${user.id}`, isPro(user) ? 30 : 5, 86400)))
          return err(429, "今日上传次数已达上限，请明天再试");
        const points = await extractKnowledgePoints(env, content);
        if (!points.length) return err(422, "未从资料中识别到可命题的考点，请更换为成段的讲义/笔记内容");
        let finalTitle = (title || "").trim();
        if (!finalTitle) {
          const secs = [...new Set(points.map(k => k.section).filter(Boolean))];
          finalTitle = secs.length ? secs.slice(0, 2).join("·") : (points[0] ? `${points[0].name} 等考点` : "未命名资料");
        }
        const r = await env.DB.prepare("INSERT INTO materials (user_id,title,content) VALUES (?,?,?)")
          .bind(user.id, finalTitle.slice(0, 60), content).run();
        const materialId = r.meta.last_row_id;
        for (const k of points) {
          await env.DB.prepare("INSERT INTO knowledge_points (material_id,name,section) VALUES (?,?,?)")
            .bind(materialId, k.name, k.section).run();
        }
        return json({ id: materialId, knowledge_points: points });
      }
      if (p === "/api/materials" && request.method === "GET") {
        const rows = await env.DB.prepare("SELECT id,title,created_at,length(content) AS size FROM materials WHERE user_id=? ORDER BY id DESC").bind(user.id).all();
        return json({ materials: rows.results });
      }
      let m = p.match(/^\/api\/materials\/(\d+)$/);
      if (m && request.method === "GET") {
        const mat = await env.DB.prepare("SELECT id,title,created_at FROM materials WHERE id=? AND user_id=?").bind(m[1], user.id).first();
        if (!mat) return err(404, "资料不存在");
        const kps = await env.DB.prepare("SELECT id,name,section,selected FROM knowledge_points WHERE material_id=?").bind(m[1]).all();
        return json({ material: mat, knowledge_points: kps.results });
      }

      // 累计考点覆盖：该资料下已出过题的考点 / 全部考点
      m = p.match(/^\/api\/materials\/(\d+)\/coverage$/);
      if (m && request.method === "GET") {
        const mat = await env.DB.prepare("SELECT id FROM materials WHERE id=? AND user_id=?").bind(m[1], user.id).first();
        if (!mat) return err(404, "资料不存在");
        const all = await env.DB.prepare("SELECT name FROM knowledge_points WHERE material_id=?").bind(m[1]).all();
        const done = await env.DB.prepare(
          "SELECT DISTINCT q.knowledge_point AS name FROM questions q JOIN papers pp ON q.paper_id=pp.id WHERE pp.user_id=?")
          .bind(user.id).all();
        const doneSet = new Set(done.results.map(r => r.name));
        return json({
          total: all.results.length,
          covered: all.results.filter(r => doneSet.has(r.name)).length,
          uncovered: all.results.filter(r => !doneSet.has(r.name)).map(r => r.name),
        });
      }

      // 每日一卷：自动从未考过的考点组卷（全覆盖后回到全部考点随机）
      if (p === "/api/papers/daily" && request.method === "POST") {
        const dailyBody = await request.json().catch(() => ({}));
        const dailyQuick = dailyBody && dailyBody.quick === true;
        if (!isPro(user)) {
          const today = new Date().toISOString().slice(0, 10);
          const usedN = await env.DB.prepare("SELECT COUNT(*) AS c FROM papers WHERE user_id=? AND created_at>=? AND status!='failed' AND material_id>0 AND title NOT LIKE '%快练卷'").bind(user.id, today).first();
          const usedQ = await env.DB.prepare("SELECT COUNT(*) AS c FROM papers WHERE user_id=? AND created_at>=? AND status!='failed' AND material_id>0 AND title LIKE '%快练卷'").bind(user.id, today).first();
          if (dailyQuick && usedQ.c >= 1) return err(402, usedN.c >= 1 ? "今天的免费额度（1 卷 + 1 快练）已用完，明天再来或升级会员解锁无限出卷" : "今日快练额度已用完，还可生成 1 份模拟卷。升级会员解锁无限出卷");
          if (!dailyQuick && usedN.c >= 1) return err(402, usedQ.c >= 1 ? "今天的免费额度（1 卷 + 1 快练）已用完，明天再来或升级会员解锁无限出卷" : "今日模拟卷额度已用完，还可生成 1 份 5 题快练。升级会员解锁无限出卷");
        }
        const matRows = await env.DB.prepare("SELECT id,title,content FROM materials WHERE user_id=? ORDER BY id DESC LIMIT 10").bind(user.id).all();
        if (!matRows.results.length) return err(400, "请先上传复习资料");
        let best = null, bestKps = [], bestAll = [], bestUncov = -1;
        for (const mt of matRows.results) {
          const kpRows = await env.DB.prepare("SELECT id,name,section FROM knowledge_points WHERE material_id=? AND selected=1").bind(mt.id).all();
          if (!kpRows.results.length) continue;
          const cov = await env.DB.prepare(
            "SELECT DISTINCT q.knowledge_point AS name FROM questions q JOIN papers pp ON q.paper_id=pp.id WHERE pp.user_id=? AND EXISTS(SELECT 1 FROM attempts a WHERE a.paper_id=pp.id)")
            .bind(user.id).all();
          const covSet = new Set(cov.results.map(r => r.name));
          const un = kpRows.results.filter(k => !covSet.has(k.name));
          if (un.length > bestUncov) { best = mt; bestKps = un.length ? un : kpRows.results; bestAll = kpRows.results; bestUncov = un.length; }
        }
        if (!best) return err(400, "资料中没有可用考点，请先上传资料");
        // 未覆盖考点不足 5 个时，用已覆盖考点补足，避免同一考点重复出多题
        let pool = [...bestKps];
        if (pool.length < 5) {
          const names = new Set(pool.map(k => k.name));
          pool = pool.concat(bestAll.filter(k => !names.has(k.name)).sort(() => Math.random() - 0.5).slice(0, 5 - pool.length));
        }
        const n = dailyQuick ? 5 : Math.min(10, Math.max(5, pool.length));
        const kps = pool.sort(() => Math.random() - 0.5).slice(0, n);
        const r = await env.DB.prepare("INSERT INTO papers (user_id,material_id,title,status) VALUES (?,?,?,'generating')")
          .bind(user.id, best.id, `${best.title} · ${dailyQuick ? "每日快练卷" : "每日一卷"}`).run();
        const paperId = r.meta.last_row_id;
        await env.DB.prepare("INSERT INTO gen_state (paper_id,state,lock_until) VALUES (?,?,0)").bind(paperId, JSON.stringify({
          content: best.content.slice(0, 30000), count: n,
          perKp: Math.max(1, Math.ceil(n / kps.length)),
          queue: kps, allKps: kps, rounds: 0,
        })).run();
        ctx.waitUntil(genStep(env, paperId, ctx));
        return json({ id: paperId, status: "generating" });
      }

      // --- papers ---
      if (p === "/api/papers" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || !Number.isInteger(parseInt(body.material_id)) || isNaN(parseInt(body.material_id))) {
          return err(400, "参数错误：缺少 material_id");
        }
        const { material_id, count = 10, kp_ids, essay } = body;
        const cnt = parseInt(count);
        if (!Number.isInteger(cnt) || cnt < 5 || cnt > 20) return err(400, "题量需为 5-20 之间的整数");
        let n = cnt;
        if (!isPro(user)) n = Math.min(n, 10);
        const mat = await env.DB.prepare("SELECT * FROM materials WHERE id=? AND user_id=?").bind(material_id, user.id).first();
        if (!mat) return err(404, "资料不存在");
        // 免费额度：每天 1 份正卷 + 1 份 5 题快练卷
        const isQuick = n <= 5;
        if (!isPro(user)) {
          const today = new Date().toISOString().slice(0, 10);
          const used = await env.DB.prepare(
            `SELECT COUNT(*) AS c FROM papers WHERE user_id=? AND created_at>=? AND status!='failed' AND material_id>0 AND title ${isQuick ? "LIKE" : "NOT LIKE"} '%快练卷'`)
            .bind(user.id, today).first();
          if (used.c >= 1) {
            const other = await env.DB.prepare(
              `SELECT COUNT(*) AS c FROM papers WHERE user_id=? AND created_at>=? AND status!='failed' AND material_id>0 AND title ${isQuick ? "NOT LIKE" : "LIKE"} '%快练卷'`)
              .bind(user.id, today).first();
            if (other.c >= 1) return err(402, "今天的免费额度（1 卷 + 1 快练）已用完，明天再来或升级会员解锁无限出卷");
            return err(402, isQuick ? "今日快练额度已用完，还可生成 1 份模拟卷。升级会员解锁无限出卷" : "今日模拟卷额度已用完，还可生成 1 份 5 题快练。升级会员解锁无限出卷");
          }
        }
        let kpsQ = "SELECT id,name,section FROM knowledge_points WHERE material_id=? AND selected=1";
        const kpRows = await env.DB.prepare(kpsQ).bind(material_id).all();
        let kps = kpRows.results;
        if (Array.isArray(kp_ids) && kp_ids.length) kps = kps.filter(k => kp_ids.includes(k.id));
        if (!kps.length) return err(400, "请至少选择一个考点");
        // 随机取足够考点
        kps = kps.sort(() => Math.random() - 0.5).slice(0, n);
        const r = await env.DB.prepare("INSERT INTO papers (user_id,material_id,title,status) VALUES (?,?,?,'generating')")
          .bind(user.id, material_id, `${mat.title} · ${isQuick ? "快练卷" : "模拟卷"}`).run();
        const paperId = r.meta.last_row_id;
        await env.DB.prepare("INSERT INTO gen_state (paper_id,state,lock_until) VALUES (?,?,0)").bind(paperId, JSON.stringify({
          content: mat.content.slice(0, 30000), count: n,
          perKp: Math.max(1, Math.ceil(n / kps.length)),
          queue: kps, allKps: kps, rounds: 0,
          essay: !!essay && !isQuick,
        })).run();
        ctx.waitUntil(genStep(env, paperId, ctx));
        return json({ id: paperId, status: "generating" });
      }
      // 内置官方考点库
      if (p === "/api/library" && request.method === "GET") {
        return json({ library: LIBRARY.map(l => ({ subject: l.subject, sections: l.sections.map(s => ({ section: s.section, count: s.kps.length })) })) });
      }
      if (p === "/api/library/import" && request.method === "POST") {
        const { subject } = await request.json().catch(() => ({}));
        const lib = LIBRARY.find(l => l.subject === subject);
        if (!lib) return err(400, "科目不存在");
        const title = `官方考点库·${lib.subject}`;
        const exist = await env.DB.prepare("SELECT id FROM materials WHERE user_id=? AND title=?").bind(user.id, title).first();
        const content = lib.sections.map(s => s.kps.map(k => `【${s.section}】${k.name}：${k.desc}`).join("\n")).join("\n");
        if (exist) {
          // 考点库更新后，同步补充已导入资料缺少的新考点
          const have = await env.DB.prepare("SELECT name FROM knowledge_points WHERE material_id=?").bind(exist.id).all();
          const haveSet = new Set(have.results.map(r => r.name));
          const missing = [];
          for (const s of lib.sections) for (const k of s.kps) if (!haveSet.has(k.name)) missing.push({ ...k, section: s.section });
          if (missing.length) {
            await env.DB.batch(missing.map(k => env.DB.prepare(
              "INSERT INTO knowledge_points (material_id,name,section) VALUES (?,?,?)").bind(exist.id, k.name, k.section)));
            await env.DB.prepare("UPDATE materials SET content=? WHERE id=?").bind(content, exist.id).run();
          }
          return json({ id: exist.id, existed: true, added: missing.length });
        }
        const r = await env.DB.prepare("INSERT INTO materials (user_id,title,content) VALUES (?,?,?)").bind(user.id, title, content).run();
        const mid = r.meta.last_row_id;
        for (const s of lib.sections) for (const k of s.kps) {
          await env.DB.prepare("INSERT INTO knowledge_points (material_id,name,section) VALUES (?,?,?)").bind(mid, k.name, s.section).run();
        }
        return json({ id: mid });
      }
      // 按考点名定位可出题的考点：优先用户已导入资料，缺失时自动导入对应官方科目库（真题→AI 补练闭环）
      if (p === "/api/kpdrill" && request.method === "GET") {
        const name = (url.searchParams.get("name") || "").trim();
        if (!name || name.length > 60) return err(400, "考点名无效");
        const own = await env.DB.prepare(
          `SELECT k.id, k.material_id FROM knowledge_points k
           JOIN materials m ON k.material_id=m.id WHERE m.user_id=? AND k.name=? LIMIT 1`).bind(user.id, name).first();
        if (own) return json({ material_id: own.material_id, kp_id: own.id });
        const lib = LIBRARY.find(l => l.sections.some(s => s.kps.some(k => k.name === name)));
        if (!lib) return err(404, "未找到该考点");
        const title = `官方考点库·${lib.subject}`;
        const content = lib.sections.map(s => s.kps.map(k => `【${s.section}】${k.name}：${k.desc}`).join("\n")).join("\n");
        // 已导入过该科官方库但缺少此考点（库更新后新增）：补进原资料而非重复建库
        const oldMat = await env.DB.prepare("SELECT id FROM materials WHERE user_id=? AND title=? LIMIT 1").bind(user.id, title).first();
        if (oldMat) {
          const sec = lib.sections.find(s => s.kps.some(k => k.name === name));
          await env.DB.prepare("INSERT INTO knowledge_points (material_id,name,section) VALUES (?,?,?)").bind(oldMat.id, name, sec.section).run();
          await env.DB.prepare("UPDATE materials SET content=? WHERE id=?").bind(content, oldMat.id).run();
          const kp0 = await env.DB.prepare("SELECT id FROM knowledge_points WHERE material_id=? AND name=?").bind(oldMat.id, name).first();
          return json({ material_id: oldMat.id, kp_id: kp0.id, imported: lib.subject });
        }
        const r = await env.DB.prepare("INSERT INTO materials (user_id,title,content) VALUES (?,?,?)").bind(user.id, title, content).run();
        const mid = r.meta.last_row_id;
        await env.DB.batch(lib.sections.flatMap(s => s.kps.map(k => env.DB.prepare(
          "INSERT INTO knowledge_points (material_id,name,section) VALUES (?,?,?)").bind(mid, k.name, s.section))));
        const kp = await env.DB.prepare("SELECT id FROM knowledge_points WHERE material_id=? AND name=?").bind(mid, name).first();
        return json({ material_id: mid, kp_id: kp.id, imported: lib.subject });
      }
      if (p === "/api/papers" && request.method === "GET") {
        // 自链恢复：若后台自链中断（平台回收），重踢仍在生成中的试卷
        const gening = await env.DB.prepare(
          "SELECT id FROM papers WHERE user_id=? AND status='generating' AND created_at >= datetime('now','-10 minutes')").bind(user.id).all();
        for (const g of gening.results) ctx.waitUntil(genStep(env, g.id, ctx));
        // 看门狗：生成超过 10 分钟仍未完成的试卷，按已入库题量收尾或判失败
        const stale = await env.DB.prepare(
          "SELECT id FROM papers WHERE user_id=? AND status='generating' AND created_at < datetime('now','-10 minutes')").bind(user.id).all();
        for (const s of stale.results) {
          const qc = await env.DB.prepare("SELECT COUNT(*) AS c FROM questions WHERE paper_id=?").bind(s.id).first();
          await env.DB.prepare("UPDATE papers SET status=?, question_count=? WHERE id=?")
            .bind(qc.c >= 5 ? "ready" : "failed", qc.c, s.id).run();
        }
        const gen = await env.DB.prepare(
          "SELECT id FROM papers WHERE user_id=? AND status='generating' LIMIT 3").bind(user.id).all();
        for (const g of gen.results) ctx.waitUntil(genStep(env, g.id, ctx));
        const rows = await env.DB.prepare(
          `SELECT p.id,p.title,p.status,p.question_count,p.fail_reason,p.created_at,p.material_id,
                  (SELECT score FROM attempts a WHERE a.paper_id=p.id ORDER BY a.id DESC LIMIT 1) AS last_score,
                  (SELECT total FROM attempts a WHERE a.paper_id=p.id ORDER BY a.id DESC LIMIT 1) AS last_total
           FROM papers p WHERE p.user_id=? ORDER BY p.id DESC LIMIT 50`).bind(user.id).all();
        return json({ papers: rows.results });
      }
      m = p.match(/^\/api\/papers\/(\d+)$/);
      if (m && request.method === "GET") {
        let paper = await env.DB.prepare("SELECT * FROM papers WHERE id=? AND user_id=?").bind(m[1], user.id).first();
        if (!paper) return err(404, "试卷不存在");
        if (paper.status === "generating") {
          if (Date.now() - new Date(paper.created_at + "Z").getTime() > 600000) {
            const qc = await env.DB.prepare("SELECT COUNT(*) AS c FROM questions WHERE paper_id=?").bind(paper.id).first();
            const st = qc.c >= 5 ? "ready" : "failed";
            await env.DB.prepare("UPDATE papers SET status=?, question_count=? WHERE id=?").bind(st, qc.c, paper.id).run();
            paper = { ...paper, status: st, question_count: qc.c };
          } else {
            ctx.waitUntil(genStep(env, paper.id, ctx)); // 轮询兜底驱动
          }
        }
        if (paper.status === "generating") {
          const gc = await env.DB.prepare("SELECT COUNT(*) AS c FROM questions WHERE paper_id=?").bind(paper.id).first();
          paper = { ...paper, gen_count: gc.c };
        }
        if (paper.status !== "ready") return json({ paper });
        const qs = await env.DB.prepare("SELECT id,seq,stem,opt_a,opt_b,opt_c,opt_d,knowledge_point,qtype FROM questions WHERE paper_id=? ORDER BY seq").bind(m[1]).all();
        return json({ paper, questions: qs.results });
      }
      m = p.match(/^\/api\/papers\/(\d+)\/submit$/);
      if (m && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || typeof body.answers !== "object" || body.answers === null || Array.isArray(body.answers)) return err(400, "参数错误：缺少 answers");
        const { answers, duration_sec } = body;
        const paper = await env.DB.prepare("SELECT * FROM papers WHERE id=? AND user_id=? AND status='ready'").bind(m[1], user.id).first();
        if (!paper) return err(404, "试卷不存在");
        const prev = await env.DB.prepare("SELECT id FROM attempts WHERE paper_id=? AND user_id=? LIMIT 1").bind(m[1], user.id).first();
        if (prev && !body.retake) return err(409, "该试卷已交卷，可在结果页查看成绩与解析；如需重做请选择重新作答");
        const qs = await env.DB.prepare("SELECT * FROM questions WHERE paper_id=? ORDER BY seq").bind(m[1]).all();
        let score = 0; const detail = [];
        const choiceTotal = qs.results.filter(q => (q.qtype || "single") !== "essay").length;
        for (const q of qs.results) {
          if ((q.qtype || "single") === "essay") {
            const txt = String(answers[q.id] || "").slice(0, 3000);
            detail.push({ id: q.id, seq: q.seq, your: txt, answer: q.answer, correct: null, self: [], analysis: q.analysis, knowledge_point: q.knowledge_point, qtype: "essay", stem: q.stem, opt_a: "", opt_b: "", opt_c: "", opt_d: "" });
            continue;
          }
          let ua = [...new Set(String(answers[q.id] || "").toUpperCase().split("").filter(c => "ABCD".includes(c)))].sort().join("");
          if ((q.qtype || "single") === "single" && ua.length > 1) ua = "";
          const correct = ua === q.answer;
          if (correct) score++;
          else if (ua) await env.DB.prepare("INSERT INTO wrong_book (user_id,question_id,your_answer) VALUES (?,?,?) ON CONFLICT(user_id,question_id) DO UPDATE SET your_answer=excluded.your_answer").bind(user.id, q.id, ua).run();
          detail.push({ id: q.id, seq: q.seq, your: ua, answer: q.answer, correct, analysis: q.analysis, knowledge_point: q.knowledge_point, qtype: q.qtype || "single", stem: q.stem, opt_a: q.opt_a, opt_b: q.opt_b, opt_c: q.opt_c, opt_d: q.opt_d });
        }
        await env.DB.prepare("INSERT INTO attempts (user_id,paper_id,answers,score,total,duration_sec) VALUES (?,?,?,?,?,?)")
          .bind(user.id, m[1], JSON.stringify(answers), score, choiceTotal, Math.max(0, parseInt(duration_sec) || 0)).run();
        const beat = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM attempts WHERE total>0 AND user_id<>? AND CAST(score AS REAL)/total < ?) AS lo, (SELECT COUNT(*) FROM attempts WHERE total>0 AND user_id<>?) AS al").bind(user.id, choiceTotal > 0 ? score / choiceTotal : 0, user.id).first();
        const beat_pct = beat && beat.al >= 20 ? Math.round(beat.lo * 100 / beat.al) : null;
        const history = await env.DB.prepare("SELECT score,total,duration_sec,created_at FROM attempts WHERE paper_id=? AND user_id=? ORDER BY id DESC LIMIT 20").bind(m[1], user.id).all();
        return json({ score, total: choiceTotal, duration_sec: Math.max(0, parseInt(duration_sec) || 0), title: paper.title || "", beat_pct, detail, history: history.results });
      }
      // 材料分析题逐要点自评留痕
      m = p.match(/^\/api\/papers\/(\d+)\/essay-self$/);
      if (m && request.method === "POST") {
        const b = await request.json().catch(() => null);
        if (!b || !Number.isInteger(parseInt(b.question_id)) || !Array.isArray(b.hits)) return err(400, "参数错误");
        const paper = await env.DB.prepare("SELECT id FROM papers WHERE id=? AND user_id=?").bind(m[1], user.id).first();
        if (!paper) return err(404, "试卷不存在");
        const q = await env.DB.prepare("SELECT id FROM questions WHERE id=? AND paper_id=? AND qtype='essay'").bind(parseInt(b.question_id), m[1]).first();
        if (!q) return err(404, "题目不存在");
        const att = await env.DB.prepare("SELECT id,answers FROM attempts WHERE paper_id=? AND user_id=? ORDER BY id DESC LIMIT 1").bind(m[1], user.id).first();
        if (!att) return err(404, "该试卷尚未作答");
        const a = JSON.parse(att.answers || "{}");
        a["__self_" + q.id] = [...new Set(b.hits.map(h => parseInt(h)).filter(h => Number.isInteger(h) && h >= 0 && h < 20))];
        await env.DB.prepare("UPDATE attempts SET answers=? WHERE id=?").bind(JSON.stringify(a), att.id).run();
        return json({ ok: true });
      }
      // 查看历史成绩与解析（最近一次作答）
      m = p.match(/^\/api\/papers\/(\d+)\/result$/);
      if (m && request.method === "GET") {
        const att = await env.DB.prepare("SELECT * FROM attempts WHERE paper_id=? AND user_id=? ORDER BY id DESC LIMIT 1").bind(m[1], user.id).first();
        if (!att) return err(404, "该试卷尚未作答");
        const history = await env.DB.prepare("SELECT score,total,duration_sec,created_at FROM attempts WHERE paper_id=? AND user_id=? ORDER BY id DESC LIMIT 20").bind(m[1], user.id).all();
        const qs = await env.DB.prepare("SELECT * FROM questions WHERE paper_id=? ORDER BY seq").bind(m[1]).all();
        const answers = JSON.parse(att.answers || "{}");
        const detail = qs.results.map(q => {
          if ((q.qtype || "single") === "essay") {
            const self = Array.isArray(answers["__self_" + q.id]) ? answers["__self_" + q.id] : [];
            return { id: q.id, seq: q.seq, your: String(answers[q.id] || "").slice(0, 3000), answer: q.answer, correct: null, self, analysis: q.analysis, knowledge_point: q.knowledge_point, qtype: "essay", stem: q.stem, opt_a: "", opt_b: "", opt_c: "", opt_d: "" };
          }
          let ua = [...new Set(String(answers[q.id] || "").toUpperCase().split("").filter(c => "ABCD".includes(c)))].sort().join("");
          if ((q.qtype || "single") === "single" && ua.length > 1) ua = "";
          return { id: q.id, seq: q.seq, your: ua, answer: q.answer, correct: ua === q.answer, analysis: q.analysis, knowledge_point: q.knowledge_point, qtype: q.qtype || "single", stem: q.stem, opt_a: q.opt_a, opt_b: q.opt_b, opt_c: q.opt_c, opt_d: q.opt_d };
        });
        const pt = await env.DB.prepare("SELECT title FROM papers WHERE id=?").bind(m[1]).first();
        const beat = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM attempts WHERE total>0 AND user_id<>? AND CAST(score AS REAL)/total < ?) AS lo, (SELECT COUNT(*) FROM attempts WHERE total>0 AND user_id<>?) AS al").bind(user.id, att.total > 0 ? att.score / att.total : 0, user.id).first();
        const beat_pct = beat && beat.al >= 20 ? Math.round(beat.lo * 100 / beat.al) : null;
        return json({ score: att.score, total: att.total, duration_sec: att.duration_sec, submitted_at: att.created_at, title: (pt && pt.title) || "", beat_pct, history: history.results, detail });
      }

      // --- 成绩单：全部作答历史 ---
      if (p === "/api/history" && request.method === "GET") {
        const rows = await env.DB.prepare(
          `SELECT a.id, a.paper_id, a.score, a.total, a.duration_sec, a.created_at, a.answers, pp.title,
             (SELECT mt.title FROM materials mt WHERE mt.id=pp.material_id) AS subject
           FROM attempts a JOIN papers pp ON a.paper_id=pp.id
           WHERE a.user_id=? ORDER BY a.id DESC LIMIT 200`)
          .bind(user.id).all();
        const withAnswered = rows.results.map(r => {
          let n = 0;
          try { n = Object.values(JSON.parse(r.answers || "{}")).filter(v => v !== null && v !== "" && !(Array.isArray(v) && !v.length)).length; } catch {}
          const { answers, ...rest } = r;
          return { ...rest, answered: n };
        });
        return json({ attempts: withAnswered });
      }

      // --- 题目报错：帮助持续提升题库质量，同一用户对同一题只记一次 ---
      {
        const fm = p.match(/^\/api\/questions\/(\d+)\/flag$/);
        if (fm && request.method === "POST") {
          let body;
          try { body = await request.json(); } catch { return json({ error: "参数错误" }, 400);
          }
          const reasons = ["答案存疑", "选项有误", "解析不清", "题干歧义", "其他"];
          if (!reasons.includes(body.reason)) return json({ error: "参数错误" }, 400);
          const detail = typeof body.detail === "string" ? body.detail.slice(0, 200) : null;
          const q = await env.DB.prepare(
            "SELECT q.id FROM questions q JOIN papers pp ON q.paper_id=pp.id WHERE q.id=? AND pp.user_id=?"
          ).bind(+fm[1], user.id).first();
          if (!q) return json({ error: "题目不存在" }, 404);
          await env.DB.prepare(
            "INSERT INTO question_flags (user_id, question_id, reason, detail) VALUES (?,?,?,?) ON CONFLICT(user_id, question_id) DO UPDATE SET reason=excluded.reason, detail=excluded.detail, created_at=datetime('now')"
          ).bind(user.id, q.id, body.reason, detail).run();
          return json({ ok: true });
        }
      }

      // 本人已报错的题目清单（前端回显「已反馈」状态）
      if (p === "/api/flags" && request.method === "GET") {
        const rows = await env.DB.prepare("SELECT question_id, reason FROM question_flags WHERE user_id=?").bind(user.id).all();
        const flags = {};
        for (const r of rows.results) flags[r.question_id] = r.reason;
        return json({ flags });
      }

      // --- 考点掌握度：按考点聚合客观题正确率（每卷取最新一次作答） ---
      if (p === "/api/kpstats" && request.method === "GET") {
        const atts = await env.DB.prepare(
          `SELECT a.paper_id, a.answers FROM attempts a
           WHERE a.user_id=?1 AND a.id=(SELECT MAX(id) FROM attempts WHERE user_id=?1 AND paper_id=a.paper_id)
           ORDER BY a.id DESC LIMIT 100`)
          .bind(user.id).all();
        const map = {};
        for (const at of atts.results) {
          let ans; try { ans = JSON.parse(at.answers || "{}"); } catch { continue; }
          const qs = await env.DB.prepare(
            "SELECT id, answer, knowledge_point, COALESCE(qtype,'single') AS qtype FROM questions WHERE paper_id=? AND COALESCE(qtype,'single')<>'essay'")
            .bind(at.paper_id).all();
          for (const q of qs.results) {
            // 考点名归一化：合并「和/与」及「××的辩证关系」等历史变体，保证跨来源统计口径一致
            const kp = (q.knowledge_point || "").trim().replace(/和/g, "与").replace(/的辩证关系$/, "");
            if (!kp) continue;
            let ua = [...new Set(String(ans[q.id] || "").toUpperCase().split("").filter(c => "ABCD".includes(c)))].sort().join("");
            if (q.qtype === "single" && ua.length > 1) ua = "";
            const m2 = map[kp] || (map[kp] = { kp, total: 0, correct: 0 });
            m2.total += 1;
            if (ua === q.answer) m2.correct += 1;
          }
        }
        const kpRows = await env.DB.prepare(
          `SELECT k.id, k.name, k.material_id FROM knowledge_points k
           JOIN materials m ON k.material_id=m.id WHERE m.user_id=?`).bind(user.id).all();
        const loc = {};
        for (const r of kpRows.results) {
          const n = r.name.trim().replace(/和/g, "与").replace(/的辩证关系$/, "");
          if (!loc[n]) loc[n] = r;
        }
        const kps = Object.values(map).sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total)
          .map(k => ({ ...k, kp_id: loc[k.kp] ? loc[k.kp].id : null, material_id: loc[k.kp] ? loc[k.kp].material_id : null }));
        return json({ kps });
      }

      // --- stats（冲刺看板） ---
      if (p === "/api/stats" && request.method === "GET") {
        const atts = await env.DB.prepare(
          "SELECT score,total,created_at FROM attempts WHERE user_id=? ORDER BY id DESC LIMIT 30").bind(user.id).all();
        // 打卡/连续天数用全量历史：每个 UTC 日取首末两条时间戳，覆盖时区边界
        const dayTs = await env.DB.prepare(
          "SELECT MIN(created_at) AS a, MAX(created_at) AS b FROM attempts WHERE user_id=? GROUP BY substr(created_at,1,10)").bind(user.id).all();
        const wrong = await env.DB.prepare("SELECT COUNT(*) AS c FROM wrong_book WHERE user_id=?").bind(user.id).first();
        const wrongDue = await env.DB.prepare("SELECT COUNT(*) AS c FROM wrong_book WHERE user_id=? AND (due_at IS NULL OR due_at<=datetime('now'))").bind(user.id).first();
        const kp = await env.DB.prepare(
          `SELECT COUNT(*) AS total,
             SUM(EXISTS(SELECT 1 FROM questions q JOIN papers pp ON q.paper_id=pp.id
                        WHERE pp.user_id=? AND q.knowledge_point=k.name
                          AND EXISTS(SELECT 1 FROM attempts a WHERE a.paper_id=pp.id))) AS covered
           FROM knowledge_points k JOIN materials mt ON k.material_id=mt.id WHERE mt.user_id=?`)
          .bind(user.id, user.id).first();
        const wk = await env.DB.prepare(
          `SELECT
            (SELECT COALESCE(SUM(total),0) FROM attempts WHERE user_id=?1 AND created_at>=datetime('now','-7 days')) AS t1,
            (SELECT COALESCE(SUM(score),0) FROM attempts WHERE user_id=?1 AND created_at>=datetime('now','-7 days')) AS s1,
            (SELECT COALESCE(SUM(total),0) FROM attempts WHERE user_id=?1 AND created_at<datetime('now','-7 days') AND created_at>=datetime('now','-14 days')) AS t0,
            (SELECT COALESCE(SUM(score),0) FROM attempts WHERE user_id=?1 AND created_at<datetime('now','-7 days') AND created_at>=datetime('now','-14 days')) AS s0`)
          .bind(user.id).first();
        const eatts = await env.DB.prepare(
          `SELECT a.answers, q.id AS qid, q.answer AS qa FROM attempts a JOIN questions q ON q.paper_id=a.paper_id AND q.qtype='essay'
           WHERE a.user_id=?1 AND a.created_at>=datetime('now','-7 days')
             AND a.id=(SELECT MAX(id) FROM attempts WHERE user_id=?1 AND paper_id=a.paper_id)`)
          .bind(user.id).all();
        let en = 0, eh = 0, ek = 0;
        for (const r of eatts.results) {
          let ans; try { ans = JSON.parse(r.answers || "{}"); } catch { continue; }
          const self = ans["__self_" + r.qid];
          if (!Array.isArray(self) || !self.length) continue;
          en += 1; eh += self.length; ek += String(r.qa || "").split("\n").filter(x => x.trim()).length;
        }
        return json({
          attempts: atts.results.reverse(),
          attempt_day_ts: dayTs.results.flatMap(r => r.a === r.b ? [r.a] : [r.a, r.b]),
          week: wk,
          essay7: { n: en, hit: eh, total: ek },
          wrong_count: wrong.c,
          wrong_due: wrongDue.c,
          kp_total: kp.total || 0,
          kp_covered: kp.covered || 0,
        });
      }

      // --- wrong book ---
      if (p === "/api/wrongbook" && request.method === "GET") {
        const rows = await env.DB.prepare(
          `SELECT q.id,q.stem,q.opt_a,q.opt_b,q.opt_c,q.opt_d,q.answer,q.analysis,q.knowledge_point,q.qtype,w.your_answer,w.created_at,
             COALESCE(w.box,1) AS box,
             (w.due_at IS NULL OR w.due_at<=datetime('now')) AS due,
             CASE WHEN pp.material_id=0 THEN '历年真题' || CASE WHEN COALESCE(q.subject,'')<>'' THEN '·'||q.subject ELSE COALESCE((SELECT '·'||rq.subject FROM real_questions rq WHERE rq.kp_name=q.knowledge_point LIMIT 1),'') END ELSE mt.title END AS subject
           FROM wrong_book w JOIN questions q ON q.id=w.question_id
           JOIN papers pp ON pp.id=q.paper_id LEFT JOIN materials mt ON mt.id=pp.material_id
           WHERE w.user_id=?
           ORDER BY due DESC, w.due_at ASC, w.id DESC LIMIT 500`).bind(user.id).all();
        return json({ questions: rows.results });
      }
      // 错题间隔重复：答题结果驱动复习盒升降级
      m = p.match(/^\/api\/wrongbook\/(\d+)\/review$/);
      if (m && request.method === "POST") {
        const { correct } = await request.json().catch(() => ({}));
        const row = await env.DB.prepare("SELECT COALESCE(box,1) AS box FROM wrong_book WHERE user_id=? AND question_id=?").bind(user.id, m[1]).first();
        if (!row) return err(404, "该错题不存在");
        if (!correct) {
          await env.DB.prepare("UPDATE wrong_book SET box=1, due_at=datetime('now') WHERE user_id=? AND question_id=?").bind(user.id, m[1]).run();
          return json({ box: 1, next_days: 0 });
        }
        const newBox = row.box + 1;
        if (newBox >= 5) {
          await env.DB.prepare("DELETE FROM wrong_book WHERE user_id=? AND question_id=?").bind(user.id, m[1]).run();
          return json({ graduated: true });
        }
        const days = { 2: 1, 3: 3, 4: 7 }[newBox];
        await env.DB.prepare(`UPDATE wrong_book SET box=?, due_at=datetime('now','+${days} days') WHERE user_id=? AND question_id=?`).bind(newBox, user.id, m[1]).run();
        return json({ box: newBox, next_days: days });
      }
      m = p.match(/^\/api\/wrongbook\/(\d+)$/);
      if (m && request.method === "DELETE") {
        const r = await env.DB.prepare("DELETE FROM wrong_book WHERE user_id=? AND question_id=?").bind(user.id, m[1]).run();
        if (!r.meta.changes) return err(404, "该错题不存在");
        return json({ ok: true });
      }

      // --- 分析题背诵标记（服务端持久，多设备同步） ---
      if (p === "/api/subjmemo" && request.method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT year, seq, COALESCE(last_reviewed_at,created_at)<=datetime('now','-7 days') AS due FROM subj_memo WHERE user_id=?").bind(user.id).all();
        const tn = await env.DB.prepare(
          "SELECT COUNT(*) AS n FROM subj_memo WHERE user_id=? AND created_at>=datetime(date('now','+8 hours'),'-8 hours')").bind(user.id).first();
        const hs = await env.DB.prepare("SELECT year, seq, n, t, sel, CAST(strftime('%s',updated_at) AS INTEGER)*1000 AS u FROM subj_hit WHERE user_id=?").bind(user.id).all();
        const hits = {};
        for (const h of hs.results) {
          let sel = [];
          try { sel = JSON.parse(h.sel || "[]"); } catch { }
          hits[h.year + "-" + h.seq] = { n: h.n, t: h.t, sel, u: h.u || 0 };
        }
        const md = await env.DB.prepare("SELECT created_at, last_reviewed_at FROM subj_memo WHERE user_id=?").bind(user.id).all();
        const day_ts = [...new Set(md.results.flatMap(r => [r.created_at, r.last_reviewed_at]).filter(Boolean))];
        return json({ keys: rows.results.map(r => r.year + "-" + r.seq), today_n: tn.n, due: rows.results.filter(r => r.due).map(r => r.year + "-" + r.seq), hits, day_ts });
      }
      if (p === "/api/subjmemo" && request.method === "POST") {
        if (!(await rateLimit(env, `subjmemo:${user.id}`, 240, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const b = await request.json().catch(() => null);
        const year = b ? parseInt(b.year) : NaN, seq = b ? parseInt(b.seq) : NaN;
        if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(seq) || seq < 1 || seq > 50 || typeof b.on !== "boolean")
          return err(400, "参数错误");
        if (b.on) await env.DB.prepare(
          "INSERT INTO subj_memo (user_id,year,seq) VALUES (?,?,?) ON CONFLICT(user_id,year,seq) DO NOTHING").bind(user.id, year, seq).run();
        else await env.DB.prepare("DELETE FROM subj_memo WHERE user_id=? AND year=? AND seq=?").bind(user.id, year, seq).run();
        return json({ ok: true });
      }
      // 要点自评结果（想到 n/t 条）服务端同步
      if (p === "/api/subjmemo/hit" && request.method === "POST") {
        if (!(await rateLimit(env, `subjmemo:${user.id}`, 240, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const b = await request.json().catch(() => null);
        const year = b ? parseInt(b.year) : NaN, seq = b ? parseInt(b.seq) : NaN;
        const n = b ? parseInt(b.n) : NaN, t = b ? parseInt(b.t) : NaN;
        if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(seq) || seq < 1 || seq > 50 ||
          !Number.isInteger(n) || n < 0 || n > 50 || !Number.isInteger(t) || t < 1 || t > 50 || n > t) return err(400, "参数错误");
        const sel = Array.isArray(b.sel) ? b.sel.filter(i => Number.isInteger(i) && i >= 0 && i < t).slice(0, 50) : [];
        await env.DB.prepare(
          "INSERT INTO subj_hit (user_id,year,seq,n,t,sel,updated_at) VALUES (?,?,?,?,?,?,datetime('now')) ON CONFLICT(user_id,year,seq) DO UPDATE SET n=excluded.n,t=excluded.t,sel=excluded.sel,updated_at=excluded.updated_at").bind(user.id, year, seq, n, t, JSON.stringify(sel)).run();
        return json({ ok: true });
      }
      // 温习打卡：刷新温习时间，7 天内不再计入到期（多设备一致）
      if (p === "/api/subjmemo/review" && request.method === "POST") {
        if (!(await rateLimit(env, `subjmemo:${user.id}`, 240, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const b = await request.json().catch(() => null);
        const year = b ? parseInt(b.year) : NaN, seq = b ? parseInt(b.seq) : NaN;
        if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(seq) || seq < 1 || seq > 50) return err(400, "参数错误");
        await env.DB.prepare("UPDATE subj_memo SET last_reviewed_at=datetime('now') WHERE user_id=? AND year=? AND seq=?").bind(user.id, year, seq).run();
        return json({ ok: true });
      }

      // --- 每日一题打卡（服务端同步，多设备连续天数一致） ---
      if (p === "/api/checkin" && request.method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT d FROM daily_checkin WHERE user_id=? ORDER BY d DESC LIMIT 400").bind(user.id).all();
        return json({ days: rows.results.map(r => r.d) });
      }
      if (p === "/api/checkin" && request.method === "POST") {
        if (!(await rateLimit(env, `checkin:${user.id}`, 30, 3600))) return err(429, "操作过于频繁，请稍后再试");
        await env.DB.prepare(
          "INSERT INTO daily_checkin (user_id,d) VALUES (?,date('now')) ON CONFLICT(user_id,d) DO NOTHING").bind(user.id).run();
        return json({ ok: true });
      }

      // --- 真题收藏（背题/搜索页星标，多设备同步） ---
      if (p === "/api/realfav" && request.method === "GET") {
        const rows = await env.DB.prepare(
          `SELECT q.id, q.year, q.seq, q.qtype, q.stem, q.opt_a, q.opt_b, q.opt_c, q.opt_d, q.answer, q.analysis, q.subject, q.kp_name, q.answer_disputed, f.created_at AS fav_at
           FROM real_favs f JOIN real_questions q ON q.id=f.rq_id
           WHERE f.user_id=? ORDER BY f.created_at DESC, q.id DESC LIMIT 500`).bind(user.id).all();
        return json({ questions: rows.results });
      }
      if (p === "/api/realfav" && request.method === "POST") {
        if (!(await rateLimit(env, `realfav:${user.id}`, 240, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const b = await request.json().catch(() => null);
        const rid = b ? parseInt(b.id) : NaN;
        if (!Number.isInteger(rid)) return err(400, "参数错误");
        const q = await env.DB.prepare("SELECT id FROM real_questions WHERE id=? AND third_party_material=0").bind(rid).first();
        if (!q) return err(404, "题目不存在");
        await env.DB.prepare("INSERT INTO real_favs (user_id,rq_id) VALUES (?,?) ON CONFLICT(user_id,rq_id) DO NOTHING").bind(user.id, rid).run();
        return json({ ok: true });
      }
      m = p.match(/^\/api\/realfav\/(\d+)$/);
      if (m && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM real_favs WHERE user_id=? AND rq_id=?").bind(user.id, m[1]).run();
        return json({ ok: true });
      }

      // --- 题目收藏 ---
      if (p === "/api/favorites" && request.method === "GET") {
        const rows = await env.DB.prepare(
          `SELECT q.id,q.stem,q.opt_a,q.opt_b,q.opt_c,q.opt_d,q.answer,q.analysis,q.knowledge_point,q.qtype,f.created_at,
             mt.title AS subject
           FROM favorites f JOIN questions q ON q.id=f.question_id
           JOIN papers pp ON pp.id=q.paper_id LEFT JOIN materials mt ON mt.id=pp.material_id
           WHERE f.user_id=? ORDER BY f.id DESC LIMIT 500`).bind(user.id).all();
        return json({ questions: rows.results });
      }
      if (p === "/api/favorites" && request.method === "POST") {
        if (!(await rateLimit(env, `fav:${user.id}`, 120, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const b = await request.json().catch(() => null);
        const qid = b ? parseInt(b.question_id) : NaN;
        if (!Number.isInteger(qid) || qid <= 0) return err(400, "参数错误：缺少 question_id");
        const q = await env.DB.prepare(
          "SELECT q.id FROM questions q JOIN papers pp ON q.paper_id=pp.id WHERE q.id=? AND pp.user_id=?").bind(qid, user.id).first();
        if (!q) return err(404, "题目不存在");
        await env.DB.prepare(
          "INSERT INTO favorites (user_id,question_id) VALUES (?,?) ON CONFLICT(user_id,question_id) DO NOTHING").bind(user.id, qid).run();
        return json({ ok: true });
      }
      m = p.match(/^\/api\/favorites\/(\d+)$/);
      if (m && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM favorites WHERE user_id=? AND question_id=?").bind(user.id, m[1]).run();
        return json({ ok: true });
      }

      // --- 刷真题：真题卷复制进 papers/questions（material_id=0 标记，不占每日额度），错题本/收藏/弱项/成绩全链路自动兼容 ---
      const realPaperFromQs = async (title, rqs) => {
        const r = await env.DB.prepare("INSERT INTO papers (user_id,material_id,title,status,question_count) VALUES (?,0,?,'ready',?)")
          .bind(user.id, title, rqs.length).run();
        const pid = r.meta.last_row_id;
        await env.DB.batch(rqs.map((q, i) => env.DB.prepare(
          "INSERT INTO questions (paper_id,seq,stem,opt_a,opt_b,opt_c,opt_d,answer,analysis,knowledge_point,qtype,subject) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(pid, i + 1, q.stem, q.opt_a, q.opt_b, q.opt_c, q.opt_d, q.answer,
            (q.answer_disputed ? "（注：该题各机构答案存在分歧，以官方《考试分析》为准）\n" : "") + (q.analysis || "解析生成中，稍后可在成绩页回看。"),
            q.kp_name || q.subject || "真题", q.qtype || "single", q.subject || "")));
        return pid;
      };
      // 全站级聚合走 KV 缓存（题库仅导入时变化），减少冷启动时的 D1 往返
      const aggCached = async (key, fn) => {
        try {
          const hit = await env.RATELIMIT.get("agg:" + key);
          if (hit) return JSON.parse(hit);
        } catch (e) { /* KV 故障时直接查库 */ }
        const val = await fn();
        try { await env.RATELIMIT.put("agg:" + key, JSON.stringify(val), { expirationTtl: 21600 }); } catch (e) { /* 忽略写失败 */ }
        return val;
      };
      if (p === "/api/real/years" && request.method === "GET") {
        const rows = { results: await aggCached("years", async () => (await env.DB.prepare(
          "SELECT year, COUNT(*) AS n FROM real_questions WHERE third_party_material=0 GROUP BY year ORDER BY year DESC").all()).results) };
        const mine = await env.DB.prepare(
          `SELECT id,title,
             (SELECT score FROM attempts a WHERE a.paper_id=papers.id ORDER BY a.id DESC LIMIT 1) AS last_score,
             (SELECT total FROM attempts a WHERE a.paper_id=papers.id ORDER BY a.id DESC LIMIT 1) AS last_total
           FROM papers WHERE user_id=? AND material_id=0 AND title LIKE '%考研政治真题卷'`).bind(user.id).all();
        const byYear = {};
        for (const r of mine.results) {
          const ym = r.title.match(/^(\d{4}) /);
          if (ym) byYear[ym[1]] = r;
        }
        return json({ years: rows.results.map(r => ({
          year: r.year, n: r.n,
          paper_id: byYear[r.year] ? byYear[r.year].id : null,
          last_score: byYear[r.year] ? byYear[r.year].last_score : null,
          last_total: byYear[r.year] ? byYear[r.year].last_total : null,
        })) });
      }
      if (p === "/api/real/kps" && request.method === "GET") {
        const kps = await aggCached("kps", async () => (await env.DB.prepare(
          "SELECT subject, kp_name, COUNT(*) AS n FROM real_questions WHERE third_party_material=0 AND kp_name<>'' GROUP BY subject, kp_name ORDER BY subject, n DESC").all()).results);
        return json({ kps });
      }
      // 每日一题：按日期确定性抽一道真题（免费，含答案解析）
      if (p === "/api/real/daily" && request.method === "GET") {
        const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM real_questions WHERE third_party_material=0").first();
        const day = Math.floor(Date.now() / 86400000);
        const off = ((day * 2654435761) >>> 0) % c.n;
        const q = await env.DB.prepare(
          "SELECT id, year, seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject, kp_name FROM real_questions WHERE third_party_material=0 ORDER BY year, seq LIMIT 1 OFFSET ?").bind(off).first();
        return json({ q });
      }
      if (p === "/api/real/paper" && request.method === "GET") {
        const year = parseInt(url.searchParams.get("year"));
        if (!Number.isInteger(year) || year < 2000 || year > 2100) return err(400, "参数错误：year");
        const title = `${year} 考研政治真题卷`;
        const exist = await env.DB.prepare("SELECT id FROM papers WHERE user_id=? AND material_id=0 AND title=? ORDER BY id DESC LIMIT 1").bind(user.id, title).first();
        if (exist) return json({ id: exist.id, existed: true });
        if (!(await rateLimit(env, `real:${user.id}`, 60, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const rqs = await env.DB.prepare(
          "SELECT * FROM real_questions WHERE year=? AND third_party_material=0 ORDER BY seq").bind(year).all();
        if (!rqs.results.length) return err(404, "该年份真题暂未上架");
        return json({ id: await realPaperFromQs(title, rqs.results) });
      }
      if (p === "/api/real/subjective/years" && request.method === "GET") {
        const ys = await env.DB.prepare(
          "SELECT year, COUNT(*) n FROM real_subjective GROUP BY year ORDER BY year DESC").all();
        return json({ years: ys.results });
      }
      if (p === "/api/real/subjective/kps" && request.method === "GET") {
        const ks = await env.DB.prepare(
          "SELECT kp_name, subject, year, seq FROM real_subjective WHERE kp_name!='' ORDER BY year DESC"
        ).all();
        return json({ kps: ks.results });
      }
      if (p === "/api/real/subjective" && request.method === "GET") {
        const year = parseInt(url.searchParams.get("year"));
        if (!Number.isInteger(year) || year < 2000 || year > 2100) return err(400, "参数错误：year");
        const rows = await env.DB.prepare(
          `SELECT seq, subject, stem, questions, answer_points, kp_name
           FROM real_subjective WHERE year=? ORDER BY seq`).bind(year).all();
        if (!rows.results.length) return err(404, "该年份分析题暂未上架");
        return json({
          year,
          questions: rows.results.map(r => ({
            ...r,
            questions: JSON.parse(r.questions || "[]"),
            answer_points: JSON.parse(r.answer_points || "[]"),
          })),
        });
      }
      if (p === "/api/real/search" && request.method === "GET") {
        const q0 = (url.searchParams.get("q") || "").trim();
        // D1 对 LIKE 模式有字节长度限制，中文按 UTF-8 字节校验；超限但 ≤60 字符时降级为考点名精确匹配（长考点名直达）
        if (!q0) return err(400, "请输入关键词");
        if (new TextEncoder().encode(q0).length > 45) {
          if (q0.length > 60) return err(400, "关键词太长，请缩短到 60 个字以内");
          const rows = await env.DB.prepare(
            `SELECT id, year, seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject, kp_name, answer_disputed
             FROM real_questions WHERE third_party_material=0 AND kp_name=?1 ORDER BY year DESC, seq LIMIT 30`).bind(q0).all();
          const subj = await env.DB.prepare(
            `SELECT year, seq, subject, kp_name, substr(stem,1,140) AS brief FROM real_subjective WHERE kp_name=?1 ORDER BY year DESC, seq LIMIT 10`).bind(q0).all();
          return json({ questions: rows.results, subjective: subj.results });
        }
        // 搜索词计数（内容运营观测，尽力而为不阻塞）
        ctx.waitUntil((async () => {
          const k = "sq:" + q0.replace(/\s+/g, " ").trim().slice(0, 30);
          const n = parseInt(await env.RATELIMIT.get(k) || "0", 10) + 1;
          await env.RATELIMIT.put(k, String(n), { expirationTtl: 86400 * 30 });
        })().catch(() => {}));
        const like = "%" + q0.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
        const rows = await env.DB.prepare(
          `SELECT id, year, seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject, kp_name, answer_disputed
           FROM real_questions WHERE third_party_material=0 AND (stem LIKE ?1 ESCAPE '\\' OR kp_name LIKE ?1 ESCAPE '\\' OR analysis LIKE ?1 ESCAPE '\\' OR opt_a LIKE ?1 ESCAPE '\\' OR opt_b LIKE ?1 ESCAPE '\\' OR opt_c LIKE ?1 ESCAPE '\\' OR opt_d LIKE ?1 ESCAPE '\\')
           ORDER BY year DESC, seq LIMIT 30`).bind(like).all();
        const subj = await env.DB.prepare(
          `SELECT year, seq, subject, kp_name, substr(stem,1,140) AS brief
           FROM real_subjective
           WHERE stem LIKE ?1 ESCAPE '\\' OR kp_name LIKE ?1 ESCAPE '\\' OR answer_points LIKE ?1 ESCAPE '\\'
           ORDER BY year DESC, seq LIMIT 10`).bind(like).all();
        return json({ questions: rows.results, subjective: subj.results });
      }
      if (p === "/api/real/browse" && request.method === "GET") {
        const year = parseInt(url.searchParams.get("year"));
        if (!Number.isInteger(year) || year < 2000 || year > 2100) return err(400, "参数错误：year");
        const rqs = await env.DB.prepare(
          `SELECT id, seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject, kp_name, answer_disputed
           FROM real_questions WHERE year=? AND third_party_material=0 ORDER BY seq`).bind(year).all();
        if (!rqs.results.length) return err(404, "该年份真题暂未上架");
        return json({ year, questions: rqs.results });
      }
      if (p === "/api/real/weak" && request.method === "GET") {
        const kps = (url.searchParams.get("kps") || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 3);
        if (!kps.length || kps.some(n => n.length > 60)) return err(400, "参数错误：kps");
        // 已有未作答的弱项卷时直接复用，避免重复点击堆积同名卷
        const pend = await env.DB.prepare(
          "SELECT id FROM papers WHERE user_id=? AND material_id=0 AND title LIKE '真题弱项组卷%' AND status='ready' AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.paper_id=papers.id) ORDER BY id DESC LIMIT 1").bind(user.id).first();
        if (pend) return json({ id: pend.id, existed: true });
        if (!(await rateLimit(env, `real:${user.id}`, 60, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const rqs = await env.DB.prepare(
          `SELECT * FROM real_questions WHERE kp_name IN (${kps.map(() => "?").join(",")}) AND third_party_material=0 ORDER BY RANDOM() LIMIT 12`).bind(...kps).all();
        if (!rqs.results.length) return err(404, "这些考点暂无真题");
        return json({ id: await realPaperFromQs(`真题弱项组卷 · ${kps.slice(0, 2).join("、")}${kps.length > 2 ? " 等" : ""}`, rqs.results) });
      }
      // 乱序快刷：全库随机 20 道真题组卷（免费不占额度，适合碎片时间）
      if (p === "/api/real/randpaper" && request.method === "GET") {
        const pend = await env.DB.prepare(
          "SELECT id FROM papers WHERE user_id=? AND material_id=0 AND title LIKE '真题乱序快刷%' AND status='ready' AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.paper_id=papers.id) ORDER BY id DESC LIMIT 1").bind(user.id).first();
        if (pend) return json({ id: pend.id, existed: true });
        if (!(await rateLimit(env, `real:${user.id}`, 60, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const rqs = await env.DB.prepare(
          "SELECT * FROM real_questions WHERE third_party_material=0 ORDER BY RANDOM() LIMIT 20").all();
        const d = new Date().toISOString().slice(5, 10).replace("-", "/");
        return json({ id: await realPaperFromQs(`真题乱序快刷 · ${d}`, rqs.results) });
      }
      // 收藏自测卷：用收藏的真题组卷（免费不占额度）
      if (p === "/api/real/favpaper" && request.method === "GET") {
        const pend = await env.DB.prepare(
          "SELECT id FROM papers WHERE user_id=? AND material_id=0 AND title LIKE '真题收藏自测卷%' AND status='ready' AND NOT EXISTS (SELECT 1 FROM attempts a WHERE a.paper_id=papers.id) ORDER BY id DESC LIMIT 1").bind(user.id).first();
        if (pend) return json({ id: pend.id, existed: true });
        if (!(await rateLimit(env, `real:${user.id}`, 60, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const rqs = await env.DB.prepare(
          `SELECT q.* FROM real_favs f JOIN real_questions q ON q.id=f.rq_id
           WHERE f.user_id=? AND q.third_party_material=0 ORDER BY RANDOM() LIMIT 33`).bind(user.id).all();
        if (!rqs.results.length) return err(404, "还没有收藏真题，先在背题页或搜索结果点 ☆ 收藏");
        return json({ id: await realPaperFromQs(`真题收藏自测卷 · ${rqs.results.length} 题`, rqs.results) });
      }
      if (p === "/api/real/kp" && request.method === "GET") {
        const name = (url.searchParams.get("name") || "").trim();
        if (!name || name.length > 60) return err(400, "参数错误：name");
        if (!(await rateLimit(env, `real:${user.id}`, 60, 3600))) return err(429, "操作过于频繁，请稍后再试");
        const rqs = await env.DB.prepare(
          "SELECT * FROM real_questions WHERE kp_name=? AND third_party_material=0 ORDER BY RANDOM() LIMIT 10").bind(name).all();
        if (!rqs.results.length) return err(404, "该考点暂无真题");
        return json({ id: await realPaperFromQs(`真题特训 · ${name}`, rqs.results) });
      }

      return err(404, "接口不存在");
    } catch (e) {
      if (e instanceof SyntaxError) return err(400, "请求参数格式错误");
      console.error(e);
      return err(500, "服务器开小差了，请稍后重试");
    }
  },
};
