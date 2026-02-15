/**
 * List Component Key Handling
 *
 * @module components/list/keyHandling
 */

import type { Entity, World } from '../../core/types';
import { isList, isListDisabled } from './core';
import { isListMultiSelect } from './multiSelect';
import { isListKeysEnabled } from './options';
import { isListSearching } from './search';
import type { ListAction } from './types';

/**
 * Handles key press for list widget.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param key - The key name
 * @returns Action to perform or null
 *
 * @example
 * ```typescript
 * const action = handleListKeyPress(world, eid, 'down');
 * if (action?.type === 'selectNext') {
 *   selectNext(world, eid);
 * }
 * ```
 */
export function handleListKeyPress(world: World, eid: Entity, key: string): ListAction | null {
	if (!isList(world, eid)) {
		return null;
	}

	if (isListDisabled(world, eid)) {
		return null;
	}

	if (!isListKeysEnabled(eid)) {
		return null;
	}

	// Handle search mode
	if (isListSearching(world, eid)) {
		return handleSearchModeKeyPress(key);
	}

	// Normal mode
	switch (key) {
		case 'up':
		case 'k':
			return { type: 'selectPrev' };

		case 'down':
		case 'j':
			return { type: 'selectNext' };

		case 'home':
		case 'g':
			return { type: 'selectFirst' };

		case 'end':
		case 'G':
			return { type: 'selectLast' };

		case 'pageup':
			return { type: 'pageUp' };

		case 'pagedown':
			return { type: 'pageDown' };

		case 'enter':
			return { type: 'confirm' };

		case ' ':
		case 'space':
			// In multi-select mode, space toggles selection instead of activating
			if (isListMultiSelect(world, eid)) {
				return { type: 'toggleSelect' };
			}
			return { type: 'confirm' };

		case 'escape':
			return { type: 'cancel' };

		case '/':
			return { type: 'startSearch' };

		default:
			return null;
	}
}

/**
 * Handles key press in search mode.
 *
 * @param key - The key name
 * @returns Action to perform or null
 */
function handleSearchModeKeyPress(key: string): ListAction | null {
	switch (key) {
		case 'escape':
			return { type: 'endSearch' };

		case 'enter':
			return { type: 'endSearch' };

		case 'backspace':
			return { type: 'searchBackspace' };

		case 'up':
		case 'down':
			// Allow navigation to exit search
			return { type: 'endSearch' };

		case 'tab':
		case 'C-n': // Ctrl+N
			return { type: 'searchNextMatch' };

		default:
			// Single printable character
			if (key.length === 1 && key >= ' ') {
				return { type: 'searchChar', char: key };
			}
			return null;
	}
}
