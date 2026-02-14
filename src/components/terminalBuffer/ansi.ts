/**
 * ANSI escape sequence parsing for TerminalBuffer.
 *
 * @module components/terminalBuffer/ansi
 */

import type { Entity, World } from '../../core/types';
import { cloneAttribute } from '../../terminal/ansi/parser';
import { markDirty } from '../renderable';
import { TerminalBuffer } from './component';
import { moveCursorBack, moveCursorDown, moveCursorForward, moveCursorUp } from './cursor';
import { eraseInDisplay, eraseInLine } from './erase';
import { handleDecPrivateMode } from './modes';
import { applySgr } from './sgr';
import type { TerminalState } from './types';

// =============================================================================
// ANSI ESCAPE SEQUENCE PARSING
// =============================================================================

/**
 * Checks if an escape sequence is complete.
 */
export function isEscapeComplete(seq: string): boolean {
	if (seq.length < 2) return false;

	// CSI sequences end with a letter
	if (seq[1] === '[') {
		const lastChar = seq[seq.length - 1];
		if (lastChar === undefined) return false;
		return /[A-Za-z@`~]/.test(lastChar);
	}

	// OSC sequences end with BEL or ST
	if (seq[1] === ']') {
		return seq.endsWith('\x07') || seq.endsWith('\x1b\\');
	}

	// Simple escape sequences
	return seq.length >= 2;
}

/**
 * Processes a complete escape sequence.
 */
export function processEscapeSequence(
	world: World,
	eid: Entity,
	state: TerminalState,
	seq: string,
	resetTerminal: (world: World, eid: Entity) => void,
): void {
	if (seq.length < 2) return;

	const second = seq[1];

	// CSI sequences
	if (second === '[') {
		processCsiSequence(world, eid, state, seq);
		return;
	}

	// Other escape sequences (simplified)
	switch (second) {
		case 'c': // Reset
			resetTerminal(world, eid);
			break;
		case '7': // Save cursor
			state.savedCursorX = TerminalBuffer.cursorX[eid] ?? 0;
			state.savedCursorY = TerminalBuffer.cursorY[eid] ?? 0;
			state.savedAttr = cloneAttribute(state.currentAttr);
			break;
		case '8': // Restore cursor
			TerminalBuffer.cursorX[eid] = state.savedCursorX;
			TerminalBuffer.cursorY[eid] = state.savedCursorY;
			state.currentAttr = cloneAttribute(state.savedAttr);
			markDirty(world, eid);
			break;
		case 'D': // Index (move down)
			moveCursorDown(world, eid, state, 1);
			break;
		case 'M': // Reverse index (move up)
			moveCursorUp(world, eid, 1);
			break;
		case 'E': // Next line
			TerminalBuffer.cursorX[eid] = 0;
			moveCursorDown(world, eid, state, 1);
			break;
	}
}

/**
 * Processes a CSI escape sequence.
 */
function processCsiSequence(world: World, eid: Entity, state: TerminalState, seq: string): void {
	// Parse CSI sequence: ESC [ <params> <command>
	// Include ? for private mode sequences like ESC[?25l
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC character is intentional for ANSI parsing
	const match = seq.match(/^\x1b\[(\??[\d;]*)([A-Za-z@`~])$/);
	if (!match) return;

	const params = match[1] ?? '';
	const command = match[2];

	// Parse parameters
	const args = params === '' ? [] : params.split(';').map((s) => parseInt(s, 10) || 0);
	const arg1 = args[0] ?? 1;
	const arg2 = args[1] ?? 1;

	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;

	switch (command) {
		// Cursor movement
		case 'A': // Cursor up
			moveCursorUp(world, eid, arg1);
			break;
		case 'B': // Cursor down
			moveCursorDown(world, eid, state, arg1);
			break;
		case 'C': // Cursor forward
			moveCursorForward(world, eid, arg1, width);
			break;
		case 'D': // Cursor back
			moveCursorBack(world, eid, arg1);
			break;
		case 'E': // Cursor next line
			TerminalBuffer.cursorX[eid] = 0;
			moveCursorDown(world, eid, state, arg1);
			break;
		case 'F': // Cursor previous line
			TerminalBuffer.cursorX[eid] = 0;
			moveCursorUp(world, eid, arg1);
			break;
		case 'G': // Cursor horizontal absolute
			TerminalBuffer.cursorX[eid] = Math.min(Math.max(arg1 - 1, 0), width - 1);
			markDirty(world, eid);
			break;
		case 'H': // Cursor position
		case 'f':
			TerminalBuffer.cursorY[eid] = Math.min(Math.max(arg1 - 1, 0), height - 1);
			TerminalBuffer.cursorX[eid] = Math.min(Math.max(arg2 - 1, 0), width - 1);
			markDirty(world, eid);
			break;

		// Erase
		case 'J': // Erase in display
			eraseInDisplay(world, eid, state, args[0] ?? 0);
			break;
		case 'K': // Erase in line
			eraseInLine(world, eid, state, args[0] ?? 0);
			break;

		// SGR (Select Graphic Rendition)
		case 'm':
			applySgr(state, args.length === 0 ? [0] : args);
			break;

		// DEC Private Mode Set
		case 'h':
			handleDecPrivateMode(world, eid, state, params, true);
			break;
		// DEC Private Mode Reset
		case 'l':
			handleDecPrivateMode(world, eid, state, params, false);
			break;

		// Save/restore cursor
		case 's':
			state.savedCursorX = TerminalBuffer.cursorX[eid] ?? 0;
			state.savedCursorY = TerminalBuffer.cursorY[eid] ?? 0;
			break;
		case 'u':
			TerminalBuffer.cursorX[eid] = state.savedCursorX;
			TerminalBuffer.cursorY[eid] = state.savedCursorY;
			markDirty(world, eid);
			break;
	}
}
