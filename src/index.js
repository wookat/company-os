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

// ---------- Router ----------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.protocol === "http:" || request.headers.get("x-forwarded-proto") === "http") {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    const p = url.pathname;
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
        const { email, password, invite } = await request.json();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err(400, "邮箱格式不正确");
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
        const r = await env.DB.prepare("INSERT INTO users (email,pw_hash,pw_salt,invited_by,reg_ip) VALUES (?,?,?,?,?)").bind(email.toLowerCase(), hash, salt, inviter ? inviter.id : null, ip).run();
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
               (SELECT COUNT(*) FROM question_flags) AS flags_open`).first();
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
        return json({ score, total: choiceTotal, duration_sec: Math.max(0, parseInt(duration_sec) || 0), title: paper.title || "", beat_pct, detail });
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
      if (p === "/api/real/years" && request.method === "GET") {
        const rows = await env.DB.prepare(
          "SELECT year, COUNT(*) AS n FROM real_questions WHERE third_party_material=0 GROUP BY year ORDER BY year DESC").all();
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
        const rows = await env.DB.prepare(
          "SELECT subject, kp_name, COUNT(*) AS n FROM real_questions WHERE third_party_material=0 AND kp_name<>'' GROUP BY subject, kp_name ORDER BY subject, n DESC").all();
        return json({ kps: rows.results });
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
      if (p === "/api/real/search" && request.method === "GET") {
        const q0 = (url.searchParams.get("q") || "").trim();
        if (!q0 || q0.length > 40) return err(400, "参数错误：q");
        const like = "%" + q0.replace(/[%_]/g, "") + "%";
        const rows = await env.DB.prepare(
          `SELECT year, seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject, kp_name, answer_disputed
           FROM real_questions WHERE third_party_material=0 AND (stem LIKE ?1 OR kp_name LIKE ?1 OR analysis LIKE ?1)
           ORDER BY year DESC, seq LIMIT 30`).bind(like).all();
        return json({ questions: rows.results });
      }
      if (p === "/api/real/browse" && request.method === "GET") {
        const year = parseInt(url.searchParams.get("year"));
        if (!Number.isInteger(year) || year < 2000 || year > 2100) return err(400, "参数错误：year");
        const rqs = await env.DB.prepare(
          `SELECT seq, qtype, stem, opt_a, opt_b, opt_c, opt_d, answer, analysis, subject, kp_name, answer_disputed
           FROM real_questions WHERE year=? AND third_party_material=0 ORDER BY seq`).bind(year).all();
        if (!rqs.results.length) return err(404, "该年份真题暂未上架");
        return json({ year, questions: rqs.results });
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
