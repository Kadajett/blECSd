/**
 * Blind and Ante Progression System
 *
 * Defines blind types, boss modifiers, and chip requirements.
 * Works with game-state.ts for full round progression.
 *
 * @module balatro/data/blind
 */

import type { Card } from './card';

// =============================================================================
// TYPES
// =============================================================================

export type BlindType = 'small' | 'big' | 'boss';

export interface BlindConfig {
	readonly type: BlindType;
	readonly name: string;
	readonly chipMultiplier: number;
	readonly reward: number;
}

export type BossModifierType =
	| 'NO_DISCARDS'
	| 'MINUS_HAND_SIZE'
	| 'FACE_CARDS_DEBUFFED'
	| 'ONE_SUIT_DEBUFFED'
	| 'CLUBS_SPADES_NO_SCORE'
	| 'PLAY_EXACTLY_4';

export interface BossModifier {
	readonly type: BossModifierType;
	readonly name: string;
	readonly description: string;
	readonly debuffedSuit?: 'hearts' | 'diamonds' | 'clubs' | 'spades';
}

export interface BlindInfo {
	readonly type: BlindType;
	readonly name: string;
	readonly chipTarget: number;
	readonly reward: number;
	readonly bossModifier: BossModifier | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Base blind configurations */
const BLIND_CONFIGS: Readonly<Record<BlindType, BlindConfig>> = {
	small: { type: 'small', name: 'Small Blind', chipMultiplier: 1.0, reward: 3 },
	big: { type: 'big', name: 'Big Blind', chipMultiplier: 1.5, reward: 4 },
	boss: { type: 'boss', name: 'Boss Blind', chipMultiplier: 2.0, reward: 5 },
};

/** Base chip requirements for Ante 1 Small Blind */
const BASE_CHIPS = 100;

/** Chip scaling factor per ante */
const ANTE_SCALING = [1, 3, 8, 20, 50, 110, 200, 350];

/** Boss modifier pool */
const BOSS_MODIFIERS: readonly BossModifier[] = [
	{
		type: 'NO_DISCARDS',
		name: 'The Hook',
		description: 'No discards allowed this round',
	},
	{
		type: 'MINUS_HAND_SIZE',
		name: 'The Window',
		description: '-1 hand size this round',
	},
	{
		type: 'FACE_CARDS_DEBUFFED',
		name: 'The Face',
		description: 'Face cards are debuffed',
	},
	{
		type: 'ONE_SUIT_DEBUFFED',
		name: 'The Goad',
		description: 'Spades are debuffed',
		debuffedSuit: 'spades',
	},
	{
		type: 'CLUBS_SPADES_NO_SCORE',
		name: 'The Psychic',
		description: 'Clubs and Spades don\'t score',
	},
	{
		type: 'PLAY_EXACTLY_4',
		name: 'The Eye',
		description: 'Must play exactly 4 cards',
	},
];

// =============================================================================
// BLIND CREATION
// =============================================================================

/**
 * Creates a blind for a specific ante and type.
 *
 * @param ante - Current ante (1-8)
 * @param type - Blind type
 * @returns BlindInfo with chip target and optional modifier
 */
export function createBlind(ante: number, type: BlindType): BlindInfo {
	const config = BLIND_CONFIGS[type];
	const chipTarget = getChipRequirement(ante, type);
	const bossModifier = type === 'boss' ? getBossModifier(ante) : null;

	return {
		type,
		name: bossModifier ? bossModifier.name : config.name,
		chipTarget,
		reward: config.reward,
		bossModifier,
	};
}

/**
 * Gets the chip requirement for a specific ante and blind type.
 *
 * @param ante - Current ante (1-8)
 * @param type - Blind type
 * @returns Chip requirement to beat this blind
 */
export function getChipRequirement(ante: number, type: BlindType): number {
	const config = BLIND_CONFIGS[type];
	const anteIndex = Math.max(0, Math.min(ante - 1, ANTE_SCALING.length - 1));
	const scaling = ANTE_SCALING[anteIndex] ?? 1;

	return Math.floor(BASE_CHIPS * scaling * config.chipMultiplier);
}

/**
 * Gets the boss modifier for a specific ante.
 * Uses deterministic selection based on ante number.
 *
 * @param ante - Current ante (1-8)
 * @returns BossModifier for this ante
 */
export function getBossModifier(ante: number): BossModifier {
	// Simple deterministic selection based on ante
	const index = (ante - 1) % BOSS_MODIFIERS.length;
	return BOSS_MODIFIERS[index] ?? BOSS_MODIFIERS[0]!;
}

/**
 * Gets all available boss modifiers.
 */
export function getAllBossModifiers(): readonly BossModifier[] {
	return BOSS_MODIFIERS;
}

// =============================================================================
// MODIFIER EFFECTS
// =============================================================================

/**
 * Checks if a card is debuffed by the current boss modifier.
 *
 * @param card - Card to check
 * @param modifier - Active boss modifier (or null)
 * @returns True if the card is debuffed
 */
export function isCardDebuffed(card: Card, modifier: BossModifier | null): boolean {
	if (!modifier) {
		return false;
	}

	switch (modifier.type) {
		case 'FACE_CARDS_DEBUFFED':
			return card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';

		case 'ONE_SUIT_DEBUFFED':
			return card.suit === modifier.debuffedSuit;

		case 'CLUBS_SPADES_NO_SCORE':
			return card.suit === 'clubs' || card.suit === 'spades';

		default:
			return false;
	}
}

/**
 * Gets the modified hand size for the current boss.
 *
 * @param baseHandSize - Normal hand size
 * @param modifier - Active boss modifier (or null)
 * @returns Adjusted hand size
 */
export function getModifiedHandSize(
	baseHandSize: number,
	modifier: BossModifier | null,
): number {
	if (!modifier) {
		return baseHandSize;
	}

	if (modifier.type === 'MINUS_HAND_SIZE') {
		return Math.max(1, baseHandSize - 1);
	}

	return baseHandSize;
}

/**
 * Gets the modified discard count for the current boss.
 *
 * @param baseDiscards - Normal discard count
 * @param modifier - Active boss modifier (or null)
 * @returns Adjusted discard count
 */
export function getModifiedDiscards(
	baseDiscards: number,
	modifier: BossModifier | null,
): number {
	if (!modifier) {
		return baseDiscards;
	}

	if (modifier.type === 'NO_DISCARDS') {
		return 0;
	}

	return baseDiscards;
}

/**
 * Validates if a play is legal under the current boss modifier.
 *
 * @param cardCount - Number of cards being played
 * @param modifier - Active boss modifier (or null)
 * @returns True if the play is valid
 */
export function isValidPlay(
	cardCount: number,
	modifier: BossModifier | null,
): boolean {
	if (!modifier) {
		return cardCount >= 1 && cardCount <= 5;
	}

	if (modifier.type === 'PLAY_EXACTLY_4') {
		return cardCount === 4;
	}

	return cardCount >= 1 && cardCount <= 5;
}

/**
 * Filters scoring cards based on boss modifier debuffs.
 * Debuffed cards contribute 0 chips.
 *
 * @param cards - Cards in the played hand
 * @param modifier - Active boss modifier (or null)
 * @returns Cards that can contribute to scoring
 */
export function getScoringCards(
	cards: readonly Card[],
	modifier: BossModifier | null,
): readonly Card[] {
	if (!modifier) {
		return cards;
	}

	return cards.filter(card => !isCardDebuffed(card, modifier));
}

// =============================================================================
// BLIND PROGRESSION HELPERS
// =============================================================================

/**
 * Gets the next blind type in sequence.
 *
 * @param current - Current blind type
 * @returns Next blind type, or 'small' if completing boss
 */
export function getNextBlindType(current: BlindType): BlindType {
	switch (current) {
		case 'small':
			return 'big';
		case 'big':
			return 'boss';
		case 'boss':
			return 'small';
	}
}

/**
 * Checks if the current blind is a boss blind.
 */
export function isBossBlind(type: BlindType): boolean {
	return type === 'boss';
}

/**
 * Gets all blinds for a specific ante.
 *
 * @param ante - Ante number (1-8)
 * @returns Array of 3 BlindInfo objects
 */
export function getAnteBlinds(ante: number): readonly BlindInfo[] {
	return [
		createBlind(ante, 'small'),
		createBlind(ante, 'big'),
		createBlind(ante, 'boss'),
	];
}
