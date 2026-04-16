import chalk from 'chalk';
import {
    Box,
    Text,
    render,
    useApp,
    useInput
} from 'ink';
import React, {
    useCallback,
    useEffect,
    useState
} from 'react';

import type { Settings } from '../types/Settings';
import type { WidgetItem } from '../types/Widget';
import {
    CCOMMANDHINTS_COMMANDS,
    getClaudeSettingsPath,
    getExistingStatusLine,
    installStatusLine,
    isBunxAvailable,
    isInstalled,
    isKnownCommand,
    uninstallStatusLine
} from '../utils/claude-settings';
import { cloneSettings } from '../utils/clone-settings';
import {
    getConfigPath,
    isCustomConfigPath,
    loadSettings,
    saveSettings
} from '../utils/config';
import { getPackageVersion } from '../utils/terminal';
import { checkPowerlineFontsAsync, installPowerlineFonts, type PowerlineFontStatus } from '../utils/powerline';

import {
    ColorMenu,
    ConfirmDialog,
    GlobalOverridesMenu,
    InstallMenu,
    ItemsEditor,
    LineSelector,
    MainMenu,
    PowerlineSetup,
    StatusLinePreview,
    TerminalOptionsMenu,
    TerminalWidthMenu,
    type MainMenuOption
} from './components';

interface FlashMessage {
    text: string;
    color: 'green' | 'red';
}

type AppScreen = 'main'
    | 'editLines'
    | 'items'
    | 'colorLines'
    | 'colors'
    | 'terminalOptions'
    | 'terminalWidth'
    | 'powerline'
    | 'globalOverrides'
    | 'confirm'
    | 'install';

interface ConfirmDialogState {
    message: string;
    action: () => Promise<void>;
    cancelScreen?: Exclude<AppScreen, 'confirm'>;
}

export function getConfirmCancelScreen(confirmDialog: ConfirmDialogState | null): Exclude<AppScreen, 'confirm'> {
    return confirmDialog?.cancelScreen ?? 'main';
}

export function clearInstallMenuSelection(menuSelections: Record<string, number>): Record<string, number> {
    if (menuSelections.install === undefined) {
        return menuSelections;
    }

    const next = { ...menuSelections };
    delete next.install;
    return next;
}

export const App: React.FC = () => {
    const { exit } = useApp();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [screen, setScreen] = useState<AppScreen>('main');
    const [selectedLine, setSelectedLine] = useState(0);
    const [menuSelections, setMenuSelections] = useState<Record<string, number>>({});
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
    const [isClaudeInstalled, setIsClaudeInstalled] = useState(false);
    const [terminalWidth, setTerminalWidth] = useState(process.stdout.columns || 80);
    const [existingStatusLine, setExistingStatusLine] = useState<string | null>(null);
    const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
    const [previewIsTruncated, setPreviewIsTruncated] = useState(false);
    const [powerlineFontStatus, setPowerlineFontStatus] = useState<PowerlineFontStatus>({ installed: false });
    const [installingFonts, setInstallingFonts] = useState(false);
    const [fontInstallMessage, setFontInstallMessage] = useState<string | null>(null);

    useEffect(() => {
        // Load existing status line
        void getExistingStatusLine().then(setExistingStatusLine);
        void checkPowerlineFontsAsync().then(setPowerlineFontStatus);

        void loadSettings().then((loadedSettings) => {
            // Set global chalk level based on settings (default to 256 colors for compatibility)
            chalk.level = loadedSettings.colorLevel;
            setSettings(loadedSettings);
            setOriginalSettings(cloneSettings(loadedSettings));
        });
        void isInstalled().then(setIsClaudeInstalled);

        const handleResize = () => {
            setTerminalWidth(process.stdout.columns || 80);
        };

        process.stdout.on('resize', handleResize);
        return () => {
            process.stdout.off('resize', handleResize);
        };
    }, []);

    // Check for changes whenever settings update
    useEffect(() => {
        if (originalSettings) {
            const hasAnyChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
            setHasChanges(hasAnyChanges);
        }
    }, [settings, originalSettings]);

    // Clear header message after 2 seconds
    useEffect(() => {
        if (flashMessage) {
            const timer = setTimeout(() => {
                setFlashMessage(null);
            }, 2000);
            return () => { clearTimeout(timer); };
        }
    }, [flashMessage]);

    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            exit();
        }
        // Global save shortcut
        if (key.ctrl && input === 's' && settings) {
            void (async () => {
                await saveSettings(settings);
                setOriginalSettings(cloneSettings(settings));
                setHasChanges(false);
                setFlashMessage({
                    text: '✓ Configuration saved',
                    color: 'green'
                });
            })();
        }
    });

    const handleInstallSelection = useCallback((command: string, displayName: string, useBunx: boolean) => {
        void getExistingStatusLine().then((existing) => {
            const isAlreadyInstalled = isKnownCommand(existing ?? '');
            let message: string;

            if (existing && !isAlreadyInstalled) {
                message = `This will modify ${getClaudeSettingsPath()}\n\nA status line is already configured: "${existing}"\nReplace it with ${command}?`;
            } else if (isAlreadyInstalled) {
                message = `cccommandhints is already installed in ${getClaudeSettingsPath()}\nUpdate it with ${command}?`;
            } else {
                message = `This will modify ${getClaudeSettingsPath()} to add cccommandhints with ${displayName}.\nContinue?`;
            }

            setConfirmDialog({
                message,
                cancelScreen: 'install',
                action: async () => {
                    await installStatusLine(useBunx);
                    setIsClaudeInstalled(true);
                    setExistingStatusLine(command);
                    setScreen('main');
                    setConfirmDialog(null);
                }
            });
            setScreen('confirm');
        });
    }, []);

    const handleNpxInstall = useCallback(() => {
        setMenuSelections(prev => ({ ...prev, install: 0 }));
        handleInstallSelection(CCOMMANDHINTS_COMMANDS.NPM, 'npx', false);
    }, [handleInstallSelection]);

    const handleBunxInstall = useCallback(() => {
        setMenuSelections(prev => ({ ...prev, install: 1 }));
        handleInstallSelection(CCOMMANDHINTS_COMMANDS.BUNX, 'bunx', true);
    }, [handleInstallSelection]);

    const handleInstallMenuCancel = useCallback(() => {
        setMenuSelections(clearInstallMenuSelection);
        setScreen('main');
    }, []);

    const handleInstallFonts = useCallback(async () => {
        setInstallingFonts(true);
        setFontInstallMessage(null);
        try {
            const result = await installPowerlineFonts();
            setFontInstallMessage(result.message);
            if (result.success) {
                const status = await checkPowerlineFontsAsync();
                setPowerlineFontStatus(status);
            }
        } finally {
            setInstallingFonts(false);
        }
    }, []);

    const handleClearFontMessage = useCallback(() => {
        setFontInstallMessage(null);
    }, []);

    if (!settings) {
        return <Text>Loading settings...</Text>;
    }

    const handleInstallUninstall = () => {
        if (isClaudeInstalled) {
            // Uninstall
            setConfirmDialog({
                message: `This will remove cccommandhints from ${getClaudeSettingsPath()}. Continue?`,
                action: async () => {
                    await uninstallStatusLine();
                    setIsClaudeInstalled(false);
                    setExistingStatusLine(null);
                    setScreen('main');
                    setConfirmDialog(null);
                }
            });
            setScreen('confirm');
        } else {
            // Show install menu to select npx or bunx
            setScreen('install');
        }
    };

    const handleMainMenuSelect = async (value: MainMenuOption) => {
        switch (value) {
            case 'editLines':
                setScreen('editLines');
                break;
            case 'colors':
                setScreen('colorLines');
                break;
            case 'terminalOptions':
                setScreen('terminalOptions');
                break;
            case 'powerline':
                setScreen('powerline');
                break;
            case 'globalOverrides':
                setScreen('globalOverrides');
                break;
            case 'install':
                handleInstallUninstall();
                break;
            case 'save':
                await saveSettings(settings);
                setOriginalSettings(cloneSettings(settings)); // Update original after save
                setHasChanges(false);
                exit();
                break;
            case 'exit':
                exit();
                break;
        }
    };

    const updateLines = (newLines: WidgetItem[][]) => {
        setSettings({ ...settings, lines: newLines });
    };

    return (
        <Box flexDirection='column'>
            <Box marginBottom={1}>
                <Text bold>
                    <Text color='green'>
                        CCCommandHints Configuration
                    </Text>
                </Text>
                <Text bold>
                    {` | ${getPackageVersion() && `v${getPackageVersion()}`}`}
                </Text>
                {flashMessage && (
                    <Text color={flashMessage.color} bold>
                        {`  ${flashMessage.text}`}
                    </Text>
                )}
            </Box>
            {isCustomConfigPath() && (
                <Text dimColor>{`Config: ${getConfigPath()}`}</Text>
            )}

            <StatusLinePreview
                lines={settings.lines}
                terminalWidth={terminalWidth}
                settings={settings}
                onTruncationChange={setPreviewIsTruncated}
            />

            <Box marginTop={1}>
                {screen === 'main' && (
                    <MainMenu
                        onSelect={(value, index) => {
                            // Only persist menu selection if not exiting
                            if (value !== 'save' && value !== 'exit') {
                                setMenuSelections(prev => ({ ...prev, main: index }));
                            }

                            void handleMainMenuSelect(value);
                        }}
                        isClaudeInstalled={isClaudeInstalled}
                        hasChanges={hasChanges}
                        initialSelection={menuSelections.main}
                        settings={settings}
                        previewIsTruncated={previewIsTruncated}
                    />
                )}
                {screen === 'editLines' && (
                    <LineSelector
                        lines={settings.lines}
                        onLinesUpdate={updateLines}
                        onSelect={(line) => {
                            setMenuSelections(prev => ({ ...prev, lines: line }));
                            setSelectedLine(line);
                            setScreen('items');
                        }}
                        onBack={() => {
                            setMenuSelections(prev => ({ ...prev, main: 0 }));
                            setScreen('main');
                        }}
                        initialSelection={menuSelections.lines}
                        title='Select Line to Edit'
                        allowEditing={true}
                        settings={settings}
                    />
                )}
                {screen === 'items' && (
                    <ItemsEditor
                        widgets={settings.lines[selectedLine] ?? []}
                        onUpdate={(updatedWidgets) => {
                            const newLines = [...settings.lines];
                            newLines[selectedLine] = updatedWidgets;
                            setSettings({ ...settings, lines: newLines });
                        }}
                        onBack={() => {
                            setScreen('editLines');
                        }}
                        lineNumber={selectedLine + 1}
                        settings={settings}
                    />
                )}
                {screen === 'colorLines' && (
                    <LineSelector
                        lines={settings.lines}
                        onLinesUpdate={updateLines}
                        onSelect={(line) => {
                            setMenuSelections(prev => ({ ...prev, lines: line }));
                            setSelectedLine(line);
                            setScreen('colors');
                        }}
                        onBack={() => {
                            // Save that we came from 'colors' menu (index 1)
                            setMenuSelections(prev => ({ ...prev, main: 1 }));
                            setScreen('main');
                        }}
                        initialSelection={menuSelections.lines}
                        title='Select Line to Edit Colors'
                        blockIfPowerlineActive={true}
                        settings={settings}
                        allowEditing={false}
                    />
                )}
                {screen === 'colors' && (
                    <ColorMenu
                        widgets={settings.lines[selectedLine] ?? []}
                        lineIndex={selectedLine}
                        settings={settings}
                        onUpdate={(updatedWidgets) => {
                            // Update only the selected line
                            const newLines = [...settings.lines];
                            newLines[selectedLine] = updatedWidgets;
                            setSettings({ ...settings, lines: newLines });
                        }}
                        onBack={() => {
                            // Go back to line selection for colors
                            setScreen('colorLines');
                        }}
                    />
                )}
                {screen === 'terminalOptions' && (
                    <TerminalOptionsMenu
                        settings={settings}
                        onUpdate={setSettings}
                        onBack={(target) => {
                            if (target === 'width') {
                                setScreen('terminalWidth');
                            } else {
                                setScreen('main');
                            }
                        }}
                    />
                )}
                {screen === 'terminalWidth' && (
                    <TerminalWidthMenu
                        settings={settings}
                        onUpdate={setSettings}
                        onBack={() => {
                            setScreen('terminalOptions');
                        }}
                    />
                )}
                {screen === 'powerline' && (
                    <PowerlineSetup
                        settings={settings}
                        powerlineFontStatus={powerlineFontStatus}
                        onUpdate={setSettings}
                        onBack={() => {
                            setScreen('main');
                        }}
                        onInstallFonts={handleInstallFonts}
                        installingFonts={installingFonts}
                        fontInstallMessage={fontInstallMessage}
                        onClearMessage={handleClearFontMessage}
                    />
                )}
                {screen === 'globalOverrides' && (
                    <GlobalOverridesMenu
                        settings={settings}
                        onUpdate={setSettings}
                        onBack={() => {
                            setScreen('main');
                        }}
                    />
                )}
                {screen === 'confirm' && confirmDialog && (
                    <ConfirmDialog
                        message={confirmDialog.message}
                        onConfirm={() => void confirmDialog.action()}
                        onCancel={() => {
                            setScreen(getConfirmCancelScreen(confirmDialog));
                            setConfirmDialog(null);
                        }}
                    />
                )}
                {screen === 'install' && (
                    <InstallMenu
                        bunxAvailable={isBunxAvailable()}
                        existingStatusLine={existingStatusLine}
                        onSelectNpx={handleNpxInstall}
                        onSelectBunx={handleBunxInstall}
                        onCancel={handleInstallMenuCancel}
                        initialSelection={menuSelections.install}
                    />
                )}
            </Box>
        </Box>
    );
};

export function runTUI() {
    // Clear the terminal before starting the TUI
    process.stdout.write('\x1b[2J\x1b[H');
    render(<App />);
}