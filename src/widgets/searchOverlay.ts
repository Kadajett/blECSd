/**
 * Search Overlay Widget
 *
 * A floating search bar that can be attached to any scrollable content widget.
 * Supports regex and plain text search modes, match highlighting, and
 * navigation between matches with Enter/Shift+Enter.
 *
 * @module widgets/searchOverlay
 *
 * @example
 * ```typescript
 * import { createSearchOverlay, attachSearchOverlay } from 'blecsd';
 *
 * const overlay = createSearchOverlay(world, {
 *   width: 40,
 *   mode: 'plain',
 * });
 *
 * // Attach to a scrollable widget
 * attachSearchOverlay(world, overlay, targetWidgetEid);
 *
 * // Open with Ctrl+F
 * overlay.show();
 *
 * // Navigate matches
 * overlay.nextMatch();
 * overlay.prevMatch();
 * ```
 */

import { z } from 'zod';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default width for the search overlay */
const DEFAULT_SEARCH_WIDTH = 40;

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Search mode for the overlay.
 */
export type SearchMode = 'plain' | 'regex';

/**
 * A single match found in content by the search overlay.
 */
export interface SearchOverlayMatch {
	/** Line index where the match was found */
	readonly lineIndex: number;
	/** Character offset within the line */
	readonly charOffset: number;
	/** Length of the matched text */
	readonly length: number;
}

/**
 * Configuration for creating a SearchOverlay widget.
 *
 * @example
 * ```typescript
 * const config: SearchOverlayConfig = {
 *   width: 40,
 *   mode: 'plain',
 *   caseSensitive: false,
 * };
 * ```
 */
export interface SearchOverlayConfig {
	/** Width of the search bar in columns @default 40 */
	readonly width?: number;
	/** Search mode: 'plain' for substring, 'regex' for regular expression @default 'plain' */
	readonly mode?: SearchMode;
	/** Whether search is case-sensitive @default false */
	readonly caseSensitive?: boolean;
	/** Foreground color for the search bar @default 0xFFFFFFFF */
	readonly fg?: number;
	/** Background color for the search bar @default 0x333333FF */
	readonly bg?: number;
	/** Foreground color for highlighted matches @default 0x000000FF */
	readonly matchFg?: number;
	/** Background color for highlighted matches @default 0xFFFF00FF */
	readonly matchBg?: number;
	/** Foreground color for the current match @default 0x000000FF */
	readonly currentMatchFg?: number;
	/** Background color for the current match @default 0xFF8800FF */
	readonly currentMatchBg?: number;
}

/**
 * Content provider interface for searchable widgets.
 * Any widget that wants to support search overlay must provide
 * a way to retrieve its content lines.
 */
export interface SearchableContent {
	/** Returns the total number of lines */
	getLineCount(): number;
	/** Returns the text content at a given line index */
	getLine(index: number): string | undefined;
}

/**
 * Callback fired when the match set or current match changes.
 */
export type SearchOverlayMatchCallback = (
	matches: readonly SearchOverlayMatch[],
	currentIndex: number,
) => void;

/**
 * SearchOverlay widget interface providing chainable methods.
 */
export interface SearchOverlayWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the search overlay */
	show(): SearchOverlayWidget;
	/** Hides the search overlay and clears state */
	hide(): SearchOverlayWidget;
	/** Returns whether the overlay is currently visible */
	isVisible(): boolean;

	// Search query
	/** Sets the search query text */
	setQuery(query: string): SearchOverlayWidget;
	/** Gets the current search query */
	getQuery(): string;
	/** Appends a character to the query */
	appendChar(char: string): SearchOverlayWidget;
	/** Removes the last character from the query */
	backspace(): SearchOverlayWidget;
	/** Clears the query */
	clearQuery(): SearchOverlayWidget;

	// Search mode
	/** Sets the search mode (plain or regex) */
	setMode(mode: SearchMode): SearchOverlayWidget;
	/** Gets the current search mode */
	getMode(): SearchMode;
	/** Toggles between plain and regex mode */
	toggleMode(): SearchOverlayWidget;
	/** Sets case sensitivity */
	setCaseSensitive(sensitive: boolean): SearchOverlayWidget;
	/** Gets case sensitivity setting */
	isCaseSensitive(): boolean;

	// Match navigation
	/** Moves to the next match */
	nextMatch(): SearchOverlayWidget;
	/** Moves to the previous match */
	prevMatch(): SearchOverlayWidget;
	/** Gets all current matches */
	getMatches(): readonly SearchOverlayMatch[];
	/** Gets the current match index (0-based, -1 if no matches) */
	getCurrentMatchIndex(): number;
	/** Gets the total number of matches */
	getMatchCount(): number;
	/** Gets a formatted status string like "3 of 47" */
	getMatchStatus(): string;

	// Content attachment
	/** Attaches to a content provider for searching */
	attachContent(content: SearchableContent): SearchOverlayWidget;
	/** Detaches from the current content provider */
	detachContent(): SearchOverlayWidget;

	// Events
	/** Registers a callback for match changes */
	onMatchChange(callback: SearchOverlayMatchCallback): () => void;
	/** Registers a callback for when the overlay is closed */
	onClose(callback: () => void): () => void;

	// Key handling
	/** Handles a key press, returns true if consumed */
	handleKey(key: string, ctrl?: boolean, shift?: boolean): boolean;

	// Lifecycle
	/** Destroys the widget */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for SearchOverlayConfig validation.
 *
 * @example
 * ```typescript
 * import { SearchOverlayConfigSchema } from 'blecsd';
 *
 * const config = SearchOverlayConfigSchema.parse({
 *   width: 50,
 *   mode: 'regex',
 *   caseSensitive: true,
 * });
 * ```
 */
export const SearchOverlayConfigSchema = z.object({
	width: z.number().int().positive().default(DEFAULT_SEARCH_WIDTH),
	mode: z.enum(['plain', 'regex']).default('plain'),
	caseSensitive: z.boolean().default(false),
	fg: z.number().int().nonnegative().optional(),
	bg: z.number().int().nonnegative().optional(),
	matchFg: z.number().int().nonnegative().optional(),
	matchBg: z.number().int().nonnegative().optional(),
	currentMatchFg: z.number().int().nonnegative().optional(),
	currentMatchBg: z.number().int().nonnegative().optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * SearchOverlay component marker for identifying search overlay entities.
 *
 * @example
 * ```typescript
 * import { SearchOverlay } from 'blecsd';
 *
 * if (SearchOverlay.isSearchOverlay[eid] === 1) {
 *   // Entity is a search overlay
 * }
 * ```
 */
export const SearchOverlay = {
	/** Tag indicating this is a search overlay widget (1 = yes) */
	isSearchOverlay: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether the overlay is currently visible (0 = hidden, 1 = visible) */
	visible: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

interface SearchOverlayState {
	query: string;
	mode: SearchMode;
	caseSensitive: boolean;
	matches: SearchOverlayMatch[];
	currentMatchIndex: number;
	content: SearchableContent | null;
	targetEid: Entity | null;
	width: number;
	fg: number;
	bg: number;
	matchFg: number;
	matchBg: number;
	currentMatchFg: number;
	currentMatchBg: number;
	matchCallbacks: SearchOverlayMatchCallback[];
	closeCallbacks: Array<() => void>;
}

const stateMap = new Map<Entity, SearchOverlayState>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Handles control-key shortcuts when the overlay is visible.
 */
function handleCtrlKey(
	widget: SearchOverlayWidget,
	state: SearchOverlayState,
	key: string,
): boolean {
	if (key === 'r') {
		widget.toggleMode();
		return true;
	}
	if (key === 'i') {
		widget.setCaseSensitive(!state.caseSensitive);
		return true;
	}
	return false;
}

/**
 * Handles key input for the search overlay.
 */
function handleSearchOverlayKey(
	widget: SearchOverlayWidget,
	state: SearchOverlayState,
	key: string,
	ctrl: boolean,
	shift: boolean,
): boolean {
	if (!widget.isVisible()) {
		if (ctrl && key === 'f') {
			widget.show();
			return true;
		}
		return false;
	}

	if (key === 'escape') {
		widget.hide();
		return true;
	}

	if (key === 'enter' || key === 'return') {
		if (shift) {
			widget.prevMatch();
		} else {
			widget.nextMatch();
		}
		return true;
	}

	if (ctrl) {
		return handleCtrlKey(widget, state, key);
	}

	if (key === 'backspace') {
		widget.backspace();
		return true;
	}

	if (key.length === 1) {
		widget.appendChar(key);
		return true;
	}

	return false;
}

/**
 * Creates a search RegExp from the current state.
 * Returns null if the query produces an invalid regex.
 */
function createSearchPattern(state: SearchOverlayState): RegExp | null {
	const flags = state.caseSensitive ? 'g' : 'gi';
	try {
		const source = state.mode === 'regex' ? state.query : escapeRegExp(state.query);
		return new RegExp(source, flags);
	} catch {
		return null;
	}
}

/**
 * Finds all matches of a pattern within a single line.
 */
function findMatchesInLine(pattern: RegExp, line: string, lineIndex: number): SearchOverlayMatch[] {
	const matches: SearchOverlayMatch[] = [];
	pattern.lastIndex = 0;
	let result: RegExpExecArray | null = pattern.exec(line);

	while (result !== null) {
		matches.push({
			lineIndex,
			charOffset: result.index,
			length: result[0].length,
		});

		if (result[0].length === 0) {
			pattern.lastIndex++;
		}
		result = pattern.exec(line);
	}

	return matches;
}

/**
 * Performs the search across attached content and returns all matches.
 */
function performSearch(state: SearchOverlayState): SearchOverlayMatch[] {
	if (!state.content || state.query.length === 0) {
		return [];
	}

	const pattern = createSearchPattern(state);
	if (!pattern) {
		return [];
	}

	const matches: SearchOverlayMatch[] = [];
	const lineCount = state.content.getLineCount();

	for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
		const line = state.content.getLine(lineIndex);
		if (!line) {
			continue;
		}

		const lineMatches = findMatchesInLine(pattern, line, lineIndex);
		for (const m of lineMatches) {
			matches.push(m);
		}
	}

	return matches;
}

/**
 * Escapes special regex characters in a string for plain text search.
 */
function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Updates matches and notifies callbacks.
 */
function updateMatches(state: SearchOverlayState): void {
	state.matches = performSearch(state);

	// Clamp current index
	if (state.matches.length === 0) {
		state.currentMatchIndex = -1;
	} else if (state.currentMatchIndex >= state.matches.length) {
		state.currentMatchIndex = 0;
	} else if (state.currentMatchIndex < 0) {
		state.currentMatchIndex = 0;
	}

	// Fire callbacks
	for (const cb of state.matchCallbacks) {
		cb(state.matches, state.currentMatchIndex);
	}
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a SearchOverlay widget.
 *
 * The overlay starts hidden. Call `show()` to display it.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The SearchOverlayWidget instance
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'blecsd';
 * import { createSearchOverlay } from 'blecsd';
 *
 * const world = createWorld();
 * const overlay = createSearchOverlay(world, {
 *   width: 40,
 *   mode: 'plain',
 * });
 *
 * overlay.show();
 * overlay.setQuery('hello');
 * console.log(overlay.getMatchStatus()); // "3 of 47"
 * overlay.nextMatch();
 * ```
 */
export function createSearchOverlay(
	world: World,
	config: SearchOverlayConfig = {},
): SearchOverlayWidget {
	const validated = SearchOverlayConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as search overlay
	SearchOverlay.isSearchOverlay[eid] = 1;
	SearchOverlay.visible[eid] = 0;

	// Create internal state
	const state: SearchOverlayState = {
		query: '',
		mode: validated.mode,
		caseSensitive: validated.caseSensitive,
		matches: [],
		currentMatchIndex: -1,
		content: null,
		targetEid: null,
		width: validated.width,
		fg: validated.fg ?? 0xffffffff,
		bg: validated.bg ?? 0x333333ff,
		matchFg: validated.matchFg ?? 0x000000ff,
		matchBg: validated.matchBg ?? 0xffff00ff,
		currentMatchFg: validated.currentMatchFg ?? 0x000000ff,
		currentMatchBg: validated.currentMatchBg ?? 0xff8800ff,
		matchCallbacks: [],
		closeCallbacks: [],
	};

	stateMap.set(eid, state);

	const widget: SearchOverlayWidget = {
		eid,

		// Visibility
		show(): SearchOverlayWidget {
			SearchOverlay.visible[eid] = 1;
			// Re-run search when shown
			updateMatches(state);
			return widget;
		},

		hide(): SearchOverlayWidget {
			SearchOverlay.visible[eid] = 0;
			state.query = '';
			state.matches = [];
			state.currentMatchIndex = -1;

			for (const cb of state.closeCallbacks) {
				cb();
			}

			return widget;
		},

		isVisible(): boolean {
			return SearchOverlay.visible[eid] === 1;
		},

		// Search query
		setQuery(query: string): SearchOverlayWidget {
			state.query = query;
			updateMatches(state);
			return widget;
		},

		getQuery(): string {
			return state.query;
		},

		appendChar(char: string): SearchOverlayWidget {
			state.query += char;
			updateMatches(state);
			return widget;
		},

		backspace(): SearchOverlayWidget {
			if (state.query.length > 0) {
				state.query = state.query.slice(0, -1);
				updateMatches(state);
			}
			return widget;
		},

		clearQuery(): SearchOverlayWidget {
			state.query = '';
			updateMatches(state);
			return widget;
		},

		// Search mode
		setMode(mode: SearchMode): SearchOverlayWidget {
			state.mode = mode;
			updateMatches(state);
			return widget;
		},

		getMode(): SearchMode {
			return state.mode;
		},

		toggleMode(): SearchOverlayWidget {
			state.mode = state.mode === 'plain' ? 'regex' : 'plain';
			updateMatches(state);
			return widget;
		},

		setCaseSensitive(sensitive: boolean): SearchOverlayWidget {
			state.caseSensitive = sensitive;
			updateMatches(state);
			return widget;
		},

		isCaseSensitive(): boolean {
			return state.caseSensitive;
		},

		// Match navigation
		nextMatch(): SearchOverlayWidget {
			if (state.matches.length === 0) {
				return widget;
			}

			state.currentMatchIndex = (state.currentMatchIndex + 1) % state.matches.length;

			for (const cb of state.matchCallbacks) {
				cb(state.matches, state.currentMatchIndex);
			}

			return widget;
		},

		prevMatch(): SearchOverlayWidget {
			if (state.matches.length === 0) {
				return widget;
			}

			state.currentMatchIndex =
				state.currentMatchIndex <= 0 ? state.matches.length - 1 : state.currentMatchIndex - 1;

			for (const cb of state.matchCallbacks) {
				cb(state.matches, state.currentMatchIndex);
			}

			return widget;
		},

		getMatches(): readonly SearchOverlayMatch[] {
			return state.matches;
		},

		getCurrentMatchIndex(): number {
			return state.currentMatchIndex;
		},

		getMatchCount(): number {
			return state.matches.length;
		},

		getMatchStatus(): string {
			if (state.matches.length === 0) {
				if (state.query.length > 0) {
					return 'No matches';
				}
				return '';
			}
			return `${state.currentMatchIndex + 1} of ${state.matches.length}`;
		},

		// Content attachment
		attachContent(content: SearchableContent): SearchOverlayWidget {
			state.content = content;
			if (state.query.length > 0) {
				updateMatches(state);
			}
			return widget;
		},

		detachContent(): SearchOverlayWidget {
			state.content = null;
			state.matches = [];
			state.currentMatchIndex = -1;
			return widget;
		},

		// Events
		onMatchChange(callback: SearchOverlayMatchCallback): () => void {
			state.matchCallbacks.push(callback);
			return () => {
				const idx = state.matchCallbacks.indexOf(callback);
				if (idx !== -1) {
					state.matchCallbacks.splice(idx, 1);
				}
			};
		},

		onClose(callback: () => void): () => void {
			state.closeCallbacks.push(callback);
			return () => {
				const idx = state.closeCallbacks.indexOf(callback);
				if (idx !== -1) {
					state.closeCallbacks.splice(idx, 1);
				}
			};
		},

		// Key handling
		handleKey(key: string, ctrl = false, shift = false): boolean {
			return handleSearchOverlayKey(widget, state, key, ctrl, shift);
		},

		// Lifecycle
		destroy(): void {
			if (SearchOverlay.visible[eid] === 1) {
				widget.hide();
			}

			SearchOverlay.isSearchOverlay[eid] = 0;
			SearchOverlay.visible[eid] = 0;
			stateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Attaches a search overlay to a target widget that provides searchable content.
 *
 * The target must expose content through the SearchableContent interface.
 * For VirtualizedList widgets, this wraps their getLine/getLineCount methods.
 *
 * @param _world - The ECS world
 * @param overlay - The search overlay widget
 * @param targetEid - The entity ID of the target widget
 * @param content - The searchable content provider
 * @returns The search overlay widget for chaining
 *
 * @example
 * ```typescript
 * import { createSearchOverlay, attachSearchOverlay } from 'blecsd';
 *
 * const overlay = createSearchOverlay(world);
 * const vlist = createVirtualizedList(world, { width: 80, height: 24 });
 *
 * attachSearchOverlay(world, overlay, vlist.eid, {
 *   getLineCount: () => vlist.getLineCount(),
 *   getLine: (i) => vlist.getLine(i),
 * });
 * ```
 */
export function attachSearchOverlay(
	_world: World,
	overlay: SearchOverlayWidget,
	targetEid: Entity,
	content: SearchableContent,
): SearchOverlayWidget {
	const state = stateMap.get(overlay.eid);
	if (state) {
		state.targetEid = targetEid;
	}
	return overlay.attachContent(content);
}

/**
 * Checks if an entity is a SearchOverlay widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a search overlay widget
 *
 * @example
 * ```typescript
 * import { isSearchOverlay } from 'blecsd';
 *
 * if (isSearchOverlay(world, entity)) {
 *   // Handle search overlay
 * }
 * ```
 */
export function isSearchOverlay(_world: World, eid: Entity): boolean {
	return SearchOverlay.isSearchOverlay[eid] === 1;
}

/**
 * Gets the target entity ID that a search overlay is attached to.
 *
 * @param eid - The search overlay entity ID
 * @returns The target entity ID or null if not attached
 */
export function getSearchOverlayTarget(eid: Entity): Entity | null {
	const state = stateMap.get(eid);
	return state?.targetEid ?? null;
}

/**
 * Gets the match highlight colors for rendering.
 *
 * @param eid - The search overlay entity ID
 * @returns Object with match and current match colors, or null if not a search overlay
 *
 * @example
 * ```typescript
 * const colors = getSearchOverlayColors(overlayEid);
 * if (colors) {
 *   // Use colors.matchFg, colors.matchBg for highlighting
 * }
 * ```
 */
export function getSearchOverlayColors(eid: Entity): {
	fg: number;
	bg: number;
	matchFg: number;
	matchBg: number;
	currentMatchFg: number;
	currentMatchBg: number;
} | null {
	const state = stateMap.get(eid);
	if (!state) {
		return null;
	}
	return {
		fg: state.fg,
		bg: state.bg,
		matchFg: state.matchFg,
		matchBg: state.matchBg,
		currentMatchFg: state.currentMatchFg,
		currentMatchBg: state.currentMatchBg,
	};
}

/**
 * Resets the SearchOverlay component store. Useful for testing.
 *
 * @internal
 */
export function resetSearchOverlayStore(): void {
	SearchOverlay.isSearchOverlay.fill(0);
	SearchOverlay.visible.fill(0);
	stateMap.clear();
}
