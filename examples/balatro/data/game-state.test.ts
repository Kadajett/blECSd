/**
 * Tests for game state management
 */

import { describe, expect, it } from 'vitest';
import {
	createGameState,
	drawCards,
	playCards,
	discardCards,
	nextBlind,
	clearPlayed,
	addMoney,
	spendMoney,
	hasBeatenBlind,
	isGameOver,
	cardsNeededToFillHand,
	MAX_HAND_SIZE,
	STARTING_HANDS,
	STARTING_DISCARDS,
	STARTING_MONEY,
} from './game-state';

describe('createGameState', () => {
	it('creates initial state with shuffled deck', () => {
		const state = createGameState();

		expect(state.deck).toHaveLength(52);
		expect(state.hand).toHaveLength(0);
		expect(state.played).toHaveLength(0);
		expect(state.discardPile).toHaveLength(0);
		expect(state.score).toBe(0);
		expect(state.money).toBe(STARTING_MONEY);
		expect(state.handsRemaining).toBe(STARTING_HANDS);
		expect(state.discardsRemaining).toBe(STARTING_DISCARDS);
		expect(state.currentAnte).toBe(1);
		expect(state.currentBlind.name).toBe('Small Blind');
		expect(state.jokers).toHaveLength(0);
	});
});

describe('drawCards', () => {
	it('draws cards from deck to hand', () => {
		const state = createGameState();
		const newState = drawCards(state, 5);

		expect(newState.hand).toHaveLength(5);
		expect(newState.deck).toHaveLength(47);
	});

	it('respects max hand size', () => {
		let state = createGameState();
		state = drawCards(state, 8);
		state = drawCards(state, 5); // Should not draw more

		expect(state.hand).toHaveLength(MAX_HAND_SIZE);
	});

	it('handles empty deck', () => {
		const state = createGameState();
		// Draw all 52 cards (limited by hand size)
		const newState = drawCards(state, 100);

		expect(newState.hand).toHaveLength(MAX_HAND_SIZE);
	});

	it('does not mutate original state', () => {
		const state = createGameState();
		const deckLength = state.deck.length;
		drawCards(state, 5);

		expect(state.deck).toHaveLength(deckLength);
		expect(state.hand).toHaveLength(0);
	});
});

describe('playCards', () => {
	it('plays selected cards', () => {
		let state = createGameState();
		state = drawCards(state, 5);

		const cardIds = state.hand.slice(0, 3).map(c => c.id);
		const newState = playCards(state, cardIds);

		expect(newState).not.toBeNull();
		expect(newState!.hand).toHaveLength(2);
		expect(newState!.played).toHaveLength(3);
		expect(newState!.handsRemaining).toBe(STARTING_HANDS - 1);
	});

	it('adds score when playing cards', () => {
		let state = createGameState();
		state = drawCards(state, 5);

		const cardIds = state.hand.slice(0, 1).map(c => c.id);
		const newState = playCards(state, cardIds);

		expect(newState).not.toBeNull();
		expect(newState!.score).toBeGreaterThan(0);
	});

	it('returns null for invalid card IDs', () => {
		let state = createGameState();
		state = drawCards(state, 5);

		const result = playCards(state, ['invalid-id']);

		expect(result).toBeNull();
	});

	it('returns null when no hands remaining', () => {
		let state = createGameState();
		state = drawCards(state, 8);

		// Use all hands
		for (let i = 0; i < STARTING_HANDS; i++) {
			const cardIds = [state.hand[0]!.id];
			const newState = playCards(state, cardIds);
			if (newState) {
				state = drawCards(newState, 1);
			}
		}

		const result = playCards(state, [state.hand[0]!.id]);
		expect(result).toBeNull();
	});

	it('returns null for too few cards', () => {
		let state = createGameState();
		state = drawCards(state, 5);

		const result = playCards(state, []);
		expect(result).toBeNull();
	});

	it('returns null for too many cards', () => {
		let state = createGameState();
		state = drawCards(state, 8);

		const cardIds = state.hand.slice(0, 6).map(c => c.id);
		const result = playCards(state, cardIds);

		expect(result).toBeNull();
	});
});

describe('discardCards', () => {
	it('discards selected cards', () => {
		let state = createGameState();
		state = drawCards(state, 5);

		const cardIds = state.hand.slice(0, 2).map(c => c.id);
		const newState = discardCards(state, cardIds);

		expect(newState).not.toBeNull();
		expect(newState!.hand).toHaveLength(3);
		expect(newState!.discardPile).toHaveLength(2);
		expect(newState!.discardsRemaining).toBe(STARTING_DISCARDS - 1);
	});

	it('returns null when no discards remaining', () => {
		let state = createGameState();
		state = drawCards(state, 8);

		// Use all discards
		for (let i = 0; i < STARTING_DISCARDS; i++) {
			const cardIds = [state.hand[0]!.id];
			const newState = discardCards(state, cardIds);
			if (newState) {
				state = drawCards(newState, 1);
			}
		}

		const result = discardCards(state, [state.hand[0]!.id]);
		expect(result).toBeNull();
	});

	it('returns null for empty discard', () => {
		let state = createGameState();
		state = drawCards(state, 5);

		const result = discardCards(state, []);
		expect(result).toBeNull();
	});
});

describe('nextBlind', () => {
	it('advances to big blind from small blind', () => {
		const state = createGameState();
		const newState = nextBlind(state);

		expect(newState.currentBlind.name).toBe('Big Blind');
		expect(newState.money).toBeGreaterThan(state.money);
	});

	it('advances to boss blind from big blind', () => {
		let state = createGameState();
		state = nextBlind(state); // Small -> Big
		state = nextBlind(state); // Big -> Boss

		expect(state.currentBlind.name).toBe('Boss Blind');
	});

	it('advances to next ante from boss blind', () => {
		let state = createGameState();
		state = nextBlind(state); // Small -> Big
		state = nextBlind(state); // Big -> Boss
		state = nextBlind(state); // Boss -> Next ante small

		expect(state.currentAnte).toBe(2);
		expect(state.currentBlind.name).toBe('Small Blind');
	});

	it('resets round state when advancing', () => {
		let state = createGameState();
		state = drawCards(state, 5);
		state = nextBlind(state);

		expect(state.hand).toHaveLength(0);
		expect(state.handsRemaining).toBe(STARTING_HANDS);
		expect(state.discardsRemaining).toBe(STARTING_DISCARDS);
		expect(state.score).toBe(0);
	});
});

describe('clearPlayed', () => {
	it('moves played cards to discard pile', () => {
		let state = createGameState();
		state = drawCards(state, 5);

		const cardIds = state.hand.slice(0, 3).map(c => c.id);
		state = playCards(state, cardIds)!;
		state = clearPlayed(state);

		expect(state.played).toHaveLength(0);
		expect(state.discardPile).toHaveLength(3);
	});
});

describe('money management', () => {
	it('adds money', () => {
		const state = createGameState();
		const newState = addMoney(state, 10);

		expect(newState.money).toBe(STARTING_MONEY + 10);
	});

	it('spends money', () => {
		const state = createGameState();
		const newState = spendMoney(state, 2);

		expect(newState).not.toBeNull();
		expect(newState!.money).toBe(STARTING_MONEY - 2);
	});

	it('returns null for insufficient funds', () => {
		const state = createGameState();
		const result = spendMoney(state, 100);

		expect(result).toBeNull();
	});
});

describe('game condition checks', () => {
	it('hasBeatenBlind returns true when score >= target', () => {
		let state = createGameState();
		// Manually set score above target
		state = { ...state, score: state.currentBlind.chipTarget + 100 };

		expect(hasBeatenBlind(state)).toBe(true);
	});

	it('hasBeatenBlind returns false when score < target', () => {
		const state = createGameState();
		expect(hasBeatenBlind(state)).toBe(false);
	});

	it('isGameOver returns true when no hands and blind not beaten', () => {
		let state = createGameState();
		state = { ...state, handsRemaining: 0 };

		expect(isGameOver(state)).toBe(true);
	});

	it('isGameOver returns false when blind is beaten', () => {
		let state = createGameState();
		state = {
			...state,
			handsRemaining: 0,
			score: state.currentBlind.chipTarget + 100,
		};

		expect(isGameOver(state)).toBe(false);
	});

	it('cardsNeededToFillHand calculates correctly', () => {
		let state = createGameState();
		expect(cardsNeededToFillHand(state)).toBe(MAX_HAND_SIZE);

		state = drawCards(state, 5);
		expect(cardsNeededToFillHand(state)).toBe(3);
	});
});
