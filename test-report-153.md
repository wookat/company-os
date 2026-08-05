# 第 153 轮 QA 快速复验报告（build a757fd8，bundle assets/index-CtNxTDus.js）

- 目标：UX152 两项 P3 修复——①按考点就地过滤输入框（Real.tsx L231-243）；②考点 chip 热区 `min-h-[40px] sm:min-h-[32px]`
- 计划：/home/ubuntu/zhentigongfang/test-plan-153.md
- **测试账号（请清库）：qa153-1785901379@test.zalize.com，uid=217**（attempt 0——exam/340 未作答退出；无 material/KV）
- 轻量轮，按用户指示无录屏、关键截图留证。

## T1 就地过滤（passed）

硬刷新（Ctrl+Shift+R）后新过滤框出现，placeholder 逐字「输考点名就地过滤，如“量变”“抗日”…」。注意：普通 hash 路由切换加载的是旧缓存 bundle，无过滤框（no-store 只覆盖 index.html，assets 靠指纹换名，浏览器内存缓存需硬刷新一次）：

![过滤框出现](https://app.devin.ai/attachments/c60d625a-a299-44a1-8a0c-8fb0b24522d0/ss_3776ea37.png)

CDP Input.insertText 输「量变」：仅剩「量变质变规律 1 题」1 个 chip，仅保留「马原·哲学 1 个考点（已过滤）」分组，其余 4 个分组隐藏，输入框出现 ×（type=search 原生清除钮）：

![过滤「量变」](https://app.devin.ai/attachments/a525abe8-abcb-478a-8b57-8947006296a0/ss_8ca2eeaa.png)

点 × 清空：恢复 5 个分组 / 118 个考点 chip（DOM 计数），「（已过滤）」后缀消失：

![清空恢复](https://app.devin.ai/attachments/4aa50d95-db52-47c1-a1b8-9e1a49576f7d/ss_1a11408f.png)

过滤「抗美」→ 点「抗美援朝 2 题」chip → 正常组卷进入 exam/340（免费真题卷，未消耗 AI 额度；未作答即退出，无 attempt）：

| 过滤「抗美」 | 点 chip 组卷成功 |
|---|---|
| ![过滤抗美](https://app.devin.ai/attachments/35023e11-3da6-4ba6-a8fa-5cb94a9037e8/ss_48cf5109.png) | ![exam/340](https://app.devin.ai/attachments/2ce94f58-a3fc-49a4-b05e-7df082dd5370/ss_f4f70ca1.png) |

## T2 chip 热区（passed）

CDP getBoundingClientRect 全量量测：

| 视口 | chip 高度（全部 chip 去重） | 判定 |
|---|---|---|
| 1440px | **32px** | 保持不变 ✓ |
| 390px | **40px**（minH=40，118/118） | ≥40 达标 ✓（UX152 时为 32） |

390px 下过滤框同样可见、scrollWidth=390 无横向溢出：

![390 chip 40px](https://app.devin.ai/attachments/1d54fcf9-1ff9-4a8d-ba97-6a094eeaafcf/t153-390-real.png)

## T3 常规回归（passed）

- CDP 监听 #real 重载 + 全部过滤操作：console error=0、pageerror=0、HTTP≥400=0（本轮无任何豁免项）。
- 中文输入按 SKILL 口径全程用 CDP Input.insertText（先 el.focus()），一次成功。

## 结论

| 项 | 结果 |
|---|---|
| 过滤框展示 + 命中过滤 + 空分组隐藏 +「（已过滤）」标记 | passed |
| 清空恢复 118 chip / 5 分组 | passed |
| 过滤态点 chip 正常组卷（exam/340） | passed |
| 390px chip=40px / 1440px=32px | passed |
| console/pageerror/HTTP≥400 全零 | passed |

无新 P0–P3。P4 备注：老用户浏览器可能仍持旧 bundle 内存缓存，首次普通导航看不到过滤框，硬刷新/新开标签后正常（assets 指纹机制本身正确，属浏览器缓存生命周期，无需修复）。测试号 qa153-1785901379@test.zalize.com（uid=217）请清库。
