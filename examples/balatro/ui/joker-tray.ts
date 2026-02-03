/**
 * Joker Tray Display and Management
 *
 * Implements the joker tray UI for displaying, reordering, and selling jokers.
 *
 * @module balatro/ui/joker-tray
 */

import type { Joker } from '../data/joker';
import { getJokerSellValue, MAX_JOKER_SLOTS } from '../data/joker';

// =============================================================================
// TYPES
// =============================================================================

export type JokerTrayMode = 'view' | 'sell' | 'reorder';

export interface JokerTrayState {
	readonly jokers: readonly Joker[];
	readonly selectedIndex: number;
	readonly mode: JokerTrayMode;
	readonly maxSlots: number;
	readonly hoveredIndex: number | null;
	readonly dragSourceIndex: number | null;
}

export interface JokerTooltip {
	readonly joker: Joker;
	readonly x: number;
	readonly y: number;
	readonly visible: boolean;
}

export interface JokerCardRenderData {
	readonly joker: Joker;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly selected: boolean;
	readonly hovered: boolean;
	readonly dragging: boolean;
}

export interface JokerTrayRenderData {
	readonly mode: JokerTrayMode;
	readonly cards: readonly JokerCardRenderData[];
	readonly emptySlots: number;
	readonly maxSlots: number;
	readonly selectedJoker: Joker | null;
	readonly tooltip: JokerTooltip | null;
	readonly trayX: number;
	readonly trayY: number;
	readonly trayWidth: number;
	readonly trayHeight: number;
}

export type JokerTrayInput =
	| { type: 'navigate'; direction: 'left' | 'right' }
	| { type: 'select' }
	| { type: 'sell_mode' }
	| { type: 'reorder_mode' }
	| { type: 'cancel' }
	| { type: 'hover'; index: number | null }
	| { type: 'drag_start'; index: number }
	| { type: 'drag_end'; index: number };

export type JokerTrayAction =
	| { type: 'none' }
	| { type: 'sell'; jokerIndex: number; sellValue: number }
	| { type: 'reorder'; fromIndex: number; toIndex: number }
	| { type: 'view_joker'; joker: Joker };

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default joker card width in characters */
export const JOKER_CARD_WIDTH = 11;

/** Default joker card height in characters */
export const JOKER_CARD_HEIGHT = 6;

/** Gap between joker cards */
export const JOKER_CARD_GAP = 1;

/** Tooltip display delay in ms */
export const TOOLTIP_DELAY_MS = 500;

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial joker tray state.
 *
 * @param jokers - Initial jokers
 * @param maxSlots - Maximum joker slots
 * @returns Initial state
 */
export function createJokerTrayState(
	jokers: readonly Joker[] = [],
	maxSlots: number = MAX_JOKER_SLOTS,
): JokerTrayState {
	return {
		jokers,
		selectedIndex: 0,
		mode: 'view',
		maxSlots,
		hoveredIndex: null,
		dragSourceIndex: null,
	};
}

/**
 * Updates jokers in the tray.
 *
 * @param state - Current state
 * @param jokers - New jokers
 * @returns Updated state
 */
export function updateJokers(
	state: JokerTrayState,
	jokers: readonly Joker[],
): JokerTrayState {
	const newIndex = Math.min(state.selectedIndex, Math.max(0, jokers.length - 1));
	return {
		...state,
		jokers,
		selectedIndex: jokers.length > 0 ? newIndex : 0,
	};
}

/**
 * Adds a joker to the tray.
 *
 * @param state - Current state
 * @param joker - Joker to add
 * @returns Updated state
 */
export function addJoker(state: JokerTrayState, joker: Joker): JokerTrayState {
	if (state.jokers.length >= state.maxSlots) {
		return state;
	}
	return {
		...state,
		jokers: [...state.jokers, joker],
	};
}

/**
 * Removes a joker from the tray by index.
 *
 * @param state - Current state
 * @param index - Index to remove
 * @returns Updated state
 */
export function removeJoker(state: JokerTrayState, index: number): JokerTrayState {
	if (index < 0 || index >= state.jokers.length) {
		return state;
	}
	const newJokers = state.jokers.filter((_, i) => i !== index);
	const newIndex = Math.min(state.selectedIndex, Math.max(0, newJokers.length - 1));
	return {
		...state,
		jokers: newJokers,
		selectedIndex: newJokers.length > 0 ? newIndex : 0,
		mode: 'view',
		dragSourceIndex: null,
	};
}

/**
 * Reorders jokers in the tray.
 *
 * @param state - Current state
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 * @returns Updated state
 */
export function reorderJokers(
	state: JokerTrayState,
	fromIndex: number,
	toIndex: number,
): JokerTrayState {
	if (fromIndex < 0 || fromIndex >= state.jokers.length) {
		return state;
	}
	if (toIndex < 0 || toIndex >= state.jokers.length) {
		return state;
	}
	if (fromIndex === toIndex) {
		return state;
	}

	const newJokers = [...state.jokers];
	const [removed] = newJokers.splice(fromIndex, 1);
	if (removed) {
		newJokers.splice(toIndex, 0, removed);
	}

	return {
		...state,
		jokers: newJokers,
		selectedIndex: toIndex,
		mode: 'view',
		dragSourceIndex: null,
	};
}

/**
 * Sets the max joker slots.
 *
 * @param state - Current state
 * @param maxSlots - New maximum
 * @returns Updated state
 */
export function setMaxSlots(state: JokerTrayState, maxSlots: number): JokerTrayState {
	return { ...state, maxSlots };
}

// =============================================================================
// NAVIGATION
// =============================================================================

/**
 * Navigates left in the joker tray.
 */
export function navigateLeft(state: JokerTrayState): JokerTrayState {
	if (state.jokers.length === 0) return state;
	const newIndex = state.selectedIndex > 0 ? state.selectedIndex - 1 : state.jokers.length - 1;
	return { ...state, selectedIndex: newIndex };
}

/**
 * Navigates right in the joker tray.
 */
export function navigateRight(state: JokerTrayState): JokerTrayState {
	if (state.jokers.length === 0) return state;
	const newIndex = state.selectedIndex < state.jokers.length - 1 ? state.selectedIndex + 1 : 0;
	return { ...state, selectedIndex: newIndex };
}

/**
 * Sets the selected index.
 *
 * @param state - Current state
 * @param index - Index to select
 * @returns Updated state
 */
export function setSelectedIndex(state: JokerTrayState, index: number): JokerTrayState {
	if (index < 0 || index >= state.jokers.length) {
		return state;
	}
	return { ...state, selectedIndex: index };
}

// =============================================================================
// MODE MANAGEMENT
// =============================================================================

/**
 * Enters sell mode.
 */
export function enterSellMode(state: JokerTrayState): JokerTrayState {
	if (state.jokers.length === 0) return state;
	return { ...state, mode: 'sell' };
}

/**
 * Enters reorder mode.
 */
export function enterReorderMode(state: JokerTrayState): JokerTrayState {
	if (state.jokers.length < 2) return state;
	return {
		...state,
		mode: 'reorder',
		dragSourceIndex: state.selectedIndex,
	};
}

/**
 * Exits current mode back to view mode.
 */
export function exitMode(state: JokerTrayState): JokerTrayState {
	return {
		...state,
		mode: 'view',
		dragSourceIndex: null,
	};
}

/**
 * Sets hover state.
 *
 * @param state - Current state
 * @param index - Hovered index or null
 * @returns Updated state
 */
export function setHovered(state: JokerTrayState, index: number | null): JokerTrayState {
	return { ...state, hoveredIndex: index };
}

// =============================================================================
// INPUT PROCESSING
// =============================================================================

/**
 * Processes joker tray input.
 *
 * @param state - Current state
 * @param input - Input event
 * @returns Tuple of new state and action
 */
export function processJokerTrayInput(
	state: JokerTrayState,
	input: JokerTrayInput,
): [JokerTrayState, JokerTrayAction] {
	switch (input.type) {
		case 'navigate':
			if (input.direction === 'left') {
				return [navigateLeft(state), { type: 'none' }];
			}
			return [navigateRight(state), { type: 'none' }];

		case 'select':
			return processSelect(state);

		case 'sell_mode':
			if (state.mode === 'sell') {
				return [exitMode(state), { type: 'none' }];
			}
			return [enterSellMode(state), { type: 'none' }];

		case 'reorder_mode':
			if (state.mode === 'reorder') {
				return [exitMode(state), { type: 'none' }];
			}
			return [enterReorderMode(state), { type: 'none' }];

		case 'cancel':
			return [exitMode(state), { type: 'none' }];

		case 'hover':
			return [setHovered(state, input.index), { type: 'none' }];

		case 'drag_start':
			return [{ ...state, dragSourceIndex: input.index }, { type: 'none' }];

		case 'drag_end':
			if (state.dragSourceIndex !== null && state.dragSourceIndex !== input.index) {
				const newState = reorderJokers(state, state.dragSourceIndex, input.index);
				return [
					newState,
					{ type: 'reorder', fromIndex: state.dragSourceIndex, toIndex: input.index },
				];
			}
			return [{ ...state, dragSourceIndex: null }, { type: 'none' }];

		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Processes select action based on current mode.
 */
function processSelect(state: JokerTrayState): [JokerTrayState, JokerTrayAction] {
	if (state.jokers.length === 0) {
		return [state, { type: 'none' }];
	}

	const selectedJoker = state.jokers[state.selectedIndex];
	if (!selectedJoker) {
		return [state, { type: 'none' }];
	}

	switch (state.mode) {
		case 'view':
			return [state, { type: 'view_joker', joker: selectedJoker }];

		case 'sell': {
			const sellValue = getJokerSellValue(selectedJoker);
			return [state, { type: 'sell', jokerIndex: state.selectedIndex, sellValue }];
		}

		case 'reorder':
			if (state.dragSourceIndex !== null && state.dragSourceIndex !== state.selectedIndex) {
				const newState = reorderJokers(state, state.dragSourceIndex, state.selectedIndex);
				return [
					newState,
					{ type: 'reorder', fromIndex: state.dragSourceIndex, toIndex: state.selectedIndex },
				];
			}
			return [exitMode(state), { type: 'none' }];

		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Converts a key to joker tray input.
 *
 * @param key - Key name
 * @returns Input or null
 */
export function keyToJokerTrayInput(key: string): JokerTrayInput | null {
	switch (key) {
		case 'left':
		case 'h':
			return { type: 'navigate', direction: 'left' };
		case 'right':
		case 'l':
			return { type: 'navigate', direction: 'right' };
		case 'return':
		case 'space':
			return { type: 'select' };
		case 's':
		case 'S':
			return { type: 'sell_mode' };
		case 'r':
		case 'R':
			return { type: 'reorder_mode' };
		case 'escape':
			return { type: 'cancel' };
		default:
			return null;
	}
}

// =============================================================================
// RENDER DATA
// =============================================================================

/**
 * Calculates the tray dimensions.
 *
 * @param maxSlots - Maximum joker slots
 * @returns Width and height
 */
export function calculateTrayDimensions(maxSlots: number): { width: number; height: number } {
	const width = maxSlots * JOKER_CARD_WIDTH + (maxSlots - 1) * JOKER_CARD_GAP + 4;
	const height = JOKER_CARD_HEIGHT + 2;
	return { width, height };
}

/**
 * Calculates the position for a joker card in the tray.
 *
 * @param index - Joker index
 * @param trayX - Tray X position
 * @param trayY - Tray Y position
 * @returns X and Y position
 */
export function getJokerCardPosition(
	index: number,
	trayX: number,
	trayY: number,
): { x: number; y: number } {
	const x = trayX + 2 + index * (JOKER_CARD_WIDTH + JOKER_CARD_GAP);
	const y = trayY + 1;
	return { x, y };
}

/**
 * Gets render data for the joker tray.
 *
 * @param state - Tray state
 * @param trayX - Tray X position on screen
 * @param trayY - Tray Y position on screen
 * @returns Render data
 */
export function getJokerTrayRenderData(
	state: JokerTrayState,
	trayX: number,
	trayY: number,
): JokerTrayRenderData {
	const { width, height } = calculateTrayDimensions(state.maxSlots);

	const cards: JokerCardRenderData[] = state.jokers.map((joker, index) => {
		const pos = getJokerCardPosition(index, trayX, trayY);
		return {
			joker,
			x: pos.x,
			y: pos.y,
			width: JOKER_CARD_WIDTH,
			height: JOKER_CARD_HEIGHT,
			selected: index === state.selectedIndex,
			hovered: index === state.hoveredIndex,
			dragging: index === state.dragSourceIndex,
		};
	});

	const selectedJoker = state.jokers[state.selectedIndex] ?? null;

	// Calculate tooltip position for selected joker
	let tooltip: JokerTooltip | null = null;
	if (selectedJoker && state.hoveredIndex === state.selectedIndex) {
		const pos = getJokerCardPosition(state.selectedIndex, trayX, trayY);
		tooltip = {
			joker: selectedJoker,
			x: pos.x,
			y: pos.y + JOKER_CARD_HEIGHT + 1,
			visible: true,
		};
	}

	return {
		mode: state.mode,
		cards,
		emptySlots: state.maxSlots - state.jokers.length,
		maxSlots: state.maxSlots,
		selectedJoker,
		tooltip,
		trayX,
		trayY,
		trayWidth: width,
		trayHeight: height,
	};
}

// =============================================================================
// JOKER CARD FORMATTING
// =============================================================================

/**
 * Formats a joker's effect for display.
 *
 * @param joker - Joker to format
 * @returns Formatted effect string
 */
export function formatJokerEffect(joker: Joker): string {
	const { effect } = joker;

	switch (effect.type) {
		case 'add_mult':
			if (effect.perCard) return `+${effect.value} Mult/card`;
			return `+${effect.value} Mult`;
		case 'add_chips':
			if (effect.perCard) return `+${effect.value} Chips/card`;
			return `+${effect.value} Chips`;
		case 'mult_mult':
			return `x${effect.value} Mult`;
		case 'add_money':
			return `+$${effect.value}`;
		default:
			return 'Effect';
	}
}

/**
 * Gets the rarity color for a joker.
 *
 * @param joker - Joker
 * @returns Color code
 */
export function getJokerRarityColor(joker: Joker): number {
	switch (joker.rarity) {
		case 'common':
			return 0x808080; // Gray
		case 'uncommon':
			return 0x00aa00; // Green
		case 'rare':
			return 0x5555ff; // Blue
		case 'legendary':
			return 0xffaa00; // Orange
		default:
			return 0xffffff; // White
	}
}

/**
 * Gets the sell mode indicator text.
 *
 * @param joker - Joker
 * @returns Sell text
 */
export function getSellModeText(joker: Joker): string {
	const value = getJokerSellValue(joker);
	return `SELL: $${value}`;
}

// =============================================================================
// TOOLTIP FORMATTING
// =============================================================================

export interface TooltipLines {
	readonly name: string;
	readonly effect: string;
	readonly description: string;
	readonly rarity: string;
	readonly sellValue: string;
}

/**
 * Gets tooltip content for a joker.
 *
 * @param joker - Joker
 * @returns Tooltip lines
 */
export function getTooltipContent(joker: Joker): TooltipLines {
	return {
		name: joker.name,
		effect: formatJokerEffect(joker),
		description: joker.description,
		rarity: joker.rarity.charAt(0).toUpperCase() + joker.rarity.slice(1),
		sellValue: `Sell: $${getJokerSellValue(joker)}`,
	};
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if joker tray has room for more jokers.
 *
 * @param state - Current state
 * @returns True if room available
 */
export function hasRoom(state: JokerTrayState): boolean {
	return state.jokers.length < state.maxSlots;
}

/**
 * Gets the number of jokers in the tray.
 *
 * @param state - Current state
 * @returns Joker count
 */
export function getJokerCount(state: JokerTrayState): number {
	return state.jokers.length;
}

/**
 * Gets the joker at the selected index.
 *
 * @param state - Current state
 * @returns Selected joker or null
 */
export function getSelectedJoker(state: JokerTrayState): Joker | null {
	return state.jokers[state.selectedIndex] ?? null;
}

/**
 * Checks if in sell mode.
 *
 * @param state - Current state
 * @returns True if in sell mode
 */
export function isInSellMode(state: JokerTrayState): boolean {
	return state.mode === 'sell';
}

/**
 * Checks if in reorder mode.
 *
 * @param state - Current state
 * @returns True if in reorder mode
 */
export function isInReorderMode(state: JokerTrayState): boolean {
	return state.mode === 'reorder';
}

/**
 * Gets the total sell value of all jokers.
 *
 * @param state - Current state
 * @returns Total sell value
 */
export function getTotalSellValue(state: JokerTrayState): number {
	return state.jokers.reduce((sum, j) => sum + getJokerSellValue(j), 0);
}
