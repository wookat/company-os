# Daily Games M3 验收包

- 作者：product-manager
- 日期：2026-08-01
- 模板：templates/acceptance-package.md
- 范围：Daily Games 矩阵 M3 收口（8 款游戏 + 门户 + core-api，PR [#73](https://github.com/wookat/zalize-games/pull/73)，8 轮线上迭代完成，四道把关放行）

## 1. 线上地址

- 生产门户：**https://daily.zalize.com/**（门户 + 8 款游戏同域路由）
  - /wordbridge/ · /numlock/ · /dropstack/ · /borderrush/ · /epochlens/ · /gridspark/ · /interrogate/ · /alchemy/
  - 法务页：/privacy/ · /terms/；迁移指引：/migrate/；EpochLens 署名：/epochlens/credits
- 旧域：games.zalize.com 已归还原团队（旧团队 React 门户），其游戏路径 301 → daily.zalize.com；`?noredirect=1` 保留存档导出页
- 代码：wookat/zalize-games 分支 `integration/daily-games`（最终提交 `6e92766`），集成 PR：https://github.com/wookat/zalize-games/pull/73

## 2. 演示（各轮线上验证录屏/截图索引，均附于 PR #73 评论）

| 轮次 | 内容 | 证据 |
|---|---|---|
| 集成 E2E | 本地统一部署，8 款金路径 + 门户 + 存储自愈全过 | [E2E test results](https://github.com/wookat/zalize-games/pull/73#issuecomment-5150083592) |
| 生产冒烟 | 12 条路由/API/限流线上抽查（录屏） | [Production smoke](https://github.com/wookat/zalize-games/pull/73#issuecomment-5150279350) |
| 域名迁移 | daily.zalize.com 全量浏览器回归 + 301 验证（录屏） | [Domain-migration test](https://github.com/wookat/zalize-games/pull/73#issuecomment-5150708588) |
| Round 4 | 未来日收口/同步码/迁移页/预加载回归（录屏，含现场发现并修复 sync 400） | [Round-4 regression](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151004773) |
| Round 6 | 限流洪水/LLM relay/服务端判分 生产 curl 断言 | [Round-6 curl](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151197740)；[QA 第六轮最终评审](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151309966) |
| Round 7 | LLM 硬配额/防剧透/脏词过滤 curl + UI 复验（录屏） | [Round-7 curl](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151406590)；[Round-7 UI](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151428577) |
| Round 8 | M3 收口六项（安全头 9 路由/429 UX/清库）生产断言 | [Round-8 close-out](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151642927) |

## 3. 需求逐条对照表

### 3.1 通用验收（PRD §4 AC-G1~G7）

| # | 需求 | 实现位置 | 验证方式 | 状态 |
|---|---|---|---|---|
| AC-G1 | 375px 竖屏完整可玩、触控 ≥44px、无横向滚动 | @dg/ui 组件库 + 各 apps | 各轮移动模拟 UI 走查；DropStack 375px 溢出复查未复现（Round 6） | ✅ |
| AC-G2 | 首屏可交互 <2s（Lighthouse 移动） | 门户 CSS 内联预渲染、DG-7/8 关键 API 内联预加载 | Lighthouse：interrogate TTI 1.7s（预算 2s）、门户 0.8s（QA 第六轮） | ✅ |
| AC-G3 | 当日题全球一致（UTC）、未来日不可得 | workers/core-api `isFutureDay` 全游戏统一 404；题库/答案服务端收口 | 12/12 未来日组合 curl 全 404（QA 第六轮）；EpochLens/WordBridge 题目按日下发 | ✅ |
| AC-G4 | 连胜/统计持久化；同步码跨设备恢复 | @dg/core storage（损坏自愈+备份）+ `/api/sync` + SettingsModal 8 款全接 | 损坏注入测试 6 例；同步码上传/恢复线上实测（Restored 14 saves）；camelCase key bug 现场修复 | ✅ |
| AC-G5 | 分享文本一键复制，题号+成绩+emoji 矩阵+链接，无剧透 | @dg/core share `buildShareText` + 各游戏 builder | 8 款分享文本快照测试 + 线上剪贴板实测（trailing slash / Top X% / 无 recipe 泄露） | ✅ |
| AC-G6 | 完局页交叉导流推荐位 | @dg/game-kit 完局面板 + portal LIVE_GAMES | 集成 E2E 走查 | ✅ |
| AC-G7 | 无插屏/自动播放广告；广告不遮挡玩法 | web 构建无广告 SDK；平台构建广告仅经 PlatformAdapter | 代码核对（PLATFORM-SUBMISSION.md §4） | ✅（web 现状无广告，平台版待 M4） |

### 3.2 每款游戏核心验收（PRD §4）

| 游戏 | 核心验收要点 | 状态 |
|---|---|---|
| DG-1 WordBridge | 分组判定/差一个提示/暗线入口/archive 不计连胜；**M3 追加**：LLM 草稿 note 泄漏清除、win-without-bridge 文案、bridge explanation 展示、题目服务端按日下发 | ✅ |
| DG-2 Numlock | 唯一解（生成+求解双验证）/行列和实时高亮/无限 undo/难度曲线 | ✅ |
| DG-3 DropStack | 确定性序列/50 落结算/百分位（无需 Join 即显）/中端机帧率；**M3 追加**：昵称白名单+脏词过滤、未来日榜 404、测试数据清库 | ✅ |
| DG-4 BorderRush | 邻接判定/自动补全/三色反馈/提示；**M3 追加**：重复猜不重复扣次、结果弹窗自动弹出 | ✅ |
| DG-5 EpochLens | 双输入一屏/计分/署名+冷知识/PD-CC 授权记录（/credits）；**M3 追加**：服务端判分（题表脱敏、判分后才揭晓答案/作者/来源）、照片哈希文件名、每照片 10 次猜测上限 | ✅ |
| DG-6 GridSpark | 唯一解/冲突红标/计时防刷新清零/练习分离/色弱模式；**M3 追加**：分享矩阵跟随真实盘面尺寸 | ✅ |
| DG-7 Interrogate | 案件完整/提问预算/真相时间线；**M3 追加**：审讯仅白名单脚本问题（自由输入 422——LLM 越狱面关闭，PRD「首批不开放自由输入」验收口径达成）、60/IP/天硬配额、成本熔断 | ✅ |
| DG-8 InfiniteAlchemy | 目标可达/全球同配方同结果/First Discovery 冠名+脏词过滤/沙盒互通；**M3 追加**：relay 超时重试、429/503 专属 UX、60/IP/天配额、全表脏词清扫 | ✅ |

### 3.3 M3 专项收口（老板 8 轮线上迭代指令）

| # | 收口项 | 验证 | 状态 |
|---|---|---|---|
| 1 | 未来日答案收口（题库/答案不可预取） | 未来日 12/12 组合 404；WordBridge/EpochLens 题目服务端化；EpochLens 照片哈希名+作者/来源判分后下发 | ✅ |
| 2 | LLM 日配额 60/IP + 2000/日全局熔断 | 线上洪水实测精确 429（59×200+10×429 等）；熔断为代码+单测审计结论（未在生产触发） | ✅ |
| 3 | 服务端判分 | EpochLens guess 服务端计分；Interrogate 白名单问题+服务端提示词；combine 白名单字段 | ✅ |
| 4 | 同步码 8 款全接 | SettingsModal 全量接线，线上上传/恢复实测 | ✅ |
| 5 | 迁移页与旧域 301 | /migrate/ + 门户横幅 + 旧域导出页（手动上传）+ 游戏路径 301 | ✅（发现路径见 §6-1） |
| 6 | 限流三层（burst binding + memory/KV + D1 精确） | 生产并发洪水全部触发 429（sync/score/telemetry/LLM/旧栈 craft） | ✅ |
| 7 | 安全响应头 | 9 条路由 curl 断言 XFO/nosniff/Referrer-Policy/Permissions-Policy/HSTS | ✅ |
| 8 | 旧栈 4 worker 安全热修（CORS/限流/隐私链接/Google Fonts） | PR #74 已合并部署，线上 curl 断言 | ✅ |

## 4. 竞品对比结论

完整逐款对标见 [COMPETITOR-BENCHMARK.md](./COMPETITOR-BENCHMARK.md)（8 款 × 2-3 直接竞品 × 5 维度）。结论：

| 维度 | 结论 |
|---|---|
| 每日机制 + 分享设计 | **8/8 达到或超越**（每日制框架+统一分享组件是立身之本；DG-3「每日同种子公平比分」与 DG-8「每日目标词」为品类首创级差异化） |
| 上手清晰度 | 8/8 达到或超越（差一个提示/实时冲突红标/引导式追问等均对标竞品痛点） |
| 移动端体验 | **7/8 达到或超越**；DG-3 对原生 Suika App 手感 ⚠️（Web 品类天然差距，以公平比分机制对冲） |
| 变现方式 | 8/8 达到（干净变现/零插屏定位；平台 SDK 版待 M4） |
| 共性差距 | 品牌心智与分发（SEO 截流/聚合站收录/社区生态）——上线后运营战场，不阻塞验收 |

按 CHARTER §7「达到或超越可比竞品水平才有资格提交验收」：**对标结论支持通过 M3 验收**。

## 5. 四道把关记录

老板确认四道把关全部放行；对应证据（均在 PR #73 评论区）：

- [x] qa-engineer 测试报告：集成 E2E + [QA 第六轮线上复验（最终评审）](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151309966)（5/5 P1 收口，1 项部分修复已在 Round 7 补齐）
- [x] user-experience-officer 走查：[Round-4 回归](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151004773)、[Round-7 UI 复验](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151428577)、Round-8 真实 429 场景 UX 验证
- [x] 内部交叉测试：Round-4 cross-test 收口（未来日/同步/迁移）+ [Round-6 生产 curl 完成标准](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151197740)
- [x] 合规与安全审计：[Round-7](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151406590)/[Round-8](https://github.com/wookat/zalize-games/pull/73#issuecomment-5151642927)（LLM 输入白名单、脏词过滤新旧栈统一、生产数据清库、安全响应头、隐私政策如实、EpochLens 署名合规）

## 6. 已知问题与遗留项

1. **旧域根页迁移发现路径弱**：games.zalize.com 根页面（旧团队 React 门户）的迁移横幅归旧团队部署管辖；Round 7 已上绿色横幅，后续变更不受我方控制——迁移窗口期建议保留监控。
2. **DG-5 题库储备 30 天**（验收线 ≥90 天）：策展管线已就绪，需蜂群并行采集补齐（COMPETITOR-BENCHMARK.md DG-5 建议）。
3. **DG-7 案件文本质量抽查**：LLM 安全面已收口，预生成案件的剧本质量（矛盾点成立/可解性）仍需逐案 QA 常态化。
4. **LLM 全局熔断（2000/日）未在生产触发过**：为代码+单测审计结论，非线上实证。
5. **DG-3 物理手感**：对原生 App 仍有差距，手感调参专项列入 M4 并行。
6. **平台分发（M4 主任务）**：平台构建 P0 必改项与批次计划见 [PLATFORM-SUBMISSION.md](./PLATFORM-SUBMISSION.md) §4——分享文案去 URL、5 款 API 依赖游戏的绝对地址/题包改造、Poki 16:9 画布验收。
