/**
 * ProgressBar Widget
 *
 * A visual progress indicator widget for displaying operation progress.
 * Supports determinate (0-100%) and indeterminate modes, custom fill characters,
 * percentage display, and custom labels.
 *
 * @module widgets/progressBar
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { moveBy, Position, setPosition } from '../components/position';
import { markDirty } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating a ProgressBar widget.
 */
export interface ProgressBarConfig {
	// Position
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Width of the progress bar (default: 20) */
	readonly width?: number;
	/** Height (default: 1) */
	readonly height?: number;

	// Progress
	/** Initial progress value (0-100, default: 0) */
	readonly value?: number;

	// Display
	/** Character used for filled portion (default: '█') */
	readonly fillChar?: string;
	/** Character used for empty portion (default: '░') */
	readonly emptyChar?: string;
	/** Show percentage text (default: false) */
	readonly showPercentage?: boolean;
	/** Custom label text (overrides percentage) */
	readonly label?: string;

	// Behavior
	/** Indeterminate mode (animated, no specific progress) */
	readonly indeterminate?: boolean;
}

/**
 * ProgressBar widget interface providing chainable methods.
 */
export interface ProgressBarWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Progress
	/** Sets the progress value (0-100) */
	setValue(value: number): ProgressBarWidget;
	/** Gets the current progress value */
	getValue(): number;
	/** Increments progress by amount */
	increment(amount: number): ProgressBarWidget;

	// Display
	/** Sets custom label text */
	setLabel(label: string): ProgressBarWidget;
	/** Gets the current label */
	getLabel(): string;
	/** Shows/hides percentage display */
	showPercentage(show: boolean): ProgressBarWidget;
	/** Checks if percentage is shown */
	isPercentageShown(): boolean;
	/** Gets fill character */
	getFillChar(): string;
	/** Gets empty character */
	getEmptyChar(): string;

	// Mode
	/** Sets indeterminate mode */
	setIndeterminate(indeterminate: boolean): ProgressBarWidget;
	/** Checks if in indeterminate mode */
	isIndeterminate(): boolean;

	// Position
	/** Sets the absolute position */
	setPosition(x: number, y: number): ProgressBarWidget;
	/** Moves by dx, dy */
	move(dx: number, dy: number): ProgressBarWidget;
	/** Gets current position and dimensions */
	getPosition(): { x: number; y: number; width: number; height: number };

	// Events
	/** Registers a callback for value changes */
	onChange(callback: (value: number) => void): ProgressBarWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// HELPERS (needed for schema)
// =============================================================================

/**
 * Clamps a value between 0 and 100.
 * @internal
 */
function clampValue(value: number): number {
	return Math.max(0, Math.min(100, value));
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for progress bar widget configuration.
 */
export const ProgressBarConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(20),
	height: z.number().int().positive().default(1),
	value: z
		.number()
		.default(0)
		.transform((val) => clampValue(val)),
	fillChar: z.string().default('█'),
	emptyChar: z.string().default('░'),
	showPercentage: z.boolean().default(false),
	label: z.string().default(''),
	indeterminate: z.boolean().default(false),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * ProgressBar widget component marker.
 */
export const ProgressBarComponent = {
	/** Tag indicating this is a progress bar widget (1 = yes) */
	isProgressBar: new Uint8Array(DEFAULT_CAPACITY),
	/** Show percentage display (1 = yes) */
	showPercentage: new Uint8Array(DEFAULT_CAPACITY),
	/** Indeterminate mode (1 = yes) */
	indeterminate: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * ProgressBar widget state stored outside ECS for complex data.
 */
interface ProgressBarState {
	/** Current progress value (0-100) */
	value: number;
	/** Fill character */
	fillChar: string;
	/** Empty character */
	emptyChar: string;
	/** Custom label */
	label: string;
	/** Width for rendering */
	width: number;
	/** Change callbacks */
	onChangeCallbacks: Array<(value: number) => void>;
}

/** Map of entity to progress bar state */
const progressBarStateMap = new Map<Entity, ProgressBarState>();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Renders the progress bar content.
 * @internal
 */
function renderProgressBar(world: World, eid: Entity): void {
	const state = progressBarStateMap.get(eid);
	if (!state) return;

	const isIndeterminate = ProgressBarComponent.indeterminate[eid] === 1;
	const showPct = ProgressBarComponent.showPercentage[eid] === 1;

	// Calculate filled portion
	const fillWidth = Math.floor((state.value / 100) * state.width);
	const emptyWidth = state.width - fillWidth;

	// Build the bar
	const filled = state.fillChar.repeat(fillWidth);
	const empty = state.emptyChar.repeat(emptyWidth);
	const bar = filled + empty;

	// Build the label/percentage
	let display = bar;
	if (isIndeterminate) {
		display = bar; // Could animate in future
	} else if (state.label) {
		display = `${bar} ${state.label}`;
	} else if (showPct) {
		display = `${bar} ${Math.round(state.value)}%`;
	}

	setContent(world, eid, display);
}

/**
 * Emits change callbacks.
 * @internal
 */
function emitChange(eid: Entity, value: number): void {
	const state = progressBarStateMap.get(eid);
	if (!state) return;

	for (const callback of state.onChangeCallbacks) {
		callback(value);
	}
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a ProgressBar widget with the given configuration.
 *
 * The ProgressBar widget displays visual progress for operations with support
 * for determinate (0-100%) and indeterminate modes, custom styling, and labels.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The ProgressBar widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createProgressBar } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create a simple progress bar
 * const bar = createProgressBar(world, {
 *   x: 10,
 *   y: 5,
 *   width: 30,
 * });
 *
 * // Listen for changes
 * bar.onChange((value) => {
 *   console.log('Progress:', value);
 * });
 *
 * // Update progress
 * bar.setValue(50);
 * bar.increment(10);
 * ```
 */
export function createProgressBar(world: World, config: ProgressBarConfig = {}): ProgressBarWidget {
	const validated = ProgressBarConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as progress bar widget
	ProgressBarComponent.isProgressBar[eid] = 1;
	ProgressBarComponent.showPercentage[eid] = validated.showPercentage ? 1 : 0;
	ProgressBarComponent.indeterminate[eid] = validated.indeterminate ? 1 : 0;

	setDimensions(world, eid, validated.width, validated.height);
	setPosition(world, eid, validated.x, validated.y);

	// Store state
	progressBarStateMap.set(eid, {
		value: validated.value,
		fillChar: validated.fillChar,
		emptyChar: validated.emptyChar,
		label: validated.label,
		width: validated.width,
		onChangeCallbacks: [],
	});

	// Initial render
	renderProgressBar(world, eid);

	// Create the widget interface
	const widget: ProgressBarWidget = {
		eid,

		// Progress
		setValue(value: number): ProgressBarWidget {
			const state = progressBarStateMap.get(eid);
			if (!state) return widget;

			const clamped = clampValue(value);
			state.value = clamped;

			renderProgressBar(world, eid);
			markDirty(world, eid);
			emitChange(eid, clamped);

			return widget;
		},

		getValue(): number {
			const state = progressBarStateMap.get(eid);
			return state?.value ?? 0;
		},

		increment(amount: number): ProgressBarWidget {
			const state = progressBarStateMap.get(eid);
			if (!state) return widget;

			const newValue = clampValue(state.value + amount);
			state.value = newValue;

			renderProgressBar(world, eid);
			markDirty(world, eid);
			emitChange(eid, newValue);

			return widget;
		},

		// Display
		setLabel(label: string): ProgressBarWidget {
			const state = progressBarStateMap.get(eid);
			if (!state) return widget;

			state.label = label;
			renderProgressBar(world, eid);
			markDirty(world, eid);

			return widget;
		},

		getLabel(): string {
			const state = progressBarStateMap.get(eid);
			return state?.label ?? '';
		},

		showPercentage(show: boolean): ProgressBarWidget {
			ProgressBarComponent.showPercentage[eid] = show ? 1 : 0;
			renderProgressBar(world, eid);
			markDirty(world, eid);
			return widget;
		},

		isPercentageShown(): boolean {
			return ProgressBarComponent.showPercentage[eid] === 1;
		},

		getFillChar(): string {
			const state = progressBarStateMap.get(eid);
			return state?.fillChar ?? '█';
		},

		getEmptyChar(): string {
			const state = progressBarStateMap.get(eid);
			return state?.emptyChar ?? '░';
		},

		// Mode
		setIndeterminate(indeterminate: boolean): ProgressBarWidget {
			ProgressBarComponent.indeterminate[eid] = indeterminate ? 1 : 0;
			renderProgressBar(world, eid);
			markDirty(world, eid);
			return widget;
		},

		isIndeterminate(): boolean {
			return ProgressBarComponent.indeterminate[eid] === 1;
		},

		// Position
		setPosition(x: number, y: number): ProgressBarWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number): ProgressBarWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		getPosition(): { x: number; y: number; width: number; height: number } {
			const state = progressBarStateMap.get(eid);
			return {
				x: Position.x[eid] ?? 0,
				y: Position.y[eid] ?? 0,
				width: state?.width ?? 20,
				height: 1,
			};
		},

		// Events
		onChange(callback: (value: number) => void): ProgressBarWidget {
			const state = progressBarStateMap.get(eid);
			if (state) {
				state.onChangeCallbacks.push(callback);
			}
			return widget;
		},

		// Lifecycle
		destroy(): void {
			ProgressBarComponent.isProgressBar[eid] = 0;
			ProgressBarComponent.showPercentage[eid] = 0;
			ProgressBarComponent.indeterminate[eid] = 0;
			progressBarStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a progress bar widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a progress bar widget
 *
 * @example
 * ```typescript
 * import { isProgressBar } from 'blecsd/widgets';
 *
 * if (isProgressBar(world, entity)) {
 *   // Handle progress bar-specific logic
 * }
 * ```
 */
export function isProgressBar(_world: World, eid: Entity): boolean {
	return ProgressBarComponent.isProgressBar[eid] === 1;
}

/**
 * Resets the progress bar widget store. Useful for testing.
 * @internal
 */
export function resetProgressBarStore(): void {
	ProgressBarComponent.isProgressBar.fill(0);
	ProgressBarComponent.showPercentage.fill(0);
	ProgressBarComponent.indeterminate.fill(0);
	progressBarStateMap.clear();
}
