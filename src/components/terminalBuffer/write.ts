/**
 * Character writing functions for TerminalBuffer.
 *
 * @module components/terminalBuffer/write
 */

import type { Entity, World } from '../../core/types';
import { createCell } from '../../terminal/screen/cell';
import { markDirty } from '../renderable';
import { TerminalBuffer } from './component';
import { attrToCell, cellIndex, scrollUp } from './state';
import type { TerminalState } from './types';

// =============================================================================
// CHARACTER WRITING
// =============================================================================

/**
 * Handles newline character.
 */
export function handleNewline(
	world: World,
	eid: Entity,
	state: TerminalState,
	width: number,
	height: number,
): void {
	let cursorY = (TerminalBuffer.cursorY[eid] ?? 0) + 1;
	if (cursorY >= height) {
		scrollUp(state, width, height);
		cursorY = height - 1;
	}
	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = cursorY;
	markDirty(world, eid);
}

/**
 * Handles tab character.
 */
export function handleTab(world: World, eid: Entity, width: number): void {
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	const nextTab = Math.min((Math.floor(cursorX / 8) + 1) * 8, width - 1);
	TerminalBuffer.cursorX[eid] = nextTab;
	markDirty(world, eid);
}

/**
 * Writes a printable character and advances cursor.
 */
export function writePrintableChar(
	world: World,
	eid: Entity,
	state: TerminalState,
	char: string,
	width: number,
	height: number,
): void {
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	let cursorY = TerminalBuffer.cursorY[eid] ?? 0;

	// Write the character to the buffer
	const { fg, bg, attrs } = attrToCell(state.currentAttr);
	const idx = cellIndex(width, cursorX, cursorY);
	state.buffer.cells[idx] = createCell(char, fg, bg, attrs);

	// Advance cursor
	let newCursorX = cursorX + 1;
	if (newCursorX >= width) {
		newCursorX = 0;
		cursorY++;
		if (cursorY >= height) {
			scrollUp(state, width, height);
			cursorY = height - 1;
		}
	}

	TerminalBuffer.cursorX[eid] = newCursorX;
	TerminalBuffer.cursorY[eid] = cursorY;
	markDirty(world, eid);
}
