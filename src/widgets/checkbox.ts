/**
 * Checkbox Widget
 *
 * A checkbox widget for boolean input with support for checked, unchecked,
 * and disabled states. Supports keyboard and mouse interaction.
 *
 * @module widgets/checkbox
 */

import { z } from 'zod';
import {
	attachCheckboxBehavior,
	checkCheckbox,
	clearCheckboxCallbacks,
	clearCheckboxDisplay,
	disableCheckbox,
	enableCheckbox,
	getCheckboxChar,
	handleCheckboxKeyPress,
	isCheckboxDisabled,
	isChecked,
	onCheckboxChange,
	setCheckboxDisplay,
	toggleCheckbox,
	uncheckCheckbox,
} from '../components/checkbox';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { setInteractive } from '../systems/interactiveSystem';
import { moveBy, Position, setPosition } from '../components/position';
import { markDirty } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating a Checkbox widget.
 */
export interface CheckboxConfig {
	// Position
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Width (auto-calculated if not specified) */
	readonly width?: number;
	/** Height (default: 1) */
	readonly height?: number;

	// Content
	/** Label text displayed next to checkbox */
	readonly label?: string;
	/** Initial checked state (default: false) */
	readonly checked?: boolean;

	// Display
	/** Character shown when checked (default: '☑') */
	readonly checkedChar?: string;
	/** Character shown when unchecked (default: '☐') */
	readonly uncheckedChar?: string;

	// Behavior
	/** Whether checkbox can receive focus (default: true) */
	readonly focusable?: boolean;
	/** Initial disabled state (default: false) */
	readonly disabled?: boolean;
}

/**
 * Checkbox widget interface providing chainable methods.
 */
export interface CheckboxWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// State
	/** Toggles checkbox between checked and unchecked */
	toggle(): CheckboxWidget;
	/** Sets checked state */
	setChecked(checked: boolean): CheckboxWidget;
	/** Checks if checkbox is checked */
	isChecked(): boolean;
	/** Gets the current display character */
	getChar(): string;

	// Disabled state
	/** Sets disabled state */
	setDisabled(disabled: boolean): CheckboxWidget;
	/** Checks if checkbox is disabled */
	isDisabled(): boolean;

	// Label
	/** Sets the label text */
	setLabel(label: string): CheckboxWidget;
	/** Gets the label text */
	getLabel(): string;

	// Position
	/** Sets the absolute position */
	setPosition(x: number, y: number): CheckboxWidget;
	/** Moves by dx, dy */
	move(dx: number, dy: number): CheckboxWidget;
	/** Gets current position */
	getPosition(): { x: number; y: number };

	// Focus
	/** Focuses the checkbox */
	focus(): CheckboxWidget;
	/** Blurs the checkbox */
	blur(): CheckboxWidget;
	/** Checks if checkbox is focused */
	isFocused(): boolean;
	/** Handles keyboard input */
	handleKey(key: string): boolean;

	// Events
	/** Registers a callback for state changes */
	onChange(callback: (checked: boolean) => void): CheckboxWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for checkbox widget configuration.
 */
export const CheckboxConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().default(1),
	label: z.string().default(''),
	checked: z.boolean().default(false),
	checkedChar: z.string().default('☑'),
	uncheckedChar: z.string().default('☐'),
	focusable: z.boolean().default(true),
	disabled: z.boolean().default(false),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Checkbox widget component marker.
 */
export const CheckboxWidgetComponent = {
	/** Tag indicating this is a checkbox widget (1 = yes) */
	isCheckboxWidget: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Checkbox widget state stored outside ECS for complex data.
 */
interface CheckboxWidgetState {
	/** Label text */
	label: string;
}

/** Map of entity to checkbox widget state */
const checkboxWidgetStateMap = new Map<Entity, CheckboxWidgetState>();

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Checkbox widget with the given configuration.
 *
 * The Checkbox widget provides a boolean input with checked/unchecked states,
 * keyboard and mouse support, and onChange callbacks.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Checkbox widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createCheckbox } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create a simple checkbox
 * const checkbox = createCheckbox(world, {
 *   label: 'Accept terms and conditions',
 *   x: 10,
 *   y: 5,
 * });
 *
 * // Listen for changes
 * checkbox.onChange((checked) => {
 *   console.log('Checkbox is now:', checked ? 'checked' : 'unchecked');
 * });
 *
 * // Toggle programmatically
 * checkbox.toggle();
 * ```
 */
export function createCheckbox(world: World, config: CheckboxConfig = {}): CheckboxWidget {
	const validated = CheckboxConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as checkbox widget
	CheckboxWidgetComponent.isCheckboxWidget[eid] = 1;

	// Attach checkbox behavior (state machine)
	attachCheckboxBehavior(world, eid, validated.checked);

	// Set display characters
	setCheckboxDisplay(eid, {
		checkedChar: validated.checkedChar,
		uncheckedChar: validated.uncheckedChar,
	});

	// Calculate width based on label
	const checkboxWidth = Math.max(validated.checkedChar.length, validated.uncheckedChar.length);
	const labelWidth = validated.label.length;
	const totalWidth = validated.width ?? checkboxWidth + (labelWidth > 0 ? 1 + labelWidth : 0);

	setDimensions(world, eid, totalWidth, validated.height);
	setPosition(world, eid, validated.x, validated.y);

	// Store label
	checkboxWidgetStateMap.set(eid, {
		label: validated.label,
	});

	// Update content with checkbox and label
	updateCheckboxContent(world, eid);

	// Make interactive and focusable
	setInteractive(world, eid, {
		clickable: true,
		hoverable: true,
		keyable: true,
		focusable: validated.focusable,
	});

	setFocusable(world, eid, { focusable: validated.focusable });

	// Handle disabled state
	if (validated.disabled) {
		disableCheckbox(world, eid);
	}

	// Create the widget interface
	const widget: CheckboxWidget = {
		eid,

		// State
		toggle(): CheckboxWidget {
			toggleCheckbox(world, eid);
			updateCheckboxContent(world, eid);
			markDirty(world, eid);
			return widget;
		},

		setChecked(checked: boolean): CheckboxWidget {
			if (checked) {
				checkCheckbox(world, eid);
			} else {
				uncheckCheckbox(world, eid);
			}
			updateCheckboxContent(world, eid);
			markDirty(world, eid);
			return widget;
		},

		isChecked(): boolean {
			return isChecked(world, eid);
		},

		getChar(): string {
			return getCheckboxChar(world, eid);
		},

		// Disabled state
		setDisabled(disabled: boolean): CheckboxWidget {
			if (disabled) {
				disableCheckbox(world, eid);
			} else {
				enableCheckbox(world, eid);
			}
			markDirty(world, eid);
			return widget;
		},

		isDisabled(): boolean {
			return isCheckboxDisabled(world, eid);
		},

		// Label
		setLabel(label: string): CheckboxWidget {
			const state = checkboxWidgetStateMap.get(eid);
			if (state) {
				state.label = label;
			}

			// Recalculate width
			const checkChar = getCheckboxChar(world, eid);
			const newWidth = checkChar.length + (label.length > 0 ? 1 + label.length : 0);
			setDimensions(world, eid, newWidth, validated.height);

			updateCheckboxContent(world, eid);
			markDirty(world, eid);
			return widget;
		},

		getLabel(): string {
			const state = checkboxWidgetStateMap.get(eid);
			return state?.label ?? '';
		},

		// Position
		setPosition(x: number, y: number): CheckboxWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number): CheckboxWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		getPosition(): { x: number; y: number } {
			return {
				x: Position.x[eid] ?? 0,
				y: Position.y[eid] ?? 0,
			};
		},

		// Focus
		focus(): CheckboxWidget {
			focus(world, eid);
			markDirty(world, eid);
			return widget;
		},

		blur(): CheckboxWidget {
			blur(world, eid);
			markDirty(world, eid);
			return widget;
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		handleKey(key: string): boolean {
			if (!isFocused(world, eid)) {
				return false;
			}

			const handled = handleCheckboxKeyPress(world, eid, key);
			if (handled) {
				updateCheckboxContent(world, eid);
				markDirty(world, eid);
			}
			return handled;
		},

		// Events
		onChange(callback: (checked: boolean) => void): CheckboxWidget {
			onCheckboxChange(eid, callback);
			return widget;
		},

		// Lifecycle
		destroy(): void {
			CheckboxWidgetComponent.isCheckboxWidget[eid] = 0;
			checkboxWidgetStateMap.delete(eid);
			clearCheckboxCallbacks(eid);
			clearCheckboxDisplay(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Updates the checkbox content with current state character and label.
 * @internal
 */
function updateCheckboxContent(world: World, eid: Entity): void {
	const char = getCheckboxChar(world, eid);
	const state = checkboxWidgetStateMap.get(eid);
	const label = state?.label ?? '';

	const content = label.length > 0 ? `${char} ${label}` : char;
	setContent(world, eid, content);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a checkbox widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a checkbox widget
 *
 * @example
 * ```typescript
 * import { isCheckboxWidget } from 'blecsd/widgets';
 *
 * if (isCheckboxWidget(world, entity)) {
 *   // Handle checkbox-specific logic
 * }
 * ```
 */
export function isCheckboxWidget(_world: World, eid: Entity): boolean {
	return CheckboxWidgetComponent.isCheckboxWidget[eid] === 1;
}

/**
 * Resets the checkbox widget store. Useful for testing.
 * @internal
 */
export function resetCheckboxWidgetStore(): void {
	CheckboxWidgetComponent.isCheckboxWidget.fill(0);
	checkboxWidgetStateMap.clear();
}
