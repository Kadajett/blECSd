/**
 * List Component Rendering Helpers
 *
 * @module components/list/rendering
 */

import type { Entity, World } from '../../core/types';
import { getListDisplay } from './display';
import { listStore } from './stores';
import { getVisibleItems } from './virtualization';

/**
 * Renders list items as strings for display.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param width - Available width
 * @returns Array of rendered line strings
 */
export function renderListItems(world: World, eid: Entity, width: number): string[] {
	const display = getListDisplay(world, eid);
	const visibleItems = getVisibleItems(world, eid);
	const selectedIndex = listStore.selectedIndex[eid] ?? -1;
	const lines: string[] = [];

	for (const { index, item } of visibleItems) {
		const isSelected = index === selectedIndex;
		const prefix = isSelected ? display.selectedPrefix : display.unselectedPrefix;
		const text = item.text;

		// Truncate if needed
		const maxTextWidth = width - prefix.length;
		const truncatedText = text.length > maxTextWidth ? `${text.slice(0, maxTextWidth - 1)}…` : text;

		lines.push(prefix + truncatedText);
	}

	return lines;
}
