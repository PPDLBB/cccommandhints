# cccommandhints 产品逻辑文档

## 1. 产品定位

**cccommandhints** 是一个面向 [Claude Code](https://claude.ai/code) 用户的状态栏（status line）插件。它通过在终端底部实时展示 Claude `/commands` 的中文释义，降低新用户和中文用户的命令记忆成本。

核心价值：
- **中文释义**：`/clear` → "清除对话"，让命令语义一目了然。
- **智能布局**：根据终端宽度自动在"三列并排"与"单组轮换"之间切换。
- **零侵入**：以 Claude Code 的 `statusLine` 机制运行，不修改 Claude 本体。

---

## 2. 系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code 终端                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  statusLine 管道（JSON → cccommandhints）             │  │
│  │  输出 ANSI 着色后的状态栏文本                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ 1) stdin 接收 StatusJSON
                              │ 2) stdout 输出渲染后的状态行
┌─────────────────────────────────────────────────────────────┐
│                      cccommandhints                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Settings   │  │  RenderCtx  │  │  Widget Registry    │  │
│  │  (配置持久化)│  │  (运行时上下文)│  │  (command-hint 等)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  TUI (Ink)  │  │  Renderer   │  │  Claude Settings    │  │
│  │  交互式配置  │  │  文本渲染器  │  │  安装/卸载集成       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 运行模式

| 模式 | 触发条件 | 行为 |
|------|----------|------|
| **管道模式** | `stdin` 有数据（非 TTY） | 读取 StatusJSON，渲染状态行，输出到 stdout |
| **TUI 模式** | `stdin` 是 TTY（无管道数据） | 启动 Ink 交互界面，供用户配置组件并安装到 Claude |
| **Hook 模式** | 参数包含 `--hook` | 接收 Hook JSON，记录技能调用次数（供 widgets 消费） |

---

## 3. 数据流与生命周期

### 3.1 管道渲染链路

1. **Claude Code 触发**：Claude 按配置周期执行 `statusLine.command`，将当前会话状态以 JSON 写入 stdin。
2. **输入校验**：`src/ccstatusline.ts` 调用 `StatusJSONSchema.safeParse()` 校验并解析 JSON。
3. **上下文组装**：
   - 从 `transcript_path` 提取 Token 指标、会话时长、速度指标。
   - 按需预取 Usage 数据。
   - 读取 skills 指标（来自 hook 记录）。
4. **预渲染**：`preRenderAllWidgets()` 一次性渲染所有 widget 原始文本，计算对齐所需的最大宽度。
5. **逐行渲染**：`renderStatusLine()` 按配置行逐个生成带 ANSI 颜色的字符串。
6. **输出处理**：
   - 普通空格替换为不间断空格（`\u00A0`），防止 VSCode 截断。
   - 前缀插入 `\x1b[0m` 重置码，覆盖 Claude Code 的 dim 设置。
7. **更新消息**：若配置中存在 `updatemessage`，输出后递减计数，归零自动清理。

### 3.2 TUI 配置链路

1. **启动**：`runTUI()` 清屏并调用 Ink 渲染 `App` 组件。
2. **设置加载**：`loadSettings()` 从 `~/.config/cccommandhints/settings.json` 读取配置；不存在则写入默认配置。
3. **状态管理**：React state 维护 `settings`、`originalSettings`、`screen`、`selectedLine` 等。
4. **保存**：用户按 `Ctrl+S` 或菜单选择 Save，`saveSettings()` 持久化到本地 JSON，并同步 widget hooks 到 Claude `settings.json`。
5. **安装/卸载**：通过 `claude-settings.ts` 读写 Claude 的 `settings.json`，实现 statusLine 的注入与移除。

---

## 4. 核心模块逻辑

### 4.1 CommandHint Widget（命令提示组件）

**文件**：`src/widgets/CommandHint.tsx`

这是当前唯一的功能 widget，负责把 `/commands` 渲染成状态栏文本。

#### 布局策略

- **宽屏（`terminalWidth >= 100`）**：进入 `renderHorizontal()`，取前 3 个命令组并排展示，组间以 `│` 分隔。
- **窄屏（`terminalWidth < 100`）**：进入 `renderVertical()`，只展示当前轮询到的一个组，左侧以 `●●○○` 形式的指示器标明进度。

#### 宽度分配

- 可用宽度 = `terminalWidth - prefixWidth - separatorsWidth - padding`
- 水平模式下，可用宽度均分给 3 个组：`groupWidth = floor(availableWidth / 3)`
- 所有宽度计算均基于 `getVisibleWidth()`（正确处理中文、emoji 等双宽字符）。

#### 分页与滚动

- **分页**：当某组命令文本超出 `groupWidth` 时，`paginateCommands()` 按显示宽度将命令拆分为多页，每 5 秒按组索引轮询换页。
- **滚动**：当单页文本仍超出分配宽度且 `scroll !== 'false'` 时，`scrollManager` 按固定间隔推进水平滚动 offset，实现走马灯效果。
- **截断**：不滚动时，超长文本使用 `truncateStyledText()` 截断，末尾显示 `…`（或 `...`）。

#### 数据源

- **默认命令**：`src/widgets/command-hint/data.ts` 内置 4 组命令（对话控制、信息查看、配置工具、开发协作）。
- **动态发现**：`src/widgets/command-hint/discovery.ts` 在后台执行 `claude -p /help`，解析输出中的 `/slash-commands`，并缓存到 `~/.config/cccommandhints/commands-cache.json`，每 30 秒刷新一次。
- **自定义命令**：扫描 `~/.claude/commands` 和 `process.cwd()/.claude/commands` 下的 `.md` 文件，作为补充命令源。

### 4.2 渲染系统（Renderer）

**文件**：`src/utils/renderer.ts`、`src/utils/renderer-layout.ts`、`src/utils/ansi.ts`

#### 渲染管线

1. **预渲染** `preRenderAllWidgets()`：遍历所有 widget，调用各自的 `render()` 得到无 padding 的原始字符串，计算纯文本长度（`plainLength`）。
2. **最大宽度计算** `calculateMaxWidthsFromPreRendered()`：跨所有行统计每个对齐位置的最大宽度，供 Powerline 模式的 `autoAlign` 使用。
3. **最终渲染** `renderStatusLine()`：
   - 普通模式：插入默认分隔符、padding、继承颜色。
   - Powerline 模式：为每个 widget 应用背景色，插入 Nerd Font 分隔符（如 `\uE0B0`），支持主题色循环。
4. **截断与对齐**：
   - 若存在 `flex-separator`，按可用终端宽度将剩余空间均分给 flex 分隔符。
   - 最终行长度超过 `terminalWidth` 时，调用 `truncateStyledText()` 截断，保留 ANSI 代码和 OSC 8 超链接完整性。

#### ANSI 处理

`src/utils/ansi.ts` 提供：
- `getVisibleWidth()`：基于 `string-width` 处理 Unicode 簇宽度，将 emoji 计为 2，零宽字符计为 0。
- `truncateStyledText()`：在截断时保留已打开的 SGR/OSC8 序列，避免颜色泄漏或链接断裂。

### 4.3 TUI 交互系统

**文件**：`src/tui/App.tsx`、各 `src/tui/components/*.tsx`

#### 屏幕流转

```
main
 ├── lines ──► items        (编辑每行的 widget 列表)
 ├── colorLines ──► colors  (编辑每行的颜色配置)
 ├── install                (选择 npx / bunx 安装方式)
 └── confirm                (安装/卸载二次确认)
```

#### 核心组件

| 组件 | 职责 |
|------|------|
| `MainMenu` | 主菜单：编辑行、编辑颜色、安装/卸载、保存并退出 |
| `LineSelector` | 选择要编辑的行（共 3 行），支持拖拽排序 |
| `ItemsEditor` | 对选中行增删改 widget，支持上下移动、rawValue 切换、自定义快捷键响应 |
| `ColorMenu` | 批量修改某行所有 widget 的颜色和背景色 |
| `StatusLinePreview` | 实时预览当前配置在指定终端宽度下的渲染效果 |
| `InstallMenu` | 提供 npx / bunx / self-managed 安装选项 |
| `TerminalWidthMenu` | 配置 flex 模式：full / full-minus-40 / full-until-compact |

#### 全局快捷键

- `Ctrl+C`：退出 TUI
- `Ctrl+S`：立即保存配置（不退出）

### 4.4 Claude Code 集成

**文件**：`src/utils/claude-settings.ts`、`src/utils/hooks.ts`

#### StatusLine 安装

Claude Code 支持在 `settings.json` 中配置 `statusLine`：

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx -y cccommandhints@latest",
    "padding": 0
  }
}
```

安装流程：
1. 备份原始 `settings.json` 为 `.orig`。
2. 检测是否已存在其他 statusLine，提示替换或更新。
3. 若使用 `--config` 自定义配置路径，命令追加 `--config <path>`。
4. 写入新的 `statusLine` 配置。

卸载流程：
1. 删除 `statusLine` 节点。
2. 调用 `removeManagedHooks()` 清理所有 `_tag` 为 `cccommandhints-managed` 或 `ccstatusline-managed` 的 hooks。

#### Hook 同步

某些 widget 需要监听 Claude 事件（如技能调用）。当保存配置时，`saveSettings()` 自动调用 `syncWidgetHooks()`：
- 收集当前启用的 widget 声明的 hooks。
- 在 Claude `settings.json` 的 `hooks` 字段下添加 `_tag: cccommandhints-managed` 的条目。
- 关联的命令为 `<statusLine.command> --hook`。

### 4.5 设置与配置管理

**文件**：`src/utils/config.ts`、`src/types/Settings.ts`、`src/utils/migrations.ts`

#### 配置结构（v3）

```typescript
{
  version: 3,
  lines: [                      // 最多 3 行
    [{ id: '1', type: 'command-hint', color: 'cyan' }],
    [],
    []
  ],
  flexMode: 'full-minus-40',    // full | full-minus-40 | full-until-compact
  compactThreshold: 60,         // full-until-compact 的切换阈值
  colorLevel: 2,                // 0-3，对应 chalk level
  defaultSeparator: '|',
  defaultPadding: ' ',
  inheritSeparatorColors: false,
  overrideBackgroundColor?: string,
  overrideForegroundColor?: string,
  globalBold: false,
  minimalistMode: false,
  powerline: { enabled: false, ... },
  updatemessage?: { message: string, remaining: number }
}
```

#### 配置加载流程

1. 尝试读取 `~/.config/cccommandhints/settings.json`。
2. 若文件不存在，写入默认配置并返回。
3. 若解析失败或校验失败，备份原文件（`.bak`），写入默认配置。
4. 若配置无 `version` 字段，视为 v1，执行 `migrateConfig()` 升级后写回磁盘。
5. 若版本低于 `CURRENT_VERSION`，同样执行迁移并持久化。

#### 终端宽度策略

`src/utils/renderer-layout.ts` 中的 `resolveEffectiveTerminalWidth()`：

| flexMode | 逻辑 |
|----------|------|
| `full` | `detectedWidth - 6` |
| `full-minus-40` | `detectedWidth - 40`（默认，为 IDE 集成等预留空间） |
| `full-until-compact` | 当上下文使用率 `< compactThreshold` 时 `detectedWidth - 6`；否则 `detectedWidth - 40` |

终端宽度探测（`src/utils/terminal.ts`）：
- 向上遍历进程树，找到拥有 TTY 的 shell 进程。
- 对该 TTY 执行 `stty size` 获取列数。
- 回退到 `tput cols`。
- Windows 平台直接返回 `null`（历史行为保留）。

---

## 5. 关键设计决策

### 5.1 命名兼容

项目经历了从 `ccstatusline` 到 `cccommandhints` 的重命名。为了兼容已安装用户：
- 所有"是否已安装"的判断同时识别新旧命令前缀（`ccstatusline` 与 `cccommandhints`）。
- Hook 的 `_tag` 也同步清理 `ccstatusline-managed` 和 `cccommandhints-managed`。
- 但新安装时统一写入 `cccommandhints`。

### 5.2 显示宽度优先

由于中文和 emoji 在终端中占据的列数与字符串 `length` 不一致，所有与截断、padding、分页、对齐相关的计算都使用 `getVisibleWidth()` 而非 `String.length`。

### 5.3 预渲染与对齐

为支持 Powerline 模式的 `autoAlign`（跨行对齐同一列 widget），渲染器采用两阶段策略：
1. 先预渲染所有 widget 得到纯文本长度。
2. 计算每列最大宽度。
3. 最终渲染时在最后一组 merge 的 widget 后补空格。

这样兼顾了性能（预渲染结果复用）与对齐精度。

### 5.4 空格保护

Claude Code 运行在 VSCode 等编辑器中时，终端可能会截断行尾空格。因此输出前：
- 普通空格被替换为不间断空格（`\u00A0`）。
- 输出前缀加上 `\x1b[0m`，防止 Claude 的 dim 样式影响状态栏。

---

## 6. 扩展点

虽然当前仅内置了 `CommandHint` 一个功能 widget，但架构预留了扩展能力：

- **新增 Widget**：在 `src/utils/widget-manifest.ts` 注册，实现 `Widget` 接口即可。
- **新增 Layout Widget**：在 `LAYOUT_WIDGET_MANIFEST` 注册（如新的分隔符类型）。
- **Hook 扩展**：Widget 实现 `getHooks()` 返回 `WidgetHookDef[]`，保存配置时自动同步到 Claude Code。
- **主题扩展**：Powerline 主题通过 `src/utils/colors.ts` 的 `POWERLINE_THEMES` 对象定义，可新增配色方案。

---

## 7. 目录结构速查

```
src/
├── ccstatusline.ts          # 入口：模式分发（pipe / TUI / hook）
├── types/                   # Zod Schema 与 TypeScript 类型
├── utils/
│   ├── config.ts            # 配置读写、迁移、备份
│   ├── renderer.ts          # 状态栏渲染核心
│   ├── renderer-layout.ts   # 终端宽度、flex 计算
│   ├── ansi.ts              # Unicode 宽度与 ANSI 截断
│   ├── claude-settings.ts   # 与 Claude settings.json 交互
│   ├── hooks.ts             # Hook 自动同步
│   ├── widgets.ts           # Widget 注册表与搜索过滤
│   ├── widget-manifest.ts   # Widget 声明列表
│   └── ...
├── tui/
│   ├── App.tsx              # TUI 根组件与屏幕路由
│   └── components/          # 各菜单与编辑器组件
└── widgets/
    ├── CommandHint.tsx      # 命令提示 widget
    └── command-hint/
        ├── data.ts           # 默认命令分组
        ├── discovery.ts      # /help 动态发现与缓存
        ├── scroll-manager.ts # 滚动状态管理
        └── types.ts          # 命令提示内部类型
```
