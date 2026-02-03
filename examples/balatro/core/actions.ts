/**
 * Play and Discard Action Handling
 *
 * Implements the core gameplay actions for playing and discarding cards.
 *
 * @module balatro/core/actions
 */

import type { Card } from '../data/card';
import type { GameState } from '../data/game-state';
import type { ScoreResult, HandResult } from '../data/hand';
import {
	playCards as gamePlayCards,
	discardCards as gameDiscardCards,
	drawCards as gameDrawCards,
	clearPlayed,
	cardsNeededToFillHand,
	hasBeatenBlind,
	MAX_HAND_SIZE,
	MAX_PLAY_SIZE,
} from '../data/game-state';
import { evaluateHand, calculateScore } from '../data/hand';

// =============================================================================
// TYPES
// =============================================================================

export type ActionResult<T> =
	| { readonly success: true; readonly data: T }
	| { readonly success: false; readonly error: string };

export interface PlayResult {
	readonly newState: GameState;
	readonly playedCards: readonly Card[];
	readonly handResult: HandResult;
	readonly scoreResult: ScoreResult;
	readonly blindBeaten: boolean;
}

export interface DiscardResult {
	readonly newState: GameState;
	readonly discardedCards: readonly Card[];
}

export interface DrawResult {
	readonly newState: GameState;
	readonly drawnCards: readonly Card[];
}

export interface ActionValidation {
	readonly valid: boolean;
	readonly error: string | null;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates a play action.
 *
 * @param state - Current game state
 * @param selectedIndices - Indices of cards to play
 * @returns Validation result
 */
export function validatePlay(
	state: GameState,
	selectedIndices: readonly number[],
): ActionValidation {
	if (selectedIndices.length === 0) {
		return { valid: false, error: 'Select at least 1 card to play' };
	}

	if (selectedIndices.length > MAX_PLAY_SIZE) {
		return { valid: false, error: `Cannot play more than ${MAX_PLAY_SIZE} cards` };
	}

	if (state.handsRemaining <= 0) {
		return { valid: false, error: 'No hands remaining' };
	}

	// Check all indices are valid
	for (const index of selectedIndices) {
		if (index < 0 || index >= state.hand.length) {
			return { valid: false, error: 'Invalid card selection' };
		}
	}

	return { valid: true, error: null };
}

/**
 * Validates a discard action.
 *
 * @param state - Current game state
 * @param selectedIndices - Indices of cards to discard
 * @returns Validation result
 */
export function validateDiscard(
	state: GameState,
	selectedIndices: readonly number[],
): ActionValidation {
	if (selectedIndices.length === 0) {
		return { valid: false, error: 'Select at least 1 card to discard' };
	}

	if (selectedIndices.length > MAX_PLAY_SIZE) {
		return { valid: false, error: `Cannot discard more than ${MAX_PLAY_SIZE} cards` };
	}

	if (state.discardsRemaining <= 0) {
		return { valid: false, error: 'No discards remaining' };
	}

	// Check all indices are valid
	for (const index of selectedIndices) {
		if (index < 0 || index >= state.hand.length) {
			return { valid: false, error: 'Invalid card selection' };
		}
	}

	return { valid: true, error: null };
}

/**
 * Validates a draw action.
 *
 * @param state - Current game state
 * @returns Validation result
 */
export function validateDraw(state: GameState): ActionValidation {
	if (state.hand.length >= MAX_HAND_SIZE) {
		return { valid: false, error: 'Hand is full' };
	}

	if (state.deck.length === 0) {
		return { valid: false, error: 'Deck is empty' };
	}

	return { valid: true, error: null };
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Plays selected cards from the hand.
 *
 * @param state - Current game state
 * @param selectedIndices - Indices of cards to play (in hand array)
 * @returns Action result with new state and scoring info
 */
export function playSelectedCards(
	state: GameState,
	selectedIndices: readonly number[],
): ActionResult<PlayResult> {
	// Validate
	const validation = validatePlay(state, selectedIndices);
	if (!validation.valid) {
		return { success: false, error: validation.error! };
	}

	// Get cards to play
	const cardsToPlay = selectedIndices.map(i => state.hand[i]!);
	const cardIds = cardsToPlay.map(c => c.id);

	// Evaluate hand before state change
	const handResult = evaluateHand(cardsToPlay);
	const scoreResult = calculateScore(handResult);

	// Update game state
	const newState = gamePlayCards(state, cardIds);
	if (!newState) {
		return { success: false, error: 'Failed to play cards' };
	}

	// Check if blind is beaten
	const blindBeaten = hasBeatenBlind(newState);

	return {
		success: true,
		data: {
			newState,
			playedCards: cardsToPlay,
			handResult,
			scoreResult,
			blindBeaten,
		},
	};
}

/**
 * Discards selected cards from the hand.
 *
 * @param state - Current game state
 * @param selectedIndices - Indices of cards to discard
 * @returns Action result with new state
 */
export function discardSelectedCards(
	state: GameState,
	selectedIndices: readonly number[],
): ActionResult<DiscardResult> {
	// Validate
	const validation = validateDiscard(state, selectedIndices);
	if (!validation.valid) {
		return { success: false, error: validation.error! };
	}

	// Get cards to discard
	const cardsToDiscard = selectedIndices.map(i => state.hand[i]!);
	const cardIds = cardsToDiscard.map(c => c.id);

	// Update game state
	const newState = gameDiscardCards(state, cardIds);
	if (!newState) {
		return { success: false, error: 'Failed to discard cards' };
	}

	return {
		success: true,
		data: {
			newState,
			discardedCards: cardsToDiscard,
		},
	};
}

/**
 * Draws cards to fill the hand.
 *
 * @param state - Current game state
 * @param count - Number of cards to draw (defaults to filling hand)
 * @returns Action result with new state and drawn cards
 */
export function drawToFillHand(
	state: GameState,
	count?: number,
): ActionResult<DrawResult> {
	// Validate
	const validation = validateDraw(state);
	if (!validation.valid && count === undefined) {
		// If explicitly drawing 0, that's fine
		return {
			success: true,
			data: {
				newState: state,
				drawnCards: [],
			},
		};
	}

	// Calculate how many to draw
	const needed = cardsNeededToFillHand(state);
	const toDraw = count !== undefined ? Math.min(count, needed) : needed;

	if (toDraw <= 0) {
		return {
			success: true,
			data: {
				newState: state,
				drawnCards: [],
			},
		};
	}

	// Get cards that will be drawn
	const drawnCards = state.deck.slice(0, toDraw);

	// Update game state
	const newState = gameDrawCards(state, toDraw);

	return {
		success: true,
		data: {
			newState,
			drawnCards: drawnCards as Card[],
		},
	};
}

/**
 * Clears played cards to discard pile.
 *
 * @param state - Current game state
 * @returns New state with played cards cleared
 */
export function clearPlayedCards(state: GameState): GameState {
	return clearPlayed(state);
}

// =============================================================================
// COMPOSITE ACTIONS
// =============================================================================

/**
 * Performs play action and immediately draws replacement cards.
 *
 * @param state - Current game state
 * @param selectedIndices - Indices of cards to play
 * @returns Action result with full play cycle
 */
export function playAndDraw(
	state: GameState,
	selectedIndices: readonly number[],
): ActionResult<PlayResult & { drawnCards: readonly Card[] }> {
	// Play the cards
	const playResult = playSelectedCards(state, selectedIndices);
	if (!playResult.success) {
		return playResult;
	}

	// Clear played cards
	let newState = clearPlayedCards(playResult.data.newState);

	// Draw replacements
	const drawResult = drawToFillHand(newState);
	if (!drawResult.success) {
		return {
			success: true,
			data: {
				...playResult.data,
				newState,
				drawnCards: [],
			},
		};
	}

	return {
		success: true,
		data: {
			...playResult.data,
			newState: drawResult.data.newState,
			drawnCards: drawResult.data.drawnCards,
		},
	};
}

/**
 * Performs discard action and immediately draws replacement cards.
 *
 * @param state - Current game state
 * @param selectedIndices - Indices of cards to discard
 * @returns Action result with discard and draw
 */
export function discardAndDraw(
	state: GameState,
	selectedIndices: readonly number[],
): ActionResult<DiscardResult & { drawnCards: readonly Card[] }> {
	// Discard the cards
	const discardResult = discardSelectedCards(state, selectedIndices);
	if (!discardResult.success) {
		return discardResult;
	}

	// Draw replacements
	const drawResult = drawToFillHand(discardResult.data.newState);
	if (!drawResult.success) {
		return {
			success: true,
			data: {
				...discardResult.data,
				drawnCards: [],
			},
		};
	}

	return {
		success: true,
		data: {
			...discardResult.data,
			newState: drawResult.data.newState,
			drawnCards: drawResult.data.drawnCards,
		},
	};
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the cards at specified indices.
 */
export function getCardsAtIndices(
	hand: readonly Card[],
	indices: readonly number[],
): readonly Card[] {
	return indices
		.filter(i => i >= 0 && i < hand.length)
		.map(i => hand[i]!);
}

/**
 * Converts card IDs to indices in hand.
 */
export function cardIdsToIndices(
	hand: readonly Card[],
	cardIds: readonly string[],
): readonly number[] {
	return cardIds
		.map(id => hand.findIndex(c => c.id === id))
		.filter(i => i !== -1);
}

/**
 * Converts indices to card IDs.
 */
export function indicesToCardIds(
	hand: readonly Card[],
	indices: readonly number[],
): readonly string[] {
	return indices
		.filter(i => i >= 0 && i < hand.length)
		.map(i => hand[i]!.id);
}
