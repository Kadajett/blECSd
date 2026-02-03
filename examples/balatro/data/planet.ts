/**
 * Planet Cards and Hand Leveling System
 *
 * Implements planet cards that permanently upgrade poker hands.
 *
 * @module balatro/data/planet
 */

import type { HandType } from './hand';
import { getHandBaseScore } from './hand';

// =============================================================================
// TYPES
// =============================================================================

export type PlanetName =
	| 'Pluto'
	| 'Mercury'
	| 'Uranus'
	| 'Mars'
	| 'Saturn'
	| 'Jupiter'
	| 'Earth'
	| 'Neptune'
	| 'Planet X'
	| 'Eris';

export interface PlanetCard {
	readonly id: string;
	readonly name: PlanetName;
	readonly handType: HandType;
	readonly chipsPerLevel: number;
	readonly multPerLevel: number;
	readonly description: string;
}

export interface HandLevels {
	readonly [key: string]: number;
}

export interface LeveledHandScore {
	readonly baseChips: number;
	readonly baseMult: number;
	readonly level: number;
	readonly chipsFromLevel: number;
	readonly multFromLevel: number;
	readonly totalChips: number;
	readonly totalMult: number;
}

export interface PlanetUseResult {
	readonly handType: HandType;
	readonly newLevel: number;
	readonly chipsAdded: number;
	readonly multAdded: number;
	readonly description: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Planet card definitions.
 */
export const PLANET_CARDS: readonly PlanetCard[] = [
	{
		id: 'planet_pluto',
		name: 'Pluto',
		handType: 'HIGH_CARD',
		chipsPerLevel: 10,
		multPerLevel: 1,
		description: 'Level up High Card (+10 Chips, +1 Mult)',
	},
	{
		id: 'planet_mercury',
		name: 'Mercury',
		handType: 'PAIR',
		chipsPerLevel: 15,
		multPerLevel: 1,
		description: 'Level up Pair (+15 Chips, +1 Mult)',
	},
	{
		id: 'planet_uranus',
		name: 'Uranus',
		handType: 'TWO_PAIR',
		chipsPerLevel: 20,
		multPerLevel: 1,
		description: 'Level up Two Pair (+20 Chips, +1 Mult)',
	},
	{
		id: 'planet_mars',
		name: 'Mars',
		handType: 'THREE_OF_A_KIND',
		chipsPerLevel: 20,
		multPerLevel: 2,
		description: 'Level up Three of a Kind (+20 Chips, +2 Mult)',
	},
	{
		id: 'planet_saturn',
		name: 'Saturn',
		handType: 'STRAIGHT',
		chipsPerLevel: 30,
		multPerLevel: 3,
		description: 'Level up Straight (+30 Chips, +3 Mult)',
	},
	{
		id: 'planet_jupiter',
		name: 'Jupiter',
		handType: 'FLUSH',
		chipsPerLevel: 15,
		multPerLevel: 2,
		description: 'Level up Flush (+15 Chips, +2 Mult)',
	},
	{
		id: 'planet_earth',
		name: 'Earth',
		handType: 'FULL_HOUSE',
		chipsPerLevel: 25,
		multPerLevel: 2,
		description: 'Level up Full House (+25 Chips, +2 Mult)',
	},
	{
		id: 'planet_neptune',
		name: 'Neptune',
		handType: 'FOUR_OF_A_KIND',
		chipsPerLevel: 30,
		multPerLevel: 3,
		description: 'Level up Four of a Kind (+30 Chips, +3 Mult)',
	},
	{
		id: 'planet_planetx',
		name: 'Planet X',
		handType: 'STRAIGHT_FLUSH',
		chipsPerLevel: 40,
		multPerLevel: 4,
		description: 'Level up Straight Flush (+40 Chips, +4 Mult)',
	},
	{
		id: 'planet_eris',
		name: 'Eris',
		handType: 'ROYAL_FLUSH',
		chipsPerLevel: 40,
		multPerLevel: 4,
		description: 'Level up Royal Flush (+40 Chips, +4 Mult)',
	},
];

// =============================================================================
// PLANET LOOKUP
// =============================================================================

/**
 * Gets a planet card by ID.
 *
 * @param id - Planet card ID
 * @returns Planet card or undefined
 */
export function getPlanetById(id: string): PlanetCard | undefined {
	return PLANET_CARDS.find(p => p.id === id);
}

/**
 * Gets the planet card for a hand type.
 *
 * @param handType - Hand type
 * @returns Planet card or undefined
 */
export function getPlanetForHandType(handType: HandType): PlanetCard | undefined {
	return PLANET_CARDS.find(p => p.handType === handType);
}

/**
 * Gets a random planet card.
 *
 * @param excludeIds - IDs to exclude
 * @returns Random planet card or null
 */
export function getRandomPlanet(excludeIds: readonly string[] = []): PlanetCard | null {
	const available = PLANET_CARDS.filter(p => !excludeIds.includes(p.id));
	if (available.length === 0) return null;
	const index = Math.floor(Math.random() * available.length);
	return available[index] ?? null;
}

// =============================================================================
// HAND LEVELS
// =============================================================================

/**
 * Creates initial hand levels (all level 1).
 *
 * @returns Hand levels
 */
export function createHandLevels(): HandLevels {
	return {
		HIGH_CARD: 1,
		PAIR: 1,
		TWO_PAIR: 1,
		THREE_OF_A_KIND: 1,
		STRAIGHT: 1,
		FLUSH: 1,
		FULL_HOUSE: 1,
		FOUR_OF_A_KIND: 1,
		STRAIGHT_FLUSH: 1,
		ROYAL_FLUSH: 1,
	};
}

/**
 * Gets the level for a hand type.
 *
 * @param levels - Hand levels
 * @param handType - Hand type
 * @returns Level (defaults to 1)
 */
export function getHandLevel(levels: HandLevels, handType: HandType): number {
	return levels[handType] ?? 1;
}

/**
 * Levels up a hand type.
 *
 * @param levels - Current hand levels
 * @param handType - Hand type to level up
 * @returns Updated hand levels
 */
export function levelUpHand(levels: HandLevels, handType: HandType): HandLevels {
	const current = getHandLevel(levels, handType);
	return {
		...levels,
		[handType]: current + 1,
	};
}

// =============================================================================
// LEVELED SCORING
// =============================================================================

/**
 * Gets the leveled score for a hand type.
 * Level N bonus = Base + PerLevel * (N - 1)
 *
 * @param handType - Hand type
 * @param level - Hand level (1+)
 * @returns Leveled hand score
 */
export function getLeveledHandScore(handType: HandType, level: number): LeveledHandScore {
	const base = getHandBaseScore(handType);
	const planet = getPlanetForHandType(handType);

	const effectiveLevel = Math.max(1, level);
	const chipsPerLevel = planet?.chipsPerLevel ?? 0;
	const multPerLevel = planet?.multPerLevel ?? 0;

	const chipsFromLevel = chipsPerLevel * (effectiveLevel - 1);
	const multFromLevel = multPerLevel * (effectiveLevel - 1);

	return {
		baseChips: base.baseChips,
		baseMult: base.baseMult,
		level: effectiveLevel,
		chipsFromLevel,
		multFromLevel,
		totalChips: base.baseChips + chipsFromLevel,
		totalMult: base.baseMult + multFromLevel,
	};
}

/**
 * Gets the leveled score using hand levels state.
 *
 * @param handType - Hand type
 * @param levels - Hand levels
 * @returns Leveled hand score
 */
export function getLeveledScore(handType: HandType, levels: HandLevels): LeveledHandScore {
	const level = getHandLevel(levels, handType);
	return getLeveledHandScore(handType, level);
}

// =============================================================================
// PLANET CARD USAGE
// =============================================================================

/**
 * Uses a planet card to level up a hand type.
 *
 * @param levels - Current hand levels
 * @param planetCard - Planet card to use
 * @returns Result with updated levels and bonus info
 */
export function usePlanetCard(levels: HandLevels, planetCard: PlanetCard): PlanetUseResult {
	const newLevel = getHandLevel(levels, planetCard.handType) + 1;

	return {
		handType: planetCard.handType,
		newLevel,
		chipsAdded: planetCard.chipsPerLevel,
		multAdded: planetCard.multPerLevel,
		description: `${planetCard.name}: Level up ${planetCard.handType} to Level ${newLevel}`,
	};
}

/**
 * Applies a planet card to hand levels.
 *
 * @param levels - Current hand levels
 * @param planetCard - Planet card to apply
 * @returns Updated hand levels
 */
export function applyPlanetCard(levels: HandLevels, planetCard: PlanetCard): HandLevels {
	return levelUpHand(levels, planetCard.handType);
}

// =============================================================================
// DISPLAY
// =============================================================================

/**
 * Formats a leveled hand score for display.
 *
 * @param score - Leveled hand score
 * @param handName - Display name of the hand
 * @returns Formatted string
 */
export function formatLeveledScore(score: LeveledHandScore, handName: string): string {
	const levelStr = score.level > 1 ? ` (Lvl ${score.level})` : '';
	return `${handName}${levelStr}: ${score.totalChips} chips x ${score.totalMult} mult`;
}

/**
 * Formats a planet card for display.
 *
 * @param planet - Planet card
 * @returns Formatted string
 */
export function formatPlanetCard(planet: PlanetCard): string {
	return `${planet.name}: +${planet.chipsPerLevel} Chips, +${planet.multPerLevel} Mult`;
}

/**
 * Gets the color for a planet card.
 *
 * @param planet - Planet card
 * @returns Color code
 */
export function getPlanetColor(planet: PlanetCard): number {
	switch (planet.name) {
		case 'Pluto':
			return 0x8888aa; // Gray-blue
		case 'Mercury':
			return 0xffaa55; // Orange
		case 'Uranus':
			return 0x55ffff; // Cyan
		case 'Mars':
			return 0xff5555; // Red
		case 'Saturn':
			return 0xffdd55; // Gold
		case 'Jupiter':
			return 0xff8855; // Dark orange
		case 'Earth':
			return 0x55aa55; // Green
		case 'Neptune':
			return 0x5555ff; // Blue
		case 'Planet X':
			return 0xff55ff; // Magenta
		case 'Eris':
			return 0xffffff; // White
		default:
			return 0xffffff;
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if any hand has been leveled up.
 *
 * @param levels - Hand levels
 * @returns True if any hand is above level 1
 */
export function hasLeveledHands(levels: HandLevels): boolean {
	return Object.values(levels).some(level => (level as number) > 1);
}

/**
 * Gets the total number of levels gained across all hands.
 *
 * @param levels - Hand levels
 * @returns Total extra levels
 */
export function getTotalLevelsGained(levels: HandLevels): number {
	return Object.values(levels).reduce(
		(sum, level) => sum + ((level as number) - 1),
		0,
	);
}

/**
 * Gets the highest leveled hand type.
 *
 * @param levels - Hand levels
 * @returns Hand type with highest level, or null if all level 1
 */
export function getHighestLeveledHand(levels: HandLevels): HandType | null {
	let highestLevel = 1;
	let highestType: HandType | null = null;

	for (const [type, level] of Object.entries(levels)) {
		if ((level as number) > highestLevel) {
			highestLevel = level as number;
			highestType = type as HandType;
		}
	}

	return highestType;
}
