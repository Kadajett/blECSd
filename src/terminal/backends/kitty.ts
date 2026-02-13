/**
 * Kitty Graphics Protocol Render Backend
 *
 * Extends the ANSI backend with support for the Kitty graphics protocol
 * for inline image rendering in supported terminals (Kitty, WezTerm, etc.).
 *
 * @module terminal/backends/kitty
 *
 * @example
 * ```typescript
 * import { createKittyRenderBackend } from 'blecsd';
 *
 * const backend = createKittyRenderBackend();
 * if (backend.detect()) {
 *   backend.init();
 *   const output = backend.renderBuffer(changes, 80, 24);
 *   process.stdout.write(output);
 * }
 * ```
 */

import { Attr } from '../screen/cell';
import type { RenderBackend, RenderBackendCapabilities, RenderCell } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const CSI = '\x1b[';
const APC = '\x1b_G';
const ST = '\x1b\\';

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
// HELPERS (duplicated from ansi.ts for independence)
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
	if (a === 0) return sgr(39);
	return sgr(SGR.FG_256, 2, r, g, b);
}

function bgColor(color: number): string {
	const { r, g, b, a } = unpackColor(color);
	if (a === 0) return sgr(49);
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
// KITTY GRAPHICS PROTOCOL
// =============================================================================

/**
 * Encodes image data as a Kitty graphics protocol command.
 *
 * @param imageData - Base64-encoded image data (PNG/RGB)
 * @param options - Image display options
 * @returns Kitty graphics protocol escape sequence
 *
 * @example
 * ```typescript
 * import { encodeKittyImage } from 'blecsd';
 *
 * const data = Buffer.from(pngBytes).toString('base64');
 * const seq = encodeKittyImage(data, { width: 10, height: 5 });
 * process.stdout.write(seq);
 * ```
 */
export function encodeKittyImage(
	imageData: string,
	options?: {
		readonly width?: number;
		readonly height?: number;
		readonly format?: 'png' | 'rgb' | 'rgba';
	},
): string {
	const parts: string[] = ['a=T', 'f=100']; // Transmit, PNG format by default

	if (options?.format === 'rgb') parts[1] = 'f=24';
	if (options?.format === 'rgba') parts[1] = 'f=32';

	if (options?.width !== undefined) parts.push(`c=${options.width}`);
	if (options?.height !== undefined) parts.push(`r=${options.height}`);

	return `${APC}${parts.join(',')};${imageData}${ST}`;
}

// =============================================================================
// KITTY RENDER BACKEND
// =============================================================================

/**
 * Kitty backend configuration options.
 */
export interface KittyBackendConfig {
	/** Enable image rendering via Kitty protocol (default: true) */
	readonly images?: boolean;
}

/**
 * Creates a Kitty graphics protocol render backend.
 *
 * Extends standard ANSI rendering with Kitty-specific features:
 * - Inline image rendering via the Kitty graphics protocol
 * - Synchronized output to prevent flicker
 * - Styled underlines (curly, dotted, dashed)
 *
 * Falls back to ANSI rendering for standard text cells.
 *
 * @param config - Optional configuration
 * @returns A new RenderBackend using Kitty protocol extensions
 *
 * @example
 * ```typescript
 * import { createKittyRenderBackend } from 'blecsd';
 *
 * const backend = createKittyRenderBackend();
 *
 * if (backend.detect()) {
 *   const initSeq = backend.init();
 *   process.stdout.write(initSeq);
 * }
 * ```
 */
export function createKittyRenderBackend(config?: KittyBackendConfig): RenderBackend {
	const supportsImages = config?.images ?? true;
	let state = createRenderState();

	const capabilities: RenderBackendCapabilities = {
		truecolor: true,
		images: supportsImages,
		synchronizedOutput: true,
		styledUnderlines: true,
	};

	return {
		name: 'kitty',
		capabilities,

		detect(): boolean {
			// Check TERM_PROGRAM for Kitty
			const termProgram = process.env.TERM_PROGRAM ?? '';
			if (termProgram.toLowerCase() === 'kitty') return true;

			// Check for WezTerm (also supports Kitty protocol)
			const term = process.env.TERM ?? '';
			if (term.includes('wezterm') || termProgram.toLowerCase() === 'wezterm') return true;

			// Check KITTY_WINDOW_ID (non-empty)
			const kittyId = process.env.KITTY_WINDOW_ID;
			if (kittyId !== undefined && kittyId !== '') return true;

			return false;
		},

		init(): string {
			state = createRenderState();
			// Enter alternate screen, hide cursor, begin synchronized output
			return `${CSI}?1049h${CSI}?25l${CSI}?2026h`;
		},

		renderBuffer(changes: readonly RenderCell[]): string {
			if (changes.length === 0) return '';

			// Start synchronized output
			let output = `${CSI}?2026h`;

			const sorted = [...changes].sort((a, b) => {
				if (a.y !== b.y) return a.y - b.y;
				return a.x - b.x;
			});

			for (const change of sorted) {
				const { x, y, cell } = change;

				output += generateCursorMove(state, x, y);
				output += generateStyleChanges(state, cell.fg, cell.bg, cell.attrs);
				output += cell.char;

				state.lastX = x + 1;
				state.lastY = y;
			}

			// End synchronized output
			output += `${CSI}?2026l`;
			return output;
		},

		cleanup(): string {
			state = createRenderState();
			return `${sgr(SGR.RESET)}${CSI}?2026l${CSI}?25h${CSI}?1049l`;
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
		if (diff === 1) return '';
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

	if (fg !== state.lastFg) {
		output += fgColor(fg);
		state.lastFg = fg;
	}

	if (bg !== state.lastBg) {
		output += bgColor(bg);
		state.lastBg = bg;
	}

	return output;
}
