/**
 * Multi-Cursor Overlay System for Collaborative Terminal Sessions
 *
 * Provides per-session entity overlays for cursor positions, focus state,
 * and selection state. When multiple users connect to the same session,
 * each gets their own cursor rendered as a colored marker overlaid on
 * the shared widget tree.
 *
 * @module terminal/multiCursor
 *
 * @example
 * ```typescript
 * import {
 *   createOverlayManager,
 *   addSessionOverlay,
 *   setCursorOverlay,
 *   setFocusOverlay,
 *   renderCursorOverlays,
 * } from 'blecsd';
 *
 * const manager = createOverlayManager();
 * addSessionOverlay(manager, 'session-1', 'Alice', 1);
 * setCursorOverlay(manager, 'session-1', 10, 5);
 * setFocusOverlay(manager, 'session-1', entityId);
 *
 * const overlays = renderCursorOverlays(manager, 80, 24);
 * ```
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cursor position in terminal coordinates.
 */
export interface CursorPosition {
	readonly x: number;
	readonly y: number;
}

/**
 * Selection range for a session overlay.
 */
export interface OverlaySelection {
	/** Start position */
	readonly startLine: number;
	readonly startCol: number;
	/** End position */
	readonly endLine: number;
	readonly endCol: number;
	/** Selection mode */
	readonly mode: 'stream' | 'rectangular';
}

/**
 * Per-session overlay state: cursor, focus, and selection.
 */
export interface SessionOverlay {
	/** Session identifier */
	readonly sessionId: string;
	/** User display name */
	readonly name: string;
	/** ANSI color index for this user's cursor */
	readonly color: number;
	/** Cursor position, or null if not set */
	readonly cursor: CursorPosition | null;
	/** Entity ID the user has focused, or null */
	readonly focusedEntity: number | null;
	/** Active text selection, or null */
	readonly selection: OverlaySelection | null;
	/** Timestamp of last cursor update */
	readonly lastUpdate: number;
	/** Whether cursor label should be shown */
	readonly showLabel: boolean;
}

/**
 * Rendered cursor overlay for a single cell.
 */
export interface CursorCell {
	/** Terminal column (0-indexed) */
	readonly x: number;
	/** Terminal row (0-indexed) */
	readonly y: number;
	/** ANSI color index */
	readonly color: number;
	/** The cell character (cursor marker or selection highlight) */
	readonly char: string;
	/** Session ID of the owner */
	readonly sessionId: string;
	/** Whether this is a cursor (vs selection highlight) */
	readonly isCursor: boolean;
}

/**
 * Rendered name label for a cursor.
 */
export interface CursorLabel {
	/** Terminal column (0-indexed) */
	readonly x: number;
	/** Terminal row (0-indexed) */
	readonly y: number;
	/** Label text (usually user name) */
	readonly text: string;
	/** ANSI color index */
	readonly color: number;
	/** Session ID of the owner */
	readonly sessionId: string;
}

/**
 * Overlay manager state.
 */
export interface OverlayManager {
	/** All session overlays by session ID */
	readonly sessions: ReadonlyMap<string, SessionOverlay>;
	/** Configuration */
	readonly config: Required<OverlayConfig>;
}

/**
 * Overlay event types.
 */
export type OverlayEvent =
	| {
			readonly type: 'cursor_set';
			readonly sessionId: string;
			readonly x: number;
			readonly y: number;
	  }
	| { readonly type: 'cursor_cleared'; readonly sessionId: string }
	| { readonly type: 'focus_set'; readonly sessionId: string; readonly entityId: number }
	| { readonly type: 'focus_cleared'; readonly sessionId: string }
	| {
			readonly type: 'selection_set';
			readonly sessionId: string;
			readonly selection: OverlaySelection;
	  }
	| { readonly type: 'selection_cleared'; readonly sessionId: string }
	| { readonly type: 'session_added'; readonly sessionId: string; readonly name: string }
	| { readonly type: 'session_removed'; readonly sessionId: string };

/**
 * Overlay event handler.
 */
export type OverlayEventHandler = (event: OverlayEvent) => void;

/**
 * Overlay manager configuration.
 */
export interface OverlayConfig {
	/** Show name labels next to cursors (default: true) */
	readonly showLabels?: boolean;
	/** Auto-hide cursor after this many ms of inactivity (default: 0 = never) */
	readonly cursorHideTimeout?: number;
	/** Cursor character for remote users (default: '\u2588' = full block) */
	readonly cursorChar?: string;
	/** Selection highlight character (default: ' ' with inverse) */
	readonly selectionChar?: string;
	/** Maximum label length (default: 12) */
	readonly maxLabelLength?: number;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for overlay configuration.
 */
export const OverlayConfigSchema = z.object({
	showLabels: z.boolean().optional(),
	cursorHideTimeout: z.number().int().nonnegative().optional(),
	cursorChar: z.string().length(1).optional(),
	selectionChar: z.string().length(1).optional(),
	maxLabelLength: z.number().int().min(1).max(50).optional(),
});

// =============================================================================
// STATE
// =============================================================================

/** Mutable session overlay */
interface MutableOverlay {
	sessionId: string;
	name: string;
	color: number;
	cursor: CursorPosition | null;
	focusedEntity: number | null;
	selection: OverlaySelection | null;
	lastUpdate: number;
	showLabel: boolean;
}

/** Module state */
let sessions: Map<string, MutableOverlay> = new Map();
let handlers: OverlayEventHandler[] = [];
let overlayConfig: Required<OverlayConfig> = {
	showLabels: true,
	cursorHideTimeout: 0,
	cursorChar: '\u2588',
	selectionChar: ' ',
	maxLabelLength: 12,
};

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Emit an overlay event to all handlers.
 */
function emitOverlayEvent(event: OverlayEvent): void {
	for (const handler of handlers) {
		handler(event);
	}
}

/**
 * Convert mutable overlay to readonly snapshot.
 */
function toSessionOverlay(overlay: MutableOverlay): SessionOverlay {
	return {
		sessionId: overlay.sessionId,
		name: overlay.name,
		color: overlay.color,
		cursor: overlay.cursor,
		focusedEntity: overlay.focusedEntity,
		selection: overlay.selection,
		lastUpdate: overlay.lastUpdate,
		showLabel: overlay.showLabel,
	};
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Creates an overlay manager with optional configuration.
 *
 * @param config - Optional configuration
 * @returns Overlay manager state
 *
 * @example
 * ```typescript
 * const manager = createOverlayManager({ showLabels: true });
 * ```
 */
export function createOverlayManager(config: OverlayConfig = {}): OverlayManager {
	if (config.showLabels !== undefined || config.cursorHideTimeout !== undefined) {
		OverlayConfigSchema.parse(config);
	}

	overlayConfig = {
		showLabels: config.showLabels ?? true,
		cursorHideTimeout: config.cursorHideTimeout ?? 0,
		cursorChar: config.cursorChar ?? '\u2588',
		selectionChar: config.selectionChar ?? ' ',
		maxLabelLength: config.maxLabelLength ?? 12,
	};
	sessions = new Map();
	handlers = [];

	return getOverlayState();
}

/**
 * Get current overlay manager state.
 *
 * @returns Readonly overlay state
 */
export function getOverlayState(): OverlayManager {
	const readonlySessions = new Map<string, SessionOverlay>();
	for (const [id, overlay] of sessions) {
		readonlySessions.set(id, toSessionOverlay(overlay));
	}
	return {
		sessions: readonlySessions,
		config: overlayConfig,
	};
}

/**
 * Register an overlay event handler.
 *
 * @param handler - Event handler function
 * @returns Unsubscribe function
 */
export function onOverlayEvent(handler: OverlayEventHandler): () => void {
	handlers.push(handler);
	return () => {
		handlers = handlers.filter((h) => h !== handler);
	};
}

/**
 * Add a session overlay for a user.
 *
 * @param sessionId - Unique session identifier
 * @param name - Display name
 * @param color - ANSI color index
 * @returns The new session overlay
 *
 * @example
 * ```typescript
 * const overlay = addSessionOverlay('s1', 'Alice', 1);
 * ```
 */
export function addSessionOverlay(sessionId: string, name: string, color: number): SessionOverlay {
	const overlay: MutableOverlay = {
		sessionId,
		name,
		color,
		cursor: null,
		focusedEntity: null,
		selection: null,
		lastUpdate: Date.now(),
		showLabel: overlayConfig.showLabels,
	};

	sessions.set(sessionId, overlay);
	emitOverlayEvent({ type: 'session_added', sessionId, name });

	return toSessionOverlay(overlay);
}

/**
 * Remove a session overlay.
 *
 * @param sessionId - Session to remove
 */
export function removeSessionOverlay(sessionId: string): void {
	if (!sessions.has(sessionId)) {
		return;
	}
	sessions.delete(sessionId);
	emitOverlayEvent({ type: 'session_removed', sessionId });
}

/**
 * Set cursor position for a session.
 *
 * @param sessionId - Session ID
 * @param x - Column position (0-indexed)
 * @param y - Row position (0-indexed)
 *
 * @example
 * ```typescript
 * setCursorOverlay('s1', 10, 5);
 * ```
 */
export function setCursorOverlay(sessionId: string, x: number, y: number): void {
	const overlay = sessions.get(sessionId);
	if (!overlay) {
		return;
	}

	overlay.cursor = { x, y };
	overlay.lastUpdate = Date.now();
	emitOverlayEvent({ type: 'cursor_set', sessionId, x, y });
}

/**
 * Clear cursor position for a session.
 *
 * @param sessionId - Session ID
 */
export function clearCursorOverlay(sessionId: string): void {
	const overlay = sessions.get(sessionId);
	if (!overlay) {
		return;
	}

	overlay.cursor = null;
	emitOverlayEvent({ type: 'cursor_cleared', sessionId });
}

/**
 * Set which entity a session user has focused.
 *
 * @param sessionId - Session ID
 * @param entityId - Entity to focus, or null to clear
 */
export function setFocusOverlay(sessionId: string, entityId: number | null): void {
	const overlay = sessions.get(sessionId);
	if (!overlay) {
		return;
	}

	overlay.focusedEntity = entityId;
	overlay.lastUpdate = Date.now();

	if (entityId !== null) {
		emitOverlayEvent({ type: 'focus_set', sessionId, entityId });
	} else {
		emitOverlayEvent({ type: 'focus_cleared', sessionId });
	}
}

/**
 * Set selection range for a session.
 *
 * @param sessionId - Session ID
 * @param selection - Selection range
 */
export function setSelectionOverlay(sessionId: string, selection: OverlaySelection): void {
	const overlay = sessions.get(sessionId);
	if (!overlay) {
		return;
	}

	overlay.selection = selection;
	overlay.lastUpdate = Date.now();
	emitOverlayEvent({ type: 'selection_set', sessionId, selection });
}

/**
 * Clear selection for a session.
 *
 * @param sessionId - Session ID
 */
export function clearSelectionOverlay(sessionId: string): void {
	const overlay = sessions.get(sessionId);
	if (!overlay) {
		return;
	}

	overlay.selection = null;
	emitOverlayEvent({ type: 'selection_cleared', sessionId });
}

/**
 * Toggle cursor label visibility for a session.
 *
 * @param sessionId - Session ID
 * @param show - Whether to show label
 */
export function setLabelVisibility(sessionId: string, show: boolean): void {
	const overlay = sessions.get(sessionId);
	if (!overlay) {
		return;
	}
	overlay.showLabel = show;
}

/**
 * Get a specific session overlay.
 *
 * @param sessionId - Session ID
 * @returns Session overlay or null
 */
export function getSessionOverlay(sessionId: string): SessionOverlay | null {
	const overlay = sessions.get(sessionId);
	if (!overlay) {
		return null;
	}
	return toSessionOverlay(overlay);
}

/**
 * Get all session overlays that have cursors set.
 *
 * @returns Array of overlays with active cursors
 */
export function getActiveCursors(): readonly SessionOverlay[] {
	const result: SessionOverlay[] = [];
	for (const overlay of sessions.values()) {
		if (overlay.cursor !== null) {
			result.push(toSessionOverlay(overlay));
		}
	}
	return result;
}

/**
 * Get all sessions that have a specific entity focused.
 *
 * @param entityId - Entity ID to check
 * @returns Array of session IDs focusing this entity
 */
export function getSessionsFocusingEntity(entityId: number): readonly string[] {
	const result: string[] = [];
	for (const overlay of sessions.values()) {
		if (overlay.focusedEntity === entityId) {
			result.push(overlay.sessionId);
		}
	}
	return result;
}

/**
 * Get the number of active session overlays.
 *
 * @returns Session count
 */
export function getSessionOverlayCount(): number {
	return sessions.size;
}

/**
 * Prune cursors that haven't been updated within the hide timeout.
 * Only runs if cursorHideTimeout > 0.
 *
 * @returns Number of cursors hidden
 */
export function pruneInactiveCursors(): number {
	if (overlayConfig.cursorHideTimeout <= 0) {
		return 0;
	}

	const now = Date.now();
	const threshold = overlayConfig.cursorHideTimeout;
	let pruned = 0;

	for (const overlay of sessions.values()) {
		if (overlay.cursor !== null && now - overlay.lastUpdate > threshold) {
			overlay.cursor = null;
			pruned += 1;
			emitOverlayEvent({ type: 'cursor_cleared', sessionId: overlay.sessionId });
		}
	}

	return pruned;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Render all cursor overlays as cell data for compositing onto the terminal buffer.
 *
 * @param width - Terminal width
 * @param height - Terminal height
 * @param excludeSessionId - Optional session to exclude (the local user)
 * @returns Array of cursor cells to overlay
 *
 * @example
 * ```typescript
 * const cells = renderCursorOverlays(80, 24, 'local-session');
 * for (const cell of cells) {
 *   // Composite cell onto terminal buffer at (cell.x, cell.y)
 * }
 * ```
 */
export function renderCursorOverlays(
	width: number,
	height: number,
	excludeSessionId?: string,
): readonly CursorCell[] {
	const cells: CursorCell[] = [];

	for (const overlay of sessions.values()) {
		if (excludeSessionId && overlay.sessionId === excludeSessionId) {
			continue;
		}

		// Render cursor
		if (overlay.cursor !== null) {
			const { x, y } = overlay.cursor;
			if (x >= 0 && x < width && y >= 0 && y < height) {
				cells.push({
					x,
					y,
					color: overlay.color,
					char: overlayConfig.cursorChar,
					sessionId: overlay.sessionId,
					isCursor: true,
				});
			}
		}

		// Render selection
		if (overlay.selection !== null) {
			const selCells = renderSelectionCells(overlay, width, height);
			for (const cell of selCells) {
				cells.push(cell);
			}
		}
	}

	return cells;
}

/**
 * Render selection cells for a single overlay.
 */
function renderSelectionCells(
	overlay: MutableOverlay,
	width: number,
	height: number,
): CursorCell[] {
	const sel = overlay.selection;
	if (!sel) {
		return [];
	}

	const cells: CursorCell[] = [];

	// Normalize start/end
	const startLine = Math.min(sel.startLine, sel.endLine);
	const endLine = Math.min(Math.max(sel.startLine, sel.endLine), height - 1);

	if (startLine > endLine || startLine >= height) {
		return cells;
	}

	if (sel.mode === 'rectangular') {
		const leftCol = Math.min(sel.startCol, sel.endCol);
		const rightCol = Math.min(Math.max(sel.startCol, sel.endCol), width - 1);
		for (let row = Math.max(0, startLine); row <= endLine; row++) {
			for (let col = Math.max(0, leftCol); col <= rightCol; col++) {
				cells.push({
					x: col,
					y: row,
					color: overlay.color,
					char: overlayConfig.selectionChar,
					sessionId: overlay.sessionId,
					isCursor: false,
				});
			}
		}
	} else {
		// Stream selection
		for (let row = Math.max(0, startLine); row <= endLine; row++) {
			let colStart: number;
			let colEnd: number;

			if (row === startLine && row === endLine) {
				// Single line
				colStart = Math.max(0, Math.min(sel.startCol, sel.endCol));
				colEnd = Math.min(Math.max(sel.startCol, sel.endCol), width - 1);
			} else if (row === startLine) {
				const normalizedStartCol = sel.startLine <= sel.endLine ? sel.startCol : sel.endCol;
				colStart = Math.max(0, normalizedStartCol);
				colEnd = width - 1;
			} else if (row === endLine) {
				colStart = 0;
				const normalizedEndCol = sel.startLine <= sel.endLine ? sel.endCol : sel.startCol;
				colEnd = Math.min(normalizedEndCol, width - 1);
			} else {
				// Middle line: full width
				colStart = 0;
				colEnd = width - 1;
			}

			for (let col = colStart; col <= colEnd; col++) {
				cells.push({
					x: col,
					y: row,
					color: overlay.color,
					char: overlayConfig.selectionChar,
					sessionId: overlay.sessionId,
					isCursor: false,
				});
			}
		}
	}

	return cells;
}

/**
 * Render cursor labels for display near each cursor.
 * Labels are positioned one row above the cursor. If that's off-screen,
 * they're placed one row below.
 *
 * @param width - Terminal width
 * @param height - Terminal height
 * @param excludeSessionId - Optional session to exclude
 * @returns Array of cursor labels
 */
export function renderCursorLabels(
	width: number,
	height: number,
	excludeSessionId?: string,
): readonly CursorLabel[] {
	const labels: CursorLabel[] = [];

	for (const overlay of sessions.values()) {
		if (excludeSessionId && overlay.sessionId === excludeSessionId) {
			continue;
		}
		if (!overlay.cursor || !overlay.showLabel) {
			continue;
		}

		const { x, y } = overlay.cursor;
		if (x < 0 || x >= width || y < 0 || y >= height) {
			continue;
		}

		// Truncate name
		let labelText = overlay.name;
		if (labelText.length > overlayConfig.maxLabelLength) {
			labelText = `${labelText.slice(0, overlayConfig.maxLabelLength - 1)}\u2026`;
		}

		// Position: prefer above cursor, fallback to below
		const labelY = y > 0 ? y - 1 : Math.min(y + 1, height - 1);

		// Ensure label fits within width
		const labelX = Math.min(x, width - labelText.length);

		labels.push({
			x: Math.max(0, labelX),
			y: labelY,
			text: labelText,
			color: overlay.color,
			sessionId: overlay.sessionId,
		});
	}

	return labels;
}

/**
 * Generate ANSI escape sequences for rendering a cursor overlay cell.
 *
 * @param cell - The cursor cell to render
 * @returns ANSI escape sequence string
 */
export function cursorCellToAnsi(cell: CursorCell): string {
	// Move cursor to position (1-indexed)
	const move = `\x1b[${cell.y + 1};${cell.x + 1}H`;

	if (cell.isCursor) {
		// Cursor: use the color as foreground, render the cursor char
		return `${move}\x1b[38;5;${cell.color}m${cell.char}\x1b[0m`;
	}

	// Selection: use inverse with user color as background
	return `${move}\x1b[48;5;${cell.color}m${cell.char}\x1b[0m`;
}

/**
 * Generate ANSI escape sequences for a cursor label.
 *
 * @param label - The cursor label to render
 * @returns ANSI escape sequence string
 */
export function cursorLabelToAnsi(label: CursorLabel): string {
	const move = `\x1b[${label.y + 1};${label.x + 1}H`;
	// Render label with user color as background, black text
	return `${move}\x1b[30;48;5;${label.color}m${label.text}\x1b[0m`;
}

/**
 * Render all overlays as a single ANSI string for compositing.
 * This is a convenience function that combines cells and labels.
 *
 * @param width - Terminal width
 * @param height - Terminal height
 * @param excludeSessionId - Optional session to exclude
 * @returns ANSI escape sequence string
 */
export function renderOverlaysToAnsi(
	width: number,
	height: number,
	excludeSessionId?: string,
): string {
	const cells = renderCursorOverlays(width, height, excludeSessionId);
	const labels = renderCursorLabels(width, height, excludeSessionId);

	if (cells.length === 0 && labels.length === 0) {
		return '';
	}

	const parts: string[] = [];

	for (const cell of cells) {
		parts.push(cursorCellToAnsi(cell));
	}

	for (const label of labels) {
		parts.push(cursorLabelToAnsi(label));
	}

	return parts.join('');
}

/**
 * Build a focus indicator map showing which entities are focused by which sessions.
 * Useful for rendering focus borders/highlights on shared widgets.
 *
 * @returns Map from entity ID to array of session overlays focusing it
 */
export function buildFocusMap(): ReadonlyMap<number, readonly SessionOverlay[]> {
	const focusMap = new Map<number, SessionOverlay[]>();

	for (const overlay of sessions.values()) {
		if (overlay.focusedEntity === null) {
			continue;
		}

		let list = focusMap.get(overlay.focusedEntity);
		if (!list) {
			list = [];
			focusMap.set(overlay.focusedEntity, list);
		}
		list.push(toSessionOverlay(overlay));
	}

	return focusMap;
}

/**
 * Reset all overlay state. Used for testing.
 */
export function resetOverlayState(): void {
	sessions = new Map();
	handlers = [];
	overlayConfig = {
		showLabels: true,
		cursorHideTimeout: 0,
		cursorChar: '\u2588',
		selectionChar: ' ',
		maxLabelLength: 12,
	};
}

/**
 * MultiCursor namespace for convenient access.
 *
 * @example
 * ```typescript
 * import { MultiCursor } from 'blecsd';
 *
 * MultiCursor.create();
 * MultiCursor.addSession('s1', 'Alice', 1);
 * MultiCursor.setCursor('s1', 10, 5);
 * ```
 */
export const MultiCursor = {
	create: createOverlayManager,
	getState: getOverlayState,
	onEvent: onOverlayEvent,
	addSession: addSessionOverlay,
	removeSession: removeSessionOverlay,
	setCursor: setCursorOverlay,
	clearCursor: clearCursorOverlay,
	setFocus: setFocusOverlay,
	setSelection: setSelectionOverlay,
	clearSelection: clearSelectionOverlay,
	setLabelVisibility,
	getSession: getSessionOverlay,
	getActiveCursors,
	getSessionsFocusing: getSessionsFocusingEntity,
	getSessionCount: getSessionOverlayCount,
	pruneInactive: pruneInactiveCursors,
	renderCells: renderCursorOverlays,
	renderLabels: renderCursorLabels,
	renderToAnsi: renderOverlaysToAnsi,
	cellToAnsi: cursorCellToAnsi,
	labelToAnsi: cursorLabelToAnsi,
	buildFocusMap,
	reset: resetOverlayState,
} as const;
