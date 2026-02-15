/**
 * Button Widget
 *
 * A clickable button widget with support for hover, pressed, focused, and
 * disabled states. Supports keyboard and mouse interaction.
 *
 * @module widgets/button
 */

import { z } from 'zod';
import {
	attachButtonBehavior,
	clearButtonCallbacks,
	disableButton,
	enableButton,
	handleButtonKeyPress,
	isButton as isButtonComponent,
	isButtonDisabled,
	isButtonHovered,
	isButtonPressed,
	onButtonPress,
	pressButton,
	sendButtonEvent,
} from '../components/button';
import { setContent, TextAlign, TextVAlign } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { blur, focus, isFocused, setFocusable } from '../components/focusable';
import { moveBy, Position, setPosition } from '../components/position';
import { markDirty } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { setInteractive } from '../systems/interactiveSystem';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating a Button widget.
 *
 * @example
 * ```typescript
 * const button = createButton(world, eid, {
 *   x: 10,
 *   y: 5,
 *   width: 20,
 *   height: 3,
 *   label: 'Click Me',
 *   focusable: true,
 *   disabled: false
 * });
 *
 * button.onClick(() => {
 *   console.log('Button clicked!');
 * });
 * ```
 */
export interface ButtonConfig {
	// Position
	/**
	 * X (horizontal) position in cells
	 * @default 0
	 */
	readonly x?: number;
	/**
	 * Y (vertical) position in cells
	 * @default 0
	 */
	readonly y?: number;
	/**
	 * Width in cells (auto-calculated from label if not specified)
	 * @default label.length + 4 (2 cells padding on each side)
	 */
	readonly width?: number;
	/**
	 * Height in cells (includes border)
	 * @default 3
	 */
	readonly height?: number;

	// Content
	/**
	 * Button label text displayed in the center
	 * @default 'Button'
	 */
	readonly label?: string;

	// Behavior
	/**
	 * Whether button can receive keyboard focus
	 * @default true
	 */
	readonly focusable?: boolean;
	/**
	 * Initial disabled state (disabled buttons don't respond to clicks)
	 * @default false
	 */
	readonly disabled?: boolean;
}

/**
 * Button widget interface providing chainable methods.
 */
export interface ButtonWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Actions
	/** Programmatically clicks the button */
	click(): ButtonWidget;

	// State
	/** Checks if button is currently hovered */
	isHovered(): boolean;
	/** Checks if button is currently pressed */
	isPressed(): boolean;
	/** Checks if button is currently focused */
	isFocused(): boolean;
	/** Checks if button is disabled */
	isDisabled(): boolean;

	// Disabled state
	/** Sets disabled state */
	setDisabled(disabled: boolean): ButtonWidget;

	// Label
	/** Sets the label text */
	setLabel(label: string): ButtonWidget;
	/** Gets the label text */
	getLabel(): string;

	// Position
	/** Sets the absolute position */
	setPosition(x: number, y: number): ButtonWidget;
	/** Moves by dx, dy */
	move(dx: number, dy: number): ButtonWidget;
	/** Gets current position */
	getPosition(): { x: number; y: number };

	// Focus
	/** Focuses the button */
	focus(): ButtonWidget;
	/** Blurs the button */
	blur(): ButtonWidget;
	/** Handles keyboard input */
	handleKey(key: string): boolean;

	// Events
	/** Registers a callback for button clicks */
	onClick(callback: () => void): ButtonWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for button widget configuration.
 */
export const ButtonConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().default(3),
	label: z.string().default('Button'),
	focusable: z.boolean().default(true),
	disabled: z.boolean().default(false),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Default button padding */
const DEFAULT_BUTTON_PADDING = 2;

/**
 * Button widget component marker.
 */
export const ButtonWidgetComponent = {
	/** Tag indicating this is a button widget (1 = yes) */
	isButtonWidget: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Button widget state stored outside ECS for complex data.
 */
interface ButtonWidgetState {
	/** Label text */
	label: string;
}

/** Map of entity to button widget state */
const buttonWidgetStateMap = new Map<Entity, ButtonWidgetState>();

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Button widget with the given configuration.
 *
 * The Button widget provides a clickable button with hover, pressed, focused,
 * and disabled states. Supports keyboard and mouse interaction.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Button widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createButton } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create a submit button
 * const button = createButton(world, {
 *   label: 'Submit',
 *   x: 10,
 *   y: 5,
 * });
 *
 * // Listen for clicks
 * button.onClick(() => {
 *   console.log('Button clicked!');
 * });
 *
 * // Programmatically click
 * button.click();
 * ```
 */
export function createButton(world: World, config: ButtonConfig = {}): ButtonWidget {
	const validated = ButtonConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as button widget
	ButtonWidgetComponent.isButtonWidget[eid] = 1;

	// Attach button behavior (state machine)
	attachButtonBehavior(world, eid);

	// Calculate width based on label with padding
	const labelWidth = validated.label.length;
	const totalWidth = validated.width ?? labelWidth + DEFAULT_BUTTON_PADDING * 2;

	setDimensions(world, eid, totalWidth, validated.height);
	setPosition(world, eid, validated.x, validated.y);

	// Store label
	buttonWidgetStateMap.set(eid, {
		label: validated.label,
	});

	// Set content with centered alignment
	setContent(world, eid, validated.label, {
		align: TextAlign.Center,
		valign: TextVAlign.Middle,
	});

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
		disableButton(world, eid);
	}

	// Create the widget interface
	const widget: ButtonWidget = {
		eid,

		// Actions
		click(): ButtonWidget {
			pressButton(world, eid);
			markDirty(world, eid);
			return widget;
		},

		// State
		isHovered(): boolean {
			return isButtonHovered(world, eid);
		},

		isPressed(): boolean {
			return isButtonPressed(world, eid);
		},

		isFocused(): boolean {
			return isFocused(world, eid);
		},

		isDisabled(): boolean {
			return isButtonDisabled(world, eid);
		},

		// Disabled state
		setDisabled(disabled: boolean): ButtonWidget {
			if (disabled) {
				disableButton(world, eid);
			} else {
				enableButton(world, eid);
			}
			markDirty(world, eid);
			return widget;
		},

		// Label
		setLabel(label: string): ButtonWidget {
			const state = buttonWidgetStateMap.get(eid);
			if (state) {
				state.label = label;
			}

			// Recalculate width if not explicitly set
			if (!validated.width) {
				const newWidth = label.length + DEFAULT_BUTTON_PADDING * 2;
				setDimensions(world, eid, newWidth, validated.height);
			}

			setContent(world, eid, label, {
				align: TextAlign.Center,
				valign: TextVAlign.Middle,
			});
			markDirty(world, eid);
			return widget;
		},

		getLabel(): string {
			const state = buttonWidgetStateMap.get(eid);
			return state?.label ?? '';
		},

		// Position
		setPosition(x: number, y: number): ButtonWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number): ButtonWidget {
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
		focus(): ButtonWidget {
			focus(world, eid);
			sendButtonEvent(world, eid, 'focus');
			markDirty(world, eid);
			return widget;
		},

		blur(): ButtonWidget {
			blur(world, eid);
			sendButtonEvent(world, eid, 'blur');
			markDirty(world, eid);
			return widget;
		},

		handleKey(key: string): boolean {
			if (!isFocused(world, eid)) {
				return false;
			}

			const handled = handleButtonKeyPress(world, eid, key);
			if (handled) {
				markDirty(world, eid);
			}
			return handled;
		},

		// Events
		onClick(callback: () => void): ButtonWidget {
			onButtonPress(world, eid, callback);
			return widget;
		},

		// Lifecycle
		destroy(): void {
			ButtonWidgetComponent.isButtonWidget[eid] = 0;
			buttonWidgetStateMap.delete(eid);
			clearButtonCallbacks(world, eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a button widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a button widget
 *
 * @example
 * ```typescript
 * import { isButtonWidget } from 'blecsd/widgets';
 *
 * if (isButtonWidget(world, entity)) {
 *   // Handle button-specific logic
 * }
 * ```
 */
export function isButtonWidget(_world: World, eid: Entity): boolean {
	return ButtonWidgetComponent.isButtonWidget[eid] === 1 && isButtonComponent(_world, eid);
}

/**
 * Resets the button widget store. Useful for testing.
 * @internal
 */
export function resetButtonWidgetStore(): void {
	ButtonWidgetComponent.isButtonWidget.fill(0);
	buttonWidgetStateMap.clear();
}
