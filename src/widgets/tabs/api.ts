/**
 * Tabs Widget API
 *
 * Standalone API functions for working with Tabs widgets.
 *
 * @module widgets/tabs/api
 */

import type { Entity, World } from '../../core/types';
import { TAB_CLOSE_CHAR, TAB_SEPARATOR } from './config';
import { Tabs, tabDataStore } from './state';
import type { TabPosition } from './types';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a tabs widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a tabs widget
 *
 * @example
 * ```typescript
 * import { isTabs } from 'blecsd/widgets';
 *
 * if (isTabs(world, entity)) {
 *   // Handle tabs-specific logic
 * }
 * ```
 */
export function isTabs(_world: World, eid: Entity): boolean {
	return Tabs.isTabs[eid] === 1;
}

/**
 * Gets the active tab index of a tabs entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The active tab index
 */
export function getActiveTabIndex(_world: World, eid: Entity): number {
	return Tabs.activeTab[eid] as number;
}

/**
 * Gets the tab count of a tabs entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The number of tabs
 */
export function getTabCount(_world: World, eid: Entity): number {
	return Tabs.tabCount[eid] as number;
}

/**
 * Gets the tab position of a tabs entity.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns The tab position ('top' or 'bottom')
 */
export function getTabPosition(_world: World, eid: Entity): TabPosition {
	return Tabs.position[eid] === 1 ? 'bottom' : 'top';
}

/**
 * Renders the tab bar for a tabs entity.
 *
 * @param _world - The ECS world
 * @param eid - The entity ID
 * @param width - Available width for the tab bar
 * @returns The rendered tab bar string
 */
export function renderTabBar(_world: World, eid: Entity, width: number): string {
	const data = tabDataStore.get(eid);
	if (!data || data.length === 0) {
		return ' '.repeat(width);
	}

	const activeIdx = Tabs.activeTab[eid] as number;

	let result = '';
	for (let i = 0; i < data.length; i++) {
		const tab = data[i];
		if (!tab) continue;

		if (i > 0) {
			result += TAB_SEPARATOR;
		}

		const label = i === activeIdx ? `[${tab.label}]` : ` ${tab.label} `;
		const closeBtn = tab.closable ? ` ${TAB_CLOSE_CHAR}` : '';
		result += label + closeBtn;
	}

	// Pad or truncate to width
	if (result.length > width) {
		result = `${result.slice(0, width - 1)}…`;
	} else if (result.length < width) {
		result = result + ' '.repeat(width - result.length);
	}

	return result;
}

/**
 * Resets the Tabs component store. Useful for testing.
 * @internal
 */
export function resetTabsStore(): void {
	Tabs.isTabs.fill(0);
	Tabs.activeTab.fill(0);
	Tabs.position.fill(0);
	Tabs.tabCount.fill(0);
	tabDataStore.clear();
}
