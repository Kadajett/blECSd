/**
 * Vi-style navigation mode for scrollable elements.
 *
 * Provides vi key bindings for scrolling, cursor movement,
 * and search within scrollable content. Enable with vi: true.
 * Compatible with existing key bindings.
 *
 * @module input/viMode
 */

import { z } from 'zod';
import type { KeyEvent } from '../terminal/keyParser';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Vi mode state.
 */
export type ViModeState = 'normal' | 'search' | 'command';

/**
 * Vi navigation action produced by key processing.
 */
export type ViAction =
	| {
			readonly type: 'scroll';
			readonly direction: 'up' | 'down' | 'left' | 'right';
			readonly amount: number;
	  }
	| { readonly type: 'jump'; readonly target: 'top' | 'bottom' | 'high' | 'middle' | 'low' }
	| { readonly type: 'page'; readonly direction: 'up' | 'down'; readonly amount: 'half' | 'full' }
	| { readonly type: 'search'; readonly query: string; readonly direction: 'forward' | 'backward' }
	| { readonly type: 'searchNext'; readonly direction: 'forward' | 'backward' }
	| { readonly type: 'enterSearch' }
	| { readonly type: 'exitSearch' }
	| { readonly type: 'searchInput'; readonly char: string }
	| { readonly type: 'none' };

/**
 * Configuration for vi navigation mode.
 */
export interface ViModeConfig {
	/** Enable vi mode (default: false) */
	readonly enabled: boolean;
	/** Scroll amount for j/k (default: 1) */
	readonly scrollStep: number;
	/** Scroll amount for h/l (default: 1) */
	readonly horizontalStep: number;
	/** Number of visible lines for H/M/L calculations */
	readonly viewportHeight: number;
}

/**
 * Zod schema for ViModeConfig validation.
 *
 * @example
 * ```typescript
 * import { ViModeConfigSchema } from 'blecsd';
 *
 * const config = ViModeConfigSchema.parse({
 *   enabled: true,
 *   scrollStep: 3,
 *   horizontalStep: 5,
 *   viewportHeight: 40,
 * });
 * ```
 */
export const ViModeConfigSchema = z.object({
	enabled: z.boolean(),
	scrollStep: z.number().int().positive(),
	horizontalStep: z.number().int().positive(),
	viewportHeight: z.number().int().positive(),
});

/**
 * Vi mode internal state.
 */
export interface ViState {
	/** Current vi mode */
	readonly mode: ViModeState;
	/** Current search query buffer */
	readonly searchBuffer: string;
	/** Last search query */
	readonly lastSearch: string;
	/** Last search direction */
	readonly lastSearchDirection: 'forward' | 'backward';
	/** Count prefix (e.g., "5j" = move down 5) */
	readonly countPrefix: number;
	/** Whether g was pressed (for gg) */
	readonly gPending: boolean;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_VI_CONFIG: ViModeConfig = {
	enabled: false,
	scrollStep: 1,
	horizontalStep: 1,
	viewportHeight: 24,
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial vi mode state.
 *
 * @returns Fresh vi state
 *
 * @example
 * ```typescript
 * import { createViState } from 'blecsd';
 *
 * const viState = createViState();
 * ```
 */
export function createViState(): ViState {
	return {
		mode: 'normal',
		searchBuffer: '',
		lastSearch: '',
		lastSearchDirection: 'forward',
		countPrefix: 0,
		gPending: false,
	};
}

/**
 * Creates a vi mode configuration with defaults.
 *
 * @param config - Partial configuration overrides
 * @returns Full vi configuration
 */
export function createViConfig(config?: Partial<ViModeConfig>): ViModeConfig {
	return { ...DEFAULT_VI_CONFIG, ...config };
}

// =============================================================================
// KEY PROCESSING
// =============================================================================

/**
 * Processes a key event in vi mode and returns the resulting action and new state.
 *
 * @param key - The key event to process
 * @param state - Current vi state
 * @param config - Vi mode configuration
 * @returns Tuple of [action, newState]
 *
 * @example
 * ```typescript
 * import { createViState, createViConfig, processViKey } from 'blecsd';
 *
 * const state = createViState();
 * const config = createViConfig({ enabled: true, viewportHeight: 40 });
 *
 * // Process a 'j' key press
 * const [action, newState] = processViKey(keyEvent, state, config);
 * if (action.type === 'scroll') {
 *   scrollBy(world, eid, 0, action.amount);
 * }
 * ```
 */
export function processViKey(
	key: KeyEvent,
	state: ViState,
	config: ViModeConfig,
): [ViAction, ViState] {
	if (!config.enabled) return [{ type: 'none' }, state];

	// Search mode handles input differently
	if (state.mode === 'search') {
		return processSearchModeKey(key, state);
	}

	return processNormalModeKey(key, state, config);
}

/**
 * Checks if a key event should be consumed by vi mode.
 * Use this to prevent vi keys from bubbling to other handlers.
 *
 * @param key - The key event
 * @param state - Current vi state
 * @param config - Vi configuration
 * @returns Whether vi mode wants this key
 */
export function isViKey(key: KeyEvent, state: ViState, config: ViModeConfig): boolean {
	if (!config.enabled) return false;
	if (state.mode === 'search') return true;

	const name = key.name;

	// Count prefix digits
	if (!key.ctrl && !key.meta && name >= '1' && name <= '9') return true;
	if (state.countPrefix > 0 && name === '0') return true;

	// Navigation keys
	const viKeys = new Set(['j', 'k', 'h', 'l', 'g', '/', 'n']);
	if (!key.ctrl && !key.meta && !key.shift && viKeys.has(name)) return true;

	// Shift keys
	if (key.shift && (name === 'g' || name === 'h' || name === 'm' || name === 'l' || name === 'n'))
		return true;

	// Ctrl combinations
	if (key.ctrl && (name === 'd' || name === 'u' || name === 'f' || name === 'b')) return true;

	return false;
}

// =============================================================================
// INTERNAL HANDLERS
// =============================================================================

function handleCountPrefix(key: KeyEvent, state: ViState): [ViAction, ViState] | null {
	const name = key.name;

	// Handle digit 1-9 for count prefix
	if (!key.ctrl && !key.meta && !key.shift && name >= '1' && name <= '9') {
		const digit = Number(name);
		return [
			{ type: 'none' },
			{ ...state, countPrefix: state.countPrefix * 10 + digit, gPending: false },
		];
	}

	// Handle 0 for existing count prefix
	if (state.countPrefix > 0 && name === '0' && !key.ctrl && !key.meta) {
		return [{ type: 'none' }, { ...state, countPrefix: state.countPrefix * 10 }];
	}

	return null;
}

function handleBasicNavigation(
	key: KeyEvent,
	count: number,
	config: ViModeConfig,
	resetState: ViState,
): [ViAction, ViState] | null {
	const name = key.name;
	const noMods = !key.ctrl && !key.meta && !key.shift;

	if (name === 'j' && noMods) {
		return [{ type: 'scroll', direction: 'down', amount: count * config.scrollStep }, resetState];
	}
	if (name === 'k' && noMods) {
		return [{ type: 'scroll', direction: 'up', amount: count * config.scrollStep }, resetState];
	}
	if (name === 'h' && noMods) {
		return [
			{ type: 'scroll', direction: 'left', amount: count * config.horizontalStep },
			resetState,
		];
	}
	if (name === 'l' && noMods) {
		return [
			{ type: 'scroll', direction: 'right', amount: count * config.horizontalStep },
			resetState,
		];
	}

	return null;
}

function handleJumpCommands(
	key: KeyEvent,
	state: ViState,
	resetState: ViState,
): [ViAction, ViState] | null {
	const name = key.name;

	// g: first press sets pending, gg = go to top
	if (name === 'g' && !key.ctrl && !key.meta && !key.shift) {
		if (state.gPending) {
			return [{ type: 'jump', target: 'top' }, resetState];
		}
		return [{ type: 'none' }, { ...state, gPending: true }];
	}

	// G (shift+g): go to bottom
	if (key.shift && name === 'g') {
		return [{ type: 'jump', target: 'bottom' }, resetState];
	}

	// H/M/L: high/middle/low of visible area
	if (key.shift && name === 'h') {
		return [{ type: 'jump', target: 'high' }, resetState];
	}
	if (key.shift && name === 'm') {
		return [{ type: 'jump', target: 'middle' }, resetState];
	}
	if (key.shift && name === 'l') {
		return [{ type: 'jump', target: 'low' }, resetState];
	}

	return null;
}

function handlePageNavigation(key: KeyEvent, resetState: ViState): [ViAction, ViState] | null {
	const name = key.name;

	if (key.ctrl && name === 'd') {
		return [{ type: 'page', direction: 'down', amount: 'half' }, resetState];
	}
	if (key.ctrl && name === 'u') {
		return [{ type: 'page', direction: 'up', amount: 'half' }, resetState];
	}
	if (key.ctrl && name === 'f') {
		return [{ type: 'page', direction: 'down', amount: 'full' }, resetState];
	}
	if (key.ctrl && name === 'b') {
		return [{ type: 'page', direction: 'up', amount: 'full' }, resetState];
	}

	return null;
}

function handleSearchCommands(
	key: KeyEvent,
	state: ViState,
	resetState: ViState,
): [ViAction, ViState] | null {
	const name = key.name;

	// /: enter search mode
	if (name === '/' && !key.ctrl && !key.meta && !key.shift) {
		return [{ type: 'enterSearch' }, { ...resetState, mode: 'search', searchBuffer: '' }];
	}

	// n: next search result
	if (name === 'n' && !key.ctrl && !key.meta && !key.shift) {
		if (!state.lastSearch) return [{ type: 'none' }, resetState];
		return [{ type: 'searchNext', direction: state.lastSearchDirection }, resetState];
	}

	// N (shift+n): previous search result
	if (key.shift && name === 'n') {
		if (!state.lastSearch) return [{ type: 'none' }, resetState];
		const dir = state.lastSearchDirection === 'forward' ? 'backward' : 'forward';
		return [{ type: 'searchNext', direction: dir }, resetState];
	}

	return null;
}

function processNormalModeKey(
	key: KeyEvent,
	state: ViState,
	config: ViModeConfig,
): [ViAction, ViState] {
	// Handle count prefix first
	const countResult = handleCountPrefix(key, state);
	if (countResult) return countResult;

	const count = state.countPrefix > 0 ? state.countPrefix : 1;
	const resetState = { ...state, countPrefix: 0, gPending: false };

	// Try each command type in sequence
	const basicNav = handleBasicNavigation(key, count, config, resetState);
	if (basicNav) return basicNav;

	const jumpCmd = handleJumpCommands(key, state, resetState);
	if (jumpCmd) return jumpCmd;

	const pageNav = handlePageNavigation(key, resetState);
	if (pageNav) return pageNav;

	const searchCmd = handleSearchCommands(key, state, resetState);
	if (searchCmd) return searchCmd;

	return [{ type: 'none' }, resetState];
}

function processSearchModeKey(key: KeyEvent, state: ViState): [ViAction, ViState] {
	// Enter: execute search
	if (key.name === 'return' || key.name === 'enter') {
		if (state.searchBuffer.length === 0) {
			return [{ type: 'exitSearch' }, { ...state, mode: 'normal' }];
		}
		return [
			{ type: 'search', query: state.searchBuffer, direction: 'forward' },
			{
				...state,
				mode: 'normal',
				lastSearch: state.searchBuffer,
				lastSearchDirection: 'forward',
				searchBuffer: '',
			},
		];
	}

	// Escape: cancel search
	if (key.name === 'escape') {
		return [{ type: 'exitSearch' }, { ...state, mode: 'normal', searchBuffer: '' }];
	}

	// Backspace: remove last character
	if (key.name === 'backspace') {
		if (state.searchBuffer.length === 0) {
			return [{ type: 'exitSearch' }, { ...state, mode: 'normal' }];
		}
		return [{ type: 'none' }, { ...state, searchBuffer: state.searchBuffer.slice(0, -1) }];
	}

	// Regular character: append to search buffer
	if (key.sequence.length === 1 && !key.ctrl && !key.meta) {
		const newBuffer = state.searchBuffer + key.sequence;
		return [
			{ type: 'searchInput', char: key.sequence },
			{ ...state, searchBuffer: newBuffer },
		];
	}

	return [{ type: 'none' }, state];
}

/**
 * Resolves a vi page action to a concrete scroll amount.
 *
 * @param action - The page action
 * @param viewportHeight - Number of visible lines
 * @returns Scroll amount in lines
 *
 * @example
 * ```typescript
 * import { resolvePageAmount } from 'blecsd';
 *
 * const lines = resolvePageAmount('half', 40); // 20
 * ```
 */
export function resolvePageAmount(amount: 'half' | 'full', viewportHeight: number): number {
	return amount === 'half'
		? Math.max(1, Math.floor(viewportHeight / 2))
		: Math.max(1, viewportHeight - 1);
}

/**
 * Resolves a vi jump target to a line number.
 *
 * @param target - The jump target
 * @param scrollTop - Current scroll top position
 * @param viewportHeight - Viewport height in lines
 * @param totalLines - Total content lines
 * @returns Target line number (0-based)
 */
export function resolveJumpTarget(
	target: 'top' | 'bottom' | 'high' | 'middle' | 'low',
	scrollTop: number,
	viewportHeight: number,
	totalLines: number,
): number {
	switch (target) {
		case 'top':
			return 0;
		case 'bottom':
			return Math.max(0, totalLines - 1);
		case 'high':
			return scrollTop;
		case 'middle':
			return scrollTop + Math.floor(viewportHeight / 2);
		case 'low':
			return scrollTop + viewportHeight - 1;
	}
}
