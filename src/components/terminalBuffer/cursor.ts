/**
 * Cursor movement functions for TerminalBuffer.
 *
 * @module components/terminalBuffer/cursor
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import { TerminalBuffer } from './component';
import { scrollUp } from './state';
import type { TerminalState } from './types';

// =============================================================================
// CURSOR MOVEMENT
// =============================================================================

/**
 * Moves cursor up by n lines.
 */
export function moveCursorUp(world: World, eid: Entity, n: number): void {
	const cursorY = TerminalBuffer.cursorY[eid] ?? 0;
	TerminalBuffer.cursorY[eid] = Math.max(0, cursorY - n);
	markDirty(world, eid);
}

/**
 * Moves cursor down by n lines, scrolling if necessary.
 */
export function moveCursorDown(world: World, eid: Entity, state: TerminalState, n: number): void {
	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;
	let cursorY = TerminalBuffer.cursorY[eid] ?? 0;

	cursorY += n;
	while (cursorY >= height) {
		scrollUp(state, width, height);
		cursorY--;
	}
	TerminalBuffer.cursorY[eid] = cursorY;
	markDirty(world, eid);
}

/**
 * Moves cursor forward by n columns.
 */
export function moveCursorForward(world: World, eid: Entity, n: number, width: number): void {
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	TerminalBuffer.cursorX[eid] = Math.min(width - 1, cursorX + n);
	markDirty(world, eid);
}

/**
 * Moves cursor back by n columns.
 */
export function moveCursorBack(world: World, eid: Entity, n: number): void {
	const cursorX = TerminalBuffer.cursorX[eid] ?? 0;
	TerminalBuffer.cursorX[eid] = Math.max(0, cursorX - n);
	markDirty(world, eid);
}
