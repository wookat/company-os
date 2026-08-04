# QA 第 132 轮 — 两端 streak 口径统一 + app2 分享图/解析/引导（生产 build 38a8609）

Bundle 核对（已完成）：app2 curl=assets/index-COfXQLw4.js；/app meta app-build=38a8609-202608042021。
代码依据：Home.tsx diff（daySet = checkin ∪ stats.attempt_day_ts；矢量火焰 bezier #fb923c；ESC useEffect；✕ absolute -top-2.5 -right-2.5；解析 split(/(?=[A-D]项)/)；toast 追加引导）；app.html L256-260 studyDays 并入 dailyDays()（localStorage zt_daily_<uid>，L892 syncDailyDays 于工作台加载时异步拉 /api/checkin）。

账号：两个新号（均报邮箱清库）：
- A = qa132a-<ts>@test.zalize.com（正向：app2 打卡 → 旧版点亮）
- B = qa132b-<ts>@test.zalize.com（反向：旧版作答 → app2 已打卡）

## T1（账号 A）app2 手动打卡 toast 引导 + 正向同步
1. app2 新号 streak=0、「今日打卡」。点头部「今日打卡」按钮。
   - 断言 A：toast 文案 =「今日打卡成功 ✓，点头部「连续学习」可生成分享图」（旧版本无「点头部…」尾巴）。截图必须拍到 toast。
   - 断言 B：pill 变「已打卡 ✓」、「连续学习 1 天 分享 ›」。
2. 打开旧版 /app 工作台（同账号；等待每日一题卡渲染，必要时 F5 一次让 syncDailyDays 落 localStorage）。
   - 断言 C：头部「🔥 连续学习 1 天」（非「今天做一题即打卡」）；打卡日历当日格 🔥 点亮、「连续 1 天」。**旧行为（18455d9）此处必为 连续 0 天**——本断言可区分新旧。

## T2（账号 B）反向：旧版作答 → app2 已打卡
1. 新号 B 不做任何打卡/揭晓。在旧版 /app 做 2024 免费卷：答第 1 题任意项 → 提前交卷。
2. 打开 app2 #home（硬刷新）。
   - 断言 A：头部「已打卡 ✓」+「连续学习 1 天 分享 ›」。
   - 断言 B（反证）：performance 中 GET /api/checkin 返回后 daySet 仍来自 attempt——用 console 确认 `(await (await fetch('/api/checkin',{credentials:'include'})).json()).days` 为空数组（即 UI 的已打卡纯靠 attempt_day_ts 并集；旧行为此处必显示「今日打卡」/streak 0）。

## T3（账号 A）分享图弹层：矢量火焰 + ✕ + ESC
1. 点 pill「分享 ›」打开弹层。
   - 断言 A：canvas 图火焰为**橙色矢量曲线形**（非 emoji 🔥 样式——与 131 轮截图对比：emoji 有黄芯多色渐变，矢量为纯 #fb923c 单色形状）；右上角浮出白色圆形 ✕ 按钮（-top-2.5 -right-2.5 shadow）。
   - 断言 B：按 ESC → 弹层关闭。
2. 再开一次 → 点 ✕ → 关闭。再开 → 遮罩点击关闭（回归）。

## T4（账号 A）每日一题解析分行
展开每日一题 → 揭晓。
- 断言：解析在「A项/B项/C项/D项」处分行（每段独立一行）。**对抗性注意**：split 正则为 `(?=[A-D]项)`，而当前每日题（2013#18）解析用「A正确：/B正确：」措辞——若不含「X项」字样则不会分行，此时如实记录为发现（修复对该题无效），并给出正则建议 `(?=[A-D](项|正确|错误))`。

## T5 双视口 + 监控
- 390px（账号 A）：分享弹层 ✕ 不被视口裁切（✕ 超出卡片右上 -10px，需确认 max-w-xs + p-4 下仍完整可见）；scrollWidth=390。
- 1440：弹层居中、✕ 可点。
- console/pageerror=0（扩展 beacon 豁免）；HTTP≥400=0（登录前 401 豁免）。

执行顺序：A 注册→T1.1（toast）→T4（揭晓+解析）→T3（弹层）→T5(390)→T1.2（旧版正向）→ B 注册→T2 →监控汇总。
产出：test-report-132.md（内嵌截图）+ 录屏 + 两个测试邮箱。
