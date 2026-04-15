import type {
    Widget,
    WidgetItemType
} from '../types/Widget';
import { CommandHintWidget } from '../widgets/CommandHint';

export interface WidgetManifestEntry {
    type: WidgetItemType;
    create: () => Widget;
}

export interface LayoutWidgetManifestEntry {
    type: WidgetItemType;
    displayName: string;
    description: string;
    category: string;
}

// Simplified: only CommandHint widget
export const WIDGET_MANIFEST: WidgetManifestEntry[] = [
    { type: 'command-hint', create: () => new CommandHintWidget() }
];

export const LAYOUT_WIDGET_MANIFEST: LayoutWidgetManifestEntry[] = [
    {
        type: 'separator',
        displayName: 'Separator',
        description: 'A separator character between widgets',
        category: 'Layout'
    },
    {
        type: 'flex-separator',
        displayName: 'Flex Separator',
        description: 'Expands to fill available terminal width',
        category: 'Layout'
    }
];