/**
 * Tests for round flow and win/loss conditions
 */

import { describe, expect, it } from 'vitest';
import {
	startRound,
	checkWinCondition,
	checkLossCondition,
	getGameEndState,
	isVictory,
	calculateInterest,
	calculateHandsBonus,
	calculateMoneyAward,
	awardMoney,
	endRound,
	getBlindIndex,
	getNextBlindName,
	isBossBlind,
	isFinalAnte,
	getGameProgress,
	getRoundStatus,
	getScoreDeficit,
	getScoreSurplus,
} from './round';
import { createGameState, drawCards, playCards } from '../data/game-state';
import type { GameState } from '../data/game-state';

// Helper to create a state at a specific ante/blind
function createStateAt(ante: number, blindIndex: number): GameState {
	const blindNames = ['Small Blind', 'Big Blind', 'Boss Blind'];
	const rewards = [3, 4, 5];

	let state = createGameState();
	state = {
		...state,
		currentAnte: ante,
		currentBlind: {
			name: blindNames[blindIndex] ?? 'Small Blind',
			chipTarget: 100 * ante * (blindIndex + 1),
			reward: rewards[blindIndex] ?? 3,
		},
	};
	return state;
}

describe('startRound', () => {
	it('resets and deals cards', () => {
		let state = createGameState();
		state = drawCards(state, 8);
		// Play some cards
		const cardIds = [state.hand[0]!.id, state.hand[1]!.id];
		const playedState = playCards(state, cardIds);
		if (!playedState) throw new Error('Play failed');

		const result = startRound(playedState);

		expect(result.newState.hand.length).toBe(8);
		expect(result.newState.played.length).toBe(0);
		expect(result.newState.discardPile.length).toBe(0);
		expect(result.newState.score).toBe(0);
	});

	it('returns blind info', () => {
		const state = createStateAt(2, 1); // Big Blind, Ante 2

		const result = startRound(state);

		expect(result.blindName).toBe('Big Blind');
		expect(result.chipTarget).toBeGreaterThan(0);
		expect(result.hands).toBe(4);
		expect(result.discards).toBe(3);
	});
});

describe('checkWinCondition', () => {
	it('returns false when score below target', () => {
		let state = createGameState();
		state = { ...state, score: 50 }; // Below 100 target

		expect(checkWinCondition(state)).toBe(false);
	});

	it('returns true when score equals target', () => {
		let state = createGameState();
		state = { ...state, score: 100 }; // Equals 100 target

		expect(checkWinCondition(state)).toBe(true);
	});

	it('returns true when score exceeds target', () => {
		let state = createGameState();
		state = { ...state, score: 150 }; // Above 100 target

		expect(checkWinCondition(state)).toBe(true);
	});
});

describe('checkLossCondition', () => {
	it('returns false when hands remaining', () => {
		let state = createGameState();
		state = { ...state, score: 50, handsRemaining: 2 };

		expect(checkLossCondition(state)).toBe(false);
	});

	it('returns false when blind beaten', () => {
		let state = createGameState();
		state = { ...state, score: 100, handsRemaining: 0 };

		expect(checkLossCondition(state)).toBe(false);
	});

	it('returns true when no hands and blind not beaten', () => {
		let state = createGameState();
		state = { ...state, score: 50, handsRemaining: 0 };

		expect(checkLossCondition(state)).toBe(true);
	});
});

describe('getGameEndState', () => {
	it('returns playing when game in progress', () => {
		const state = createGameState();

		const result = getGameEndState(state);

		expect(result.type).toBe('playing');
	});

	it('returns lost when loss condition met', () => {
		let state = createGameState();
		state = { ...state, score: 50, handsRemaining: 0 };

		const result = getGameEndState(state);

		expect(result.type).toBe('lost');
		if (result.type === 'lost') {
			expect(result.ante).toBe(1);
			expect(result.blind).toBe('Small Blind');
		}
	});

	it('returns victory when beat final boss', () => {
		let state = createStateAt(8, 2); // Boss Blind, Ante 8
		state = { ...state, score: state.currentBlind.chipTarget };

		const result = getGameEndState(state);

		expect(result.type).toBe('victory');
		if (result.type === 'victory') {
			expect(result.finalScore).toBeGreaterThan(0);
		}
	});

	it('returns playing when beat boss but not final ante', () => {
		let state = createStateAt(5, 2); // Boss Blind, Ante 5
		state = { ...state, score: state.currentBlind.chipTarget };

		const result = getGameEndState(state);

		expect(result.type).toBe('playing');
	});
});

describe('isVictory', () => {
	it('returns true for victory state', () => {
		let state = createStateAt(8, 2);
		state = { ...state, score: state.currentBlind.chipTarget };

		expect(isVictory(state)).toBe(true);
	});

	it('returns false for non-victory state', () => {
		const state = createGameState();

		expect(isVictory(state)).toBe(false);
	});
});

describe('calculateInterest', () => {
	it('returns 0 for no money', () => {
		expect(calculateInterest(0)).toBe(0);
	});

	it('returns 0 for less than $5', () => {
		expect(calculateInterest(4)).toBe(0);
	});

	it('returns $1 per $5', () => {
		expect(calculateInterest(5)).toBe(1);
		expect(calculateInterest(10)).toBe(2);
		expect(calculateInterest(15)).toBe(3);
	});

	it('caps at $25 (5 interest)', () => {
		expect(calculateInterest(25)).toBe(5);
		expect(calculateInterest(50)).toBe(5);
		expect(calculateInterest(100)).toBe(5);
	});
});

describe('calculateHandsBonus', () => {
	it('returns $1 per remaining hand', () => {
		expect(calculateHandsBonus(0)).toBe(0);
		expect(calculateHandsBonus(1)).toBe(1);
		expect(calculateHandsBonus(3)).toBe(3);
		expect(calculateHandsBonus(4)).toBe(4);
	});
});

describe('calculateMoneyAward', () => {
	it('includes base reward', () => {
		const state = createStateAt(1, 0); // Small Blind (reward 3)

		const breakdown = calculateMoneyAward(state);

		expect(breakdown.baseReward).toBe(3);
	});

	it('includes interest', () => {
		let state = createStateAt(1, 0);
		state = { ...state, money: 15 }; // $15 = $3 interest

		const breakdown = calculateMoneyAward(state);

		expect(breakdown.interestEarned).toBe(3);
	});

	it('includes hands bonus', () => {
		let state = createStateAt(1, 0);
		state = { ...state, handsRemaining: 2 }; // 2 hands = $2 bonus

		const breakdown = calculateMoneyAward(state);

		expect(breakdown.handsBonus).toBe(2);
	});

	it('totals all components', () => {
		let state = createStateAt(1, 1); // Big Blind (reward 4)
		state = { ...state, money: 10, handsRemaining: 3 };
		// 4 base + 2 interest + 3 hands = 9

		const breakdown = calculateMoneyAward(state);

		expect(breakdown.total).toBe(9);
	});
});

describe('awardMoney', () => {
	it('adds calculated award to money', () => {
		let state = createStateAt(1, 0); // Small Blind (reward 3)
		state = { ...state, money: 5, handsRemaining: 1 };
		// 3 base + 1 interest + 1 hands = 5

		const newState = awardMoney(state);

		expect(newState.money).toBe(10); // 5 + 5
	});
});

describe('endRound', () => {
	it('returns loss result when not beaten', () => {
		let state = createGameState();
		state = { ...state, score: 50, handsRemaining: 0 };

		const result = endRound(state);

		expect(result.won).toBe(false);
		expect(result.moneyAwarded).toBe(0);
	});

	it('returns win result with money when beaten', () => {
		let state = createGameState();
		state = { ...state, score: 100, handsRemaining: 2, money: 10 };

		const result = endRound(state);

		expect(result.won).toBe(true);
		expect(result.moneyAwarded).toBeGreaterThan(0);
		expect(result.newState.money).toBeGreaterThan(state.money);
		expect(result.newState.roundPhase).toBe('shop');
	});
});

describe('getBlindIndex', () => {
	it('returns 0 for Small Blind', () => {
		expect(getBlindIndex('Small Blind')).toBe(0);
	});

	it('returns 1 for Big Blind', () => {
		expect(getBlindIndex('Big Blind')).toBe(1);
	});

	it('returns 2 for Boss Blind', () => {
		expect(getBlindIndex('Boss Blind')).toBe(2);
	});

	it('returns 0 for unknown', () => {
		expect(getBlindIndex('Unknown')).toBe(0);
	});
});

describe('getNextBlindName', () => {
	it('returns Big after Small', () => {
		expect(getNextBlindName('Small Blind')).toBe('Big Blind');
	});

	it('returns Boss after Big', () => {
		expect(getNextBlindName('Big Blind')).toBe('Boss Blind');
	});

	it('returns null after Boss', () => {
		expect(getNextBlindName('Boss Blind')).toBeNull();
	});
});

describe('isBossBlind', () => {
	it('returns true for boss blind', () => {
		const state = createStateAt(1, 2);
		expect(isBossBlind(state)).toBe(true);
	});

	it('returns false for other blinds', () => {
		const state = createStateAt(1, 0);
		expect(isBossBlind(state)).toBe(false);
	});
});

describe('isFinalAnte', () => {
	it('returns true for ante 8', () => {
		const state = createStateAt(8, 0);
		expect(isFinalAnte(state)).toBe(true);
	});

	it('returns false for earlier antes', () => {
		const state = createStateAt(5, 0);
		expect(isFinalAnte(state)).toBe(false);
	});
});

describe('getGameProgress', () => {
	it('returns 0 for start of game', () => {
		const state = createStateAt(1, 0);
		expect(getGameProgress(state)).toBe(0);
	});

	it('returns progress based on completed blinds', () => {
		// Ante 2, Big Blind = 1 ante complete (3 blinds) + 1 blind
		// = 4 blinds / 24 total = ~17%
		const state = createStateAt(2, 1);
		const progress = getGameProgress(state);

		expect(progress).toBeGreaterThan(10);
		expect(progress).toBeLessThan(25);
	});

	it('returns near 100 for final ante boss', () => {
		const state = createStateAt(8, 2);
		const progress = getGameProgress(state);

		expect(progress).toBeGreaterThan(90);
	});
});

describe('getRoundStatus', () => {
	it('returns current round info', () => {
		let state = createStateAt(3, 1);
		state = { ...state, score: 150, handsRemaining: 2, discardsRemaining: 1 };

		const status = getRoundStatus(state);

		expect(status.ante).toBe(3);
		expect(status.blind).toBe('Big Blind');
		expect(status.score).toBe(150);
		expect(status.target).toBeGreaterThan(0);
		expect(status.hands).toBe(2);
		expect(status.discards).toBe(1);
		expect(status.progress).toBeGreaterThan(0);
	});
});

describe('getScoreDeficit', () => {
	it('returns deficit when below target', () => {
		let state = createGameState();
		state = { ...state, score: 30 }; // Target is 100

		expect(getScoreDeficit(state)).toBe(70);
	});

	it('returns 0 when at or above target', () => {
		let state = createGameState();
		state = { ...state, score: 100 };

		expect(getScoreDeficit(state)).toBe(0);

		state = { ...state, score: 150 };
		expect(getScoreDeficit(state)).toBe(0);
	});
});

describe('getScoreSurplus', () => {
	it('returns 0 when below target', () => {
		let state = createGameState();
		state = { ...state, score: 30 };

		expect(getScoreSurplus(state)).toBe(0);
	});

	it('returns surplus when above target', () => {
		let state = createGameState();
		state = { ...state, score: 150 }; // Target is 100

		expect(getScoreSurplus(state)).toBe(50);
	});
});
