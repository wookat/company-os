# 在 Claude Code 中使用 Company OS

角色文件格式与 Claude Code 子代理（subagents）兼容：frontmatter `name` + `description` + 正文即系统指令。

## 安装

```bash
bash adapters/install.sh claude
# 效果：roles/ 下所有角色复制到 ~/.claude/agents/company-os/，并把 CHARTER 内容前置注入每个角色
```

## 使用

- 自动路由：Claude Code 会按 description 自动选择合适的子代理
- 显式调用：`use @agent-project-lead and 启动 XX 项目，按 SOP-01 推进`
- 项目级配置：在项目 CLAUDE.md 中加入一节，声明本项目默认组队名单（参考 org/STRUCTURE.md 的组队模板）

## 建议

- 把 CHARTER.md 的「协作机制」摘要写入 `~/.claude/CLAUDE.md`（全局），保证任何会话都遵守授权自主推进原则
- project-lead 通过 Task 工具并行派生员工子代理，对应 Devin 的子会话
