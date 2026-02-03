/**
 * Tests for run statistics tracking
 */

import { describe, expect, it } from 'vitest';
import {
	createRunStats,
	createSessionStats,
	recordHandPlayed,
	recordDiscard,
	recordBlindComplete,
	recordJokerCollected,
	recordMoneyEarned,
	recordMoneySpent,
	recordPackOpened,
	recordPlanetUsed,
	recordTarotUsed,
	recordRunComplete,
	getRunStatsSummary,
	getSessionStatsSummary,
	formatStatNumber,
	getWinRate,
	getNetMoney,
	serializeSessionStats,
	deserializeSessionStats,
} from './run-stats';

describe('createRunStats', () => {
	it('creates initial stats', () => {
		const stats = createRunStats();

		expect(stats.antesReached).toBe(1);
		expect(stats.blindsCompleted).toBe(0);
		expect(stats.totalChipsScored).toBe(0);
		expect(stats.handsPlayed).toBe(0);
		expect(stats.cardsDiscarded).toBe(0);
		expect(stats.bestSingleHandScore).toBe(0);
		expect(stats.bestHandType).toBeNull();
		expect(stats.jokersCollected).toBe(0);
		expect(stats.moneyEarned).toBe(0);
		expect(stats.moneySpent).toBe(0);
		expect(stats.packsOpened).toBe(0);
		expect(stats.planetsUsed).toBe(0);
		expect(stats.tarotsUsed).toBe(0);
	});
});

describe('recordHandPlayed', () => {
	it('increments hands played', () => {
		const stats = createRunStats();
		const updated = recordHandPlayed(stats, {
			handType: 'PAIR',
			score: 50,
			cardsPlayed: 2,
		});

		expect(updated.handsPlayed).toBe(1);
		expect(updated.totalChipsScored).toBe(50);
	});

	it('tracks best hand score', () => {
		let stats = createRunStats();
		stats = recordHandPlayed(stats, { handType: 'PAIR', score: 50, cardsPlayed: 2 });
		stats = recordHandPlayed(stats, { handType: 'FLUSH', score: 200, cardsPlayed: 5 });
		stats = recordHandPlayed(stats, { handType: 'PAIR', score: 40, cardsPlayed: 2 });

		expect(stats.bestSingleHandScore).toBe(200);
		expect(stats.bestHandType).toBe('FLUSH');
	});

	it('accumulates total chips', () => {
		let stats = createRunStats();
		stats = recordHandPlayed(stats, { handType: 'PAIR', score: 50, cardsPlayed: 2 });
		stats = recordHandPlayed(stats, { handType: 'PAIR', score: 30, cardsPlayed: 2 });

		expect(stats.totalChipsScored).toBe(80);
	});

	it('does not replace best hand with lower score', () => {
		let stats = createRunStats();
		stats = recordHandPlayed(stats, { handType: 'FLUSH', score: 200, cardsPlayed: 5 });
		stats = recordHandPlayed(stats, { handType: 'PAIR', score: 40, cardsPlayed: 2 });

		expect(stats.bestHandType).toBe('FLUSH');
		expect(stats.bestSingleHandScore).toBe(200);
	});
});

describe('recordDiscard', () => {
	it('tracks cards discarded', () => {
		let stats = createRunStats();
		stats = recordDiscard(stats, 3);
		stats = recordDiscard(stats, 2);

		expect(stats.cardsDiscarded).toBe(5);
	});
});

describe('recordBlindComplete', () => {
	it('increments blinds completed', () => {
		let stats = createRunStats();
		stats = recordBlindComplete(stats, { ante: 1, blindName: 'Small Blind', chipsScored: 100 });

		expect(stats.blindsCompleted).toBe(1);
	});

	it('tracks highest ante reached', () => {
		let stats = createRunStats();
		stats = recordBlindComplete(stats, { ante: 1, blindName: 'Small Blind', chipsScored: 100 });
		stats = recordBlindComplete(stats, { ante: 2, blindName: 'Small Blind', chipsScored: 200 });
		stats = recordBlindComplete(stats, { ante: 3, blindName: 'Big Blind', chipsScored: 300 });

		expect(stats.antesReached).toBe(3);
	});
});

describe('recordJokerCollected', () => {
	it('increments joker count', () => {
		let stats = createRunStats();
		stats = recordJokerCollected(stats);
		stats = recordJokerCollected(stats);

		expect(stats.jokersCollected).toBe(2);
	});
});

describe('recordMoneyEarned', () => {
	it('tracks money earned', () => {
		let stats = createRunStats();
		stats = recordMoneyEarned(stats, 10);
		stats = recordMoneyEarned(stats, 5);

		expect(stats.moneyEarned).toBe(15);
	});
});

describe('recordMoneySpent', () => {
	it('tracks money spent', () => {
		let stats = createRunStats();
		stats = recordMoneySpent(stats, 4);
		stats = recordMoneySpent(stats, 6);

		expect(stats.moneySpent).toBe(10);
	});
});

describe('recordPackOpened', () => {
	it('increments pack count', () => {
		let stats = createRunStats();
		stats = recordPackOpened(stats);

		expect(stats.packsOpened).toBe(1);
	});
});

describe('recordPlanetUsed', () => {
	it('increments planet count', () => {
		let stats = createRunStats();
		stats = recordPlanetUsed(stats);

		expect(stats.planetsUsed).toBe(1);
	});
});

describe('recordTarotUsed', () => {
	it('increments tarot count', () => {
		let stats = createRunStats();
		stats = recordTarotUsed(stats);

		expect(stats.tarotsUsed).toBe(1);
	});
});

describe('createSessionStats', () => {
	it('creates initial session stats', () => {
		const session = createSessionStats();

		expect(session.runsAttempted).toBe(0);
		expect(session.runsWon).toBe(0);
		expect(session.bestRunScore).toBe(0);
		expect(session.bestAnteReached).toBe(0);
		expect(session.totalHandsPlayed).toBe(0);
		expect(session.favoriteHandType).toBeNull();
		expect(Object.keys(session.handTypeCounts)).toHaveLength(0);
	});
});

describe('recordRunComplete', () => {
	it('records a won run', () => {
		const session = createSessionStats();
		let run = createRunStats();
		run = recordHandPlayed(run, { handType: 'FLUSH', score: 200, cardsPlayed: 5 });

		const updated = recordRunComplete(session, run, true);

		expect(updated.runsAttempted).toBe(1);
		expect(updated.runsWon).toBe(1);
	});

	it('records a lost run', () => {
		const session = createSessionStats();
		const run = createRunStats();

		const updated = recordRunComplete(session, run, false);

		expect(updated.runsAttempted).toBe(1);
		expect(updated.runsWon).toBe(0);
	});

	it('tracks best run score across runs', () => {
		let session = createSessionStats();

		let run1 = createRunStats();
		run1 = recordHandPlayed(run1, { handType: 'PAIR', score: 100, cardsPlayed: 2 });
		session = recordRunComplete(session, run1, false);

		let run2 = createRunStats();
		run2 = recordHandPlayed(run2, { handType: 'FLUSH', score: 500, cardsPlayed: 5 });
		session = recordRunComplete(session, run2, true);

		expect(session.bestRunScore).toBe(500);
	});

	it('tracks favorite hand type', () => {
		let session = createSessionStats();

		let run1 = createRunStats();
		run1 = recordHandPlayed(run1, { handType: 'FLUSH', score: 200, cardsPlayed: 5 });
		session = recordRunComplete(session, run1, false);

		let run2 = createRunStats();
		run2 = recordHandPlayed(run2, { handType: 'FLUSH', score: 300, cardsPlayed: 5 });
		session = recordRunComplete(session, run2, true);

		expect(session.favoriteHandType).toBe('FLUSH');
	});

	it('accumulates total hands played', () => {
		let session = createSessionStats();

		let run1 = createRunStats();
		run1 = recordHandPlayed(run1, { handType: 'PAIR', score: 50, cardsPlayed: 2 });
		run1 = recordHandPlayed(run1, { handType: 'PAIR', score: 50, cardsPlayed: 2 });
		session = recordRunComplete(session, run1, false);

		let run2 = createRunStats();
		run2 = recordHandPlayed(run2, { handType: 'PAIR', score: 50, cardsPlayed: 2 });
		session = recordRunComplete(session, run2, false);

		expect(session.totalHandsPlayed).toBe(3);
	});
});

describe('formatStatNumber', () => {
	it('formats small numbers as-is', () => {
		expect(formatStatNumber(0)).toBe('0');
		expect(formatStatNumber(999)).toBe('999');
	});

	it('formats thousands with K', () => {
		expect(formatStatNumber(1000)).toBe('1.0K');
		expect(formatStatNumber(1500)).toBe('1.5K');
		expect(formatStatNumber(999_999)).toBe('1000.0K');
	});

	it('formats millions with M', () => {
		expect(formatStatNumber(1_000_000)).toBe('1.0M');
		expect(formatStatNumber(2_500_000)).toBe('2.5M');
	});
});

describe('getWinRate', () => {
	it('returns 0 for no runs', () => {
		const session = createSessionStats();
		expect(getWinRate(session)).toBe(0);
	});

	it('calculates percentage', () => {
		let session = createSessionStats();
		const run = createRunStats();
		session = recordRunComplete(session, run, true);
		session = recordRunComplete(session, run, false);
		session = recordRunComplete(session, run, true);

		expect(getWinRate(session)).toBe(67);
	});
});

describe('getNetMoney', () => {
	it('calculates net money', () => {
		let stats = createRunStats();
		stats = recordMoneyEarned(stats, 20);
		stats = recordMoneySpent(stats, 12);

		expect(getNetMoney(stats)).toBe(8);
	});

	it('can be negative', () => {
		let stats = createRunStats();
		stats = recordMoneySpent(stats, 5);

		expect(getNetMoney(stats)).toBe(-5);
	});
});

describe('getRunStatsSummary', () => {
	it('returns summary with all fields', () => {
		let stats = createRunStats();
		stats = recordHandPlayed(stats, { handType: 'PAIR', score: 50, cardsPlayed: 2 });

		const summary = getRunStatsSummary(stats);

		expect(summary.title).toBe('Run Statistics');
		expect(summary.lines.length).toBeGreaterThan(0);
		expect(summary.lines.some(l => l.label === 'Hands Played')).toBe(true);
	});
});

describe('getSessionStatsSummary', () => {
	it('returns summary with all fields', () => {
		const session = createSessionStats();
		const summary = getSessionStatsSummary(session);

		expect(summary.title).toBe('Session Statistics');
		expect(summary.lines.some(l => l.label === 'Win Rate')).toBe(true);
	});
});

describe('serialization', () => {
	it('round-trips session stats', () => {
		let session = createSessionStats();
		const run = createRunStats();
		session = recordRunComplete(session, run, true);

		const json = serializeSessionStats(session);
		const restored = deserializeSessionStats(json);

		expect(restored).not.toBeNull();
		expect(restored?.runsAttempted).toBe(1);
		expect(restored?.runsWon).toBe(1);
	});

	it('returns null for invalid JSON', () => {
		expect(deserializeSessionStats('not json')).toBeNull();
	});

	it('returns null for valid JSON missing fields', () => {
		expect(deserializeSessionStats('{"foo":1}')).toBeNull();
	});
});
