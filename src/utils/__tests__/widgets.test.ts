import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, type Settings } from '../../types/Settings';
import {
    filterWidgetCatalog,
    getAllWidgetTypes,
    getWidget,
    getWidgetCatalog,
    getWidgetCatalogCategories,
    isKnownWidgetType
} from '../widgets';

describe('widget catalog', () => {
    const baseSettings: Settings = {
        ...DEFAULT_SETTINGS,
        powerline: { ...DEFAULT_SETTINGS.powerline }
    };

    it('builds catalog entries for command hints and layout widgets', () => {
        const catalog = getWidgetCatalog(baseSettings);
        const commandHint = catalog.find(entry => entry.type === 'command-hint');
        const separator = catalog.find(entry => entry.type === 'separator');
        expect(commandHint?.displayName).toBe('Command Hints');
        expect(commandHint?.category).toBe('Help');
        expect(separator?.category).toBe('Layout');
    });

    it('hides separator types in powerline mode', () => {
        const catalog = getWidgetCatalog({
            ...baseSettings,
            powerline: { ...baseSettings.powerline, enabled: true }
        });
        const types = new Set(catalog.map(entry => entry.type));
        expect(types.has('separator')).toBe(false);
        expect(types.has('flex-separator')).toBe(false);
    });

    it('returns runtime widget instances for non-layout widget types', () => {
        const runtimeTypes = getAllWidgetTypes(baseSettings).filter(
            type => type !== 'separator' && type !== 'flex-separator'
        );
        for (const type of runtimeTypes) {
            const widget = getWidget(type);
            expect(widget).not.toBeNull();
        }
    });

    it('exposes expected categories and known types', () => {
        const categories = getWidgetCatalogCategories(getWidgetCatalog(baseSettings));
        expect(categories).toContain('Help');
        expect(categories).toContain('Layout');
        expect(isKnownWidgetType('command-hint')).toBe(true);
        expect(isKnownWidgetType('unknown-widget-type')).toBe(false);
    });
});

describe('widget catalog filtering', () => {
    const catalog = getWidgetCatalog({
        ...DEFAULT_SETTINGS,
        powerline: { ...DEFAULT_SETTINGS.powerline }
    });

    it('matches by display name and type', () => {
        expect(filterWidgetCatalog(catalog, 'All', 'command')[0]?.type).toBe('command-hint');
        expect(filterWidgetCatalog(catalog, 'All', 'command-hint')[0]?.type).toBe('command-hint');
    });

    it('applies category and query filters together', () => {
        const results = filterWidgetCatalog(catalog, 'Help', 'command');
        expect(results.length).toBeGreaterThan(0);
        expect(results.every(entry => entry.category === 'Help')).toBe(true);
    });
});