// 全站统一 Tailwind 构建配置（取代各页 CDN 内联 config），npm run css 生成 public/tailwind.css
export default {
  content: ["./public/**/*.html", "./src/**/*.js"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "HarmonyOS Sans SC", "PingFang SC", "Noto Sans SC", "system-ui", "sans-serif"] },
      colors: {
        brand: { 50: "#EEF4FF", 100: "#DFEAFF", 200: "#C4D9FF", 300: "#9FC0FF", 400: "#6EA0FF", 500: "#3D7FFF", 600: "#2E6BEC", 700: "#2456C7", 800: "#1E46A0", 900: "#1B3B7F" },
        page: "#F4F6FA",
        ink: { DEFAULT: "#1E2330", 2: "#5A6472", 3: "#9AA3B2" },
        ok: { 50: "#E6F7F1", 100: "#C2EDDD", 500: "#00B578", 600: "#009A66", 700: "#007D54" },
        bad: { 50: "#FFEDED", 100: "#FFD6D7", 500: "#FF4D4F", 600: "#E5393B", 700: "#C22B2D" },
        warn: { 50: "#FFF6E5", 100: "#FFE9C2", 500: "#FFA716", 600: "#E58F00", 700: "#BF7700" },
        streak: { DEFAULT: "#FF7A2F", 50: "#FFF0E6", 100: "#FFDCC7", 500: "#FF7A2F", 600: "#E86518", 700: "#C25212" },
        night: { bg: "#0F1420", card: "#171E2E", line: "#232C42", ink: "#E8ECF4", ink2: "#A7B0C2", ink3: "#6B7690" },
      },
      boxShadow: { card: "0 1px 3px rgba(30,41,59,0.06)" },
    },
  },
};
