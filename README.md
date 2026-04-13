# cccommandhints

Claude Code 命令提示状态栏工具 - 在底部显示 `/commands` 的中文释义

```
💡 对话控制: /clear 清除对话 · /restart 重启 · /rename 重命名 │ /cost 查看费用 · /usage 查看用量 │ /config 查看配置
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

## 使用

```bash
claude    # 启动 Claude Code，底部显示命令提示
```

## 兼容性

- 安装后默认写入 `cccommandhints` 命令到 Claude Code `settings.json`
- 仍兼容识别历史 `ccstatusline` 命令，避免升级后误判未安装

## 功能

- **智能布局**：宽屏三列，窄屏轮换
- **中文释义**：`/clear` → "清除对话"
- **自动滚动**：文字过长时横向滚动
- **命令分组**：对话控制 / 信息查看 / 配置工具

## 命令分组

| 分组 | 命令 |
|------|------|
| **对话控制** | `/clear` 清除对话 · `/restart` 重启 · `/rename` 重命名 · `/compact` 压缩历史 |
| **信息查看** | `/cost` 查看费用 · `/usage` 查看用量 · `/status` 查看状态 |
| **配置工具** | `/config` 查看配置 · `/api` API设置 · `/mcp` MCP管理 |

## License

MIT
