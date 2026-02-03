/**
 * Card Data Types and Utilities
 *
 * Pure data definitions for playing cards.
 * All functions are pure, no mutations, no classes.
 *
 * @module balatro/data/card
 */

// =============================================================================
// TYPES
// =============================================================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
	readonly id: string;
	readonly suit: Suit;
	readonly rank: Rank;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export const SUIT_SYMBOLS: Readonly<Record<Suit, string>> = {
	hearts: '♥',
	diamonds: '♦',
	clubs: '♣',
	spades: '♠',
};

export const RANK_VALUES: Readonly<Record<Rank, number>> = {
	'A': 14,
	'2': 2,
	'3': 3,
	'4': 4,
	'5': 5,
	'6': 6,
	'7': 7,
	'8': 8,
	'9': 9,
	'10': 10,
	'J': 11,
	'Q': 12,
	'K': 13,
};

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates a card with a unique ID.
 */
export function createCard(suit: Suit, rank: Rank): Card {
	return Object.freeze({
		id: `${rank}_${suit}`,
		suit,
		rank,
	});
}

/**
 * Creates a standard 52-card deck.
 */
export function createDeck(): readonly Card[] {
	const deck: Card[] = [];

	for (const suit of SUITS) {
		for (const rank of RANKS) {
			deck.push(createCard(suit, rank));
		}
	}

	return Object.freeze(deck);
}

/**
 * Fisher-Yates shuffle (returns new array).
 */
export function shuffleDeck(deck: readonly Card[]): readonly Card[] {
	const shuffled = [...deck];

	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = shuffled[i];
		const swap = shuffled[j];
		if (temp && swap) {
			shuffled[i] = swap;
			shuffled[j] = temp;
		}
	}

	return Object.freeze(shuffled);
}

// =============================================================================
// CARD QUERIES
// =============================================================================

/**
 * Gets the suit symbol for a suit.
 */
export function getSuitSymbol(suit: Suit): string {
	return SUIT_SYMBOLS[suit];
}

/**
 * Checks if a suit is red (hearts or diamonds).
 */
export function isRedSuit(suit: Suit): boolean {
	return suit === 'hearts' || suit === 'diamonds';
}

/**
 * Gets the numeric value of a rank (for sorting/straights).
 */
export function getRankValue(rank: Rank): number {
	return RANK_VALUES[rank];
}

/**
 * Compares two cards by rank (high to low).
 */
export function compareByRank(a: Card, b: Card): number {
	return getRankValue(b.rank) - getRankValue(a.rank);
}
