# QA 第 138 轮 — UX137 修复复验（生产 build fd5ad30）

部署核对（已完成）：curl /app2/ → `assets/index-CclDVKxp.js`；执行时与 document.scripts 比对一致才继续。
代码依据：
- Exam.tsx L122 `submitting` state；L384-385 提前交卷按钮 `交卷中…`+disabled；L392-393 末题交卷按钮 `交卷中，请稍候…`+disabled；L125 `if (!qs || submitting) return` 防重复。
- Exam.tsx L157-162：catch 中 `ApiError.status===409` → 清 `zt_exam_<pid>` → `nav('result/'+pid)`。
- Result.tsx L138：页面「击败了 X% 的研友」需 `pct>=40 && beat_pct>=20`；L55：分享图 canvas 同口径，否则 grade 评语。

账号：新号 qa138-<ts>@test.zalize.com（报邮箱清库）。

## T1 低分口径（P3 复验，核心）
2026 卷答 2 题（Q1=A、Q2=B，同 UX137 → 预期 1/33、3%、beat≈34）提前交卷：
- 断言 A pending 态：点「确定交卷」后按钮文字变「交卷中…」且 disabled（正常网络一闪而过；截屏若不及，改为断言 DOM——点确认后立即 console 读按钮 disabled/text，或接受"未捕获"标 inconclusive，以慢网自然出现为准）。
- 断言 B 成绩页：正确率 3% 时**无**蓝色「击败了 X% 的研友」行（UX137 同分数曾显示「击败了 34%」——回归对照），grade 评语「打基础期，锁定 N 个薄弱考点逐个拿下」仍在。
- 断言 C 分享图：点「📷 生成成绩分享图」，卡片第 528px 行显示 grade 评语（如「打基础期，锁定 N 个薄弱考点…」截 20 字），**不含**「击败了」。

## T2 409 分支（P2 复验，核心对抗测试）
再开一份卷（免费额度 1 卷/天已用 → 用「真题快刷 20 题」或 2019 卷；若额度不够则复用重练路径；实在无卷可造标 untested 并说明）。流程：
1. 答 1-2 题后，console 带 token `fetch POST /api/papers/<pid>/submit`（body 含当前 answers/duration）→ 服务端先入库（返回 200）。
2. UI 点「提前交卷 → 确定交卷」→ 服务端返回 409。
- 断言 D：UI **直接落到 #result/<pid> 成绩页**（旧行为：停留答题页无反馈——对抗区分点），无错误 toast。
- 断言 E：localStorage `zt_exam_<pid>` 已被清除（console 读 null）。

## T3 正例 ≥40%（best-effort）
快刷 20 题若可对足 40%（需真实答对 8+ 题，不现实）→ 标 untested；替代：console 以既有数据核对 `/api/papers/:pid` 无法造 beat —— 若无法造 ≥40% 且 beat≥20 的卷，「击败行仍显示」正例标 untested（任务已允许）。

## T4 回归
- 正常动线：做题→交卷→成绩页（T1 即覆盖）。
- console/pageerror/HTTP≥400 清零（既知豁免：扩展 beacon、登录前 401、canvas data:URL sourcemap 噪音；T2 中本人 console POST 属计划内自证）。

执行顺序：注册 → T1（含分享图）→ T2 → T3(尝试/untested) → T4 汇总。
产出：test-report-138.md（内嵌截图）+ 录屏 + 测试邮箱。
