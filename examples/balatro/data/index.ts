/**
 * Data layer exports
 * @module balatro/data
 */

export type { Card, Suit, Rank } from './card';
export {
	SUITS,
	RANKS,
	SUIT_SYMBOLS,
	RANK_VALUES,
	createCard,
	createDeck,
	shuffleDeck,
	getSuitSymbol,
	isRedSuit,
	getRankValue,
	compareByRank,
} from './card';

export type { HandType, HandResult, HandScore, ScoreResult } from './hand';
export {
	evaluateHand,
	calculateScore,
	getHandName,
	getHandBaseScore,
	getCardChips,
	compareHands,
} from './hand';

export type { GameState, Joker, JokerEffect } from './game-state';
export type { BlindInfo as GameBlindInfo } from './game-state';

export type { BlindType, BlindConfig, BossModifierType, BossModifier, BlindInfo } from './blind';
export {
	createBlind,
	getChipRequirement,
	getBossModifier,
	getAllBossModifiers,
	isCardDebuffed,
	getModifiedHandSize,
	getModifiedDiscards,
	isValidPlay,
	getScoringCards,
	getNextBlindType,
	isBossBlind,
	getAnteBlinds,
} from './blind';
export {
	createGameState,
	resetRound,
	drawCards,
	playCards,
	discardCards,
	nextBlind,
	nextAnte,
	clearPlayed,
	addJoker,
	removeJoker,
	addMoney,
	spendMoney,
	hasBeatenBlind,
	isGameOver,
	cardsNeededToFillHand,
	MAX_HAND_SIZE,
	MIN_PLAY_SIZE,
	MAX_PLAY_SIZE,
	STARTING_HANDS,
	STARTING_DISCARDS,
	STARTING_MONEY,
} from './game-state';
