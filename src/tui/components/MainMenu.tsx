import {
    Box,
    Text
} from 'ink';
import React from 'react';

import type { Settings } from '../../types/Settings';

import { List } from './List';

export type MainMenuOption = 'lines'
    | 'colors'
    | 'install'
    | 'save'
    | 'exit';

export interface MainMenuProps {
    onSelect: (value: MainMenuOption, index: number) => void;
    isClaudeInstalled: boolean;
    hasChanges: boolean;
    initialSelection?: number;
    settings: Settings | null;
    previewIsTruncated?: boolean;
}

export const MainMenu: React.FC<MainMenuProps> = ({
    onSelect,
    isClaudeInstalled,
    hasChanges,
    initialSelection = 0,
    settings,
    previewIsTruncated
}) => {
    // Build menu structure with visual gaps
    const menuItems: ({
        label: string;
        value: MainMenuOption;
        description: string;
    } | '-')[] = [
        {
            label: '📝 Edit Lines',
            value: 'lines',
            description:
                'Configure any number of status lines with various widgets like model info, git status, and token usage'
        },
        {
            label: '🎨 Edit Colors',
            value: 'colors',
            description:
                'Customize colors for each widget including foreground, background, and bold styling'
        },
        '-' as const,
        {
            label: isClaudeInstalled
                ? '🔌 Uninstall from Claude Code'
                : '📦 Install to Claude Code',
            value: 'install',
            description: isClaudeInstalled
                ? 'Remove cccommandhints from your Claude Code settings'
                : 'Add cccommandhints to your Claude Code settings so the command hints bar appears in Claude Code'
        }
    ];

    if (hasChanges) {
        menuItems.push(
            {
                label: '💾 Save & Exit',
                value: 'save',
                description: 'Save all changes and exit the configuration tool'
            },
            {
                label: '❌ Exit without saving',
                value: 'exit',
                description: 'Exit without saving your changes'
            }
        );
    } else {
        menuItems.push(
            {
                label: '🚪 Exit',
                value: 'exit',
                description: 'Exit the configuration tool'
            }
        );
    }

    // Check if we should show the truncation warning
    const showTruncationWarning
        = previewIsTruncated && settings?.flexMode === 'full-minus-40';

    return (
        <Box flexDirection='column'>
            {showTruncationWarning && (
                <Box marginBottom={1}>
                    <Text color='yellow'>
                        ⚠ Some lines are truncated at this terminal width (flex mode uses
                        full-minus-40)
                    </Text>
                </Box>
            )}

            <Text bold>Main Menu</Text>

            <List
                items={menuItems}
                marginTop={1}
                onSelect={(value, index) => {
                    if (value === 'back') {
                        return;
                    }

                    onSelect(value, index);
                }}
                initialSelection={initialSelection}
            />
        </Box>
    );
};