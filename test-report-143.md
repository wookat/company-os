# UX 第 143 轮 — 提醒/邮件成长闭环体验走查报告（生产 Worker 0c4f799a）

- 日期：2026-08-05；bundle 实测 `assets/index-CICgmaFE.js`（含新注册超时文案）
- 测试账号（请清库）：**ux143-1785890295@test.zalize.com，uid=209**（无 attempt，1 条打卡记录；提醒最终已关，KV `remind:209` 自删无残留）
- 定位：体验走查（非功能 QA），建议不改代码。录屏：`/home/ubuntu/screencasts/rec-a7d3d4c9-e41b-4b6e-bc43-ef4df621665f/rec-a7d3d4c9-e41b-4b6e-bc43-ef4df621665f-edited.mp4`

## P0–P3 问题清单

**无 P0 / P1。**

### P2-1 引导 toast「3 秒 + 不可点」转化链路过弱（验收第 2 项）
- 实测：打卡成功 toast 后 ~3.5s 出现「怕忘打卡？「我的」页可开启每天 8:00 邮件提醒」（22 字），仅显示 3s、纯文本不可点、且一次性（`zt_remind_hint` 永久写死）。按 8 字/秒阅读约需 2.8s——用户刚读完 toast 就消失，没有任何时间行动；错过即永无二次触达。
- 转化路径本身很短（我的 1 击 → switch 1 击，1440px 无需滚动；390px 需约 2 屏滚动到卡片），瓶颈完全在 toast 载体。
- 建议（按优先级）：① toast 加「去开启 ›」可点击跳 `#account`（点击后再清 hint，未点击不写死，改为最多提示 2–3 次）；② 时长对带动作的 toast 延长到 6–8s；③ 或改为工作台打卡卡片下的常驻可关闭 inline banner，直到开启/显式关闭。

### P2-2 app2 首屏 HTML 边缘缓存导致新文案不生效（走查中实测撞上）
- 本轮浏览器最初加载的是旧 bundle `index-DmQjVwRZ.js`，注册超时实际弹的是旧的通用文案「网络较慢或已超时，请重试」，硬刷新后才拿到新 bundle 与新文案。真实用户（PWA/回访）在缓存过期前完全享受不到本次文案改进。建议：确认 `/app2/` HTML 的 cache-control / 边缘缓存 TTL 是否过长，或部署后主动 purge。

### P3-1 双端提醒文案口径不一致（验收第 1 项）
- app2：「每天 8:00 **发邮件提醒：到期错题数 + 每日一题；当天已打卡则不打扰**」
- 旧版：「每天 8:00 **邮件提醒到期错题与每日一题，当天已打卡不发送**」
- 语义等价但措辞、标点、豁免措辞（不打扰 vs 不发送）不同；开启 toast 双端一致（「已开启，每天 8:00 邮件提醒（已打卡当天不发）」）。预期管理本身合格：时间（8:00）、内容（到期错题数+每日一题）、豁免（已打卡不发）三要素都讲清了。建议统一为 app2 版本。

### P3-2 注册超时 toast 信息密度过高且仍只显示 3 秒
- 新文案 38 字：「网络较慢，注册请求可能已在服务端完成——请稍后用该邮箱密码直接登录，若提示不存在再重新注册」。内容本身可行动、逻辑清晰（先试登录→不存在再注册），是对 QA142 静默失败的正确修复；390px 折行 2 行（rect 16–374，h=64，scrollWidth=390 无溢出）可接受。
- 但 38 字 ÷ 3s ≈ 12.7 字/秒，远超正常阅读速度，读到一半就消失。建议：错误类/长文案 toast 时长按字数自适应（如 `max(3s, len*150ms)` ≈ 5.7s），或该场景改成表单内 inline 错误块（不会消失，且可以内置「去登录」按钮直接切换 mode）。

### P4（备注）
- 走查期间生产 `/app` 首次加载 ~40s（既知慢窗口）；390px 下 app2「我的」页安装提示浮层曾遮挡修改密码区（旧版同样有「装到主屏幕」浮层压住内容，可关闭，不算新问题）。

## 走查证据

### 1. 注册慢路径新 toast（fetch 包装 20s abort 实测）
| 🖥 1440px（硬刷新后新 bundle，逐字命中） | 📱 390px（2 行折行，无溢出） |
|---|---|
| ![reg timeout 1440](https://app.devin.ai/attachments/963c7aed-380d-48ac-ba59-781de96c53be/ss_a483ba4e.png) | ![reg timeout 390](https://app.devin.ai/attachments/1a7456b5-7904-44e0-bab2-be7f27303d52/ux143_390_reg_timeout_toast.png) |

### 2. 打卡→引导 toast→开提醒转化动线
| 🟢 引导 toast（打卡后 ~3.5s，仅 3s） | 🟢 我的页 1 击直达，switch 开启 + 预期 toast |
|---|---|
| ![hint toast](https://app.devin.ai/attachments/7ad53f4c-fbe4-44cf-9d56-a58890ac5480/ss_9475cae6.png) | ![switch on](https://app.devin.ai/attachments/f2ba5d09-c874-42e4-a3ec-98bff377490a/ss_02d3def2.png) |

### 3. 双端「我的」页对比（同账号，switch 同步为开）
| app2 390px | 旧版 /app 390px |
|---|---|
| ![app2 390](https://app.devin.ai/attachments/cc169626-f324-4392-8cde-18e0332607c0/ux143_390_app2_account.png) | ![legacy 390](https://app.devin.ai/attachments/80e77252-6a8c-427c-9d26-c912a0b02a2e/ux143_390_legacy_account.png) |

旧版 1440px（switch 同步开、文案差异可见）：
![legacy 1440](https://app.devin.ai/attachments/1e081113-b3e8-48d1-9744-cbbc1f9bd1cb/ss_96b0db69.png)

### 4. 清理终态（提醒已关，KV 自删）
![remind off](https://app.devin.ai/attachments/bb422401-c40e-4164-9c4d-0660bb10b937/ss_0b1e224d.png)

## 回归
- 两端「我的」页 390px scrollWidth=390 无横向溢出；1440px 视觉层级正常，提醒卡均位于兑换/升级会员与修改密码之间，switch 品牌蓝一致（app2 48×28，旧版 56×32——尺寸略不同，属 P4 级差异）。
- console error / pageerror / unhandledrejection：全零（豁免计划内注入与一条注册 429 探测）。
- 插曲：注册被 IP 限频 5 次/小时（QA142 4 号 + 探测耗尽），等待 ~30 分钟窗口重置后成功注册；期间先完成了无需登录的 W3。

## 结论
提醒/邮件成长闭环整体成立：开关好找（1440 无需滚动）、预期管理三要素齐全、双端同步正确、慢注册终于有可行动提示。主要短板集中在「toast 作为转化/长文案载体」上（P2-1、P3-2）与部署缓存（P2-2）。
