/**
 * Mouse event parser for terminal mouse protocols.
 * Supports X10, SGR, URXVT, DEC, and VT300 protocols.
 * @module terminal/mouseParser
 */

import { z } from 'zod';

/**
 * Mouse button identifiers.
 */
export type MouseButton = 'left' | 'middle' | 'right' | 'wheelUp' | 'wheelDown' | 'unknown';

/**
 * Mouse action types.
 */
export type MouseAction = 'press' | 'release' | 'move' | 'wheel';

/**
 * Mouse protocol types.
 */
export type MouseProtocol = 'x10' | 'sgr' | 'urxvt' | 'dec' | 'vt300';

/**
 * All valid mouse button values for Zod schema.
 */
const MOUSE_BUTTONS: readonly MouseButton[] = [
	'left',
	'middle',
	'right',
	'wheelUp',
	'wheelDown',
	'unknown',
] as const;

/**
 * All valid mouse action values for Zod schema.
 */
const MOUSE_ACTIONS: readonly MouseAction[] = ['press', 'release', 'move', 'wheel'] as const;

/**
 * All valid mouse protocol values for Zod schema.
 */
const MOUSE_PROTOCOLS: readonly MouseProtocol[] = ['x10', 'sgr', 'urxvt', 'dec', 'vt300'] as const;

/**
 * Parsed mouse event with position and modifiers.
 *
 * @example
 * ```typescript
 * import { parseMouseSequence, MouseEvent } from 'blecsd';
 *
 * const event = parseMouseSequence(Buffer.from('\x1b[<0;10;20M'));
 * if (event) {
 *   console.log(event.x);      // 10
 *   console.log(event.y);      // 20
 *   console.log(event.button); // 'left'
 *   console.log(event.action); // 'press'
 * }
 * ```
 */
export interface MouseEvent {
	/** X coordinate (0-indexed) */
	readonly x: number;
	/** Y coordinate (0-indexed) */
	readonly y: number;
	/** Mouse button */
	readonly button: MouseButton;
	/** Action type */
	readonly action: MouseAction;
	/** Ctrl modifier was pressed */
	readonly ctrl: boolean;
	/** Alt/Meta modifier was pressed */
	readonly meta: boolean;
	/** Shift modifier was pressed */
	readonly shift: boolean;
	/** Protocol used to encode this event */
	readonly protocol: MouseProtocol;
	/** Raw buffer data */
	readonly raw: Uint8Array;
}

/**
 * Zod schema for MouseEvent validation.
 *
 * @example
 * ```typescript
 * import { MouseEventSchema } from 'blecsd';
 *
 * const result = MouseEventSchema.safeParse(event);
 * if (result.success) {
 *   console.log('Valid mouse event');
 * }
 * ```
 */
export const MouseEventSchema = z.object({
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
	button: z.enum(MOUSE_BUTTONS as unknown as [MouseButton, ...MouseButton[]]),
	action: z.enum(MOUSE_ACTIONS as unknown as [MouseAction, ...MouseAction[]]),
	ctrl: z.boolean(),
	meta: z.boolean(),
	shift: z.boolean(),
	protocol: z.enum(MOUSE_PROTOCOLS as unknown as [MouseProtocol, ...MouseProtocol[]]),
	raw: z.instanceof(Uint8Array),
});

// ESC character code
const ESC_CODE = 0x1b;

// Regex patterns for mouse sequences
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
const X10_MOUSE_RE = /^\x1b\[M([\x00\u0020-\uffff]{3})/;

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
const SGR_MOUSE_RE = /^\x1b\[<(\d+);(\d+);(\d+)([mM])/;

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
const URXVT_MOUSE_RE = /^\x1b\[(\d+);(\d+);(\d+)M/;

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
const DEC_MOUSE_RE = /^\x1b\[<(\d+);(\d+);(\d+);(\d+)&w/;

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
const VT300_MOUSE_RE = /^\x1b\[24([0135])~\[(\d+),(\d+)\]\r/;

// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC (0x1b) required for terminal parsing
const FOCUS_RE = /^\x1b\[(O|I)/;

/**
 * Parse modifier bits from mouse button value.
 * Format: 2 bits for button, then shift, meta, ctrl
 */
function parseModifiers(b: number): { shift: boolean; meta: boolean; ctrl: boolean } {
	const mod = b >> 2;
	return {
		shift: !!(mod & 1),
		meta: !!((mod >> 1) & 1),
		ctrl: !!((mod >> 2) & 1),
	};
}

/**
 * Determine button from button value.
 */
function getButtonFromValue(b: number, isWheel: boolean): MouseButton {
	if (isWheel) {
		return b & 1 ? 'wheelDown' : 'wheelUp';
	}
	const button = b & 3;
	if (button === 0) return 'left';
	if (button === 1) return 'middle';
	if (button === 2) return 'right';
	return 'unknown';
}

/**
 * Check if button value indicates a wheel event.
 */
function isWheelEvent(b: number): boolean {
	return !!((b >> 6) & 1);
}

/**
 * Check if button value indicates a movement event.
 * Common movement codes: 35, 39, 51, 43 (with various modifiers)
 */
function isMovementEvent(b: number): boolean {
	return b === 35 || b === 39 || b === 51 || b === 43;
}

/**
 * Helper to create a MouseEvent object.
 */
function createMouseEvent(
	x: number,
	y: number,
	button: MouseButton,
	action: MouseAction,
	modifiers: { shift: boolean; meta: boolean; ctrl: boolean },
	protocol: MouseProtocol,
	raw: Uint8Array,
): MouseEvent {
	return {
		x,
		y,
		button,
		action,
		ctrl: modifiers.ctrl,
		meta: modifiers.meta,
		shift: modifiers.shift,
		protocol,
		raw,
	};
}

/**
 * Parse X10/X11 mouse sequence.
 * Format: ESC [ M Cb Cx Cy
 */
function parseX10Mouse(s: string, raw: Uint8Array): MouseEvent | null {
	const match = X10_MOUSE_RE.exec(s);
	if (!match?.[1]) return null;

	const chars = match[1];
	if (chars.length < 3) return null;

	let b = chars.charCodeAt(0);
	let x = chars.charCodeAt(1);
	let y = chars.charCodeAt(2);

	// Coordinates are encoded with +32 offset
	x = x - 32;
	y = y - 32;

	// Handle 0 coordinate (special case)
	if (x === -32) x = 255;
	if (y === -32) y = 255;

	// Convert to 0-indexed
	x = Math.max(0, x - 1);
	y = Math.max(0, y - 1);

	const modifiers = parseModifiers(b);

	// Adjust b for button calculation
	b -= 32;

	// Determine action and button
	if (isWheelEvent(b)) {
		const button = getButtonFromValue(b, true);
		return createMouseEvent(x, y, button, 'wheel', modifiers, 'x10', raw);
	}

	if (b === 3) {
		// Release - X10 doesn't tell which button was released
		return createMouseEvent(x, y, 'unknown', 'release', modifiers, 'x10', raw);
	}

	if (isMovementEvent(b)) {
		return createMouseEvent(x, y, 'unknown', 'move', modifiers, 'x10', raw);
	}

	const button = getButtonFromValue(b, false);
	return createMouseEvent(x, y, button, 'press', modifiers, 'x10', raw);
}

/**
 * Parse SGR mouse sequence.
 * Format: ESC [ < Cb ; Cx ; Cy M/m
 * M = press, m = release
 */
function parseSGRMouse(s: string, raw: Uint8Array): MouseEvent | null {
	const match = SGR_MOUSE_RE.exec(s);
	if (!match) return null;

	const b = Number(match[1]);
	let x = Number(match[2]);
	let y = Number(match[3]);
	const isDown = match[4] === 'M';

	// Convert to 0-indexed
	x = Math.max(0, x - 1);
	y = Math.max(0, y - 1);

	const modifiers = parseModifiers(b);

	// Determine action and button
	if (isWheelEvent(b)) {
		const button = getButtonFromValue(b, true);
		return createMouseEvent(x, y, button, 'wheel', modifiers, 'sgr', raw);
	}

	if (isMovementEvent(b)) {
		return createMouseEvent(x, y, 'unknown', 'move', modifiers, 'sgr', raw);
	}

	const button = getButtonFromValue(b, false);
	const action = isDown ? 'press' : 'release';
	return createMouseEvent(x, y, button, action, modifiers, 'sgr', raw);
}

/**
 * Parse URXVT mouse sequence.
 * Format: ESC [ Cb ; Cx ; Cy M
 */
function parseURXVTMouse(s: string, raw: Uint8Array): MouseEvent | null {
	const match = URXVT_MOUSE_RE.exec(s);
	if (!match) return null;

	let b = Number(match[1]);
	let x = Number(match[2]);
	let y = Number(match[3]);

	// Convert to 0-indexed
	x = Math.max(0, x - 1);
	y = Math.max(0, y - 1);

	const modifiers = parseModifiers(b);

	// Bug in urxvt: 128/129 on mousemove after wheelup/down
	if (b === 128 || b === 129) {
		b = 67;
	}

	// Adjust b for button calculation
	b -= 32;

	// Determine action and button
	if (isWheelEvent(b)) {
		const button = getButtonFromValue(b, true);
		return createMouseEvent(x, y, button, 'wheel', modifiers, 'urxvt', raw);
	}

	if (b === 3) {
		// Release - URXVT doesn't tell which button was released
		return createMouseEvent(x, y, 'unknown', 'release', modifiers, 'urxvt', raw);
	}

	if (isMovementEvent(b)) {
		return createMouseEvent(x, y, 'unknown', 'move', modifiers, 'urxvt', raw);
	}

	const button = getButtonFromValue(b, false);
	return createMouseEvent(x, y, button, 'press', modifiers, 'urxvt', raw);
}

/**
 * Parse DEC locator mouse sequence.
 * Format: ESC [ < Cb ; Cx ; Cy ; page & w
 */
function parseDECMouse(s: string, raw: Uint8Array): MouseEvent | null {
	const match = DEC_MOUSE_RE.exec(s);
	if (!match) return null;

	const b = Number(match[1]);
	let x = Number(match[2]);
	let y = Number(match[3]);
	// page is match[4], ignored for now

	// Convert to 0-indexed
	x = Math.max(0, x - 1);
	y = Math.max(0, y - 1);

	// DEC uses different button encoding
	const action = b === 3 ? 'release' : 'press';
	let button: MouseButton;
	if (b === 2) {
		button = 'left';
	} else if (b === 4) {
		button = 'middle';
	} else if (b === 6) {
		button = 'right';
	} else {
		button = 'unknown';
	}

	// DEC doesn't have modifier encoding in the same way
	const modifiers = { shift: false, meta: false, ctrl: false };

	return createMouseEvent(x, y, button, action, modifiers, 'dec', raw);
}

/**
 * Parse VT300 mouse sequence.
 * Format: ESC [ 24X ~ [ Cx , Cy ] CR
 * where X is button (0, 1, 3, 5)
 */
function parseVT300Mouse(s: string, raw: Uint8Array): MouseEvent | null {
	const match = VT300_MOUSE_RE.exec(s);
	if (!match) return null;

	const b = Number(match[1]);
	let x = Number(match[2]);
	let y = Number(match[3]);

	// Convert to 0-indexed
	x = Math.max(0, x - 1);
	y = Math.max(0, y - 1);

	// VT300 button encoding
	let button: MouseButton;
	if (b === 1) {
		button = 'left';
	} else if (b === 2 || b === 3) {
		button = 'middle';
	} else if (b === 5) {
		button = 'right';
	} else {
		button = 'unknown';
	}

	// VT300 doesn't have modifier encoding
	const modifiers = { shift: false, meta: false, ctrl: false };

	return createMouseEvent(x, y, button, 'press', modifiers, 'vt300', raw);
}

/**
 * Focus event result (not a full mouse event).
 */
export interface FocusEvent {
	/** Whether the terminal gained or lost focus */
	readonly focused: boolean;
	/** Raw buffer data */
	readonly raw: Uint8Array;
}

/**
 * Zod schema for FocusEvent validation.
 */
export const FocusEventSchema = z.object({
	focused: z.boolean(),
	raw: z.instanceof(Uint8Array),
});

/**
 * Parse focus event sequence.
 * Format: ESC [ I (focus in) or ESC [ O (focus out)
 */
function parseFocusEvent(s: string, raw: Uint8Array): FocusEvent | null {
	const match = FOCUS_RE.exec(s);
	if (!match?.[1]) return null;

	const focused = match[1] === 'I';
	return { focused, raw };
}

/**
 * Result of parsing a mouse/focus sequence.
 */
export type ParseMouseResult =
	| { type: 'mouse'; event: MouseEvent }
	| { type: 'focus'; event: FocusEvent }
	| null;

/**
 * Parse a mouse or focus sequence from a buffer.
 *
 * Supports multiple mouse protocols:
 * - X10/X11: Basic mouse reporting (ESC [ M ...)
 * - SGR: Extended mouse reporting with release info (ESC [ < ...)
 * - URXVT: rxvt-unicode mouse format (ESC [ ... M)
 * - DEC: DEC locator format (ESC [ < ... & w)
 * - VT300: VT300 locator format (ESC [ 24X ~ ...)
 *
 * Also handles terminal focus events (ESC [ I/O).
 *
 * @param buffer - Raw input buffer to parse
 * @returns Parsed result or null if not a mouse sequence
 *
 * @example
 * ```typescript
 * import { parseMouseSequence } from 'blecsd';
 *
 * // Parse SGR mouse press at (10, 20)
 * const result = parseMouseSequence(Buffer.from('\x1b[<0;10;20M'));
 * if (result?.type === 'mouse') {
 *   console.log(result.event.x);      // 9 (0-indexed)
 *   console.log(result.event.y);      // 19 (0-indexed)
 *   console.log(result.event.button); // 'left'
 *   console.log(result.event.action); // 'press'
 * }
 *
 * // Parse focus event
 * const focus = parseMouseSequence(Buffer.from('\x1b[I'));
 * if (focus?.type === 'focus') {
 *   console.log(focus.event.focused); // true
 * }
 * ```
 */
export function parseMouseSequence(buffer: Uint8Array): ParseMouseResult {
	if (buffer.length < 3) return null;

	// Quick check for ESC [ prefix
	if (buffer[0] !== ESC_CODE || buffer[1] !== 0x5b) return null;

	const s = new TextDecoder().decode(buffer);

	// Try focus event first (shortest)
	const focus = parseFocusEvent(s, buffer);
	if (focus) return { type: 'focus', event: focus };

	// Try SGR (most common modern format)
	const sgr = parseSGRMouse(s, buffer);
	if (sgr) return { type: 'mouse', event: sgr };

	// Try X10/X11
	const x10 = parseX10Mouse(s, buffer);
	if (x10) return { type: 'mouse', event: x10 };

	// Try URXVT
	const urxvt = parseURXVTMouse(s, buffer);
	if (urxvt) return { type: 'mouse', event: urxvt };

	// Try DEC
	const dec = parseDECMouse(s, buffer);
	if (dec) return { type: 'mouse', event: dec };

	// Try VT300
	const vt300 = parseVT300Mouse(s, buffer);
	if (vt300) return { type: 'mouse', event: vt300 };

	return null;
}

/**
 * Check if a buffer contains a mouse sequence.
 *
 * @param buffer - Input buffer to check
 * @returns true if buffer contains a mouse sequence
 *
 * @example
 * ```typescript
 * import { isMouseBuffer } from 'blecsd';
 *
 * const buffer = Buffer.from('\x1b[<0;10;20M');
 * console.log(isMouseBuffer(buffer)); // true
 * ```
 */
export function isMouseBuffer(buffer: Uint8Array): boolean {
	return parseMouseSequence(buffer) !== null;
}
