# Requirement Baseline and Acceptance

## Requirement to Implementation Mapping

| Requirement | Acceptance Baseline | Current Implementation |
| --- | --- | --- |
| 在状态栏展示 Claude `/commands` 中文释义 | 输出至少覆盖 `clear/restart/rename/compact/cost/usage/status/config/api/mcp` 的中文说明 | `src/widgets/command-hint/data.ts`, `src/widgets/CommandHint.tsx` |
| 智能布局（宽屏三列、窄屏轮换） | 终端宽度 `>=100` 走三列；`<100` 走单组轮换 | `src/widgets/command-hint/rendering.ts`, `src/widgets/CommandHint.tsx` |
| 长文本自动横向滚动 | 文本超出分配宽度时按时间推进 offset 且可关闭滚动 | `src/widgets/command-hint/scroll-manager.ts`, `src/widgets/command-hint/rendering.ts` |
| 命令分组展示 | 至少包含对话控制/信息查看/配置工具三组 | `src/widgets/command-hint/data.ts` |
| TUI 可安装到 Claude Code | 在 `settings.json` 写入可识别的 `statusLine.command`，并处理备份 | `src/utils/claude-settings.ts`, `src/tui/components/InstallMenu.tsx` |
| 配置入口与默认配置可用 | 首次启动生成有效默认配置且可渲染 | `src/types/Settings.ts`, `src/utils/config.ts` |

## Acceptance Checklist

1. 启动 `cccommandhints` 进入 TUI，默认已有 `Command Hints` 组件。
2. 预览宽度 >=100 时显示三组分栏；宽度 <100 时显示轮换组并带轮换指示。
3. 将滚动关闭后，超长文本不再滚动而是截断显示。
4. 安装流程写入 `cccommandhints` 命令；若检测到旧 `ccstatusline` 命令仍判定为已安装（兼容）。
5. 卸载流程移除状态栏配置与受管 hooks 标签（含新旧标签）。
6. 损坏配置文件时会备份并回退到默认配置。
