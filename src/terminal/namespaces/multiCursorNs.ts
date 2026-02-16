/**
 * Multi-cursor overlay namespace.
 *
 * Functions for managing collaborative cursor overlays and selection highlights
 * for multi-user editing scenarios.
 *
 * @example
 * ```typescript
 * import { multiCursorNs } from 'blecsd/terminal';
 *
 * // Create overlay manager
 * const manager = multiCursorNs.createOverlayManager(config);
 *
 * // Add session overlays for collaborative users
 * multiCursorNs.addSessionOverlay(manager, 'user-1', {
 *   color: '#FF0000',
 *   label: 'Alice',
 * });
 * multiCursorNs.addSessionOverlay(manager, 'user-2', {
 *   color: '#00FF00',
 *   label: 'Bob',
 * });
 *
 * // Set cursor positions
 * multiCursorNs.setCursorOverlay(manager, 'user-1', { x: 10, y: 5 });
 * multiCursorNs.setCursorOverlay(manager, 'user-2', { x: 20, y: 10 });
 *
 * // Set selections
 * multiCursorNs.setSelectionOverlay(manager, 'user-1', {
 *   start: { x: 0, y: 0 },
 *   end: { x: 10, y: 5 },
 * });
 *
 * // Render overlays
 * const ansi = multiCursorNs.renderOverlaysToAnsi(manager, buffer);
 * ```
 */

import {
	addSessionOverlay,
	buildFocusMap,
	clearCursorOverlay,
	clearSelectionOverlay,
	createOverlayManager,
	cursorCellToAnsi,
	cursorLabelToAnsi,
	getActiveCursors,
	getOverlayState,
	getSessionOverlay,
	getSessionOverlayCount,
	getSessionsFocusingEntity,
	MultiCursor,
	onOverlayEvent,
	pruneInactiveCursors,
	removeSessionOverlay,
	renderCursorLabels,
	renderCursorOverlays,
	renderOverlaysToAnsi,
	resetOverlayState,
	setCursorOverlay,
	setFocusOverlay,
	setLabelVisibility,
	setSelectionOverlay,
} from '../multiCursor';

/**
 * Multi-cursor overlay namespace.
 */
export const multiCursorNs = Object.freeze({
	addSessionOverlay,
	buildFocusMap,
	clearCursorOverlay,
	clearSelectionOverlay,
	createOverlayManager,
	cursorCellToAnsi,
	cursorLabelToAnsi,
	getActiveCursors,
	getOverlayState,
	getSessionOverlay,
	getSessionOverlayCount,
	getSessionsFocusingEntity,
	MultiCursor: Object.freeze(MultiCursor),
	onOverlayEvent,
	pruneInactiveCursors,
	removeSessionOverlay,
	renderCursorLabels,
	renderCursorOverlays,
	renderOverlaysToAnsi,
	resetOverlayState,
	setCursorOverlay,
	setFocusOverlay,
	setLabelVisibility,
	setSelectionOverlay,
});

export type MultiCursorNsModule = typeof multiCursorNs;
