# QA 第 144 轮 — UX143 四项修复回归报告（生产 build fb093e9）

- 日期：2026-08-05；bundle 实测 `assets/index-BV7nC1cC.js`（普通 F5 即获得，无需硬刷新）
- 测试账号（请清库）：
  - **qa144a-1785892977@test.zalize.com，uid=210**（1 条打卡）
  - **qa144b-1785892977@test.zalize.com，uid=211**（1 条打卡）
  - **qa144c-1785892977@test.zalize.com，uid=212**（1 条打卡；提醒最终已关，KV `remind:212` 自删无残留）
- 结论：**4 项修复全部实测通过**，无新 P0–P3。
- 录屏：`/home/ubuntu/screencasts/rec-8f64a470-86b1-4a32-aa9b-105fc7c75493/rec-8f64a470-86b1-4a32-aa9b-105fc7c75493-edited.mp4`

## T1 P2-1 引导 toast 可点击 + 计数 — passed

| 🟢 打卡后 ~3.5s：toast 带「去开启 ›」按钮（1440，qa144a） | 🟢 点「去开启 ›」→ 跳 #account，「每日学习提醒」卡在视野（qa144b，toast 尚在） |
|---|---|
| ![hint toast with button](https://app.devin.ai/attachments/1ca03e23-e386-46d8-8fc2-edff488b7886/ss_4757aea2.png) | ![clicked → account](https://app.devin.ai/attachments/ca3002cf-0ee1-4d79-98c8-701728ca5a26/ss_26631ab5.png) |

- 文案逐字「怕忘打卡？可开启每天 8:00 邮件提醒」+ 按钮「去开启 ›」。
- 时长自适应实证：MutationObserver 实测存活 **5200ms** = 20 字×160ms+2000ms（action 加成），旧固定 3000ms 已改。
- 点击导航实证：qa144b 打卡后点按钮 → `location.hash=#account`，截图见「我的」页与提醒卡。
- 计数实证：`zt_remind_hint` 0→'1'（qa144a 打卡）→'2'（qa144b 打卡，同浏览器）——不再是一次性写死。'2'→'3' 封顶通过 F 分支（下节）覆盖；纯 hintN=3 不出 toast 的分支未单独实测（同一浏览器无第四次打卡机会），依据源码 Home.tsx L265 `hintN<3` 判定，标 **partially untested**。

## T2 开提醒后不再提示（d.on 写 3）— passed

qa144c 先开提醒 → `removeItem('zt_remind_hint')` → 打卡：

![no hint toast](https://app.devin.ai/attachments/96bd83d3-8699-494a-ad70-a582f3a42336/ss_95faed76.png)

- 打卡后观察 9s：MutationObserver 全程未捕获「怕忘打卡」toast，截图无 toast；`zt_remind_hint` 直接 = **'3'**（Home.tsx L269 分支实证）。

## T3 P3-2 注册超时 toast 时长自适应 — passed

fetch 包装（never-resolve + abort reject，不打真实请求）：

![timeout toast at 21.5s](https://app.devin.ai/attachments/4d8815e6-e159-4658-b7b8-b1be08949ad0/qa144_t3_toast.png)

- toast 于点击后 **20003ms** 出现（20s abort 生效），存活 **7200ms** = 45 字×160ms（公式 min(8000,max(3000,len×160)) 逐字命中；UX143 时为 3000ms）。
- 21.5s 截图可见完整两行文案，1440 下居中不裁切。

## T4 P2-2 no-store 缓存 — passed

- `curl -I https://zhenti.zalize.com/app2/` → `cache-control: no-store`。
- 浏览器**普通 F5（非硬刷新）**后 `script src = /app2/assets/index-BV7nC1cC.js`（UX143 时普通加载曾拿到旧 bundle `index-DmQjVwRZ.js`，本轮同场景直接命中新包）。

## T5 P3-1 双端文案统一 — passed

![legacy unified copy](https://app.devin.ai/attachments/c729fa4b-5844-464c-90ef-6657923ba302/ss_c4a2253d.png)

- 旧版 /app#account（`?nocache=` 核对）副文案逐字「每天 8:00 发邮件提醒：到期错题数 + 每日一题；当天已打卡则不打扰」，与 app2 完全一致；switch 与 app2 状态同步（开）。

## T6 回归 — passed

| 📱 390px「我的」页（scrollWidth=390 无溢出，提醒卡完整） | 🟢 清理终态：qa144c 提醒已关（toast+灰 switch），GET /remind={"on":false} |
|---|---|
| ![390 account](https://app.devin.ai/attachments/8861f5cc-641f-40f8-8fdb-a761ef111ac5/qa144_390_account.png) | ![remind off](https://app.devin.ai/attachments/fd12cecb-eebe-4a03-baec-065178728a9a/ss_673c19d1.png) |

- console error / pageerror / unhandledrejection 全零（豁免计划内注入与登录探测）；HTTP≥400 仅登录前 401 探测类。

## 环境插曲（非产品缺陷）
1. **qa144a UI 注册静默失败**：点「注册并开始刷题」→「请稍候…」→ 按钮复原、无 toast、无账号（console 复测同邮箱 register 200/156ms 秒过）。非限频（未见 429）。registed 后续 b/c 直接用 console fetch 注册。旧问题（QA142 已报）在快速失败场景下依然无提示——**建议后续排查 register 首次点击的静默吞错路径**（本轮修复针对的是 20s 超时分支，该分支已验 OK）。
2. **Chrome 全程崩溃一次**（访问 /app 慢加载期间），用 `/opt/.devin/chrome/chrome/linux-137.0.7118.2/chrome-linux64/chrome --remote-debugging-port=29229` 重启后继续；重启后 browser_console 工具无法重连 CDP，改用 python websocket（suppress_origin）完成剩余注入与量测。
3. 生产 /app 一次加载 ~40-70s 慢窗口（既知）。
