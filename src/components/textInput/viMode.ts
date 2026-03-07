/**
 * Vi/Vim mode for TextInput components.
 * Provides a vi-style modal editing state machine with normal, insert, visual, and command modes.
 * @module components/textInput/viMode
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import { isTextInput } from './behavior';
import { getCursorPos, setCursorPos, setSelection, clearSelection } from './cursor';
import { setCursorMode } from './cursor';
import { CursorMode } from './types';
import type { TextInputAction } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Vi mode states.
 */
export type ViModeState = 'normal' | 'insert' | 'visual' | 'command';

/**
 * Vi mode configuration for a text input entity.
 */
export interface ViModeConfig {
	/** Whether vi mode is enabled */
	enabled: boolean;
}

/**
 * Internal vi mode context per entity, tracking pending operators and counts.
 */
interface ViContext {
	/** Current vi mode */
	mode: ViModeState;
	/** Pending operator (d, c, y) waiting for a motion */
	pendingOperator: string | null;
	/** Numeric count prefix (e.g., 3w = move 3 words) */
	count: number;
	/** Partial key sequence buffer (e.g., 'g' waiting for second 'g') */
	keyBuffer: string;
	/** Last yanked text for paste */
	yankRegister: string;
	/** Visual mode anchor position */
	visualAnchor: number;
}

// =============================================================================
// Stores
// =============================================================================

/** Vi mode configuration per entity */
const viConfigStore = new Map<Entity, ViModeConfig>();

/** Vi mode runtime context per entity */
const viContextStore = new Map<Entity, ViContext>();

// =============================================================================
// Configuration
// =============================================================================

/**
 * Enables or disables vi mode on a text input entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param enabled - Whether to enable vi mode
 *
 * @example
 * ```typescript
 * setViMode(world, textbox, true);
 * ```
 */
export function setViMode(_world: World, eid: Entity, enabled: boolean): void {
	viConfigStore.set(eid, { enabled });
	if (enabled) {
		// Initialize context in normal mode with block cursor
		viContextStore.set(eid, createDefaultContext());
		setCursorMode(_world, eid, CursorMode.Block);
	} else {
		viContextStore.delete(eid);
	}
}

/**
 * Checks if vi mode is enabled for an entity.
 */
export function isViModeEnabled(_world: World, eid: Entity): boolean {
	return viConfigStore.get(eid)?.enabled ?? false;
}

/**
 * Gets the current vi mode state.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Current vi mode or null if vi mode is not enabled
 */
export function getViMode(_world: World, eid: Entity): ViModeState | null {
	const ctx = viContextStore.get(eid);
	return ctx?.mode ?? null;
}

/**
 * Gets the vi mode indicator string for display in the status area.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Mode indicator string (e.g., "-- NORMAL --", "-- INSERT --")
 */
export function getViModeIndicator(_world: World, eid: Entity): string {
	const ctx = viContextStore.get(eid);
	if (!ctx) return '';

	switch (ctx.mode) {
		case 'normal':
			return '-- NORMAL --';
		case 'insert':
			return '-- INSERT --';
		case 'visual':
			return '-- VISUAL --';
		case 'command':
			return '-- COMMAND --';
		default:
			return '';
	}
}

/**
 * Gets the content of the yank register (last yanked/deleted text).
 */
export function getViYankRegister(_world: World, eid: Entity): string {
	return viContextStore.get(eid)?.yankRegister ?? '';
}

// =============================================================================
// Vi Key Handling
// =============================================================================

/**
 * Result of processing a vi mode key press.
 * Can be a standard TextInputAction, a vi-specific command, or null (key consumed but no action needed).
 */
export type ViKeyResult = TextInputAction | null;

/**
 * Handles a key press in vi mode.
 * This should be called BEFORE the normal handleTextInputKeyPress when vi mode is enabled.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param keyName - Name of the key pressed
 * @param currentValue - Current text value
 * @param ctrl - Whether Ctrl key is pressed
 * @returns Action to take, or null if key was consumed internally
 *
 * @example
 * ```typescript
 * if (isViModeEnabled(world, eid)) {
 *   const action = handleViKeyPress(world, eid, keyName, value);
 *   if (action) { applyAction(action); }
 *   return; // vi mode consumed the key
 * }
 * // Fall through to normal handling
 * ```
 */
export function handleViKeyPress(
	world: World,
	eid: Entity,
	keyName: string,
	currentValue: string,
	_ctrl = false,
): ViKeyResult {
	if (!isTextInput(world, eid)) return null;

	const ctx = viContextStore.get(eid);
	if (!ctx) return null;

	switch (ctx.mode) {
		case 'normal':
			return handleNormalMode(world, eid, ctx, keyName, currentValue);
		case 'insert':
			return handleInsertMode(world, eid, ctx, keyName, currentValue);
		case 'visual':
			return handleVisualMode(world, eid, ctx, keyName, currentValue);
		case 'command':
			return handleCommandMode(world, eid, ctx, keyName, currentValue);
		default:
			return null;
	}
}

/**
 * Resets vi mode state (e.g., for testing).
 */
export function resetViModeStores(): void {
	viConfigStore.clear();
	viContextStore.clear();
}

// =============================================================================
// Internal: Context
// =============================================================================

function createDefaultContext(): ViContext {
	return {
		mode: 'normal',
		pendingOperator: null,
		count: 0,
		keyBuffer: '',
		yankRegister: '',
		visualAnchor: 0,
	};
}

function switchMode(world: World, eid: Entity, ctx: ViContext, mode: ViModeState): void {
	ctx.mode = mode;
	ctx.pendingOperator = null;
	ctx.count = 0;
	ctx.keyBuffer = '';

	// Update cursor style based on mode
	if (mode === 'normal' || mode === 'visual') {
		setCursorMode(world, eid, CursorMode.Block);
	} else {
		setCursorMode(world, eid, CursorMode.Line);
	}

	if (mode === 'visual') {
		ctx.visualAnchor = getCursorPos(world, eid);
	} else {
		clearSelection(world, eid);
	}

	markDirty(world, eid);
}

function getCount(ctx: ViContext): number {
	return ctx.count > 0 ? ctx.count : 1;
}

// =============================================================================
// Internal: Motion helpers
// =============================================================================

/** Find word boundary going forward (w motion). */
function findNextWordStart(text: string, pos: number): number {
	const len = text.length;
	if (pos >= len) return pos;

	let i = pos;
	// Skip current word chars
	if (/\w/.test(text[i]!)) {
		while (i < len && /\w/.test(text[i]!)) i++;
	} else if (!/\s/.test(text[i]!)) {
		// Punctuation
		while (i < len && !/\w/.test(text[i]!) && !/\s/.test(text[i]!)) i++;
	}
	// Skip whitespace
	while (i < len && /\s/.test(text[i]!)) i++;
	return i;
}

/** Find word boundary going backward (b motion). */
function findPrevWordStart(text: string, pos: number): number {
	if (pos <= 0) return 0;

	let i = pos - 1;
	// Skip whitespace
	while (i > 0 && /\s/.test(text[i]!)) i--;
	// Skip word chars or punctuation
	if (i >= 0 && /\w/.test(text[i]!)) {
		while (i > 0 && /\w/.test(text[i - 1]!)) i--;
	} else if (i >= 0 && !/\s/.test(text[i]!)) {
		while (i > 0 && !/\w/.test(text[i - 1]!) && !/\s/.test(text[i - 1]!)) i--;
	}
	return i;
}

/** Find end of current word (e motion). */
function findWordEnd(text: string, pos: number): number {
	const len = text.length;
	if (pos >= len - 1) return Math.max(0, len - 1);

	let i = pos + 1;
	// Skip whitespace
	while (i < len && /\s/.test(text[i]!)) i++;
	// Advance through word chars or punctuation
	if (i < len && /\w/.test(text[i]!)) {
		while (i < len - 1 && /\w/.test(text[i + 1]!)) i++;
	} else if (i < len && !/\s/.test(text[i]!)) {
		while (i < len - 1 && !/\w/.test(text[i + 1]!) && !/\s/.test(text[i + 1]!)) i++;
	}
	return i;
}

/** Find start of current line. */
function findLineStart(text: string, pos: number): number {
	let i = pos;
	while (i > 0 && text[i - 1] !== '\n') i--;
	return i;
}

/** Find end of current line. */
function findLineEnd(text: string, pos: number): number {
	let i = pos;
	while (i < text.length && text[i] !== '\n') i++;
	return i;
}

/** Find first non-whitespace on current line (^ motion). */
function findFirstNonWhitespace(text: string, pos: number): number {
	const lineStart = findLineStart(text, pos);
	let i = lineStart;
	while (i < text.length && text[i] !== '\n' && /\s/.test(text[i]!)) i++;
	return i;
}

/**
 * Resolve a motion key to a target position.
 * Returns the target position or null if the key is not a motion.
 */
function resolveMotion(
	world: World,
	eid: Entity,
	ctx: ViContext,
	key: string,
	text: string,
): number | null {
	const pos = getCursorPos(world, eid);
	const count = getCount(ctx);
	const len = text.length;

	switch (key) {
		case 'h':
		case 'left':
			return Math.max(0, pos - count);

		case 'l':
		case 'right':
			return Math.min(len > 0 ? len - 1 : 0, pos + count);

		case 'j':
		case 'down': {
			// Move down count lines
			let target = pos;
			for (let n = 0; n < count; n++) {
				const lineEnd = findLineEnd(text, target);
				if (lineEnd < len) target = lineEnd + 1;
			}
			return Math.min(target, len > 0 ? len - 1 : 0);
		}

		case 'k':
		case 'up': {
			// Move up count lines
			let target = pos;
			for (let n = 0; n < count; n++) {
				const lineStart = findLineStart(text, target);
				if (lineStart > 0) target = findLineStart(text, lineStart - 1);
			}
			return target;
		}

		case 'w': {
			let target = pos;
			for (let n = 0; n < count; n++) target = findNextWordStart(text, target);
			return Math.min(target, len);
		}

		case 'b': {
			let target = pos;
			for (let n = 0; n < count; n++) target = findPrevWordStart(text, target);
			return target;
		}

		case 'e': {
			let target = pos;
			for (let n = 0; n < count; n++) target = findWordEnd(text, target);
			return Math.min(target, len > 0 ? len - 1 : 0);
		}

		case '0':
			// If accumulating count digits and key is '0', it's a count digit, not motion
			if (ctx.count > 0) return null;
			return findLineStart(text, pos);

		case '^':
			return findFirstNonWhitespace(text, pos);

		case '$':
		case 'end':
			return Math.max(0, findLineEnd(text, pos) - 1);

		default:
			return null;
	}
}

// =============================================================================
// Internal: Mode handlers
// =============================================================================

function handleNormalMode(
	world: World,
	eid: Entity,
	ctx: ViContext,
	key: string,
	text: string,
): ViKeyResult {
	const pos = getCursorPos(world, eid);
	const len = text.length;

	// Handle 'gg' / 'G' (two-key sequences)
	if (ctx.keyBuffer === 'g') {
		ctx.keyBuffer = '';
		if (key === 'g') {
			// gg - go to beginning
			setCursorPos(world, eid, 0);
			return null;
		}
		// Unknown second key after g, ignore
		return null;
	}

	// Accumulate numeric count
	if (key >= '1' && key <= '9') {
		ctx.count = ctx.count * 10 + Number.parseInt(key, 10);
		return null;
	}
	if (key === '0' && ctx.count > 0) {
		ctx.count = ctx.count * 10;
		return null;
	}

	// If there's a pending operator, resolve the motion
	if (ctx.pendingOperator) {
		return handleOperatorMotion(world, eid, ctx, key, text);
	}

	// Mode switches
	switch (key) {
		case 'i':
			switchMode(world, eid, ctx, 'insert');
			return null;

		case 'a':
			switchMode(world, eid, ctx, 'insert');
			if (len > 0) setCursorPos(world, eid, Math.min(pos + 1, len));
			return null;

		case 'I':
			switchMode(world, eid, ctx, 'insert');
			setCursorPos(world, eid, findFirstNonWhitespace(text, pos));
			return null;

		case 'A':
			switchMode(world, eid, ctx, 'insert');
			setCursorPos(world, eid, findLineEnd(text, pos));
			return null;

		case 'o': {
			switchMode(world, eid, ctx, 'insert');
			const lineEnd = findLineEnd(text, pos);
			return { type: 'insert', char: '\n', position: lineEnd };
		}

		case 'O': {
			switchMode(world, eid, ctx, 'insert');
			const lineStart = findLineStart(text, pos);
			return { type: 'insert', char: '\n', position: lineStart };
		}

		case 'v':
			switchMode(world, eid, ctx, 'visual');
			return null;

		case ':':
			switchMode(world, eid, ctx, 'command');
			return null;

		case 'g':
			ctx.keyBuffer = 'g';
			return null;

		case 'G':
			setCursorPos(world, eid, Math.max(0, len - 1));
			ctx.count = 0;
			return null;

		// Operators
		case 'd':
			ctx.pendingOperator = 'd';
			return null;

		case 'c':
			ctx.pendingOperator = 'c';
			return null;

		case 'y':
			ctx.pendingOperator = 'y';
			return null;

		// Single-key editing
		case 'x': {
			const count = getCount(ctx);
			ctx.count = 0;
			if (pos < len) {
				const end = Math.min(pos + count, len);
				ctx.yankRegister = text.slice(pos, end);
				return { type: 'delete', start: pos, end };
			}
			return null;
		}

		case 'p': {
			ctx.count = 0;
			if (ctx.yankRegister) {
				const insertPos = Math.min(pos + 1, len);
				// Return a series of inserts - we'll return the first char insert
				// The caller's action application loop handles the full string via repeated calls.
				// For simplicity, return a single action that inserts the full yanked text.
				return { type: 'insert', char: ctx.yankRegister, position: insertPos };
			}
			return null;
		}

		case 'P': {
			ctx.count = 0;
			if (ctx.yankRegister) {
				return { type: 'insert', char: ctx.yankRegister, position: pos };
			}
			return null;
		}

		case 'escape':
			// Already in normal mode, clear any pending state
			ctx.pendingOperator = null;
			ctx.count = 0;
			ctx.keyBuffer = '';
			return null;

		default: {
			// Try as motion
			const target = resolveMotion(world, eid, ctx, key, text);
			if (target !== null) {
				setCursorPos(world, eid, target);
				ctx.count = 0;
				return null;
			}
			ctx.count = 0;
			return null;
		}
	}
}

function handleOperatorMotion(
	world: World,
	eid: Entity,
	ctx: ViContext,
	key: string,
	text: string,
): ViKeyResult {
	const pos = getCursorPos(world, eid);
	const op = ctx.pendingOperator!;
	const len = text.length;

	// Handle doubled operator (dd, cc, yy) - operates on whole line
	if (key === op) {
		const lineStart = findLineStart(text, pos);
		let lineEnd = findLineEnd(text, pos);
		// Include the newline if present
		if (lineEnd < len) lineEnd++;
		ctx.yankRegister = text.slice(lineStart, lineEnd);
		ctx.pendingOperator = null;
		ctx.count = 0;

		if (op === 'y') {
			// Yank only, no delete
			return null;
		}

		if (op === 'c') {
			switchMode(world, eid, ctx, 'insert');
		}

		setCursorPos(world, eid, lineStart);
		return { type: 'delete', start: lineStart, end: lineEnd };
	}

	// Resolve the motion
	const target = resolveMotion(world, eid, ctx, key, text);
	if (target === null) {
		// Invalid motion, cancel operator
		ctx.pendingOperator = null;
		ctx.count = 0;
		return null;
	}

	const start = Math.min(pos, target);
	// For motions like 'e' and 'w', the end is inclusive/exclusive depending on the motion.
	// 'w' goes to start of next word (exclusive), 'e' goes to end of word (inclusive).
	let end = Math.max(pos, target);
	if (key === 'e') end = Math.min(end + 1, len); // e is inclusive
	if (key === 'w') end = Math.min(end, len); // w is exclusive (target is already at next word)

	ctx.yankRegister = text.slice(start, end);
	ctx.pendingOperator = null;
	ctx.count = 0;

	if (op === 'y') {
		return null;
	}

	if (op === 'c') {
		switchMode(world, eid, ctx, 'insert');
	}

	setCursorPos(world, eid, start);
	return { type: 'delete', start, end };
}

function handleInsertMode(
	world: World,
	eid: Entity,
	ctx: ViContext,
	key: string,
	_currentValue: string,
): ViKeyResult {
	if (key === 'escape') {
		// Return to normal mode, move cursor back one (vi convention)
		const pos = getCursorPos(world, eid);
		if (pos > 0) setCursorPos(world, eid, pos - 1);
		switchMode(world, eid, ctx, 'normal');
		return null;
	}

	// In insert mode, return 'passthrough' - let the normal keyboard handler deal with it.
	// We signal this by returning undefined (the caller checks isViModeEnabled + mode === 'insert').
	return undefined as unknown as ViKeyResult;
}

function handleVisualMode(
	world: World,
	eid: Entity,
	ctx: ViContext,
	key: string,
	text: string,
): ViKeyResult {
	const pos = getCursorPos(world, eid);
	const len = text.length;

	if (key === 'escape' || key === 'v') {
		switchMode(world, eid, ctx, 'normal');
		return null;
	}

	// Handle operators on visual selection
	if (key === 'd' || key === 'x') {
		const start = Math.min(ctx.visualAnchor, pos);
		const end = Math.max(ctx.visualAnchor, pos) + 1;
		ctx.yankRegister = text.slice(start, Math.min(end, len));
		switchMode(world, eid, ctx, 'normal');
		setCursorPos(world, eid, start);
		return { type: 'delete', start, end: Math.min(end, len) };
	}

	if (key === 'c') {
		const start = Math.min(ctx.visualAnchor, pos);
		const end = Math.max(ctx.visualAnchor, pos) + 1;
		ctx.yankRegister = text.slice(start, Math.min(end, len));
		switchMode(world, eid, ctx, 'insert');
		setCursorPos(world, eid, start);
		return { type: 'delete', start, end: Math.min(end, len) };
	}

	if (key === 'y') {
		const start = Math.min(ctx.visualAnchor, pos);
		const end = Math.max(ctx.visualAnchor, pos) + 1;
		ctx.yankRegister = text.slice(start, Math.min(end, len));
		switchMode(world, eid, ctx, 'normal');
		setCursorPos(world, eid, start);
		return null;
	}

	// Motions extend the visual selection
	const target = resolveMotion(world, eid, ctx, key, text);
	if (target !== null) {
		setCursorPos(world, eid, target);
		// Update selection highlight
		const selStart = Math.min(ctx.visualAnchor, target);
		const selEnd = Math.max(ctx.visualAnchor, target);
		setSelection(world, eid, selStart, selEnd + 1);
		ctx.count = 0;
		return null;
	}

	// Accumulate numeric count
	if (key >= '1' && key <= '9') {
		ctx.count = ctx.count * 10 + Number.parseInt(key, 10);
		return null;
	}
	if (key === '0' && ctx.count > 0) {
		ctx.count = ctx.count * 10;
		return null;
	}

	return null;
}

function handleCommandMode(
	world: World,
	eid: Entity,
	ctx: ViContext,
	key: string,
	_text: string,
): ViKeyResult {
	// Minimal command mode: only handle escape to exit
	if (key === 'escape') {
		switchMode(world, eid, ctx, 'normal');
		return null;
	}

	if (key === 'return' || key === 'enter') {
		// For now, command mode just returns to normal mode on enter
		switchMode(world, eid, ctx, 'normal');
		return null;
	}

	// Buffer command characters (caller can read them if needed)
	return null;
}
