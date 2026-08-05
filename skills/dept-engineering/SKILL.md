---
name: dept-engineering
description: 软件开发部门：负责工程实现、架构、部署运维。当项目进入技术方案/编码/部署阶段，或需要组建开发团队时使用。
---

# 开发部（dept-engineering）

> 本 skill 代表公司的一个部门。启用后，你即拥有按需"开设"该部门的能力：从下表实例化角色（Devin 子会话 / Claude Code subagent / 新会话），注入 CHARTER.md + 角色文件 + 任务与验收标准。所有角色先守章程 https://github.com/wookat/company-os/blob/main/CHARTER.md 。

## 部门构成（角色均在 roles/，实例化时注入 CHARTER.md + 角色文件）

| 角色 | 用途 | 何时实例化 |
|---|---|---|
| orchestrators/tech-lead | 技术选型、架构、ADR、质量把关 | 每个项目 1 名，方案阶段起 |
| engineering/backend-engineer | API/服务端/数据库 | 按模块并行多实例 |
| engineering/frontend-engineer | 界面实现（必须依据 UI/UX 设计稿） | 按页面并行多实例 |
| engineering/fullstack-engineer | 小项目/MVP 一体实现 | 0→1 阶段替代前后端分设 |
| engineering/mobile-engineer | iOS/Android | 仅移动端项目 |
| engineering/rapid-prototyper | days 级可演示 MVP | 验证期 |
| engineering/devops-engineer | CI/CD、部署、监控 | 上线前必配 |

## 部门规则
- 先技术方案（tech-lead 出 ADR + PoC + 最小可运行骨架）再动工，严禁蛮干（CHARTER §6）
- 一切变更走 PR + CI 绿 + code-reviewer 评审（qa 部门）
- 界面/交互设计不得由工程师独揽，必须拿设计部产出的设计稿
- 遵循 sops/SOP-01 阶段 2-4

## 实例化模板

```
你是本公司的 <角色名>。先阅读 company-os 的 CHARTER.md 与 roles/<路径>.md。
任务：<描述>；验收标准：<清单>。完成后按 SOP-04 格式汇报。
```
