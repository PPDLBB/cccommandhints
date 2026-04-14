import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';

import { COMMAND_DESCRIPTIONS, DEFAULT_COMMAND_GROUPS, inferCommandDesc } from './data';
import type {
    CommandGroup,
    CommandHint
} from './types';

const execFileAsync = promisify(execFile);
const CACHE_DIR = path.join(os.homedir(), '.config', 'cccommandhints');
const CACHE_PATH = path.join(CACHE_DIR, 'commands-cache.json');
const REFRESH_INTERVAL_MS = 30 * 1000;
const HELP_COMMAND_TIMEOUT_MS = 4000;

interface CachedCommandData {
    updatedAt: number;
    groups: CommandGroup[];
}

let cachedGroups: CommandGroup[] = DEFAULT_COMMAND_GROUPS;
let lastRefreshAttempt = 0;
let refreshInFlight: Promise<void> | null = null;

function dedupeCommands(commands: CommandHint[]): CommandHint[] {
    const seen = new Set<string>();
    const result: CommandHint[] = [];
    for (const command of commands) {
        if (!seen.has(command.cmd)) {
            seen.add(command.cmd);
            result.push(command);
        }
    }
    return result;
}

function isLikelySlashCommandToken(token: string): boolean {
    if (!/^\/[a-z][a-z0-9-]*$/i.test(token)) {
        return false;
    }
    // Ignore common path fragments accidentally matched from warnings like /dev/null.
    if (token === '/dev' || token === '/null' || token === '/tmp' || token === '/var') {
        return false;
    }
    return true;
}

function classifyCommand(command: string): { group: string; color: string } {
    const convo = ['/clear', '/restart', '/rename', '/compact', '/new', '/resume', '/help', '/exit', '/editor', '/terminal-setup'];
    const info = ['/cost', '/usage', '/status', '/doctor', '/stats', '/memory', '/context', '/model', '/review', '/permissions'];
    const config = ['/config', '/settings', '/api', '/mcp', '/hooks', '/theme', '/vim', '/login', '/logout'];
    const collab = ['/plan', '/agent', '/pr', '/diff', '/init', '/tasks', '/branch', '/undo', '/test', '/bug', '/release'];

    if (convo.includes(command)) return { group: '对话控制', color: 'green' };
    if (info.includes(command)) return { group: '信息查看', color: 'yellow' };
    if (config.includes(command)) return { group: '配置工具', color: 'magenta' };
    if (collab.includes(command)) return { group: '开发协作', color: 'cyan' };

    // 兜底规则：按命令名关键词分配到4类
    const lowered = command.toLowerCase();
    if (/clear|restart|rename|compact|new|resume|help|exit|editor|terminal/i.test(lowered)) {
        return { group: '对话控制', color: 'green' };
    }
    if (/cost|usage|status|doctor|stats|memory|context|model|review|permission/i.test(lowered)) {
        return { group: '信息查看', color: 'yellow' };
    }
    if (/config|setting|api|mcp|hook|theme|vim|login|logout/i.test(lowered)) {
        return { group: '配置工具', color: 'magenta' };
    }

    // 其余全部归入开发协作
    return { group: '开发协作', color: 'cyan' };
}

function parseSlashCommands(rawText: string): string[] {
    const matches = rawText.matchAll(/\/[a-zA-Z0-9-]+/g);
    const commands = new Set<string>();
    for (const match of matches) {
        const token = match[0];
        const index = match.index ?? 0;
        const previousChar = index > 0 ? (rawText[index - 1] ?? ' ') : ' ';
        const nextChar = rawText[index + token.length] ?? ' ';

        // Avoid extracting path segments (/dev/null => /dev, /null).
        if (previousChar === '/' || nextChar === '/') {
            continue;
        }
        // Slash commands typically appear standalone in docs/help output.
        if (!/\s|`|\||\(|\[/.test(previousChar)) {
            continue;
        }
        if (isLikelySlashCommandToken(token)) {
            commands.add(token);
        }
    }
    return Array.from(commands).sort();
}

async function discoverBuiltInCommands(): Promise<string[]> {
    try {
        const { stdout, stderr } = await execFileAsync(
            'claude',
            ['-p', '/help'],
            { timeout: HELP_COMMAND_TIMEOUT_MS, maxBuffer: 1024 * 1024 }
        );
        const combinedOutput = `${stdout}\n${stderr}`;
        if (/Unknown skill:/i.test(combinedOutput)) {
            return [];
        }
        return parseSlashCommands(combinedOutput);
    } catch {
        return [];
    }
}

function discoverCustomCommandsFromDirectory(directory: string): string[] {
    if (!fs.existsSync(directory)) {
        return [];
    }
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const commands: string[] = [];

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            commands.push(...discoverCustomCommandsFromDirectory(entryPath));
            continue;
        }
        if (entry.isFile() && entry.name.endsWith('.md')) {
            const commandName = entry.name.replace(/\.md$/, '');
            if (commandName) {
                commands.push(`/${commandName}`);
            }
        }
    }
    return commands;
}

function discoverCustomCommands(): string[] {
    return Array.from(new Set([
        ...discoverCustomCommandsFromDirectory(path.join(os.homedir(), '.claude', 'commands')),
        ...discoverCustomCommandsFromDirectory(path.join(process.cwd(), '.claude', 'commands'))
    ]));
}

function buildGroups(commands: string[]): CommandGroup[] {
    if (commands.length === 0) {
        return DEFAULT_COMMAND_GROUPS;
    }

    // 以默认的4组为模板，固定输出4组
    const grouped = new Map<string, CommandGroup>();
    for (const defaultGroup of DEFAULT_COMMAND_GROUPS) {
        grouped.set(defaultGroup.name, {
            name: defaultGroup.name,
            color: defaultGroup.color,
            commands: [...defaultGroup.commands]
        });
    }

    for (const command of commands) {
        const { group, color } = classifyCommand(command);
        const current = grouped.get(group);
        if (current) {
            const desc = COMMAND_DESCRIPTIONS[command] ?? inferCommandDesc(command);
            current.commands.push({ cmd: command, desc });
            if (color) current.color = color;
        }
    }

    for (const group of grouped.values()) {
        group.commands = dedupeCommands(group.commands).sort((a, b) => a.cmd.localeCompare(b.cmd));
    }

    return Array.from(grouped.values());
}

function readCache(): void {
    try {
        if (!fs.existsSync(CACHE_PATH)) {
            return;
        }
        const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as CachedCommandData;
        if (Array.isArray(parsed.groups) && parsed.groups.length > 0) {
            cachedGroups = parsed.groups.map(group => ({
                ...group,
                commands: group.commands.filter(command => isLikelySlashCommandToken(command.cmd))
            })).filter(group => group.commands.length > 0);
        }
    } catch {
        // Ignore malformed cache and use defaults.
    }
}

function writeCache(groups: CommandGroup[]): void {
    try {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        const payload: CachedCommandData = { updatedAt: Date.now(), groups };
        fs.writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
        // Best-effort cache write.
    }
}

async function refreshCommandsInternal(): Promise<void> {
    const builtIn = await discoverBuiltInCommands();
    const custom = discoverCustomCommands();
    const merged = Array.from(new Set([...builtIn, ...custom]));
    const groups = buildGroups(merged);
    cachedGroups = groups;
    writeCache(groups);
}

function maybeRefreshInBackground(): void {
    const now = Date.now();
    if (refreshInFlight || now - lastRefreshAttempt < REFRESH_INTERVAL_MS) {
        return;
    }
    lastRefreshAttempt = now;
    refreshInFlight = refreshCommandsInternal().finally(() => {
        refreshInFlight = null;
    });
}

readCache();
maybeRefreshInBackground();

export function getCommandGroups(): CommandGroup[] {
    maybeRefreshInBackground();
    return cachedGroups.length > 0 ? cachedGroups : DEFAULT_COMMAND_GROUPS;
}
