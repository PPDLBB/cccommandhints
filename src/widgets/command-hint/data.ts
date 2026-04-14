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
