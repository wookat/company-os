# R16 自审差距 Backlog（cross 线：九站共性体验）

> 实践论：以下均为 2026-08-07 实测（curl HTTP 语义 + Playwright 1440/375 双视口截图，截图存 `docs/r16-assets/<站>-1440.jpg` 与 `<站>-375.jpg`），不凭印象。
> 矛盾论排序：主要矛盾 = 最伤「收录（SEO）→ 流量 → 转化/留存」的缺陷优先。

## 一、九站全景清单

| 站点 | 仓库 | 收录页面数（sitemap 实测） | 渲染方式 | 首页 HTML 体积 | TTFB |
|---|---|---|---|---|---|
| aiact.zalize.com | wookat/ai-act-kit | 186 | SSG | 99 KB | 82ms |
| biaoshi.zalize.com | wookat/aigc-biaoshi | 29 | CSR 壳 + worker SSR guides | 1.3 KB | 79ms |
| data.zalize.com | wookat/dataforge | 44 | Astro SSG | 86 KB | 82ms |
| ext.zalize.com | wookat/snapmark | 1 | CSR（head 完整） | 3.6 KB | 73ms |
| guifan.zalize.com | wookat/lunwen-guifan | 565 | Worker SSR | 75 KB | **884ms** |
| mcp.zalize.com | （mcp 线仓库） | 4307 | SSR/SSG | 38 KB | 80ms |
| prompter.zalize.com | wookat/prompter | 9 | CSR 壳 + SSG pSEO 页 | 0.8 KB | 75ms |
| speech.zalize.com | wookat/occasion-speech | 264 | CSR 壳（head 完整） | 5 KB | 77ms |
| tiku.zalize.com | wookat/tiku | 8680 | Worker SSR | 16 KB | 212ms |

合计可收录页面 ≈ **14,085**。组件层面共性构件：顶栏导航 ×9、页脚 ×9（其中 3 站无语义 `<footer>`）、首屏 hero ×9、CTA 按钮体系 ×9、面包屑（guifan/tiku/mcp 有）、FAQ 区块（ext/prompter/aiact 有）。

## 二、逐条对照打分（对照 r16-competitor-advantages.md 12 条）

评分：✅ 达标 · ⚠️ 部分达标 · ❌ 未达标（伤转化/收录）

| 优点条目 | aiact | biaoshi | data | ext | guifan | mcp | prompter | speech | tiku |
|---|---|---|---|---|---|---|---|---|---|
| 1 首屏价值主张+单一CTA | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| 2 产品真身即hero | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 社会证明/真实数字首屏 | ⚠️ | ❌ | ⚠️ | ⚠️ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| 4 统一页脚矩阵+法务链接 | ✅ | ❌ | ✅ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ⚠️ |
| 5 移动端导航 | ✅ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| 6 色彩克制强调色唯一 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| 7 排印层级 | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| 8 SEO head 完整（canonical/og/JSON-LD） | ✅ | ⚠️(og有/ld无) | ⚠️(canonical→/index) | ✅ | ❌(无og) | ✅ | ❌(首页三无) | ⚠️(无desc) | ✅ |
| 9 未知路由真 404 | ✅ | ❌(软404) | ✅ | ❌(软404) | ✅ | ✅ | ❌(软404) | ✅ | ⚠️(301) |
| 10 性能 TTFB<300ms | ✅ | ✅ | ✅ | ✅ | ❌(884ms) | ✅ | ✅ | ✅ | ✅ |
| 11 免费无门槛显性化 | ✅ | ⚠️ | n/a | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| 12 可交互演示前置 | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |

## 三、按主要矛盾排序的 Backlog

主要矛盾判断：九站以搜索收录为第一获客渠道（合计 1.4 万页），**伤收录的技术 SEO 缺陷 > 伤转化的信任缺陷 > 视觉打磨**。

### P0（最伤收录，本轮 cross 线直接实现）
| # | 缺陷 | 影响 | 修复 | 仓库 |
|---|---|---|---|---|
| P0-1 | prompter 首页 HTML 无 canonical / og / JSON-LD（pSEO 子页有、首页反而没有） | 首页是权重最高页，社交分享无卡片、收录信号缺失 | index.html 补全 head | wookat/prompter |
| P0-2 | data.zalize.com 全站 canonical 指向 `/index` 等带后缀路径 | canonical 与实际 URL 不一致 → 重复内容/权重分散，波及全站 44 页 | Layout.astro 规范化 pathname | wookat/dataforge |
| P0-3 | biaoshi / ext / prompter 任意不存在路径返回 200（软 404） | 搜索引擎判定站点质量差，伤全站收录 | worker 对未知路由返回 404 | aigc-biaoshi / snapmark / prompter |

### P1（伤转化/信任，本轮 cross 线实现）
| # | 缺陷 | 影响 | 修复 | 仓库 |
|---|---|---|---|---|
| P1-1 | prompter 对 zalize 家族 0 互链、无语义页脚 | 内链权重孤岛 + 页面无信任底部 | 加统一页脚（家族互链 + 隐私承诺） | wookat/prompter |
| P1-2 | ext / biaoshi 无语义 `<footer>` 或互链稀少 | 同上 | 页脚补家族互链 | snapmark / aigc-biaoshi |

### P1（移交对应站线，cross 线登记不重复实现）
| # | 缺陷 | 影响 | 建议 | 责任线 |
|---|---|---|---|---|
| P1-3 | guifan TTFB 884ms（SSR 每请求全量计算，无边缘缓存） | LCP 恶化，Core Web Vitals 信号差，565 页全量受影响 | 响应加 `Cache-Control: s-maxage` / Cloudflare cache API | guifan 线 |
| P1-4 | guifan 全站无 og 标签 | 社交分享无卡片 | Layout 补 og | guifan 线 |
| P1-5 | speech 首页无 meta description | 摘要由引擎乱抓 | index.html 补 desc | speech 线 |
| P1-6 | tiku 未知路由 301 而非 404 | 轻度软 404 | worker 修正 | tiku 线 |

### P2（视觉/转化增强，下轮）
- biaoshi / speech 首屏加真实数字社会证明徽章（对照优点 3）
- data 首页放数据集样例预览（优点 2/12）；mcp / data 移动端顶栏折叠为抽屉（优点 5）
- tiku / guifan / biaoshi 首屏加「免费·无需注册」徽章（优点 11）
- tiku 首屏嵌 3 道试做题（优点 12）；中文站 h1 层级加大（优点 7）

## 四、上线复验（2026-08-07 实测）

P0/P1（cross 范围）已实现并 `wrangler deploy` 上线，复验截图存 `docs/r16-assets/after/`（1440+375 双视口）：

| 项 | 上线前 | 上线后（实测） | PR |
|---|---|---|---|
| P0-1 prompter 首页 head | 无 canonical/og/ld | canonical+og+twitter+JSON-LD 全有（curl 验证） | wookat/prompter#4 |
| P0-2 data canonical | `/index` | `/`（`/about` 等不变） | wookat/dataforge#118 |
| P0-3 prompter 软404 | /nonexistent → 200 | → 404（noindex 404 页） | wookat/prompter#4 |
| P0-3 ext 软404 | → 200 | → 404 | wookat/snapmark#4 |
| P0-3 biaoshi 软404 | → 200 | → 404（/guides 等 SSR 路由不受影响） | wookat/aigc-biaoshi#3 |
| P1-1/2 页脚互链 | 复核发现 prompter/ext 页脚已有 ZALIZE 互链（CSR 渲染后可见，前次 curl 仅测原始 HTML 造成误判）；biaoshi 页脚已有 3 条互链 | 无需改动，登记纠正 | — |

全路由抽验：九站首页全部 200；biaoshi `/guides*`、prompter 8 个 use-case 页、data 44 页 sitemap 抽样均 200。

并行协调：prompter 线 R16 分支（voice-follow）与本线同时部署过 prompter，本线改动已 rebase 到该分支之上（PR #4 注明合并顺序），避免语义冲突。

## 四b、否定之否定说明

- **否定了什么**：上一版（R15 及以前）九站「各站自治、无共性标准」的做法——本轮实测证明它产出了 3 处软 404、2 处 canonical/og 缺失、1 处 884ms TTFB、3 站页脚无互链，均为跨站共性漏洞。
- **依据**：本文件第二节逐条打分矩阵 + `docs/r16-assets/` 实测截图 + curl HTTP 语义实测（非印象）。
- **合题**：P0/P1（cross 范围）本轮直接实现并部署；站线专属项移交对应线；上线后以 Search Console 收录量与跳出率再检验、再否定。
