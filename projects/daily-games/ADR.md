# Daily Games（DG）架构决策记录（ADR）

- 作者：tech-lead
- 日期：2026-07-31
- 状态：Accepted（按 CHARTER §3.4「提议即默认方案」，如无异议即按此执行）
- 配套文档：`TECH-SPEC.md`（工程 spec，含接口/数据模型/目录结构细节）
- 代码落地仓库：https://github.com/wookat/zalize-games

各 ADR 结构：背景 → 备选 → 决策 → 理由 → 后果/可逆性。

---

## ADR-001 Monorepo：pnpm workspaces + Vite + Turborepo（缓存可选）

**背景**：6-10 款游戏 + 门户 + 3 个共享包，需要多实例（每款游戏一名工程师会话）并行开发互不阻塞。

**备选**：a) pnpm workspaces（+可选 turbo）；b) npm workspaces；c) Nx；d) 多仓。

**决策**：pnpm workspaces 为唯一包管理（root `packageManager` 字段钉版本，corepack 启用）；构建统一 Vite 7；任务编排先用 pnpm `--filter` + GitHub Actions matrix，游戏数 >5 且 CI 变慢后再引入 Turborepo 远程缓存（增量决策）。

**理由**：pnpm 是 2026 年 monorepo 事实标准（安装快、磁盘省、幽灵依赖隔离严格）；Nx 对本项目复杂度过重，违反「不为炫技引入复杂度」；多仓会让共享包联动成本爆炸。Vite 是当前主流构建器，Svelte/Preact/vanilla 全部一等支持，产物可控。

**后果**：所有 app/package 必须声明显式依赖（pnpm 严格模式）；可逆性高——workspaces 结构不锁死任何框架。

---

## ADR-002 前端框架：默认 Svelte 5，Canvas 品类用 vanilla TS + game-kit；不用 React

**背景**：每款游戏要求体积小、首屏快（Poki 审核硬指标：加载慢直接砍流量；移动端 3G/4G 用户占比高）。

**备选对比（hello-world 级 gzip 运行时体积 + 取舍）**：

| 方案 | 运行时体积(gz) | 优点 | 缺点 |
|---|---|---|---|
| React 19 | ~45 KB | 团队最熟（thesis-copilot 等在用）、生态最大 | 对 30-80 KB 总预算的小游戏来说运行时占比过高 |
| Preact 10 | ~4.5 KB | React 心智模型、体积小 | signals/hooks 生态碎、compat 层坑多 |
| Svelte 5 (runes) | ~3-6 KB（编译期消失，随组件量线性） | 无虚拟 DOM、产物最小、响应式最直观、官方教程好上手 | 与 React 心智不同，需半天适应 |
| vanilla TS | 0 | 极致小 | UI 状态多时开发效率低、易写出私货架构 |

**决策**：
- **DOM 型游戏（词类/数字/网格/推理，占 6-10 款中的大多数）：Svelte 5**，统一 runes 写法。
- **Canvas 型游戏（物理/合成视觉/粒子类）：vanilla TS + `packages/game-kit` 游戏循环**，UI 外壳（菜单/结算/分享）仍用 Svelte 组件。
- **门户 portal：Svelte 5 + SSG**（vite prerender），保证 SEO 可抓取。
- React 不用于本项目（体积不达标）；Preact 不选（体积优势小于 Svelte 且写法不如 Svelte 直观，团队反正都要学一个）。

**理由**：体积是本项目第一约束；Svelte 编译期方案在 2026 年已完全成熟主流（SvelteKit/Vite 官方支持、State of JS 满意度第一梯队），符合「最新成熟主流」选型令。每款游戏总 JS 预算硬指标：**首屏 ≤ 80 KB gzip**（见 TECH-SPEC §9）。

**后果**：团队需一次性学 Svelte 5（成本约半天，官方 tutorial 齐全）；packages/ui 用 Svelte 组件 + Tailwind 实现，不能直接搬 shadcn/ui 的 React 代码——采用 **Tailwind CSS v4 + bits-ui（shadcn 风格的 Svelte headless 库，shadcn-svelte 同源）**，视觉规范与 shadcn 一致。可逆性中：单款游戏想换框架只影响该 app。

---

## ADR-003 渲染策略：按品类 DOM 优先，Canvas 仅限必须

**决策**：词类/数字/网格/问答/推理类一律 DOM+CSS（可访问性、响应式、开发速度、SEO 均占优，Wordle/Connections 均为 DOM）；物理合成（Suika-like）、大量粒子/动画的品类用 Canvas 2D（game-kit 封装循环、缩放、输入），**不引入 WebGL/Pixi/Phaser**，除非某款 PoC 证明 Canvas 2D 帧率不达标（Phaser ~200KB，直接吃穿体积预算）。

---

## ADR-004 部署与域名：Cloudflare Workers（静态资产模式）单账号多 Worker；自有站用 games.zalize.com 单域 + 路径

**备选**：a) Cloudflare Pages；b) Workers + Static Assets；c) 每游戏独立域名。

**决策**：
1. **全部用 Cloudflare Workers + Static Assets**（不用 Pages 新建项目）。Cloudflare 官方 2024 起已把投入转向 Workers 静态资产，Pages 处于维护态；且我们每款 AI 游戏本来就要 Worker 后端，前后端同 Worker 部署最简。
2. **域名：`games.zalize.com` 单域 + 路径**（`games.zalize.com/<slug>/`），门户即根路径。**不为每款游戏买独立域名，也不散布到多个 zalize 子域**。
   - SEO 角度：新项目冷启动，10 款游戏分 10 个域=10 次从零养域名权重；单域聚合让每款游戏的外链/收录互相加持，内链交叉导流也是排名信号。Wordle 独立域是先爆红后有域名价值，不可复制。
   - Poki/CrazyGames 角度：平台提交的是**独立构建包/平台专用 URL**（见 ADR-005），与自有站域名无关，不受影响。平台版禁外链，自有站版才带交叉导流。
   - 例外预留：若某款数据爆发（周 UV>5 万），再评估迁独立域（301 保留权重），此为可逆决策。
3. Workers 拓扑：每款游戏一个 Worker（静态资产+自身 API），共享服务（每日种子、遥测、DeepSeek relay 代理）独立 `dg-core-api` Worker，路由 `games.zalize.com/api/*`。KV：缓存/种子；D1：遥测计数与排行榜。

**CI（GitHub Actions）**：PR → lint(eslint+prettier)/typecheck(tsc/svelte-check)/test(vitest)/build 全绿 + wrangler versions upload 生成**预览 URL** 贴到 PR；merge main → 受影响 app 自动 deploy 生产（`dorny/paths-filter` 按目录增量）。细节见 TECH-SPEC §7。

---

## ADR-005 平台适配层：统一 PlatformAdapter 接口，三实现（web/poki/crazygames），构建期注入

**背景**：Poki 与 CrazyGames 均为编辑制审核，且各有强约束：
- **Poki**：必须接 Poki SDK 并正确调用 `gameLoadingFinished` / `gameplayStart` / `gameplayStop` / `commercialBreak` / `rewardedBreak`；**禁止任何第三方广告（AdSense 等）与外链/其他平台 logo**；要求快加载（有 4G 节流测试）、移动端可玩。
- **CrazyGames**：接 CrazyGames SDK，`sdk.game` 的 `loadingStart/loadingStop`、`gameplayStart/gameplayStop`、`happytime`，广告走 `requestAd('rewarded'|'midgame')`；同样**禁第三方广告与外链**；支持 QA 工具自测。
- 自有站：AdSense（账号未就绪期为占位组件）+ 完整外链/导流/分享。

**决策**：`packages/core/platform` 定义统一接口（详见 TECH-SPEC §5）：生命周期（loadingFinished/gameplayStart/gameplayStop/happyMoment）、广告（showInterstitial/showRewarded→Promise<结果>）、能力位（canShowAds/allowExternalLinks/allowThirdPartyAds）。三实现按 Vite `--mode`（web/poki/crazygames）构建期静态注入并 tree-shake，产出三份构建物；游戏代码只面向接口编程，UI 按能力位裁剪外链/导流模块。

**理由**：一次开发三端分发是本项目商业模型核心；能力位机制从架构上杜绝「平台版残留外链」这一最常见拒审原因。

---

## ADR-006 每日种子与轻反作弊：UTC 日期种子统一发号 + 答案不下发明文（哈希验证或服务端裁决）

**决策**：
1. 谜题编号 `dayIndex = floor(UTC epoch days) - EPOCH_DAY0`，全平台全时区同一题；种子 `seed = xmur3(gameId + ":" + dayIndex)` 喂 `mulberry32` PRNG（core 提供，纯前端可复现）。
2. 反作弊分三档（轻量为准，明确不追求对抗高手，只防「F12 看答案」毁分享传播）：
   - **L1 生成型**（谜题可由种子确定性生成、无唯一"答案"）：纯客户端，无需保护。
   - **L2 有答案但可枚举校验**（词类等）：客户端只持有 `SHA-256(normalize(answer) + gameId + dayIndex)`，猜测时本地哈希比对；词表打乱顺序+不按日索引直出。
   - **L3 高价值答案**（AI 侦探案件真相等）：答案只存服务端（KV），客户端提交猜测 → `dg-core-api` 裁决返回对错；当日结束后才可拉取完整答案。
3. 排行榜先做「本地统计 + 分享矩阵」，全球榜（需服务端校验成绩合法性）列入 M2+，不进 M1。

**理由**：Wordle 本身答案就在客户端仍成为现象级——每日游戏的反作弊价值在保护传播氛围而非绝对安全，投入与收益匹配。

---

## ADR-007 AI 玩法后端：dg-core-api Worker + 既有 DeepSeek relay；每日内容一次生成全网共享 + KV 缓存；限流三层

**决策**：
1. AI 原生玩法（每日 AI 案件、LLM 无限合成）统一走 `dg-core-api` Worker → 公司已有 DeepSeek relay（密钥只在 Worker secret，客户端永不见 key）。
2. **成本模型：每日共享种子 + 缓存**：
   - 案件类：每天 1 次 cron（Worker Cron Trigger, 00:05 UTC）按 dayIndex 生成当日案件 JSON 写 KV（TTL 48h），全体玩家读同一份——**每日生成成本 O(1)**；玩家审讯 NPC 的对话是增量调用，按「案件+问题归一化」做 KV 结果缓存，重复问题命中缓存零成本。
   - 合成类：组合结果 `KV[hash(A+B)]` 永久缓存（Infinite Craft 模式），全网去重后 token 成本随时间递减。
3. **限流与滥用防护三层**：① 每 IP 每游戏每日 LLM 调用配额（KV 计数，如 60 次/日，超限降级为「明日再来」文案）；② 单次输入长度/字符集白名单校验 + 系统 prompt 注入防护（用户文本只作为 user role、输出 JSON schema 校验）；③ 全局日 token 预算熔断（D1 记账，超预算全站 AI 功能降级为缓存只读）。Turnstile 预留到出现真实滥用再开（M1 不加，减摩擦）。
4. 输出过滤：DeepSeek 返回内容过 denylist + 长度裁剪后才入缓存（配合 compliance-counsel 审查项）。

---

## ADR-008 遥测：自建轻量 Worker+D1 事件计数为主，Cloudflare Web Analytics 为辅；不引入第三方分析 SDK

**背景**：需要按款/按日的核心漏斗（开玩→完成→分享）来执行「砍差留优」组合策略；Poki/CrazyGames 内嵌环境下第三方脚本受限，且两平台自带后台数据。

**备选**：a) 只用 Cloudflare Web Analytics（免费、零代码，但只有 PV/UV 级，无自定义事件、iframe 内不可靠）；b) GA4（重、隐私合规负担、被广告拦截器杀）；c) 自建 Worker+D1 计数。

**决策**：**自建为主**：`navigator.sendBeacon('/api/t', {gameId, event, dayIndex, platform})`，事件白名单（`open/start/complete/share/ad_*`，≤10 个），Worker 聚合写 D1（按 game×day×event×platform 计数，不存任何个人数据/无 cookie，GDPR 姿态最简）；**CF Web Analytics 同时开着**（零成本）用于自有站 PV 交叉校验。数据看板 M2 用一个只读 Worker 页面出报表。

**理由**：核心决策数据（完成率/分享率）只有自定义事件能给；自建方案 <150 行代码、零成本、三端（含平台 iframe）均可发 beacon，符合「轻量自建」判断。GA4 否决：合规与体积代价均不值。

---

## 决策速查表

| # | 主题 | 结论 |
|---|---|---|
| 001 | Monorepo | pnpm workspaces + Vite 7（turbo 缓存按需后补） |
| 002 | 框架 | Svelte 5 默认；Canvas 品类 vanilla TS + game-kit；不用 React/Preact |
| 003 | 渲染 | DOM 优先；物理/粒子类 Canvas 2D；不引入 WebGL 引擎 |
| 004 | 部署/域名 | CF Workers+Static Assets；games.zalize.com 单域+路径；每游戏一 Worker + dg-core-api 共享 Worker |
| 005 | 平台适配 | PlatformAdapter 接口，web/poki/crazygames 三实现，构建期注入 |
| 006 | 种子/反作弊 | UTC dayIndex 统一发号；答案哈希校验或服务端裁决，分 L1-L3 三档 |
| 007 | AI 后端 | dg-core-api + DeepSeek relay；每日共享内容 KV 缓存；IP 配额+输入校验+全局预算熔断 |
| 008 | 遥测 | 自建 Worker+D1 事件计数（无 cookie）为主，CF Web Analytics 为辅 |
