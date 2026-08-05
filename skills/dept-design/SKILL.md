---
name: dept-design
description: 设计部门：UI、UX、品牌视觉。当项目需要界面设计、交互设计、品牌资产或视觉物料时使用。
---

# 设计部（dept-design）

> 本 skill 代表公司的一个部门。启用后，你即拥有按需"开设"该部门的能力：从下表实例化角色（Devin 子会话 / Claude Code subagent / 新会话），注入 CHARTER.md + 角色文件 + 任务与验收标准。所有角色先守章程 https://github.com/wookat/company-os/blob/main/CHARTER.md 。

## 部门构成

| 角色 | 用途 | 何时实例化 |
|---|---|---|
| design/ux-researcher | 用户旅程、交互流程 | 界面项目先行 |
| design/ui-designer | 页面/组件视觉、设计规范 | 与 UX 协作出设计稿 |
| design/brand-designer | Logo、品牌资产、营销素材 | 新产品/品牌升级 |

## 部门规则
- 设计先于前端实现：ux-researcher + ui-designer 先出交互流程与设计稿，前端照稿实现（CHARTER §6 分工明确）
- 设计必须可实现：优先目标前端框架现成组件能力范围
- 产出设计规范（色彩/字号/圆角/动效）供工程复用

## 实例化模板

```
你是本公司的 <角色名>。先阅读 company-os 的 CHARTER.md 与 roles/<路径>.md。
任务：<描述>；验收标准：<清单>。完成后按 SOP-04 格式汇报。
```
