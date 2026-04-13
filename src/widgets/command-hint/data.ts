import type { CommandGroup } from './types';

export const COMMAND_GROUPS: CommandGroup[] = [
    {
        name: '对话控制',
        color: 'green',
        commands: [
            { cmd: '/clear', desc: '清除对话' },
            { cmd: '/restart', desc: '重启会话' },
            { cmd: '/rename', desc: '重命名' },
            { cmd: '/compact', desc: '压缩历史' }
        ]
    },
    {
        name: '信息查看',
        color: 'yellow',
        commands: [
            { cmd: '/cost', desc: '查看费用' },
            { cmd: '/usage', desc: '查看用量' },
            { cmd: '/status', desc: '查看状态' }
        ]
    },
    {
        name: '配置工具',
        color: 'magenta',
        commands: [
            { cmd: '/config', desc: '查看配置' },
            { cmd: '/api', desc: 'API设置' },
            { cmd: '/mcp', desc: 'MCP管理' }
        ]
    }
];
