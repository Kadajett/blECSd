/**
 * SGR (Select Graphic Rendition) handling for TerminalBuffer.
 *
 * @module components/terminalBuffer/sgr
 */

import { createAttribute } from '../../terminal/ansi/parser';
import type { TerminalState } from './types';

// =============================================================================
// SGR (COLOR/STYLE) HANDLING
// =============================================================================

/**
 * SGR handler function type.
 * Returns the number of args consumed.
 */
type SgrHandler = (state: TerminalState, args: number[], i: number) => number;

/**
 * Handles reset (code 0).
 */
function handleSgrReset(state: TerminalState): number {
	state.currentAttr = createAttribute();
	return 1;
}

/**
 * Handles style codes (1-9).
 */
function handleSgrStyle(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.styles |= 1 << (code - 1);
	return 1;
}

/**
 * Handles style resets (22-29).
 */
function handleSgrStyleReset(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.styles &= ~(1 << (code - 22 + 1));
	return 1;
}

/**
 * Handles basic foreground colors (30-37).
 */
function handleSgrFgBasic(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.fg = { type: 1, value: code - 30 };
	return 1;
}

/**
 * Handles default foreground (39).
 */
function handleSgrFgDefault(state: TerminalState): number {
	state.currentAttr.fg = { type: 0, value: 0 };
	return 1;
}

/**
 * Handles basic background colors (40-47).
 */
function handleSgrBgBasic(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.bg = { type: 1, value: code - 40 };
	return 1;
}

/**
 * Handles default background (49).
 */
function handleSgrBgDefault(state: TerminalState): number {
	state.currentAttr.bg = { type: 0, value: 0 };
	return 1;
}

/**
 * Handles bright foreground colors (90-97).
 */
function handleSgrFgBright(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.fg = { type: 1, value: code - 90 + 8 };
	return 1;
}

/**
 * Handles bright background colors (100-107).
 */
function handleSgrBgBright(state: TerminalState, _args: number[], i: number): number {
	const code = _args[i] ?? 0;
	state.currentAttr.bg = { type: 1, value: code - 100 + 8 };
	return 1;
}

/**
 * Determines which handler to use for an SGR code.
 * Uses early returns to reduce complexity.
 */
function getSgrHandler(code: number): SgrHandler | null {
	// Reset
	if (code === 0) return handleSgrReset;

	// Styles and resets
	if (code >= 1 && code <= 9) return handleSgrStyle;
	if (code >= 22 && code <= 29) return handleSgrStyleReset;

	// Foreground colors
	if (code >= 30 && code <= 37) return handleSgrFgBasic;
	if (code === 39) return handleSgrFgDefault;
	if (code >= 90 && code <= 97) return handleSgrFgBright;

	// Background colors
	if (code >= 40 && code <= 47) return handleSgrBgBasic;
	if (code === 49) return handleSgrBgDefault;
	if (code >= 100 && code <= 107) return handleSgrBgBright;

	// Extended colors handled separately, unknown codes return null
	return null;
}

/**
 * Applies extended color codes (256-color or RGB).
 * Returns the number of args consumed, or 0 if invalid.
 */
function applyExtendedColor(
	state: TerminalState,
	args: number[],
	i: number,
	target: 'fg' | 'bg',
): number {
	if (i + 1 >= args.length) return 0;

	const subCode = args[i + 1];

	// 256-color mode (38;5;N or 48;5;N)
	if (subCode === 5 && i + 2 < args.length) {
		const colorIdx = args[i + 2] ?? 0;
		state.currentAttr[target] = { type: 2, value: colorIdx };
		return 3;
	}

	// RGB mode (38;2;R;G;B or 48;2;R;G;B)
	if (subCode === 2 && i + 4 < args.length) {
		const r = args[i + 2] ?? 0;
		const g = args[i + 3] ?? 0;
		const b = args[i + 4] ?? 0;
		state.currentAttr[target] = { type: 3, value: (r << 16) | (g << 8) | b };
		return 5;
	}

	return 0;
}

/**
 * Applies a single SGR code and returns the number of args consumed.
 */
function applySingleSgr(state: TerminalState, args: number[], i: number): number {
	const code = args[i] ?? 0;

	// Extended foreground (38;5;N or 38;2;R;G;B)
	if (code === 38) {
		const consumed = applyExtendedColor(state, args, i, 'fg');
		if (consumed > 0) return consumed;
		return 1; // Invalid extended color, skip
	}

	// Extended background (48;5;N or 48;2;R;G;B)
	if (code === 48) {
		const consumed = applyExtendedColor(state, args, i, 'bg');
		if (consumed > 0) return consumed;
		return 1; // Invalid extended color, skip
	}

	// Standard SGR codes
	const handler = getSgrHandler(code);
	if (handler) {
		return handler(state, args, i);
	}

	// Unknown code, skip
	return 1;
}

/**
 * Applies SGR (Select Graphic Rendition) codes.
 */
export function applySgr(state: TerminalState, args: number[]): void {
	let i = 0;
	while (i < args.length) {
		const consumed = applySingleSgr(state, args, i);
		i += consumed;
	}
}
