/**
 * Public API functions for TerminalBuffer.
 *
 * @module components/terminalBuffer/public
 */

import type { Entity, World } from '../../core/types';
import { createAttribute } from '../../terminal/ansi/parser';
import { cloneCell, createCell, createScreenBuffer } from '../../terminal/screen/cell';
import { clearScrollback } from '../../utils/virtualScrollback';
import { markDirty } from '../renderable';
import { TerminalBuffer } from './component';
import { isEscapeComplete, processEscapeSequence } from './ansi';
import { terminalStateMap } from './types';
import { handleNewline, handleTab, writePrintableChar } from './write';
import { getTerminalState } from './state';

// =============================================================================
// PUBLIC API FUNCTIONS
// =============================================================================

/**
 * Writes a character to the terminal at the current cursor position.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param char - Character to write
 */
export function writeChar(world: World, eid: Entity, char: string): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;

	// Handle special characters
	if (char === '\n') {
		handleNewline(world, eid, state, width, height);
		return;
	}

	if (char === '\r') {
		TerminalBuffer.cursorX[eid] = 0;
		markDirty(world, eid);
		return;
	}

	if (char === '\b') {
		const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
		if (cursorX > 0) {
			TerminalBuffer.cursorX[eid] = cursorX - 1;
		}
		markDirty(world, eid);
		return;
	}

	if (char === '\t') {
		handleTab(world, eid, width);
		return;
	}

	// Write printable character
	writePrintableChar(world, eid, state, char, width, height);
}

/**
 * Writes a string to the terminal (processes escape sequences).
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param data - String to write
 */
export function writeToTerminal(world: World, eid: Entity, data: string): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	for (let i = 0; i < data.length; i++) {
		const char = data[i];
		if (char === undefined) continue;

		// Check for ESC character
		if (char === '\x1b') {
			state.inEscape = true;
			state.escapeBuffer = char;
			continue;
		}

		// If we're in an escape sequence
		if (state.inEscape) {
			state.escapeBuffer += char;

			// Check if escape sequence is complete
			if (isEscapeComplete(state.escapeBuffer)) {
				processEscapeSequence(world, eid, state, state.escapeBuffer, resetTerminal);
				state.inEscape = false;
				state.escapeBuffer = '';
			}
			continue;
		}

		// Regular character
		writeChar(world, eid, char);
	}
}

/**
 * Clears the terminal buffer.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function clearTerminal(world: World, eid: Entity): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	const clearCell = createCell();
	for (let i = 0; i < state.buffer.cells.length; i++) {
		state.buffer.cells[i] = cloneCell(clearCell);
	}

	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = 0;
	state.currentAttr = createAttribute();

	markDirty(world, eid);
}

/**
 * Resets the terminal to initial state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function resetTerminal(world: World, eid: Entity): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	clearTerminal(world, eid);
	clearScrollback(state.scrollback);
	state.escapeBuffer = '';
	state.inEscape = false;
	state.savedCursorX = 0;
	state.savedCursorY = 0;
	state.savedAttr = createAttribute();
	TerminalBuffer.cursorVisible[eid] = 1;
	TerminalBuffer.scrollOffset[eid] = 0;

	markDirty(world, eid);
}

/**
 * Sets cursor position.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param x - Column (0-indexed)
 * @param y - Row (0-indexed)
 */
export function setCursorPosition(world: World, eid: Entity, x: number, y: number): void {
	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;

	TerminalBuffer.cursorX[eid] = Math.min(Math.max(x, 0), width - 1);
	TerminalBuffer.cursorY[eid] = Math.min(Math.max(y, 0), height - 1);

	markDirty(world, eid);
}

/**
 * Sets cursor visibility.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param visible - Cursor visibility
 */
export function setCursorVisible(world: World, eid: Entity, visible: boolean): void {
	TerminalBuffer.cursorVisible[eid] = visible ? 1 : 0;
	markDirty(world, eid);
}

/**
 * Scrolls the terminal view up.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param lines - Number of lines to scroll
 */
export function scrollTerminalUp(world: World, eid: Entity, lines: number): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	const currentOffset = TerminalBuffer.scrollOffset[eid] ?? 0;
	const maxOffset = state.scrollback.totalLines;
	TerminalBuffer.scrollOffset[eid] = Math.min(currentOffset + lines, maxOffset);

	markDirty(world, eid);
}

/**
 * Scrolls the terminal view down.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param lines - Number of lines to scroll
 */
export function scrollTerminalDown(world: World, eid: Entity, lines: number): void {
	const currentOffset = TerminalBuffer.scrollOffset[eid] ?? 0;
	TerminalBuffer.scrollOffset[eid] = Math.max(0, currentOffset - lines);

	markDirty(world, eid);
}

/**
 * Scrolls to the top of history.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function scrollTerminalToTop(world: World, eid: Entity): void {
	const state = terminalStateMap.get(eid);
	if (!state) return;

	TerminalBuffer.scrollOffset[eid] = state.scrollback.totalLines;
	markDirty(world, eid);
}

/**
 * Scrolls to the bottom (current view).
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function scrollTerminalToBottom(world: World, eid: Entity): void {
	TerminalBuffer.scrollOffset[eid] = 0;
	markDirty(world, eid);
}

/**
 * Resizes the terminal buffer.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param width - New width in columns
 * @param height - New height in rows
 */
export function resizeTerminalBuffer(
	world: World,
	eid: Entity,
	width: number,
	height: number,
): void {
	const state = getTerminalState(eid);
	if (!state) return;

	const oldWidth = TerminalBuffer.width[eid] ?? 0;
	const oldHeight = TerminalBuffer.height[eid] ?? 0;

	// Create new buffer
	const newBuffer = createScreenBuffer(width, height);

	// Copy existing content
	const copyWidth = Math.min(oldWidth, width);
	const copyHeight = Math.min(oldHeight, height);

	for (let y = 0; y < copyHeight; y++) {
		for (let x = 0; x < copyWidth; x++) {
			const srcIdx = y * oldWidth + x;
			const dstIdx = y * width + x;
			const srcCell = state.buffer.cells[srcIdx];
			if (srcCell) {
				newBuffer.cells[dstIdx] = cloneCell(srcCell);
			}
		}
	}

	// Update state
	(state as { buffer: typeof newBuffer }).buffer = newBuffer;
	TerminalBuffer.width[eid] = width;
	TerminalBuffer.height[eid] = height;

	// Clamp cursor
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	const cursorY = TerminalBuffer.cursorY[eid] ?? 0;
	TerminalBuffer.cursorX[eid] = Math.min(cursorX, width - 1);
	TerminalBuffer.cursorY[eid] = Math.min(cursorY, height - 1);

	markDirty(world, eid);
}
