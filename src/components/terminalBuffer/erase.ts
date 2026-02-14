/**
 * Display erasing functions for TerminalBuffer.
 *
 * @module components/terminalBuffer/erase
 */

import type { Entity, World } from '../../core/types';
import { cloneCell, createCell } from '../../terminal/screen/cell';
import { clearScrollback } from '../../utils/virtualScrollback';
import { markDirty } from '../renderable';
import { TerminalBuffer } from './component';
import type { TerminalState } from './types';

// =============================================================================
// DISPLAY ERASING
// =============================================================================

/**
 * Clears cells in a range.
 */
export function clearCellRange(state: TerminalState, startIdx: number, endIdx: number): void {
	const clearCell = createCell();
	for (let i = startIdx; i < endIdx; i++) {
		state.buffer.cells[i] = cloneCell(clearCell);
	}
}

/**
 * Clears a line segment.
 */
export function clearLineSegment(
	state: TerminalState,
	width: number,
	y: number,
	startX: number,
	endX: number,
): void {
	const clearCell = createCell();
	for (let x = startX; x <= endX; x++) {
		const idx = y * width + x;
		state.buffer.cells[idx] = cloneCell(clearCell);
	}
}

/**
 * Clears entire lines.
 */
export function clearLines(
	state: TerminalState,
	width: number,
	startY: number,
	endY: number,
): void {
	const clearCell = createCell();
	for (let y = startY; y < endY; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			state.buffer.cells[idx] = cloneCell(clearCell);
		}
	}
}

/**
 * Erases from cursor to end of display.
 */
export function eraseCursorToEnd(
	state: TerminalState,
	width: number,
	height: number,
	cursorX: number,
	cursorY: number,
): void {
	// Clear current line from cursor
	clearLineSegment(state, width, cursorY, cursorX, width - 1);
	// Clear lines below
	clearLines(state, width, cursorY + 1, height);
}

/**
 * Erases from start to cursor.
 */
export function eraseStartToCursor(
	state: TerminalState,
	width: number,
	cursorX: number,
	cursorY: number,
): void {
	// Clear lines above
	clearLines(state, width, 0, cursorY);
	// Clear current line up to cursor
	clearLineSegment(state, width, cursorY, 0, cursorX);
}

/**
 * Erases part of the display.
 */
export function eraseInDisplay(
	world: World,
	eid: Entity,
	state: TerminalState,
	mode: number,
): void {
	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	const cursorY = TerminalBuffer.cursorY[eid] ?? 0;

	if (mode === 0) {
		// Clear from cursor to end
		eraseCursorToEnd(state, width, height, cursorX, cursorY);
	} else if (mode === 1) {
		// Clear from start to cursor
		eraseStartToCursor(state, width, cursorX, cursorY);
	} else if (mode === 2 || mode === 3) {
		// Clear entire display
		clearCellRange(state, 0, state.buffer.cells.length);
		if (mode === 3) {
			clearScrollback(state.scrollback);
		}
	}

	markDirty(world, eid);
}

/**
 * Erases part of the current line.
 */
export function eraseInLine(world: World, eid: Entity, state: TerminalState, mode: number): void {
	const width = TerminalBuffer.width[eid] ?? 0;
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	const cursorY = TerminalBuffer.cursorY[eid] ?? 0;
	const clearCell = createCell();

	switch (mode) {
		case 0: // Clear from cursor to end of line
			for (let x = cursorX; x < width; x++) {
				const idx = cursorY * width + x;
				state.buffer.cells[idx] = cloneCell(clearCell);
			}
			break;
		case 1: // Clear from start of line to cursor
			for (let x = 0; x <= cursorX; x++) {
				const idx = cursorY * width + x;
				state.buffer.cells[idx] = cloneCell(clearCell);
			}
			break;
		case 2: // Clear entire line
			for (let x = 0; x < width; x++) {
				const idx = cursorY * width + x;
				state.buffer.cells[idx] = cloneCell(clearCell);
			}
			break;
	}
	markDirty(world, eid);
}
