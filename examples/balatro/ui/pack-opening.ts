/**
 * Booster Pack Opening UI
 *
 * Implements the pack opening flow with card selection.
 *
 * @module balatro/ui/pack-opening
 */

import type { Card } from '../data/card';
import { createDeck, shuffleDeck } from '../data/card';
import type { Joker } from '../data/joker';
import { getRandomJoker } from '../data/joker';
import type { TarotCard } from '../data/consumable';
import { getRandomTarot } from '../data/consumable';
import type { PlanetCard } from '../data/planet';
import { getRandomPlanet } from '../data/planet';
import type { BoosterPack, PackType } from './shop';

// =============================================================================
// TYPES
// =============================================================================

export type PackItemType = 'card' | 'joker' | 'tarot' | 'planet';

export interface PackItem {
	readonly type: PackItemType;
	readonly card?: Card;
	readonly joker?: Joker;
	readonly tarot?: TarotCard;
	readonly planet?: PlanetCard;
	readonly selected: boolean;
}

export type PackOpeningPhase = 'opening' | 'selecting' | 'closing';

export interface PackOpeningState {
	readonly pack: BoosterPack;
	readonly items: readonly PackItem[];
	readonly selectedCount: number;
	readonly maxSelections: number;
	readonly cursorIndex: number;
	readonly phase: PackOpeningPhase;
}

export type PackOpeningInput =
	| { type: 'navigate'; direction: 'left' | 'right' }
	| { type: 'select' }
	| { type: 'skip' };

export type PackOpeningAction =
	| { type: 'none' }
	| { type: 'take_card'; item: PackItem }
	| { type: 'take_joker'; item: PackItem }
	| { type: 'take_tarot'; item: PackItem }
	| { type: 'take_planet'; item: PackItem }
	| { type: 'done'; selectedItems: readonly PackItem[] }
	| { type: 'skip_all' };

export interface PackOpeningRenderData {
	readonly packName: string;
	readonly packType: PackType;
	readonly items: readonly PackItem[];
	readonly cursorIndex: number;
	readonly selectedCount: number;
	readonly maxSelections: number;
	readonly picksRemaining: number;
	readonly phase: PackOpeningPhase;
}

// =============================================================================
// PACK CONTENT GENERATION
// =============================================================================

/**
 * Generates contents for a standard pack (playing cards).
 *
 * @param count - Number of cards
 * @returns Array of pack items
 */
export function generateStandardPackItems(count: number): readonly PackItem[] {
	const deck = shuffleDeck(createDeck());
	return deck.slice(0, count).map(card => ({
		type: 'card' as const,
		card,
		selected: false,
	}));
}

/**
 * Generates contents for an arcana pack (tarot cards).
 *
 * @param count - Number of tarot cards
 * @returns Array of pack items
 */
export function generateArcanaPackItems(count: number): readonly PackItem[] {
	const items: PackItem[] = [];
	const usedIds: string[] = [];

	for (let i = 0; i < count; i++) {
		const tarot = getRandomTarot(usedIds);
		if (tarot) {
			usedIds.push(tarot.id);
			items.push({ type: 'tarot', tarot, selected: false });
		}
	}

	return items;
}

/**
 * Generates contents for a celestial pack (planet cards).
 *
 * @param count - Number of planet cards
 * @returns Array of pack items
 */
export function generateCelestialPackItems(count: number): readonly PackItem[] {
	const items: PackItem[] = [];
	const usedIds: string[] = [];

	for (let i = 0; i < count; i++) {
		const planet = getRandomPlanet(usedIds);
		if (planet) {
			usedIds.push(planet.id);
			items.push({ type: 'planet', planet, selected: false });
		}
	}

	return items;
}

/**
 * Generates contents for a buffoon pack (jokers).
 *
 * @param count - Number of jokers
 * @param excludeIds - Joker IDs to exclude
 * @returns Array of pack items
 */
export function generateBuffoonPackItems(
	count: number,
	excludeIds: readonly string[] = [],
): readonly PackItem[] {
	const items: PackItem[] = [];
	const usedIds = [...excludeIds];

	for (let i = 0; i < count; i++) {
		const joker = getRandomJoker(usedIds);
		if (joker) {
			usedIds.push(joker.id);
			items.push({ type: 'joker', joker, selected: false });
		}
	}

	return items;
}

/**
 * Generates contents for a spectral pack (mix of special items).
 *
 * @param count - Number of items
 * @returns Array of pack items
 */
export function generateSpectralPackItems(count: number): readonly PackItem[] {
	// Spectral packs contain tarot cards as a simplified implementation
	return generateArcanaPackItems(count);
}

/**
 * Generates pack items based on pack type.
 *
 * @param pack - Booster pack
 * @param ownedJokerIds - IDs of owned jokers
 * @returns Array of pack items
 */
export function generatePackItems(
	pack: BoosterPack,
	ownedJokerIds: readonly string[] = [],
): readonly PackItem[] {
	switch (pack.type) {
		case 'standard':
			return generateStandardPackItems(pack.cardCount);
		case 'arcana':
			return generateArcanaPackItems(pack.cardCount);
		case 'celestial':
			return generateCelestialPackItems(pack.cardCount);
		case 'buffoon':
			return generateBuffoonPackItems(pack.cardCount, ownedJokerIds);
		case 'spectral':
			return generateSpectralPackItems(pack.cardCount);
		default:
			return [];
	}
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Opens a booster pack and starts the selection phase.
 *
 * @param pack - Pack to open
 * @param ownedJokerIds - IDs of owned jokers
 * @returns Pack opening state
 */
export function openPack(
	pack: BoosterPack,
	ownedJokerIds: readonly string[] = [],
): PackOpeningState {
	const items = generatePackItems(pack, ownedJokerIds);

	return {
		pack,
		items,
		selectedCount: 0,
		maxSelections: pack.chooseCount,
		cursorIndex: 0,
		phase: 'selecting',
	};
}

/**
 * Navigates left in the pack.
 */
export function navigateLeft(state: PackOpeningState): PackOpeningState {
	if (state.items.length === 0) return state;
	const newIndex = state.cursorIndex > 0 ? state.cursorIndex - 1 : state.items.length - 1;
	return { ...state, cursorIndex: newIndex };
}

/**
 * Navigates right in the pack.
 */
export function navigateRight(state: PackOpeningState): PackOpeningState {
	if (state.items.length === 0) return state;
	const newIndex = state.cursorIndex < state.items.length - 1 ? state.cursorIndex + 1 : 0;
	return { ...state, cursorIndex: newIndex };
}

/**
 * Selects the item at the cursor.
 *
 * @param state - Current state
 * @returns Tuple of new state and action
 */
export function selectItem(state: PackOpeningState): [PackOpeningState, PackOpeningAction] {
	if (state.phase !== 'selecting') {
		return [state, { type: 'none' }];
	}

	const item = state.items[state.cursorIndex];
	if (!item || item.selected) {
		return [state, { type: 'none' }];
	}

	if (state.selectedCount >= state.maxSelections) {
		return [state, { type: 'none' }];
	}

	// Mark as selected
	const newItems = state.items.map((it, i) =>
		i === state.cursorIndex ? { ...it, selected: true } : it,
	);
	const newSelectedCount = state.selectedCount + 1;

	// Determine action based on item type
	let action: PackOpeningAction;
	switch (item.type) {
		case 'card':
			action = { type: 'take_card', item };
			break;
		case 'joker':
			action = { type: 'take_joker', item };
			break;
		case 'tarot':
			action = { type: 'take_tarot', item };
			break;
		case 'planet':
			action = { type: 'take_planet', item };
			break;
		default:
			action = { type: 'none' };
	}

	// Check if done selecting
	if (newSelectedCount >= state.maxSelections) {
		const selectedItems = newItems.filter(it => it.selected);
		return [
			{ ...state, items: newItems, selectedCount: newSelectedCount, phase: 'closing' },
			{ type: 'done', selectedItems },
		];
	}

	return [
		{ ...state, items: newItems, selectedCount: newSelectedCount },
		action,
	];
}

/**
 * Skips remaining selections and closes the pack.
 *
 * @param state - Current state
 * @returns Tuple of new state and action
 */
export function skipRemaining(state: PackOpeningState): [PackOpeningState, PackOpeningAction] {
	if (state.phase !== 'selecting') {
		return [state, { type: 'none' }];
	}

	return [
		{ ...state, phase: 'closing' },
		{ type: 'skip_all' },
	];
}

// =============================================================================
// INPUT PROCESSING
// =============================================================================

/**
 * Processes pack opening input.
 *
 * @param state - Current state
 * @param input - Input event
 * @returns Tuple of new state and action
 */
export function processPackInput(
	state: PackOpeningState,
	input: PackOpeningInput,
): [PackOpeningState, PackOpeningAction] {
	switch (input.type) {
		case 'navigate':
			if (input.direction === 'left') {
				return [navigateLeft(state), { type: 'none' }];
			}
			return [navigateRight(state), { type: 'none' }];

		case 'select':
			return selectItem(state);

		case 'skip':
			return skipRemaining(state);

		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Converts a key to pack opening input.
 *
 * @param key - Key name
 * @returns Input or null
 */
export function keyToPackInput(key: string): PackOpeningInput | null {
	switch (key) {
		case 'left':
		case 'h':
			return { type: 'navigate', direction: 'left' };
		case 'right':
		case 'l':
			return { type: 'navigate', direction: 'right' };
		case 'return':
		case 'space':
			return { type: 'select' };
		case 's':
		case 'S':
			return { type: 'skip' };
		default:
			return null;
	}
}

// =============================================================================
// RENDER DATA
// =============================================================================

/**
 * Gets render data for the pack opening screen.
 *
 * @param state - Pack opening state
 * @returns Render data
 */
export function getPackOpeningRenderData(state: PackOpeningState): PackOpeningRenderData {
	return {
		packName: state.pack.name,
		packType: state.pack.type,
		items: state.items,
		cursorIndex: state.cursorIndex,
		selectedCount: state.selectedCount,
		maxSelections: state.maxSelections,
		picksRemaining: state.maxSelections - state.selectedCount,
		phase: state.phase,
	};
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if the pack opening is done.
 *
 * @param state - Pack opening state
 * @returns True if done
 */
export function isPackDone(state: PackOpeningState): boolean {
	return state.phase === 'closing';
}

/**
 * Gets the number of remaining picks.
 *
 * @param state - Pack opening state
 * @returns Picks remaining
 */
export function getPicksRemaining(state: PackOpeningState): number {
	return state.maxSelections - state.selectedCount;
}

/**
 * Gets the selected items from the pack.
 *
 * @param state - Pack opening state
 * @returns Selected items
 */
export function getSelectedItems(state: PackOpeningState): readonly PackItem[] {
	return state.items.filter(it => it.selected);
}

/**
 * Gets the item name for display.
 *
 * @param item - Pack item
 * @returns Display name
 */
export function getItemName(item: PackItem): string {
	switch (item.type) {
		case 'card':
			return item.card ? `${item.card.rank} of ${item.card.suit}` : 'Unknown Card';
		case 'joker':
			return item.joker?.name ?? 'Unknown Joker';
		case 'tarot':
			return item.tarot?.name ?? 'Unknown Tarot';
		case 'planet':
			return item.planet?.name ?? 'Unknown Planet';
		default:
			return 'Unknown';
	}
}
