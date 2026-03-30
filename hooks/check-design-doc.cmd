@echo off
REM =============================================================
REM 功能设计文档存在性检查脚本（示例）
REM 触发时机：PreToolUse（Claude 调用 Write/Edit 工具前）
REM
REM 使用方法：
REM   将 hooks.json 中的 _disabled_hooks 改为 hooks 以启用。
REM   本脚本退出码：
REM     0 = 允许继续
REM     1 = 阻断操作，Claude 会收到 stderr 内容作为错误提示
REM =============================================================

REM 获取当前工作目录（Claude 执行时的项目根目录）
set "PROJECT_DIR=%CD%"
set "DESIGN_DOC_FOUND=0"

REM 检查常见设计文档路径
if exist "%PROJECT_DIR%\docs\design\*.md" set "DESIGN_DOC_FOUND=1"
if exist "%PROJECT_DIR%\docs\*design*.md" set "DESIGN_DOC_FOUND=1"
if exist "%PROJECT_DIR%\docs\*设计*.md" set "DESIGN_DOC_FOUND=1"
if exist "%PROJECT_DIR%\DESIGN.md" set "DESIGN_DOC_FOUND=1"
if exist "%PROJECT_DIR%\design.md" set "DESIGN_DOC_FOUND=1"

if "%DESIGN_DOC_FOUND%"=="1" (
    REM 文档存在，允许继续
    exit /b 0
) else (
    REM 文档不存在，输出错误信息并阻断
    echo [team-standards] 未找到功能设计文档。>&2
    echo 请先在 docs/design/ 目录下创建功能设计文档（.md 格式），>&2
    echo 参考模板：skills/design-doc-required/template.md>&2
    echo 填写完毕后重新执行开发任务。>&2
    exit /b 1
)
