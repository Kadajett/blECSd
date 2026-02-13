/**
 * Accessibility component for ARIA-like roles and labels.
 * Provides foundational accessibility features for terminal UIs.
 * @module components/accessibility
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * ARIA-like roles for terminal UI elements.
 * Provides semantic meaning to UI components for screen readers and assistive tech.
 */
export type AccessibleRole =
	| 'button'
	| 'checkbox'
	| 'list'
	| 'listitem'
	| 'textbox'
	| 'dialog'
	| 'menu'
	| 'menuitem'
	| 'tree'
	| 'treeitem';

/**
 * Accessibility component store using SoA (Structure of Arrays).
 *
 * - `role`: Numeric representation of AccessibleRole
 * - `labelId`: Index into label storage map
 *
 * @example
 * ```typescript
 * import { setAccessibleRole, setAccessibleLabel } from 'blecsd';
 *
 * const world = createWorld();
 * const button = addEntity(world);
 *
 * setAccessibleRole(world, button, 'button');
 * setAccessibleLabel(world, button, 'Submit form');
 * ```
 */
export const Accessible = {
	/** Role as numeric ID */
	role: new Uint8Array(DEFAULT_CAPACITY),
	/** Label ID (index into labelStorage) */
	labelId: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Role name to numeric ID mapping.
 */
const ROLE_MAP: Record<AccessibleRole, number> = {
	button: 1,
	checkbox: 2,
	list: 3,
	listitem: 4,
	textbox: 5,
	dialog: 6,
	menu: 7,
	menuitem: 8,
	tree: 9,
	treeitem: 10,
};

/**
 * Numeric ID to role name mapping.
 */
const ROLE_NAMES: Record<number, AccessibleRole> = {
	1: 'button',
	2: 'checkbox',
	3: 'list',
	4: 'listitem',
	5: 'textbox',
	6: 'dialog',
	7: 'menu',
	8: 'menuitem',
	9: 'tree',
	10: 'treeitem',
};

/**
 * Storage for accessibility labels.
 * Maps label IDs to label strings.
 */
const labelStorage = new Map<number, string>();
let nextLabelId = 1;

/**
 * Sets the accessible role for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param role - The accessible role
 *
 * @example
 * ```typescript
 * import { setAccessibleRole } from 'blecsd';
 *
 * setAccessibleRole(world, buttonEntity, 'button');
 * setAccessibleRole(world, listEntity, 'list');
 * ```
 */
export function setAccessibleRole(world: World, eid: Entity, role: AccessibleRole): void {
	if (!hasComponent(world, eid, Accessible)) {
		addComponent(world, eid, Accessible);
		Accessible.labelId[eid] = 0;
	}
	Accessible.role[eid] = ROLE_MAP[role];
}

/**
 * Gets the accessible role for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The accessible role or undefined if not set
 *
 * @example
 * ```typescript
 * import { getAccessibleRole } from 'blecsd';
 *
 * const role = getAccessibleRole(world, entity);
 * if (role === 'button') {
 *   console.log('This is a button');
 * }
 * ```
 */
export function getAccessibleRole(world: World, eid: Entity): AccessibleRole | undefined {
	if (!hasComponent(world, eid, Accessible)) {
		return undefined;
	}

	const roleId = Accessible.role[eid];
	if (roleId === undefined || roleId === 0) {
		return undefined;
	}

	return ROLE_NAMES[roleId];
}

/**
 * Sets the accessible label for an entity.
 * The label provides a human-readable description of the element.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param label - The label text
 *
 * @example
 * ```typescript
 * import { setAccessibleLabel } from 'blecsd';
 *
 * setAccessibleLabel(world, buttonEntity, 'Submit form');
 * setAccessibleLabel(world, inputEntity, 'Enter your name');
 * ```
 */
export function setAccessibleLabel(world: World, eid: Entity, label: string): void {
	if (!hasComponent(world, eid, Accessible)) {
		addComponent(world, eid, Accessible);
		Accessible.role[eid] = 0;
	}

	const existingLabelId = Accessible.labelId[eid];
	if (existingLabelId && existingLabelId > 0) {
		// Update existing label
		labelStorage.set(existingLabelId, label);
	} else {
		// Create new label
		const labelId = nextLabelId++;
		labelStorage.set(labelId, label);
		Accessible.labelId[eid] = labelId;
	}
}

/**
 * Gets the accessible label for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The label text or undefined if not set
 *
 * @example
 * ```typescript
 * import { getAccessibleLabel } from 'blecsd';
 *
 * const label = getAccessibleLabel(world, entity);
 * console.log(`Element label: ${label}`);
 * ```
 */
export function getAccessibleLabel(world: World, eid: Entity): string | undefined {
	if (!hasComponent(world, eid, Accessible)) {
		return undefined;
	}

	const labelId = Accessible.labelId[eid];
	if (labelId === undefined || labelId === 0) {
		return undefined;
	}

	return labelStorage.get(labelId);
}

/**
 * Announces a message to screen readers.
 * Uses terminal title or OSC sequences for notifications.
 *
 * @param message - The message to announce
 *
 * @example
 * ```typescript
 * import { announce } from 'blecsd';
 *
 * // Announce status changes
 * announce('Form submitted successfully');
 * announce('3 items selected');
 * ```
 */
export function announce(message: string): void {
	// Use OSC 2 (Set Window Title) for announcements
	// Screen readers can monitor title changes
	if (typeof process !== 'undefined' && process.stdout) {
		process.stdout.write(`\x1b]2;${message}\x07`);
	}
}

/**
 * Clears all accessibility label storage.
 * Useful for testing or resetting state.
 */
export function clearAccessibilityLabels(): void {
	labelStorage.clear();
	nextLabelId = 1;
}
