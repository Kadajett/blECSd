/**
 * Round Flow and Win/Loss Conditions
 *
 * Implements round progression, win/loss checking, and money awards.
 *
 * @module balatro/core/round
 */

import type { GameState } from '../data/game-state';
import {
	resetRound,
	drawCards,
	hasBeatenBlind,
	isGameOver,
	STARTING_HANDS,
	STARTING_DISCARDS,
	MAX_HAND_SIZE,
} from '../data/game-state';

// =============================================================================
// TYPES
// =============================================================================

export interface RoundStartResult {
	readonly newState: GameState;
	readonly blindName: string;
	readonly chipTarget: number;
	readonly hands: number;
	readonly discards: number;
}

export interface RoundEndResult {
	readonly won: boolean;
	readonly newState: GameState;
	readonly moneyAwarded: number;
	readonly moneyBreakdown: MoneyBreakdown;
}

export interface MoneyBreakdown {
	readonly baseReward: number;
	readonly interestEarned: number;
	readonly handsBonus: number;
	readonly total: number;
}

export type GameEndState =
	| { readonly type: 'playing' }
	| { readonly type: 'lost'; readonly ante: number; readonly blind: string }
	| { readonly type: 'victory'; readonly finalScore: number; readonly finalMoney: number };

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum money for interest calculation */
const MAX_INTEREST_MONEY = 25;

/** Interest rate (per $5 held) */
const INTEREST_PER_5 = 1;

/** Money per remaining hand when beating blind */
const MONEY_PER_HAND = 1;

/** Final ante number */
const FINAL_ANTE = 8;

// =============================================================================
// ROUND FLOW
// =============================================================================

/**
 * Starts a new round by resetting hands/discards and dealing initial cards.
 *
 * @param state - Current game state
 * @returns Round start result with new state and round info
 */
export function startRound(state: GameState): RoundStartResult {
	// Reset the round (reshuffles deck, clears hand/played/discard)
	let newState = resetRound(state);

	// Deal initial hand
	newState = drawCards(newState, MAX_HAND_SIZE);

	return {
		newState,
		blindName: state.currentBlind.name,
		chipTarget: state.currentBlind.chipTarget,
		hands: STARTING_HANDS,
		discards: STARTING_DISCARDS,
	};
}

/**
 * Checks the current win condition.
 *
 * @param state - Current game state
 * @returns True if the blind has been beaten
 */
export function checkWinCondition(state: GameState): boolean {
	return hasBeatenBlind(state);
}

/**
 * Checks the current loss condition.
 *
 * @param state - Current game state
 * @returns True if the game is lost (no hands and blind not beaten)
 */
export function checkLossCondition(state: GameState): boolean {
	return isGameOver(state);
}

/**
 * Gets the current game end state (playing, lost, or victory).
 *
 * @param state - Current game state
 * @returns The current game end state
 */
export function getGameEndState(state: GameState): GameEndState {
	// Check for loss
	if (checkLossCondition(state)) {
		return {
			type: 'lost',
			ante: state.currentAnte,
			blind: state.currentBlind.name,
		};
	}

	// Check for victory (beat boss blind on final ante)
	const isBossBlind = state.currentBlind.name.includes('Boss');
	const isFinalAnte = state.currentAnte >= FINAL_ANTE;

	if (checkWinCondition(state) && isBossBlind && isFinalAnte) {
		return {
			type: 'victory',
			finalScore: state.score,
			finalMoney: state.money,
		};
	}

	return { type: 'playing' };
}

/**
 * Checks if the game has reached victory state.
 *
 * @param state - Current game state
 * @returns True if player has won the game
 */
export function isVictory(state: GameState): boolean {
	return getGameEndState(state).type === 'victory';
}

// =============================================================================
// MONEY CALCULATION
// =============================================================================

/**
 * Calculates interest earned based on current money.
 * Earns $1 per $5 held, up to a maximum of $5.
 *
 * @param money - Current money held
 * @returns Interest amount
 */
export function calculateInterest(money: number): number {
	const cappedMoney = Math.min(money, MAX_INTEREST_MONEY);
	return Math.floor(cappedMoney / 5) * INTEREST_PER_5;
}

/**
 * Calculates bonus for remaining hands.
 *
 * @param handsRemaining - Number of hands not used
 * @returns Bonus amount
 */
export function calculateHandsBonus(handsRemaining: number): number {
	return handsRemaining * MONEY_PER_HAND;
}

/**
 * Calculates the full money breakdown for completing a blind.
 *
 * @param state - Current game state
 * @returns Money breakdown with all components
 */
export function calculateMoneyAward(state: GameState): MoneyBreakdown {
	const baseReward = state.currentBlind.reward;
	const interestEarned = calculateInterest(state.money);
	const handsBonus = calculateHandsBonus(state.handsRemaining);

	return {
		baseReward,
		interestEarned,
		handsBonus,
		total: baseReward + interestEarned + handsBonus,
	};
}

/**
 * Awards money to the player for completing a blind.
 *
 * @param state - Current game state
 * @returns New state with money awarded
 */
export function awardMoney(state: GameState): GameState {
	const breakdown = calculateMoneyAward(state);

	return {
		...state,
		money: state.money + breakdown.total,
	};
}

// =============================================================================
// ROUND TRANSITIONS
// =============================================================================

/**
 * Ends the current round and transitions to the next phase.
 *
 * @param state - Current game state
 * @returns Round end result with new state and money breakdown
 */
export function endRound(state: GameState): RoundEndResult {
	const won = checkWinCondition(state);

	if (!won) {
		// Lost - no money awarded
		return {
			won: false,
			newState: state,
			moneyAwarded: 0,
			moneyBreakdown: {
				baseReward: 0,
				interestEarned: 0,
				handsBonus: 0,
				total: 0,
			},
		};
	}

	// Won - calculate and award money
	const moneyBreakdown = calculateMoneyAward(state);
	const newState = awardMoney(state);

	return {
		won: true,
		newState: {
			...newState,
			roundPhase: 'shop',
		},
		moneyAwarded: moneyBreakdown.total,
		moneyBreakdown,
	};
}

/**
 * Gets the blind index (0 = small, 1 = big, 2 = boss).
 *
 * @param blindName - Name of the blind
 * @returns Blind index
 */
export function getBlindIndex(blindName: string): number {
	if (blindName.includes('Small')) return 0;
	if (blindName.includes('Big')) return 1;
	if (blindName.includes('Boss')) return 2;
	return 0;
}

/**
 * Gets the next blind type name.
 *
 * @param currentBlindName - Current blind name
 * @returns Next blind name, or null if boss (needs ante progression)
 */
export function getNextBlindName(currentBlindName: string): string | null {
	const index = getBlindIndex(currentBlindName);
	if (index === 0) return 'Big Blind';
	if (index === 1) return 'Boss Blind';
	return null; // Boss blind completed, need to advance ante
}

/**
 * Checks if the current blind is a boss blind.
 *
 * @param state - Current game state
 * @returns True if current blind is boss
 */
export function isBossBlind(state: GameState): boolean {
	return state.currentBlind.name.includes('Boss');
}

/**
 * Checks if the current ante is the final ante.
 *
 * @param state - Current game state
 * @returns True if on final ante
 */
export function isFinalAnte(state: GameState): boolean {
	return state.currentAnte >= FINAL_ANTE;
}

// =============================================================================
// PROGRESS TRACKING
// =============================================================================

/**
 * Gets the overall game progress as a percentage.
 *
 * @param state - Current game state
 * @returns Progress percentage (0-100)
 */
export function getGameProgress(state: GameState): number {
	// 8 antes × 3 blinds = 24 total blinds
	const totalBlinds = FINAL_ANTE * 3;
	const completedAntes = state.currentAnte - 1;
	const currentBlindIndex = getBlindIndex(state.currentBlind.name);

	const completedBlinds = completedAntes * 3 + currentBlindIndex;
	return Math.round((completedBlinds / totalBlinds) * 100);
}

/**
 * Gets a summary of the current round status.
 *
 * @param state - Current game state
 * @returns Status summary
 */
export function getRoundStatus(state: GameState): {
	readonly ante: number;
	readonly blind: string;
	readonly score: number;
	readonly target: number;
	readonly hands: number;
	readonly discards: number;
	readonly progress: number;
} {
	return {
		ante: state.currentAnte,
		blind: state.currentBlind.name,
		score: state.score,
		target: state.currentBlind.chipTarget,
		hands: state.handsRemaining,
		discards: state.discardsRemaining,
		progress: getGameProgress(state),
	};
}

/**
 * Gets the score deficit (how many more chips needed to beat blind).
 *
 * @param state - Current game state
 * @returns Deficit (0 if blind is beaten)
 */
export function getScoreDeficit(state: GameState): number {
	const deficit = state.currentBlind.chipTarget - state.score;
	return Math.max(0, deficit);
}

/**
 * Gets the score surplus (how many chips above target).
 *
 * @param state - Current game state
 * @returns Surplus (0 if blind not beaten)
 */
export function getScoreSurplus(state: GameState): number {
	const surplus = state.score - state.currentBlind.chipTarget;
	return Math.max(0, surplus);
}
