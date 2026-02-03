/**
 * Game State Management
 *
 * Core game state structure and immutable state transitions for Balatro.
 * All state modifications return new state objects.
 *
 * @module balatro/data/game-state
 */

import type { Card } from './card';
import { createDeck, shuffleDeck } from './card';
import { evaluateHand, calculateScore } from './hand';

// =============================================================================
// TYPES
// =============================================================================

export interface BlindInfo {
	readonly name: string;
	readonly chipTarget: number;
	readonly reward: number;
}

export interface JokerEffect {
	readonly type: 'mult' | 'chips' | 'mult_x' | 'money' | 'special';
	readonly value: number;
	readonly trigger: 'always' | 'on_play' | 'on_score' | 'on_discard';
}

export interface Joker {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
	readonly effect: JokerEffect;
}

export type StarterDeckType = 'red' | 'blue' | 'yellow';

export interface StarterDeck {
	readonly type: StarterDeckType;
	readonly name: string;
	readonly description: string;
	readonly color: number;
	readonly bonusHands: number;
	readonly bonusDiscards: number;
	readonly bonusMoney: number;
}

export const STARTER_DECKS: readonly StarterDeck[] = [
	{ type: 'red', name: 'Red Deck', description: '+1 discard each round', color: 0xcc2222, bonusHands: 0, bonusDiscards: 1, bonusMoney: 0 },
	{ type: 'blue', name: 'Blue Deck', description: '+1 hand each round', color: 0x2255cc, bonusHands: 1, bonusDiscards: 0, bonusMoney: 0 },
	{ type: 'yellow', name: 'Yellow Deck', description: '+$10 starting money', color: 0xccaa22, bonusHands: 0, bonusDiscards: 0, bonusMoney: 10 },
];

export interface GameState {
	readonly deck: readonly Card[];
	readonly hand: readonly Card[];
	readonly played: readonly Card[];
	readonly discardPile: readonly Card[];
	readonly score: number;
	readonly money: number;
	readonly currentBlind: BlindInfo;
	readonly currentAnte: number;
	readonly handsRemaining: number;
	readonly discardsRemaining: number;
	readonly jokers: readonly Joker[];
	readonly roundPhase: 'betting' | 'playing' | 'scoring' | 'shop';
	readonly starterDeck: StarterDeckType;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum cards in hand */
export const MAX_HAND_SIZE = 8;

/** Minimum cards to play */
export const MIN_PLAY_SIZE = 1;

/** Maximum cards to play */
export const MAX_PLAY_SIZE = 5;

/** Starting hands per round */
export const STARTING_HANDS = 4;

/** Starting discards per round */
export const STARTING_DISCARDS = 3;

/** Starting money */
export const STARTING_MONEY = 4;

/** Blind progression for each ante */
const BLINDS: readonly BlindInfo[][] = [
	// Ante 1
	[
		{ name: 'Small Blind', chipTarget: 100, reward: 3 },
		{ name: 'Big Blind', chipTarget: 150, reward: 4 },
		{ name: 'Boss Blind', chipTarget: 200, reward: 5 },
	],
	// Ante 2
	[
		{ name: 'Small Blind', chipTarget: 300, reward: 3 },
		{ name: 'Big Blind', chipTarget: 450, reward: 4 },
		{ name: 'Boss Blind', chipTarget: 600, reward: 5 },
	],
	// Ante 3
	[
		{ name: 'Small Blind', chipTarget: 800, reward: 3 },
		{ name: 'Big Blind', chipTarget: 1200, reward: 4 },
		{ name: 'Boss Blind', chipTarget: 1600, reward: 5 },
	],
	// Ante 4
	[
		{ name: 'Small Blind', chipTarget: 2000, reward: 3 },
		{ name: 'Big Blind', chipTarget: 3000, reward: 4 },
		{ name: 'Boss Blind', chipTarget: 4000, reward: 5 },
	],
	// Ante 5
	[
		{ name: 'Small Blind', chipTarget: 5000, reward: 3 },
		{ name: 'Big Blind', chipTarget: 7500, reward: 4 },
		{ name: 'Boss Blind', chipTarget: 10000, reward: 5 },
	],
	// Ante 6
	[
		{ name: 'Small Blind', chipTarget: 11000, reward: 3 },
		{ name: 'Big Blind', chipTarget: 16500, reward: 4 },
		{ name: 'Boss Blind', chipTarget: 22000, reward: 5 },
	],
	// Ante 7
	[
		{ name: 'Small Blind', chipTarget: 20000, reward: 3 },
		{ name: 'Big Blind', chipTarget: 30000, reward: 4 },
		{ name: 'Boss Blind', chipTarget: 40000, reward: 5 },
	],
	// Ante 8
	[
		{ name: 'Small Blind', chipTarget: 35000, reward: 3 },
		{ name: 'Big Blind', chipTarget: 52500, reward: 4 },
		{ name: 'Boss Blind', chipTarget: 70000, reward: 5 },
	],
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the blind info for a given ante and blind index.
 */
function getBlindInfo(ante: number, blindIndex: number): BlindInfo {
	const anteIndex = Math.min(ante - 1, BLINDS.length - 1);
	const blinds = BLINDS[anteIndex];
	if (!blinds) {
		return { name: 'Unknown', chipTarget: 100, reward: 3 };
	}
	return blinds[Math.min(blindIndex, blinds.length - 1)] ?? blinds[0] ?? {
		name: 'Unknown',
		chipTarget: 100,
		reward: 3,
	};
}

/**
 * Generates a unique ID for entities.
 */
function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Gets the starter deck config for a deck type.
 */
function getStarterDeckConfig(deckType: StarterDeckType): StarterDeck {
	return STARTER_DECKS.find(d => d.type === deckType) ?? STARTER_DECKS[0]!;
}

// =============================================================================
// STATE CREATION
// =============================================================================

/**
 * Creates a fresh game state for a new game.
 *
 * @param deckType - Optional starter deck type (defaults to 'red')
 */
export function createGameState(deckType: StarterDeckType = 'red'): GameState {
	const deck = shuffleDeck(createDeck());
	const config = getStarterDeckConfig(deckType);

	return {
		deck,
		hand: [],
		played: [],
		discardPile: [],
		score: 0,
		money: STARTING_MONEY + config.bonusMoney,
		currentBlind: getBlindInfo(1, 0),
		currentAnte: 1,
		handsRemaining: STARTING_HANDS + config.bonusHands,
		discardsRemaining: STARTING_DISCARDS + config.bonusDiscards,
		jokers: [],
		roundPhase: 'playing',
		starterDeck: deckType,
	};
}

/**
 * Resets the state for a new round (keeping persistent data).
 * Applies starter deck bonuses to hands/discards.
 */
export function resetRound(state: GameState): GameState {
	// Combine all cards back into deck and shuffle
	const allCards = [...state.deck, ...state.hand, ...state.played, ...state.discardPile];
	const deck = shuffleDeck(allCards);
	const config = getStarterDeckConfig(state.starterDeck);

	return {
		...state,
		deck,
		hand: [],
		played: [],
		discardPile: [],
		score: 0,
		handsRemaining: STARTING_HANDS + config.bonusHands,
		discardsRemaining: STARTING_DISCARDS + config.bonusDiscards,
		roundPhase: 'playing',
	};
}

// =============================================================================
// STATE TRANSITIONS
// =============================================================================

/**
 * Draws cards from the deck to the hand.
 *
 * @param state - Current game state
 * @param count - Number of cards to draw
 * @returns New game state with cards drawn
 */
export function drawCards(state: GameState, count: number): GameState {
	const availableSpace = MAX_HAND_SIZE - state.hand.length;
	const actualCount = Math.min(count, availableSpace, state.deck.length);

	if (actualCount <= 0) {
		return state;
	}

	const drawnCards = state.deck.slice(0, actualCount);
	const remainingDeck = state.deck.slice(actualCount);

	return {
		...state,
		deck: remainingDeck,
		hand: [...state.hand, ...drawnCards],
	};
}

/**
 * Plays selected cards from hand to the play area.
 *
 * @param state - Current game state
 * @param cardIds - IDs of cards to play
 * @returns New game state with cards played, or null if invalid
 */
export function playCards(state: GameState, cardIds: readonly string[]): GameState | null {
	// Validate play size
	if (cardIds.length < MIN_PLAY_SIZE || cardIds.length > MAX_PLAY_SIZE) {
		return null;
	}

	// Validate we have hands remaining
	if (state.handsRemaining <= 0) {
		return null;
	}

	// Find cards in hand
	const cardsToPlay: Card[] = [];
	const remainingHand: Card[] = [];

	for (const card of state.hand) {
		if (cardIds.includes(card.id)) {
			cardsToPlay.push(card);
		} else {
			remainingHand.push(card);
		}
	}

	// Validate all cards were found
	if (cardsToPlay.length !== cardIds.length) {
		return null;
	}

	// Evaluate the hand and calculate score
	const handResult = evaluateHand(cardsToPlay);
	const scoreResult = calculateScore(handResult);

	return {
		...state,
		hand: remainingHand,
		played: cardsToPlay,
		score: state.score + scoreResult.total,
		handsRemaining: state.handsRemaining - 1,
	};
}

/**
 * Discards selected cards from hand.
 *
 * @param state - Current game state
 * @param cardIds - IDs of cards to discard
 * @returns New game state with cards discarded, or null if invalid
 */
export function discardCards(state: GameState, cardIds: readonly string[]): GameState | null {
	// Validate discard count
	if (cardIds.length === 0 || cardIds.length > MAX_PLAY_SIZE) {
		return null;
	}

	// Validate we have discards remaining
	if (state.discardsRemaining <= 0) {
		return null;
	}

	// Find cards in hand
	const cardsToDiscard: Card[] = [];
	const remainingHand: Card[] = [];

	for (const card of state.hand) {
		if (cardIds.includes(card.id)) {
			cardsToDiscard.push(card);
		} else {
			remainingHand.push(card);
		}
	}

	// Validate all cards were found
	if (cardsToDiscard.length !== cardIds.length) {
		return null;
	}

	return {
		...state,
		hand: remainingHand,
		discardPile: [...state.discardPile, ...cardsToDiscard],
		discardsRemaining: state.discardsRemaining - 1,
	};
}

/**
 * Moves to the next blind after winning.
 *
 * @param state - Current game state
 * @returns New game state at next blind
 */
export function nextBlind(state: GameState): GameState {
	// Calculate blind index (0 = small, 1 = big, 2 = boss)
	const currentBlindIndex = ['Small Blind', 'Big Blind', 'Boss Blind'].indexOf(
		state.currentBlind.name.replace(/.*?(Small|Big|Boss) Blind.*/, '$1 Blind'),
	);

	// Check if we completed the boss blind (move to next ante)
	if (currentBlindIndex >= 2 || state.currentBlind.name.includes('Boss')) {
		return nextAnte(state);
	}

	// Move to next blind in current ante
	const newBlindIndex = currentBlindIndex + 1;
	const reward = state.currentBlind.reward;

	const newState = resetRound({
		...state,
		money: state.money + reward,
		currentBlind: getBlindInfo(state.currentAnte, newBlindIndex),
	});

	return newState;
}

/**
 * Moves to the next ante (after completing boss blind).
 *
 * @param state - Current game state
 * @returns New game state at next ante
 */
export function nextAnte(state: GameState): GameState {
	const newAnte = Math.min(state.currentAnte + 1, 8);
	const reward = state.currentBlind.reward;

	const newState = resetRound({
		...state,
		money: state.money + reward,
		currentAnte: newAnte,
		currentBlind: getBlindInfo(newAnte, 0),
	});

	return newState;
}

/**
 * Clears played cards to discard pile (after scoring animation).
 *
 * @param state - Current game state
 * @returns New game state with played cards cleared
 */
export function clearPlayed(state: GameState): GameState {
	return {
		...state,
		played: [],
		discardPile: [...state.discardPile, ...state.played],
	};
}

/**
 * Adds a joker to the player's collection.
 *
 * @param state - Current game state
 * @param joker - Joker to add (without ID)
 * @returns New game state with joker added
 */
export function addJoker(
	state: GameState,
	joker: Omit<Joker, 'id'>,
): GameState {
	const newJoker: Joker = {
		...joker,
		id: generateId(),
	};

	return {
		...state,
		jokers: [...state.jokers, newJoker],
	};
}

/**
 * Removes a joker from the player's collection.
 *
 * @param state - Current game state
 * @param jokerId - ID of joker to remove
 * @returns New game state with joker removed
 */
export function removeJoker(state: GameState, jokerId: string): GameState {
	return {
		...state,
		jokers: state.jokers.filter(j => j.id !== jokerId),
	};
}

/**
 * Adds money to the player's balance.
 *
 * @param state - Current game state
 * @param amount - Amount to add
 * @returns New game state with money added
 */
export function addMoney(state: GameState, amount: number): GameState {
	return {
		...state,
		money: state.money + amount,
	};
}

/**
 * Spends money from the player's balance.
 *
 * @param state - Current game state
 * @param amount - Amount to spend
 * @returns New game state with money spent, or null if insufficient funds
 */
export function spendMoney(state: GameState, amount: number): GameState | null {
	if (state.money < amount) {
		return null;
	}

	return {
		...state,
		money: state.money - amount,
	};
}

/**
 * Checks if the current blind has been beaten.
 */
export function hasBeatenBlind(state: GameState): boolean {
	return state.score >= state.currentBlind.chipTarget;
}

/**
 * Checks if the game is over (no hands left and blind not beaten).
 */
export function isGameOver(state: GameState): boolean {
	return state.handsRemaining === 0 && !hasBeatenBlind(state);
}

/**
 * Gets the number of cards still needed to fill the hand.
 */
export function cardsNeededToFillHand(state: GameState): number {
	return MAX_HAND_SIZE - state.hand.length;
}
