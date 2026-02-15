/**
 * Public utility functions for Terminal Widget.
 *
 * @module widgets/terminal/utilities
 */

import type { Entity, World } from '../../core/types';
import { resetTerminalStore as resetStore, Terminal } from './state';

/**
 * Checks if an entity is a Terminal widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a terminal widget
 */
export function isTerminal(_world: World, eid: Entity): boolean {
	return Terminal.isTerminal[eid] === 1;
}

/**
 * Checks if mouse input is enabled for a terminal.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if mouse input is enabled
 */
export function isTerminalMouseEnabled(_world: World, eid: Entity): boolean {
	return Terminal.mouseEnabled[eid] === 1;
}

/**
 * Checks if keyboard input is enabled for a terminal.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if keyboard input is enabled
 */
export function isTerminalKeysEnabled(_world: World, eid: Entity): boolean {
	return Terminal.keysEnabled[eid] === 1;
}

/**
 * Resets the Terminal component store. Useful for testing.
 * @internal
 */
export function resetTerminalStore(): void {
	resetStore();
}
