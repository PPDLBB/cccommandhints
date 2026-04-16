# cccommandhints Task List

## Completed

### Foundation & Requirements
- [x] Define requirement baseline and acceptance criteria (`docs/requirements-baseline.md`)
- [x] Establish product logic and system overview (`docs/product-logic.md`)
- [x] Setup TypeScript project with Vitest, Zod, chalk, Ink
- [x] Implement configuration schema (v3) with Zod validation
- [x] Implement config load/save, backup on corruption, and migration pipeline

### Core Rendering Pipeline
- [x] Implement ANSI width handling (`getVisibleWidth`, `truncateStyledText`)
- [x] Implement two-stage renderer (pre-render + final render)
- [x] Implement terminal width resolution (`full`, `full-minus-40`, `full-until-compact`)
- [x] Implement flex-separator spacing and line truncation
- [x] Implement widget registry and layout widget manifest

### CommandHint Widget
- [x] Define default command groups with Chinese translations
- [x] Implement wide-screen horizontal layout (3 columns)
- [x] Implement narrow-screen vertical layout (group rotation with indicator)
- [x] Implement pagination for overflow commands
- [x] Implement horizontal scroll manager with disable option
- [x] Implement dynamic command discovery via `claude -p /help`
- [x] Implement custom command scanning from `.claude/commands`

### TUI (Ink)
- [x] Build TUI root (`App.tsx`) with screen routing
- [x] Build main menu with install/uninstall, save, exit
- [x] Build line selector with drag-to-reorder
- [x] Build items editor (add/remove/move widgets, rawValue toggle)
- [x] Build color menu (per-line foreground/background colors)
- [x] Build terminal options menu (color level, flex mode)
- [x] Build terminal width submenu
- [x] Build powerline setup screen (themes, font check, install)
- [x] Build global overrides menu (padding, separators, bold, minimalist)
- [x] Build install menu (npx / bunx selection)
- [x] Build confirm dialogs for destructive actions
- [x] Wire all hidden TUI components into main menu and router
- [x] Real-time status line preview in TUI

### Claude Code Integration
- [x] Implement `claude-settings.ts` read/write for `statusLine`
- [x] Implement install with backup and replace-detection
- [x] Implement uninstall with managed hooks cleanup
- [x] Implement hook synchronization (`syncWidgetHooks`)
- [x] Support backward compatibility for old `ccstatusline` command prefix

### Powerline & Theming
- [x] Implement Powerline mode with Nerd Font separators
- [x] Implement auto-align across lines
- [x] Implement Powerline theme definitions
- [x] Implement Powerline font detection and installation helper

### Testing & Quality
- [x] Add unit tests for settings, widgets, hooks, config, claude-settings
- [x] Ensure `bun tsc --noEmit` passes
- [x] Ensure 384 tests pass

### Documentation
- [x] Write requirement baseline
- [x] Write product logic document
- [x] Write refactor notes (2026-04-13)
- [x] Write architecture document
- [x] Write system design document
- [x] Write task list document

## In Progress / Pending

- [ ] Commit and push TUI expansion changes to GitHub
- [ ] Resolve `eslint-plugin-import` compatibility issue with ESLint 10

## Backlog / Future Enhancements

- [ ] Add more functional widgets (clock, git branch, current project, etc.)
- [ ] Add E2E tests for TUI critical flows using Playwright or ink-testing-library
- [ ] Add visual regression tests for status line output
- [ ] Support custom user-defined themes beyond built-in Powerline themes
- [ ] Optimize dynamic discovery caching (persist TTL, invalidate on Claude version change)
- [ ] Add i18n framework if expanding to languages beyond Chinese
