# Daily Games（DG）工程 Spec

- 作者：tech-lead ｜ 日期：2026-07-31 ｜ 状态：v1（M1 执行依据）
- 决策依据见 `ADR.md`（ADR-001~008）；本文给实现细节：目录、接口、数据模型、预算与 PoC/M1 定义。
- 代码仓库：https://github.com/wookat/zalize-games（monorepo，现有 apps/detective、apps/craft、apps/puzzle、apps/portal 骨架将并入本结构）

---

## 1. Monorepo 结构（ADR-001/002）

```
zalize-games/
├─ pnpm-workspace.yaml            # packages: apps/*, packages/*, workers/*
├─ package.json                   # packageManager: pnpm@10.x；根脚本 lint/typecheck/test/build
├─ tsconfig.base.json             # strict: true，路径别名 @dg/*
├─ .github/workflows/ci.yml       # 见 §7
├─ packages/
│  ├─ core/        # @dg/core   无 UI 依赖的纯 TS
│  │   ├─ daily/       # dayIndex、seed、xmur3+mulberry32 PRNG
│  │   ├─ storage/     # localStorage 封装 + schema 版本迁移（§6）
│  │   ├─ stats/       # streak/胜率/分布 计算
│  │   ├─ share/       # emoji 结果矩阵生成 + Web Share API/剪贴板降级
│  │   ├─ i18n/        # 极简 t() + JSON 字典（M1 仅 en，键先行）
│  │   ├─ telemetry/   # sendBeacon 白名单事件（§8）
│  │   └─ platform/    # PlatformAdapter 接口 + web/poki/crazygames 三实现（§5）
│  ├─ ui/          # @dg/ui     Svelte 5 + Tailwind v4 + bits-ui
│  │   #  组件：GameShell(头部/帮助/设置/主题) StatsModal ShareCard Countdown
│  │   #  Keyboard(虚拟键盘) Grid Toast AdSlot(能力位感知) ThemeProvider(暗色默认)
│  └─ game-kit/    # @dg/game-kit  Canvas 2D 循环(rAF 固定步长)、输入统一(pointer)、
│      #  viewport 缩放适配、对象池、简易 tween；无渲染引擎依赖
├─ apps/
│  ├─ portal/      # 门户（SSG，游戏卡片、SEO 落地页、交叉导流）
│  ├─ detective/   # G1 每日 AI 案件（L3 反作弊 + LLM 审讯）
│  ├─ craft/       # G2 LLM 每日合成挑战
│  ├─ puzzle/      # G3 零成本每日谜题（L1/L2）
│  └─ <slug>/      # 后续每款一目录，从 templates/game-app 复制
├─ workers/
│  └─ core-api/    # dg-core-api：/api/daily /api/guess /api/llm/* /api/t（§4/§5.3/§8）
└─ templates/game-app/   # 新游戏脚手架：预接 core/ui/adapter/遥测/CI
```

依赖方向强制：`apps → packages`，`packages 互不依赖 ui←core 单向`；ESLint `import/no-restricted-paths` 把关。

## 2. 技术栈汇总（ADR-002/003）

| 层 | 选型 | 版本基线 |
|---|---|---|
| 包管理/构建 | pnpm workspaces / Vite 7 | corepack 钉版 |
| 语言 | TypeScript strict | 5.x |
| 框架 | Svelte 5（runes）；Canvas 品类 vanilla TS+game-kit | portal 走 SSG 预渲染 |
| 样式 | Tailwind CSS v4 + bits-ui（shadcn 风格 Svelte headless） | 暗色默认、移动优先 |
| 测试 | Vitest（core/game-kit 单测必须；纯逻辑覆盖 ≥80%） | Playwright 冒烟（M2） |
| 部署 | Cloudflare Workers + Static Assets、KV、D1、Cron Triggers | wrangler 4 |
| LLM | DeepSeek via 公司 relay（Worker secret） | — |

## 3. 状态与存储：localStorage 结构与版本迁移

每游戏独立命名空间，键 `dg:<gameId>:v<N>`：

```ts
interface GameSave {
  schema: number;              // 当前 schema 版本
  lastDayIndex: number;        // 最近游玩的谜题号
  today: TodayState;           // 进行中状态（各游戏自定义，可序列化）
  stats: { played: number; won: number; streak: number; maxStreak: number;
           dist?: number[] };  // 猜测分布（词类）
  settings: { theme: 'dark'|'light'|'system'; reducedMotion?: boolean };
}
```

- 迁移：`storage.load(gameId, migrations: Migration[])`——按版本号顺序跑 `up(old)=>new`，失败则保留原键并降级为空档（绝不清空用户 streak 数据是硬规则）。
- 全局键 `dg:global:v1`：跨游戏（已玩过哪些游戏→门户红点、导流去重）。
- 不用 cookie；不存 PII。localStorage 超限/隐私模式降级为内存态。

## 4. 每日种子与反作弊（ADR-006）

- `dayIndex = floor(Date.now()/86400000) - 20635`（EPOCH_DAY0 = 2026-07-01 UTC）；倒计时组件统一显示「下一题 UTC 00:00」。
- PRNG：`mulberry32(xmur3(gameId+':'+dayIndex)())`，core 导出，测试锁定快照。
- 校验 API（L3）：`POST /api/guess {gameId, dayIndex, guess}` → `{correct, feedback?}`；Worker 从 KV `puzzle:<gameId>:<dayIndex>` 取答案裁决。当日 UTC 结束后 `GET /api/reveal` 可取完整答案。
- L2 哈希：构建期脚本把答案表预处理为 `sha256(normalize(ans)+gameId+dayIndex)` 清单打进产物。

## 5. 平台适配层（ADR-005）

### 5.1 接口

```ts
interface PlatformAdapter {
  readonly name: 'web'|'poki'|'crazygames';
  readonly caps: { ads: boolean; rewarded: boolean;
                   externalLinks: boolean; thirdPartyAds: boolean };
  init(): Promise<void>;                 // SDK 加载与就绪
  loadingFinished(): void;               // Poki gameLoadingFinished / CG loadingStop
  gameplayStart(): void; gameplayStop(): void;
  happyMoment(): void;                   // CG happytime / 其他平台 no-op
  showInterstitial(): Promise<void>;     // Poki commercialBreak / CG midgame / web: AdSense 或 no-op
  showRewarded(): Promise<{ granted: boolean }>; // rewardedBreak / rewarded / web 占位
}
```

### 5.2 构建与合规要点

- Vite `--mode web|poki|crazygames` → `import.meta.env.MODE` 静态分支，未用实现被 tree-shake；三份产物分目录出包（poki/CG 为可上传 zip，相对路径资源）。
- 平台版硬规则（CI 检查 + code review 清单）：**无 AdSense/第三方广告脚本、无外链、无其他平台 logo、无导流模块**；广告前后自动 `gameplayStop/Start`、广告期间静音。
- 审核准备：Poki 4G 节流下可玩、移动端触控完整；CrazyGames 用其 QA 工具自测通过后再提交。
- web 实现：AdSense 账号未就绪期 `AdSlot` 渲染占位（老板资源到位后仅改配置）。

### 5.3 AI 后端（ADR-007）

```
GET  /api/daily?game=detective&day=N   → KV 缓存的当日案件 JSON（cron 00:05 UTC 预生成）
POST /api/llm/interrogate {day,npc,q}  → 缓存命中直接返回；未命中经 relay 调 DeepSeek，写缓存
POST /api/llm/combine {a,b}            → KV[hash(a,b)] 永久缓存（全网共享）
```
限流：KV 计数 `rl:<ip>:<game>:<day>` 配额 60/日；输入 ≤200 字符白名单；D1 日 token 记账超预算全局熔断降级（只读缓存）。密钥仅存 Worker secret。

## 6. 部署与域名（ADR-004）

- `games.zalize.com`（Cloudflare zone 已有权限）：portal Worker 挂根路径，各游戏 Worker 路由 `/<slug>/*`，`dg-core-api` 路由 `/api/*`。
- 资源：KV namespaces `DG_PUZZLES`、`DG_CACHE`、`DG_RL`；D1 `dg_telemetry`；secrets：`DEEPSEEK_RELAY_*`。
- 环境：production（main 分支）+ 每 PR versions 预览 URL。

## 7. CI（GitHub Actions）

1. `ci.yml`（PR）：pnpm install（缓存）→ 变更检测（dorny/paths-filter，按 apps/*、packages/*）→ 受影响包并行跑 `lint`(eslint+prettier) / `typecheck`(tsc + svelte-check) / `test`(vitest) / `build`（三 mode 均构建）→ `wrangler versions upload` 输出预览 URL 评论到 PR → **bundle 体积门禁**：首屏 gzip >80KB 则 fail。
2. `deploy.yml`（main push）：受影响 Worker `wrangler deploy`；portal 最后部署。
3. 密钥：`CLOUDFLARE_WORKERS_API_TOKEN`（已有）入 repo secrets。

## 8. 遥测（ADR-008）

- 客户端：`telemetry.track(event)`，事件白名单 `open|start|complete|fail|share|ad_request|ad_done|llm_call`；`sendBeacon('/api/t')`，失败静默。
- D1 表：`counts(game_id, day_index, platform, event, n)` 主键前四列，Worker 端 `INSERT..ON CONFLICT..n=n+1`（批量缓冲 via waitUntil）。
- 无 cookie / 无 UA 存储 / IP 不落库（限流用的 KV 键 24h 过期）→ 隐私页可声明「无个人数据收集」。
- 辅助：自有站开 Cloudflare Web Analytics（免费）校验 PV。
- 核心看板指标（砍差留优依据）：D1 完成率 = complete/start、分享率 = share/complete、7 日回访（M2 加 returning 事件）。

## 9. 性能与质量预算（验收硬指标）

| 指标 | 预算 |
|---|---|
| 首屏 JS（gzip） | ≤ 80 KB/游戏（CI 门禁）；portal ≤ 60 KB |
| LCP（4G 模拟） | ≤ 2.5s；Poki 节流测试可玩 |
| Lighthouse 移动端 | Perf ≥ 90，A11y ≥ 90 |
| 移动端 | 375px 起全功能可玩，触控目标 ≥44px，暗色默认 |
| 测试 | packages/core、game-kit 纯逻辑单测覆盖 ≥80%；PRNG/种子/迁移必须有快照测试 |

## 10. PoC 清单（关键不确定点，M1 第 1 周内并行做完）

| # | 不确定点 | PoC 内容 | 通过标准 |
|---|---|---|---|
| P1 | Svelte 5 + Tailwind v4 + bits-ui 组合体积 | GameShell+键盘+弹窗最小 demo 三 mode 构建 | 首屏 gzip ≤50KB |
| P2 | Poki SDK 沙箱联调 | adapter-poki 在 Poki Inspector 跑通 loading/gameplay/commercialBreak | 事件全绿 |
| P3 | CrazyGames SDK + QA 工具 | adapter-crazygames 过 CG QA 自检 | 无 blocker 项 |
| P4 | LLM 案件生成质量与成本 | cron 生成 7 天案件 + 审讯缓存命中率实测 | 单日成本 ≤$0.5/游戏、JSON schema 100% 合法 |
| P5 | Workers 单域多 Worker 路由 | portal+2 游戏+core-api 在 games.zalize.com 路由共存 | 无路径冲突、预览 URL 可用 |
| P6 | Canvas 品类帧率 | game-kit 500 精灵压测（中端安卓 Chrome） | 稳定 60fps（否则降 30fps 上限或砍品类） |

## 11. M1「最小可运行骨架」定义（2 周，对应一页纸里程碑）

**范围**：
1. Monorepo 落地：pnpm workspaces、packages/core+ui+game-kit、templates/game-app、CI 全绿。
2. 首批 3 款可玩并部署 `games.zalize.com`：puzzle（L1/L2 纯前端）、craft（LLM 合成+缓存）、detective（每日案件+审讯，L3）。
3. 管线贯通：每日种子（三款同题号）、localStorage 存档+迁移、emoji 分享矩阵、遥测计数入 D1、portal 列表页+交叉导流。
4. 平台适配层三实现完成且 P2/P3 PoC 通过（真正提交平台在 M2）。

**明确不在 M1**：全球排行榜、i18n 多语言、AdSense 实接、Poki/CG 正式提交、SEO 内容页矩阵。

**M1 出口验收**：三款游戏移动端真机可完整玩一局并分享；CI 门禁全开；§9 预算达标；PoC 六项结论入库（本目录 `poc-results.md`）。

---

## 12. 风险与降级预案（tech-lead 视角）

| 风险 | 预案 |
|---|---|
| Svelte 上手拖慢并行工程师 | templates/game-app 脚手架 + ui 组件把 80% 界面固化，游戏工程师只写玩法逻辑 |
| Poki/CG 审核拒 | 双平台并投 + 自有站兜底（域名策略已独立）；拒审意见回流迭代 |
| LLM 成本/滥用超预期 | 三层限流已内建；最坏降级为「当日缓存只读」，游戏仍可玩 |
| AdSense 账号迟迟未就绪 | AdSlot 占位设计已隔离，接入仅改配置不动代码 |
| 单域路由互相踩 | P5 PoC 先行验证；必要时退化为每游戏子域（Cloudflare 通配 DNS 已可用） |
