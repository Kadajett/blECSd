/**
 * State management for Terminal Widget.
 *
 * @module widgets/terminal/state
 */

import type { Entity } from '../../core/types';
import type { PtyState } from './types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Terminal widget marker component.
 */
export const Terminal = {
	/** Tag indicating this is a terminal widget (1 = yes) */
	isTerminal: new Uint8Array(DEFAULT_CAPACITY),
	/** Mouse input enabled (1 = yes) */
	mouseEnabled: new Uint8Array(DEFAULT_CAPACITY),
	/** Keyboard input enabled (1 = yes) */
	keysEnabled: new Uint8Array(DEFAULT_CAPACITY),
};

/** Map of entity ID to PTY state */
export const ptyStateMap = new Map<Entity, PtyState>();

/**
 * Resets the Terminal component store. Useful for testing.
 * @internal
 */
export function resetTerminalStore(): void {
	Terminal.isTerminal.fill(0);
	Terminal.mouseEnabled.fill(0);
	Terminal.keysEnabled.fill(0);
	ptyStateMap.clear();
}
