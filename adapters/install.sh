#!/usr/bin/env bash
# Company OS 安装脚本
# 用法:
#   bash adapters/install.sh claude                     # 安装到 Claude Code (~/.claude/agents/company-os/)
#   bash adapters/install.sh codex <项目目录> [角色路径]  # 生成/追加 AGENTS.md（默认角色 orchestrators/project-lead）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-}"

charter_summary() {
  echo "## 公司章程（摘要，完整版见 CHARTER.md）"
  echo
  sed -n '/## 3. 协作机制/,/^## 5/p' "$ROOT/CHARTER.md"
}

case "$MODE" in
  claude)
    DEST="$HOME/.claude/agents/company-os"
    mkdir -p "$DEST"
    find "$ROOT/roles" -name '*.md' | while read -r f; do
      rel="${f#"$ROOT"/roles/}"
      slug="$(basename "$f" .md)"
      out="$DEST/$slug.md"
      # 保留 frontmatter，在正文前注入章程摘要
      awk 'NR==1,/^---$/{print; next}{exit}' "$f" > /dev/null # noop validate
      {
        # frontmatter
        awk 'c<2{print} /^---$/{c++}' "$f"
        echo
        charter_summary
        echo
        # body (after 2nd ---)
        awk '/^---$/{c++; next} c>=2{print}' "$f"
      } > "$out"
      echo "installed: $rel -> $out"
    done
    echo "完成。重启 Claude Code 后可用 /agents 查看。"
    ;;
  codex)
    PROJ="${2:?用法: install.sh codex <项目目录> [角色路径]}"
    ROLE="${3:-orchestrators/project-lead}"
    ROLE_FILE="$ROOT/roles/$ROLE.md"
    [ -f "$ROLE_FILE" ] || { echo "角色不存在: $ROLE"; exit 1; }
    OUT="$PROJ/AGENTS.md"
    {
      echo "# Company OS 角色注入（自动生成，勿手改此节）"
      echo
      charter_summary
      echo
      awk '/^---$/{c++; next} c>=2{print}' "$ROLE_FILE"
    } >> "$OUT"
    echo "已追加角色 $ROLE 到 $OUT"
    ;;
  skills)
    DEST="$HOME/.claude/skills"
    mkdir -p "$DEST"
    for d in "$ROOT"/skills/dept-*/; do
      name="$(basename "$d")"
      mkdir -p "$DEST/$name"
      cp "$d/SKILL.md" "$DEST/$name/SKILL.md"
      echo "installed skill: $name"
    done
    echo "完成。9 个部门 skill 已装入 $DEST。"
    ;;
  *)
    echo "用法: install.sh claude | install.sh skills | install.sh codex <项目目录> [角色路径]"; exit 1;;
esac
