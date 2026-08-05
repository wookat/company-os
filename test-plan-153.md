# 第 153 轮 — UX152 P3×2 修复快速复验（build a757fd8，bundle index-CtNxTDus.js 已上线）

前提（已核实）：Real.tsx L231-243 新增就地过滤 input（placeholder「输考点名就地过滤，如“量变”“抗日”…」，`rows.filter(k=>k.kp_name.includes(kpQ))` + 空分组 `.filter(rows.length>0)` 隐藏 + 分组标题追加「（已过滤）」）；chip class 改 `min-h-[40px] sm:min-h-[32px]`（<640px 40px，≥640px 32px）。部署 bundle 已含两类 class。注册新号 qa153（报 uid 清库）。

## T1 就地过滤（1440，截图）
1. app2 #real → 按考点：断言过滤框可见（放大镜图标+胶囊输入框，placeholder 逐字）。
2. CDP Input.insertText 输「量变」：断言仅剩含「量变」的 chip（预期 1 个「量变质变规律」）、仅马原分组保留且标题带「（已过滤）」、其余 4 个分组消失（截图）。
3. 清空输入：断言恢复 120 chip / 5 分组、无「（已过滤）」后缀。
4. 再过滤「抗美」→ 点「抗美援朝 2 题」chip：断言正常进入组卷（跳 exam 页出题，免费真题不占 AI 额度），进入后退出不作答。
失败判据：无过滤框 / 输入后列表不变 / 空分组仍显示 / 过滤态点 chip 无响应或报错。

## T2 chip 热区（CDP 量测）
- 390px 视口：chip getBoundingClientRect().height ≥40px（全部 chip）。
- 1440px：chip 高 =32px（保持不变）。
失败判据：390 下仍 32px 或 1440 变 40px。

## T3 常规回归
- CDP 监听 #real 重载+过滤操作全程：console error / pageerror / HTTP≥400 = 0（豁免自测探测）。

产出：test-report-153.md（关键截图，无需录屏）+ qa153 uid。
