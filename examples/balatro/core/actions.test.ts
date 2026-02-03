/**
 * Tests for play and discard action handling
 */

import { describe, expect, it } from 'vitest';
import {
	validatePlay,
	validateDiscard,
	validateDraw,
	playSelectedCards,
	discardSelectedCards,
	drawToFillHand,
	clearPlayedCards,
	playAndDraw,
	discardAndDraw,
	getCardsAtIndices,
	cardIdsToIndices,
	indicesToCardIds,
} from './actions';
import { createGameState, drawCards } from '../data/game-state';

// Helper to set up a game state with cards in hand
function setupGameWithHand(cardCount: number = 8) {
	let state = createGameState();
	state = drawCards(state, cardCount);
	return state;
}

describe('validatePlay', () => {
	it('validates valid play', () => {
		const state = setupGameWithHand();
		const result = validatePlay(state, [0, 1]);

		expect(result.valid).toBe(true);
		expect(result.error).toBeNull();
	});

	it('rejects empty selection', () => {
		const state = setupGameWithHand();
		const result = validatePlay(state, []);

		expect(result.valid).toBe(false);
		expect(result.error).toContain('at least 1');
	});

	it('rejects more than 5 cards', () => {
		const state = setupGameWithHand();
		const result = validatePlay(state, [0, 1, 2, 3, 4, 5]);

		expect(result.valid).toBe(false);
		expect(result.error).toContain('more than 5');
	});

	it('rejects when no hands remaining', () => {
		let state = setupGameWithHand();
		// Use all hands
		state = { ...state, handsRemaining: 0 };

		const result = validatePlay(state, [0]);

		expect(result.valid).toBe(false);
		expect(result.error).toContain('No hands');
	});

	it('rejects invalid indices', () => {
		const state = setupGameWithHand(3);
		const result = validatePlay(state, [0, 10]);

		expect(result.valid).toBe(false);
		expect(result.error).toContain('Invalid');
	});
});

describe('validateDiscard', () => {
	it('validates valid discard', () => {
		const state = setupGameWithHand();
		const result = validateDiscard(state, [0, 1]);

		expect(result.valid).toBe(true);
		expect(result.error).toBeNull();
	});

	it('rejects empty selection', () => {
		const state = setupGameWithHand();
		const result = validateDiscard(state, []);

		expect(result.valid).toBe(false);
		expect(result.error).toContain('at least 1');
	});

	it('rejects when no discards remaining', () => {
		let state = setupGameWithHand();
		state = { ...state, discardsRemaining: 0 };

		const result = validateDiscard(state, [0]);

		expect(result.valid).toBe(false);
		expect(result.error).toContain('No discards');
	});
});

describe('validateDraw', () => {
	it('validates when hand not full', () => {
		const state = setupGameWithHand(5);
		const result = validateDraw(state);

		expect(result.valid).toBe(true);
	});

	it('rejects when hand is full', () => {
		const state = setupGameWithHand(8);
		const result = validateDraw(state);

		expect(result.valid).toBe(false);
		expect(result.error).toContain('full');
	});
});

describe('playSelectedCards', () => {
	it('plays cards and returns result', () => {
		const state = setupGameWithHand();
		const result = playSelectedCards(state, [0, 1]);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.playedCards).toHaveLength(2);
			expect(result.data.handResult).toBeDefined();
			expect(result.data.scoreResult).toBeDefined();
			expect(result.data.newState.hand.length).toBe(6);
			expect(result.data.newState.handsRemaining).toBe(state.handsRemaining - 1);
		}
	});

	it('calculates score correctly', () => {
		const state = setupGameWithHand();
		const result = playSelectedCards(state, [0]);

		expect(result.success).toBe(true);
		if (result.success) {
			// Single card = high card
			expect(result.data.handResult.type).toBe('HIGH_CARD');
			expect(result.data.scoreResult.total).toBeGreaterThan(0);
		}
	});

	it('returns error for invalid play', () => {
		const state = setupGameWithHand();
		const result = playSelectedCards(state, []);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeDefined();
		}
	});

	it('indicates when blind is beaten', () => {
		let state = setupGameWithHand();
		// Set a very low blind target
		state = { ...state, currentBlind: { ...state.currentBlind, chipTarget: 1 } };

		const result = playSelectedCards(state, [0, 1, 2]);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.blindBeaten).toBe(true);
		}
	});
});

describe('discardSelectedCards', () => {
	it('discards cards and returns result', () => {
		const state = setupGameWithHand();
		const result = discardSelectedCards(state, [0, 1]);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.discardedCards).toHaveLength(2);
			expect(result.data.newState.hand.length).toBe(6);
			expect(result.data.newState.discardPile.length).toBe(2);
			expect(result.data.newState.discardsRemaining).toBe(state.discardsRemaining - 1);
		}
	});

	it('returns error for invalid discard', () => {
		let state = setupGameWithHand();
		state = { ...state, discardsRemaining: 0 };

		const result = discardSelectedCards(state, [0]);

		expect(result.success).toBe(false);
	});
});

describe('drawToFillHand', () => {
	it('draws cards to fill hand', () => {
		const state = setupGameWithHand(5);
		const result = drawToFillHand(state);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.drawnCards).toHaveLength(3);
			expect(result.data.newState.hand.length).toBe(8);
		}
	});

	it('draws specified count', () => {
		const state = setupGameWithHand(5);
		const result = drawToFillHand(state, 2);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.drawnCards).toHaveLength(2);
			expect(result.data.newState.hand.length).toBe(7);
		}
	});

	it('returns empty when hand full', () => {
		const state = setupGameWithHand(8);
		const result = drawToFillHand(state);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.drawnCards).toHaveLength(0);
		}
	});
});

describe('clearPlayedCards', () => {
	it('moves played cards to discard', () => {
		let state = setupGameWithHand();
		// Play some cards first
		const playResult = playSelectedCards(state, [0, 1]);
		if (!playResult.success) throw new Error('Play failed');

		state = playResult.data.newState;
		expect(state.played.length).toBe(2);

		const clearedState = clearPlayedCards(state);

		expect(clearedState.played.length).toBe(0);
		expect(clearedState.discardPile.length).toBe(2);
	});
});

describe('playAndDraw', () => {
	it('plays cards and draws replacements', () => {
		const state = setupGameWithHand();
		const result = playAndDraw(state, [0, 1, 2]);

		expect(result.success).toBe(true);
		if (result.success) {
			// Hand should be back to 8
			expect(result.data.newState.hand.length).toBe(8);
			expect(result.data.drawnCards.length).toBe(3);
			expect(result.data.scoreResult).toBeDefined();
		}
	});
});

describe('discardAndDraw', () => {
	it('discards cards and draws replacements', () => {
		const state = setupGameWithHand();
		const result = discardAndDraw(state, [0, 1]);

		expect(result.success).toBe(true);
		if (result.success) {
			// Hand should be back to 8
			expect(result.data.newState.hand.length).toBe(8);
			expect(result.data.drawnCards.length).toBe(2);
			expect(result.data.discardedCards.length).toBe(2);
		}
	});
});

describe('getCardsAtIndices', () => {
	it('returns cards at specified indices', () => {
		const state = setupGameWithHand();
		const cards = getCardsAtIndices(state.hand, [0, 2, 4]);

		expect(cards).toHaveLength(3);
		expect(cards[0]).toBe(state.hand[0]);
		expect(cards[1]).toBe(state.hand[2]);
		expect(cards[2]).toBe(state.hand[4]);
	});

	it('filters invalid indices', () => {
		const state = setupGameWithHand(3);
		const cards = getCardsAtIndices(state.hand, [0, 5, 10]);

		expect(cards).toHaveLength(1);
	});
});

describe('cardIdsToIndices', () => {
	it('converts card IDs to indices', () => {
		const state = setupGameWithHand();
		const ids = [state.hand[0]!.id, state.hand[2]!.id];
		const indices = cardIdsToIndices(state.hand, ids);

		expect(indices).toEqual([0, 2]);
	});

	it('filters unknown IDs', () => {
		const state = setupGameWithHand();
		const ids = [state.hand[0]!.id, 'unknown-id'];
		const indices = cardIdsToIndices(state.hand, ids);

		expect(indices).toEqual([0]);
	});
});

describe('indicesToCardIds', () => {
	it('converts indices to card IDs', () => {
		const state = setupGameWithHand();
		const ids = indicesToCardIds(state.hand, [0, 2]);

		expect(ids).toEqual([state.hand[0]!.id, state.hand[2]!.id]);
	});

	it('filters invalid indices', () => {
		const state = setupGameWithHand(3);
		const ids = indicesToCardIds(state.hand, [0, 10]);

		expect(ids).toHaveLength(1);
		expect(ids[0]).toBe(state.hand[0]!.id);
	});
});
