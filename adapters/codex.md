# 在 Codex 中使用 Company OS

Codex 通过 AGENTS.md（用户级 `~/.codex/AGENTS.md` 或项目级 `<repo>/AGENTS.md`）注入指令，无原生多子代理机制，适合"单员工深度作业"场景。

## 安装

```bash
bash adapters/install.sh codex <项目目录>
# 效果：在项目目录生成/追加 AGENTS.md，内容 = CHARTER 摘要 + 指定角色定义
# 默认注入 project-lead；可用第三参数指定角色，如：
bash adapters/install.sh codex ~/repos/myapp engineering/backend-engineer
```

## 使用模式

- **一会话一角色**：每个 Codex 会话扮演一个角色；换角色时重新生成 AGENTS.md 或在 prompt 中显式声明"你现在是 roles/<x> 角色"
- **与 Devin/Claude Code 分工**：Codex 适合领单个明确任务（spec 已写清）；编排与并行组队交给 Devin（子会话）或 Claude Code（subagents）

## 注意

- AGENTS.md 会被 Codex 全量读取，注意长度控制：只注入 CHARTER 摘要 + 当前角色，不要注入全部 30 个角色
