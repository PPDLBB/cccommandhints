import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

// Command hint data structure
interface CommandHint {
    cmd: string;
    desc: string;
}

interface CommandGroup {
    name: string;
    color: string;
    commands: CommandHint[];
}

// Predefined command groups
const COMMAND_GROUPS: CommandGroup[] = [
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

// Scroll state manager using global state for continuous animation
class ScrollStateManager {
    private static instance: ScrollStateManager;
    private positions: Map<string, number> = new Map();
    private lastUpdate: number = Date.now();
    private scrollInterval: number = 300;

    static getInstance(): ScrollStateManager {
        if (!ScrollStateManager.instance) {
            ScrollStateManager.instance = new ScrollStateManager();
        }
        return ScrollStateManager.instance;
    }

    getOffset(key: string, textLength: number, visibleWidth: number): number {
        if (textLength <= visibleWidth) {
            return 0;
        }

        const now = Date.now();
        const elapsed = now - this.lastUpdate;

        if (elapsed >= this.scrollInterval) {
            this.positions.forEach((pos, k) => {
                const cycleLength = textLength + visibleWidth + 5;
                this.positions.set(k, (pos + 1) % cycleLength);
            });
            this.lastUpdate = now;
        }

        let currentPos = this.positions.get(key) ?? 0;
        if (!this.positions.has(key)) {
            this.positions.set(key, 0);
            currentPos = 0;
        }

        if (currentPos < visibleWidth) {
            return 0;
        } else if (currentPos < textLength + visibleWidth) {
            return currentPos - visibleWidth;
        } else {
            return Math.max(0, textLength - visibleWidth);
        }
    }

    reset(): void {
        this.positions.clear();
        this.lastUpdate = Date.now();
    }
}

const scrollManager = ScrollStateManager.getInstance();

export class CommandHintWidget implements Widget {
    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Display Claude Code commands with Chinese descriptions. Wide screen: 3 columns, Narrow screen: rotating single column'; }
    getDisplayName(): string { return 'Command Hints'; }
    getCategory(): string { return 'Help'; }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const mode = item.metadata?.['mode'] ?? 'auto';
        const scroll = item.metadata?.['scroll'] === 'true' ? 'scroll' : 'static';
        return {
            displayText: `${this.getDisplayName()} (${mode}, ${scroll})`
        };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const terminalWidth = context.terminalWidth ?? 100;
        const isPreview = context.isPreview ?? false;
        const rawValue = item.rawValue ?? false;
        const mode = (item.metadata?.['mode'] as 'auto' | 'horizontal' | 'vertical') ?? 'auto';
        const enableScroll = item.metadata?.['scroll'] !== 'false';

        if (isPreview) {
            if (rawValue) {
                return '/clear 清除对话 | /cost 查看费用 | /config 查看配置';
            }
            return '\uD83D\uDCA1 /clear 清除对话 | /cost 查看费用 | /config 查看配置';
        }

        const useHorizontal = mode === 'horizontal' || (mode === 'auto' && terminalWidth >= 100);

        if (useHorizontal) {
            return this.renderHorizontal(terminalWidth, rawValue, enableScroll, item.id);
        } else {
            return this.renderVertical(terminalWidth, rawValue, enableScroll, item.id);
        }
    }

    private renderHorizontal(width: number, rawValue: boolean, enableScroll: boolean, itemId: string): string {
        const separator = rawValue ? ' | ' : ' \u2502 ';
        const separatorWidth = separator.length;
        const prefix = rawValue ? '' : '\uD83D\uDCA1 ';
        const prefixWidth = rawValue ? 0 : 2;

        const availableWidth = Math.max(20, width - prefixWidth - (separatorWidth * 2) - 2);
        const groupWidth = Math.floor(availableWidth / 3);

        const parts: string[] = [];

        COMMAND_GROUPS.forEach((group, index) => {
            const key = `${itemId}-h-${index}`;
            const content = this.formatGroupContent(group, groupWidth, enableScroll, key, rawValue);
            parts.push(content);
        });

        return prefix + parts.join(separator);
    }

    private renderVertical(width: number, rawValue: boolean, enableScroll: boolean, itemId: string): string {
        const prefix = rawValue ? '' : '\uD83D\uDCA1 ';
        const prefixWidth = rawValue ? 0 : 2;
        const availableWidth = Math.max(30, width - prefixWidth - 2);

        const cycleIndex = Math.floor(Date.now() / 5000) % 3;
        const group = COMMAND_GROUPS[cycleIndex]!;
        const key = `${itemId}-v-${cycleIndex}`;

        const content = this.formatGroupContent(group, availableWidth, enableScroll, key, rawValue);
        const indicator = `${'\u25CF'.repeat(cycleIndex + 1)}${'\u25CB'.repeat(3 - cycleIndex - 1)}`;

        return `${prefix}[${indicator}] ${content}`;
    }

    private formatGroupContent(
        group: CommandGroup,
        maxWidth: number,
        enableScroll: boolean,
        scrollKey: string,
        rawValue: boolean
    ): string {
        const delimiter = rawValue ? ', ' : ' \u00B7 ';
        const parts = group.commands.map(cmd => `${cmd.cmd} ${cmd.desc}`);
        const fullText = parts.join(delimiter);

        if (!enableScroll || fullText.length <= maxWidth) {
            if (fullText.length < maxWidth) {
                return fullText.padEnd(maxWidth, ' ');
            }
            return fullText.substring(0, maxWidth - 1) + (rawValue ? '...' : '\u2026');
        }

        const offset = scrollManager.getOffset(scrollKey, fullText.length, maxWidth);
        const visibleText = fullText.substring(offset, offset + maxWidth);

        return visibleText.padEnd(maxWidth, ' ');
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [
            { key: 'm', label: '(m)ode toggle', action: 'toggle-mode' },
            { key: 's', label: '(s)croll toggle', action: 'toggle-scroll' }
        ];
    }

    handleEditorAction(action: string, item: WidgetItem): WidgetItem | null {
        if (action === 'toggle-mode') {
            const currentMode = (item.metadata?.['mode'] as 'auto' | 'horizontal' | 'vertical') ?? 'auto';
            const modes: Array<'auto' | 'horizontal' | 'vertical'> = ['auto', 'horizontal', 'vertical'];
            const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length]!;
            return {
                ...item,
                metadata: { ...item.metadata, mode: nextMode }
            };
        }
        if (action === 'toggle-scroll') {
            const currentScroll = item.metadata?.['scroll'] ?? 'true';
            return {
                ...item,
                metadata: { ...item.metadata, scroll: currentScroll === 'true' ? 'false' : 'true' }
            };
        }
        return null;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}
