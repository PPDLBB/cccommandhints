import type { CommandGroup } from './types';

export const DEFAULT_COMMAND_GROUPS: CommandGroup[] = [
    {
        name: '对话控制',
        color: 'green',
        commands: [
            { cmd: '/clear', desc: '清除对话' },
            { cmd: '/restart', desc: '重启会话' },
            { cmd: '/rename', desc: '重命名' },
            { cmd: '/compact', desc: '压缩历史' },
            { cmd: '/new', desc: '新建会话' },
            { cmd: '/resume', desc: '恢复会话' },
            { cmd: '/editor', desc: '编辑器模式' },
            { cmd: '/terminal-setup', desc: '终端环境设置' },
            { cmd: '/help', desc: '查看帮助' }
        ]
    },
    {
        name: '信息查看',
        color: 'yellow',
        commands: [
            { cmd: '/cost', desc: '查看费用' },
            { cmd: '/usage', desc: '查看用量' },
            { cmd: '/status', desc: '查看状态' },
            { cmd: '/doctor', desc: '环境诊断' },
            { cmd: '/memory', desc: '记忆状态' },
            { cmd: '/model', desc: '模型切换' },
            { cmd: '/review', desc: '代码审查' },
            { cmd: '/permissions', desc: '权限查看' }
        ]
    },
    {
        name: '配置工具',
        color: 'magenta',
        commands: [
            { cmd: '/config', desc: '查看配置' },
            { cmd: '/api', desc: 'API设置' },
            { cmd: '/mcp', desc: 'MCP管理' },
            { cmd: '/hooks', desc: 'Hook配置' },
            { cmd: '/vim', desc: 'Vim模式' },
            { cmd: '/theme', desc: '主题设置' },
            { cmd: '/login', desc: '登录账户' },
            { cmd: '/logout', desc: '退出登录' }
        ]
    },
    {
        name: '开发协作',
        color: 'cyan',
        commands: [
            { cmd: '/plan', desc: '进入计划模式' },
            { cmd: '/agent', desc: '进入执行模式' },
            { cmd: '/init', desc: '初始化上下文' },
            { cmd: '/pr', desc: '创建PR流程' },
            { cmd: '/undo', desc: '撤销上次变更' },
            { cmd: '/diff', desc: '查看变更差异' },
            { cmd: '/test', desc: '执行测试命令' },
            { cmd: '/bug', desc: '调试问题模式' },
            { cmd: '/release', desc: '发布准备' }
        ]
    }
];

export const COMMAND_GROUPS: CommandGroup[] = DEFAULT_COMMAND_GROUPS;

// 全量命令中文描述映射（内置默认 + 动态发现补充）
export const COMMAND_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
    DEFAULT_COMMAND_GROUPS.flatMap(g => g.commands.map(c => [c.cmd, c.desc]))
);

// 补充常见动态命令的中文描述
const EXTRA_DESCRIPTIONS: Record<string, string> = {
    '/approved-tools': '已批准工具',
    '/export': '导出对话',
    '/loop': '循环任务',
    '/proactive': '主动任务',
    '/powerup': '功能教程',
    '/btw': '侧栏提问',
    '/fast': '快速模式',
    '/voice': '语音输入',
    '/mobile': '手机连接',
    '/chrome': 'Chrome集成',
    '/upgrade': '升级计划',
    '/remote-control': '远程控制',
    '/teleport': '环境传送',
    '/stats': '统计数据',
    '/todos': '待办事项',
    '/skills': '技能管理',
    '/agents': '智能体',
    '/feedback': '提交反馈',
    '/copy': '复制内容',
    '/color': '主题颜色',
    '/sandbox': '沙箱模式',
    '/plugin': '插件管理',
    '/branch': '分支会话',
    '/fork': '分叉会话',
    '/rewind': '回退对话',
    '/simplify': '简化模式',
    '/batch': '批量处理',
    '/insights': '使用洞察',
    '/ultraplan': '深度计划',
    '/security-review': '安全审查',
    '/team-onboarding': '团队引导',
    '/claude-api': 'Claude API',
    '/add-dir': '添加目录',
    '/context': '上下文状态',
    '/effort': '努力程度',
    '/settings': '查看配置'
};

for (const [cmd, desc] of Object.entries(EXTRA_DESCRIPTIONS)) {
    COMMAND_DESCRIPTIONS[cmd] = desc;
}

// 基于命令名关键词推断描述（兜底）
export function inferCommandDesc(command: string): string {
    const lowered = command.toLowerCase();
    const keywords: [string | RegExp, string][] = [
        ['login', '登录'],
        ['logout', '退出'],
        ['export', '导出'],
        ['import', '导入'],
        ['copy', '复制'],
        ['rename', '重命名'],
        ['resume', '恢复会话'],
        ['clear', '清除'],
        ['compact', '压缩'],
        ['restart', '重启'],
        ['help', '帮助'],
        ['exit', '退出'],
        ['cost', '费用'],
        ['usage', '用量'],
        ['status', '状态'],
        ['doctor', '诊断'],
        ['memory', '记忆'],
        ['model', '模型'],
        ['review', '审查'],
        ['permissions', '权限'],
        ['config', '配置'],
        ['settings', '配置'],
        ['api', 'API设置'],
        ['mcp', 'MCP管理'],
        ['hooks', 'Hook配置'],
        ['theme', '主题'],
        ['vim', 'Vim模式'],
        ['plan', '计划模式'],
        ['agent', '执行模式'],
        ['init', '初始化'],
        ['pr', 'PR流程'],
        ['undo', '撤销'],
        ['diff', '查看差异'],
        ['test', '执行测试'],
        ['bug', '调试'],
        ['release', '发布准备'],
        ['plugin', '插件'],
        ['sandbox', '沙箱'],
        ['stats', '统计'],
        ['todo', '待办'],
        ['skill', '技能'],
        ['voice', '语音'],
        ['loop', '循环任务'],
        ['branch', '分支'],
        ['fork', '分叉'],
        ['remote', '远程控制'],
        ['chrome', 'Chrome集成'],
        ['mobile', '手机连接'],
        ['upgrade', '升级'],
        ['color', '颜色主题'],
        ['context', '上下文'],
        ['effort', '努力程度'],
        ['feedback', '反馈'],
        ['/fast', '快速模式'],
        ['/btw', '侧栏提问']
    ];

    for (const [pattern, desc] of keywords) {
        if (typeof pattern === 'string') {
            if (lowered.includes(pattern))
return desc;
        } else if (pattern.test(lowered)) {
            return desc;
        }
    }

    return '快捷命令';
}