/**
 * Poker Hand Evaluation
 *
 * Pure functions for evaluating poker hands and calculating scores.
 * Implements Balatro-style scoring: (Base Chips + Card Chips) × Multiplier
 *
 * @module balatro/data/hand
 */

import type { Card, Rank } from './card';
import { getRankValue } from './card';

// =============================================================================
// TYPES
// =============================================================================

export type HandType =
	| 'HIGH_CARD'
	| 'PAIR'
	| 'TWO_PAIR'
	| 'THREE_OF_A_KIND'
	| 'STRAIGHT'
	| 'FLUSH'
	| 'FULL_HOUSE'
	| 'FOUR_OF_A_KIND'
	| 'STRAIGHT_FLUSH'
	| 'ROYAL_FLUSH';

export interface HandResult {
	readonly type: HandType;
	readonly scoringCards: readonly Card[];
	readonly kickers: readonly Card[];
}

export interface HandScore {
	readonly baseChips: number;
	readonly baseMult: number;
}

export interface ScoreResult {
	readonly handType: HandType;
	readonly baseChips: number;
	readonly cardChips: number;
	readonly mult: number;
	readonly total: number;
}

// =============================================================================
// HAND SCORES (Balatro-style base values)
// =============================================================================

const HAND_SCORES: Readonly<Record<HandType, HandScore>> = {
	HIGH_CARD: { baseChips: 5, baseMult: 1 },
	PAIR: { baseChips: 10, baseMult: 2 },
	TWO_PAIR: { baseChips: 20, baseMult: 2 },
	THREE_OF_A_KIND: { baseChips: 30, baseMult: 3 },
	STRAIGHT: { baseChips: 30, baseMult: 4 },
	FLUSH: { baseChips: 35, baseMult: 4 },
	FULL_HOUSE: { baseChips: 40, baseMult: 4 },
	FOUR_OF_A_KIND: { baseChips: 60, baseMult: 7 },
	STRAIGHT_FLUSH: { baseChips: 100, baseMult: 8 },
	ROYAL_FLUSH: { baseChips: 100, baseMult: 8 },
};

const HAND_NAMES: Readonly<Record<HandType, string>> = {
	HIGH_CARD: 'High Card',
	PAIR: 'Pair',
	TWO_PAIR: 'Two Pair',
	THREE_OF_A_KIND: 'Three of a Kind',
	STRAIGHT: 'Straight',
	FLUSH: 'Flush',
	FULL_HOUSE: 'Full House',
	FOUR_OF_A_KIND: 'Four of a Kind',
	STRAIGHT_FLUSH: 'Straight Flush',
	ROYAL_FLUSH: 'Royal Flush',
};

/** Chip value contributed by each rank */
const RANK_CHIPS: Readonly<Record<Rank, number>> = {
	'A': 11,
	'K': 10,
	'Q': 10,
	'J': 10,
	'10': 10,
	'9': 9,
	'8': 8,
	'7': 7,
	'6': 6,
	'5': 5,
	'4': 4,
	'3': 3,
	'2': 2,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the chip value for a card's rank.
 */
export function getCardChips(card: Card): number {
	return RANK_CHIPS[card.rank];
}

/**
 * Counts occurrences of each rank in the hand.
 */
function countRanks(cards: readonly Card[]): Map<Rank, Card[]> {
	const counts = new Map<Rank, Card[]>();

	for (const card of cards) {
		const existing = counts.get(card.rank) ?? [];
		counts.set(card.rank, [...existing, card]);
	}

	return counts;
}

/**
 * Gets groups of cards sorted by count (descending) then rank (descending).
 */
function getGroupsByCount(rankCounts: Map<Rank, Card[]>): Card[][] {
	return [...rankCounts.values()]
		.filter(group => group.length > 0)
		.sort((a, b) => {
			// Sort by count first (descending)
			if (b.length !== a.length) {
				return b.length - a.length;
			}
			// Then by rank (descending)
			const rankA = a[0]?.rank ?? '2';
			const rankB = b[0]?.rank ?? '2';
			return getRankValue(rankB) - getRankValue(rankA);
		});
}

/**
 * Checks if all cards are the same suit.
 */
function isFlush(cards: readonly Card[]): boolean {
	if (cards.length < 5) return false;
	const suit = cards[0]?.suit;
	return cards.every(c => c.suit === suit);
}

/**
 * Checks for a straight and returns the high card value (or 0 if not a straight).
 * Handles wheel straight (A-2-3-4-5) where Ace is low.
 */
function getStraightHighCard(cards: readonly Card[]): number {
	if (cards.length < 5) return 0;

	// Get unique rank values, sorted descending
	const values = [...new Set(cards.map(c => getRankValue(c.rank)))].sort((a, b) => b - a);

	if (values.length < 5) return 0;

	// Check for regular straight (5 consecutive values)
	for (let i = 0; i <= values.length - 5; i++) {
		const slice = values.slice(i, i + 5);
		const high = slice[0] ?? 0;
		const low = slice[4] ?? 0;
		if (high - low === 4) {
			return high;
		}
	}

	// Check for wheel (A-2-3-4-5)
	// Ace = 14, so we need [14, 5, 4, 3, 2]
	if (
		values.includes(14) &&
		values.includes(5) &&
		values.includes(4) &&
		values.includes(3) &&
		values.includes(2)
	) {
		return 5; // 5-high straight (wheel)
	}

	return 0;
}

/**
 * Gets the cards that form a straight, sorted by value.
 */
function getStraightCards(cards: readonly Card[], highCard: number): readonly Card[] {
	// For wheel straight, Ace counts as 1
	const isWheel = highCard === 5;

	// Map cards to their effective value for this straight
	const withValue = cards.map(c => ({
		card: c,
		value: isWheel && c.rank === 'A' ? 1 : getRankValue(c.rank),
	}));

	// Determine which values we need
	const neededValues = isWheel
		? [5, 4, 3, 2, 1]
		: [highCard, highCard - 1, highCard - 2, highCard - 3, highCard - 4];

	// Pick one card for each needed value
	const result: Card[] = [];
	for (const needed of neededValues) {
		const match = withValue.find(
			cv => cv.value === needed && !result.includes(cv.card),
		);
		if (match) {
			result.push(match.card);
		}
	}

	return result;
}

// =============================================================================
// HAND EVALUATION
// =============================================================================

/**
 * Evaluates a poker hand and returns the best hand type with scoring cards.
 *
 * @param cards - Cards to evaluate (typically 5, but can handle more)
 * @returns HandResult with type, scoring cards, and kickers
 *
 * @example
 * ```typescript
 * const result = evaluateHand([aceSpades, aceHearts, kingDiamonds, queenClubs, jackHearts]);
 * // result.type === 'PAIR'
 * // result.scoringCards === [aceSpades, aceHearts]
 * ```
 */
export function evaluateHand(cards: readonly Card[]): HandResult {
	if (cards.length === 0) {
		return { type: 'HIGH_CARD', scoringCards: [], kickers: [] };
	}

	// Sort cards by rank (high to low)
	const sorted = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));

	const rankCounts = countRanks(sorted);
	const groups = getGroupsByCount(rankCounts);
	const flush = isFlush(sorted);
	const straightHigh = getStraightHighCard(sorted);
	const straight = straightHigh > 0;

	// Check for straight flush / royal flush
	if (flush && straight && cards.length >= 5) {
		const straightCards = getStraightCards(sorted, straightHigh);
		const isRoyal = straightHigh === 14; // Ace-high straight flush
		return {
			type: isRoyal ? 'ROYAL_FLUSH' : 'STRAIGHT_FLUSH',
			scoringCards: straightCards,
			kickers: [],
		};
	}

	// Four of a kind
	const quads = groups.find(g => g.length === 4);
	if (quads) {
		const kickers = sorted.filter(c => !quads.includes(c));
		return {
			type: 'FOUR_OF_A_KIND',
			scoringCards: quads,
			kickers: kickers.slice(0, 1),
		};
	}

	// Full house (three of a kind + pair)
	const trips = groups.find(g => g.length === 3);
	const pairs = groups.filter(g => g.length === 2);
	if (trips && pairs.length > 0) {
		const pair = pairs[0] ?? [];
		return {
			type: 'FULL_HOUSE',
			scoringCards: [...trips, ...pair],
			kickers: [],
		};
	}

	// Flush
	if (flush) {
		return {
			type: 'FLUSH',
			scoringCards: sorted.slice(0, 5),
			kickers: [],
		};
	}

	// Straight
	if (straight) {
		const straightCards = getStraightCards(sorted, straightHigh);
		return {
			type: 'STRAIGHT',
			scoringCards: straightCards,
			kickers: [],
		};
	}

	// Three of a kind
	if (trips) {
		const kickers = sorted.filter(c => !trips.includes(c));
		return {
			type: 'THREE_OF_A_KIND',
			scoringCards: trips,
			kickers: kickers.slice(0, 2),
		};
	}

	// Two pair
	if (pairs.length >= 2) {
		const pair1 = pairs[0] ?? [];
		const pair2 = pairs[1] ?? [];
		const pairCards = [...pair1, ...pair2];
		const kickers = sorted.filter(c => !pairCards.includes(c));
		return {
			type: 'TWO_PAIR',
			scoringCards: pairCards,
			kickers: kickers.slice(0, 1),
		};
	}

	// One pair
	if (pairs.length === 1) {
		const pair = pairs[0] ?? [];
		const kickers = sorted.filter(c => !pair.includes(c));
		return {
			type: 'PAIR',
			scoringCards: pair,
			kickers: kickers.slice(0, 3),
		};
	}

	// High card
	const highCard = sorted[0];
	return {
		type: 'HIGH_CARD',
		scoringCards: highCard ? [highCard] : [],
		kickers: sorted.slice(1, 5),
	};
}

/**
 * Calculates the final score for a hand result.
 *
 * Formula: (Base Chips + Card Chips) × Multiplier
 *
 * @param result - HandResult from evaluateHand
 * @returns ScoreResult with chips, mult, and total
 *
 * @example
 * ```typescript
 * const result = evaluateHand(cards);
 * const score = calculateScore(result);
 * console.log(`${score.total} points (${score.baseChips + score.cardChips} × ${score.mult})`);
 * ```
 */
export function calculateScore(result: HandResult): ScoreResult {
	const handScore = HAND_SCORES[result.type];

	// Sum chip values of scoring cards
	const cardChips = result.scoringCards.reduce((sum, card) => sum + getCardChips(card), 0);

	const totalChips = handScore.baseChips + cardChips;
	const total = totalChips * handScore.baseMult;

	return {
		handType: result.type,
		baseChips: handScore.baseChips,
		cardChips,
		mult: handScore.baseMult,
		total,
	};
}

/**
 * Gets the display name for a hand type.
 */
export function getHandName(type: HandType): string {
	return HAND_NAMES[type];
}

/**
 * Gets the base score for a hand type.
 */
export function getHandBaseScore(type: HandType): HandScore {
	return HAND_SCORES[type];
}

/**
 * Compares two hand results to determine which is better.
 * Returns positive if a is better, negative if b is better, 0 if equal.
 */
export function compareHands(a: HandResult, b: HandResult): number {
	const handOrder: readonly HandType[] = [
		'HIGH_CARD',
		'PAIR',
		'TWO_PAIR',
		'THREE_OF_A_KIND',
		'STRAIGHT',
		'FLUSH',
		'FULL_HOUSE',
		'FOUR_OF_A_KIND',
		'STRAIGHT_FLUSH',
		'ROYAL_FLUSH',
	];

	const aIndex = handOrder.indexOf(a.type);
	const bIndex = handOrder.indexOf(b.type);

	if (aIndex !== bIndex) {
		return aIndex - bIndex;
	}

	// Same hand type, compare by scoring cards
	for (let i = 0; i < Math.min(a.scoringCards.length, b.scoringCards.length); i++) {
		const aCard = a.scoringCards[i];
		const bCard = b.scoringCards[i];
		if (aCard && bCard) {
			const diff = getRankValue(aCard.rank) - getRankValue(bCard.rank);
			if (diff !== 0) return diff;
		}
	}

	// Compare kickers
	for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
		const aKicker = a.kickers[i];
		const bKicker = b.kickers[i];
		if (aKicker && bKicker) {
			const diff = getRankValue(aKicker.rank) - getRankValue(bKicker.rank);
			if (diff !== 0) return diff;
		}
	}

	return 0;
}
