/**
 * TerminalBuffer state management functions.
 *
 * @module components/terminalBuffer/state
 */

import type { Entity, World } from '../../core/types';
import { type Attribute, createAttribute } from '../../terminal/ansi/parser';
import {
	type Cell,
	cloneCell,
	createCell,
	createScreenBuffer,
	DEFAULT_BG,
	DEFAULT_FG,
} from '../../terminal/screen/cell';
import {
	appendLine,
	createScrollbackBuffer,
	type ScrollbackConfig,
} from '../../utils/virtualScrollback';
import { markDirty } from '../renderable';
import { TerminalBuffer } from './component';
import type { CursorShape, TerminalState } from './types';
import { terminalStateMap } from './types';

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial terminal state.
 */
export function createTerminalState(
	width: number,
	height: number,
	scrollbackLines: number,
	cursorShape: CursorShape,
	cursorBlink: boolean,
): TerminalState {
	const scrollbackConfig: Partial<ScrollbackConfig> = {
		maxLines: scrollbackLines,
		chunkSize: Math.min(scrollbackLines, 1000),
	};

	return {
		buffer: createScreenBuffer(width, height),
		scrollback: createScrollbackBuffer(scrollbackConfig),
		currentAttr: createAttribute(),
		escapeBuffer: '',
		inEscape: false,
		savedCursorX: 0,
		savedCursorY: 0,
		savedAttr: createAttribute(),
		altBuffer: null,
		cursorShape,
		cursorBlink,
	};
}

/**
 * Gets the cell index in the buffer.
 */
export function cellIndex(width: number, x: number, y: number): number {
	return y * width + x;
}

/**
 * Converts internal Attribute to Cell colors/attrs.
 */
export function attrToCell(attr: Attribute): { fg: number; bg: number; attrs: number } {
	// Convert InternalColor to packed RGBA
	// For now, use simple mapping (can be enhanced later)
	let fg = DEFAULT_FG;
	let bg = DEFAULT_BG;

	// Basic 16-color mapping
	const basicColors = [
		0x000000ff, // black
		0xaa0000ff, // red
		0x00aa00ff, // green
		0xaaaa00ff, // yellow
		0x0000aaff, // blue
		0xaa00aaff, // magenta
		0x00aaaaff, // cyan
		0xaaaaaaff, // white
		0x555555ff, // bright black
		0xff5555ff, // bright red
		0x55ff55ff, // bright green
		0xffff55ff, // bright yellow
		0x5555ffff, // bright blue
		0xff55ffff, // bright magenta
		0x55ffffff, // bright cyan
		0xffffffff, // bright white
	];

	// Foreground color
	if (attr.fg.type === 1) {
		// BASIC
		fg = basicColors[attr.fg.value] ?? DEFAULT_FG;
	} else if (attr.fg.type === 3) {
		// RGB
		// Convert packed RGB to RGBA
		fg = (attr.fg.value << 8) | 0xff;
	}

	// Background color
	if (attr.bg.type === 1) {
		// BASIC
		bg = basicColors[attr.bg.value] ?? DEFAULT_BG;
	} else if (attr.bg.type === 3) {
		// RGB
		bg = (attr.bg.value << 8) | 0xff;
	}

	return { fg, bg, attrs: attr.styles };
}

/**
 * Scrolls the terminal buffer up by one line.
 */
export function scrollUp(state: TerminalState, width: number, height: number): void {
	// Save top line to scrollback
	const topLine = extractLine(state.buffer.cells, 0, width);
	appendLine(state.scrollback, topLine);

	// Shift all rows up
	for (let y = 0; y < height - 1; y++) {
		for (let x = 0; x < width; x++) {
			const srcIdx = (y + 1) * width + x;
			const dstIdx = y * width + x;
			const srcCell = state.buffer.cells[srcIdx];
			if (srcCell) {
				state.buffer.cells[dstIdx] = cloneCell(srcCell);
			}
		}
	}

	// Clear bottom line
	const clearCell = createCell();
	for (let x = 0; x < width; x++) {
		const idx = (height - 1) * width + x;
		state.buffer.cells[idx] = cloneCell(clearCell);
	}
}

/**
 * Extracts a line as text from the buffer.
 */
export function extractLine(cells: readonly Cell[], row: number, width: number): string {
	let line = '';
	for (let x = 0; x < width; x++) {
		const idx = row * width + x;
		const cell = cells[idx];
		line += cell?.char ?? ' ';
	}
	// Trim trailing spaces
	return line.trimEnd();
}

/**
 * Checks if an entity has a terminal buffer.
 *
 * @param eid - Entity ID
 * @returns true if the entity has a terminal buffer
 */
export function hasTerminalBuffer(eid: Entity): boolean {
	return TerminalBuffer.isTerminal[eid] === 1;
}

/**
 * Gets the terminal state for an entity.
 *
 * @param eid - Entity ID
 * @returns Terminal state or undefined
 */
export function getTerminalState(eid: Entity): TerminalState | undefined {
	return terminalStateMap.get(eid);
}

/**
 * Gets terminal buffer data (scalar values).
 *
 * @param eid - Entity ID
 * @returns Terminal buffer data
 */
export function getTerminalBuffer(eid: Entity):
	| {
			width: number;
			height: number;
			cursorX: number;
			cursorY: number;
			cursorVisible: boolean;
			scrollOffset: number;
	  }
	| undefined {
	if (!hasTerminalBuffer(eid)) {
		return undefined;
	}

	return {
		width: TerminalBuffer.width[eid] ?? 0,
		height: TerminalBuffer.height[eid] ?? 0,
		cursorX: TerminalBuffer.cursorX[eid] ?? 0,
		cursorY: TerminalBuffer.cursorY[eid] ?? 0,
		cursorVisible: TerminalBuffer.cursorVisible[eid] === 1,
		scrollOffset: TerminalBuffer.scrollOffset[eid] ?? 0,
	};
}

/**
 * Removes a terminal buffer from an entity.
 *
 * @param eid - Entity ID
 */
export function removeTerminalBuffer(eid: Entity): void {
	TerminalBuffer.isTerminal[eid] = 0;
	TerminalBuffer.width[eid] = 0;
	TerminalBuffer.height[eid] = 0;
	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = 0;
	TerminalBuffer.cursorVisible[eid] = 0;
	TerminalBuffer.scrollOffset[eid] = 0;
	TerminalBuffer.altScreenActive[eid] = 0;
	terminalStateMap.delete(eid);
}

/**
 * Resets the terminal buffer store (for testing).
 * @internal
 */
export function resetTerminalBufferStore(): void {
	TerminalBuffer.isTerminal.fill(0);
	TerminalBuffer.width.fill(0);
	TerminalBuffer.height.fill(0);
	TerminalBuffer.cursorX.fill(0);
	TerminalBuffer.cursorY.fill(0);
	TerminalBuffer.cursorVisible.fill(0);
	TerminalBuffer.scrollOffset.fill(0);
	TerminalBuffer.altScreenActive.fill(0);
	terminalStateMap.clear();
}

/**
 * Sets up a terminal buffer on an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param config - Terminal buffer configuration
 *
 * @example
 * ```typescript
 * setTerminalBuffer(world, eid, {
 *   width: 80,
 *   height: 24,
 *   scrollbackLines: 1000,
 * });
 * ```
 */
export function setTerminalBuffer(
	world: World,
	eid: Entity,
	validated: {
		width: number;
		height: number;
		scrollbackLines: number;
		cursorVisible: boolean;
		cursorShape: CursorShape;
		cursorBlink: boolean;
	},
): void {
	// Set scalar state
	TerminalBuffer.isTerminal[eid] = 1;
	TerminalBuffer.width[eid] = validated.width;
	TerminalBuffer.height[eid] = validated.height;
	TerminalBuffer.cursorX[eid] = 0;
	TerminalBuffer.cursorY[eid] = 0;
	TerminalBuffer.cursorVisible[eid] = validated.cursorVisible ? 1 : 0;
	TerminalBuffer.scrollOffset[eid] = 0;
	TerminalBuffer.altScreenActive[eid] = 0;

	// Set complex state
	const state = createTerminalState(
		validated.width,
		validated.height,
		validated.scrollbackLines,
		validated.cursorShape,
		validated.cursorBlink,
	);
	terminalStateMap.set(eid, state);

	markDirty(world, eid);
}
