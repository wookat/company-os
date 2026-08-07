# QA156 · 增量回归报告（生产 https://zhenti.zalize.com/app2/ ，commit 680c6aa）

- 部署确认：no-cache 拉取 index.html → bundle `assets/index-CluVyaHT.js`，含「挖空自测」「练同考点客观真题」串，硬刷新后加载。
- 测试账号：**qa156-1786098950@test.zalize.com，uid=273**（attempt×1〔抗美援朝 2 题卷 exam/420 0/2〕、subj_hit 1 条〔2026-34 想到 1/6〕、错题 2 条；无 AI 卷/material/收藏/订单）。
- 全程 CDP 监听 console error / pageerror / HTTP≥400。
- 录屏：`/home/ubuntu/screencasts/rec-bfbd9665-3503-42ad-a411-b65e319ca1ca/rec-bfbd9665-3503-42ad-a411-b65e319ca1ca-edited.mp4`

## T1 分析题「挖空自测」（#realsubj/2026 Q34，6 条要点）— 全部 passed

| 开启：👁+开头线索+blur 遮挡 | 揭开第 1 条（○ 全文，其余仍遮挡→再点自评 ✓） |
|---|---|
| ![挖空开启](https://app.devin.ai/attachments/bc2200f8-a09f-40fd-8da8-153fe9e3bf7d/ss_0cfccb02.png) | ![自评✓](https://app.devin.ai/attachments/7ce8aae8-54f6-4e67-a2ae-81e50e32392c/ss_zoom_45d64862.png) |

| 关闭复位：全部明文、✓ 保留、上次想到 1/6 | 390px：scrollWidth=390，无溢出，条目可读 |
|---|---|
| ![关闭复位](https://app.devin.ai/attachments/c684834f-8b96-440e-851a-ed4c439ca59e/ss_zoom_a0adf2cc.png) | ![390px](https://app.devin.ai/attachments/cb314e48-788e-4195-aad1-e4cec807ecf5/ss_201342e9.png) |

1. 点「挖空自测」→ 按钮变「✓ 挖空自测中」，6 条要点均只显示开头线索（首个逗号/顿号/冒号前），余文 blur 遮挡 — passed
2. 点隐藏条 → 揭开全文（○ 前缀），其余 5 条仍遮挡 — passed
3. 再点已揭开条 → ✓ 绿底自评，「想到 1/6」+ summary「上次想到 1/6」写入（subj_hit 落库）— passed
4. 点「✓ 挖空自测中」关闭 → 全部明文、✓ 保留；**再次开启后 6 条全部重新遮挡（揭开状态复位）** — passed
5. 390px：`{iw:390, sw:390, liOver:0}` 无横向溢出 — passed

## T2 「练同考点客观真题 ›」链接 — passed

Q34（马原·哲学 · 资本的有机构成）点链接 → 跳 `#realsearch/资本的有机构成`，搜索页显示「按考点练：资本的有机构成 8 题」，结果题目（2023-19 平均利润、2022-4 当代资本主义等）考点均为「资本的有机构成」，相关性正确。

![realsearch](https://app.devin.ai/attachments/857be85b-34d9-4b56-8655-bed88b9603d8/ss_aaf23238.png)

## T3 #real 三 tab 正常路径回归 — passed

按年份（年份卡列表）/ 按考点（5 科目分组 + 过滤框）/ 分析题（17 年份卡）均 ≤3s 内加载出内容，无骨架屏滞留。
（注：失败注入路径未测——d14f91e 的「请求失败置空+toast」防御分支本轮仅回归了正常加载，不宣称异常分支已验证。）

| 按考点 | 分析题 tab |
|---|---|
| ![按考点](https://app.devin.ai/attachments/5c97650a-3b38-4c04-900f-1db405ee7dd5/ss_cec6b58c.png) | ![分析题](https://app.devin.ai/attachments/8db2060a-e243-404d-bb3c-3e1f6b2f6796/ss_404aeec3.png) |

## T4 核心流程回归 — passed

注册登录 → 按考点「抗美援朝 2 题」组卷 exam/420 → 故意答错交卷 → 成绩页 0/2 正常渲染（逐题解析/考点覆盖度）→ 错题本（2）两题入库、7 天分布今日=2。1440px（sw=1440）与 390px 抽查均无溢出。

| 成绩页 | 错题本 |
|---|---|
| ![成绩页](https://app.devin.ai/attachments/9423bfb2-b594-45e2-a05a-5930611f8d46/ss_63355c20.png) | ![错题本](https://app.devin.ai/attachments/17154c49-40c7-4fcf-81b1-b453a9e55e40/ss_e850293d.png) |

## T5 运行时监控 — passed

CDP 监听（Runtime.consoleAPICalled error / exceptionThrown / Network status≥400）覆盖组卷→交卷→成绩→错题本全流程：**0 console error、0 pageerror、0 HTTP≥400**。

## T6 清库 — ⚠ 被环境阻塞，未完成

`npx wrangler d1 execute zhentigongfang --remote` 在本机对该账号 **全部可用 Cloudflare token（默认环境、CLOUDFLARE_WORKERS_API_TOKEN、GLOBAL）均返回 7403（not authorized）**，与 QA147 记录一致，D1 remote API 对现有凭据不可用。本轮**未能删除测试账号，也未能核验 @test.zalize.com 用户数为 0**。

请 lead/用户在有权限的环境执行（uid=273）：

```sql
DELETE FROM wrong_book WHERE user_id=273;
DELETE FROM attempts WHERE user_id=273;
DELETE FROM favorites WHERE user_id=273;
DELETE FROM real_favs WHERE user_id=273;
DELETE FROM subj_memo WHERE user_id=273;
DELETE FROM subj_hit WHERE user_id=273;
DELETE FROM daily_checkin WHERE user_id=273;
DELETE FROM orders WHERE user_id=273;
DELETE FROM questions WHERE paper_id IN (SELECT id FROM papers WHERE user_id=273);
DELETE FROM papers WHERE user_id=273;
DELETE FROM users WHERE id=273;
SELECT COUNT(*) FROM users WHERE email LIKE '%@test.zalize.com'; -- 期望 0
```

（另留意历史遗留：qa154 uid=271、qa155 uid=272 此前也待清。）

## 结论

批次B 两个新功能与 P4 防御的正常路径回归全部通过，无新 P0–P3。唯一未完成项为 T6 清库（环境凭据无 D1 权限）。
