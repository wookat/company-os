# UX 第 131 轮 + 美工联合走查报告 — app2 每日一题卡 & 打卡分享图（生产 build 18455d9）

- 环境：生产 https://zhenti.zalize.com/app2/ ，硬刷新后实际加载 `assets/index-xNa8KyXp.js`（与 curl 一致，即 18455d9）
- 测试账号（请清库）：**qa131-1785874086@test.zalize.com**（密码 qa131pass；含一条 2024 卷 attempt，为对照旧版 streak 造数）
- 性质：体验官+美工走查（功能 QA 已在 130 轮覆盖），另含 QA130-P1 修复回归。

## 结论总览

| 项 | 结果 |
|---|---|
| W3 QA130-P1 修复回归：揭晓打卡刷新后持久 | ✅ passed |
| W1 每日一题卡信息流层级/可读性 | ✅ 达标（2 条 P3 建议） |
| W2 分享图弹层视觉/下载动线 | ✅ 达标（2 条 P3 建议） |
| W5 与旧版 /app 对照 | ⚠️ **发现 P2 口径缺口（见下）** |
| W4 390px 布局 | ✅ passed（scrollWidth=390） |
| W6 console/pageerror/HTTP≥400 | ✅ 全零（扩展 beacon 豁免） |

## P0–P3 问题清单

**P2：app2「揭晓即打卡」不计入旧版 /app 的连续学习天数（两端 streak 口径不一致）。**
app2 揭晓每日一题 POST /api/checkin 成功、app2 显示「连续学习 1 天」后，打开旧版 /app：头部仍「🔥 今天做一题即打卡」、打卡日历「连续 0 天」、当日格未点亮（F5 后仍如此）。原因：旧版 streak 只统计作答/背诵天数（app.html L255-258 `studyDays()` 用 `attempt_day_ts`/`__subjDayTs`，不读 /api/checkin），而 app2 读 /api/checkin。用户在 app2 打卡后切旧版会看到断签，反之旧版做题打卡 app2 是否认可取决于 checkin 是否同写（本轮旧版做一卷后旧版 streak=1，app2 也为 1——因 app2 已有 checkin 记录，未能区分）。建议：旧版 `studyDays()` 合并 /api/checkin 天数，或 app2 streak 同时并入作答天数，统一口径。
- 证据：app2 已打卡 streak=1 ↔ 旧版日历连续 0 天：
  ![legacy-cal-0](https://app.devin.ai/attachments/a3de3873-d898-495b-b0d6-668b23afcfbc/ss_zoom_3b2085ed.png)

**P3-1：分享弹层无 ESC/右上 × 关闭。** 仅「关闭」按钮与遮罩点击；桌面用户习惯 ESC。建议弹层挂 `onKeyDown Escape` 或右上角 × 。
**P3-2：分享图 🔥 用 emoji 渲染。** 旧版 canvas 特意改矢量火焰（app.html L2212 注释「避免 canvas emoji 跨平台渲染不一致」），app2 makeStreakCard 退回 emoji——Linux/Android/微信内核下火焰样式会不一致，建议复用旧版矢量画法。本机渲染正常，仅为跨平台风险。
**P3-3：解析块一整段密排。** 揭晓后解析 A/B/C/D 逐项解释挤在一个 text-xs 段落（本题 6 行+），建议按「A正确：」分行（`whitespace-pre-line` 或手动 <br>），可读性更好；旧版同样密排，非回归。
**P3-4：pill「分享 ›」可发现性弱。** `text-white/75` 小字在蓝底 pill 内尾缀，注意力弱于旧版日历弹层内的橙色实心「生成打卡分享图」大按钮；但 app2 入口层级更浅（一次点击 vs 旧版两次），互有优劣。可考虑首次达成 streak 时 toast 引导「点头部火焰生成分享图」。

**app2 优于旧版之处（对照结论）**：分享入口一击直达（旧版藏在日历弹层）；分享图直接可下载文件名带天数；每日一题卡视觉更现代（rose 图标位、徽章、emerald ✓）。**app2 不如旧版之处**：上述 P3-2（emoji 火焰 vs 矢量）、P3-4（入口视觉强度）、旧版分享图多一行副标语「历年真题免费在线刷·判分·错题本·分析题背诵」（app2 有同款，实测两者文案一致，无缺失）。

## 走查证据

**W3 P1 修复：揭晓打卡（daily-reveal/checkin 均 200）→ F5 后仍「已打卡 ✓」「连续学习 1 天 分享 ›」**
![persist](https://app.devin.ai/attachments/a4ed5441-2d5a-45d4-a9e2-1158c1af0374/ss_zoom_8fd59379.png)

**W1 折叠态（2026 卡下、今日任务上，克制不喧宾夺主）**
![collapsed](https://app.devin.ai/attachments/a9583825-2652-45e6-88e2-5275037772e4/ss_zoom_226404cd.png)

**W1 揭晓后桌面全貌 / 解析块放大（P3-3 密排）**
![revealed](https://app.devin.ai/attachments/ecd78be7-e865-471d-9033-cd7c03d1c62c/ss_b136ae6a.png)
![analysis](https://app.devin.ai/attachments/a23f71d4-6e0d-4125-a7be-41fb7b589763/ss_zoom_5d906f5c.png)

**W2 app2 分享图弹层（桌面）/ canvas 图放大（emoji 🔥、渐变、域名）**
![share](https://app.devin.ai/attachments/f2b556af-7186-4d4f-b5ee-5a11d830c76a/ss_99d60398.png)
![share-zoom](https://app.devin.ai/attachments/eb1d58a2-18d1-4675-8436-326740260aba/ss_zoom_b4a7f914.png)
下载验证：`~/Downloads/真题工坊打卡1天.png`（487KB）成功落盘。

**W5 旧版对照：日历弹层入口（橙色大按钮）/ 旧版分享图（矢量火焰、640×880）**
![legacy-entry](https://app.devin.ai/attachments/7ad850d2-92a8-46c8-99e3-cfd9e642b915/ss_21bfb4cd.png)
![legacy-card](https://app.devin.ai/attachments/615c2437-31fc-4afc-9f0f-df59246447ea/ss_zoom_d5b2704d.png)

**W4 390px：展开未揭晓 / 揭晓后 / 分享弹层（均 scrollWidth=390 无溢出、不被 tabBar 遮挡）**
![390-open](https://app.devin.ai/attachments/bfcfa347-0a57-4cbf-9fdc-a737fba0d507/ss_ffc7fbd4.png)
![390-revealed](https://app.devin.ai/attachments/8b981538-2f7a-4f80-872b-7150ff3d2333/ss_fe5a7a1f.png)
![390-share](https://app.devin.ai/attachments/0ff01bdb-97de-4baa-bd3d-6d18310d8ce2/ss_6af181b9.png)

**桌面回归：右栏近四周打卡当日格点亮、弱项榜出数**
![desktop](https://app.devin.ai/attachments/284bdfd4-0b64-48f7-8c16-3332c8d7cac6/ss_de05c85a.png)

## 监控与口径说明
- console error 仅扩展拦截 Cloudflare beacon（既知豁免）；无 pageerror；`performance` 中 `responseStatus>=400` = 0。
- 本轮 API 全程快（checkin 127–285ms），未自然触发 20s 超时路径，「打卡未保存…请重试」toast 与回滚未实测（代码路径 18455d9 已确认存在）——标 untested。
- 造数说明：为渲染旧版分享图（旧版 streak 只认作答），在旧版做 2024 免费卷 1 题提前交卷；期间「做 2024 年真题卷」按钮首次点击约 40s 无响应（生产 API 间歇性慢，既知），重试后正常。
