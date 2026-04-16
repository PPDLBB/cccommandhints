# cccommandhints System Design

## 1. Data Flows

### 1.1 Pipe Rendering Flow

```
Claude Code stdout (StatusJSON)
           │
           ▼
    ┌──────────────┐
    │ Zod validate │  src/ccstatusline.ts
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Build context│  transcript_path → token metrics, duration, speed
    │              │  usage prefetch, skills metrics from hook records
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Pre-render   │  src/utils/renderer.ts
    │ all widgets  │  Compute plainLength per widget
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Calculate max│  src/utils/renderer.ts
    │ widths       │  For autoAlign in Powerline mode
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Final render │  Apply separators, padding, colors, powerline
    │ per line     │  Flex分配, truncation
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Post-process │  Replace spaces with \u00A0
    │              │  Prefix \x1b[0m reset code
    └──────────────┘
           │
           ▼
    stdout (ANSI string)
```

### 1.2 TUI Configuration Flow

```
runTUI()
    │
    ▼
loadSettings() ──► default config if missing
    │
    ▼
Ink render <App />
    │
    ├── React state: settings, originalSettings, screen, selectedLine, menuSelections
    │
    ├── User actions: edit lines, colors, terminal options, powerline, global overrides
    │
    ├── Ctrl+S ──► saveSettings(settings) + syncWidgetHooks()
    │
    └── Save & Exit ──► saveSettings(settings) + exit()
```

### 1.3 Hook Recording Flow

```
Claude Code hook invocation
    │
    ▼
cccommandhints --hook <hook-json>
    │
    ▼
Parse hook payload
    │
    ▼
Record skill invocation count
    │
    ▼
Write to ~/.config/cccommandhints/skills.json
```

## 2. Component Interactions

### 2.1 Widget Interface

All widgets implement:

```typescript
interface Widget {
  id: string;
  type: string;
  render(ctx: RenderContext): string;
  getHooks?(): WidgetHookDef[];
}
```

- `render()` receives `RenderContext` containing terminal width, usage data, skills counts, etc.
- `getHooks()` optionally declares Claude Code hooks that the widget wants to observe.

### 2.2 Renderer Stages

#### Pre-Render
- Iterates over `settings.lines` (up to 3 lines).
- For each widget, calls `render(ctx)` to get the raw ANSI string.
- Computes `plainLength` using `getVisibleWidth()`.

#### Max-Width Calculation
- `calculateMaxWidthsFromPreRendered()` computes, for each column index across all lines, the maximum plain length.
- This enables Powerline `autoAlign`: widgets at the same column index are padded to the same width across lines.

#### Final Render
- `renderStatusLine()` assembles each line:
  - Normal mode: inserts default separators, padding, and inherits colors.
  - Powerline mode: applies background colors and Nerd Font separators (`\uE0B0`, `\uE0B2`).
- `flex-separator` distributes remaining terminal width evenly.
- `truncateStyledText()` ensures ANSI codes and OSC 8 hyperlinks remain valid after truncation.

### 2.3 TUI Screen Router

```
main
 ├── editLines ──► items
 ├── colorLines ──► colors
 ├── terminalOptions ──► terminalWidth
 ├── powerline
 ├── globalOverrides
 ├── install
 └── confirm
```

Back-navigation preserves `menuSelections` so the cursor returns to the previously selected menu item.

## 3. Configuration Subsystem

### 3.1 Schema (v3)

```typescript
{
  version: 3,
  lines: WidgetItem[][],       // max 3 lines
  flexMode: 'full' | 'full-minus-40' | 'full-until-compact',
  compactThreshold: number,
  colorLevel: 0 | 1 | 2 | 3,   // chalk level
  defaultSeparator: string,
  defaultPadding: string,
  inheritSeparatorColors: boolean,
  overrideBackgroundColor?: string,
  overrideForegroundColor?: string,
  globalBold: boolean,
  minimalistMode: boolean,
  powerline: {
    enabled: boolean,
    theme: string,
    useRounded: boolean,
    autoAlign: boolean
  },
  updatemessage?: { message: string, remaining: number }
}
```

### 3.2 Load & Migration Flow

1. Read `~/.config/cccommandhints/settings.json`.
2. Missing → write and return default config.
3. Parse failure → backup as `.bak`, return default.
4. No `version` → treat as v1, migrate to current, write back.
5. Version < current → run `migrateConfig()`, write back.

### 3.3 Terminal Width Resolution

| `flexMode` | Effective Width |
|------------|-----------------|
| `full` | `detectedWidth - 6` |
| `full-minus-40` | `detectedWidth - 40` (default) |
| `full-until-compact` | `detectedWidth - 6` if usage < compactThreshold, else `detectedWidth - 40` |

Width detection (non-Windows):
1. Walk process tree to find TTY-owning shell.
2. Run `stty size` on that TTY.
3. Fallback to `tput cols`.

## 4. Claude Code Integration Subsystem

### 4.1 StatusLine Installation

Target in Claude `settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y cccommandhints@latest",
    "padding": 0
  }
}
```

Install steps:
1. Backup original `settings.json` to `.orig`.
2. Detect existing statusLine; prompt for replacement if it belongs to another tool.
3. Append `--config <path>` if a custom config path is active.
4. Write new `statusLine` node.

Uninstall steps:
1. Remove `statusLine` node.
2. Call `removeManagedHooks()` to delete all hooks tagged `cccommandhints-managed` or `ccstatusline-managed`.

### 4.2 Hook Synchronization

On every `saveSettings()`:
1. Collect `getHooks()` from all enabled widgets.
2. Deduplicate by event type.
3. Inject into Claude `settings.json` under `hooks` with `_tag: cccommandhints-managed`.
4. The hook command is `<statusLine.command> --hook`.

## 5. CommandHint Widget Design

### 5.1 Layout Modes

- **Wide (`terminalWidth >= 100`)**: `renderHorizontal()` displays the first 3 command groups side-by-side, separated by `│`.
- **Narrow (`terminalWidth < 100`)**: `renderVertical()` displays one group at a time with a `●●○○` progress indicator.

### 5.2 Width Allocation

```
availableWidth = terminalWidth - prefixWidth - separatorsWidth - padding
groupWidth     = floor(availableWidth / 3)   // horizontal mode only
```

All width calculations use `getVisibleWidth()` to account for East-Asian width and emoji.

### 5.3 Pagination & Scrolling

- **Pagination**: `paginateCommands()` splits a group's commands into pages if they exceed `groupWidth`. Pages cycle every 5 seconds per group index.
- **Scrolling**: If a single page still exceeds `groupWidth` and `scroll !== 'false'`, `scrollManager` advances the horizontal offset at a fixed interval.
- **Truncation**: When scrolling is disabled, `truncateStyledText()` clips the text and appends `…`.

### 5.4 Data Sources

1. **Built-in**: `src/widgets/command-hint/data.ts` (4 groups: conversation control, info view, config tools, dev collaboration).
2. **Dynamic discovery**: `src/widgets/command-hint/discovery.ts` executes `claude -p /help` in the background, parses `/slash-commands`, and caches results in `~/.config/cccommandhints/commands-cache.json` (refreshed every 30s).
3. **Custom commands**: Scans `~/.claude/commands` and `process.cwd()/.claude/commands` for `.md` files.

## 6. Extension Points

| Extension | How |
|-----------|-----|
| **New Widget** | Implement `Widget`, register in `src/utils/widget-manifest.ts` |
| **New Layout Widget** | Register in `LAYOUT_WIDGET_MANIFEST` |
| **New Hook** | Widget returns `WidgetHookDef[]` from `getHooks()` |
| **New Powerline Theme** | Add entry to `POWERLINE_THEMES` in `src/utils/colors.ts` |
| **New Migration** | Add case to `migrateConfig()` in `src/utils/migrations.ts` |
