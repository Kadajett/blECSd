/**
 * Switch Widget
 *
 * A toggle switch widget for on/off controls. Can be toggled by clicking or
 * pressing Space/Enter.
 *
 * @module widgets/switch
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setFocusable } from '../components/focusable';
import { setPosition } from '../components/position';
import { markDirty, setStyle, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating a Switch widget.
 */
export interface SwitchConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Initial state (default: false) */
	readonly checked?: boolean;
	/** Label for the on state (default: 'ON') */
	readonly onLabel?: string;
	/** Label for the off state (default: 'OFF') */
	readonly offLabel?: string;
	/** Foreground color when on (hex string or packed number) */
	readonly onFg?: string | number;
	/** Background color when on (hex string or packed number) */
	readonly onBg?: string | number;
	/** Foreground color when off (hex string or packed number) */
	readonly offFg?: string | number;
	/** Background color when off (hex string or packed number) */
	readonly offBg?: string | number;
	/** Whether the switch is focusable (default: true) */
	readonly focusable?: boolean;
	/** Whether the switch is visible initially (default: true) */
	readonly visible?: boolean;
}

/**
 * Switch widget interface providing chainable methods.
 */
export interface SwitchWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// State
	/** Checks if the switch is checked (on) */
	isChecked(): boolean;
	/** Sets the checked state */
	setChecked(checked: boolean): SwitchWidget;
	/** Toggles the checked state */
	toggle(): SwitchWidget;

	// Labels
	/** Sets the on label */
	setOnLabel(label: string): SwitchWidget;
	/** Sets the off label */
	setOffLabel(label: string): SwitchWidget;
	/** Gets the on label */
	getOnLabel(): string;
	/** Gets the off label */
	getOffLabel(): string;

	// Events
	/** Called when the switch is toggled */
	onChange(callback: (checked: boolean) => void): SwitchWidget;

	// Visibility
	/** Shows the switch */
	show(): SwitchWidget;
	/** Hides the switch */
	hide(): SwitchWidget;

	// Position
	/** Sets the absolute position */
	setPosition(x: number, y: number): SwitchWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for switch widget configuration.
 */
export const SwitchConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	checked: z.boolean().default(false),
	onLabel: z.string().default('ON'),
	offLabel: z.string().default('OFF'),
	onFg: z.union([z.string(), z.number()]).optional(),
	onBg: z.union([z.string(), z.number()]).optional(),
	offFg: z.union([z.string(), z.number()]).optional(),
	offBg: z.union([z.string(), z.number()]).optional(),
	focusable: z.boolean().default(true),
	visible: z.boolean().default(true),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Default on foreground color */
const DEFAULT_ON_FG = '#ffffff';

/** Default on background color */
const DEFAULT_ON_BG = '#4caf50';

/** Default off foreground color */
const DEFAULT_OFF_FG = '#000000';

/** Default off background color */
const DEFAULT_OFF_BG = '#757575';

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * Switch component marker for identifying switch widget entities.
 */
export const Switch = {
	/** Tag indicating this is a switch widget (1 = yes) */
	isSwitch: new Uint8Array(DEFAULT_CAPACITY),
	/** Checked state (1 = on, 0 = off) */
	checked: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Switch state stored outside ECS for complex data.
 */
interface SwitchState {
	/** On label text */
	onLabel: string;
	/** Off label text */
	offLabel: string;
	/** On foreground color (packed) */
	onFg: number;
	/** On background color (packed) */
	onBg: number;
	/** Off foreground color (packed) */
	offFg: number;
	/** Off background color (packed) */
	offBg: number;
	/** Change callback */
	onChangeCallback?: (checked: boolean) => void;
}

/** Map of entity to switch state */
const switchStateMap = new Map<Entity, SwitchState>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Updates the switch's visual state based on checked status.
 */
function updateSwitchVisual(world: World, eid: Entity): void {
	const state = switchStateMap.get(eid);
	if (!state) return;

	const checked = Switch.checked[eid] === 1;
	const label = checked ? state.onLabel : state.offLabel;
	const fg = checked ? state.onFg : state.offFg;
	const bg = checked ? state.onBg : state.offBg;

	// Update content
	setContent(world, eid, ` ${label} `);

	// Update style
	setStyle(world, eid, { fg, bg });

	markDirty(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Switch widget with the given configuration.
 *
 * The Switch widget provides a toggle control for on/off states.
 * It can be toggled by clicking or pressing Space/Enter.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Switch widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createSwitch } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * const toggle = createSwitch(world, {
 *   x: 10,
 *   y: 5,
 *   checked: false,
 *   onLabel: 'Enabled',
 *   offLabel: 'Disabled',
 * });
 *
 * // Toggle the switch
 * toggle.toggle();
 *
 * // Listen for changes
 * toggle.onChange((checked) => {
 *   console.log(`Switch is now: ${checked ? 'ON' : 'OFF'}`);
 * });
 * ```
 */
export function createSwitch(world: World, config: SwitchConfig = {}): SwitchWidget {
	const validated = SwitchConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as switch
	Switch.isSwitch[eid] = 1;
	Switch.checked[eid] = validated.checked ? 1 : 0;

	// Parse colors
	const onFg =
		validated.onFg !== undefined ? parseColor(validated.onFg) : parseColor(DEFAULT_ON_FG);
	const onBg =
		validated.onBg !== undefined ? parseColor(validated.onBg) : parseColor(DEFAULT_ON_BG);
	const offFg =
		validated.offFg !== undefined ? parseColor(validated.offFg) : parseColor(DEFAULT_OFF_FG);
	const offBg =
		validated.offBg !== undefined ? parseColor(validated.offBg) : parseColor(DEFAULT_OFF_BG);

	// Store state
	switchStateMap.set(eid, {
		onLabel: validated.onLabel,
		offLabel: validated.offLabel,
		onFg,
		onBg,
		offFg,
		offBg,
	});

	// Set position and dimensions
	setPosition(world, eid, validated.x, validated.y);
	const maxLabelLength = Math.max(validated.onLabel.length, validated.offLabel.length);
	setDimensions(world, eid, maxLabelLength + 2, 1); // +2 for padding

	// Set focusable
	setFocusable(world, eid, { focusable: validated.focusable });

	// Update visual state
	updateSwitchVisual(world, eid);

	// Set visibility
	if (!validated.visible) {
		setVisible(world, eid, false);
	}

	// Create widget interface
	const widget: SwitchWidget = {
		eid,

		// State
		isChecked(): boolean {
			return Switch.checked[eid] === 1;
		},

		setChecked(checked: boolean): SwitchWidget {
			const wasChecked = Switch.checked[eid] === 1;
			Switch.checked[eid] = checked ? 1 : 0;

			updateSwitchVisual(world, eid);

			// Trigger callback if state changed
			if (wasChecked !== checked) {
				const state = switchStateMap.get(eid);
				if (state?.onChangeCallback) {
					state.onChangeCallback(checked);
				}
			}

			return widget;
		},

		toggle(): SwitchWidget {
			const newState = Switch.checked[eid] === 0;
			return widget.setChecked(newState);
		},

		// Labels
		setOnLabel(label: string): SwitchWidget {
			const state = switchStateMap.get(eid);
			if (state) {
				state.onLabel = label;
				updateSwitchVisual(world, eid);
			}
			return widget;
		},

		setOffLabel(label: string): SwitchWidget {
			const state = switchStateMap.get(eid);
			if (state) {
				state.offLabel = label;
				updateSwitchVisual(world, eid);
			}
			return widget;
		},

		getOnLabel(): string {
			return switchStateMap.get(eid)?.onLabel ?? '';
		},

		getOffLabel(): string {
			return switchStateMap.get(eid)?.offLabel ?? '';
		},

		// Events
		onChange(callback: (checked: boolean) => void): SwitchWidget {
			const state = switchStateMap.get(eid);
			if (state) {
				state.onChangeCallback = callback;
			}
			return widget;
		},

		// Visibility
		show(): SwitchWidget {
			setVisible(world, eid, true);
			return widget;
		},

		hide(): SwitchWidget {
			setVisible(world, eid, false);
			return widget;
		},

		// Position
		setPosition(x: number, y: number): SwitchWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		// Lifecycle
		destroy(): void {
			Switch.isSwitch[eid] = 0;
			Switch.checked[eid] = 0;
			switchStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a switch widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a switch widget
 *
 * @example
 * ```typescript
 * import { isSwitch } from 'blecsd/widgets';
 *
 * if (isSwitch(world, entity)) {
 *   // Handle switch-specific logic
 * }
 * ```
 */
export function isSwitch(_world: World, eid: Entity): boolean {
	return Switch.isSwitch[eid] === 1;
}

/**
 * Handles key press on a switch widget.
 * Toggles the switch if Space or Enter is pressed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param key - The key pressed
 * @returns true if the key was handled
 */
export function handleSwitchKey(world: World, eid: Entity, key: string): boolean {
	if (!isSwitch(world, eid)) return false;
	if (key !== ' ' && key !== 'enter') return false;

	const checked = Switch.checked[eid] === 1;
	const newState = !checked;
	Switch.checked[eid] = newState ? 1 : 0;

	updateSwitchVisual(world, eid);

	// Trigger callback
	const state = switchStateMap.get(eid);
	if (state?.onChangeCallback) {
		state.onChangeCallback(newState);
	}

	return true;
}

/**
 * Handles click on a switch widget.
 * Toggles the switch when clicked.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if the click was handled
 */
export function handleSwitchClick(world: World, eid: Entity): boolean {
	if (!isSwitch(world, eid)) return false;

	const checked = Switch.checked[eid] === 1;
	const newState = !checked;
	Switch.checked[eid] = newState ? 1 : 0;

	updateSwitchVisual(world, eid);

	// Trigger callback
	const state = switchStateMap.get(eid);
	if (state?.onChangeCallback) {
		state.onChangeCallback(newState);
	}

	return true;
}

/**
 * Resets the Switch component store. Useful for testing.
 * @internal
 */
export function resetSwitchStore(): void {
	Switch.isSwitch.fill(0);
	Switch.checked.fill(0);
	switchStateMap.clear();
}
