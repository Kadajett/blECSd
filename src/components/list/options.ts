/**
 * List Component Options Management
 *
 * @module components/list/options
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import { listStore } from './stores';

/**
 * Checks if list is interactive.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if interactive
 */
export function isListInteractive(_world: World, eid: Entity): boolean {
	return listStore.interactive[eid] === 1;
}

/**
 * Sets list interactive mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param interactive - Whether list is interactive
 */
export function setListInteractive(world: World, eid: Entity, interactive: boolean): void {
	listStore.interactive[eid] = interactive ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Checks if list responds to mouse.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if mouse enabled
 */
export function isListMouseEnabled(_world: World, eid: Entity): boolean {
	return listStore.mouse[eid] === 1;
}

/**
 * Sets list mouse mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param mouse - Whether mouse is enabled
 */
export function setListMouse(world: World, eid: Entity, mouse: boolean): void {
	listStore.mouse[eid] = mouse ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Checks if list responds to keyboard.
 *
 * @param _world - The ECS world (unused)
 * @param eid - The entity ID
 * @returns true if keys enabled
 */
export function isListKeysEnabled(_world: World, eid: Entity): boolean {
	return listStore.keys[eid] === 1;
}

/**
 * Sets list keys mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param keys - Whether keys are enabled
 */
export function setListKeys(world: World, eid: Entity, keys: boolean): void {
	listStore.keys[eid] = keys ? 1 : 0;
	markDirty(world, eid);
}
