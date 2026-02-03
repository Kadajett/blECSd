/**
 * Run Statistics Tracking
 *
 * Tracks per-run and session-level game statistics.
 * All state modifications return new state objects.
 *
 * @module balatro/data/run-stats
 */

import type { HandType } from './hand';

// =============================================================================
// TYPES
// =============================================================================

export interface RunStats {
	readonly antesReached: number;
	readonly blindsCompleted: number;
	readonly totalChipsScored: number;
	readonly handsPlayed: number;
	readonly cardsDiscarded: number;
	readonly bestSingleHandScore: number;
	readonly bestHandType: HandType | null;
	readonly jokersCollected: number;
	readonly moneyEarned: number;
	readonly moneySpent: number;
	readonly packsOpened: number;
	readonly planetsUsed: number;
	readonly tarotsUsed: number;
}

export interface SessionStats {
	readonly runsAttempted: number;
	readonly runsWon: number;
	readonly bestRunScore: number;
	readonly bestAnteReached: number;
	readonly totalHandsPlayed: number;
	readonly favoriteHandType: HandType | null;
	readonly handTypeCounts: Readonly<Record<string, number>>;
}

export interface HandPlayedRecord {
	readonly handType: HandType;
	readonly score: number;
	readonly cardsPlayed: number;
}

export interface BlindCompleteRecord {
	readonly ante: number;
	readonly blindName: string;
	readonly chipsScored: number;
}

export interface StatsSummary {
	readonly title: string;
	readonly lines: readonly StatsLine[];
}

export interface StatsLine {
	readonly label: string;
	readonly value: string;
}

// =============================================================================
// RUN STATS
// =============================================================================

/**
 * Creates initial run statistics.
 *
 * @returns Fresh run stats
 */
export function createRunStats(): RunStats {
	return {
		antesReached: 1,
		blindsCompleted: 0,
		totalChipsScored: 0,
		handsPlayed: 0,
		cardsDiscarded: 0,
		bestSingleHandScore: 0,
		bestHandType: null,
		jokersCollected: 0,
		moneyEarned: 0,
		moneySpent: 0,
		packsOpened: 0,
		planetsUsed: 0,
		tarotsUsed: 0,
	};
}

/**
 * Records a hand played.
 *
 * @param stats - Current stats
 * @param record - Hand played data
 * @returns Updated stats
 */
export function recordHandPlayed(stats: RunStats, record: HandPlayedRecord): RunStats {
	const newBest = record.score > stats.bestSingleHandScore;
	return {
		...stats,
		handsPlayed: stats.handsPlayed + 1,
		totalChipsScored: stats.totalChipsScored + record.score,
		bestSingleHandScore: newBest ? record.score : stats.bestSingleHandScore,
		bestHandType: newBest ? record.handType : stats.bestHandType,
	};
}

/**
 * Records cards discarded.
 *
 * @param stats - Current stats
 * @param count - Number of cards discarded
 * @returns Updated stats
 */
export function recordDiscard(stats: RunStats, count: number): RunStats {
	return {
		...stats,
		cardsDiscarded: stats.cardsDiscarded + count,
	};
}

/**
 * Records a blind completed.
 *
 * @param stats - Current stats
 * @param record - Blind completion data
 * @returns Updated stats
 */
export function recordBlindComplete(stats: RunStats, record: BlindCompleteRecord): RunStats {
	return {
		...stats,
		blindsCompleted: stats.blindsCompleted + 1,
		antesReached: Math.max(stats.antesReached, record.ante),
	};
}

/**
 * Records a joker collected.
 *
 * @param stats - Current stats
 * @returns Updated stats
 */
export function recordJokerCollected(stats: RunStats): RunStats {
	return {
		...stats,
		jokersCollected: stats.jokersCollected + 1,
	};
}

/**
 * Records money earned.
 *
 * @param stats - Current stats
 * @param amount - Money earned
 * @returns Updated stats
 */
export function recordMoneyEarned(stats: RunStats, amount: number): RunStats {
	return {
		...stats,
		moneyEarned: stats.moneyEarned + amount,
	};
}

/**
 * Records money spent.
 *
 * @param stats - Current stats
 * @param amount - Money spent
 * @returns Updated stats
 */
export function recordMoneySpent(stats: RunStats, amount: number): RunStats {
	return {
		...stats,
		moneySpent: stats.moneySpent + amount,
	};
}

/**
 * Records a pack opened.
 *
 * @param stats - Current stats
 * @returns Updated stats
 */
export function recordPackOpened(stats: RunStats): RunStats {
	return {
		...stats,
		packsOpened: stats.packsOpened + 1,
	};
}

/**
 * Records a planet card used.
 *
 * @param stats - Current stats
 * @returns Updated stats
 */
export function recordPlanetUsed(stats: RunStats): RunStats {
	return {
		...stats,
		planetsUsed: stats.planetsUsed + 1,
	};
}

/**
 * Records a tarot card used.
 *
 * @param stats - Current stats
 * @returns Updated stats
 */
export function recordTarotUsed(stats: RunStats): RunStats {
	return {
		...stats,
		tarotsUsed: stats.tarotsUsed + 1,
	};
}

// =============================================================================
// SESSION STATS
// =============================================================================

/**
 * Creates initial session statistics.
 *
 * @returns Fresh session stats
 */
export function createSessionStats(): SessionStats {
	return {
		runsAttempted: 0,
		runsWon: 0,
		bestRunScore: 0,
		bestAnteReached: 0,
		totalHandsPlayed: 0,
		favoriteHandType: null,
		handTypeCounts: {},
	};
}

/**
 * Records a completed run into session stats.
 *
 * @param session - Current session stats
 * @param run - Completed run stats
 * @param won - Whether the run was won
 * @returns Updated session stats
 */
export function recordRunComplete(
	session: SessionStats,
	run: RunStats,
	won: boolean,
): SessionStats {
	const newCounts = { ...session.handTypeCounts };
	if (run.bestHandType) {
		const key = run.bestHandType;
		newCounts[key] = (newCounts[key] ?? 0) + 1;
	}

	const favorite = getFavoriteHandType(newCounts);

	return {
		runsAttempted: session.runsAttempted + 1,
		runsWon: session.runsWon + (won ? 1 : 0),
		bestRunScore: Math.max(session.bestRunScore, run.totalChipsScored),
		bestAnteReached: Math.max(session.bestAnteReached, run.antesReached),
		totalHandsPlayed: session.totalHandsPlayed + run.handsPlayed,
		favoriteHandType: favorite,
		handTypeCounts: newCounts,
	};
}

/**
 * Gets the most frequently used hand type.
 *
 * @param counts - Hand type count map
 * @returns Most used hand type or null
 */
function getFavoriteHandType(counts: Readonly<Record<string, number>>): HandType | null {
	let best: string | null = null;
	let bestCount = 0;

	for (const [type, count] of Object.entries(counts)) {
		if (count > bestCount) {
			best = type;
			bestCount = count;
		}
	}

	return best as HandType | null;
}

// =============================================================================
// SUMMARY / DISPLAY
// =============================================================================

/**
 * Gets a summary of run statistics for display.
 *
 * @param stats - Run stats
 * @returns Formatted summary
 */
export function getRunStatsSummary(stats: RunStats): StatsSummary {
	const lines: StatsLine[] = [
		{ label: 'Antes Reached', value: String(stats.antesReached) },
		{ label: 'Blinds Completed', value: String(stats.blindsCompleted) },
		{ label: 'Total Chips', value: formatStatNumber(stats.totalChipsScored) },
		{ label: 'Hands Played', value: String(stats.handsPlayed) },
		{ label: 'Cards Discarded', value: String(stats.cardsDiscarded) },
		{ label: 'Best Hand Score', value: formatStatNumber(stats.bestSingleHandScore) },
		{ label: 'Best Hand Type', value: stats.bestHandType ?? 'None' },
		{ label: 'Jokers Collected', value: String(stats.jokersCollected) },
		{ label: 'Money Earned', value: `$${stats.moneyEarned}` },
		{ label: 'Money Spent', value: `$${stats.moneySpent}` },
		{ label: 'Packs Opened', value: String(stats.packsOpened) },
		{ label: 'Planets Used', value: String(stats.planetsUsed) },
		{ label: 'Tarots Used', value: String(stats.tarotsUsed) },
	];

	return { title: 'Run Statistics', lines };
}

/**
 * Gets a summary of session statistics for display.
 *
 * @param stats - Session stats
 * @returns Formatted summary
 */
export function getSessionStatsSummary(stats: SessionStats): StatsSummary {
	const winRate = stats.runsAttempted > 0
		? Math.round((stats.runsWon / stats.runsAttempted) * 100)
		: 0;

	const lines: StatsLine[] = [
		{ label: 'Runs Attempted', value: String(stats.runsAttempted) },
		{ label: 'Runs Won', value: String(stats.runsWon) },
		{ label: 'Win Rate', value: `${winRate}%` },
		{ label: 'Best Run Score', value: formatStatNumber(stats.bestRunScore) },
		{ label: 'Best Ante', value: String(stats.bestAnteReached) },
		{ label: 'Total Hands Played', value: formatStatNumber(stats.totalHandsPlayed) },
		{ label: 'Favorite Hand', value: stats.favoriteHandType ?? 'None' },
	];

	return { title: 'Session Statistics', lines };
}

/**
 * Formats a large number for display.
 *
 * @param n - Number to format
 * @returns Formatted string
 */
export function formatStatNumber(n: number): string {
	if (n >= 1_000_000) {
		return `${(n / 1_000_000).toFixed(1)}M`;
	}
	if (n >= 1_000) {
		return `${(n / 1_000).toFixed(1)}K`;
	}
	return String(n);
}

/**
 * Gets the win rate as a percentage.
 *
 * @param session - Session stats
 * @returns Win rate 0-100
 */
export function getWinRate(session: SessionStats): number {
	if (session.runsAttempted === 0) return 0;
	return Math.round((session.runsWon / session.runsAttempted) * 100);
}

/**
 * Gets the net money for a run (earned minus spent).
 *
 * @param stats - Run stats
 * @returns Net money
 */
export function getNetMoney(stats: RunStats): number {
	return stats.moneyEarned - stats.moneySpent;
}

/**
 * Serializes session stats to a JSON string for saving.
 *
 * @param stats - Session stats
 * @returns JSON string
 */
export function serializeSessionStats(stats: SessionStats): string {
	return JSON.stringify(stats);
}

/**
 * Deserializes session stats from a JSON string.
 *
 * @param json - JSON string
 * @returns Session stats or null on failure
 */
export function deserializeSessionStats(json: string): SessionStats | null {
	try {
		const parsed: unknown = JSON.parse(json);
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			'runsAttempted' in parsed &&
			'runsWon' in parsed
		) {
			return parsed as SessionStats;
		}
		return null;
	} catch {
		return null;
	}
}
