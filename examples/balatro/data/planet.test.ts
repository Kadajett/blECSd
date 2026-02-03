/**
 * Tests for planet cards and hand leveling system
 */

import { describe, expect, it } from 'vitest';
import {
	PLANET_CARDS,
	getPlanetById,
	getPlanetForHandType,
	getRandomPlanet,
	createHandLevels,
	getHandLevel,
	levelUpHand,
	getLeveledHandScore,
	getLeveledScore,
	usePlanetCard,
	applyPlanetCard,
	formatLeveledScore,
	formatPlanetCard,
	getPlanetColor,
	hasLeveledHands,
	getTotalLevelsGained,
	getHighestLeveledHand,
} from './planet';

describe('PLANET_CARDS', () => {
	it('has 10 planet cards', () => {
		expect(PLANET_CARDS).toHaveLength(10);
	});

	it('covers all hand types', () => {
		const handTypes = PLANET_CARDS.map(p => p.handType);
		expect(handTypes).toContain('HIGH_CARD');
		expect(handTypes).toContain('PAIR');
		expect(handTypes).toContain('TWO_PAIR');
		expect(handTypes).toContain('THREE_OF_A_KIND');
		expect(handTypes).toContain('STRAIGHT');
		expect(handTypes).toContain('FLUSH');
		expect(handTypes).toContain('FULL_HOUSE');
		expect(handTypes).toContain('FOUR_OF_A_KIND');
		expect(handTypes).toContain('STRAIGHT_FLUSH');
		expect(handTypes).toContain('ROYAL_FLUSH');
	});

	it('all have positive chips and mult per level', () => {
		for (const planet of PLANET_CARDS) {
			expect(planet.chipsPerLevel).toBeGreaterThan(0);
			expect(planet.multPerLevel).toBeGreaterThan(0);
		}
	});
});

describe('getPlanetById', () => {
	it('finds planet by ID', () => {
		const planet = getPlanetById('planet_pluto');

		expect(planet).toBeDefined();
		expect(planet?.name).toBe('Pluto');
		expect(planet?.handType).toBe('HIGH_CARD');
	});

	it('returns undefined for invalid ID', () => {
		expect(getPlanetById('nonexistent')).toBeUndefined();
	});
});

describe('getPlanetForHandType', () => {
	it('finds planet for hand type', () => {
		const planet = getPlanetForHandType('PAIR');

		expect(planet).toBeDefined();
		expect(planet?.name).toBe('Mercury');
	});

	it('finds planet for each hand type', () => {
		const handTypes = ['HIGH_CARD', 'PAIR', 'TWO_PAIR', 'THREE_OF_A_KIND', 'STRAIGHT', 'FLUSH', 'FULL_HOUSE', 'FOUR_OF_A_KIND', 'STRAIGHT_FLUSH', 'ROYAL_FLUSH'] as const;

		for (const type of handTypes) {
			expect(getPlanetForHandType(type)).toBeDefined();
		}
	});
});

describe('getRandomPlanet', () => {
	it('returns a planet', () => {
		const planet = getRandomPlanet();
		expect(planet).not.toBeNull();
	});

	it('excludes specified IDs', () => {
		for (let i = 0; i < 20; i++) {
			const planet = getRandomPlanet(['planet_pluto']);
			if (planet) {
				expect(planet.id).not.toBe('planet_pluto');
			}
		}
	});

	it('returns null when all excluded', () => {
		const allIds = PLANET_CARDS.map(p => p.id);
		expect(getRandomPlanet(allIds)).toBeNull();
	});
});

describe('createHandLevels', () => {
	it('creates all levels at 1', () => {
		const levels = createHandLevels();

		expect(getHandLevel(levels, 'HIGH_CARD')).toBe(1);
		expect(getHandLevel(levels, 'PAIR')).toBe(1);
		expect(getHandLevel(levels, 'ROYAL_FLUSH')).toBe(1);
	});
});

describe('getHandLevel', () => {
	it('returns level for known type', () => {
		const levels = createHandLevels();
		expect(getHandLevel(levels, 'PAIR')).toBe(1);
	});

	it('returns 1 for unknown type', () => {
		const levels = {};
		expect(getHandLevel(levels, 'PAIR')).toBe(1);
	});
});

describe('levelUpHand', () => {
	it('increments level', () => {
		const levels = createHandLevels();
		const newLevels = levelUpHand(levels, 'PAIR');

		expect(getHandLevel(newLevels, 'PAIR')).toBe(2);
	});

	it('does not affect other types', () => {
		const levels = createHandLevels();
		const newLevels = levelUpHand(levels, 'PAIR');

		expect(getHandLevel(newLevels, 'HIGH_CARD')).toBe(1);
		expect(getHandLevel(newLevels, 'FLUSH')).toBe(1);
	});

	it('can level up multiple times', () => {
		let levels = createHandLevels();
		levels = levelUpHand(levels, 'PAIR');
		levels = levelUpHand(levels, 'PAIR');
		levels = levelUpHand(levels, 'PAIR');

		expect(getHandLevel(levels, 'PAIR')).toBe(4);
	});
});

describe('getLeveledHandScore', () => {
	it('returns base score at level 1', () => {
		const score = getLeveledHandScore('PAIR', 1);

		expect(score.level).toBe(1);
		expect(score.chipsFromLevel).toBe(0);
		expect(score.multFromLevel).toBe(0);
		expect(score.totalChips).toBe(score.baseChips);
		expect(score.totalMult).toBe(score.baseMult);
	});

	it('adds chips and mult at higher levels', () => {
		const score = getLeveledHandScore('PAIR', 3);
		const planet = getPlanetForHandType('PAIR')!;

		expect(score.level).toBe(3);
		expect(score.chipsFromLevel).toBe(planet.chipsPerLevel * 2);
		expect(score.multFromLevel).toBe(planet.multPerLevel * 2);
		expect(score.totalChips).toBe(score.baseChips + score.chipsFromLevel);
		expect(score.totalMult).toBe(score.baseMult + score.multFromLevel);
	});

	it('handles level 0 as level 1', () => {
		const score = getLeveledHandScore('PAIR', 0);
		expect(score.level).toBe(1);
		expect(score.chipsFromLevel).toBe(0);
	});

	it('scales linearly with level', () => {
		const level2 = getLeveledHandScore('FLUSH', 2);
		const level5 = getLeveledHandScore('FLUSH', 5);

		// Level 5 should have 4x the level bonus of level 2 (which has 1x)
		expect(level5.chipsFromLevel).toBe(level2.chipsFromLevel * 4);
		expect(level5.multFromLevel).toBe(level2.multFromLevel * 4);
	});
});

describe('getLeveledScore', () => {
	it('uses levels from state', () => {
		let levels = createHandLevels();
		levels = levelUpHand(levels, 'PAIR');
		levels = levelUpHand(levels, 'PAIR');

		const score = getLeveledScore('PAIR', levels);

		expect(score.level).toBe(3);
		expect(score.chipsFromLevel).toBeGreaterThan(0);
	});
});

describe('usePlanetCard', () => {
	it('returns level up result', () => {
		const levels = createHandLevels();
		const planet = getPlanetById('planet_mercury')!;
		const result = usePlanetCard(levels, planet);

		expect(result.handType).toBe('PAIR');
		expect(result.newLevel).toBe(2);
		expect(result.chipsAdded).toBe(15);
		expect(result.multAdded).toBe(1);
		expect(result.description).toContain('Mercury');
		expect(result.description).toContain('Level 2');
	});
});

describe('applyPlanetCard', () => {
	it('levels up the hand type', () => {
		const levels = createHandLevels();
		const planet = getPlanetById('planet_mercury')!;
		const newLevels = applyPlanetCard(levels, planet);

		expect(getHandLevel(newLevels, 'PAIR')).toBe(2);
	});
});

describe('formatLeveledScore', () => {
	it('formats score at level 1', () => {
		const score = getLeveledHandScore('PAIR', 1);
		const formatted = formatLeveledScore(score, 'Pair');

		expect(formatted).toContain('Pair');
		expect(formatted).toContain('chips');
		expect(formatted).toContain('mult');
		expect(formatted).not.toContain('Lvl');
	});

	it('includes level when > 1', () => {
		const score = getLeveledHandScore('PAIR', 3);
		const formatted = formatLeveledScore(score, 'Pair');

		expect(formatted).toContain('Lvl 3');
	});
});

describe('formatPlanetCard', () => {
	it('formats planet card', () => {
		const planet = getPlanetById('planet_mercury')!;
		const formatted = formatPlanetCard(planet);

		expect(formatted).toContain('Mercury');
		expect(formatted).toContain('+15 Chips');
		expect(formatted).toContain('+1 Mult');
	});
});

describe('getPlanetColor', () => {
	it('returns color for each planet', () => {
		for (const planet of PLANET_CARDS) {
			const color = getPlanetColor(planet);
			expect(color).toBeGreaterThan(0);
		}
	});

	it('returns different colors', () => {
		const colors = new Set(PLANET_CARDS.map(p => getPlanetColor(p)));
		// At least 5 unique colors
		expect(colors.size).toBeGreaterThanOrEqual(5);
	});
});

describe('hasLeveledHands', () => {
	it('returns false for initial levels', () => {
		const levels = createHandLevels();
		expect(hasLeveledHands(levels)).toBe(false);
	});

	it('returns true when a hand is leveled', () => {
		let levels = createHandLevels();
		levels = levelUpHand(levels, 'PAIR');

		expect(hasLeveledHands(levels)).toBe(true);
	});
});

describe('getTotalLevelsGained', () => {
	it('returns 0 for initial levels', () => {
		const levels = createHandLevels();
		expect(getTotalLevelsGained(levels)).toBe(0);
	});

	it('returns total extra levels', () => {
		let levels = createHandLevels();
		levels = levelUpHand(levels, 'PAIR');
		levels = levelUpHand(levels, 'PAIR');
		levels = levelUpHand(levels, 'FLUSH');

		expect(getTotalLevelsGained(levels)).toBe(3);
	});
});

describe('getHighestLeveledHand', () => {
	it('returns null for initial levels', () => {
		const levels = createHandLevels();
		expect(getHighestLeveledHand(levels)).toBeNull();
	});

	it('returns highest leveled hand', () => {
		let levels = createHandLevels();
		levels = levelUpHand(levels, 'PAIR');
		levels = levelUpHand(levels, 'PAIR');
		levels = levelUpHand(levels, 'PAIR');
		levels = levelUpHand(levels, 'FLUSH');

		expect(getHighestLeveledHand(levels)).toBe('PAIR');
	});
});
