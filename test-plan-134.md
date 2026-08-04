# QA 第 134 轮 — favicon 301 / admin searches 并行提速 / app2 新版本刷新胶囊（生产 build c8d8cbd）

部署核对（已完成）：app2 curl=assets/index-BpX319Qd.js；favicon.ico curl -sI 已见 301 → /icon-192.png。
代码依据：c8d8cbd web/src/components/Layout.tsx useUpdateAvailable()——比对 document.scripts 中 /app2/assets/index-*.js 与 fetch('/app2/index.html',{cache:'no-store'}) 的 `assets/index-[\w-]+\.js`，不一致 setStale；visibilitychange(visible) 与 30min interval 触发；胶囊 `fixed top-3 left-1/2 z-50 bg-brand-500 rounded-full` 文案「新版本已发布 · 点此刷新 ↻」，onClick=location.reload()。6d4ae38 favicon 301 + admin searches KV 并行。

账号：新号 qa134-<ts>@test.zalize.com（报邮箱清库）。

## T1 favicon
- shell 断言：`curl -sI /favicon.ico` = 301 且 location=/icon-192.png；`curl -sIL` 最终 200 content-type image/png（旧行为 404）。
- UI 断言：app2 标签页 tab 显示网站图标（截图，QA133 时 /admin 曾报 favicon 404；本轮 performance 中不得再有 favicon 404）。

## T2 admin searches 提速
- `curl -w '%{time_total}'` 带 X-Admin-Key（读 ~/.zhenti_admin_key，勿打印）连打两次：断言第 2 次（热）<2s（QA133 实测 8.7–9.7s，可区分）。
- 断言响应 JSON 含 searches/pub_searches/zhenti_pv（今日项含 a1/a2 字段）/daily_reveal/seo_intents_7d/slow_api 且非空结构合理。
- /admin UI 抽查：登录后看板搜索区/PV 行渲染正常（截图）。注意：slow_api 里 QA133 的 2 条旧记录仍在 TTL 内属正常。

## T3 app2 新版本胶囊（核心）
前置：登录 app2 #home，1440px。
1. 负例：不做任何拦截，console `document.dispatchEvent(new Event('visibilitychange'))` → 等 2s 截图，断言**无**「新版本已发布」胶囊（fetch 返回真实 bundle 名一致）。
2. 正例：console 覆写 fetch——仅当 url 含 '/app2/index.html' 返回伪 HTML（bundle 名 `assets/index-FAKE0000.js`），其余透传原 fetch；再 dispatch visibilitychange。断言 2s 内顶部居中出现蓝色胶囊「新版本已发布 · 点此刷新 ↻」（截图，1440）。
3. 390px（设备模式）下胶囊仍完整可见、不遮挡头部内容、scrollWidth=390（截图）。
4. 鼠标点击胶囊 → 断言页面整体刷新（网络重新加载、覆写失效），刷新后胶囊**不再出现**。
对抗性：负例先行证明"胶囊不是无条件渲染"；伪 bundle 名与真实名不同才触发，证明比对逻辑真实工作。

## T4 常规回归 + 监控
- 每日一题卡存在可展开、头部打卡/streak 区正常（新号 streak=0「今日打卡」）。不重测 QA133 已验证的并集/分行细节。
- console/pageerror=0（扩展 beacon、登录前 401 豁免；T3 的 fetch 覆写为本人操作注明）；HTTP≥400=0 且**无 favicon 404**；390 无横向溢出。

执行顺序：T1(shell)→T2(shell+/admin UI)→注册 qa134→T3（负例→正例 1440→390→点击刷新）→T4 汇总。
产出：test-report-134.md（内嵌截图）+ 录屏 + 测试邮箱。
