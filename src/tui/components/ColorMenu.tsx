import chalk from 'chalk';
import {
    Box,
    Text,
    useInput
} from 'ink';
import SelectInput from 'ink-select-input';
import React, { useState } from 'react';

import { getColorLevelString } from '../../types/ColorLevel';
import type { Settings } from '../../types/Settings';
import type { WidgetItem } from '../../types/Widget';
import {
    applyColors,
    getAvailableColorsForUI
} from '../../utils/colors';
import { getWidget } from '../../utils/widgets';

import {
    cycleWidgetColor,
    resetWidgetStyling
} from './color-menu/mutations';

export interface ColorMenuProps {
    widgets: WidgetItem[];
    lineIndex?: number;
    settings: Settings;
    onUpdate: (widgets: WidgetItem[]) => void;
    onBack: () => void;
}

export const ColorMenu: React.FC<ColorMenuProps> = ({ widgets, lineIndex, settings, onUpdate, onBack }) => {
    const colorableWidgets = widgets.filter((widget) => {
        if (widget.type === 'separator' || widget.type === 'flex-separator') {
            return true;
        }
        const widgetInstance = getWidget(widget.type);
        return widgetInstance ? widgetInstance.supportsColors(widget) : true;
    });
    const [highlightedItemId, setHighlightedItemId] = useState(colorableWidgets[0]?.id ?? null);

    const hasNoItems = colorableWidgets.length === 0;
    useInput((input, key) => {
        if (hasNoItems) {
            onBack();
            return;
        }

        if (key.escape) {
            onBack();
        } else if (input === 'r' || input === 'R') {
            if (highlightedItemId && highlightedItemId !== 'back') {
                const selectedWidget = colorableWidgets.find(widget => widget.id === highlightedItemId);
                if (selectedWidget) {
                    const newItems = resetWidgetStyling(widgets, selectedWidget.id);
                    onUpdate(newItems);
                }
            }
        } else if (key.leftArrow || key.rightArrow) {
            if (highlightedItemId && highlightedItemId !== 'back') {
                const selectedWidget = colorableWidgets.find(widget => widget.id === highlightedItemId);
                if (selectedWidget) {
                    const newItems = cycleWidgetColor({
                        widgets,
                        widgetId: selectedWidget.id,
                        direction: key.rightArrow ? 'right' : 'left',
                        editingBackground: false,
                        colors,
                        backgroundColors: []
                    });
                    onUpdate(newItems);
                }
            }
        }
    });

    if (hasNoItems) {
        return (
            <Box flexDirection='column'>
                <Text bold>
                    Configure Colors
                    {lineIndex !== undefined ? ` - Line ${lineIndex + 1}` : ''}
                </Text>
                <Box marginTop={1}><Text dimColor>No colorable widgets in the status line.</Text></Box>
                <Text dimColor>Add a widget first to continue.</Text>
                <Box marginTop={1}><Text>Press any key to go back...</Text></Box>
            </Box>
        );
    }

    const getItemLabel = (widget: WidgetItem) => {
        if (widget.type === 'separator') {
            const char = widget.character ?? '|';
            return `Separator: ${char === ' ' ? 'space' : char}`;
        }
        if (widget.type === 'flex-separator') {
            return 'Flex Separator';
        }

        const widgetImpl = getWidget(widget.type);
        return widgetImpl ? widgetImpl.getDisplayName() : `Unknown: ${widget.type}`;
    };

    const colorOptions = getAvailableColorsForUI();
    const colors = colorOptions.map(c => c.value || '');

    const menuItems = colorableWidgets.map((widget, index) => {
        const label = `${index + 1}: ${getItemLabel(widget)}`;
        const level = getColorLevelString(settings.colorLevel);
        let defaultColor = 'white';
        if (widget.type !== 'separator' && widget.type !== 'flex-separator') {
            const widgetImpl = getWidget(widget.type);
            if (widgetImpl) {
                defaultColor = widgetImpl.getDefaultColor();
            }
        }
        const styledLabel = applyColors(label, widget.color ?? defaultColor, widget.backgroundColor, widget.bold, level);
        return {
            label: styledLabel,
            value: widget.id
        };
    });
    menuItems.push({ label: '← Back', value: 'back' });

    const handleSelect = (selected: { value: string }) => {
        if (selected.value === 'back') {
            onBack();
        }
    };

    const handleHighlight = (item: { value: string }) => {
        setHighlightedItemId(item.value);
    };

    const selectedWidget = highlightedItemId && highlightedItemId !== 'back'
        ? colorableWidgets.find(widget => widget.id === highlightedItemId)
        : null;
    const currentColor = selectedWidget
        ? (selectedWidget.color ?? (() => {
            if (selectedWidget.type !== 'separator' && selectedWidget.type !== 'flex-separator') {
                const widgetImpl = getWidget(selectedWidget.type);
                return widgetImpl ? widgetImpl.getDefaultColor() : 'white';
            }
            return 'white';
        })())
        : 'white';

    const colorIndex = colors.indexOf(currentColor);
    const colorNumber = colorIndex === -1 ? 'custom' : colorIndex + 1;

    let colorDisplay;
    if (!currentColor || currentColor === '') {
        colorDisplay = chalk.gray('(default)');
    } else {
        let displayName;
        if (currentColor.startsWith('ansi256:')) {
            displayName = `ANSI ${currentColor.substring(8)}`;
        } else if (currentColor.startsWith('hex:')) {
            displayName = `#${currentColor.substring(4)}`;
        } else {
            const colorOption = colorOptions.find(c => c.value === currentColor);
            displayName = colorOption ? colorOption.name : currentColor;
        }

        const level = getColorLevelString(settings.colorLevel);
        colorDisplay = applyColors(displayName, currentColor, undefined, false, level);
    }

    return (
        <Box flexDirection='column'>
            <Box>
                <Text bold>
                    Configure Colors
                    {lineIndex !== undefined ? ` - Line ${lineIndex + 1}` : ''}
                </Text>
            </Box>
            <Text dimColor>
                ↑↓ to select, ←→ to cycle color, (r)eset, ESC to go back
            </Text>
            {selectedWidget ? (
                <Box marginTop={1}>
                    <Text>
                        Current color
                        {' '}
                        (
                        {colorNumber === 'custom' ? 'custom' : `${colorNumber}/${colors.length}`}
                        ):
                        {' '}
                        {colorDisplay}
                        {selectedWidget.bold && chalk.bold(' [BOLD]')}
                    </Text>
                </Box>
            ) : (
                <Box marginTop={1}>
                    <Text> </Text>
                </Box>
            )}
            <Box marginTop={1}>
                <SelectInput
                    key={highlightedItemId}
                    items={menuItems}
                    onSelect={handleSelect}
                    onHighlight={handleHighlight}
                    initialIndex={Math.max(0, menuItems.findIndex(item => item.value === highlightedItemId))}
                    indicatorComponent={({ isSelected }) => (
                        <Text>{isSelected ? '▶' : '  '}</Text>
                    )}
                    itemComponent={({ isSelected, label }) => (
                        <Text>{` ${label}`}</Text>
                    )}
                />
            </Box>
            <Box marginTop={1} flexDirection='column'>
                <Text color='yellow'>⚠ VSCode Users: </Text>
                <Text dimColor wrap='wrap'>If colors appear incorrect in the VSCode integrated terminal, the "Terminal › Integrated: Minimum Contrast Ratio" (`terminal.integrated.minimumContrastRatio`) setting is forcing a minimum contrast between foreground and background colors. You can adjust this setting to 1 to disable the contrast enforcement, or use a standalone terminal for accurate colors.</Text>
            </Box>
        </Box>
    );
};