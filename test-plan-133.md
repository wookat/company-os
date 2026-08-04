# QA 第 133 轮 — QA132 P3×2 修复复验 + 慢API观测 + 看板旧端 PV（生产 build 5d125a3）

部署核对（已完成）：app2 curl=assets/index-DHpn1K-p.js（执行时再与浏览器 document.scripts 比对）。
代码依据：f8ad21a Home.tsx L173 解析 split 正则改 `(?=[A-D](?:项|正确|错误|对|错))`；HomeRail L587-593 近四周格改 checkin ∪ stats.attempt_day_ts；556f7e6 src/index.js 慢请求(>5s)记 KV slowlog（近50条，路径数字归 N）+ admin.html #daily-reveal amber 徽标；5d125a3 pv:app1: 计数 + 看板 PV 行 title/括号加「旧端N」。admin 鉴权：/admin 登录框存 sessionStorage zt_admin_key，请求带 Bearer（src/index.js L1046-1051 亦接受 X-Admin-Key）；key 在 ~/.zhenti_admin_key（勿打印，输入用 xdotool type --file 或 curl -H 从文件读）。

账号：新号 qa133-<ts>@test.zalize.com（报邮箱清库）。**关键顺序：先作答后揭晓**——揭晓会 POST /checkin，会污染②的"无 checkin 仅作答"前置。

## T1 近四周打卡格并集（QA132 P3-2 复验，1440px）
1. 新号在 app2 真题库做 2026 卷：答第 1 题任意项 → 提前交卷（作答产生 attempt，不产生 checkin）。
2. 回 #home 硬刷新（1440 三栏）。
   - 断言 A：头部「已打卡 ✓」+「连续学习 1 天」。
   - 断言 B（本轮核心）：右栏「近四周打卡」**最后一格（今日）为品牌蓝 bg-brand-500 点亮**——QA132 同前置下 28 格全灰，此断言可区分新旧。截图必须拍到右栏。
   - 断言 C（反证）：带 Bearer zt_token 请求 /api/checkin 返回 days=[]。

## T2 每日一题解析分行（QA132 P3-1 复验）
展开每日一题 → 揭晓（此时打卡已因作答显示，checkin POST 照常发生，不影响）。
- 断言：解析「A正确：…/B正确：…/C错误：…/D正确：…」各自独立成行（若今日题已轮换为其他措辞题，按实际措辞判断是否被 `[A-D](?:项|正确|错误|对|错)` 命中并分行；不命中则如实记录 untested/finding）。QA132 同题为一整段密排——对照可区分。
- 390px 下同解析块复查行距/换行 + scrollWidth=390。

## T3 /admin 看板：旧端 PV 分项 + 慢API徽标
1. 先在无痕/当前浏览器访问一次 https://zhenti.zalize.com/app （产生今日 a1 计数；用户称今日 a1≥1 已有）。
2. 打开 /admin，登录（xdotool type --file ~/.zhenti_admin_key）。
   - 断言 A：公开 PV 行今日项括号内含「旧端N」且 N≥1；hover title 含「旧客户端 N」。旧版本此处无「旧端」字样——可区分。
3. 慢API：shell 用 `curl -H "X-Admin-Key: $(cat ~/.zhenti_admin_key)" https://zhenti.zalize.com/api/admin/searches` 检查响应含 `slow_api` 数组（字段存在即部署生效；数组可为空——slowlog 今日才上线）。
   - 若 slow_api 非空：看板搜索区应显示 amber「慢API(>5s) 近N条 · 最新 <path> Xs」徽标（截图）；若为空：徽标应**不显示**（也截图），并如实记录"无慢请求入账，徽标隐藏逻辑通过、入账路径未触发"。测试全程若遇 >5s 请求，复查 slowlog 是否入账。

## T4 监控（常规）
console/pageerror=0（扩展 beacon、登录前 401 豁免）；HTTP≥400=0；390/1440 无横向溢出。

执行顺序：注册（不打卡）→ 做 2026 卷 1 题交卷 → T1（1440 右栏格）→ T2（揭晓+分行，390 复查）→ T3（/app 访问 → /admin）→ T4 汇总。
产出：test-report-133.md（内嵌截图）+ 录屏 + 测试邮箱。
