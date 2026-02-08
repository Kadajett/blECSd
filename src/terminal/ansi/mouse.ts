/**
 * ANSI Mouse Control
 *
 * Mouse tracking functions for terminal mouse input.
 * Supports multiple protocols from X10 to modern SGR extended mode.
 *
 * @module terminal/ansi/mouse
 * @internal This module is internal and not exported from the main package.
 */

import { CSI } from './constants';

/**
 * Mouse protocol mode constants
 */
export const MouseMode = {
	/** X10 mouse reporting (button press only) */
	X10: 9,
	/** Normal tracking mode (button press and release) */
	NORMAL: 1000,
	/** Highlight tracking mode */
	HIGHLIGHT: 1001,
	/** Button-event tracking (press, release, motion with button) */
	BUTTON_EVENT: 1002,
	/** Any-event tracking (all motion) */
	ANY_EVENT: 1003,
	/** Focus tracking (focus in/out events) */
	FOCUS: 1004,
	/** UTF-8 extended coordinates */
	UTF8: 1005,
	/** SGR extended coordinates (recommended) */
	SGR: 1006,
	/** URXVT extended coordinates */
	URXVT: 1015,
	/** SGR-Pixels mode (pixel coordinates) */
	SGR_PIXELS: 1016,
} as const;

/**
 * Mouse tracking functions.
 * All functions return ANSI escape sequences as strings.
 *
 * Mouse protocols from oldest to newest:
 * - X10: Basic, button press only, limited coordinates
 * - Normal (1000): Press and release, limited coordinates
 * - SGR (1006): Extended coordinates, most compatible modern option
 * - URXVT (1015): Extended coordinates, less common
 *
 * @example
 * ```typescript
 * // Enable SGR mouse tracking (recommended)
 * process.stdout.write(mouse.enableSGR());
 * process.stdout.write(mouse.enableAnyEvent());
 *
 * // Disable all mouse tracking
 * process.stdout.write(mouse.disableAll());
 * ```
 */
export const mouse = {
	/**
	 * Enable X10 mouse reporting (button press only).
	 * This is the most basic and widely supported mode.
	 * Only reports button presses, not releases.
	 * Limited to coordinates 0-222.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableX10() // Returns: '\x1b[?9h'
	 * ```
	 */
	enableX10(): string {
		return `${CSI}?${MouseMode.X10}h`;
	},

	/**
	 * Disable X10 mouse reporting.
	 *
	 * @returns ANSI escape sequence
	 */
	disableX10(): string {
		return `${CSI}?${MouseMode.X10}l`;
	},

	/**
	 * Enable normal tracking mode (VT200).
	 * Reports button press and release events.
	 * Limited to coordinates 0-222.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableNormal() // Returns: '\x1b[?1000h'
	 * ```
	 */
	enableNormal(): string {
		return `${CSI}?${MouseMode.NORMAL}h`;
	},

	/**
	 * Disable normal tracking mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableNormal(): string {
		return `${CSI}?${MouseMode.NORMAL}l`;
	},

	/**
	 * Enable button-event tracking mode.
	 * Reports press, release, and motion while button is pressed.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableButtonEvent() // Returns: '\x1b[?1002h'
	 * ```
	 */
	enableButtonEvent(): string {
		return `${CSI}?${MouseMode.BUTTON_EVENT}h`;
	},

	/**
	 * Disable button-event tracking mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableButtonEvent(): string {
		return `${CSI}?${MouseMode.BUTTON_EVENT}l`;
	},

	/**
	 * Enable any-event tracking mode.
	 * Reports all mouse motion, not just when buttons are pressed.
	 * Use with caution as it generates many events.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableAnyEvent() // Returns: '\x1b[?1003h'
	 * ```
	 */
	enableAnyEvent(): string {
		return `${CSI}?${MouseMode.ANY_EVENT}h`;
	},

	/**
	 * Disable any-event tracking mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableAnyEvent(): string {
		return `${CSI}?${MouseMode.ANY_EVENT}l`;
	},

	/**
	 * Enable focus tracking.
	 * Reports when terminal gains or loses focus.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableFocus() // Returns: '\x1b[?1004h'
	 * ```
	 */
	enableFocus(): string {
		return `${CSI}?${MouseMode.FOCUS}h`;
	},

	/**
	 * Disable focus tracking.
	 *
	 * @returns ANSI escape sequence
	 */
	disableFocus(): string {
		return `${CSI}?${MouseMode.FOCUS}l`;
	},

	/**
	 * Enable SGR extended mouse mode.
	 * This is the recommended modern mouse protocol.
	 * - Supports coordinates > 222
	 * - Uses decimal encoding (more readable)
	 * - Reports button state in final character
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableSGR() // Returns: '\x1b[?1006h'
	 * ```
	 */
	enableSGR(): string {
		return `${CSI}?${MouseMode.SGR}h`;
	},

	/**
	 * Disable SGR extended mouse mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableSGR(): string {
		return `${CSI}?${MouseMode.SGR}l`;
	},

	/**
	 * Enable URXVT extended mouse mode.
	 * Alternative to SGR for extended coordinates.
	 * Less commonly supported than SGR.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.enableURXVT() // Returns: '\x1b[?1015h'
	 * ```
	 */
	enableURXVT(): string {
		return `${CSI}?${MouseMode.URXVT}h`;
	},

	/**
	 * Disable URXVT extended mouse mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableURXVT(): string {
		return `${CSI}?${MouseMode.URXVT}l`;
	},

	/**
	 * Enable UTF-8 extended mouse mode.
	 * Legacy extended coordinate mode, rarely needed.
	 *
	 * @returns ANSI escape sequence
	 */
	enableUTF8(): string {
		return `${CSI}?${MouseMode.UTF8}h`;
	},

	/**
	 * Disable UTF-8 extended mouse mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableUTF8(): string {
		return `${CSI}?${MouseMode.UTF8}l`;
	},

	/**
	 * Disable all mouse tracking modes.
	 * Sends disable sequences for all mouse modes.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mouse.disableAll() // Disables X10, Normal, Button, Any, Focus, SGR, URXVT
	 * ```
	 */
	disableAll(): string {
		return [
			`${CSI}?${MouseMode.X10}l`,
			`${CSI}?${MouseMode.NORMAL}l`,
			`${CSI}?${MouseMode.BUTTON_EVENT}l`,
			`${CSI}?${MouseMode.ANY_EVENT}l`,
			`${CSI}?${MouseMode.FOCUS}l`,
			`${CSI}?${MouseMode.UTF8}l`,
			`${CSI}?${MouseMode.SGR}l`,
			`${CSI}?${MouseMode.URXVT}l`,
		].join('');
	},

	/**
	 * Enable recommended mouse tracking.
	 * Enables SGR mode with any-event tracking.
	 * This is the best default for modern terminals.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * process.stdout.write(mouse.enableRecommended());
	 * ```
	 */
	enableRecommended(): string {
		return `${CSI}?${MouseMode.SGR}h${CSI}?${MouseMode.ANY_EVENT}h`;
	},
} as const;

/**
 * DEC Locator event types.
 */
export const LocatorEvent = {
	/** No events */
	NONE: 0,
	/** Request only on button down */
	BUTTON_DOWN: 1,
	/** Request only on button up */
	BUTTON_UP: 2,
	/** Request on both button down and up */
	BUTTON_DOWN_UP: 3,
} as const;

export type LocatorEventValue = (typeof LocatorEvent)[keyof typeof LocatorEvent];

/**
 * DEC Locator button values.
 */
export const LocatorButton = {
	/** No button */
	NONE: 0,
	/** Right button */
	RIGHT: 1,
	/** Middle button */
	MIDDLE: 2,
	/** Left button */
	LEFT: 3,
	/** M4 button */
	M4: 4,
} as const;

export type LocatorButtonValue = (typeof LocatorButton)[keyof typeof LocatorButton];

/**
 * DEC Locator namespace for advanced mouse control.
 *
 * The DEC Locator is a more advanced mouse protocol than X10/SGR,
 * supporting pixel-level positioning, filter rectangles, and more
 * precise event control. However, it is less commonly supported
 * than SGR mouse mode.
 *
 * Note: Requires DEC Locator compatible terminals (xterm, some others).
 *
 * @example
 * ```typescript
 * import { locator } from 'blecsd/terminal';
 *
 * // Enable locator reporting with character cell units
 * process.stdout.write(locator.enable(2));
 *
 * // Set a filter rectangle for events
 * process.stdout.write(locator.setFilterRectangle(1, 1, 100, 50));
 *
 * // Request current locator position
 * process.stdout.write(locator.requestPosition());
 *
 * // Disable locator
 * process.stdout.write(locator.disable());
 * ```
 */
export const locator = {
	/**
	 * Enable locator reporting (DECELR).
	 *
	 * @param mode - Reporting mode:
	 *   - 0: Locator disabled (default)
	 *   - 1: Locator reports enabled, one-shot mode
	 *   - 2: Locator reports enabled, continuous mode
	 * @param units - Coordinate units:
	 *   - 0: Default (depends on terminal)
	 *   - 1: Device physical pixels
	 *   - 2: Character cells
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Enable one-shot locator with character cell units
	 * locator.enable(1, 2)
	 * // Returns: '\x1b[1;2'z'
	 *
	 * // Enable continuous locator with pixel units
	 * locator.enable(2, 1)
	 * // Returns: '\x1b[2;1'z'
	 * ```
	 */
	enable(mode: 0 | 1 | 2 = 2, units: 0 | 1 | 2 = 2): string {
		return `${CSI}${mode};${units}'z`;
	},

	/**
	 * Disable locator reporting (DECELR mode 0).
	 *
	 * @returns ANSI escape sequence
	 */
	disable(): string {
		return `${CSI}0'z`;
	},

	/**
	 * Set locator filter rectangle (DECEFR).
	 * Events are only reported within this rectangle.
	 *
	 * @param top - Top boundary
	 * @param left - Left boundary
	 * @param bottom - Bottom boundary
	 * @param right - Right boundary
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Set filter rectangle
	 * locator.setFilterRectangle(1, 1, 100, 200)
	 * // Returns: '\x1b[1;1;100;200'w'
	 * ```
	 */
	setFilterRectangle(top: number, left: number, bottom: number, right: number): string {
		return `${CSI}${top};${left};${bottom};${right}'w`;
	},

	/**
	 * Clear locator filter rectangle.
	 * Events will be reported for the entire screen.
	 *
	 * @returns ANSI escape sequence
	 */
	clearFilterRectangle(): string {
		return `${CSI}'w`;
	},

	/**
	 * Select locator events (DECSLE).
	 * Configure which events trigger locator reports.
	 *
	 * @param events - Array of event configurations:
	 *   - 0: Only respond to explicit requests (DECRQLP)
	 *   - 1: Report button down transitions
	 *   - 2: Do not report button down transitions
	 *   - 3: Report button up transitions
	 *   - 4: Do not report button up transitions
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Report both button down and up
	 * locator.setEvents([1, 3])
	 * // Returns: '\x1b[1;3'{''
	 *
	 * // Only report button down
	 * locator.setEvents([1, 4])
	 * // Returns: '\x1b[1;4'{'
	 * ```
	 */
	setEvents(events: number[]): string {
		return `${CSI}${events.join(';')}'{`;
	},

	/**
	 * Request locator position (DECRQLP).
	 * Terminal responds with a DECLRP sequence containing position.
	 *
	 * @param button - Button to check (optional):
	 *   - 0: Default (any)
	 *   - 1: Right button
	 *   - 2: Middle button
	 *   - 3: Left button
	 *   - 4: M4 button
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Request position of any button
	 * locator.requestPosition()
	 * // Returns: '\x1b['|'
	 *
	 * // Request position when left button is pressed
	 * locator.requestPosition(3)
	 * // Returns: '\x1b[3'|'
	 * ```
	 */
	requestPosition(button?: LocatorButtonValue): string {
		if (button === undefined) {
			return `${CSI}'|`;
		}
		return `${CSI}${button}'|`;
	},

	/**
	 * Enable locator key mode.
	 * Enables locator reporting for keyboard events.
	 *
	 * @returns ANSI escape sequence
	 */
	enableKeyMode(): string {
		return `${CSI}?99h`;
	},

	/**
	 * Disable locator key mode.
	 *
	 * @returns ANSI escape sequence
	 */
	disableKeyMode(): string {
		return `${CSI}?99l`;
	},

	/**
	 * Enable locator extended reporting (pixel coordinates).
	 *
	 * @returns ANSI escape sequence
	 */
	enableExtended(): string {
		return `${CSI}?1003h`;
	},

	/**
	 * Disable locator extended reporting.
	 *
	 * @returns ANSI escape sequence
	 */
	disableExtended(): string {
		return `${CSI}?1003l`;
	},

	/**
	 * Enable locator highlight reporting.
	 * Reports highlighting changes in the locator area.
	 *
	 * @returns ANSI escape sequence
	 */
	enableHighlight(): string {
		return `${CSI}?1001h`;
	},

	/**
	 * Disable locator highlight reporting.
	 *
	 * @returns ANSI escape sequence
	 */
	disableHighlight(): string {
		return `${CSI}?1001l`;
	},
} as const;
