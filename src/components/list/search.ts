/**
 * List Component Search Mode
 *
 * @module components/list/search
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import { isList, isListInState, sendListEvent } from './core';
import { setSelectedIndex } from './selection';
import { itemsStore, listStore, searchChangeCallbacks, searchQueryStore } from './stores';

/**
 * Checks if search mode is enabled for the list.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if search is enabled
 */
export function isListSearchEnabled(_world: World, eid: Entity): boolean {
	return listStore.searchEnabled[eid] === 1;
}

/**
 * Sets whether search mode is enabled for the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param enabled - Whether search is enabled
 */
export function setListSearchEnabled(world: World, eid: Entity, enabled: boolean): void {
	listStore.searchEnabled[eid] = enabled ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Checks if list is currently in search mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if list is in searching state
 */
export function isListSearching(world: World, eid: Entity): boolean {
	return isListInState(world, eid, 'searching');
}

/**
 * Starts search mode for the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if search mode was started
 */
export function startListSearch(world: World, eid: Entity): boolean {
	if (!isList(world, eid)) {
		return false;
	}
	if (!isListSearchEnabled(world, eid)) {
		return false;
	}

	const result = sendListEvent(world, eid, 'startSearch');
	if (result) {
		searchQueryStore.set(eid, '');
	}
	return result;
}

/**
 * Ends search mode for the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if search mode was ended
 */
export function endListSearch(world: World, eid: Entity): boolean {
	if (!isList(world, eid)) {
		return false;
	}

	const result = sendListEvent(world, eid, 'endSearch');
	if (result) {
		searchQueryStore.delete(eid);
	}
	return result;
}

/**
 * Gets the current search query.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns The current search query or empty string
 */
export function getListSearchQuery(_world: World, eid: Entity): string {
	return searchQueryStore.get(eid) ?? '';
}

/**
 * Sets the search query and finds matching items.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param query - The search query
 * @returns true if a match was found and selected
 */
export function setListSearchQuery(world: World, eid: Entity, query: string): boolean {
	searchQueryStore.set(eid, query);
	markDirty(world, eid);

	// Fire callbacks
	const callbacks = searchChangeCallbacks.get(eid);
	if (callbacks) {
		for (const cb of callbacks) {
			cb(query);
		}
	}

	// Find and select first matching item
	if (query.length > 0) {
		return findAndSelectByText(world, eid, query);
	}
	return false;
}

/**
 * Appends a character to the search query.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param char - The character to append
 * @returns true if a match was found and selected
 */
export function appendToSearchQuery(world: World, eid: Entity, char: string): boolean {
	const current = searchQueryStore.get(eid) ?? '';
	return setListSearchQuery(world, eid, current + char);
}

/**
 * Removes the last character from the search query.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if a match was found and selected
 */
export function backspaceSearchQuery(world: World, eid: Entity): boolean {
	const current = searchQueryStore.get(eid) ?? '';
	if (current.length === 0) {
		return false;
	}
	return setListSearchQuery(world, eid, current.slice(0, -1));
}

/**
 * Clears the search query.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 */
export function clearSearchQuery(world: World, eid: Entity): void {
	setListSearchQuery(world, eid, '');
}

/**
 * Finds and selects the first item matching the text (case-insensitive).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param text - The text to search for
 * @returns true if a match was found and selected
 */
export function findAndSelectByText(world: World, eid: Entity, text: string): boolean {
	const items = itemsStore.get(eid) ?? [];
	const lowerText = text.toLowerCase();

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item && !item.disabled && item.text.toLowerCase().startsWith(lowerText)) {
			return setSelectedIndex(world, eid, i);
		}
	}
	return false;
}

/**
 * Finds the next item matching the current search query.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if a match was found and selected
 */
export function findNextMatch(world: World, eid: Entity): boolean {
	const query = searchQueryStore.get(eid);
	if (!query || query.length === 0) {
		return false;
	}

	const items = itemsStore.get(eid) ?? [];
	const currentIndex = listStore.selectedIndex[eid] ?? -1;
	const lowerQuery = query.toLowerCase();

	// Start searching from current index + 1
	for (let i = currentIndex + 1; i < items.length; i++) {
		const item = items[i];
		if (item && !item.disabled && item.text.toLowerCase().startsWith(lowerQuery)) {
			return setSelectedIndex(world, eid, i);
		}
	}

	// Wrap around to beginning
	for (let i = 0; i <= currentIndex; i++) {
		const item = items[i];
		if (item && !item.disabled && item.text.toLowerCase().startsWith(lowerQuery)) {
			return setSelectedIndex(world, eid, i);
		}
	}

	return false;
}

/**
 * Registers a callback for when search query changes.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @param callback - The callback function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsubscribe = onListSearchChange(world, eid, (query) => {
 *   console.log(`Search: ${query}`);
 * });
 * ```
 */
export function onListSearchChange(
	_world: World,
	eid: Entity,
	callback: (query: string) => void,
): () => void {
	const callbacks = searchChangeCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	searchChangeCallbacks.set(eid, callbacks);

	return () => {
		const cbs = searchChangeCallbacks.get(eid);
		if (cbs) {
			const idx = cbs.indexOf(callback);
			if (idx !== -1) {
				cbs.splice(idx, 1);
			}
		}
	};
}
