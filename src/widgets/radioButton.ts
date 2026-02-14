/**
 * RadioButton and RadioGroup Widgets
 *
 * Radio buttons for exclusive selection within a group. Only one radio button
 * can be selected at a time within a group.
 *
 * @module widgets/radioButton
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { setInteractive } from '../systems/interactiveSystem';
import { moveBy, Position, setPosition } from '../components/position';
import {
	attachRadioButtonBehavior,
	attachRadioSetBehavior,
	clearRadioButtonDisplay,
	clearRadioSetCallbacks,
	deselectRadioButton,
	disableRadioButton,
	enableRadioButton,
	getRadioButtonChar,
	getRadioValue,
	getSelectedValue,
	handleRadioButtonKeyPress,
	isRadioButton,
	isRadioButtonDisabled,
	isRadioSelected,
	isRadioSet,
	onRadioSelect,
	selectRadioButton,
	setRadioButtonDisplay,
	setRadioValue,
} from '../components/radioButton';
import { markDirty } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating a RadioGroup widget.
 */
export interface RadioGroupConfig {
	// Position
	/** X position for the group */
	readonly x?: number;
	/** Y position for the group */
	readonly y?: number;
}

/**
 * Configuration for creating a RadioButton widget.
 */
export interface RadioButtonConfig {
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
	/** Label text displayed next to radio button */
	readonly label?: string;
	/** Value associated with this radio button */
	readonly value?: string;

	// Display
	/** Character shown when selected (default: '◉') */
	readonly selectedChar?: string;
	/** Character shown when unselected (default: '○') */
	readonly unselectedChar?: string;

	// Behavior
	/** Whether radio button can receive focus (default: true) */
	readonly focusable?: boolean;
	/** Initial disabled state (default: false) */
	readonly disabled?: boolean;
	/** Parent radio group entity ID */
	readonly groupId?: Entity;
}

/**
 * RadioGroup widget interface providing chainable methods.
 */
export interface RadioGroupWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Options
	/** Adds a radio button option to the group */
	addOption(value: string, label: string): RadioButtonWidget;

	// Selection
	/** Gets the currently selected value */
	getSelectedValue(): string | null;

	// Events
	/** Registers a callback for selection changes */
	onChange(callback: (value: string | null) => void): RadioGroupWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

/**
 * RadioButton widget interface providing chainable methods.
 */
export interface RadioButtonWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// State
	/** Selects this radio button (deselects others in group) */
	select(): RadioButtonWidget;
	/** Deselects this radio button */
	deselect(): RadioButtonWidget;
	/** Checks if radio button is selected */
	isSelected(): boolean;
	/** Gets the current display character */
	getChar(): string;

	// Value and Label
	/** Gets the value associated with this radio button */
	getValue(): string;
	/** Sets the label text */
	setLabel(label: string): RadioButtonWidget;
	/** Gets the label text */
	getLabel(): string;

	// Disabled state
	/** Sets disabled state */
	setDisabled(disabled: boolean): RadioButtonWidget;
	/** Checks if radio button is disabled */
	isDisabled(): boolean;

	// Position
	/** Sets the absolute position */
	setPosition(x: number, y: number): RadioButtonWidget;
	/** Moves by dx, dy */
	move(dx: number, dy: number): RadioButtonWidget;
	/** Gets current position */
	getPosition(): { x: number; y: number };

	// Focus
	/** Focuses the radio button */
	focus(): RadioButtonWidget;
	/** Blurs the radio button */
	blur(): RadioButtonWidget;
	/** Checks if radio button is focused */
	isFocused(): boolean;
	/** Handles keyboard input */
	handleKey(key: string): boolean;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for radio group widget configuration.
 */
export const RadioGroupConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
});

/**
 * Zod schema for radio button widget configuration.
 */
export const RadioButtonConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().default(1),
	label: z.string().default(''),
	value: z.string().default(''),
	selectedChar: z.string().default('◉'),
	unselectedChar: z.string().default('○'),
	focusable: z.boolean().default(true),
	disabled: z.boolean().default(false),
	groupId: z.number().int().optional(),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * RadioGroup widget component marker.
 */
export const RadioGroupWidgetComponent = {
	/** Tag indicating this is a radio group widget (1 = yes) */
	isRadioGroupWidget: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * RadioButton widget component marker.
 */
export const RadioButtonWidgetComponent = {
	/** Tag indicating this is a radio button widget (1 = yes) */
	isRadioButtonWidget: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * RadioGroup widget state.
 */
interface RadioGroupWidgetState {
	/** Position for next auto-positioned button */
	nextY: number;
	/** Associated world instance */
	world: World;
}

/**
 * RadioButton widget state.
 */
interface RadioButtonWidgetState {
	/** Label text */
	label: string;
}

/** Map of entity to radio group widget state */
const radioGroupWidgetStateMap = new Map<Entity, RadioGroupWidgetState>();

/** Map of entity to radio button widget state */
const radioButtonWidgetStateMap = new Map<Entity, RadioButtonWidgetState>();

// =============================================================================
// RADIO GROUP FACTORY
// =============================================================================

/**
 * Creates a RadioGroup widget with the given configuration.
 *
 * The RadioGroup widget manages a collection of radio buttons with exclusive
 * selection. Only one radio button can be selected at a time.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The RadioGroup widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createRadioGroup } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create a radio group for size selection
 * const group = createRadioGroup(world, { x: 10, y: 5 });
 *
 * // Add options
 * group.addOption('small', 'Small');
 * group.addOption('medium', 'Medium');
 * group.addOption('large', 'Large');
 *
 * // Listen for changes
 * group.onChange((value) => {
 *   console.log('Selected size:', value);
 * });
 * ```
 */
export function createRadioGroup(world: World, config: RadioGroupConfig = {}): RadioGroupWidget {
	const validated = RadioGroupConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as radio group widget
	RadioGroupWidgetComponent.isRadioGroupWidget[eid] = 1;

	// Attach radio set behavior
	attachRadioSetBehavior(world, eid);

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Store state
	radioGroupWidgetStateMap.set(eid, {
		nextY: validated.y,
		world,
	});

	// Create the widget interface
	const widget: RadioGroupWidget = {
		eid,

		addOption(value: string, label: string): RadioButtonWidget {
			const state = radioGroupWidgetStateMap.get(eid);
			if (!state) {
				throw new Error('RadioGroup state not found');
			}

			const button = createRadioButton(world, {
				x: validated.x,
				y: state.nextY,
				label,
				value,
				groupId: eid,
			});

			// Increment y position for next button
			state.nextY += 1;

			return button;
		},

		getSelectedValue(): string | null {
			return getSelectedValue(eid);
		},

		onChange(callback: (value: string | null) => void): RadioGroupWidget {
			onRadioSelect(eid, (value) => {
				callback(value);
			});
			return widget;
		},

		destroy(): void {
			RadioGroupWidgetComponent.isRadioGroupWidget[eid] = 0;
			radioGroupWidgetStateMap.delete(eid);
			clearRadioSetCallbacks(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// RADIO BUTTON FACTORY
// =============================================================================

/**
 * Creates a RadioButton widget with the given configuration.
 *
 * Radio buttons are typically created via RadioGroup.addOption(), but can
 * also be created standalone.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The RadioButton widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createRadioButton } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create a standalone radio button
 * const button = createRadioButton(world, {
 *   label: 'Enable notifications',
 *   value: 'notify-enabled',
 *   x: 10,
 *   y: 5,
 * });
 *
 * button.select();
 * ```
 */
export function createRadioButton(world: World, config: RadioButtonConfig = {}): RadioButtonWidget {
	const validated = RadioButtonConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as radio button widget
	RadioButtonWidgetComponent.isRadioButtonWidget[eid] = 1;

	// Attach radio button behavior (state machine)
	attachRadioButtonBehavior(world, eid, validated.groupId);

	// Set value
	setRadioValue(eid, validated.value);

	// Set display characters
	setRadioButtonDisplay(eid, {
		selectedChar: validated.selectedChar,
		unselectedChar: validated.unselectedChar,
	});

	// Calculate width based on label
	const buttonWidth = Math.max(validated.selectedChar.length, validated.unselectedChar.length);
	const labelWidth = validated.label.length;
	const totalWidth = validated.width ?? buttonWidth + (labelWidth > 0 ? 1 + labelWidth : 0);

	setDimensions(world, eid, totalWidth, validated.height);
	setPosition(world, eid, validated.x, validated.y);

	// Store label
	radioButtonWidgetStateMap.set(eid, {
		label: validated.label,
	});

	// Update content with radio button and label
	updateRadioButtonContent(world, eid);

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
		disableRadioButton(world, eid);
	}

	// Create the widget interface
	const widget: RadioButtonWidget = {
		eid,

		// State
		select(): RadioButtonWidget {
			selectRadioButton(world, eid);
			updateRadioButtonContent(world, eid);
			markDirty(world, eid);
			return widget;
		},

		deselect(): RadioButtonWidget {
			deselectRadioButton(world, eid);
			updateRadioButtonContent(world, eid);
			markDirty(world, eid);
			return widget;
		},

		isSelected(): boolean {
			return isRadioSelected(world, eid);
		},

		getChar(): string {
			return getRadioButtonChar(world, eid);
		},

		// Value and Label
		getValue(): string {
			return getRadioValue(eid) ?? '';
		},

		setLabel(label: string): RadioButtonWidget {
			const state = radioButtonWidgetStateMap.get(eid);
			if (state) {
				state.label = label;
			}

			// Recalculate width
			const char = getRadioButtonChar(world, eid);
			const newWidth = char.length + (label.length > 0 ? 1 + label.length : 0);
			setDimensions(world, eid, newWidth, validated.height);

			updateRadioButtonContent(world, eid);
			markDirty(world, eid);
			return widget;
		},

		getLabel(): string {
			const state = radioButtonWidgetStateMap.get(eid);
			return state?.label ?? '';
		},

		// Disabled state
		setDisabled(disabled: boolean): RadioButtonWidget {
			if (disabled) {
				disableRadioButton(world, eid);
			} else {
				enableRadioButton(world, eid);
			}
			markDirty(world, eid);
			return widget;
		},

		isDisabled(): boolean {
			return isRadioButtonDisabled(world, eid);
		},

		// Position
		setPosition(x: number, y: number): RadioButtonWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number): RadioButtonWidget {
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
		focus(): RadioButtonWidget {
			focus(world, eid);
			markDirty(world, eid);
			return widget;
		},

		blur(): RadioButtonWidget {
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

			const handled = handleRadioButtonKeyPress(world, eid, key);
			if (handled) {
				updateRadioButtonContent(world, eid);
				markDirty(world, eid);
			}
			return handled;
		},

		// Lifecycle
		destroy(): void {
			RadioButtonWidgetComponent.isRadioButtonWidget[eid] = 0;
			radioButtonWidgetStateMap.delete(eid);
			clearRadioButtonDisplay(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Updates the radio button content with current state character and label.
 * @internal
 */
function updateRadioButtonContent(world: World, eid: Entity): void {
	const char = getRadioButtonChar(world, eid);
	const state = radioButtonWidgetStateMap.get(eid);
	const label = state?.label ?? '';

	const content = label.length > 0 ? `${char} ${label}` : char;
	setContent(world, eid, content);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a radio group widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a radio group widget
 *
 * @example
 * ```typescript
 * import { isRadioGroupWidget } from 'blecsd/widgets';
 *
 * if (isRadioGroupWidget(world, entity)) {
 *   // Handle radio group-specific logic
 * }
 * ```
 */
export function isRadioGroupWidget(_world: World, eid: Entity): boolean {
	return RadioGroupWidgetComponent.isRadioGroupWidget[eid] === 1 && isRadioSet(_world, eid);
}

/**
 * Checks if an entity is a radio button widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a radio button widget
 *
 * @example
 * ```typescript
 * import { isRadioButtonWidget } from 'blecsd/widgets';
 *
 * if (isRadioButtonWidget(world, entity)) {
 *   // Handle radio button-specific logic
 * }
 * ```
 */
export function isRadioButtonWidget(_world: World, eid: Entity): boolean {
	return RadioButtonWidgetComponent.isRadioButtonWidget[eid] === 1 && isRadioButton(_world, eid);
}

/**
 * Resets the radio widget store. Useful for testing.
 * @internal
 */
export function resetRadioWidgetStore(): void {
	RadioGroupWidgetComponent.isRadioGroupWidget.fill(0);
	RadioButtonWidgetComponent.isRadioButtonWidget.fill(0);
	radioGroupWidgetStateMap.clear();
	radioButtonWidgetStateMap.clear();
}
