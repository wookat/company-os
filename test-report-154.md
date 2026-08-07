# QA154 · 竞品对标批次A 六项生产回归（build 122843b）

- 生产：https://zhenti.zalize.com/app2/ ，bundle `assets/index-DBDu9E94.js`（已确认含全部 6 项特征串）
- 测试账号（请清库）：**qa154-1786096133@test.zalize.com，uid=271**
  - 数据足迹：attempt×2（2025 真题卷 exam/414 6/31、AI 模拟卷 exam/415 0/10）、AI 生成卷 415（毛中特·11 题含 1 材料分析）、免费快刷卷 416（仅标记 1 题未交）、错题 35+、收藏 1、flag 反馈 2 条（题 6935 与 415 卷材料分析题）、错题重练答对 2 题（due+1）
- 录屏：/home/ubuntu/screencasts/rec-dc8badb5-5ac2-4643-9a19-4fbee32a225b/rec-dc8badb5-5ac2-4643-9a19-4fbee32a225b-edited.mp4

## 结论总览

| # | 验证项 | 结果 |
|---|---|---|
| 1 | 键盘快捷键 1-4/回车/→/←，textarea 豁免 | ✅ passed |
| 2 | 犹豫标记（答对）入错题本，your_answer=所选正确答案 | ✅ passed |
| 3 | 解析纠错入口（客观题+材料分析题） | ✅ passed |
| 4 | 错题本 7 天待复习分布 + 重练答对 due+1 | ✅ passed |
| 5 | 收藏/标记待查 pop 微动效 | ✅ passed |
| 6 | AI 出题选项随机化 | ⚠️ 随机化本身 passed；**解析字母未重映射 → P1 缺陷** |
| 7 | 常规回归 390px/1440px、console/HTTP≥400=0、核心流程 | ✅ passed |

## ⚠️ 核心发现（P1，建议尽快修复）：AI 题解析中的选项字母未随 shuffleOptions 重映射

`src/index.js` 的 `shuffleOptions()` 只重排了 options 和 answer 字母，**没有改写 analysis 文本中引用的 A/B/C/D**。生成的 10 题客观题中约 7 题解析与显示答案自相矛盾。判分层面答案字母与选项内容语义一致（逐题人工核对 5 题：答案字母指向的选项内容均正确，未发现判分错位，故未到 P0），但用户看到的解析直接打架：

例：AI 卷第 2 题（qid 6965），显示「✓ 正确答案：ABC」，但解析写「…D正确。C是群众路线的工作方法…故不选」——因为解析中的 C/D 还是洗牌前的字母（洗牌后 C=马原结合、D=群众路线）。

![P1证据：答案ABC但解析称D正确C不选](https://app.devin.ai/attachments/c62e6998-63ed-4e93-b5ae-ccee675114e4/ss_zoom_c796f087.png)

逐题核对（取自 /api/wrongbook 落库数据 + 成绩页解析）：

| 题(qid) | 落库答案 | 答案字母↔选项内容 | 解析字母与答案是否一致 |
|---|---|---|---|
| Q1 6964 | ABC | ✅（实事求是/群众/独立） | ✅（恰好未变序） |
| Q2 6965 | ABC | ✅ | ❌ 解析称 D正确、C不选 |
| Q3 6966 | ACD | ✅ | ❌ 解析称 ABC正确、D不选 |
| Q4 6967 | AD | ✅ | ❌ 解析称 A、C正确 |
| Q10 6973 | D（单选） | ✅（D=群众路线） | ❌ 解析称「D项艰苦奋斗…排除」 |

修复建议：让 LLM 出题时不在 analysis 里用字母（用选项原文），或 shuffle 后对 analysis 做字母重写/正则映射；存量 AI 题（本卷 qid 6964-6973 等）需清理或重生成。

正确答案位置分布（randomization 本身 OK）：ABC/ABC/ACD/AD/ABD/AC/BCD/ABC/BCD/D——未集中同一位置。

## 各项证据

### 1. 键盘快捷键 ✅
- 2025 真题卷（exam/414）：按 `2` 选中 B、`Enter`/`→` 下一题、`←` 上一题（录屏 + 截图）；AI 卷用 `1`+回车连打 10 题全程生效。
- textarea 豁免：AI 卷第 11 题材料分析 textarea 中按 `1`/`←`/`回车` 仅编辑文本（输入 123⏎test4），未选选项未翻题。

![键盘选B](https://app.devin.ai/attachments/f92f27d4-5ae6-47ce-91aa-7b5c6e806c15/ss_7896dcef.png)
![textarea中按键只编辑文本](https://app.devin.ai/attachments/c32c4c48-3fcc-4237-8fe3-e195666742b1/ss_879af95e.png)

- ⚠️ UX 备注（P3 建议）：点「标记待查」后按钮保持焦点，随后按 Enter（本意翻题）会反复触发标记，实测导致 17 题被误标（后经本地 localStorage 修正为 2 题再交卷）。建议标记按钮点击后 blur()。

### 2. 犹豫标记入错题本 ✅
2025 卷对 Q1（大农业观，答 C=正确答案）、Q2（从后思索法，答 B=正确答案）点标记后交卷（弹窗提示 2 题待查）。错题本 27 条 = 25 错 + 2 答对但标记；展开显示「你当时选了：C / 答案：C」「你当时选了：B / 答案：B」。

![答对标记题入错题本 your_answer=C](https://app.devin.ai/attachments/44a7de3c-1183-43d2-8ac1-c1efbec907d7/ss_a65f9512.png)
![第二道 your_answer=B](https://app.devin.ai/attachments/129a66be-57ab-488c-adfb-412bf22353ee/ss_b139e720.png)

### 3. 解析纠错入口 ✅
- 客观题解析卡底部灰虚线「觉得答案或解析有误？反馈 ›」，点击后变绿「已反馈，感谢帮助我们改进题库」（POST /api/questions/:id/flag 成功）。
- 材料分析题（AI 卷 Q11）解析卡同样有该链接，点击后同样变已反馈。

![客观题点击后已反馈](https://app.devin.ai/attachments/bcda6bbe-e556-42f5-8676-28c29c316917/ss_zoom_d15769b5.png)
![材料分析题已反馈](https://app.devin.ai/attachments/72fcaa49-c386-4616-a97b-9c21bd87fb02/ss_zoom_6a4c6dea.png)

### 4. 7 天待复习分布 ✅
交卷后错题本头部出现「未来 7 天待复习分布」白卡（今日=rose 柱 27）。错题重练连续答对 2 题（提示「答对了！1 天后再复习」），返回后柱图变「今日 25 / +1天 2」，due 如期推后。

![重练后 今日25 +1天2](https://app.devin.ai/attachments/4b6ea506-c19b-4da0-9b07-8a910cf5a760/ss_zoom_e5771a37.png)

### 5. pop 微动效 ✅
- 错题卡「收藏」点亮：CDP 实测按钮 class 含 `pop`，computedStyle animationName=`ztpop`、0.15s；UI 点亮态截图 + 录屏帧。
- 答题页「标记待查」点亮：同法实测 `{"cls":true,"anim":"ztpop","dur":"0.15s"}`。

![收藏点亮](https://app.devin.ai/attachments/3d59b854-759a-48e7-8d8a-f2247e05c590/ss_zoom_010d4840.png)
![已标记点亮](https://app.devin.ai/attachments/4f357524-94aa-4d21-80ea-5168c9396db8/ss_zoom_c15a81bc.png)

### 6. AI 随机化 ⚠️ 见上「核心发现」。

### 7. 常规回归 ✅
- 1440px 桌面全程（录屏）；390px：答题页与错题本 scrollWidth=390 无溢出，柱图/胶囊完整。
- CDP 监听（reload+14s）：console error=0、pageerror=0、HTTP≥400=0。
- 核心流程 登录→做卷→交卷→成绩→错题本 全程无回归（本轮即全链路）。

![错题本390px](https://app.devin.ai/attachments/dafccb79-0447-49b2-a9b1-b1d05b8731c2/wrong390.png)

## untested / 口径说明
- due +3/+7 天桶：需同一题多次间隔答对（box 升级），单日内无法制造，仅验证了 +1 天桶（机制同一段代码，风险低）。
- pop 动画的 150ms 视觉帧以「录屏 + class/computedStyle 双证」口径判定。
- AI 卷仅生成 1 份（10+1 题）核 5 题；判分级错位未发现，但样本有限。
