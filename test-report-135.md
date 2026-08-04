# QA 第 135 轮测试报告 — 成绩分享图新功能 + QA134 P4 复验（生产 build aa798d9）

- **对象**：生产 https://zhenti.zalize.com/app2/ ，实际加载 `assets/index-DoWAKKog.js`（与 curl 到的 aa798d9 产物一致）
- **测试账号（请清库）**：`qa135-1785877864@test.zalize.com`
- **造数**：UI 注册新号 → 2026 考研政治真题卷答 2 题提前交卷 → 成绩页 `#result/320`（页面值：1/33、正确率 3%、击败了 34% 的研友）
- **录屏**：`/home/ubuntu/screencasts/rec-637cc942-2672-4ab8-bef9-4cac27b1018a/rec-637cc942-2672-4ab8-bef9-4cac27b1018a-edited.mp4`

## 结论总览

| # | 断言 | 结果 |
|---|------|------|
| T1-A | 成绩页有「📷 生成成绩分享图 ›」按钮，卡片内容与页面分数逐字一致 | ✅ passed |
| T1-A2 | 分数环按正确率比例（3% → 仅顶部一小段白弧） | ✅ passed |
| T1-B | 弹层三路关闭：ESC / 右上 ✕ / 点遮罩 | ✅ passed |
| T1-C | 「保存图片」下载 真题工坊成绩单.png（PNG 640×800，469KB） | ✅ passed |
| T1-D | 390px 弹层完整不裁切，scrollWidth=390 | ✅ passed |
| T2 | 390px 新版本胶囊单行（36px，QA134 为两行 60px）、视口内无溢出 | ✅ passed（残留 P4 见下） |
| T2-负例 | 不拦截派发 visibilitychange，胶囊数=0 不误报 | ✅ passed |
| T3 | 直刷 #result/320 正常渲染、console/pageerror 清零 | ✅ passed |
| T3 | 每日一题卡可展开、揭晓前无答案泄漏 | ✅ passed |
| T3 | favicon 301→/icon-192.png 200，无 404；HTTP≥400=0 | ✅ passed |

## Escalation

- **P4 残留：390px 胶囊底边与 hero 问候行仍有约 8px 几何重叠。** 实测胶囊 rect y=12–48（高 36px 单行，较 QA134 两行 60px 明显改善），hero「你好，qa135-…」rect y=40–60，顶部滚动位时胶囊底边轻微盖住问候文字上缘。视觉上比 QA134 好很多且不遮挡任何控件，建议如需彻底消除可将 hero 区顶部 padding +8px 或胶囊 top-3 改 top-2。

## T1 成绩分享图（核心，1440px）

页面值：`1/33`、`正确率 3%`、`击败了 34% 的研友`。点击「📷 生成成绩分享图 ›」后弹层：

| 🔴 成绩页（1440px） | 🟢 分享图弹层 |
|---|---|
| ![成绩页](https://app.devin.ai/attachments/8912f086-5bc2-40fb-a20f-1077d43976a9/ss_b23c8953.png) | ![弹层](https://app.devin.ai/attachments/913bb0b3-fbce-4ca6-98e5-de6e7db385fc/ss_e6c04849.png) |

卡片放大比对（标题「真题工坊 · 成绩单」/「2026 考研政治真题卷」/大分数 1/「/ 33 题 · 正确率 3%」/「击败了 34% 的研友」/产品说明/域名，全部逐字一致；分数环仅顶部一小段白弧，符合 3% 比例）：

![卡片放大](https://app.devin.ai/attachments/b73b02b6-f3e8-4ff8-93fc-3aff1de6c982/ss_zoom_2bdba088.png)

- 三路关闭：ESC ✅、右上白圆 ✕ ✅、点遮罩 ✅（每路后弹层消失，录屏有全程）。
- 保存图片：下载栏出现 `真题工坊成绩单.png 468 KB · Done`；shell 校验 `\x89PNG`、尺寸 640×800、479558 字节。

![保存下载](https://app.devin.ai/attachments/dc3c26ae-45e3-4e57-a2dd-c2f8ded16384/ss_52483250.png)

### 390px 弹层

卡片、✕、保存图片、关闭按钮全部可见可点，未被 tabBar 遮挡；`scrollWidth=390` 无横向溢出：

![390弹层](https://app.devin.ai/attachments/65701984-9b88-4661-9d3c-5ae4c376fea8/ss_4651bf99.png)

## T2 QA134 P4 复验：390px 新版本胶囊

console 覆写 fetch 伪造 `assets/index-FAKE0000.js` + dispatch visibilitychange 后：

- 胶囊 rect `{x:106.3, y:12, w:177.3, h:36}` —— **单行**（QA134 实测两行 60px），x 106–284 完整在 390 视口内，scrollWidth=390。
- className 实测含 `whitespace-nowrap … text-xs sm:text-sm`（d8ff4e3 修复已上线）。
- 残留：底边 48 与 hero 问候 top 40 有 ~8px 几何重叠（见 Escalation）。

![390胶囊放大](https://app.devin.ai/attachments/81ead4b9-a860-4685-849c-041af4789331/ss_zoom_8bbaf8e1.png)

- 负例：F5 清除覆写后再 dispatch visibilitychange，2.5s 后胶囊数=0，不误报 ✅（下图刷新后无胶囊）：

![负例无胶囊](https://app.devin.ai/attachments/c02daa6a-7769-4d7a-a11d-b4f96aa1a6c2/ss_fc9bd4f4.png)

## T3 回归

- 每日一题卡（390px）：折叠→点「做一做 ›」展开，「2013 年第 18 题 · 多选」+题干+ABCD+玫红胶囊「先想好答案，再点我揭晓 ›」，揭晓前无 ✓/答案/解析泄漏 ✅：

![每日一题](https://app.devin.ai/attachments/47312dc7-7b0c-4bfe-a036-8fe4405683da/ss_8574fb36.png)

- 直刷 `#result/320`（F5）：正常渲染，DevTools console「No Issues」、无 pageerror ✅：

![直刷成绩页](https://app.devin.ai/attachments/8e8cc2b2-231a-41d4-bc0e-79e128dc96fe/ss_78f9b896.png)

- `curl -sI /favicon.ico` → 301 location=/icon-192.png；页面资源实测 `icon-192.png 200`，无 favicon 404 ✅。
- `performance` 全程 `responseStatus>=400` 条目 = 0 ✅。

## 备注（噪音豁免）

- 弹层打开状态下 DevTools 对 `data:image/png;base64` 的 `ERR_INVALID_URL` 报错为 DevTools sourcemap 探测噪音（QA132 已定性），图片渲染与下载均正常，非产品错误；直刷负例（弹层未开）console 严格清零。
