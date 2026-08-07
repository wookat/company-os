# QA157 · 错题动态间隔调度回归报告（生产 build e18e01d）

- 变更：`POST /api/wrongbook/:id/review`（src/index.js L2054-2073）——首答即对且 lapses=0 跳级 box3/3天；lapses≥2 间隔减半；box≥5 毕业删除；wrong_book 新增 lapses 列（线上已迁移）。
- 测试账号：**qa157-1786099644@test.zalize.com，uid=274**（papers 421〔抗美援朝〕/422〔遵义会议〕、attempt×2、wrong_book 残留 2 条〔7039 box3、遵义会议多选已重练 box3；7040 已毕业删除〕）。按用户指示不清库，报 uid。
- 方法：API 直测（注册接口拿 Bearer token，curl/python 直接调 review 看响应）+ UI 抽 1 例重练文案（录屏）。

## T1 首答即对跳级 — passed

`POST /api/wrongbook/7039/review {"correct":true}`（box=1, lapses=0）
→ 实际返回 **`{"box": 3, "next_days": 3}`**（旧逻辑为 box:2/next_days:1）✓

## T2 顽固题间隔减半 + 毕业（Q7040）— 全部 passed

| 步骤 | 请求 | 期望 | 实际 |
|---|---|---|---|
| 答错×1 | correct:false | box:1, next_days:0 | `{"box":1,"next_days":0}` ✓ |
| 答错×2 | correct:false | box:1, next_days:0（lapses=2） | `{"box":1,"next_days":0}` ✓ |
| 答对 | correct:true | box:2, days=ceil(1/2)=1 | `{"box":2,"next_days":1}` ✓ |
| 答对 | correct:true | box:3, days=ceil(3/2)=**2**（旧 3） | `{"box":3,"next_days":2}` ✓ |
| 答对 | correct:true | box:4, days=ceil(7/2)=**4**（旧 7） | `{"box":4,"next_days":4}` ✓ |
| 答对 | correct:true | graduated:true 并从错题本删除 | `{"graduated":true}`，GET /api/wrongbook 中 7040 消失 ✓ |

减半路径的 2/4 天值是新逻辑独有（旧逻辑恒为 3/7），可明确区分新旧实现。

## T3 UI 重练反馈文案（录屏）— passed

新做一份遵义会议 2 题卷制造 fresh 错题（box=1/lapses=0），错题本 →「错题重练」→ 多选答对（BCD）：
反馈条逐字显示 **「✓ 答对了！ 3 天后再复习这道题」**（旧逻辑为「1 天后…」）。

| 重练答对反馈（3 天） | 反馈条放大 |
|---|---|
| ![重练答对](https://app.devin.ai/attachments/8d5a615f-cfe3-43da-8da7-00c9f111af66/ss_79183303.png) | ![3天文案](https://app.devin.ai/attachments/0edf60cd-a15b-49a8-a732-cfbb38e7e927/ss_zoom_b90761f5.png) |

顺带观察：T1 跳级后错题本「未来 7 天待复习分布」柱图正确落在 +3 天桶：

![7天分布+3](https://app.devin.ai/attachments/0b4e5ce3-c524-477f-b73b-eb9a78d4852c/ss_a0de4bb2.png)

## T4 监控 — passed

UI 段全程 CDP 监听 console error / pageerror / HTTP≥400 = **0**。

## 结论

3 条调度路径 API 返回值与 UI 文案全部命中期望，无失败项、无新 P 级问题。录屏：`/home/ubuntu/screencasts/rec-a1d3aeb8-a37c-4d99-90f6-4994f3b2d25b/rec-a1d3aeb8-a37c-4d99-90f6-4994f3b2d25b-edited.mp4`
