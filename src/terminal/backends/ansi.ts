/**
 * ANSI Render Backend
 *
 * Standard ANSI escape sequence renderer for 2D TUI output.
 * This is the default backend that works with virtually all modern terminals.
 * Extracted from the outputSystem's ANSI generation logic.
 *
 * @module terminal/backends/ansi
 *
 * @example
 * ```typescript
 * import { createAnsiBackend } from 'blecsd';
 *
 * const backend = createAnsiBackend();
 * backend.init();
 *
 * const output = backend.renderBuffer(changes, 80, 24);
 * process.stdout.write(output);
 * ```
 */

import { Attr } from '../screen/cell';
import type { RenderBackend, RenderBackendCapabilities, RenderCell } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const CSI = '\x1b[';

const SGR = {
	RESET: 0,
	BOLD: 1,
	DIM: 2,
	ITALIC: 3,
	UNDERLINE: 4,
	BLINK: 5,
	INVERSE: 7,
	HIDDEN: 8,
	STRIKETHROUGH: 9,
	FG_256: 38,
	BG_256: 48,
} as const;

// =============================================================================
// ANSI SEQUENCE HELPERS
// =============================================================================

function sgr(...codes: number[]): string {
	return `${CSI}${codes.join(';')}m`;
}

function moveCursor(x: number, y: number): string {
	return `${CSI}${y + 1};${x + 1}H`;
}

function moveColumn(x: number): string {
	return `${CSI}${x + 1}G`;
}

function cursorForward(n: number): string {
	if (n === 1) return `${CSI}C`;
	return `${CSI}${n}C`;
}

function unpackColor(color: number): { r: number; g: number; b: number; a: number } {
	return {
		a: (color >>> 24) & 0xff,
		r: (color >>> 16) & 0xff,
		g: (color >>> 8) & 0xff,
		b: color & 0xff,
	};
}

function fgColor(color: number): string {
	const { r, g, b, a } = unpackColor(color);
	if (a === 0) return sgr(39); // Default fg
	return sgr(SGR.FG_256, 2, r, g, b);
}

function bgColor(color: number): string {
	const { r, g, b, a } = unpackColor(color);
	if (a === 0) return sgr(49); // Default bg
	return sgr(SGR.BG_256, 2, r, g, b);
}

function attrsSequence(attrs: number): string {
	const codes: number[] = [];
	if (attrs === Attr.NONE) return '';

	if (attrs & Attr.BOLD) codes.push(SGR.BOLD);
	if (attrs & Attr.DIM) codes.push(SGR.DIM);
	if (attrs & Attr.ITALIC) codes.push(SGR.ITALIC);
	if (attrs & Attr.UNDERLINE) codes.push(SGR.UNDERLINE);
	if (attrs & Attr.BLINK) codes.push(SGR.BLINK);
	if (attrs & Attr.INVERSE) codes.push(SGR.INVERSE);
	if (attrs & Attr.HIDDEN) codes.push(SGR.HIDDEN);
	if (attrs & Attr.STRIKETHROUGH) codes.push(SGR.STRIKETHROUGH);

	if (codes.length === 0) return '';
	return sgr(...codes);
}

// =============================================================================
// RENDER STATE
// =============================================================================

interface RenderState {
	lastX: number;
	lastY: number;
	lastFg: number;
	lastBg: number;
	lastAttrs: number;
}

function createRenderState(): RenderState {
	return { lastX: -1, lastY: -1, lastFg: -1, lastBg: -1, lastAttrs: -1 };
}

// =============================================================================
// ANSI BACKEND
// =============================================================================

/**
 * ANSI backend configuration options.
 */
export interface AnsiBackendConfig {
	/** Enable truecolor output (default: true) */
	readonly truecolor?: boolean;
}

/**
 * Creates an ANSI render backend.
 *
 * The ANSI backend generates standard ANSI escape sequences for rendering
 * cell-based terminal UIs. It supports truecolor, text attributes,
 * and optimized cursor movement.
 *
 * @param config - Optional configuration
 * @returns A new RenderBackend using ANSI escape sequences
 *
 * @example
 * ```typescript
 * import { createAnsiBackend } from 'blecsd';
 *
 * const backend = createAnsiBackend();
 * console.log(backend.name); // 'ansi'
 * console.log(backend.detect()); // true (always supported)
 *
 * const initSeq = backend.init();
 * process.stdout.write(initSeq);
 * ```
 */
export function createAnsiBackend(config?: AnsiBackendConfig): RenderBackend {
	const truecolor = config?.truecolor ?? true;
	let state = createRenderState();

	const capabilities: RenderBackendCapabilities = {
		truecolor,
		images: false,
		synchronizedOutput: false,
		styledUnderlines: false,
	};

	return {
		name: 'ansi',
		capabilities,

		detect(): boolean {
			// ANSI is universally supported in modern terminals
			return true;
		},

		init(): string {
			state = createRenderState();
			// Enter alternate screen and hide cursor
			return `${CSI}?1049h${CSI}?25l`;
		},

		renderBuffer(changes: readonly RenderCell[]): string {
			if (changes.length === 0) return '';

			// Sort by row then column for optimal cursor movement
			const sorted = [...changes].sort((a, b) => {
				if (a.y !== b.y) return a.y - b.y;
				return a.x - b.x;
			});

			let output = '';

			for (const change of sorted) {
				const { x, y, cell } = change;

				// Cursor movement
				output += generateCursorMove(state, x, y);

				// Style changes
				output += generateStyleChanges(state, cell.fg, cell.bg, cell.attrs);

				// Character
				output += cell.char;

				// Update cursor position (advance by 1 for single-width char)
				state.lastX = x + 1;
				state.lastY = y;
			}

			return output;
		},

		cleanup(): string {
			state = createRenderState();
			// Reset attributes, show cursor, leave alternate screen
			return `${sgr(SGR.RESET)}${CSI}?25h${CSI}?1049l`;
		},
	};
}

/**
 * Generates optimal cursor movement sequence.
 * @internal
 */
function generateCursorMove(state: RenderState, x: number, y: number): string {
	if (state.lastX === x && state.lastY === y) return '';

	if (state.lastY === y) {
		const diff = x - state.lastX;
		if (diff === 1) return ''; // Implicit advance
		if (diff > 0 && diff <= 4) return cursorForward(diff);
		return moveColumn(x);
	}

	return moveCursor(x, y);
}

/**
 * Generates style change sequences.
 * @internal
 */
function generateStyleChanges(state: RenderState, fg: number, bg: number, attrs: number): string {
	let output = '';

	// Handle attribute changes with reset if needed
	const needsReset = state.lastAttrs !== -1 && state.lastAttrs !== Attr.NONE && attrs === Attr.NONE;

	if (needsReset) {
		output += sgr(SGR.RESET);
		state.lastFg = -1;
		state.lastBg = -1;
		state.lastAttrs = -1;
	}

	if (attrs !== state.lastAttrs && attrs !== Attr.NONE) {
		if (state.lastAttrs !== -1 && state.lastAttrs !== Attr.NONE) {
			output += sgr(SGR.RESET);
			state.lastFg = -1;
			state.lastBg = -1;
		}
		output += attrsSequence(attrs);
		state.lastAttrs = attrs;
	} else if (attrs === Attr.NONE && state.lastAttrs === -1) {
		state.lastAttrs = Attr.NONE;
	}

	// Foreground color
	if (fg !== state.lastFg) {
		output += fgColor(fg);
		state.lastFg = fg;
	}

	// Background color
	if (bg !== state.lastBg) {
		output += bgColor(bg);
		state.lastBg = bg;
	}

	return output;
}
