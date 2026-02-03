/**
 * Joker System
 *
 * Implements Jokers that modify scoring with various effects.
 *
 * @module balatro/data/joker
 */

import type { Card, Suit } from './card';
import type { HandResult } from './hand';

// =============================================================================
// TYPES
// =============================================================================

export type JokerRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type JokerTrigger =
	| 'always' // Always active
	| 'on_score' // When scoring a hand
	| 'on_card' // Per card in scoring hand
	| 'on_discard' // When discarding
	| 'on_hand_type' // When specific hand type is played
	| 'end_of_round'; // At round end

export type JokerEffectType =
	| 'add_mult' // +X mult
	| 'add_chips' // +X chips
	| 'mult_mult' // ×X mult (multiplicative)
	| 'add_money' // +$X
	| 'retrigger' // Retrigger cards
	| 'conditional'; // Complex condition

export interface JokerCondition {
	readonly type:
		| 'hand_contains_type' // Hand contains specific hand type
		| 'hand_contains_suit' // Hand contains cards of suit
		| 'hand_contains_rank' // Hand contains specific rank
		| 'hand_size' // Hand has specific size
		| 'cards_in_hand' // Cards remaining in hand
		| 'discards_used' // Based on discards used
		| 'rounds_played'; // Based on rounds played
	readonly value: string | number;
}

export interface JokerEffect {
	readonly type: JokerEffectType;
	readonly trigger: JokerTrigger;
	readonly value: number;
	readonly condition?: JokerCondition;
	readonly perCard?: boolean; // Apply per card in scoring hand
}

export interface Joker {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly rarity: JokerRarity;
	readonly effect: JokerEffect;
	readonly sellValue: number;
}

export interface JokerState {
	readonly id: string;
	readonly jokerId: string;
	readonly scaling?: number; // For scaling jokers
}

export interface ScoreModification {
	readonly addedChips: number;
	readonly addedMult: number;
	readonly multMultiplier: number;
	readonly addedMoney: number;
}

export interface AppliedJokerEffect {
	readonly jokerName: string;
	readonly description: string;
	readonly modification: ScoreModification;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum joker slots */
export const MAX_JOKER_SLOTS = 5;

// =============================================================================
// STARTER JOKERS (10-15 basic jokers)
// =============================================================================

export const STARTER_JOKERS: readonly Joker[] = [
	// Flat bonuses
	{
		id: 'joker_greedy',
		name: 'Greedy Joker',
		description: '+4 Mult',
		rarity: 'common',
		effect: { type: 'add_mult', trigger: 'on_score', value: 4 },
		sellValue: 4,
	},
	{
		id: 'joker_lusty',
		name: 'Lusty Joker',
		description: '+30 Chips',
		rarity: 'common',
		effect: { type: 'add_chips', trigger: 'on_score', value: 30 },
		sellValue: 4,
	},
	{
		id: 'joker_wrathful',
		name: 'Wrathful Joker',
		description: '+5 Mult per card in scoring hand',
		rarity: 'uncommon',
		effect: { type: 'add_mult', trigger: 'on_card', value: 5, perCard: true },
		sellValue: 6,
	},
	{
		id: 'joker_gluttonous',
		name: 'Gluttonous Joker',
		description: '+10 Chips per card in scoring hand',
		rarity: 'uncommon',
		effect: { type: 'add_chips', trigger: 'on_card', value: 10, perCard: true },
		sellValue: 6,
	},

	// Conditional
	{
		id: 'joker_clever',
		name: 'Clever Joker',
		description: '+3 Mult if hand contains a Pair',
		rarity: 'common',
		effect: {
			type: 'add_mult',
			trigger: 'on_score',
			value: 3,
			condition: { type: 'hand_contains_type', value: 'PAIR' },
		},
		sellValue: 4,
	},
	{
		id: 'joker_devious',
		name: 'Devious Joker',
		description: '+5 Mult if hand contains Three of a Kind',
		rarity: 'common',
		effect: {
			type: 'add_mult',
			trigger: 'on_score',
			value: 5,
			condition: { type: 'hand_contains_type', value: 'THREE_OF_A_KIND' },
		},
		sellValue: 4,
	},
	{
		id: 'joker_heart_lover',
		name: 'Heart Lover',
		description: '+20 Chips per Heart in scoring hand',
		rarity: 'uncommon',
		effect: {
			type: 'add_chips',
			trigger: 'on_card',
			value: 20,
			perCard: true,
			condition: { type: 'hand_contains_suit', value: 'hearts' },
		},
		sellValue: 5,
	},
	{
		id: 'joker_ace_hunter',
		name: 'Ace Hunter',
		description: '×1.5 Mult if hand contains an Ace',
		rarity: 'rare',
		effect: {
			type: 'mult_mult',
			trigger: 'on_score',
			value: 1.5,
			condition: { type: 'hand_contains_rank', value: 'A' },
		},
		sellValue: 8,
	},
	{
		id: 'joker_flush_master',
		name: 'Flush Master',
		description: '+8 Mult if hand is a Flush',
		rarity: 'uncommon',
		effect: {
			type: 'add_mult',
			trigger: 'on_score',
			value: 8,
			condition: { type: 'hand_contains_type', value: 'FLUSH' },
		},
		sellValue: 6,
	},
	{
		id: 'joker_straight_shooter',
		name: 'Straight Shooter',
		description: '+40 Chips if hand is a Straight',
		rarity: 'uncommon',
		effect: {
			type: 'add_chips',
			trigger: 'on_score',
			value: 40,
			condition: { type: 'hand_contains_type', value: 'STRAIGHT' },
		},
		sellValue: 6,
	},

	// Multiplicative
	{
		id: 'joker_half_joker',
		name: 'Half Joker',
		description: '×1.5 Mult if hand is 3 or fewer cards',
		rarity: 'common',
		effect: {
			type: 'mult_mult',
			trigger: 'on_score',
			value: 1.5,
			condition: { type: 'hand_size', value: 3 },
		},
		sellValue: 5,
	},
	{
		id: 'joker_joker',
		name: 'Joker',
		description: '+4 Mult',
		rarity: 'common',
		effect: { type: 'add_mult', trigger: 'on_score', value: 4 },
		sellValue: 2,
	},

	// Scaling
	{
		id: 'joker_supernova',
		name: 'Supernova',
		description: '+1 Mult per hand played this round',
		rarity: 'rare',
		effect: {
			type: 'add_mult',
			trigger: 'on_score',
			value: 1,
			condition: { type: 'rounds_played', value: 0 }, // Value is scaling
		},
		sellValue: 7,
	},
	{
		id: 'joker_riff_raff',
		name: 'Riff-Raff',
		description: '+2 Chips per discard used this round',
		rarity: 'common',
		effect: {
			type: 'add_chips',
			trigger: 'on_score',
			value: 2,
			condition: { type: 'discards_used', value: 0 },
		},
		sellValue: 4,
	},

	// Legendary
	{
		id: 'joker_triboulet',
		name: 'Triboulet',
		description: '×2 Mult for all Kings and Queens in scoring hand',
		rarity: 'legendary',
		effect: {
			type: 'mult_mult',
			trigger: 'on_card',
			value: 2,
			perCard: true,
			condition: { type: 'hand_contains_rank', value: 'K,Q' },
		},
		sellValue: 12,
	},
];

// =============================================================================
// JOKER LOOKUP
// =============================================================================

/**
 * Gets a joker by ID.
 *
 * @param id - Joker ID
 * @returns Joker or undefined
 */
export function getJokerById(id: string): Joker | undefined {
	return STARTER_JOKERS.find(j => j.id === id);
}

/**
 * Gets jokers by rarity.
 *
 * @param rarity - Rarity to filter by
 * @returns Array of jokers
 */
export function getJokersByRarity(rarity: JokerRarity): readonly Joker[] {
	return STARTER_JOKERS.filter(j => j.rarity === rarity);
}

/**
 * Gets a random joker.
 *
 * @param excludeIds - IDs to exclude
 * @returns Random joker
 */
export function getRandomJoker(excludeIds: readonly string[] = []): Joker | null {
	const available = STARTER_JOKERS.filter(j => !excludeIds.includes(j.id));
	if (available.length === 0) return null;
	const index = Math.floor(Math.random() * available.length);
	return available[index] ?? null;
}

// =============================================================================
// CONDITION CHECKING
// =============================================================================

/**
 * Checks if a hand contains a specific hand type or better.
 */
function handContainsType(result: HandResult, targetType: string): boolean {
	return result.type === targetType;
}

/**
 * Checks if scoring cards contain a specific suit.
 */
function handContainsSuit(cards: readonly Card[], suit: Suit): boolean {
	return cards.some(c => c.suit === suit);
}

/**
 * Checks if scoring cards contain a specific rank.
 */
function handContainsRank(cards: readonly Card[], ranks: string): boolean {
	const targetRanks = ranks.split(',');
	return cards.some(c => targetRanks.includes(c.rank));
}

/**
 * Checks if a condition is met.
 *
 * @param condition - Condition to check
 * @param result - Hand result
 * @param cards - Scoring cards
 * @param context - Additional context
 * @returns True if condition is met
 */
export function checkCondition(
	condition: JokerCondition,
	result: HandResult,
	cards: readonly Card[],
	context: { discardsUsed?: number; handsPlayed?: number } = {},
): boolean {
	switch (condition.type) {
		case 'hand_contains_type':
			return handContainsType(result, String(condition.value));
		case 'hand_contains_suit':
			return handContainsSuit(cards, condition.value as Suit);
		case 'hand_contains_rank':
			return handContainsRank(cards, String(condition.value));
		case 'hand_size':
			return cards.length <= Number(condition.value);
		case 'cards_in_hand':
			return true; // Would need hand cards passed in
		case 'discards_used':
			return (context.discardsUsed ?? 0) > 0;
		case 'rounds_played':
			return (context.handsPlayed ?? 0) > 0;
		default:
			return true;
	}
}

// =============================================================================
// EFFECT APPLICATION
// =============================================================================

/**
 * Creates an empty score modification.
 */
function emptyModification(): ScoreModification {
	return {
		addedChips: 0,
		addedMult: 0,
		multMultiplier: 1,
		addedMoney: 0,
	};
}

/**
 * Applies a single joker effect.
 *
 * @param joker - Joker to apply
 * @param result - Hand result
 * @param scoringCards - Cards in the scoring hand
 * @param context - Additional context
 * @returns Applied effect
 */
export function applyJokerEffect(
	joker: Joker,
	result: HandResult,
	scoringCards: readonly Card[],
	context: { discardsUsed?: number; handsPlayed?: number } = {},
): AppliedJokerEffect {
	const mod = emptyModification();
	const { effect } = joker;

	// Check condition
	if (effect.condition && !checkCondition(effect.condition, result, scoringCards, context)) {
		return {
			jokerName: joker.name,
			description: 'No effect',
			modification: mod,
		};
	}

	// Calculate multiplier for per-card effects
	let multiplier = 1;
	if (effect.perCard) {
		if (effect.condition?.type === 'hand_contains_suit') {
			// Count cards of the specified suit
			const suit = effect.condition.value as Suit;
			multiplier = scoringCards.filter(c => c.suit === suit).length;
		} else if (effect.condition?.type === 'hand_contains_rank') {
			// Count cards of the specified ranks
			const ranks = String(effect.condition.value).split(',');
			multiplier = scoringCards.filter(c => ranks.includes(c.rank)).length;
		} else {
			// All scoring cards
			multiplier = scoringCards.length;
		}
	}

	// Apply scaling for rounds_played/discards_used
	let scalingValue = effect.value;
	if (effect.condition?.type === 'discards_used') {
		scalingValue = effect.value * (context.discardsUsed ?? 0);
	} else if (effect.condition?.type === 'rounds_played') {
		scalingValue = effect.value * (context.handsPlayed ?? 0);
	}

	// Apply effect
	const modification = { ...mod };
	const appliedValue = scalingValue * multiplier;

	switch (effect.type) {
		case 'add_mult':
			return {
				jokerName: joker.name,
				description: `+${appliedValue} Mult`,
				modification: { ...modification, addedMult: appliedValue },
			};
		case 'add_chips':
			return {
				jokerName: joker.name,
				description: `+${appliedValue} Chips`,
				modification: { ...modification, addedChips: appliedValue },
			};
		case 'mult_mult':
			return {
				jokerName: joker.name,
				description: `×${effect.value} Mult`,
				modification: { ...modification, multMultiplier: effect.value },
			};
		case 'add_money':
			return {
				jokerName: joker.name,
				description: `+$${appliedValue}`,
				modification: { ...modification, addedMoney: appliedValue },
			};
		default:
			return {
				jokerName: joker.name,
				description: 'No effect',
				modification,
			};
	}
}

/**
 * Applies all joker effects in order.
 *
 * @param jokers - Array of jokers
 * @param result - Hand result
 * @param scoringCards - Cards in the scoring hand
 * @param context - Additional context
 * @returns Combined modifications and individual effects
 */
export function applyJokerEffects(
	jokers: readonly Joker[],
	result: HandResult,
	scoringCards: readonly Card[],
	context: { discardsUsed?: number; handsPlayed?: number } = {},
): {
	readonly total: ScoreModification;
	readonly effects: readonly AppliedJokerEffect[];
} {
	const effects: AppliedJokerEffect[] = [];
	let totalChips = 0;
	let totalMult = 0;
	let totalMultMultiplier = 1;
	let totalMoney = 0;

	// Process jokers in order
	for (const joker of jokers) {
		const applied = applyJokerEffect(joker, result, scoringCards, context);
		effects.push(applied);

		// Accumulate additive effects
		totalChips += applied.modification.addedChips;
		totalMult += applied.modification.addedMult;
		totalMoney += applied.modification.addedMoney;

		// Multiply multiplicative effects
		totalMultMultiplier *= applied.modification.multMultiplier;
	}

	return {
		total: {
			addedChips: totalChips,
			addedMult: totalMult,
			multMultiplier: totalMultMultiplier,
			addedMoney: totalMoney,
		},
		effects,
	};
}

// =============================================================================
// JOKER MANAGEMENT
// =============================================================================

/**
 * Creates a joker instance from a joker definition.
 *
 * @param joker - Joker definition
 * @returns Joker with unique instance ID
 */
export function createJokerInstance(joker: Joker): Joker {
	return {
		...joker,
		id: `${joker.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
	};
}

/**
 * Gets the sell value for a joker.
 *
 * @param joker - Joker
 * @returns Sell value
 */
export function getJokerSellValue(joker: Joker): number {
	return joker.sellValue;
}

/**
 * Gets a formatted description for a joker.
 *
 * @param joker - Joker
 * @returns Description string
 */
export function getJokerDescription(joker: Joker): string {
	return joker.description;
}

/**
 * Checks if there's room for another joker.
 *
 * @param currentCount - Current number of jokers
 * @param maxSlots - Maximum slots (default MAX_JOKER_SLOTS)
 * @returns True if room available
 */
export function hasJokerSlot(currentCount: number, maxSlots: number = MAX_JOKER_SLOTS): boolean {
	return currentCount < maxSlots;
}

// =============================================================================
// SCORING INTEGRATION
// =============================================================================

/**
 * Calculates final score with joker modifications.
 *
 * @param baseChips - Base chips from hand
 * @param cardChips - Chips from cards
 * @param baseMult - Base multiplier from hand
 * @param jokerMod - Joker modifications
 * @returns Final score
 */
export function calculateFinalScore(
	baseChips: number,
	cardChips: number,
	baseMult: number,
	jokerMod: ScoreModification,
): number {
	const totalChips = baseChips + cardChips + jokerMod.addedChips;
	const totalMult = (baseMult + jokerMod.addedMult) * jokerMod.multMultiplier;
	return Math.floor(totalChips * totalMult);
}
