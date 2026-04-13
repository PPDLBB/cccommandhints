# Refactor Notes (2026-04-13)

## What Changed

- 提炼需求基线与验收清单：`docs/requirements-baseline.md`
- `CommandHint` 组件拆分数据与滚动状态：
  - `src/widgets/command-hint/data.ts`
  - `src/widgets/command-hint/scroll-manager.ts`
- 渲染器拆分出布局辅助模块：`src/utils/renderer-layout.ts`
- 默认配置改为仅启用 `command-hint`：`src/types/Settings.ts`
- 命名链路统一为 `cccommandhints`，同时保留旧命令识别兼容：
  - `src/utils/claude-settings.ts`
  - `src/tui/App.tsx`
  - `src/tui/components/InstallMenu.tsx`
  - `src/utils/hooks.ts`
  - `src/utils/config.ts`
  - `src/utils/migrations.ts`

## Behavior Kept

- 宽屏三列、窄屏轮换、可关闭滚动的状态栏行为保持不变
- 旧版 `ccstatusline` 命令仍可被识别为已安装

## Verification

- `bun tsc --noEmit` 通过
- 重点回归测试通过：
  - `src/utils/__tests__/claude-settings.test.ts`
  - `src/utils/__tests__/widgets.test.ts`
  - `src/utils/__tests__/hooks.test.ts`
  - `src/utils/__tests__/config.test.ts`

## Known Gap

- 当前 `npm run lint` 在本仓库存在 `eslint-plugin-import` 与 ESLint 10 的兼容问题（`import/order` 运行时崩溃），不影响 TypeScript 编译与上述测试执行。
