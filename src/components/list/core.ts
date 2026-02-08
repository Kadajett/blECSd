/**
 * List Component Core Functions
 *
 * @module components/list/core
 */

import { z } from 'zod';
import type { Entity, World } from '../../core/types';
import { ListBehaviorOptionsSchema, ListItemSchema } from '../../schemas/components';
import { markDirty } from '../renderable';
import { attachStateMachine, getState, hasStateMachine, sendEvent } from '../stateMachine';
import { LIST_STATE_MACHINE_CONFIG } from './stateMachine';
import { itemsStore, listStore } from './stores';
import type { ListEvent, ListItem, ListState } from './types';

/**
 * Attaches list behavior to an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param items - Initial items
 * @param options - List options
 *
 * @example
 * ```typescript
 * import { attachListBehavior } from 'blecsd';
 *
 * attachListBehavior(world, eid, [
 *   { text: 'Option 1', value: 'opt1' },
 *   { text: 'Option 2', value: 'opt2' },
 * ], { interactive: true, keys: true });
 * ```
 */
export function attachListBehavior(
	world: World,
	eid: Entity,
	items: ListItem[] = [],
	options: {
		interactive?: boolean;
		mouse?: boolean;
		keys?: boolean;
		search?: boolean;
		selectedIndex?: number;
		visibleCount?: number;
	} = {},
): void {
	z.array(ListItemSchema).parse(items);
	ListBehaviorOptionsSchema.parse(options);
	listStore.isList[eid] = 1;
	listStore.selectedIndex[eid] = options.selectedIndex ?? -1;
	listStore.itemCount[eid] = items.length;
	listStore.firstVisible[eid] = 0;
	listStore.visibleCount[eid] = options.visibleCount ?? items.length;
	listStore.interactive[eid] = options.interactive !== false ? 1 : 0;
	listStore.mouse[eid] = options.mouse !== false ? 1 : 0;
	listStore.keys[eid] = options.keys !== false ? 1 : 0;
	listStore.searchEnabled[eid] = options.search === true ? 1 : 0;

	itemsStore.set(eid, [...items]);
	attachStateMachine(world, eid, LIST_STATE_MACHINE_CONFIG);
}

/**
 * Checks if an entity is a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity is a list
 */
export function isList(world: World, eid: Entity): boolean {
	return listStore.isList[eid] === 1 && hasStateMachine(world, eid);
}

/**
 * Gets the current state of a list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The current state
 */
export function getListState(world: World, eid: Entity): ListState {
	return (getState(world, eid) as ListState) ?? 'idle';
}

/**
 * Checks if list is in a specific state.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param state - The state to check
 * @returns true if list is in the specified state
 */
export function isListInState(world: World, eid: Entity, state: ListState): boolean {
	return getListState(world, eid) === state;
}

/**
 * Checks if list is focused.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if list is focused
 */
export function isListFocused(world: World, eid: Entity): boolean {
	const state = getListState(world, eid);
	return state === 'focused' || state === 'selecting';
}

/**
 * Checks if list is disabled.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if list is disabled
 */
export function isListDisabled(world: World, eid: Entity): boolean {
	return isListInState(world, eid, 'disabled');
}

/**
 * Sends an event to the list state machine.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param event - The event to send
 * @returns true if transition occurred
 */
export function sendListEvent(world: World, eid: Entity, event: ListEvent): boolean {
	if (!isList(world, eid)) {
		return false;
	}

	const result = sendEvent(world, eid, event);
	if (result) {
		markDirty(world, eid);
	}
	return result;
}

/**
 * Focuses the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if focused successfully
 */
export function focusList(world: World, eid: Entity): boolean {
	return sendListEvent(world, eid, 'focus');
}

/**
 * Blurs the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if blurred successfully
 */
export function blurList(world: World, eid: Entity): boolean {
	return sendListEvent(world, eid, 'blur');
}

/**
 * Disables the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if disabled successfully
 */
export function disableList(world: World, eid: Entity): boolean {
	return sendListEvent(world, eid, 'disable');
}

/**
 * Enables the list.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if enabled successfully
 */
export function enableList(world: World, eid: Entity): boolean {
	return sendListEvent(world, eid, 'enable');
}
