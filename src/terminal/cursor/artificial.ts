/**
 * Artificial Cursor System
 *
 * Provides a software-rendered cursor that bypasses the terminal's native
 * cursor. This is useful for:
 * - Games needing custom cursor shapes, colors, or behaviors
 * - Multi-cursor support
 * - Cursor rendering in non-standard positions
 * - Custom blink rates and patterns
 *
 * @module terminal/cursor/artificial
 *
 * @example
 * ```typescript
 * import {
 *   createArtificialCursor,
 *   renderCursor,
 *   updateCursorBlink,
 *   moveCursor,
 * } from 'blecsd';
 *
 * // Create a cursor
 * const cursor = createArtificialCursor({
 *   x: 10,
 *   y: 5,
 *   shape: 'block',
 *   blink: true,
 *   blinkRate: 530,
 * });
 *
 * // In render loop
 * function render(time: number) {
 *   const updated = updateCursorBlink(cursor, time);
 *   if (updated.visible && updated.blinkOn) {
 *     const cell = renderCursor(updated, originalCell);
 *     drawCell(cell, updated.x, updated.y);
 *   }
 * }
 * ```
 */

import type { Cell } from '../screen/cell';
import { Attr, createCell, DEFAULT_BG, DEFAULT_FG } from '../screen/cell';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cursor shape types.
 *
 * - `block`: Full cell coverage (most visible)
 * - `underline`: Bottom edge of cell
 * - `bar`: Left edge of cell (I-beam style)
 */
export type CursorShape = 'block' | 'underline' | 'bar';

/**
 * Artificial cursor state.
 */
export interface ArtificialCursor {
	/** X position (0-indexed column) */
	readonly x: number;
	/** Y position (0-indexed row) */
	readonly y: number;
	/** Whether cursor is visible */
	readonly visible: boolean;
	/** Cursor shape */
	readonly shape: CursorShape;
	/** Whether cursor blinks */
	readonly blink: boolean;
	/** Blink rate in milliseconds (time for one on/off cycle) */
	readonly blinkRate: number;
	/** Custom foreground color (packed RGBA, or undefined for inverse) */
	readonly fgColor?: number;
	/** Custom background color (packed RGBA, or undefined for inverse) */
	readonly bgColor?: number;
	/** Last blink toggle timestamp */
	readonly lastBlinkTime: number;
	/** Current blink state (on/off) */
	readonly blinkOn: boolean;
	/** Cursor ID for multi-cursor support */
	readonly id: string;
}

/**
 * Options for creating an artificial cursor.
 */
export interface ArtificialCursorOptions {
	/** Initial X position (default: 0) */
	readonly x?: number;
	/** Initial Y position (default: 0) */
	readonly y?: number;
	/** Initial visibility (default: true) */
	readonly visible?: boolean;
	/** Cursor shape (default: 'block') */
	readonly shape?: CursorShape;
	/** Enable blinking (default: true) */
	readonly blink?: boolean;
	/** Blink rate in milliseconds (default: 530ms, standard terminal rate) */
	readonly blinkRate?: number;
	/** Custom foreground color (packed RGBA) */
	readonly fgColor?: number;
	/** Custom background color (packed RGBA) */
	readonly bgColor?: number;
	/** Cursor ID for multi-cursor (default: auto-generated) */
	readonly id?: string;
}

/**
 * Rendered cursor cell for a specific shape.
 */
export interface RenderedCursor {
	/** The cell to render */
	readonly cell: Cell;
	/** Whether this render affects the full cell or partial */
	readonly fullCell: boolean;
}

// =============================================================================
// CURSOR ID GENERATION
// =============================================================================

let cursorIdCounter = 0;

/**
 * Generate a unique cursor ID.
 * @internal
 */
function generateCursorId(): string {
	return `cursor_${++cursorIdCounter}`;
}

/**
 * Reset cursor ID counter (for testing).
 * @internal
 */
export function resetCursorIdCounter(): void {
	cursorIdCounter = 0;
}

// =============================================================================
// CURSOR CREATION
// =============================================================================

/**
 * Creates a new artificial cursor.
 *
 * @param options - Cursor options
 * @returns A new ArtificialCursor
 *
 * @example
 * ```typescript
 * import { createArtificialCursor } from 'blecsd';
 *
 * // Basic cursor
 * const cursor = createArtificialCursor();
 *
 * // Customized cursor
 * const customCursor = createArtificialCursor({
 *   x: 10,
 *   y: 5,
 *   shape: 'underline',
 *   blink: true,
 *   blinkRate: 400,
 *   fgColor: 0xff0000ff, // Red
 * });
 * ```
 */
export function createArtificialCursor(options: ArtificialCursorOptions = {}): ArtificialCursor {
	return {
		x: options.x ?? 0,
		y: options.y ?? 0,
		visible: options.visible ?? true,
		shape: options.shape ?? 'block',
		blink: options.blink ?? true,
		blinkRate: options.blinkRate ?? 530, // Standard terminal blink rate
		fgColor: options.fgColor,
		bgColor: options.bgColor,
		lastBlinkTime: 0,
		blinkOn: true,
		id: options.id ?? generateCursorId(),
	};
}

// =============================================================================
// CURSOR UPDATES
// =============================================================================

/**
 * Moves the cursor to a new position.
 *
 * @param cursor - The cursor to move
 * @param x - New X position
 * @param y - New Y position
 * @returns Updated cursor
 *
 * @example
 * ```typescript
 * import { moveCursor } from 'blecsd';
 *
 * cursor = moveCursor(cursor, 15, 10);
 * ```
 */
export function moveCursor(cursor: ArtificialCursor, x: number, y: number): ArtificialCursor {
	return {
		...cursor,
		x,
		y,
	};
}

/**
 * Moves the cursor by a delta.
 *
 * @param cursor - The cursor to move
 * @param dx - X delta
 * @param dy - Y delta
 * @returns Updated cursor
 *
 * @example
 * ```typescript
 * import { moveCursorBy } from 'blecsd';
 *
 * cursor = moveCursorBy(cursor, 1, 0);  // Move right
 * cursor = moveCursorBy(cursor, 0, -1); // Move up
 * ```
 */
export function moveCursorBy(cursor: ArtificialCursor, dx: number, dy: number): ArtificialCursor {
	return {
		...cursor,
		x: cursor.x + dx,
		y: cursor.y + dy,
	};
}

/**
 * Sets cursor visibility.
 *
 * @param cursor - The cursor to update
 * @param visible - New visibility state
 * @returns Updated cursor
 *
 * @example
 * ```typescript
 * import { setCursorVisible } from 'blecsd';
 *
 * cursor = setCursorVisible(cursor, false); // Hide cursor
 * ```
 */
export function setCursorVisible(cursor: ArtificialCursor, visible: boolean): ArtificialCursor {
	return {
		...cursor,
		visible,
	};
}

/**
 * Sets cursor shape.
 *
 * @param cursor - The cursor to update
 * @param shape - New cursor shape
 * @returns Updated cursor
 *
 * @example
 * ```typescript
 * import { setCursorShape } from 'blecsd';
 *
 * cursor = setCursorShape(cursor, 'underline');
 * ```
 */
export function setCursorShape(cursor: ArtificialCursor, shape: CursorShape): ArtificialCursor {
	return {
		...cursor,
		shape,
	};
}

/**
 * Sets cursor blink state.
 *
 * @param cursor - The cursor to update
 * @param blink - Whether to enable blinking
 * @param rate - Optional blink rate in milliseconds
 * @returns Updated cursor
 *
 * @example
 * ```typescript
 * import { setCursorBlink } from 'blecsd';
 *
 * cursor = setCursorBlink(cursor, true, 400);
 * ```
 */
export function setCursorBlink(
	cursor: ArtificialCursor,
	blink: boolean,
	rate?: number,
): ArtificialCursor {
	return {
		...cursor,
		blink,
		blinkRate: rate ?? cursor.blinkRate,
		blinkOn: blink ? cursor.blinkOn : true, // Reset to on if disabled
	};
}

/**
 * Sets cursor colors.
 *
 * @param cursor - The cursor to update
 * @param fgColor - Foreground color (packed RGBA) or undefined for inverse
 * @param bgColor - Background color (packed RGBA) or undefined for inverse
 * @returns Updated cursor
 *
 * @example
 * ```typescript
 * import { setCursorColors, packColor } from 'blecsd';
 *
 * // Red cursor
 * cursor = setCursorColors(cursor, packColor(255, 0, 0), undefined);
 *
 * // Reset to inverse (default)
 * cursor = setCursorColors(cursor, undefined, undefined);
 * ```
 */
export function setCursorColors(
	cursor: ArtificialCursor,
	fgColor?: number,
	bgColor?: number,
): ArtificialCursor {
	return {
		...cursor,
		fgColor,
		bgColor,
	};
}

// =============================================================================
// BLINK HANDLING
// =============================================================================

/**
 * Updates cursor blink state based on elapsed time.
 *
 * Call this every frame with the current timestamp.
 *
 * @param cursor - The cursor to update
 * @param currentTime - Current timestamp in milliseconds (e.g., performance.now())
 * @returns Updated cursor with new blink state
 *
 * @example
 * ```typescript
 * import { updateCursorBlink } from 'blecsd';
 *
 * function gameLoop() {
 *   cursor = updateCursorBlink(cursor, performance.now());
 *   // ... render cursor if blinkOn
 * }
 * ```
 */
export function updateCursorBlink(
	cursor: ArtificialCursor,
	currentTime: number,
): ArtificialCursor {
	if (!cursor.blink) {
		return cursor;
	}

	const halfPeriod = cursor.blinkRate / 2;
	const elapsed = currentTime - cursor.lastBlinkTime;

	if (elapsed >= halfPeriod) {
		return {
			...cursor,
			blinkOn: !cursor.blinkOn,
			lastBlinkTime: currentTime,
		};
	}

	return cursor;
}

/**
 * Forces cursor blink state to on.
 * Useful when showing cursor after user input (restart blink cycle).
 *
 * @param cursor - The cursor to update
 * @param currentTime - Current timestamp
 * @returns Updated cursor
 *
 * @example
 * ```typescript
 * import { resetCursorBlink } from 'blecsd';
 *
 * // On keypress, reset blink to visible
 * cursor = resetCursorBlink(cursor, performance.now());
 * ```
 */
export function resetCursorBlink(
	cursor: ArtificialCursor,
	currentTime: number,
): ArtificialCursor {
	return {
		...cursor,
		blinkOn: true,
		lastBlinkTime: currentTime,
	};
}

/**
 * Checks if cursor should currently be visible (considering blink state).
 *
 * @param cursor - The cursor to check
 * @returns true if cursor should be rendered
 *
 * @example
 * ```typescript
 * import { isCursorVisible } from 'blecsd';
 *
 * if (isCursorVisible(cursor)) {
 *   renderCursorCell(cursor);
 * }
 * ```
 */
export function isCursorVisible(cursor: ArtificialCursor): boolean {
	if (!cursor.visible) {
		return false;
	}
	if (!cursor.blink) {
		return true;
	}
	return cursor.blinkOn;
}

// =============================================================================
// CURSOR RENDERING
// =============================================================================

/**
 * Block cursor character (full block unicode).
 */
export const BLOCK_CURSOR_CHAR = '\u2588';

/**
 * Underline cursor character (lower one eighth block).
 */
export const UNDERLINE_CURSOR_CHAR = '\u2581';

/**
 * Bar cursor character (left one eighth block).
 */
export const BAR_CURSOR_CHAR = '\u258F';

/**
 * Renders a cursor cell by applying cursor styling to an existing cell.
 *
 * For block cursors, the character is preserved but colors are inverted.
 * For underline and bar cursors, a special character is overlaid.
 *
 * @param cursor - The cursor to render
 * @param originalCell - The cell at the cursor position (for character/color reference)
 * @returns Rendered cursor cell
 *
 * @example
 * ```typescript
 * import { renderCursor, isCursorVisible } from 'blecsd';
 *
 * if (isCursorVisible(cursor)) {
 *   const cell = renderCursor(cursor, getCell(cursor.x, cursor.y));
 *   setCell(cursor.x, cursor.y, cell.cell);
 * }
 * ```
 */
export function renderCursor(cursor: ArtificialCursor, originalCell?: Cell): RenderedCursor {
	const baseCell = originalCell ?? createCell();
	const char = baseCell.char || ' ';

	// Determine colors
	let fg: number;
	let bg: number;

	if (cursor.fgColor !== undefined && cursor.bgColor !== undefined) {
		// Custom colors
		fg = cursor.fgColor;
		bg = cursor.bgColor;
	} else {
		// Inverse colors (swap fg/bg)
		fg = baseCell.bg || DEFAULT_BG;
		bg = baseCell.fg || DEFAULT_FG;
	}

	switch (cursor.shape) {
		case 'block':
			// Block cursor: show character with inverted colors
			return {
				cell: {
					char,
					fg,
					bg,
					attrs: baseCell.attrs,
				},
				fullCell: true,
			};

		case 'underline':
			// Underline cursor: draw underline character at bottom
			// Use combining underline or special char
			return {
				cell: {
					char: UNDERLINE_CURSOR_CHAR,
					fg: cursor.fgColor ?? (baseCell.fg || DEFAULT_FG),
					bg: baseCell.bg,
					attrs: baseCell.attrs,
				},
				fullCell: false,
			};

		case 'bar':
			// Bar cursor: draw vertical bar on left
			return {
				cell: {
					char: BAR_CURSOR_CHAR,
					fg: cursor.fgColor ?? (baseCell.fg || DEFAULT_FG),
					bg: baseCell.bg,
					attrs: baseCell.attrs,
				},
				fullCell: false,
			};
	}
}

/**
 * Creates a cell for rendering the cursor character only (no original cell data).
 *
 * @param cursor - The cursor to render
 * @returns A cell representing just the cursor
 *
 * @example
 * ```typescript
 * import { createCursorCell } from 'blecsd';
 *
 * const cursorCell = createCursorCell(cursor);
 * ```
 */
export function createCursorCell(cursor: ArtificialCursor): Cell {
	const fg = cursor.fgColor ?? DEFAULT_FG;
	const bg = cursor.bgColor ?? DEFAULT_BG;

	switch (cursor.shape) {
		case 'block':
			return {
				char: BLOCK_CURSOR_CHAR,
				fg,
				bg,
				attrs: Attr.NONE,
			};
		case 'underline':
			return {
				char: UNDERLINE_CURSOR_CHAR,
				fg,
				bg,
				attrs: Attr.NONE,
			};
		case 'bar':
			return {
				char: BAR_CURSOR_CHAR,
				fg,
				bg,
				attrs: Attr.NONE,
			};
	}
}

// =============================================================================
// MULTI-CURSOR SUPPORT
// =============================================================================

/**
 * Multi-cursor manager for handling multiple cursors.
 */
export interface CursorManager {
	/** All managed cursors by ID */
	readonly cursors: ReadonlyMap<string, ArtificialCursor>;
	/** ID of the primary (main) cursor */
	readonly primaryId: string;
}

/**
 * Creates a new cursor manager.
 *
 * @param primaryCursor - Optional primary cursor (created if not provided)
 * @returns A new CursorManager
 *
 * @example
 * ```typescript
 * import { createCursorManager, createArtificialCursor } from 'blecsd';
 *
 * const manager = createCursorManager();
 *
 * // Or with custom primary cursor
 * const manager2 = createCursorManager(createArtificialCursor({ x: 10, y: 5 }));
 * ```
 */
export function createCursorManager(primaryCursor?: ArtificialCursor): CursorManager {
	const primary = primaryCursor ?? createArtificialCursor();
	const cursors = new Map<string, ArtificialCursor>();
	cursors.set(primary.id, primary);

	return {
		cursors,
		primaryId: primary.id,
	};
}

/**
 * Gets the primary cursor from a manager.
 *
 * @param manager - The cursor manager
 * @returns The primary cursor
 */
export function getPrimaryCursor(manager: CursorManager): ArtificialCursor {
	const cursor = manager.cursors.get(manager.primaryId);
	if (!cursor) {
		throw new Error(`Primary cursor ${manager.primaryId} not found`);
	}
	return cursor;
}

/**
 * Adds a cursor to the manager.
 *
 * @param manager - The cursor manager
 * @param cursor - The cursor to add
 * @returns Updated manager
 *
 * @example
 * ```typescript
 * import { addCursor, createArtificialCursor } from 'blecsd';
 *
 * const secondCursor = createArtificialCursor({ x: 20, y: 10 });
 * manager = addCursor(manager, secondCursor);
 * ```
 */
export function addCursor(manager: CursorManager, cursor: ArtificialCursor): CursorManager {
	const newCursors = new Map(manager.cursors);
	newCursors.set(cursor.id, cursor);

	return {
		...manager,
		cursors: newCursors,
	};
}

/**
 * Removes a cursor from the manager.
 *
 * @param manager - The cursor manager
 * @param cursorId - ID of cursor to remove
 * @returns Updated manager
 * @throws Error if trying to remove the primary cursor
 */
export function removeCursor(manager: CursorManager, cursorId: string): CursorManager {
	if (cursorId === manager.primaryId) {
		throw new Error('Cannot remove primary cursor');
	}

	const newCursors = new Map(manager.cursors);
	newCursors.delete(cursorId);

	return {
		...manager,
		cursors: newCursors,
	};
}

/**
 * Updates a cursor in the manager.
 *
 * @param manager - The cursor manager
 * @param cursor - Updated cursor (matched by ID)
 * @returns Updated manager
 */
export function updateCursorInManager(
	manager: CursorManager,
	cursor: ArtificialCursor,
): CursorManager {
	const newCursors = new Map(manager.cursors);
	newCursors.set(cursor.id, cursor);

	return {
		...manager,
		cursors: newCursors,
	};
}

/**
 * Gets all visible cursors from the manager.
 *
 * @param manager - The cursor manager
 * @returns Array of visible cursors
 */
export function getVisibleCursors(manager: CursorManager): ArtificialCursor[] {
	return Array.from(manager.cursors.values()).filter(isCursorVisible);
}

/**
 * Updates blink state for all cursors in the manager.
 *
 * @param manager - The cursor manager
 * @param currentTime - Current timestamp
 * @returns Updated manager
 */
export function updateAllCursorBlinks(
	manager: CursorManager,
	currentTime: number,
): CursorManager {
	const newCursors = new Map<string, ArtificialCursor>();

	for (const [id, cursor] of manager.cursors) {
		newCursors.set(id, updateCursorBlink(cursor, currentTime));
	}

	return {
		...manager,
		cursors: newCursors,
	};
}

/**
 * Gets cursor at a specific position.
 *
 * @param manager - The cursor manager
 * @param x - X position
 * @param y - Y position
 * @returns Cursor at position, or undefined
 */
export function getCursorAt(
	manager: CursorManager,
	x: number,
	y: number,
): ArtificialCursor | undefined {
	for (const cursor of manager.cursors.values()) {
		if (cursor.x === x && cursor.y === y && cursor.visible) {
			return cursor;
		}
	}
	return undefined;
}

// =============================================================================
// TERMINAL CURSOR INTEGRATION
// =============================================================================

/**
 * Escape sequence to hide the terminal's native cursor.
 */
export const HIDE_TERMINAL_CURSOR = '\x1b[?25l';

/**
 * Escape sequence to show the terminal's native cursor.
 */
export const SHOW_TERMINAL_CURSOR = '\x1b[?25h';

/**
 * Gets the escape sequence to hide the terminal cursor.
 * Use when switching to artificial cursor mode.
 *
 * @returns Escape sequence string
 */
export function hideTerminalCursor(): string {
	return HIDE_TERMINAL_CURSOR;
}

/**
 * Gets the escape sequence to show the terminal cursor.
 * Use when switching back from artificial cursor mode.
 *
 * @returns Escape sequence string
 */
export function showTerminalCursor(): string {
	return SHOW_TERMINAL_CURSOR;
}
