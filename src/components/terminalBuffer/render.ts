/**
 * Rendering functions for TerminalBuffer.
 *
 * @module components/terminalBuffer/render
 */

import type { Entity } from '../../core/types';
import type { Cell } from '../../terminal/screen/cell';
import { getLineRange } from '../../utils/virtualScrollback';
import { TerminalBuffer } from './component';
import { getTerminalState } from './state';

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders scrollback lines to ANSI string.
 */
function renderScrollbackLines(
	state: ReturnType<typeof getTerminalState>,
	height: number,
	scrollOffset: number,
): string {
	if (!state) return '';

	const scrollbackLines = getLineRange(
		state.scrollback,
		state.scrollback.totalLines - scrollOffset,
		state.scrollback.totalLines - scrollOffset + height,
	);

	let output = '';
	for (const line of scrollbackLines.lines) {
		output += line.ansi ?? line.text;
		output += '\n';
	}
	return output;
}

/**
 * Renders a single cell with color tracking.
 */
function renderCell(
	cell: Cell,
	lastColors: { fg: number; bg: number },
): { output: string; fg: number; bg: number } {
	let output = '';

	// Only emit color codes if they changed
	if (cell.fg !== lastColors.fg || cell.bg !== lastColors.bg) {
		output += '\x1b[0m'; // Reset
		// Would add full color conversion here
		lastColors.fg = cell.fg;
		lastColors.bg = cell.bg;
	}

	output += cell.char;
	return { output, fg: lastColors.fg, bg: lastColors.bg };
}

/**
 * Renders terminal buffer to an ANSI string (for display).
 *
 * @param eid - Entity ID
 * @returns ANSI string representation of the terminal
 */
export function renderTerminalToAnsi(eid: Entity): string {
	const state = getTerminalState(eid);
	if (!state) return '';

	const width = TerminalBuffer.width[eid] ?? 0;
	const height = TerminalBuffer.height[eid] ?? 0;
	const scrollOffset = TerminalBuffer.scrollOffset[eid] ?? 0;

	// If scrolled back, show scrollback content
	if (scrollOffset > 0) {
		return renderScrollbackLines(state, height, scrollOffset);
	}

	// Normal view: render buffer
	let output = '';
	const lastColors = { fg: -1, bg: -1 };

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			const cell = state.buffer.cells[idx];
			if (!cell) continue;

			const result = renderCell(cell, lastColors);
			output += result.output;
			lastColors.fg = result.fg;
			lastColors.bg = result.bg;
		}
		if (y < height - 1) {
			output += '\n';
		}
	}

	return output;
}

/**
 * Gets the cells for rendering.
 *
 * @param eid - Entity ID
 * @returns Readonly array of cells
 */
export function getTerminalCells(eid: Entity): readonly Cell[] | undefined {
	const state = getTerminalState(eid);
	return state?.buffer.cells;
}
