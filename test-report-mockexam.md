# 全真模考（批次D）改动说明 + 自查清单

分支：`zhenti-mockexam`（基于 zhenti-app）。父会话负责合并部署。

## 改动说明

### 后端 src/index.js
- 新增 `GET /api/real/mockpaper?year=`：组「全真模考卷」= 该年份全部客观真题（real_questions，复用 `realPaperFromQs` 复制进 papers/questions，material_id=0 免费不占额度）+ 5 道分析题（real_subjective seq 34-38，写入 questions 表 qtype='essay'，stem=材料+设问，answer=参考要点按行拼接）。同名卷幂等复用（existed）。鉴权/限流与 /api/real/paper 同口径。
- `POST /api/papers/:id/submit`：全真模考卷（标题含「全真模考」）在入库 attempts.answers 前剔除 essay 作答文本——学生分析题作答不长期入库（与 subjgrade 同口径），仅本地暂存；自评命中仍走既有 `/papers/:id/essay-self` 沉淀。
- 无新表、无 schema 变更；判分/attempts/错题本全链路复用。

### 前端 web/src
- `Real.tsx`：年份卡新增「全真模考」按钮 + 说明弹窗（题量按年份动态计算、180 分钟、判分口径、免费）；开始后写 `zt_timed_<pid>=1` 强制限时。
- `Exam.tsx`：标题含「全真模考」时 TIME_LIMIT=180 分钟、倒计时强制开启不可关闭（点击 toast 提示）；复用既有防倒带持久化（每 10s 写回已用时、elapsed 单调不减、剩 5 分钟变红、到时自动交卷）；分析题 textarea 本地暂存刷新恢复（既有 zt_exam_<pid>）；交卷/自动交卷前把 essay 作答留存 `zt_essay_<pid>`（成绩页回显用）；交卷前未作答确认链沿用。
- `Result.tsx`：全真模考卷分数环按加权口径（单选 1 分/多选 2 分，2026 满分 50），注明答对题数；考点覆盖度沿用；分析题区块新组件 MockEssay：作答回显（本地暂存优先）+ 参考要点逐条点选自评（POST essay-self 沉淀，命中口径与背诵页一致）+ AI 逐点批改（复用 Subj.AiGrade → POST /api/subjgrade，每日 10 次，year 取自卷名、seq 34-38）。
- `Subj.tsx`：AiGrade 导出并支持 initialText（成绩页预填作答）。
- 深色模式：全部用既有 CSS 变量类（bg-card/text-ink/bg-page…），无硬编码色。

## 自查清单（全部通过）
- [x] `npx tsc --noEmit` 通过
- [x] `npm run build` 通过（仅既有 >500kB chunk 警告）
- [x] `npm run lint`（oxlint）无 error
- [x] `node --check src/index.js` 通过
- [x] 本地 wrangler dev + 本地 D1（schema+2010-2026 真题/分析题种子）全流程实测：注册 → 全真模考入口/说明弹窗 → 38 题答题（33 客观+5 分析）→ 180 分钟倒计时（不可关闭、刷新不倒带恢复）→ 分析题 textarea 暂存 → 交卷未答确认链（33 题）→ 成绩页加权 4/50 + 考点覆盖 + 分析题自评 ○→✓ + AI 逐点批改真实调用 1 次（命中 4/6+总评）
- [x] 深色模式答题页/成绩页/弹窗无白底穿帮
- [x] 390x844 / 1440x900 双视口无溢出
- [x] 说明弹窗题量按年份动态计算（QA 发现非 38 题年份文案不符，已修复）
- [x] 学生分析题作答不入库：submit 服务端剔除 essay 文本，仅本地存储
- [x] 全程未触及生产写接口（全部本地 D1）；AI 真实调用 1 次（≤2）

## 测试账号（本地 D1，无需生产清理）
- mockqa-1770000123@test.zalize.com（仅存在于本地 wrangler D1，生产库无数据，无需代清）

## 遗留/建议
- build chunk >500kB 警告为既有问题，可后续代码分包。
