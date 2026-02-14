/**
 * TextInput cursor and selection functions.
 * @module components/textInput/cursor
 */

import type { Entity, World } from '../../core/types';
import { markDirty } from '../renderable';
import { isTextInput } from './behavior';
import { textInputStore } from './store';
import {
	type CursorConfig,
	type CursorConfigOptions,
	CursorMode,
	type CursorModeType,
	cursorConfigStore,
	DEFAULT_CURSOR_BLINK_MS,
	DEFAULT_CURSOR_BLOCK_CHAR,
	DEFAULT_CURSOR_LINE_CHAR,
} from './types';

// =============================================================================
// Cursor Position and Selection
// =============================================================================

/**
 * Gets the cursor position.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Cursor position
 */
export function getCursorPos(_world: World, eid: Entity): number {
	return textInputStore.cursorPos[eid] ?? 0;
}

/**
 * Sets the cursor position.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param pos - New cursor position
 */
export function setCursorPos(world: World, eid: Entity, pos: number): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.cursorPos[eid] = Math.max(0, pos);
	// Reset blink timer so cursor is immediately visible after movement
	textInputStore.cursorBlinkStart[eid] = Date.now();
	markDirty(world, eid);
}

/**
 * Moves the cursor by a delta amount.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param delta - Amount to move (positive = right, negative = left)
 */
export function moveCursor(world: World, eid: Entity, delta: number): void {
	const current = getCursorPos(world, eid);
	setCursorPos(world, eid, current + delta);
}

/**
 * Gets the selection range.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Selection range [start, end] or null if no selection
 */
export function getSelection(_world: World, eid: Entity): [number, number] | null {
	const start = textInputStore.selectionStart[eid];
	const end = textInputStore.selectionEnd[eid];
	if (start === undefined || end === undefined || start < 0 || end < 0) {
		return null;
	}
	return [start, end];
}

/**
 * Sets the selection range.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param start - Selection start
 * @param end - Selection end
 */
export function setSelection(world: World, eid: Entity, start: number, end: number): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.selectionStart[eid] = start;
	textInputStore.selectionEnd[eid] = end;
	markDirty(world, eid);
}

/**
 * Clears the current selection.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function clearSelection(world: World, eid: Entity): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.selectionStart[eid] = -1;
	textInputStore.selectionEnd[eid] = -1;
	markDirty(world, eid);
}

/**
 * Checks if there is an active selection.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if there is a selection
 */
export function hasSelection(world: World, eid: Entity): boolean {
	return getSelection(world, eid) !== null;
}

// =============================================================================
// Cursor Configuration and Rendering
// =============================================================================

/**
 * Gets the cursor configuration for a text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Cursor configuration
 */
export function getCursorConfig(_world: World, eid: Entity): CursorConfig {
	return (
		cursorConfigStore.get(eid) ?? {
			blink: true,
			blinkIntervalMs: DEFAULT_CURSOR_BLINK_MS,
			lineChar: DEFAULT_CURSOR_LINE_CHAR,
			blockChar: DEFAULT_CURSOR_BLOCK_CHAR,
		}
	);
}

/**
 * Sets the cursor configuration for a text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param options - Cursor configuration options
 *
 * @example
 * ```typescript
 * setCursorConfig(world, textbox, {
 *   blink: true,
 *   blinkIntervalMs: 500,
 *   lineChar: '|',
 * });
 * ```
 */
export function setCursorConfig(world: World, eid: Entity, options: CursorConfigOptions): void {
	const current = getCursorConfig(world, eid);
	cursorConfigStore.set(eid, {
		blink: options.blink ?? current.blink,
		blinkIntervalMs: options.blinkIntervalMs ?? current.blinkIntervalMs,
		lineChar: options.lineChar ?? current.lineChar,
		blockChar: options.blockChar ?? current.blockChar,
	});
}

/**
 * Gets the cursor visual mode (line or block).
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Cursor mode (0=line, 1=block)
 */
export function getCursorMode(_world: World, eid: Entity): CursorModeType {
	return (textInputStore.cursorMode[eid] ?? 0) as CursorModeType;
}

/**
 * Sets the cursor visual mode.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param mode - Cursor mode (CursorMode.Line or CursorMode.Block)
 *
 * @example
 * ```typescript
 * // Switch to overwrite mode (block cursor)
 * setCursorMode(world, textbox, CursorMode.Block);
 * ```
 */
export function setCursorMode(world: World, eid: Entity, mode: CursorModeType): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.cursorMode[eid] = mode;
	markDirty(world, eid);
}

/**
 * Toggles between line and block cursor modes.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns The new cursor mode
 */
export function toggleCursorMode(world: World, eid: Entity): CursorModeType {
	const current = getCursorMode(world, eid);
	const newMode = current === CursorMode.Line ? CursorMode.Block : CursorMode.Line;
	setCursorMode(world, eid, newMode);
	return newMode;
}

/**
 * Checks if cursor blink is enabled for a text input.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if blink is enabled
 */
export function isCursorBlinkEnabled(_world: World, eid: Entity): boolean {
	return (textInputStore.cursorBlink[eid] ?? 1) === 1;
}

/**
 * Enables or disables cursor blink.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param enabled - Whether blink should be enabled
 */
export function setCursorBlinkEnabled(world: World, eid: Entity, enabled: boolean): void {
	if (!isTextInput(world, eid)) {
		return;
	}
	textInputStore.cursorBlink[eid] = enabled ? 1 : 0;
	if (enabled) {
		// Reset blink timer when enabling
		textInputStore.cursorBlinkStart[eid] = Date.now();
	}
	markDirty(world, eid);
}

/**
 * Resets the cursor blink timer.
 * Call this when the user types or moves the cursor to show cursor immediately.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function resetCursorBlink(_world: World, eid: Entity): void {
	textInputStore.cursorBlinkStart[eid] = Date.now();
}

/**
 * Gets the character to display for the cursor based on mode.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Cursor character
 */
export function getCursorChar(world: World, eid: Entity): string {
	const config = getCursorConfig(world, eid);
	const mode = getCursorMode(world, eid);
	return mode === CursorMode.Block ? config.blockChar : config.lineChar;
}
