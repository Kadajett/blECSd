/**
 * Tests for card sorting utilities
 */

import { describe, expect, it } from 'vitest';
import {
	createSortState,
	cycleSortMode,
	setSortMode,
	toggleAutoSort,
	sortByRank,
	sortBySuit,
	sortBySuitThenRank,
	sortCards,
	sortHand,
	getSortModeName,
	getAllSortModes,
	getSuitOrder,
	getSortedIndices,
} from './card-sort';
import { createCard } from './card';
import { getRankValue } from './card';

// Helper cards
const aceOfSpades = createCard('spades', 'A');
const kingOfHearts = createCard('hearts', 'K');
const queenOfDiamonds = createCard('diamonds', 'Q');
const jackOfClubs = createCard('clubs', 'J');
const twoOfHearts = createCard('hearts', '2');
const fiveOfSpades = createCard('spades', '5');

const testHand = [twoOfHearts, aceOfSpades, jackOfClubs, queenOfDiamonds, kingOfHearts, fiveOfSpades];

describe('createSortState', () => {
	it('creates default state', () => {
		const state = createSortState();

		expect(state.mode).toBe('rank');
		expect(state.autoSort).toBe(false);
	});

	it('accepts custom mode', () => {
		const state = createSortState('suit');

		expect(state.mode).toBe('suit');
	});

	it('accepts auto-sort flag', () => {
		const state = createSortState('rank', true);

		expect(state.autoSort).toBe(true);
	});
});

describe('cycleSortMode', () => {
	it('cycles rank to suit', () => {
		const state = createSortState('rank');
		const next = cycleSortMode(state);

		expect(next.mode).toBe('suit');
	});

	it('cycles suit to suit_rank', () => {
		const state = createSortState('suit');
		const next = cycleSortMode(state);

		expect(next.mode).toBe('suit_rank');
	});

	it('wraps suit_rank to rank', () => {
		const state = createSortState('suit_rank');
		const next = cycleSortMode(state);

		expect(next.mode).toBe('rank');
	});

	it('preserves autoSort', () => {
		const state = createSortState('rank', true);
		const next = cycleSortMode(state);

		expect(next.autoSort).toBe(true);
	});
});

describe('setSortMode', () => {
	it('sets specific mode', () => {
		const state = createSortState('rank');
		const updated = setSortMode(state, 'suit_rank');

		expect(updated.mode).toBe('suit_rank');
	});
});

describe('toggleAutoSort', () => {
	it('toggles false to true', () => {
		const state = createSortState('rank', false);
		const toggled = toggleAutoSort(state);

		expect(toggled.autoSort).toBe(true);
	});

	it('toggles true to false', () => {
		const state = createSortState('rank', true);
		const toggled = toggleAutoSort(state);

		expect(toggled.autoSort).toBe(false);
	});
});

describe('sortByRank', () => {
	it('sorts high to low', () => {
		const sorted = sortByRank(testHand);

		expect(getRankValue(sorted[0]!.rank)).toBe(14); // A
		expect(getRankValue(sorted[1]!.rank)).toBe(13); // K
		expect(getRankValue(sorted[sorted.length - 1]!.rank)).toBe(2); // 2
	});

	it('does not mutate original', () => {
		const original = [...testHand];
		sortByRank(testHand);

		expect(testHand).toEqual(original);
	});

	it('handles empty array', () => {
		expect(sortByRank([])).toEqual([]);
	});

	it('handles single card', () => {
		const result = sortByRank([aceOfSpades]);
		expect(result).toHaveLength(1);
	});
});

describe('sortBySuit', () => {
	it('groups by suit', () => {
		const sorted = sortBySuit(testHand);

		// Spades first, then hearts, then diamonds, then clubs
		const suitGroups = sorted.map(c => c.suit);
		const spadesEnd = suitGroups.lastIndexOf('spades');
		const heartsStart = suitGroups.indexOf('hearts');
		const heartsEnd = suitGroups.lastIndexOf('hearts');
		const diamondsStart = suitGroups.indexOf('diamonds');

		expect(spadesEnd).toBeLessThan(heartsStart);
		expect(heartsEnd).toBeLessThan(diamondsStart);
	});
});

describe('sortBySuitThenRank', () => {
	it('sorts by suit then by rank within suit', () => {
		const sorted = sortBySuitThenRank(testHand);

		// Spades: A, 5 (high to low)
		const spades = sorted.filter(c => c.suit === 'spades');
		expect(spades).toHaveLength(2);
		expect(spades[0]!.rank).toBe('A');
		expect(spades[1]!.rank).toBe('5');

		// Hearts: K, 2
		const hearts = sorted.filter(c => c.suit === 'hearts');
		expect(hearts).toHaveLength(2);
		expect(hearts[0]!.rank).toBe('K');
		expect(hearts[1]!.rank).toBe('2');
	});
});

describe('sortCards', () => {
	it('delegates to sortByRank for rank mode', () => {
		const sorted = sortCards(testHand, 'rank');
		expect(getRankValue(sorted[0]!.rank)).toBe(14);
	});

	it('delegates to sortBySuit for suit mode', () => {
		const sorted = sortCards(testHand, 'suit');
		expect(sorted[0]!.suit).toBe('spades');
	});

	it('delegates to sortBySuitThenRank for suit_rank mode', () => {
		const sorted = sortCards(testHand, 'suit_rank');
		expect(sorted[0]!.suit).toBe('spades');
		expect(sorted[0]!.rank).toBe('A');
	});
});

describe('sortHand', () => {
	it('sorts using sort state', () => {
		const state = createSortState('rank');
		const sorted = sortHand(testHand, state);

		expect(getRankValue(sorted[0]!.rank)).toBe(14);
	});
});

describe('getSortModeName', () => {
	it('returns name for rank', () => {
		expect(getSortModeName('rank')).toBe('Rank');
	});

	it('returns name for suit', () => {
		expect(getSortModeName('suit')).toBe('Suit');
	});

	it('returns name for suit_rank', () => {
		expect(getSortModeName('suit_rank')).toBe('Suit & Rank');
	});
});

describe('getAllSortModes', () => {
	it('returns all three modes', () => {
		const modes = getAllSortModes();
		expect(modes).toHaveLength(3);
		expect(modes).toContain('rank');
		expect(modes).toContain('suit');
		expect(modes).toContain('suit_rank');
	});
});

describe('getSuitOrder', () => {
	it('spades first', () => {
		expect(getSuitOrder('spades')).toBe(0);
	});

	it('clubs last', () => {
		expect(getSuitOrder('clubs')).toBe(3);
	});

	it('maintains consistent order', () => {
		expect(getSuitOrder('spades')).toBeLessThan(getSuitOrder('hearts'));
		expect(getSuitOrder('hearts')).toBeLessThan(getSuitOrder('diamonds'));
		expect(getSuitOrder('diamonds')).toBeLessThan(getSuitOrder('clubs'));
	});
});

describe('getSortedIndices', () => {
	it('returns original indices in sorted order', () => {
		const cards = [twoOfHearts, aceOfSpades, kingOfHearts];
		const indices = getSortedIndices(cards, 'rank');

		// A (index 1) first, K (index 2) second, 2 (index 0) third
		expect(indices[0]).toBe(1); // A was at index 1
		expect(indices[1]).toBe(2); // K was at index 2
		expect(indices[2]).toBe(0); // 2 was at index 0
	});

	it('handles empty array', () => {
		expect(getSortedIndices([], 'rank')).toEqual([]);
	});

	it('returns identity for already sorted', () => {
		const cards = [aceOfSpades, kingOfHearts, twoOfHearts];
		const indices = getSortedIndices(cards, 'rank');

		expect(indices).toEqual([0, 1, 2]);
	});
});
