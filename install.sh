#!/bin/bash
set -e

echo "=== cccommandhints 安装脚本 ==="

# 1. 克隆仓库
echo "→ 克隆仓库..."
git clone https://github.com/PPDLBB/cccommandhints.git
cd cccommandhints

# 2. 安装依赖
echo "→ 安装依赖..."
npm install --legacy-peer-deps

# 3. 构建
echo "→ 构建项目..."
if ! command -v bun &> /dev/null; then
    echo "  安装 Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi
npm run build

# 4. 全局安装
echo "→ 全局安装..."
npm install -g .

echo ""
echo "✅ 安装完成！"
echo ""
echo "使用方法："
echo "  cccommandhints    # 配置命令提示"
echo "  cch               # 简写形式"
echo ""
echo "配置步骤："
echo "  1. 运行 cccommandhints"
echo "  2. 按 a 添加 Command Hints 组件"
echo "  3. 按 i 安装到 Claude Code"
echo ""
echo "然后正常启动 claude 即可看到命令提示"
