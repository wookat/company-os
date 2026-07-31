// 真题工坊 - Cloudflare Worker API
const enc = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
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
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) return null;
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
  if (payload.exp && payload.exp < Date.now() / 1000) return null;
  return payload;
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
按资料的章节归组。输出 JSON：{"knowledge_points":[{"name":"考点名","section":"所属章节"}]}，最多 40 个，按重要性排序。`;

const GEN_SYSTEM = `你是全国研究生招生考试单项选择题命题专家。严格模仿真题风格：
- 题干以经典引文、领导人论述或现实情境切入，落点考基本原理；
- 四个选项仅一个正确，干扰项须似是而非（偷换概念/绝对化/无关但正确）；
- 附答案与解析，解析指明考点并逐一排错；
- 考点必须严格来自给定资料内容，不得超纲，不得照抄用户提供的任何样题。
输出 JSON：{"questions":[{"stem":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","analysis":"..."}]}`;

const REVIEW_SYSTEM = `你是考试题目审校专家。逐题审查以下选择题，检查：
1. 答案是否唯一且正确；2. 解析是否与答案一致且无事实错误；3. 干扰项是否成立（不能有两个可选答案）；4. 题目是否完整可作答。
输出 JSON：{"results":[{"index":0,"pass":true,"reason":""}]}，index 与输入顺序对应，不通过时给出简短原因。`;

function similarity(a, b) {
  // 基于字符 bigram 的 Dice 系数
  const grams = s => { const g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); return g; };
  const ga = grams(a), gb = grams(b);
  let inter = 0;
  for (const x of ga) if (gb.has(x)) inter++;
  return (2 * inter) / (ga.size + gb.size || 1);
}

async function generatePaper(env, paperId, material, kps, count) {
  try {
    const existing = [];
    const perKp = Math.max(1, Math.ceil(count / kps.length));
    const accepted = [];
    // 逐考点小批量生成，控制并发为 4
    const kpQueue = [...kps];
    while (accepted.length < count && kpQueue.length > 0) {
      const batch = kpQueue.splice(0, 4);
      const results = await Promise.allSettled(batch.map(kp =>
        llm(env, GEN_SYSTEM,
          `复习资料（命题范围）：\n${material.content.slice(0, 30000)}\n\n请针对考点「${kp.name}」（${kp.section || ""}）命制 ${perKp} 道单项选择题，难度对标考研真题。`,
          0.7)));
      let candidates = [];
      for (const r of results) {
        if (r.status === "fulfilled" && Array.isArray(r.value.questions)) {
          const kpIdx = results.indexOf(r);
          for (const q of r.value.questions) {
            if (q && q.stem && q.options && q.answer && q.analysis) {
              candidates.push({ ...q, knowledge_point: batch[kpIdx] ? batch[kpIdx].name : "" });
            }
          }
        }
      }
      // 查重：与已接受题目 & 材料内已有样题
      candidates = candidates.filter(q => {
        for (const prev of [...accepted, ...existing]) {
          if (similarity(q.stem, prev.stem) > 0.6) return false;
        }
        return true;
      });
      if (candidates.length === 0) continue;
      // AI 审校
      let reviewed = candidates;
      try {
        const reviewInput = candidates.map((q, i) =>
          `[${i}] 题干：${q.stem}\nA.${q.options.A}\nB.${q.options.B}\nC.${q.options.C}\nD.${q.options.D}\n答案：${q.answer}\n解析：${q.analysis}`).join("\n\n");
        const rv = await llm(env, REVIEW_SYSTEM, reviewInput, 0.1);
        const passSet = new Set((rv.results || []).filter(r => r.pass).map(r => r.index));
        if (rv.results && rv.results.length) reviewed = candidates.filter((_, i) => passSet.has(i));
      } catch (e) { /* 审校失败时保留候选题 */ }
      for (const q of reviewed) {
        if (accepted.length >= count) break;
        accepted.push(q);
      }
    }
    // 入库
    let seq = 1;
    for (const q of accepted) {
      await env.DB.prepare(
        "INSERT INTO questions (paper_id,seq,stem,opt_a,opt_b,opt_c,opt_d,answer,analysis,knowledge_point) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(paperId, seq++, q.stem, q.options.A, q.options.B, q.options.C, q.options.D, q.answer.trim().toUpperCase(), q.analysis, q.knowledge_point).run();
    }
    await env.DB.prepare("UPDATE papers SET status=?, question_count=? WHERE id=?")
      .bind(accepted.length > 0 ? "ready" : "failed", accepted.length, paperId).run();
  } catch (e) {
    await env.DB.prepare("UPDATE papers SET status='failed' WHERE id=?").bind(paperId).run();
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
    const p = url.pathname;
    if (!p.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      // --- auth ---
      if (p === "/api/register" && request.method === "POST") {
        const { email, password } = await request.json();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err(400, "邮箱格式不正确");
        if (!password || password.length < 6) return err(400, "密码至少 6 位");
        const exists = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email.toLowerCase()).first();
        if (exists) return err(409, "该邮箱已注册，请直接登录");
        const { hash, salt } = await hashPassword(password);
        const r = await env.DB.prepare("INSERT INTO users (email,pw_hash,pw_salt) VALUES (?,?,?)").bind(email.toLowerCase(), hash, salt).run();
        const uid = r.meta.last_row_id;
        const token = await signJWT({ uid, exp: Math.floor(Date.now() / 1000) + 30 * 86400 }, env.JWT_SECRET);
        return json({ token, user: { id: uid, email: email.toLowerCase(), plan: "free" } });
      }
      if (p === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind((email || "").toLowerCase()).first();
        if (!user) return err(401, "邮箱或密码错误");
        const { hash } = await hashPassword(password || "", user.pw_salt);
        if (hash !== user.pw_hash) return err(401, "邮箱或密码错误");
        const token = await signJWT({ uid: user.id, exp: Math.floor(Date.now() / 1000) + 30 * 86400 }, env.JWT_SECRET);
        return json({ token, user: { id: user.id, email: user.email, plan: user.plan, plan_expires_at: user.plan_expires_at } });
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

      if (p === "/api/me") return json({ user, pro: isPro(user) });

      if (p === "/api/redeem" && request.method === "POST") {
        const { code } = await request.json();
        const row = await env.DB.prepare("SELECT * FROM redeem_codes WHERE code=? AND used_by IS NULL").bind((code || "").trim()).first();
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
        if (!content || content.length < 200) return err(400, "资料内容太短（至少 200 字），请粘贴完整的讲义/笔记");
        if (content.length > 100000) return err(400, "资料过长，请分段上传（单份 10 万字以内）");
        const r = await env.DB.prepare("INSERT INTO materials (user_id,title,content) VALUES (?,?,?)")
          .bind(user.id, title || "未命名资料", content).run();
        const materialId = r.meta.last_row_id;
        // 考点抽取（同步，约 10-30 秒）
        const kp = await llm(env, KP_SYSTEM, content.slice(0, 30000), 0.2);
        const points = (kp.knowledge_points || []).slice(0, 40);
        for (const k of points) {
          await env.DB.prepare("INSERT INTO knowledge_points (material_id,name,section) VALUES (?,?,?)")
            .bind(materialId, k.name, k.section || "").run();
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

      // --- papers ---
      if (p === "/api/papers" && request.method === "POST") {
        const { material_id, count = 10, kp_ids } = await request.json();
        const n = Math.min(Math.max(parseInt(count) || 10, 5), 20);
        const mat = await env.DB.prepare("SELECT * FROM materials WHERE id=? AND user_id=?").bind(material_id, user.id).first();
        if (!mat) return err(404, "资料不存在");
        // 免费额度：每天 1 份
        if (!isPro(user)) {
          const today = new Date().toISOString().slice(0, 10);
          const used = await env.DB.prepare("SELECT COUNT(*) AS c FROM papers WHERE user_id=? AND created_at>=?").bind(user.id, today).first();
          if (used.c >= 1) return err(402, "免费版每天可生成 1 份试卷。升级会员解锁无限出卷");
        }
        let kpsQ = "SELECT id,name,section FROM knowledge_points WHERE material_id=? AND selected=1";
        const kpRows = await env.DB.prepare(kpsQ).bind(material_id).all();
        let kps = kpRows.results;
        if (Array.isArray(kp_ids) && kp_ids.length) kps = kps.filter(k => kp_ids.includes(k.id));
        if (!kps.length) return err(400, "请至少选择一个考点");
        // 随机取足够考点
        kps = kps.sort(() => Math.random() - 0.5).slice(0, n);
        const r = await env.DB.prepare("INSERT INTO papers (user_id,material_id,title,status) VALUES (?,?,?,'generating')")
          .bind(user.id, material_id, `${mat.title} · 模拟卷`).run();
        const paperId = r.meta.last_row_id;
        ctx.waitUntil(generatePaper(env, paperId, mat, kps, n));
        return json({ id: paperId, status: "generating" });
      }
      if (p === "/api/papers" && request.method === "GET") {
        const rows = await env.DB.prepare("SELECT id,title,status,question_count,created_at FROM papers WHERE user_id=? ORDER BY id DESC LIMIT 50").bind(user.id).all();
        return json({ papers: rows.results });
      }
      m = p.match(/^\/api\/papers\/(\d+)$/);
      if (m && request.method === "GET") {
        const paper = await env.DB.prepare("SELECT * FROM papers WHERE id=? AND user_id=?").bind(m[1], user.id).first();
        if (!paper) return err(404, "试卷不存在");
        if (paper.status !== "ready") return json({ paper });
        const qs = await env.DB.prepare("SELECT id,seq,stem,opt_a,opt_b,opt_c,opt_d,knowledge_point FROM questions WHERE paper_id=? ORDER BY seq").bind(m[1]).all();
        return json({ paper, questions: qs.results });
      }
      m = p.match(/^\/api\/papers\/(\d+)\/submit$/);
      if (m && request.method === "POST") {
        const { answers, duration_sec } = await request.json();
        const paper = await env.DB.prepare("SELECT * FROM papers WHERE id=? AND user_id=? AND status='ready'").bind(m[1], user.id).first();
        if (!paper) return err(404, "试卷不存在");
        const qs = await env.DB.prepare("SELECT * FROM questions WHERE paper_id=? ORDER BY seq").bind(m[1]).all();
        let score = 0; const detail = [];
        for (const q of qs.results) {
          const ua = (answers[q.id] || "").toUpperCase();
          const correct = ua === q.answer;
          if (correct) score++;
          else await env.DB.prepare("INSERT OR IGNORE INTO wrong_book (user_id,question_id) VALUES (?,?)").bind(user.id, q.id).run();
          detail.push({ id: q.id, seq: q.seq, your: ua, answer: q.answer, correct, analysis: q.analysis, knowledge_point: q.knowledge_point, stem: q.stem, opt_a: q.opt_a, opt_b: q.opt_b, opt_c: q.opt_c, opt_d: q.opt_d });
        }
        await env.DB.prepare("INSERT INTO attempts (user_id,paper_id,answers,score,total,duration_sec) VALUES (?,?,?,?,?,?)")
          .bind(user.id, m[1], JSON.stringify(answers), score, qs.results.length, duration_sec || null).run();
        return json({ score, total: qs.results.length, detail });
      }

      // --- wrong book ---
      if (p === "/api/wrongbook" && request.method === "GET") {
        const rows = await env.DB.prepare(
          `SELECT q.id,q.stem,q.opt_a,q.opt_b,q.opt_c,q.opt_d,q.answer,q.analysis,q.knowledge_point,w.created_at
           FROM wrong_book w JOIN questions q ON q.id=w.question_id WHERE w.user_id=? ORDER BY w.id DESC LIMIT 500`).bind(user.id).all();
        return json({ questions: rows.results });
      }
      m = p.match(/^\/api\/wrongbook\/(\d+)$/);
      if (m && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM wrong_book WHERE user_id=? AND question_id=?").bind(user.id, m[1]).run();
        return json({ ok: true });
      }

      return err(404, "接口不存在");
    } catch (e) {
      return err(500, `服务器错误：${e.message}`);
    }
  },
};
