# 真题工坊 RN 原生 APP（zhenti-rn）

考研政治刷真题产品「真题工坊」的原生移动端（替代 Taro+Capacitor 装壳方案）。

## 技术栈

- Expo SDK 57 + React Native 0.86 + TypeScript（严格模式）
- expo-router 文件路由 + 底部 Tab 导航
- NativeWind v4（Tailwind 语法）
- react-native-reanimated 动效 + expo-haptics 触感反馈
- expo-secure-store token 持久化
- 深色模式：跟随系统 + 手动三态切换（我的页）

## 目录

- `app/` 页面（expo-router）：`login` 登录注册、`(tabs)/` 首页/刷真题/错题本/我的、`exam/[id]` 答题、`result/[id]` 成绩
- `lib/api.ts` API client（直连 https://zhenti.zalize.com）
- `lib/theme.tsx` 主题三态 + 大字模式
- `components/` ScaleButton（按压缩放+触感）、Toast

## 开发

```bash
npm install
npx tsc --noEmit        # 类型检查
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug   # debug APK：android/app/build/outputs/apk/debug/
```

模拟器运行：`npx expo run:android`。

注意：CI/沙盒环境若 Maven Central 被限流（429），在 `~/.gradle/init.gradle` 配置阿里云镜像（central + gradle-plugin）。
