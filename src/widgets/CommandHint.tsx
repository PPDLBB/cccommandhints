import { type RenderContext } from '../types/RenderContext';
import { type Settings } from '../types/Settings';
import {
    type CustomKeybind,
    type Widget,
    type WidgetEditorDisplay,
    type WidgetItem
} from '../types/Widget';
import { getVisibleWidth, truncateStyledText } from '../utils/ansi';
import { getCommandGroups } from './command-hint/discovery';
import { scrollManager } from './command-hint/scroll-manager';

export class CommandHintWidget implements Widget {
    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Display Claude Code commands with Chinese descriptions. Each group occupies one line, up to 4 lines'; }
    getDisplayName(): string { return 'Command Hints'; }
    getCategory(): string { return 'Help'; }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const scroll = item.metadata?.['scroll'] === 'true' ? 'scroll' : 'static';
        return {
            displayText: `${this.getDisplayName()} (multi-line, ${scroll})`
        };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const commandGroups = getCommandGroups();
        const terminalWidth = context.terminalWidth ?? 100;
        const isPreview = context.isPreview ?? false;
        const rawValue = item.rawValue ?? false;
        const enableScroll = item.metadata?.['scroll'] !== 'false';

        if (isPreview) {
            if (rawValue) {
                return '对话控制: /clear 清除对话 · /restart 重启\n信息查看: /cost 查看费用 · /usage 查看用量\n配置工具: /config 查看配置 · /api API设置\n开发协作: /plan 计划模式 · /agent 执行模式';
            }
            return '\uD83D\uDCA1 对话控制: /clear 清除对话 · /restart 重启\n\uD83D\uDCA1 信息查看: /cost 查看费用 · /usage 查看用量\n\uD83D\uDCA1 配置工具: /config 查看配置 · /api API设置\n\uD83D\uDCA1 开发协作: /plan 计划模式 · /agent 执行模式';
        }

        return this.renderMultiLine(commandGroups, terminalWidth, rawValue, enableScroll, item.id);
    }

    private renderMultiLine(
        commandGroups: Array<{ name: string; commands: Array<{ cmd: string; desc: string }> }>,
        width: number,
        rawValue: boolean,
        enableScroll: boolean,
        itemId: string
    ): string {
        const prefix = rawValue ? '' : '\uD83D\uDCA1 ';
        const prefixWidth = getVisibleWidth(prefix);
        const availableWidth = Math.max(30, width - prefixWidth - 2);
        const cycleBase = Math.floor(Date.now() / 5000);

        const lines: string[] = [];

        commandGroups.forEach((group, index) => {
            const commandCount = group.commands.length;
            const startIndex = commandCount > 0 ? (cycleBase + index) % commandCount : 0;
            const rotatedCommands = this.rotateCommands(group.commands, Math.max(16, availableWidth - 14), rawValue, startIndex);
            const pageText = `${group.name}: ${this.buildCommandText(rotatedCommands, rawValue)}`;
            const key = `${itemId}-ml-${index}-${startIndex}`;
            const content = this.formatGroupContent(pageText, availableWidth, enableScroll, key, rawValue);
            lines.push(prefix + content);
        });

        return lines.join('\n');
    }

    private buildCommandText(commands: Array<{ cmd: string; desc: string }>, rawValue: boolean): string {
        const delimiter = rawValue ? ', ' : ' · ';
        return commands.map(cmd => `${cmd.cmd} ${cmd.desc}`).join(delimiter);
    }

    private rotateCommands(
        commands: Array<{ cmd: string; desc: string }>,
        targetWidth: number,
        rawValue: boolean,
        startIndex: number
    ): Array<{ cmd: string; desc: string }> {
        if (commands.length === 0) {
            return [];
        }

        const delimiter = rawValue ? ', ' : ' · ';
        const delimiterWidth = getVisibleWidth(delimiter);
        const result: Array<{ cmd: string; desc: string }> = [];
        let currentWidth = 0;

        for (let i = 0; i < commands.length; i++) {
            const cmdIndex = (startIndex + i) % commands.length;
            const command = commands[cmdIndex]!;
            const text = `${command.cmd} ${command.desc}`;
            const textWidth = getVisibleWidth(text);
            const addedWidth = result.length === 0 ? textWidth : delimiterWidth + textWidth;

            if (result.length > 0 && currentWidth + addedWidth > targetWidth) {
                break;
            }

            result.push(command);
            currentWidth += addedWidth;
        }

        return result;
    }

    private sliceByDisplayWidth(text: string, startOffset: number, maxWidth: number): string {
        let result = '';
        let currentWidth = 0;
        let index = 0;

        while (index < text.length) {
            const codePoint = text.codePointAt(index);
            if (codePoint === undefined) break;
            const char = String.fromCodePoint(codePoint);
            const charWidth = getVisibleWidth(char);

            if (currentWidth >= startOffset) {
                if (getVisibleWidth(result) + charWidth > maxWidth) {
                    break;
                }
                result += char;
            }

            currentWidth += charWidth;
            index += char.length;
        }

        return result;
    }

    private formatGroupContent(
        fullText: string,
        maxWidth: number,
        enableScroll: boolean,
        scrollKey: string,
        rawValue: boolean
    ): string {
        const textWidth = getVisibleWidth(fullText);

        if (!enableScroll || textWidth <= maxWidth) {
            if (textWidth < maxWidth) {
                return fullText + ' '.repeat(maxWidth - textWidth);
            }
            return truncateStyledText(fullText, maxWidth, { ellipsis: !rawValue });
        }

        const offset = scrollManager.getOffset(scrollKey, textWidth, maxWidth);
        const visibleText = this.sliceByDisplayWidth(fullText, offset, maxWidth);
        const visibleWidth = getVisibleWidth(visibleText);
        if (visibleWidth < maxWidth) {
            return visibleText + ' '.repeat(maxWidth - visibleWidth);
        }
        return visibleText;
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [
            { key: 's', label: '(s)croll toggle', action: 'toggle-scroll' }
        ];
    }

    handleEditorAction(action: string, item: WidgetItem): WidgetItem | null {
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
