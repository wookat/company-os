# QA157 · 错题动态间隔调度（build e18e01d，POST /api/wrongbook/:id/review）

代码依据：src/index.js L2054-2073（e18e01d）：
- 答错：box=1、lapses+1、due 立即 → 返回 `{box:1,next_days:0}`
- 答对且 box==1 且 lapses==0：newBox=3（跳级），days=3 → `{box:3,next_days:3}`（旧行为 box:2/next_days:1）
- 答对且 lapses>=2：days=max(1,ceil(days/2)) → box2→1、box3→2（旧 3）、box4→4（旧 7）
- newBox>=5：删除 → `{graduated:true}`
前端 Wrong.tsx L429-436：重练答对 toast `${next_days} 天后再复习这道题`，毕业 `🎓 连续答对多次，已自动移出错题本`。

账号：注册 `qa157-<ts>@test.zalize.com`（API register 拿 token，报 uid），先做一份「抗美援朝 2 题」卷全答错制造错题 Q_A/Q_B。按用户指示 API 直测为主（Bearer token curl），只看响应，不清库。

## T1 首答即对跳级（Q_A，box=1/lapses=0）
- `POST /api/wrongbook/<Q_A>/review {"correct":true}` → 期望 **`{"box":3,"next_days":3}`**。
- 失败判据：返回 box:2/next_days:1（旧逻辑）或其他值。

## T2 顽固题间隔减半 + 毕业（Q_B）
1. `{"correct":false}` ×2 → 每次期望 `{"box":1,"next_days":0}`（lapses 变 2/3？——注：初始入库 lapses=0，两次答错后 lapses=2）。
2. `{"correct":true}` → box1+lapses=2：newBox=2，days=ceil(1/2)=1 → 期望 **`{"box":2,"next_days":1}`**。
3. `{"correct":true}` → box2→3，days=ceil(3/2)=2 → 期望 **`{"box":3,"next_days":2}`**（旧逻辑 3，本值为减半独有）。
4. `{"correct":true}` → box3→4，days=ceil(7/2)=4 → 期望 **`{"box":4,"next_days":4}`**（旧 7）。
5. `{"correct":true}` → newBox=5 → 期望 **`{"graduated":true}`**，且 GET /api/wrongbook 中该题消失。

## T3 UI 抽查（录屏）：重练反馈文案
- 再做一份 2 题卷制造新错题（fresh box=1/lapses=0），进错题本 → 「错题重练」→ 答对一题。
- 期望 toast/反馈文案逐字 **「3 天后再复习这道题」**（旧行为「1 天后…」，可直接区分新旧逻辑）。
- 同时 CDP 监听 console error/pageerror/HTTP≥400 = 0。

产出：test-report-157.md + UI 部分录屏 + qa157 uid（不清库，报 uid 由用户清理）。
