# QA158b · 工作台「本周摘要」窄屏近四周热力格（build 4ce3333，bundle index-BKZ-tePV.js 已确认含改动）

代码依据：web/src/pages/Home.tsx L583-592 —— 本周摘要 Card 内 `div.mt-3.xl:hidden`：`近四周打卡`（streak>0 时 `· 连续 N 天 🔥`）+ `grid grid-cols-7 gap-1` 28 个 span（学习日 bg-brand-500，否则 bg-black/5，today 亮=daySet 含今日）。daySet = /checkin days ∪ attempt 日（L255-259）。右栏 HomeRail L727「近四周打卡」不变。xl=1280px。

账号：注册 qa158b-<ts>@test.zalize.com，登录 app2 工作台，点「今日打卡」制造今日学习日（toast「今日打卡成功 ✓…」）。报 uid。

## T1 390px 移动端新块显示
- CDP 设 390×844 mobile，硬刷新工作台。
- 断言：本周摘要卡内出现文本「近四周打卡 · 连续 1 天 🔥」；其下 7 列网格恰好 28 个格；最后一格（今日，title=今日日期）为品牌色点亮，其余 27 格灰。截图留证 + DOM 计数（cells=28、bg-brand-500=1、亮格 title=today）。
- 溢出：innerWidth=390、scrollWidth=390。
- 失败判据：块缺失 / 格数≠28 / 今日格未亮 / 无「连续 1 天 🔥」/ 横向溢出。

## T2 1440px 桌面隐藏 + 右栏照旧
- CDP 恢复桌面（set mobile:false → clear），1440 宽。
- 断言：本周摘要卡内该新块不可见（xl:hidden 生效，getBoundingClientRect 高 0 或 display:none）；右栏仍有「近四周打卡」卡片、28 格、今日亮。截图留证。
- 溢出：scrollWidth=1440。

## T3 运行时
- 全程 CDP 监听：console error / pageerror / HTTP≥400 = 0。

产出：test-report-158b.md、截图（390/1440）、可选短录屏、uid。
