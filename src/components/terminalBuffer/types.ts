/**
 * TerminalBuffer type definitions.
 *
 * @module components/terminalBuffer/types
 */

import type { Entity } from '../../core/types';
import type { Attribute } from '../../terminal/ansi/parser';
import type { ScreenBufferData } from '../../terminal/screen/cell';
import type { ScrollbackBuffer } from '../../utils/virtualScrollback';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

/**
 * Terminal state stored in a Map for complex data.
 */
export interface TerminalState {
	/** Cell buffer (2D grid in row-major order) */
	readonly buffer: ScreenBufferData;
	/** Scrollback history */
	readonly scrollback: ScrollbackBuffer;
	/** Current text attributes for new characters */
	currentAttr: Attribute;
	/** Partial escape sequence buffer */
	escapeBuffer: string;
	/** Whether we're in the middle of parsing an escape sequence */
	inEscape: boolean;
	/** Saved cursor position X */
	savedCursorX: number;
	/** Saved cursor position Y */
	savedCursorY: number;
	/** Saved attributes */
	savedAttr: Attribute;
	/** Alternate screen buffer (for full-screen apps) */
	altBuffer: ScreenBufferData | null;
	/** Cursor shape: 'block' | 'underline' | 'bar' */
	cursorShape: CursorShape;
	/** Cursor blink enabled */
	cursorBlink: boolean;
}

/**
 * Cursor shape types.
 */
export type CursorShape = 'block' | 'underline' | 'bar';

/**
 * Map of entity ID to terminal state.
 */
export const terminalStateMap = new Map<Entity, TerminalState>();
