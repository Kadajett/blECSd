/**
 * Card Enhancement System
 *
 * Implements card enhancements, editions, and seals that modify individual cards.
 *
 * @module balatro/data/enhancement
 */

import type { Card } from './card';

// =============================================================================
// TYPES
// =============================================================================

export type EnhancementType =
	| 'bonus' // +30 Chips when scored
	| 'mult' // +4 Mult when scored
	| 'glass' // x2 Mult, 1/4 chance to break
	| 'steel' // +1 Mult while in hand (passive)
	| 'gold' // +$3 at end of round
	| 'lucky'; // 1/5 chance +20 Mult

export type EditionType = 'foil' | 'holographic' | 'polychrome';

export type SealType = 'gold' | 'red' | 'blue' | 'purple';

export interface EnhancedCard extends Card {
	readonly enhancement?: EnhancementType;
	readonly edition?: EditionType;
	readonly seal?: SealType;
}

export interface EnhancementBonus {
	readonly addedChips: number;
	readonly addedMult: number;
	readonly multMultiplier: number;
	readonly addedMoney: number;
	readonly destroyed: boolean;
	readonly description: string;
}

export interface EditionBonus {
	readonly addedChips: number;
	readonly addedMult: number;
	readonly multMultiplier: number;
	readonly description: string;
}

export interface SealEffect {
	readonly type: SealType;
	readonly description: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Enhancement configs */
const ENHANCEMENT_CONFIG: Record<EnhancementType, {
	readonly name: string;
	readonly description: string;
	readonly chips: number;
	readonly mult: number;
	readonly multMultiplier: number;
	readonly money: number;
	readonly breakChance: number;
	readonly triggerChance: number;
	readonly passive: boolean;
}> = {
	bonus: {
		name: 'Bonus',
		description: '+30 Chips when scored',
		chips: 30,
		mult: 0,
		multMultiplier: 1,
		money: 0,
		breakChance: 0,
		triggerChance: 1,
		passive: false,
	},
	mult: {
		name: 'Mult',
		description: '+4 Mult when scored',
		chips: 0,
		mult: 4,
		multMultiplier: 1,
		money: 0,
		breakChance: 0,
		triggerChance: 1,
		passive: false,
	},
	glass: {
		name: 'Glass',
		description: 'x2 Mult, 1/4 chance to break',
		chips: 0,
		mult: 0,
		multMultiplier: 2,
		money: 0,
		breakChance: 0.25,
		triggerChance: 1,
		passive: false,
	},
	steel: {
		name: 'Steel',
		description: '+1 Mult while in hand',
		chips: 0,
		mult: 1,
		multMultiplier: 1,
		money: 0,
		breakChance: 0,
		triggerChance: 1,
		passive: true,
	},
	gold: {
		name: 'Gold',
		description: '+$3 at end of round',
		chips: 0,
		mult: 0,
		multMultiplier: 1,
		money: 3,
		breakChance: 0,
		triggerChance: 1,
		passive: true,
	},
	lucky: {
		name: 'Lucky',
		description: '1/5 chance +20 Mult when scored',
		chips: 0,
		mult: 20,
		multMultiplier: 1,
		money: 0,
		breakChance: 0,
		triggerChance: 0.2,
		passive: false,
	},
};

/** Edition configs */
const EDITION_CONFIG: Record<EditionType, {
	readonly name: string;
	readonly description: string;
	readonly chips: number;
	readonly mult: number;
	readonly multMultiplier: number;
}> = {
	foil: {
		name: 'Foil',
		description: '+50 Chips',
		chips: 50,
		mult: 0,
		multMultiplier: 1,
	},
	holographic: {
		name: 'Holographic',
		description: '+10 Mult',
		chips: 0,
		mult: 10,
		multMultiplier: 1,
	},
	polychrome: {
		name: 'Polychrome',
		description: 'x1.5 Mult',
		chips: 0,
		mult: 0,
		multMultiplier: 1.5,
	},
};

/** Seal configs */
const SEAL_CONFIG: Record<SealType, {
	readonly name: string;
	readonly description: string;
}> = {
	gold: {
		name: 'Gold Seal',
		description: 'Earn $3 when played and scores',
	},
	red: {
		name: 'Red Seal',
		description: 'Retrigger this card',
	},
	blue: {
		name: 'Blue Seal',
		description: 'Creates a Planet card if held at end of round',
	},
	purple: {
		name: 'Purple Seal',
		description: 'Creates a Tarot card when discarded',
	},
};

// =============================================================================
// ENHANCEMENT APPLICATION
// =============================================================================

/**
 * Applies an enhancement to a card.
 *
 * @param card - Card to enhance
 * @param enhancement - Enhancement type
 * @returns Enhanced card
 */
export function applyEnhancement(card: Card, enhancement: EnhancementType): EnhancedCard {
	return { ...card, enhancement };
}

/**
 * Applies an edition to a card.
 *
 * @param card - Card to modify
 * @param edition - Edition type
 * @returns Card with edition
 */
export function applyEdition(card: Card, edition: EditionType): EnhancedCard {
	return { ...card, edition };
}

/**
 * Applies a seal to a card.
 *
 * @param card - Card to modify
 * @param seal - Seal type
 * @returns Card with seal
 */
export function applySeal(card: Card, seal: SealType): EnhancedCard {
	return { ...card, seal };
}

/**
 * Removes enhancement from a card.
 *
 * @param card - Enhanced card
 * @returns Card without enhancement
 */
export function removeEnhancement(card: EnhancedCard): EnhancedCard {
	const { enhancement: _, ...rest } = card;
	return rest;
}

/**
 * Removes edition from a card.
 *
 * @param card - Card with edition
 * @returns Card without edition
 */
export function removeEdition(card: EnhancedCard): EnhancedCard {
	const { edition: _, ...rest } = card;
	return rest;
}

/**
 * Removes seal from a card.
 *
 * @param card - Card with seal
 * @returns Card without seal
 */
export function removeSeal(card: EnhancedCard): EnhancedCard {
	const { seal: _, ...rest } = card;
	return rest;
}

// =============================================================================
// BONUS CALCULATION
// =============================================================================

/**
 * Gets the scoring bonus for an enhanced card.
 * Called when the card is part of a scoring hand.
 *
 * @param card - Enhanced card
 * @param randomValue - Random value between 0 and 1 (for chance-based effects)
 * @returns Enhancement bonus
 */
export function getEnhancementBonus(
	card: EnhancedCard,
	randomValue: number = Math.random(),
): EnhancementBonus {
	const noBonus: EnhancementBonus = {
		addedChips: 0,
		addedMult: 0,
		multMultiplier: 1,
		addedMoney: 0,
		destroyed: false,
		description: '',
	};

	if (!card.enhancement) return noBonus;

	const config = ENHANCEMENT_CONFIG[card.enhancement];

	// Skip passive enhancements during scoring
	if (config.passive) return noBonus;

	// Check trigger chance (for lucky cards)
	if (randomValue > config.triggerChance) {
		return noBonus;
	}

	// Check if glass card breaks
	const destroyed = config.breakChance > 0 && randomValue < config.breakChance;

	return {
		addedChips: config.chips,
		addedMult: config.mult,
		multMultiplier: config.multMultiplier,
		addedMoney: 0,
		destroyed,
		description: config.description,
	};
}

/**
 * Gets the passive bonus for an enhanced card.
 * Called for cards that provide bonuses while held (not scored).
 *
 * @param card - Enhanced card
 * @returns Enhancement bonus (passive)
 */
export function getPassiveBonus(card: EnhancedCard): EnhancementBonus {
	const noBonus: EnhancementBonus = {
		addedChips: 0,
		addedMult: 0,
		multMultiplier: 1,
		addedMoney: 0,
		destroyed: false,
		description: '',
	};

	if (!card.enhancement) return noBonus;

	const config = ENHANCEMENT_CONFIG[card.enhancement];

	if (!config.passive) return noBonus;

	return {
		addedChips: config.chips,
		addedMult: config.mult,
		multMultiplier: config.multMultiplier,
		addedMoney: config.money,
		destroyed: false,
		description: config.description,
	};
}

/**
 * Gets the end-of-round bonus for an enhanced card.
 *
 * @param card - Enhanced card
 * @returns Money bonus
 */
export function getEndOfRoundBonus(card: EnhancedCard): number {
	if (!card.enhancement) return 0;
	const config = ENHANCEMENT_CONFIG[card.enhancement];
	return config.money;
}

/**
 * Gets the edition bonus for a card.
 *
 * @param card - Card with edition
 * @returns Edition bonus
 */
export function getEditionBonus(card: EnhancedCard): EditionBonus {
	const noBonus: EditionBonus = {
		addedChips: 0,
		addedMult: 0,
		multMultiplier: 1,
		description: '',
	};

	if (!card.edition) return noBonus;

	const config = EDITION_CONFIG[card.edition];
	return {
		addedChips: config.chips,
		addedMult: config.mult,
		multMultiplier: config.multMultiplier,
		description: config.description,
	};
}

// =============================================================================
// COMBINED BONUS
// =============================================================================

export interface CombinedCardBonus {
	readonly addedChips: number;
	readonly addedMult: number;
	readonly multMultiplier: number;
	readonly addedMoney: number;
	readonly destroyed: boolean;
	readonly retrigger: boolean;
	readonly descriptions: readonly string[];
}

/**
 * Gets all bonuses for a scoring card (enhancement + edition + seal).
 *
 * @param card - Enhanced card
 * @param randomValue - Random value for chance-based effects
 * @returns Combined bonus
 */
export function getCombinedScoringBonus(
	card: EnhancedCard,
	randomValue: number = Math.random(),
): CombinedCardBonus {
	const enhancementBonus = getEnhancementBonus(card, randomValue);
	const editionBonus = getEditionBonus(card);

	const descriptions: string[] = [];
	if (enhancementBonus.description) descriptions.push(enhancementBonus.description);
	if (editionBonus.description) descriptions.push(editionBonus.description);

	let addedMoney = enhancementBonus.addedMoney;
	let retrigger = false;

	// Seal effects
	if (card.seal === 'gold') {
		addedMoney += 3;
		descriptions.push('Gold Seal: +$3');
	}
	if (card.seal === 'red') {
		retrigger = true;
		descriptions.push('Red Seal: Retrigger');
	}

	return {
		addedChips: enhancementBonus.addedChips + editionBonus.addedChips,
		addedMult: enhancementBonus.addedMult + editionBonus.addedMult,
		multMultiplier: enhancementBonus.multMultiplier * editionBonus.multMultiplier,
		addedMoney,
		destroyed: enhancementBonus.destroyed,
		retrigger,
		descriptions,
	};
}

// =============================================================================
// DISPLAY
// =============================================================================

/**
 * Gets the display name for an enhancement.
 *
 * @param enhancement - Enhancement type
 * @returns Display name
 */
export function getEnhancementName(enhancement: EnhancementType): string {
	return ENHANCEMENT_CONFIG[enhancement].name;
}

/**
 * Gets the description for an enhancement.
 *
 * @param enhancement - Enhancement type
 * @returns Description
 */
export function getEnhancementDescription(enhancement: EnhancementType): string {
	return ENHANCEMENT_CONFIG[enhancement].description;
}

/**
 * Gets the display name for an edition.
 *
 * @param edition - Edition type
 * @returns Display name
 */
export function getEditionName(edition: EditionType): string {
	return EDITION_CONFIG[edition].name;
}

/**
 * Gets the description for an edition.
 *
 * @param edition - Edition type
 * @returns Description
 */
export function getEditionDescription(edition: EditionType): string {
	return EDITION_CONFIG[edition].description;
}

/**
 * Gets the display name for a seal.
 *
 * @param seal - Seal type
 * @returns Display name
 */
export function getSealName(seal: SealType): string {
	return SEAL_CONFIG[seal].name;
}

/**
 * Gets the description for a seal.
 *
 * @param seal - Seal type
 * @returns Description
 */
export function getSealDescription(seal: SealType): string {
	return SEAL_CONFIG[seal].description;
}

/**
 * Gets the color for an enhancement type.
 *
 * @param enhancement - Enhancement type
 * @returns Color code
 */
export function getEnhancementColor(enhancement: EnhancementType): number {
	switch (enhancement) {
		case 'bonus':
			return 0x5588ff; // Blue
		case 'mult':
			return 0xff5555; // Red
		case 'glass':
			return 0x88ffff; // Cyan
		case 'steel':
			return 0xaaaaaa; // Silver
		case 'gold':
			return 0xffdd00; // Gold
		case 'lucky':
			return 0x55ff55; // Green
		default:
			return 0xffffff;
	}
}

/**
 * Gets the color for an edition type.
 *
 * @param edition - Edition type
 * @returns Color code
 */
export function getEditionColor(edition: EditionType): number {
	switch (edition) {
		case 'foil':
			return 0x55aaff; // Light blue
		case 'holographic':
			return 0xff55ff; // Magenta
		case 'polychrome':
			return 0xffffff; // White (rainbow in actual rendering)
		default:
			return 0xffffff;
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if a card has any enhancement.
 *
 * @param card - Card to check
 * @returns True if enhanced
 */
export function isEnhanced(card: EnhancedCard): boolean {
	return card.enhancement !== undefined;
}

/**
 * Checks if a card has an edition.
 *
 * @param card - Card to check
 * @returns True if has edition
 */
export function hasEdition(card: EnhancedCard): boolean {
	return card.edition !== undefined;
}

/**
 * Checks if a card has a seal.
 *
 * @param card - Card to check
 * @returns True if has seal
 */
export function hasSeal(card: EnhancedCard): boolean {
	return card.seal !== undefined;
}

/**
 * Checks if a card has any modification (enhancement, edition, or seal).
 *
 * @param card - Card to check
 * @returns True if modified
 */
export function isModified(card: EnhancedCard): boolean {
	return isEnhanced(card) || hasEdition(card) || hasSeal(card);
}

/**
 * Gets all enhancement types.
 *
 * @returns Array of enhancement types
 */
export function getAllEnhancementTypes(): readonly EnhancementType[] {
	return ['bonus', 'mult', 'glass', 'steel', 'gold', 'lucky'];
}

/**
 * Gets all edition types.
 *
 * @returns Array of edition types
 */
export function getAllEditionTypes(): readonly EditionType[] {
	return ['foil', 'holographic', 'polychrome'];
}

/**
 * Gets all seal types.
 *
 * @returns Array of seal types
 */
export function getAllSealTypes(): readonly SealType[] {
	return ['gold', 'red', 'blue', 'purple'];
}
