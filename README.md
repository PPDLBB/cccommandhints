# cccommandhints

Claude Code 命令提示状态栏工具 - 在底部显示 `/commands` 的中文释义

```
💡 对话控制: /clear 清除对话 · /restart 重启 · /rename 重命名
💡 信息查看: /cost 查看费用 · /usage 查看用量 · /status 查看状态
💡 配置工具: /config 查看配置 · /api API设置 · /mcp MCP管理
💡 开发协作: /plan 计划模式 · /agent 执行模式 · /pr PR流程
```

## 快速安装

### 方式1：一键安装脚本（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/PPDLBB/cccommandhints/main/install.sh | bash
```

### 方式2：手动安装

**请逐行执行以下命令，不要一次性粘贴多行：**

```bash
git clone https://github.com/PPDLBB/cccommandhints.git
cd cccommandhints
npm install --legacy-peer-deps
npm run build
npm install -g .
```

**注意**：`npm run build` 需要 [Bun](https://bun.sh)。如果没有安装，脚本会自动安装。

## 配置

```bash
cccommandhints    # 或简称 cch
```

在 TUI 中：
1. 按 `a` 添加 **Command Hints** 组件
2. 按 `i` 安装到 Claude Code

### 组件快捷键

在 Items Editor 中选中 Command Hints 时：
- `r`：切换 raw value 模式（去掉前缀图标）
- `s`：开关组内横向滚动

## 使用

```bash
claude    # 启动 Claude Code，底部显示命令提示
```

## 兼容性

- 安装后默认写入 `cccommandhints` 命令到 Claude Code `settings.json`
- 仍兼容识别历史 `ccstatusline` 命令，避免升级后误判未安装

## 功能特性

- **四组固定展示**：组名固定为「对话控制 / 信息查看 / 配置工具 / 开发协作」四行，不受终端宽度影响
- **队列式轮播**：命令像队列一样左移，去掉第一个、补充下一个，循环展示
- **横向滚动**：每行组内命令独立横向滚动，长描述也能完整展示
- **动态发现**：自动执行 `claude -p /help` 发现当前环境可用命令，并智能分类到4组
- **中文释义**：内置 60+ 条命令中文映射，未知命令按关键词自动推断
- **实时缓存**：发现结果本地缓存 30 秒，避免频繁调用 CLI

## 命令分组

动态发现的命令会按以下规则归入固定四组：

| 分组 | 颜色 | 示例 |
|------|------|------|
| **对话控制** | 绿色 | `/clear` 清除对话 · `/restart` 重启 · `/rename` 重命名 |
| **信息查看** | 黄色 | `/cost` 查看费用 · `/usage` 查看用量 · `/status` 查看状态 |
| **配置工具** | 洋红 | `/config` 查看配置 · `/api` API设置 · `/mcp` MCP管理 |
| **开发协作** | 青色 | `/plan` 计划模式 · `/agent` 执行模式 · `/pr` PR流程 |

## 开发

```bash
bun test      # 384 tests pass
bun run lint  # 0 errors
bun run build
```

## License

MIT
