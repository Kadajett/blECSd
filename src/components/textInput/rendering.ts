/**
 * TextInput rendering utilities.
 * @module components/textInput/rendering
 */

import type { Entity, World } from '../../core/types';
import { getTextInputState } from './behavior';
import { getTextInputConfig } from './config';
import {
	getCursorChar,
	getCursorConfig,
	getCursorMode,
	getCursorPos,
	getSelection,
	isCursorBlinkEnabled,
} from './cursor';
import { textInputStore } from './store';
import { CursorMode } from './types';

/**
 * Gets whether the cursor should be visible at the current time.
 * Takes into account the blink state and timing.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if cursor should be visible
 *
 * @example
 * ```typescript
 * // In render system:
 * if (isCursorVisible(world, textbox)) {
 *   // Render cursor at position
 * }
 * ```
 */
export function isCursorVisible(world: World, eid: Entity): boolean {
	// Cursor only visible when focused/editing
	const state = getTextInputState(world, eid);
	if (state !== 'focused' && state !== 'editing') {
		return false;
	}

	// If blink is disabled, cursor is always visible
	if (!isCursorBlinkEnabled(world, eid)) {
		return true;
	}

	// Calculate blink phase
	const config = getCursorConfig(world, eid);
	const blinkStart = textInputStore.cursorBlinkStart[eid] ?? Date.now();
	const elapsed = Date.now() - blinkStart;
	const phase = Math.floor(elapsed / config.blinkIntervalMs) % 2;

	// Cursor visible during first half of cycle (phase 0)
	return phase === 0;
}

/**
 * Gets the display text for rendering, with cursor character inserted.
 * Handles password masking and placeholder display.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param value - Current text value
 * @returns Object with display text and whether cursor is visible
 *
 * @example
 * ```typescript
 * const { displayText, cursorVisible, cursorPosition } = getCursorDisplayText(world, textbox, value);
 * // displayText: "Hello│World" (with cursor between 'o' and 'W')
 * ```
 */
export function getCursorDisplayText(
	world: World,
	eid: Entity,
	value: string,
): {
	displayText: string;
	cursorVisible: boolean;
	cursorPosition: number;
} {
	const config = getTextInputConfig(world, eid);
	const cursorPos = getCursorPos(world, eid);

	// Handle password masking
	let displayValue = value;
	if (config.secret) {
		displayValue = config.censor.repeat(value.length);
	}

	// Handle empty value with placeholder
	if (displayValue.length === 0 && config.placeholder) {
		return {
			displayText: config.placeholder,
			cursorVisible: false,
			cursorPosition: 0,
		};
	}

	const cursorVisible = isCursorVisible(world, eid);

	// If cursor not visible, just return display value
	if (!cursorVisible) {
		return {
			displayText: displayValue,
			cursorVisible: false,
			cursorPosition: cursorPos,
		};
	}

	// Insert cursor character at position
	const cursorChar = getCursorChar(world, eid);
	const mode = getCursorMode(world, eid);

	let displayText: string;
	if (mode === CursorMode.Block && cursorPos < displayValue.length) {
		// Block mode replaces character at cursor position
		displayText =
			displayValue.substring(0, cursorPos) + cursorChar + displayValue.substring(cursorPos + 1);
	} else {
		// Line mode inserts cursor between characters
		displayText =
			displayValue.substring(0, cursorPos) + cursorChar + displayValue.substring(cursorPos);
	}

	return {
		displayText,
		cursorVisible: true,
		cursorPosition: cursorPos,
	};
}

/**
 * Gets selection range for rendering with highlight.
 * Returns the start and end positions normalized (start < end).
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Normalized selection range or null
 */
export function getNormalizedSelection(
	world: World,
	eid: Entity,
): { start: number; end: number } | null {
	const selection = getSelection(world, eid);
	if (!selection) {
		return null;
	}

	const [start, end] = selection;
	return {
		start: Math.min(start, end),
		end: Math.max(start, end),
	};
}
