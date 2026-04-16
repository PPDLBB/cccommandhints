import {
cleanup,
render
} from 'ink-testing-library';
import React from 'react';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';

import {
DEFAULT_SETTINGS,
type Settings
} from '../../types/Settings';
import type * as AppModuleType from '../App';

const mockLoadSettings = vi.fn<(...args: unknown[]) => Promise<Settings>>();
const mockSaveSettings = vi.fn<(...args: unknown[]) => Promise<void>>();
const mockIsInstalled = vi.fn<(...args: unknown[]) => Promise<boolean>>();
const mockGetExistingStatusLine = vi.fn<(...args: unknown[]) => Promise<string | null>>();
const mockCheckPowerlineFontsAsync = vi.fn<(...args: unknown[]) => Promise<{ installed: boolean }>>();
const mockGetPackageVersion = vi.fn<() => string>();

vi.mock('../../utils/config', () => ({
    loadSettings: (...args: unknown[]) => mockLoadSettings(...args),
    saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
    getConfigPath: () => '/tmp/test-config.json',
    isCustomConfigPath: () => false,
    initConfigPath: vi.fn()
}));

vi.mock('../../utils/claude-settings', () => ({
    isInstalled: (...args: unknown[]) => mockIsInstalled(...args),
    getExistingStatusLine: (...args: unknown[]) => mockGetExistingStatusLine(...args),
    getClaudeSettingsPath: () => '/tmp/test-claude-settings.json',
    isKnownCommand: (cmd: string) => cmd.includes('cccommandhints'),
    installStatusLine: vi.fn(),
    uninstallStatusLine: vi.fn(),
    CCOMMANDHINTS_COMMANDS: {
        NPM: 'npx -y cccommandhints@latest',
        BUNX: 'bunx -y cccommandhints@latest',
        SELF_MANAGED: 'cccommandhints'
    },
    isBunxAvailable: () => true
}));

vi.mock('../../utils/powerline', () => ({
    checkPowerlineFontsAsync: (...args: unknown[]) => mockCheckPowerlineFontsAsync(...args),
    installPowerlineFonts: vi.fn()
}));

vi.mock('../../utils/terminal', () => ({
    getPackageVersion: () => mockGetPackageVersion(),
    canDetectTerminalWidth: () => true,
    getTerminalWidth: () => 120
}));

vi.mock('../../utils/widget-manifest', () => ({
    WIDGET_MANIFEST: [
        {
            type: 'command-hint',
            create: () => ({
                id: 'command-hint',
                type: 'command-hint',
                render: () => 'Command Hints'
            })
        }
    ],
    LAYOUT_WIDGET_MANIFEST: [
        { type: 'separator', displayName: 'Separator', description: '', category: 'Layout' },
        { type: 'flex-separator', displayName: 'Flex Separator', description: '', category: 'Layout' }
    ]
}));

describe('App TUI E2E critical flows', () => {
    let AppModule: typeof AppModuleType;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
        mockIsInstalled.mockResolvedValue(false);
        mockGetExistingStatusLine.mockResolvedValue(null);
        mockCheckPowerlineFontsAsync.mockResolvedValue({ installed: false });
        mockGetPackageVersion.mockReturnValue('1.1.0');

        AppModule = await import('../App');
    });

    afterEach(() => {
        cleanup();
    });

    it('loads settings and renders the main menu on startup', async () => {
        const { lastFrame } = render(<AppModule.App />);

        await waitForFrames(3);

        const frame = lastFrame() ?? '';
        expect(frame).toContain('CCCommandHints Configuration');
        expect(frame).toContain('Main Menu');
        expect(frame).toContain('Edit Lines');
        expect(frame).toContain('Edit Colors');
        expect(frame).toContain('Terminal Options');
        expect(frame).toContain('Powerline');
        expect(frame).toContain('Global Overrides');
        expect(frame).toContain('Install to Claude Code');
        expect(frame).toContain('Exit');
    });

    it('shows "Uninstall" when already installed and existing status line is loaded', async () => {
        mockIsInstalled.mockResolvedValue(true);
        mockGetExistingStatusLine.mockResolvedValue('npx -y cccommandhints@latest');

        const { lastFrame } = render(<AppModule.App />);
        await waitForFrames(3);

        const frame = lastFrame() ?? '';
        expect(frame).toContain('Uninstall from Claude Code');
    });

    it('navigates to Edit Lines and back to main menu', async () => {
        const { lastFrame, stdin } = render(<AppModule.App />);
        await waitForFrames(3);

        // Enter on first item (Edit Lines)
        stdin.write('\r');
        await waitForFrames(2);

        let frame = lastFrame() ?? '';
        expect(frame).toContain('Select Line to Edit');

        // Press Escape to go back
        stdin.write('\u001B');
        await waitForFrames(2);

        frame = lastFrame() ?? '';
        expect(frame).toContain('Main Menu');
        expect(frame).toContain('Edit Lines');
    });

    it('navigates to Colors and back to main menu', async () => {
        const { lastFrame, stdin } = render(<AppModule.App />);
        await waitForFrames(3);

        // Move down to Edit Colors (index 1)
        stdin.write('\u001B[B');
        await waitForFrames(1);

        // Enter
        stdin.write('\r');
        await waitForFrames(2);

        let frame = lastFrame() ?? '';
        expect(frame).toContain('Select Line to Edit Colors');

        // Escape back to main
        stdin.write('\u001B');
        await waitForFrames(2);

        frame = lastFrame() ?? '';
        expect(frame).toContain('Main Menu');
    });

    it('saves settings and shows flash message on Ctrl+S', async () => {
        const { lastFrame, stdin } = render(<AppModule.App />);
        await waitForFrames(3);

        // Make a change to trigger hasChanges
        // Navigate to Edit Lines
        stdin.write('\r');
        await waitForFrames(2);

        // Press Escape to go back
        stdin.write('\u001B');
        await waitForFrames(2);

        // Ctrl+S
        stdin.write('\u0013');
        await waitForFrames(2);

        expect(mockSaveSettings).toHaveBeenCalledTimes(1);

        const frame = lastFrame() ?? '';
        expect(frame).toContain('Configuration saved');
    });

    it('opens install menu when selecting install and not installed', async () => {
        const { lastFrame, stdin } = render(<AppModule.App />);
        await waitForFrames(3);

        // Move down past separators to Install (5 selectable items below Edit Lines)
        for (let i = 0; i < 5; i++) {
            stdin.write('\u001B[B');
            await waitForFrames(1);
        }

        // Enter
        stdin.write('\r');
        await waitForFrames(2);

        const frame = lastFrame() ?? '';
        expect(frame).toContain('Install cccommandhints');
        expect(frame).toContain('npx');
        expect(frame).toContain('bunx');
    });

    it('loads powerline font status on mount', async () => {
        mockCheckPowerlineFontsAsync.mockResolvedValue({ installed: true });

        render(<AppModule.App />);
        await waitForFrames(3);

        expect(mockCheckPowerlineFontsAsync).toHaveBeenCalledTimes(1);
    });
});

async function waitForFrames(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
        await new Promise((resolve) => { setTimeout(resolve, 25); });
    }
}