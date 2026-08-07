# QA156 · 增量回归（commit 680c6aa，bundle assets/index-CluVyaHT.js 已含「挖空自测」「练同考点客观真题」串）

代码依据：
- `web/src/pages/Subj.tsx` L234-299（d004f4b + 680c6aa）：
  - 每题「展开参考答案要点」内有「挖空自测」按钮，开启后按钮变「✓ 挖空自测中」（brand 蓝底描边）；
  - 隐藏态要点渲染 `👁 <cue><blur 遮挡余文>`，cue = 首个 `^.{4,24}?[，、：；,:]` 命中或前 1/3（4-10 字）；
  - 点隐藏条 → 加入 revealed（揭开全文，显示 ○）；再点已揭开条 → togglePt 自评 ✓（绿底），写 subj_hit → summary「上次想到 n/t」；
  - 再点「✓ 挖空自测中」→ 关闭 cloze 且 `setRevealed(new Set())` 复位。
  - kp 行（L287-299）：`练同考点客观真题 ›` 按钮 → `nav('realsearch/'+encodeURIComponent(kp_name))`。
- `web/src/pages/Real.tsx`（d14f91e）：三 tab catch 中 toast+置空列表；本轮只做正常路径回归（三 tab 均加载出内容）。

账号：新注册 `qa156-<ts>@test.zalize.com`（报 uid）。全程录屏；CDP 监听 console error/pageerror/HTTP≥400。

**环境限制（已确认）**：`npx wrangler d1 execute zhentigongfang --remote` 用现有全部 CF token（默认 env、CLOUDFLARE_WORKERS_API_TOKEN、GLOBAL）均 7403 → 本轮无法自行清库与核验 @test.zalize.com=0，需报告给 lead/用户执行。

## T1 挖空自测（#realsubj/<year>，选一道 answer_points≥3 的题）
1. 展开「参考答案要点（N 条）」，点「挖空自测」。
   - passed：按钮变「✓ 挖空自测中」；每条要点变 👁+开头线索+模糊遮挡（blur），全文不可读；提示语变「先回忆再点要点揭开，揭开后再点标记想到」。
2. 点第 1 条隐藏要点。
   - passed：该条揭开全文（○ 前缀），其余条仍遮挡。
3. 再点已揭开的第 1 条。
   - passed：变 ✓ 绿底（自评命中），「想到 1/N 条」计数更新；收起再展开 summary 显示「上次想到 1/N」（写入 subj_hit）。
4. 点「✓ 挖空自测中」关闭。
   - passed：全部要点恢复明文（✓/○），再次开启时揭开状态已复位（全部重新遮挡）。
5. 390px（CDP 模拟）：挖空条目无横向溢出（scrollWidth=390），按钮可点。
失败判据：遮挡不生效/揭开即打 ✓ 跳过揭开步/关闭不复位/390 溢出。

## T2 练同考点客观真题链接
1. 同题 kp 行点「练同考点客观真题 ›」。
   - passed：跳 `#realsearch/<考点名>`，搜索结果页出现该考点相关客观题（结果卡考点名匹配）。
失败判据：404/空结果/跳错 hash。

## T3 #real 三 tab 正常路径回归（P4 防御修复后）
- 按年份/按考点/分析题三 tab 依次点开：各自 ≤5s 内加载出内容（年份卡/考点 chip 分组/年份列表），无长时间骨架屏。
（异常路径不注入故障，正常回归即可。）

## T4 常规回归
- 登录 → 组一份免费真题小卷（考点 2 题卷）→ 交卷 → 成绩页 → 错题本有新增。
- 1440px 全程 + T1 的 390px 抽查。
- CDP 监听全程 console error / pageerror / HTTP≥400 = 0。

产出：test-report-156.md + 录屏 + qa156 uid（清库转交用户/lead，附 SQL）。
