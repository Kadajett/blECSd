/**
 * Slider Component
 *
 * Pure data container for slider/range functionality.
 * All business logic is in sliderSystem.ts.
 *
 * @module components/slider
 */

import type { StateMachineConfig } from '../core/stateMachine';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Slider orientation.
 */
export const SliderOrientation = {
	Horizontal: 0,
	Vertical: 1,
} as const;

export type SliderOrientationType = (typeof SliderOrientation)[keyof typeof SliderOrientation];

/**
 * Slider state type.
 */
export type SliderState = 'idle' | 'focused' | 'dragging' | 'disabled';

/**
 * Slider event type.
 */
export type SliderEvent = 'focus' | 'blur' | 'dragStart' | 'dragEnd' | 'disable' | 'enable';

/**
 * Slider display configuration.
 */
export interface SliderDisplay {
	/** Character for the track */
	readonly trackChar: string;
	/** Character for the thumb */
	readonly thumbChar: string;
	/** Character for the filled portion */
	readonly fillChar: string;
	/** Track foreground color */
	readonly trackFg: number;
	/** Track background color */
	readonly trackBg: number;
	/** Thumb foreground color */
	readonly thumbFg: number;
	/** Thumb background color */
	readonly thumbBg: number;
	/** Fill foreground color */
	readonly fillFg: number;
	/** Fill background color */
	readonly fillBg: number;
}

/**
 * Slider display options for configuration.
 */
export interface SliderDisplayOptions {
	trackChar?: string | undefined;
	thumbChar?: string | undefined;
	fillChar?: string | undefined;
	trackFg?: number | undefined;
	trackBg?: number | undefined;
	thumbFg?: number | undefined;
	thumbBg?: number | undefined;
	fillFg?: number | undefined;
	fillBg?: number | undefined;
}

/**
 * Slider callback function type.
 */
export type SliderChangeCallback = (value: number) => void;

/**
 * Slider store for managing slider-specific data.
 */
export interface SliderStore {
	/** Whether entity is a slider */
	isSlider: Uint8Array;
	/** Current value */
	value: Float32Array;
	/** Minimum value */
	min: Float32Array;
	/** Maximum value */
	max: Float32Array;
	/** Step increment */
	step: Float32Array;
	/** Orientation (0=horizontal, 1=vertical) */
	orientation: Uint8Array;
	/** Whether to show value text */
	showValue: Uint8Array;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default track character (horizontal) */
export const DEFAULT_TRACK_CHAR = '─';

/** Default track character (vertical) */
export const DEFAULT_TRACK_CHAR_VERTICAL = '│';

/** Default thumb character */
export const DEFAULT_THUMB_CHAR = '●';

/** Default fill character (horizontal) */
export const DEFAULT_FILL_CHAR = '━';

/** Default fill character (vertical) */
export const DEFAULT_FILL_CHAR_VERTICAL = '┃';

/** Default track foreground color */
export const DEFAULT_TRACK_FG = 0x666666ff;

/** Default track background color */
export const DEFAULT_TRACK_BG = 0x000000ff;

/** Default thumb foreground color */
export const DEFAULT_THUMB_FG = 0xffffffff;

/** Default thumb background color */
export const DEFAULT_THUMB_BG = 0x0066ffff;

/** Default fill foreground color */
export const DEFAULT_FILL_FG = 0x00ff00ff;

/** Default fill background color */
export const DEFAULT_FILL_BG = 0x000000ff;

/** Maximum entities supported */
const MAX_ENTITIES = 10000;

// =============================================================================
// STORES
// =============================================================================

/**
 * Store for slider component data.
 */
export const sliderStore: SliderStore = {
	isSlider: new Uint8Array(MAX_ENTITIES),
	value: new Float32Array(MAX_ENTITIES),
	min: new Float32Array(MAX_ENTITIES),
	max: new Float32Array(MAX_ENTITIES).fill(100),
	step: new Float32Array(MAX_ENTITIES).fill(1),
	orientation: new Uint8Array(MAX_ENTITIES),
	showValue: new Uint8Array(MAX_ENTITIES),
};

// =============================================================================
// STATE MACHINE CONFIG
// =============================================================================

/**
 * State machine configuration for slider widgets.
 */
export const SLIDER_STATE_MACHINE_CONFIG: StateMachineConfig<SliderState, SliderEvent> = {
	initial: 'idle',
	states: {
		idle: {
			on: {
				focus: 'focused',
				disable: 'disabled',
			},
		},
		focused: {
			on: {
				blur: 'idle',
				dragStart: 'dragging',
				disable: 'disabled',
			},
		},
		dragging: {
			on: {
				dragEnd: 'focused',
				blur: 'idle',
				disable: 'disabled',
			},
		},
		disabled: {
			on: {
				enable: 'idle',
			},
		},
	},
};
