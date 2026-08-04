# QA 第 140 轮测试报告 — 旧版 /app 交卷防重复修复（生产回归）

- 目标：https://zhenti.zalize.com/app （Worker Version 97cd7711；页面 meta `app-build=07780f5-202608042224`，浏览器内实测 `typeof SUBMITTING === 'boolean'` 且 `submitExam` 源码含防重入守卫，`.js-submit` 已在部署 HTML 中，确认新代码已上线）
- 测试账号（请清库）：**qa140-1785882631@test.zalize.com，uid=202**（产生 attempt：paper 329=1/33、330=0/31、331=1/32（409 对抗）、332=1/33，均各 1 条）
- 时间：2026-08-04 22:30–22:42（北京）
- 录屏：/home/ubuntu/screencasts/rec-e222a0f0-16cd-476d-8c39-40d98bf56eec/rec-e222a0f0-16cd-476d-8c39-40d98bf56eec-edited.mp4

## 结论

**本轮 5 个验收点全部通过。** QA139 发现的 P3（慢网双击造重复 attempt）已确认修复：延迟 6s 的 /submit 挂起期间狂点 5 次，仅 1 次 POST、按钮 disabled+「交卷中…」、历史仅 1 条。

## T1 正常交卷（2026 卷，pid=329）— passed

答 2 题提前交卷 → 直接落 `#result/329`（网络快，pending 一闪而过未截到，属预期允许口径）。
- performance 中 `/papers/329/submit` POST **仅 1 条**（200，324ms）✅
- `zt_exam_329` = null ✅
- /api/history 中 paper 329 仅 1 条 attempt ✅
- 回归：3% 低分成绩页无「击败了 X%」行，grade 评语「打基础期，锁定 28 个薄弱考点逐个拿下」在位 ✅

## T2 双击防重复（核心对抗，2025 卷，pid=330）— passed

console 包装 fetch 将 /submit 响应延迟 6s（请求照发并计数）。点「确定交卷」后立刻连点交卷入口 5 次：

| 断言 | 结果 |
|---|---|
| pending 期间按钮文案「交卷中…」且 `disabled=true`（截图可见） | ✅ |
| `__submitN === 1`（5 次狂点只发出 1 次 POST；QA139 旧行为为 2 次 200 双入库） | ✅ |
| 延迟结束落 `#result/330`，`zt_exam_330`=null，历史仅 1 条 | ✅ |

![T2 pending 态：按钮变「交卷中…」且 disabled](https://app.devin.ai/attachments/5000968a-1faa-437b-812c-7bc83caf4e56/ss_zoom_1db0980c.png)

## T3 409 对抗（2024 卷，pid=331）— passed

console 带 token 先 POST `/papers/331/submit`（200 入库）→ UI 点「提前交卷→确定交卷」实收 **409** → **直接落 `#result/331`** 成绩页，无错误 toast。
- performance：`331/submit` = 200（手动）+ 409（UI）✅
- `zt_exam_331` = null ✅
- /api/history 中 paper 331 仅 1 条 attempt（409 未造第二条）✅

![T3 409 后直接进成绩页 result/331](https://app.devin.ai/attachments/fc0d2e5c-37a9-47e5-bcce-6e4c5a2cb734/ss_17807704.png)

## T4 非 409 失败恢复（2023 卷，pid=332）— passed

console 包装 fetch 对 /submit 首次调用 `reject(TypeError('Failed to fetch'))` 模拟断网 → UI 交卷：
- toast「Failed to fetch」出现（截图）✅
- 按钮恢复原文案「提前交卷（1/33）」、`disabled=false`、无 opacity-60、`SUBMITTING=false` ✅
- 计时恢复走动（0:43 → 2.5s 后 0:45）✅
- 随后真实网络重试交卷 → 落 `#result/332`，仅 1 次 200 POST、1 条 attempt、draft 清除 ✅

![T4 失败态：toast 报错、按钮已恢复原文案可点](https://app.devin.ai/attachments/a835805f-8306-4806-bdcd-5abadfe2f254/ss_c24f41ce.png)

![T4 重试成功落 result/332](https://app.devin.ai/attachments/47e94a38-25f4-4b5d-b01b-3b35333a64e1/ss_2154dfc6.png)

## T5 回归 — passed

- **390px**（CDP 设备仿真）：工作台与成绩页 `innerWidth=390, scrollWidth=390` 无横向溢出；底部 tabBar 正常。
- 1440/桌面视口全程正常（见各流程截图）。
- 每日一题卡在工作台正常显示（「每日一题 … 做一做 ›」）。
- console/pageerror/unhandledrejection 全零；HTTP≥400 仅计划内 1 条 `409 /api/papers/331/submit`。
- 备注：浏览器 localStorage 残留 `zt_exam_322` 为前几轮遗留旧草稿（非本轮产物、QA139 已记录）。

| 390px 工作台 | 390px 成绩页 |
|---|---|
| ![390 工作台](https://app.devin.ai/attachments/880b49d6-2ec8-4c47-b4fd-2bd5431f4406/qa140_390_home.png) | ![390 成绩页](https://app.devin.ai/attachments/5285b9db-c2b7-4635-a189-3f532bfe151b/qa140_390_result.png) |

## 未覆盖 / 说明

- 末题主「交卷」大按钮的 pending 态未单独目击（两次对抗均走「提前交卷」文字链；两入口共用同一 `.js-submit` 选择器与同一段 disable 代码，机制一致）。
- 正常交卷的 pending 文案因真实网络 ~300ms 过快未肉眼可见（验收口径允许「短暂出现或直接进成绩页」）。
- 慢网注入方式为 console 包装 fetch（延迟响应/单次 reject），属计划内注入手段，请求本身照常发往生产。

## T1 低分成绩页（回归证据）

![T1 2026 卷 1/33 低分成绩页，无击败行](https://app.devin.ai/attachments/5cbc3d5e-2d50-4917-9386-ad4e6e0d06a0/ss_d5ee8976.png)
