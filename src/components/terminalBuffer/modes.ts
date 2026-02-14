/**
 * DEC private mode and alternate screen handling for TerminalBuffer.
 *
 * @module components/terminalBuffer/modes
 */

import type { Entity, World } from '../../core/types';
import { cloneCell, createCell, createScreenBuffer } from '../../terminal/screen/cell';
import { markDirty } from '../renderable';
import { TerminalBuffer } from './component';
import { clearCellRange } from './erase';
import type { TerminalState } from './types';

// =============================================================================
// DEC PRIVATE MODES AND ALTERNATE SCREEN
// =============================================================================

/**
 * Handles cursor visibility mode.
 */
export function handleCursorVisibilityMode(world: World, eid: Entity, enable: boolean): void {
	TerminalBuffer.cursorVisible[eid] = enable ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Handles alternate screen buffer with cursor save/restore (mode 1049).
 */
export function handleAltScreenWithCursorMode(
	world: World,
	eid: Entity,
	state: TerminalState,
	enable: boolean,
): void {
	if (enable) {
		// Save cursor and switch to alternate buffer
		state.savedCursorX = TerminalBuffer.cursorX[eid] ?? 0;
		state.savedCursorY = TerminalBuffer.cursorY[eid] ?? 0;
		switchToAlternateBuffer(world, eid, state);
	} else {
		// Switch back to main buffer and restore cursor
		switchToMainBuffer(world, eid, state);
		TerminalBuffer.cursorX[eid] = state.savedCursorX;
		TerminalBuffer.cursorY[eid] = state.savedCursorY;
	}
	markDirty(world, eid);
}

/**
 * Handles alternate screen buffer modes (47, 1047).
 */
export function handleAltScreenMode(
	world: World,
	eid: Entity,
	state: TerminalState,
	mode: string,
	enable: boolean,
): void {
	if (enable) {
		switchToAlternateBuffer(world, eid, state);
		if (mode === '1047') {
			// Clear the alternate buffer
			clearCellRange(state, 0, state.buffer.cells.length);
		}
	} else {
		switchToMainBuffer(world, eid, state);
	}
	markDirty(world, eid);
}

/**
 * Handles DEC Private Mode sequences (CSI ? Ps h/l).
 */
export function handleDecPrivateMode(
	world: World,
	eid: Entity,
	state: TerminalState,
	params: string,
	enable: boolean,
): void {
	// Remove leading '?' if present
	const mode = params.startsWith('?') ? params.slice(1) : params;

	if (mode === '25') {
		handleCursorVisibilityMode(world, eid, enable);
		return;
	}

	if (mode === '1049') {
		handleAltScreenWithCursorMode(world, eid, state, enable);
		return;
	}

	if (mode === '47' || mode === '1047') {
		handleAltScreenMode(world, eid, state, mode, enable);
		return;
	}

	// Other modes we don't handle yet but shouldn't error on
	// '7': Wraparound mode (we always wrap, so this is a no-op for now)
	// '1': Application cursor keys
	// '12': Start blinking cursor
	// '2004': Bracketed paste mode
}

/**
 * Switches to the alternate screen buffer.
 * Saves the current buffer and switches to a cleared alternate buffer.
 */
function switchToAlternateBuffer(_world: World, eid: Entity, state: TerminalState): void {
	if (TerminalBuffer.altScreenActive[eid] === 1) return; // Already in alt buffer

	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;

	// Create alternate buffer to save current content
	if (!state.altBuffer) {
		state.altBuffer = createScreenBuffer(width, height);
	}

	// Copy current cells to alt buffer (saving main screen)
	for (let i = 0; i < state.buffer.cells.length && i < state.altBuffer.cells.length; i++) {
		const cell = state.buffer.cells[i];
		if (cell) {
			state.altBuffer.cells[i] = cloneCell(cell);
		}
	}

	// Clear the current buffer (now the "alternate" screen)
	const clearCell = createCell();
	for (let i = 0; i < state.buffer.cells.length; i++) {
		state.buffer.cells[i] = cloneCell(clearCell);
	}

	// Reset cursor to top-left
	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = 0;
	TerminalBuffer.altScreenActive[eid] = 1;
}

/**
 * Switches back to the main screen buffer.
 * Restores the saved buffer content.
 */
function switchToMainBuffer(_world: World, eid: Entity, state: TerminalState): void {
	if (TerminalBuffer.altScreenActive[eid] === 0) return; // Already in main buffer

	if (state.altBuffer) {
		// Restore the saved main buffer content
		for (let i = 0; i < state.altBuffer.cells.length && i < state.buffer.cells.length; i++) {
			const cell = state.altBuffer.cells[i];
			if (cell) {
				state.buffer.cells[i] = cloneCell(cell);
			}
		}
	}

	TerminalBuffer.altScreenActive[eid] = 0;
}
