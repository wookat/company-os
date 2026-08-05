# 真题工坊 Taro 客户端（微信小程序 + H5 + APP 路径）

基于已评审的三端原型（`designs/zhenti-fenbi/`，分支 `zhenti-redesign`）落地的一套代码多端客户端。

- 技术栈：**Taro 4.2.1（React + TypeScript）+ NutUI React Taro 3.x + Sass**
- 视觉：严格按 `DESIGN-SPEC.md` token（品牌蓝 `#3D7FFF`、玫红 `#F43F5E`、页底 `#F5F7FB`、白圆角卡、tabular-nums、44px 触控）
- API：线上生产 `https://zhenti.zalize.com`（JWT Bearer）
- 二期已按老板指令把 Web 端（/app2 build dd7b90f）功能 100% 移植，逐项对照见 `功能对照表.md`（含 AI 补练/出卷额度闭环）

## 页面清单

| 页面 | 路径 | 数据来源 |
|---|---|---|
| 登录 / 注册 | `pages/login` | `/api/login` `/api/register` |
| 首页工作台（倒计时/打卡/每日一题/三步上手/2026 新卷/今日任务/快捷入口/弱项榜） | `pages/home` | `/api/stats` `/api/checkin` `/api/kpstats` `/api/real/years` `/api/subjmemo` `/api/real/daily` `/api/daily-reveal` |
| 按考点选题（分组 chips + 就地过滤，真题直练/AI 补练入口） | `pages/kps` | `/api/real/kps` `/api/real/kp` `/api/kpdrill` |
| AI 补练（选考点/题量/附加分析题，额度校验） | `pages/drill` | `/api/materials/:id` `POST /api/papers` `/api/me` |
| 搜索（年份+题号直达 / 考点关键词，结果可收藏/直练） | `pages/search` | `/api/real/search` `/api/real/browse` `/api/real/subjective` |
| 真题收藏（列表/取消/收藏自测卷） | `pages/favs` | `/api/realfav*` `/api/real/favpaper` |
| 真题年份列表 | `pages/years` | `/api/real/years`，点击 `/api/real/paper?year=` 组卷 |
| 答题页（单选/多选/标记/答题卡/计时/交卷判分） | `pages/exam` | `/api/papers/:id` `/api/papers/:id/submit`，交卷后自动 `/api/checkin` 打卡 |
| 成绩页（环形得分/薄弱考点/错题入口/逐题解析） | `pages/result` | 交卷响应或 `/api/papers/:id/result` |
| 错题本（今日复习/全部/收藏、重练判分、看解析） | `pages/wrong` | `/api/wrongbook` `/api/wrongbook/:id/review` `/api/favorites` |
| 分析题背诵（科目筛选/要点遮盖/背会打卡/到期温习） | `pages/recite` | `/api/real/subjective*` `/api/subjmemo*` |
| 学习报告（周/月摘要、近 7 日趋势、弱项 CTA）【APP 页】 | `pages/report` | `/api/stats` `/api/kpstats` `/api/checkin` |
| 推送设置（5 个本地开关 + 免打扰时段）【APP 页】 | `pages/push` | 本地 Storage（UI + 本地开关） |
| 我的（会员/额度/每日提醒邮件/邀请好友/考点覆盖/入口列表） | `pages/mine` | `/api/me` `/api/remind` `/api/stats` `/api/checkin` |
| 做题记录 | `pages/records` | `/api/history` |

导航：按小程序设计说明采用 4 项 tab（工作台/真题/错题本/我的，自绘共享组件 `components/TabBar`，含错题到期角标），背诵从首页任务卡/快捷入口进入，「我的」页无任何外链。

## 编译步骤

```bash
cd clients/zhenti-taro
npm install

# 微信小程序（产物在 dist/）
npm run build:weapp

# H5 开发/演示（自带 /api → https://zhenti.zalize.com 反向代理，见 config/dev.ts）
npm run dev:h5    # http://localhost:10086

# H5 生产构建
npm run build:h5
```

### 微信开发者工具（无 AppID 测试号模式）

1. 微信开发者工具 → 导入项目 → 目录选 `clients/zhenti-taro`（`project.config.json` 已配置 `miniprogramRoot: ./dist`，AppID 为 `touristappid` 测试号）。
2. 先执行 `npm run build:weapp`（或 `npm run dev:weapp` 热更）。
3. 测试号无法配置 request 合法域名：在「详情 → 本地设置」勾选 **「不校验合法域名…」** 即可直连线上 API。

## 后续接入正式 AppID

1. 在 mp.weixin.qq.com 注册小程序，取得 AppID，替换 `project.config.json` 的 `appid`。
2. 「开发管理 → 开发设置 → 服务器域名」将 `https://zhenti.zalize.com` 加入 **request 合法域名**（域名需 ICP 备案 + 有效 HTTPS 证书）。
3. 推送提醒改用微信「订阅消息」：申请模板 → 端内 `Taro.requestSubscribeMessage` 授权 → 后端在触发时调用订阅消息发送 API（`pages/push` 的开关值可上报后端作为触发偏好）。
4. 上传体验版 → 提审发布。

## APP（React Native / 打包签名）路径

Taro 支持同代码编译 RN：

1. `npm i @tarojs/rn-runner @tarojs/components-rn @tarojs/taro-rn react-native`（版本与 Taro 对齐），执行 `taro build --type rn`。
2. 用 `taro init` 生成的 RN 壳工程（或 `@tarojs/cli` 的 taro-native-shell）承载产物。
3. Android 签名：`keytool -genkeypair -v -keystore zhenti.keystore -alias zhenti -keyalg RSA -validity 36500`，在 `android/app/build.gradle` 配 `signingConfigs` 后 `./gradlew assembleRelease`。
4. iOS 签名：Apple Developer 账号创建 App ID + 证书 + Provisioning Profile，Xcode 配置 Team 后 Archive 上传。
5. 备选（更省力）：用 H5 产物 + Capacitor/WebView 壳打包，推送用极光/个推等第三方 SDK。
6. 本仓库 `pages/report`、`pages/push` 即 APP 原型专属页面，样式 token 已抽为 CSS 变量（`src/app.scss`），RN 侧可映射为主题常量。

## API 缺口清单（汇报，不改后端）

1. **CORS 未开放**：Worker 所有 `/api/*` 响应无 `Access-Control-Allow-Origin`，浏览器直连跨域失败。H5 演示当前用 devServer 代理绕过；若要正式发 H5，需要后端加 CORS 头或同域部署（小程序/RN 不受影响）。
2. **小程序 request 域名白名单**：正式 AppID 需在微信后台把 `https://zhenti.zalize.com` 配为 request 合法域名；测试号只能用「不校验合法域名」开关。
3. **无 token 刷新接口**：JWT 30 天有效，过期只能重新登录（客户端已做 401 自动跳登录）。
4. **推送触达无后端支持**：无订阅消息/推送相关接口，`pages/push` 目前为本地开关（按任务要求 UI + 本地状态）。
5. **`/api/real/paper` 免费额度不限真题**：真题组卷不消耗 AI 出卷额度（`quota.paper_left` 仅限 AI 出卷），符合「不触发 AI 额度」要求；`/api/real/randpaper`、`/api/real/weak` 同为题库组卷，无 AI 调用。

## 未尽事项

- 微信开发者工具仅能在 Windows/macOS 运行，本次在 Linux 环境完成 `build:weapp` 编译验证（产物 `dist/` 正常生成），开发者工具内截图待有 Win/Mac 环境补充。
- APP 端未实际打包（按「尽力而为」口径提供上述 RN/壳工程接入路径），报告/推送两张 APP 专属页已在同一代码内实现并可 H5 预览。
- echarts 图表：报告页趋势采用轻量自绘柱状（与 APP 原型一致）；如需复杂图表可接 `echarts-for-weixin` / `taro-echarts`。
- 会员购买/支付未入端（小程序虚拟支付合规限制），我的页展示会员状态，开通仍走 Web。
- Web 的打印功能以「分享图生成 PNG 保存/下载」替代（平台限制）。

## 测试账号（用后可清库）

- 一期：`devin.taro.test@example.com`（密码 TaroTest123）
- 二期：`devin.taro@test.zalize.com`（密码 TaroTest2026，uid 234，免费版，产生做题/错题/收藏/自评/AI 补练测试数据）
- QA161 修复自测：`devin.qa161@test.zalize.com`（密码 TaroTest2026，少量收藏数据）
