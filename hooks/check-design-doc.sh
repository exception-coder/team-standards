#!/usr/bin/env bash
# =============================================================
# 功能设计文档存在性检查脚本
# 触发时机：PreToolUse（Claude 调用 Write/Edit 工具前）
#
# 使用方法：
#   在 settings.json 的 hooks 中配置本脚本。
#   退出码：
#     0 = 允许继续
#     1 = 阻断操作，Claude 会收到 stderr 内容作为错误提示
# =============================================================

PROJECT_DIR="$(pwd)"
DESIGN_DOC_FOUND=0

# 检查常见设计文档路径
if ls "$PROJECT_DIR"/docs/design/*.md 1>/dev/null 2>&1; then
    DESIGN_DOC_FOUND=1
fi
if ls "$PROJECT_DIR"/docs/*design*.md 1>/dev/null 2>&1; then
    DESIGN_DOC_FOUND=1
fi
if ls "$PROJECT_DIR"/docs/*设计*.md 1>/dev/null 2>&1; then
    DESIGN_DOC_FOUND=1
fi
if [ -f "$PROJECT_DIR/DESIGN.md" ] || [ -f "$PROJECT_DIR/design.md" ]; then
    DESIGN_DOC_FOUND=1
fi

if [ "$DESIGN_DOC_FOUND" -eq 1 ]; then
    exit 0
else
    echo "[team-standards] 未找到功能设计文档。" >&2
    echo "请先在 docs/design/ 目录下创建功能设计文档（.md 格式），" >&2
    echo "参考模板：skills/design-doc-required/template.md" >&2
    echo "填写完毕后重新执行开发任务。" >&2
    exit 1
fi
