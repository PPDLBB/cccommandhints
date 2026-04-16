# cccommandhints Architecture

## Overview

cccommandhints is a Claude Code status-line plugin that renders Chinese translations of `/commands` at the terminal bottom. It operates in three mutually-exclusive runtime modes and is built as a single TypeScript CLI package.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code Terminal                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  statusLine pipeline (JSON → cccommandhints)          │
│  │  ANSI-colored status bar output                       │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ stdin / stdout
┌─────────────────────────────────────────────────────────────┐
│                      cccommandhints                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Settings   │  │  RenderCtx  │  │  Widget Registry    │  │
│  │  (config)   │  │  (runtime)  │  │  (command-hint ...) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  TUI (Ink)  │  │  Renderer   │  │  Claude Settings    │  │
│  │  interactive│  │  text render│  │  install/uninstall  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Runtime Modes

| Mode | Trigger | Responsibility |
|------|---------|----------------|
| **Pipe** | `stdin` is not a TTY | Parse `StatusJSON`, render status line, write ANSI string to `stdout` |
| **TUI** | `stdin` is a TTY | Launch Ink/React interactive UI for configuration and installation |
| **Hook** | CLI arg `--hook` | Receive Hook JSON, record skill invocation counts for widgets |

## Module Responsibilities

### Entry Point (`src/ccstatusline.ts`)
- Dispatches to the correct mode based on `stdin` state and CLI arguments.
- In Pipe mode: orchestrates parsing → context assembly → rendering → output.

### Settings (`src/types/Settings.ts`, `src/utils/config.ts`, `src/utils/migrations.ts`)
- Defines the Zod schema and TypeScript types for configuration (v3).
- Handles persistence, backup on corruption, and version migration.

### Renderer (`src/utils/renderer.ts`, `src/utils/renderer-layout.ts`, `src/utils/ansi.ts`)
- Two-stage rendering: pre-render for width calculation, then final ANSI output.
- Handles Unicode width, truncation, Powerline separators, and flex spacing.

### Widget Registry (`src/utils/widget-manifest.ts`, `src/utils/widgets.ts`)
- Declares available widgets and resolves widget instances from settings.
- Supports functional widgets and layout widgets (separators, spacers).

### Widgets (`src/widgets/`)
- Self-contained rendering units. Current primary widget: `CommandHint`.
- Each widget exposes a `render()` method and optional `getHooks()`.

### TUI (`src/tui/App.tsx`, `src/tui/components/`)
- Ink-based React application providing interactive configuration.
- Screen router: main → editLines → items | colorLines → colors | terminalOptions → terminalWidth | powerline | globalOverrides | install | confirm.

### Claude Integration (`src/utils/claude-settings.ts`, `src/utils/hooks.ts`)
- Reads/writes Claude Code's `settings.json` to install or remove the statusLine.
- Synchronizes widget-declared hooks into Claude's hook configuration.

## Technology Stack

- **Language**: TypeScript 5.x
- **TUI Framework**: Ink (React for terminals)
- **Schema Validation**: Zod
- **ANSI Styling**: chalk
- **Unicode Width**: string-width
- **Testing**: Vitest
- **Package Manager**: npm / bun

## Design Principles

1. **Immutability**: All settings updates return new objects; no in-place mutation.
2. **Width-First Rendering**: Every truncation, padding, and alignment decision uses visible terminal column width (not string length) to support CJK and emoji.
3. **Backward Compatibility**: The project was renamed from `ccstatusline` to `cccommandhints`; both command prefixes are recognized as "installed" and both hook tags are cleaned up on uninstall.
4. **Extensibility**: New widgets can be registered in the manifest without changing core rendering logic.
