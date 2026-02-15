/**
 * Keyboard handling for Terminal Widget.
 *
 * @module widgets/terminal/keyboard
 */

import type { TerminalWidget } from './types';

/**
 * Lookup table for special key escape sequences.
 */
const SPECIAL_KEY_SEQUENCES: Record<string, string> = {
	return: '\r',
	enter: '\r',
	backspace: '\x7f',
	tab: '\t',
	escape: '\x1b',
	up: '\x1b[A',
	down: '\x1b[B',
	right: '\x1b[C',
	left: '\x1b[D',
	home: '\x1b[H',
	end: '\x1b[F',
	pageup: '\x1b[5~',
	pagedown: '\x1b[6~',
	delete: '\x1b[3~',
	insert: '\x1b[2~',
} as const;

/**
 * Handles special key input for PTY.
 */
function handleSpecialKey(widget: TerminalWidget, key: string): boolean {
	const sequence = SPECIAL_KEY_SEQUENCES[key];
	if (sequence) {
		widget.input(sequence);
		return true;
	}
	return false;
}

/**
 * Handles control key combinations.
 */
function handleCtrlKey(widget: TerminalWidget, char: string | undefined): boolean {
	if (!char) {
		return false;
	}

	const code = char.toUpperCase().charCodeAt(0) - 64;
	if (code >= 0 && code <= 31) {
		widget.input(String.fromCharCode(code));
		return true;
	}

	return false;
}

/**
 * Handles alt key combinations.
 */
function handleAltKey(widget: TerminalWidget, char: string | undefined): boolean {
	if (!char) {
		return false;
	}

	widget.input(`\x1b${char}`);
	return true;
}

/**
 * Handles PTY input for running terminal.
 */
function handlePtyInput(
	widget: TerminalWidget,
	key: string,
	char: string | undefined,
	ctrl: boolean,
	alt: boolean,
): boolean {
	// Special keys
	if (handleSpecialKey(widget, key)) {
		return true;
	}

	// Ctrl combinations
	if (ctrl && handleCtrlKey(widget, char)) {
		return true;
	}

	// Alt combinations
	if (alt && handleAltKey(widget, char)) {
		return true;
	}

	// Regular character
	if (char && !ctrl && !alt) {
		widget.input(char);
		return true;
	}

	return false;
}

/**
 * Handles scroll navigation when PTY is not running.
 */
function handleScrollKeys(widget: TerminalWidget, key: string, ctrl: boolean): boolean {
	if (key === 'pageup') {
		widget.scrollUp(widget.getDimensions().height);
		return true;
	}

	if (key === 'pagedown') {
		widget.scrollDown(widget.getDimensions().height);
		return true;
	}

	if (key === 'home' && ctrl) {
		widget.scrollToTop();
		return true;
	}

	if (key === 'end' && ctrl) {
		widget.scrollToBottom();
		return true;
	}

	return false;
}

/**
 * Handles keyboard input for a Terminal widget.
 *
 * @param widget - The terminal widget
 * @param key - Key name
 * @param char - Character (if printable)
 * @param ctrl - Control key pressed
 * @param alt - Alt key pressed
 * @param _shift - Shift key pressed
 * @returns true if the key was handled
 *
 * @example
 * ```typescript
 * import { createTerminal, handleTerminalKey } from 'blecsd/widgets';
 *
 * const terminal = createTerminal(world, config);
 *
 * // In your input handler
 * if (handleTerminalKey(terminal, event.key, event.char, event.ctrl, event.alt, event.shift)) {
 *   // Key was handled
 * }
 * ```
 */
export function handleTerminalKey(
	widget: TerminalWidget,
	key: string,
	char?: string,
	ctrl = false,
	alt = false,
	_shift = false,
): boolean {
	// If PTY is running, forward input
	if (widget.isRunning()) {
		return handlePtyInput(widget, key, char, ctrl, alt);
	}

	// PTY not running - handle scroll keys
	return handleScrollKeys(widget, key, ctrl);
}
