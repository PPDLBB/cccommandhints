# Changelog

## [1.1.0] - 2026-04-15

### Features
- **Multi-line layout**: CommandHint widget now renders as 4 fixed lines (one per group: 对话控制 / 信息查看 / 配置工具 / 开发协作)
- **Queue-style rotation**: Commands rotate like a queue — drop the first, shift left, append a new one
- **Independent scrolling**: Each group scrolls its horizontal marquee independently via per-key ScrollStateManager
- **Dynamic command discovery**: Automatically runs `claude -p /help` to discover available slash commands, caches results locally for 30s
- **Chinese description mapping**: 60+ built-in command descriptions; unknown commands get inferred from keyword heuristics
- **Smart classification**: All dynamically discovered commands are classified into the 4 fixed groups automatically

### Improvements
- Fixed CJK and emoji width calculations using `getVisibleWidth()` instead of string `.length`
- Fixed multi-line widget truncation in renderer to handle `\n` correctly
- Added `s` keybind to toggle scroll per group; `r` to toggle raw value mode

### Maintenance
- Fixed 23 pre-existing test failures after widget manifest simplification (384 pass / 0 fail)
- Downgraded ESLint to 8.57.1 for compatibility with `eslint-plugin-import`
- Resolved all 54 lint errors and added `.claude/**` to eslint ignores

## [1.0.0] - 2026-04-12

- Initial release: Claude Code command hints status line with Chinese descriptions
- Basic widget layout and TUI configuration
