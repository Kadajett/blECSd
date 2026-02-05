/**
 * Label component for element labels.
 *
 * Labels are text annotations attached to entities, typically displayed
 * at a specific position relative to the element (top-left, top-center, etc.).
 *
 * @module components/label
 */

import { addComponent, hasComponent, removeComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Label position enumeration.
 *
 * Defines where the label is positioned relative to the element.
 */
export enum LabelPosition {
	/** Label at top-left corner */
	TopLeft = 0,
	/** Label centered at top */
	TopCenter = 1,
	/** Label at top-right corner */
	TopRight = 2,
	/** Label at bottom-left corner */
	BottomLeft = 3,
	/** Label centered at bottom */
	BottomCenter = 4,
	/** Label at bottom-right corner */
	BottomRight = 5,
	/** Label at left side, vertically centered */
	Left = 6,
	/** Label at right side, vertically centered */
	Right = 7,
}

/**
 * Label store for managing label text strings.
 * Since bitecs uses typed arrays, strings must be stored separately.
 */
class LabelStore {
	private labels: Map<number, string> = new Map();
	private nextId = 1;

	/**
	 * Sets label text and returns the label ID.
	 */
	set(text: string): number {
		const id = this.nextId++;
		this.labels.set(id, text);
		return id;
	}

	/**
	 * Updates existing label text by ID.
	 */
	update(id: number, text: string): void {
		if (id > 0) {
			this.labels.set(id, text);
		}
	}

	/**
	 * Gets label text by ID.
	 */
	get(id: number): string {
		return this.labels.get(id) ?? '';
	}

	/**
	 * Deletes label by ID.
	 */
	delete(id: number): void {
		this.labels.delete(id);
	}

	/**
	 * Clears all labels.
	 */
	clear(): void {
		this.labels.clear();
		this.nextId = 1;
	}
}

/**
 * Global label store instance.
 */
export const labelStore = new LabelStore();

/**
 * Resets the label store. Primarily used for testing.
 *
 * @example
 * ```typescript
 * import { resetLabelStore } from 'blecsd';
 *
 * beforeEach(() => {
 *   resetLabelStore();
 * });
 * ```
 */
export function resetLabelStore(): void {
	labelStore.clear();
}

/**
 * Label component definition using bitecs SoA pattern.
 *
 * Stores label metadata with text stored in the label store.
 *
 * @example
 * ```typescript
 * import { Label, LabelPosition } from 'blecsd';
 *
 * // Access label data
 * const position = Label.position[eid];
 * const offsetX = Label.offsetX[eid];
 * const offsetY = Label.offsetY[eid];
 * ```
 */
export const Label = {
	/** Reference to label text in the label store (0 = no label) */
	labelId: new Uint32Array(DEFAULT_CAPACITY),
	/** Label position relative to element (LabelPosition enum) */
	position: new Uint8Array(DEFAULT_CAPACITY),
	/** Horizontal offset from calculated position */
	offsetX: new Int8Array(DEFAULT_CAPACITY),
	/** Vertical offset from calculated position */
	offsetY: new Int8Array(DEFAULT_CAPACITY),
};

/**
 * Options for setting a label.
 */
export interface LabelOptions {
	/** Label position relative to element */
	position?: LabelPosition;
	/** Horizontal offset from calculated position */
	offsetX?: number;
	/** Vertical offset from calculated position */
	offsetY?: number;
}

/**
 * Data returned by getLabel.
 */
export interface LabelData {
	/** Label text content */
	text: string;
	/** Label position */
	position: LabelPosition;
	/** Horizontal offset */
	offsetX: number;
	/** Vertical offset */
	offsetY: number;
}

/**
 * Checks if an entity has a Label component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns True if the entity has a Label component
 *
 * @example
 * ```typescript
 * import { createWorld, hasLabel } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = 1;
 *
 * if (hasLabel(world, eid)) {
 *   // Entity has a label
 * }
 * ```
 */
export function hasLabel(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Label);
}

/**
 * Sets or updates a label on an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param text - The label text
 * @param options - Optional label configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, setLabel, LabelPosition } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = 1;
 *
 * // Set a simple label
 * setLabel(world, eid, 'Username');
 *
 * // Set a label with position and offset
 * setLabel(world, eid, 'Email', {
 *   position: LabelPosition.TopLeft,
 *   offsetX: 1,
 *   offsetY: -1,
 * });
 * ```
 */
export function setLabel(
	world: World,
	eid: Entity,
	text: string,
	options: LabelOptions = {},
): Entity {
	if (!hasComponent(world, eid, Label)) {
		addComponent(world, eid, Label);
		Label.labelId[eid] = 0;
		Label.position[eid] = LabelPosition.TopLeft;
		Label.offsetX[eid] = 0;
		Label.offsetY[eid] = 0;
	}

	// Update or create label text
	const existingId = Label.labelId[eid] ?? 0;
	if (existingId > 0) {
		labelStore.update(existingId, text);
	} else {
		Label.labelId[eid] = labelStore.set(text);
	}

	// Apply options
	if (options.position !== undefined) {
		Label.position[eid] = options.position;
	}
	if (options.offsetX !== undefined) {
		Label.offsetX[eid] = options.offsetX;
	}
	if (options.offsetY !== undefined) {
		Label.offsetY[eid] = options.offsetY;
	}

	return eid;
}

/**
 * Gets the label text for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The label text or empty string if no label
 *
 * @example
 * ```typescript
 * import { createWorld, setLabel, getLabelText } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = 1;
 *
 * setLabel(world, eid, 'Username');
 * const text = getLabelText(world, eid);
 * // text = 'Username'
 * ```
 */
export function getLabelText(world: World, eid: Entity): string {
	if (!hasComponent(world, eid, Label)) {
		return '';
	}
	const labelId = Label.labelId[eid] ?? 0;
	return labelStore.get(labelId);
}

/**
 * Gets full label data for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Label data object or null if no label
 *
 * @example
 * ```typescript
 * import { createWorld, setLabel, getLabel, LabelPosition } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = 1;
 *
 * setLabel(world, eid, 'Password', {
 *   position: LabelPosition.TopCenter,
 *   offsetY: -1,
 * });
 *
 * const label = getLabel(world, eid);
 * // label = { text: 'Password', position: 1, offsetX: 0, offsetY: -1 }
 * ```
 */
export function getLabel(world: World, eid: Entity): LabelData | null {
	if (!hasComponent(world, eid, Label)) {
		return null;
	}

	return {
		text: labelStore.get(Label.labelId[eid] ?? 0),
		position: (Label.position[eid] ?? LabelPosition.TopLeft) as LabelPosition,
		offsetX: Label.offsetX[eid] ?? 0,
		offsetY: Label.offsetY[eid] ?? 0,
	};
}

/**
 * Gets the label position for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The label position or TopLeft if no label
 *
 * @example
 * ```typescript
 * import { createWorld, setLabel, getLabelPosition, LabelPosition } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = 1;
 *
 * setLabel(world, eid, 'Field', { position: LabelPosition.TopRight });
 * const position = getLabelPosition(world, eid);
 * // position = LabelPosition.TopRight
 * ```
 */
export function getLabelPosition(world: World, eid: Entity): LabelPosition {
	if (!hasComponent(world, eid, Label)) {
		return LabelPosition.TopLeft;
	}
	return Label.position[eid] as LabelPosition;
}

/**
 * Sets the label position for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param position - The label position
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, setLabel, setLabelPosition, LabelPosition } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = 1;
 *
 * setLabel(world, eid, 'Name');
 * setLabelPosition(world, eid, LabelPosition.BottomCenter);
 * ```
 */
export function setLabelPosition(world: World, eid: Entity, position: LabelPosition): Entity {
	if (!hasComponent(world, eid, Label)) {
		return eid;
	}
	Label.position[eid] = position;
	return eid;
}

/**
 * Sets the label offset for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param offsetX - Horizontal offset
 * @param offsetY - Vertical offset
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, setLabel, setLabelOffset } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = 1;
 *
 * setLabel(world, eid, 'Title');
 * setLabelOffset(world, eid, 2, -1);
 * ```
 */
export function setLabelOffset(
	world: World,
	eid: Entity,
	offsetX: number,
	offsetY: number,
): Entity {
	if (!hasComponent(world, eid, Label)) {
		return eid;
	}
	Label.offsetX[eid] = offsetX;
	Label.offsetY[eid] = offsetY;
	return eid;
}

/**
 * Removes the label from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, setLabel, removeLabel, hasLabel } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = 1;
 *
 * setLabel(world, eid, 'Temporary');
 * removeLabel(world, eid);
 *
 * hasLabel(world, eid); // false
 * ```
 */
export function removeLabel(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Label)) {
		return eid;
	}

	// Clean up label text from store
	const labelId = Label.labelId[eid] ?? 0;
	if (labelId > 0) {
		labelStore.delete(labelId);
	}

	removeComponent(world, eid, Label);
	return eid;
}

/**
 * Checks if an entity has a non-empty label.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns True if the entity has a label with text
 *
 * @example
 * ```typescript
 * import { createWorld, setLabel, hasLabelText } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = 1;
 *
 * setLabel(world, eid, 'Hello');
 * hasLabelText(world, eid); // true
 *
 * setLabel(world, eid, '');
 * hasLabelText(world, eid); // false
 * ```
 */
export function hasLabelText(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Label)) {
		return false;
	}
	const labelId = Label.labelId[eid] ?? 0;
	return labelId > 0 && labelStore.get(labelId).length > 0;
}
