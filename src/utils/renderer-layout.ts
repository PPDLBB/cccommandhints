import type { RenderContext } from '../types';
import type { Settings } from '../types/Settings';

import { calculateContextPercentage } from './context-percentage';

export function resolveEffectiveTerminalWidth(
    detectedWidth: number | null,
    settings: Settings,
    context: RenderContext
): number | null {
    if (!detectedWidth) {
        return null;
    }

    const flexMode = settings.flexMode as string;
    if (flexMode === 'full') {
        return detectedWidth - 6;
    }
    if (flexMode === 'full-minus-40') {
        return detectedWidth - 40;
    }
    if (flexMode === 'full-until-compact') {
        if (context.isPreview) {
            return detectedWidth;
        }
        const threshold = settings.compactThreshold;
        const contextPercentage = calculateContextPercentage(context);
        return contextPercentage >= threshold ? detectedWidth - 40 : detectedWidth - 6;
    }

    return null;
}

export function formatSeparator(sep: string): string {
    if (sep === '|') {
        return ' | ';
    }
    if (sep === ' ') {
        return ' ';
    }
    if (sep === ',') {
        return ', ';
    }
    if (sep === '-') {
        return ' - ';
    }
    return sep;
}
