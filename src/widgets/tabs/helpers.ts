/**
 * Tabs Widget Helpers
 *
 * Internal helper functions for tabs widget logic.
 *
 * @module widgets/tabs/helpers
 */

import { BorderType, setBorder } from '../../components/border';
import { appendChild } from '../../components/hierarchy';
import { setVisible } from '../../components/renderable';
import { setStyle } from '../../components/renderable';
import type { Entity, World } from '../../core/types';
import { parseColor } from '../../utils/color';
import type { ValidatedTabsConfig } from './config';
import { Tabs, tabDataStore } from './state';
import type { TabData, TabsAction, TabsWidget } from './types';

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/** Converts tab config to internal TabData. */
export function tabConfigToData(tab: {
	label: string;
	content?: number | (() => number);
	closable?: boolean;
}): TabData {
	return {
		label: tab.label,
		contentEntity: typeof tab.content === 'number' ? tab.content : null,
		lazyLoader: typeof tab.content === 'function' ? (tab.content as () => Entity) : null,
		closable: tab.closable ?? false,
		loaded: typeof tab.content === 'number',
	};
}

/** Initializes tab data store from config. */
export function initializeTabData(eid: Entity, tabs: ValidatedTabsConfig['tabs']): TabData[] {
	const tabData = tabs ? tabs.map(tabConfigToData) : [];
	tabDataStore.set(eid, tabData);
	return tabData;
}

/**
 * Parses a position value to a number.
 */
export function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;
	if (value === 'left' || value === 'top') return 0;
	return 0;
}

/**
 * Parses a dimension value for setDimensions.
 */
export function parseDimension(value: string | number | undefined): number | `${number}%` | 'auto' {
	if (value === undefined) return 'auto';
	if (typeof value === 'string') {
		if (value === 'auto') return 'auto';
		return value as `${number}%`;
	}
	return value;
}

/**
 * Handles key events for tabs navigation.
 */
export function handleTabsKey(key: string, widget: TabsWidget): TabsAction | null {
	if (key === 'Tab' || key === 'right') {
		widget.nextTab();
		return { type: 'next' };
	}
	if (key === 'S-Tab' || key === 'left') {
		widget.prevTab();
		return { type: 'prev' };
	}
	// Number keys 1-9 for direct tab access
	if (key >= '1' && key <= '9') {
		const idx = Number.parseInt(key, 10) - 1;
		const count = widget.getTabCount();
		if (idx < count) {
			widget.setActiveTab(idx);
			return { type: 'goto', index: idx };
		}
	}
	return null;
}

/**
 * Sets up style for tabs from config.
 */
export function applyTabsStyle(world: World, eid: Entity, validated: ValidatedTabsConfig): void {
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}
}

/**
 * Sets up border for tabs from config.
 */
export function applyTabsBorder(world: World, eid: Entity, validated: ValidatedTabsConfig): void {
	const borderConfig = validated.style?.border;
	if (borderConfig?.type === 'none') return;

	setBorder(world, eid, {
		type: borderConfig?.type === 'bg' ? BorderType.Background : BorderType.Line,
		fg: borderConfig?.fg !== undefined ? parseColor(borderConfig.fg) : undefined,
		bg: borderConfig?.bg !== undefined ? parseColor(borderConfig.bg) : undefined,
	});
}

/**
 * Loads lazy content for a tab if needed.
 */
export function loadTabContentImpl(world: World, eid: Entity, index: number): void {
	const data = tabDataStore.get(eid);
	if (!data || index < 0 || index >= data.length) return;

	const tab = data[index];
	if (!tab) return;

	if (!tab.loaded && tab.lazyLoader) {
		tab.contentEntity = tab.lazyLoader();
		tab.loaded = true;
		if (tab.contentEntity !== null) {
			appendChild(world, eid, tab.contentEntity);
		}
	}
}

/**
 * Shows content for the active tab and hides others.
 */
export function updateTabContentVisibility(world: World, eid: Entity): void {
	const data = tabDataStore.get(eid);
	if (!data) return;

	const activeIdx = Tabs.activeTab[eid] as number;

	for (let i = 0; i < data.length; i++) {
		const tab = data[i];
		if (tab?.contentEntity !== null && tab?.contentEntity !== undefined) {
			setVisible(world, tab.contentEntity, i === activeIdx);
		}
	}
}
