/**
 * Consumable Cards (Tarot and Planet)
 *
 * Implements consumable cards that modify cards and deck.
 *
 * @module balatro/data/consumable
 */

import type { Card } from './card';
import { RANKS } from './card';
import type { EnhancementType, EnhancedCard } from './enhancement';
import { applyEnhancement } from './enhancement';
import type { PlanetCard } from './planet';

// =============================================================================
// TYPES
// =============================================================================

export type TarotName =
	| 'The Fool'
	| 'The Magician'
	| 'The Empress'
	| 'The Chariot'
	| 'Strength'
	| 'The Hanged Man'
	| 'Death'
	| 'The Tower'
	| 'The High Priestess'
	| 'The Emperor';

export type TarotTargetType =
	| 'none' // No target needed
	| 'cards' // Select specific cards
	| 'suit'; // Select a suit

export type TarotEffectType =
	| 'enhance' // Apply enhancement to cards
	| 'destroy' // Remove cards from deck
	| 'convert_suit' // Change suit of cards
	| 'increase_rank' // Increase rank of cards
	| 'copy_last' // Copy the last tarot used
	| 'create_planet'; // Create a planet card

export interface TarotCard {
	readonly id: string;
	readonly name: TarotName;
	readonly description: string;
	readonly targetType: TarotTargetType;
	readonly targetCount: number;
	readonly effectType: TarotEffectType;
	readonly enhancementType?: EnhancementType;
}

export type ConsumableType = 'tarot' | 'planet';

export interface ConsumableSlot {
	readonly type: ConsumableType;
	readonly card: TarotCard | PlanetCard;
}

export interface ConsumableState {
	readonly slots: readonly (ConsumableSlot | null)[];
	readonly maxSlots: number;
	readonly lastTarotUsed: TarotCard | null;
}

export interface TarotUseResult {
	readonly success: boolean;
	readonly modifiedCards: readonly EnhancedCard[];
	readonly destroyedCards: readonly Card[];
	readonly description: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum consumable slots */
export const MAX_CONSUMABLE_SLOTS = 2;

// =============================================================================
// TAROT CARDS
// =============================================================================

export const TAROT_CARDS: readonly TarotCard[] = [
	{
		id: 'tarot_fool',
		name: 'The Fool',
		description: 'Creates a copy of the last Tarot used',
		targetType: 'none',
		targetCount: 0,
		effectType: 'copy_last',
	},
	{
		id: 'tarot_magician',
		name: 'The Magician',
		description: 'Enhance 2 cards to Lucky',
		targetType: 'cards',
		targetCount: 2,
		effectType: 'enhance',
		enhancementType: 'lucky',
	},
	{
		id: 'tarot_empress',
		name: 'The Empress',
		description: 'Enhance 2 cards to Mult',
		targetType: 'cards',
		targetCount: 2,
		effectType: 'enhance',
		enhancementType: 'mult',
	},
	{
		id: 'tarot_chariot',
		name: 'The Chariot',
		description: 'Enhance 1 card to Steel',
		targetType: 'cards',
		targetCount: 1,
		effectType: 'enhance',
		enhancementType: 'steel',
	},
	{
		id: 'tarot_strength',
		name: 'Strength',
		description: 'Increase rank of up to 2 cards by 1',
		targetType: 'cards',
		targetCount: 2,
		effectType: 'increase_rank',
	},
	{
		id: 'tarot_hangedman',
		name: 'The Hanged Man',
		description: 'Destroy up to 2 selected cards',
		targetType: 'cards',
		targetCount: 2,
		effectType: 'destroy',
	},
	{
		id: 'tarot_death',
		name: 'Death',
		description: 'Convert left card to suit of right card',
		targetType: 'cards',
		targetCount: 2,
		effectType: 'convert_suit',
	},
	{
		id: 'tarot_tower',
		name: 'The Tower',
		description: 'Enhance 1 card to Glass',
		targetType: 'cards',
		targetCount: 1,
		effectType: 'enhance',
		enhancementType: 'glass',
	},
	{
		id: 'tarot_highpriestess',
		name: 'The High Priestess',
		description: 'Creates up to 2 random Planet cards',
		targetType: 'none',
		targetCount: 0,
		effectType: 'create_planet',
	},
	{
		id: 'tarot_emperor',
		name: 'The Emperor',
		description: 'Creates up to 2 random Tarot cards',
		targetType: 'none',
		targetCount: 0,
		effectType: 'copy_last',
	},
];

// =============================================================================
// TAROT LOOKUP
// =============================================================================

/**
 * Gets a tarot card by ID.
 *
 * @param id - Tarot card ID
 * @returns Tarot card or undefined
 */
export function getTarotById(id: string): TarotCard | undefined {
	return TAROT_CARDS.find(t => t.id === id);
}

/**
 * Gets a random tarot card.
 *
 * @param excludeIds - IDs to exclude
 * @returns Random tarot card or null
 */
export function getRandomTarot(excludeIds: readonly string[] = []): TarotCard | null {
	const available = TAROT_CARDS.filter(t => !excludeIds.includes(t.id));
	if (available.length === 0) return null;
	const index = Math.floor(Math.random() * available.length);
	return available[index] ?? null;
}

/**
 * Gets the number of target cards needed for a tarot.
 *
 * @param tarot - Tarot card
 * @returns Number of targets needed
 */
export function getTarotTargetCount(tarot: TarotCard): number {
	return tarot.targetCount;
}

// =============================================================================
// CONSUMABLE STATE
// =============================================================================

/**
 * Creates initial consumable state.
 *
 * @param maxSlots - Maximum slots
 * @returns Initial state
 */
export function createConsumableState(maxSlots: number = MAX_CONSUMABLE_SLOTS): ConsumableState {
	return {
		slots: Array.from({ length: maxSlots }, () => null),
		maxSlots,
		lastTarotUsed: null,
	};
}

/**
 * Checks if there's an empty consumable slot.
 *
 * @param state - Consumable state
 * @returns True if empty slot available
 */
export function hasEmptySlot(state: ConsumableState): boolean {
	return state.slots.some(slot => slot === null);
}

/**
 * Gets the first empty slot index.
 *
 * @param state - Consumable state
 * @returns Slot index or -1
 */
export function getEmptySlotIndex(state: ConsumableState): number {
	return state.slots.findIndex(slot => slot === null);
}

/**
 * Adds a consumable to the first empty slot.
 *
 * @param state - Current state
 * @param consumable - Consumable to add
 * @returns Updated state
 */
export function addConsumable(
	state: ConsumableState,
	consumable: ConsumableSlot,
): ConsumableState {
	const index = getEmptySlotIndex(state);
	if (index === -1) return state;

	const newSlots = [...state.slots];
	newSlots[index] = consumable;
	return { ...state, slots: newSlots };
}

/**
 * Removes a consumable from a slot.
 *
 * @param state - Current state
 * @param index - Slot index
 * @returns Updated state
 */
export function removeConsumable(state: ConsumableState, index: number): ConsumableState {
	if (index < 0 || index >= state.slots.length) return state;
	if (state.slots[index] === null) return state;

	const newSlots = [...state.slots];
	newSlots[index] = null;
	return { ...state, slots: newSlots };
}

/**
 * Gets a consumable from a slot.
 *
 * @param state - Consumable state
 * @param index - Slot index
 * @returns Consumable slot or null
 */
export function getConsumable(state: ConsumableState, index: number): ConsumableSlot | null {
	return state.slots[index] ?? null;
}

/**
 * Gets the number of filled slots.
 *
 * @param state - Consumable state
 * @returns Count of filled slots
 */
export function getFilledSlotCount(state: ConsumableState): number {
	return state.slots.filter(s => s !== null).length;
}

// =============================================================================
// TAROT USAGE
// =============================================================================

/**
 * Checks if a tarot card can be used with the given targets.
 *
 * @param tarot - Tarot card
 * @param targets - Target cards
 * @returns True if valid
 */
export function canUseTarot(tarot: TarotCard, targets: readonly Card[]): boolean {
	if (tarot.targetType === 'none') return true;

	if (tarot.targetType === 'cards') {
		if (targets.length === 0) return false;
		if (targets.length > tarot.targetCount) return false;
		return true;
	}

	return true;
}

/**
 * Increases a card's rank by 1.
 * A -> wraps to 2, K -> A, etc.
 *
 * @param card - Card to modify
 * @returns Card with increased rank
 */
export function increaseRank(card: Card): Card {
	const rankIndex = RANKS.indexOf(card.rank);
	if (rankIndex === -1) return card;

	const newIndex = (rankIndex + 1) % RANKS.length;
	const newRank = RANKS[newIndex];
	if (!newRank) return card;

	return {
		...card,
		rank: newRank,
		id: `${newRank}-${card.suit}`,
	};
}

/**
 * Uses a tarot card with target cards.
 *
 * @param tarot - Tarot card to use
 * @param targets - Target cards
 * @returns Use result
 */
export function useTarotCard(tarot: TarotCard, targets: readonly Card[]): TarotUseResult {
	if (!canUseTarot(tarot, targets)) {
		return {
			success: false,
			modifiedCards: [],
			destroyedCards: [],
			description: 'Invalid targets',
		};
	}

	switch (tarot.effectType) {
		case 'enhance': {
			if (!tarot.enhancementType) {
				return {
					success: false,
					modifiedCards: [],
					destroyedCards: [],
					description: 'No enhancement type specified',
				};
			}
			const enhanced = targets.map(card => applyEnhancement(card, tarot.enhancementType!));
			return {
				success: true,
				modifiedCards: enhanced,
				destroyedCards: [],
				description: `Enhanced ${targets.length} card(s) to ${tarot.enhancementType}`,
			};
		}

		case 'destroy':
			return {
				success: true,
				modifiedCards: [],
				destroyedCards: targets,
				description: `Destroyed ${targets.length} card(s)`,
			};

		case 'convert_suit': {
			if (targets.length < 2) {
				return {
					success: false,
					modifiedCards: [],
					destroyedCards: [],
					description: 'Need 2 cards for suit conversion',
				};
			}
			const sourceCard = targets[0]!;
			const targetCard = targets[1]!;
			const converted: EnhancedCard = {
				...sourceCard,
				suit: targetCard.suit,
				id: `${sourceCard.rank}-${targetCard.suit}`,
			};
			return {
				success: true,
				modifiedCards: [converted],
				destroyedCards: [],
				description: `Converted ${sourceCard.rank} to ${targetCard.suit}`,
			};
		}

		case 'increase_rank': {
			const increased = targets.map(card => increaseRank(card) as EnhancedCard);
			return {
				success: true,
				modifiedCards: increased,
				destroyedCards: [],
				description: `Increased rank of ${targets.length} card(s)`,
			};
		}

		case 'copy_last':
		case 'create_planet':
			return {
				success: true,
				modifiedCards: [],
				destroyedCards: [],
				description: tarot.description,
			};

		default:
			return {
				success: false,
				modifiedCards: [],
				destroyedCards: [],
				description: 'Unknown effect',
			};
	}
}

/**
 * Uses a consumable from a slot and removes it.
 *
 * @param state - Consumable state
 * @param slotIndex - Slot to use
 * @param targets - Target cards (for tarots)
 * @returns Updated state and result
 */
export function useConsumableSlot(
	state: ConsumableState,
	slotIndex: number,
	targets: readonly Card[] = [],
): { state: ConsumableState; result: TarotUseResult | null } {
	const slot = getConsumable(state, slotIndex);
	if (!slot) {
		return { state, result: null };
	}

	if (slot.type === 'tarot') {
		const tarot = slot.card as TarotCard;
		const result = useTarotCard(tarot, targets);

		if (!result.success) {
			return { state, result };
		}

		const newState = removeConsumable(state, slotIndex);
		return {
			state: { ...newState, lastTarotUsed: tarot },
			result,
		};
	}

	// Planet cards are used through the planet system
	return {
		state: removeConsumable(state, slotIndex),
		result: {
			success: true,
			modifiedCards: [],
			destroyedCards: [],
			description: `Used ${slot.card.name}`,
		},
	};
}

// =============================================================================
// DISPLAY
// =============================================================================

/**
 * Gets the color for a tarot card.
 *
 * @param tarot - Tarot card
 * @returns Color code
 */
export function getTarotColor(tarot: TarotCard): number {
	switch (tarot.effectType) {
		case 'enhance':
			return 0xaa55ff; // Purple
		case 'destroy':
			return 0xff5555; // Red
		case 'convert_suit':
			return 0x55aaff; // Blue
		case 'increase_rank':
			return 0x55ff55; // Green
		case 'copy_last':
			return 0xffdd55; // Gold
		case 'create_planet':
			return 0x55ffff; // Cyan
		default:
			return 0xffffff;
	}
}

/**
 * Formats a consumable slot for display.
 *
 * @param slot - Consumable slot
 * @returns Formatted string
 */
export function formatConsumableSlot(slot: ConsumableSlot | null): string {
	if (!slot) return '[Empty]';
	return `[${slot.card.name}]`;
}
