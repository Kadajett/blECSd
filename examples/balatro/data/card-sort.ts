/**
 * Card Sorting Utilities
 *
 * Provides sorting functions for hand cards with multiple sort modes.
 *
 * @module balatro/data/card-sort
 */

import type { Card, Suit } from './card';
import { getRankValue } from './card';

// =============================================================================
// TYPES
// =============================================================================

export type SortMode = 'rank' | 'suit' | 'suit_rank';

export interface SortState {
	readonly mode: SortMode;
	readonly autoSort: boolean;
}

/** Order index for each suit when sorting by suit. */
const SUIT_ORDER: Readonly<Record<Suit, number>> = {
	spades: 0,
	hearts: 1,
	diamonds: 2,
	clubs: 3,
};

/** All available sort modes in cycle order. */
const SORT_MODES: readonly SortMode[] = ['rank', 'suit', 'suit_rank'];

// =============================================================================
// STATE
// =============================================================================

/**
 * Creates initial sort state.
 *
 * @param mode - Starting sort mode
 * @param autoSort - Whether to auto-sort on draw
 * @returns Sort state
 */
export function createSortState(mode: SortMode = 'rank', autoSort = false): SortState {
	return { mode, autoSort };
}

/**
 * Cycles to the next sort mode.
 *
 * @param state - Current sort state
 * @returns Updated state with next mode
 */
export function cycleSortMode(state: SortState): SortState {
	const currentIndex = SORT_MODES.indexOf(state.mode);
	const nextIndex = (currentIndex + 1) % SORT_MODES.length;
	const nextMode = SORT_MODES[nextIndex];
	if (!nextMode) return state;
	return { ...state, mode: nextMode };
}

/**
 * Sets a specific sort mode.
 *
 * @param state - Current sort state
 * @param mode - Mode to set
 * @returns Updated state
 */
export function setSortMode(state: SortState, mode: SortMode): SortState {
	return { ...state, mode };
}

/**
 * Toggles auto-sort on/off.
 *
 * @param state - Current sort state
 * @returns Updated state
 */
export function toggleAutoSort(state: SortState): SortState {
	return { ...state, autoSort: !state.autoSort };
}

// =============================================================================
// SORTING FUNCTIONS
// =============================================================================

/**
 * Sorts cards by rank (high to low).
 *
 * @param cards - Cards to sort
 * @returns Sorted copy
 */
export function sortByRank(cards: readonly Card[]): readonly Card[] {
	return [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
}

/**
 * Sorts cards by suit (grouped by suit, order within group preserved).
 *
 * @param cards - Cards to sort
 * @returns Sorted copy
 */
export function sortBySuit(cards: readonly Card[]): readonly Card[] {
	return [...cards].sort((a, b) => {
		const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
		return suitDiff;
	});
}

/**
 * Sorts cards by suit, then by rank within each suit (high to low).
 *
 * @param cards - Cards to sort
 * @returns Sorted copy
 */
export function sortBySuitThenRank(cards: readonly Card[]): readonly Card[] {
	return [...cards].sort((a, b) => {
		const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
		if (suitDiff !== 0) return suitDiff;
		return getRankValue(b.rank) - getRankValue(a.rank);
	});
}

/**
 * Sorts cards according to the specified mode.
 *
 * @param cards - Cards to sort
 * @param mode - Sort mode
 * @returns Sorted copy
 */
export function sortCards(cards: readonly Card[], mode: SortMode): readonly Card[] {
	switch (mode) {
		case 'rank':
			return sortByRank(cards);
		case 'suit':
			return sortBySuit(cards);
		case 'suit_rank':
			return sortBySuitThenRank(cards);
		default:
			return [...cards];
	}
}

/**
 * Sorts a hand using the current sort state.
 *
 * @param cards - Hand cards
 * @param state - Sort state
 * @returns Sorted hand
 */
export function sortHand(cards: readonly Card[], state: SortState): readonly Card[] {
	return sortCards(cards, state.mode);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Gets the display name for a sort mode.
 *
 * @param mode - Sort mode
 * @returns Human-readable name
 */
export function getSortModeName(mode: SortMode): string {
	switch (mode) {
		case 'rank':
			return 'Rank';
		case 'suit':
			return 'Suit';
		case 'suit_rank':
			return 'Suit & Rank';
		default:
			return 'Unknown';
	}
}

/**
 * Gets all available sort modes.
 *
 * @returns Array of sort modes
 */
export function getAllSortModes(): readonly SortMode[] {
	return SORT_MODES;
}

/**
 * Gets the suit order value for sorting.
 *
 * @param suit - Card suit
 * @returns Numeric order (lower = first)
 */
export function getSuitOrder(suit: Suit): number {
	return SUIT_ORDER[suit];
}

/**
 * Computes the new indices after sorting.
 * Returns an array where result[i] is the original index of the card now at position i.
 *
 * @param cards - Original cards
 * @param mode - Sort mode
 * @returns Index mapping from sorted position to original position
 */
export function getSortedIndices(cards: readonly Card[], mode: SortMode): readonly number[] {
	const indexed = cards.map((card, i) => ({ card, originalIndex: i }));

	indexed.sort((a, b) => {
		switch (mode) {
			case 'rank':
				return getRankValue(b.card.rank) - getRankValue(a.card.rank);
			case 'suit':
				return SUIT_ORDER[a.card.suit] - SUIT_ORDER[b.card.suit];
			case 'suit_rank': {
				const suitDiff = SUIT_ORDER[a.card.suit] - SUIT_ORDER[b.card.suit];
				if (suitDiff !== 0) return suitDiff;
				return getRankValue(b.card.rank) - getRankValue(a.card.rank);
			}
			default:
				return 0;
		}
	});

	return indexed.map(item => item.originalIndex);
}
