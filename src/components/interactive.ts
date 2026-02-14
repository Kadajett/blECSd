/**
 * Interactive component for mouse/keyboard interaction.
 * @module components/interactive
 */

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Default hover effect foreground color (white) */
export const DEFAULT_HOVER_FG = 0xffffffff;

/** Default hover effect background color (transparent) */
export const DEFAULT_HOVER_BG = 0x00000000;

/** Default focus effect foreground color (cyan) */
export const DEFAULT_FOCUS_FG = 0xff00ffff;

/** Default focus effect background color (transparent) */
export const DEFAULT_FOCUS_BG = 0x00000000;

/**
 * Interactive component store using SoA (Structure of Arrays) for performance.
 *
 * - `clickable`: Whether entity responds to clicks (0=no, 1=yes)
 * - `draggable`: Whether entity can be dragged (0=no, 1=yes)
 * - `hoverable`: Whether entity responds to hover (0=no, 1=yes)
 * - `hovered`: Current hover state (0=no, 1=yes)
 * - `pressed`: Current pressed state (0=no, 1=yes)
 * - `keyable`: Whether entity receives key events (0=no, 1=yes)
 * - `hoverEffectFg`, `hoverEffectBg`: Colors for hover effect
 *
 * @example
 * ```typescript
 * import { Interactive, setClickable, isHovered, isPressed } from 'blecsd';
 *
 * setInteractive(world, entity, { clickable: true, hoverable: true });
 *
 * if (isHovered(world, entity)) {
 *   console.log('Mouse over entity');
 * }
 * ```
 */
export const Interactive = {
	/** Whether entity responds to clicks (0=no, 1=yes) */
	clickable: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether entity can be dragged (0=no, 1=yes) */
	draggable: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether entity responds to hover (0=no, 1=yes) */
	hoverable: new Uint8Array(DEFAULT_CAPACITY),
	/** Current hover state (0=no, 1=yes) */
	hovered: new Uint8Array(DEFAULT_CAPACITY),
	/** Current pressed state (0=no, 1=yes) */
	pressed: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether entity receives key events (0=no, 1=yes) */
	keyable: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether entity can receive focus (0=no, 1=yes) */
	focusable: new Uint8Array(DEFAULT_CAPACITY),
	/** Current focus state (0=no, 1=yes) */
	focused: new Uint8Array(DEFAULT_CAPACITY),
	/** Tab index for focus order (-1=skip, 0+=order) */
	tabIndex: new Int16Array(DEFAULT_CAPACITY),
	/** Whether entity is enabled (0=disabled, 1=enabled) */
	enabled: new Uint8Array(DEFAULT_CAPACITY),
	/** Hover effect foreground color */
	hoverEffectFg: new Uint32Array(DEFAULT_CAPACITY),
	/** Hover effect background color */
	hoverEffectBg: new Uint32Array(DEFAULT_CAPACITY),
	/** Focus effect foreground color */
	focusEffectFg: new Uint32Array(DEFAULT_CAPACITY),
	/** Focus effect background color */
	focusEffectBg: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Interactive configuration options.
 */
export interface InteractiveOptions {
	/** Whether entity responds to clicks */
	clickable?: boolean;
	/** Whether entity can be dragged */
	draggable?: boolean;
	/** Whether entity responds to hover */
	hoverable?: boolean;
	/** Whether entity receives key events */
	keyable?: boolean;
	/** Whether entity can receive focus */
	focusable?: boolean;
	/** Tab index for focus order (-1=skip, 0+=order) */
	tabIndex?: number;
	/** Whether entity is enabled (can receive input/focus) */
	enabled?: boolean;
	/** Hover effect foreground color */
	hoverEffectFg?: number;
	/** Hover effect background color */
	hoverEffectBg?: number;
	/** Focus effect foreground color */
	focusEffectFg?: number;
	/** Focus effect background color */
	focusEffectBg?: number;
}

/**
 * Interactive data returned by getInteractive.
 */
export interface InteractiveData {
	readonly clickable: boolean;
	readonly draggable: boolean;
	readonly hoverable: boolean;
	readonly hovered: boolean;
	readonly pressed: boolean;
	readonly enabled: boolean;
	readonly keyable: boolean;
	readonly focusable: boolean;
	readonly focused: boolean;
	readonly tabIndex: number;
	readonly hoverEffectFg: number;
	readonly hoverEffectBg: number;
	readonly focusEffectFg: number;
	readonly focusEffectBg: number;
}
