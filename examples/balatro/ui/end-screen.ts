/**
 * Game Over and Victory Screens
 *
 * Implements end-of-run screens with statistics display.
 *
 * @module balatro/ui/end-screen
 */

import type { GameState } from '../data/game-state';
import type { HandType } from '../data/hand';
import { centerX } from './menu';

// =============================================================================
// TYPES
// =============================================================================

export type EndScreenType = 'victory' | 'game_over';

export type EndScreenOption = 'new_run' | 'retry' | 'main_menu';

export interface RunStatistics {
	readonly finalAnte: number;
	readonly finalBlind: string;
	readonly totalScore: number;
	readonly handsPlayed: number;
	readonly bestHandType: HandType | null;
	readonly bestHandScore: number;
	readonly moneyEarned: number;
	readonly jokersCollected: number;
}

export interface EndScreenState {
	readonly type: EndScreenType;
	readonly stats: RunStatistics;
	readonly selectedIndex: number;
}

export interface EndScreenRenderData {
	readonly lines: readonly { readonly text: string; readonly x: number; readonly y: number; readonly color: number }[];
	readonly options: readonly {
		readonly label: string;
		readonly x: number;
		readonly y: number;
		readonly selected: boolean;
	}[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Victory title ASCII art */
const VICTORY_TITLE = '★ VICTORY! ★';

/** Game over title */
const GAME_OVER_TITLE = 'GAME OVER';

/** Victory screen color */
export const VICTORY_COLOR = 0xffd700_ff; // Gold

/** Game over screen color */
export const GAME_OVER_COLOR = 0xff4444_ff; // Red

/** Text color */
export const TEXT_COLOR = 0xffffff_ff;

/** Dim text color */
export const DIM_COLOR = 0xaaaaaa_ff;

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial end screen state.
 *
 * @param type - Screen type (victory or game_over)
 * @param stats - Run statistics
 * @returns End screen state
 */
export function createEndScreenState(
	type: EndScreenType,
	stats: RunStatistics,
): EndScreenState {
	return {
		type,
		stats,
		selectedIndex: 0,
	};
}

/**
 * Gets available options for the end screen.
 *
 * @param type - Screen type
 * @returns Available options
 */
export function getEndScreenOptions(type: EndScreenType): readonly EndScreenOption[] {
	if (type === 'victory') {
		return ['new_run', 'main_menu'];
	}
	return ['retry', 'main_menu'];
}

/**
 * Gets the number of options.
 *
 * @param type - Screen type
 * @returns Number of options
 */
export function getOptionCount(type: EndScreenType): number {
	return getEndScreenOptions(type).length;
}

// =============================================================================
// NAVIGATION
// =============================================================================

/**
 * Navigates left in the options.
 *
 * @param state - Current state
 * @returns New state
 */
export function navigateLeft(state: EndScreenState): EndScreenState {
	const count = getOptionCount(state.type);
	const newIndex = (state.selectedIndex - 1 + count) % count;
	return { ...state, selectedIndex: newIndex };
}

/**
 * Navigates right in the options.
 *
 * @param state - Current state
 * @returns New state
 */
export function navigateRight(state: EndScreenState): EndScreenState {
	const count = getOptionCount(state.type);
	const newIndex = (state.selectedIndex + 1) % count;
	return { ...state, selectedIndex: newIndex };
}

/**
 * Gets the currently selected option.
 *
 * @param state - Current state
 * @returns Selected option
 */
export function getSelectedOption(state: EndScreenState): EndScreenOption {
	const options = getEndScreenOptions(state.type);
	return options[state.selectedIndex] ?? 'main_menu';
}

// =============================================================================
// STATISTICS CREATION
// =============================================================================

/**
 * Creates run statistics from game state.
 *
 * @param state - Final game state
 * @param handsPlayed - Total hands played during run
 * @param bestHandType - Best hand type achieved
 * @param bestHandScore - Best hand score achieved
 * @returns Run statistics
 */
export function createRunStatistics(
	state: GameState,
	handsPlayed: number,
	bestHandType: HandType | null,
	bestHandScore: number,
): RunStatistics {
	return {
		finalAnte: state.currentAnte,
		finalBlind: state.currentBlind.name,
		totalScore: state.score,
		handsPlayed,
		bestHandType,
		bestHandScore,
		moneyEarned: state.money,
		jokersCollected: state.jokers.length,
	};
}

/**
 * Creates empty run statistics.
 */
export function createEmptyStatistics(): RunStatistics {
	return {
		finalAnte: 1,
		finalBlind: 'Small Blind',
		totalScore: 0,
		handsPlayed: 0,
		bestHandType: null,
		bestHandScore: 0,
		moneyEarned: 0,
		jokersCollected: 0,
	};
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Formats a number with commas.
 *
 * @param n - Number to format
 * @returns Formatted string
 */
export function formatNumber(n: number): string {
	return n.toLocaleString();
}

/**
 * Formats a hand type for display.
 *
 * @param type - Hand type
 * @returns Formatted string
 */
export function formatHandType(type: HandType | null): string {
	if (!type) return 'None';

	const names: Record<HandType, string> = {
		HIGH_CARD: 'High Card',
		PAIR: 'Pair',
		TWO_PAIR: 'Two Pair',
		THREE_OF_A_KIND: 'Three of a Kind',
		STRAIGHT: 'Straight',
		FLUSH: 'Flush',
		FULL_HOUSE: 'Full House',
		FOUR_OF_A_KIND: 'Four of a Kind',
		STRAIGHT_FLUSH: 'Straight Flush',
		ROYAL_FLUSH: 'Royal Flush',
	};

	return names[type] ?? type;
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Gets the render data for a victory screen.
 *
 * @param state - End screen state
 * @param screenWidth - Screen width
 * @param screenHeight - Screen height
 * @returns Render data
 */
export function getVictoryRenderData(
	state: EndScreenState,
	screenWidth: number,
	screenHeight: number,
): EndScreenRenderData {
	const { stats } = state;
	const startY = Math.max(3, Math.floor((screenHeight - 14) / 2));

	const lines: { text: string; x: number; y: number; color: number }[] = [];

	// Title
	lines.push({
		text: VICTORY_TITLE,
		x: centerX(VICTORY_TITLE, screenWidth),
		y: startY,
		color: VICTORY_COLOR,
	});

	// Subtitle
	const subtitle = 'You defeated Ante 8!';
	lines.push({
		text: subtitle,
		x: centerX(subtitle, screenWidth),
		y: startY + 2,
		color: TEXT_COLOR,
	});

	// Stats
	const statsStartY = startY + 4;
	const statsLines = [
		`Final Score: ${formatNumber(stats.totalScore)}`,
		`Hands Played: ${formatNumber(stats.handsPlayed)}`,
		`Best Hand: ${formatHandType(stats.bestHandType)}`,
		`Money Earned: $${formatNumber(stats.moneyEarned)}`,
	];

	if (stats.jokersCollected > 0) {
		statsLines.push(`Jokers: ${stats.jokersCollected}`);
	}

	statsLines.forEach((text, i) => {
		lines.push({
			text,
			x: centerX(text, screenWidth),
			y: statsStartY + i,
			color: DIM_COLOR,
		});
	});

	// Options
	const optionsY = statsStartY + statsLines.length + 2;
	const options = getEndScreenOptions(state.type);
	const optionLabels: Record<EndScreenOption, string> = {
		new_run: '[ NEW RUN ]',
		retry: '[ RETRY ]',
		main_menu: '[ MAIN MENU ]',
	};

	const optionTexts = options.map(opt => optionLabels[opt]);
	const totalWidth = optionTexts.reduce((sum, t) => sum + t.length, 0) + (optionTexts.length - 1) * 4;
	let currentX = Math.floor((screenWidth - totalWidth) / 2);

	const renderOptions = options.map((opt, i) => {
		const label = optionLabels[opt];
		const x = currentX;
		currentX += label.length + 4;
		return {
			label,
			x,
			y: optionsY,
			selected: i === state.selectedIndex,
		};
	});

	return { lines, options: renderOptions };
}

/**
 * Gets the render data for a game over screen.
 *
 * @param state - End screen state
 * @param screenWidth - Screen width
 * @param screenHeight - Screen height
 * @returns Render data
 */
export function getGameOverRenderData(
	state: EndScreenState,
	screenWidth: number,
	screenHeight: number,
): EndScreenRenderData {
	const { stats } = state;
	const startY = Math.max(3, Math.floor((screenHeight - 12) / 2));

	const lines: { text: string; x: number; y: number; color: number }[] = [];

	// Title
	lines.push({
		text: GAME_OVER_TITLE,
		x: centerX(GAME_OVER_TITLE, screenWidth),
		y: startY,
		color: GAME_OVER_COLOR,
	});

	// Where failed
	const failedAt = `Reached Ante ${stats.finalAnte}, ${stats.finalBlind}`;
	lines.push({
		text: failedAt,
		x: centerX(failedAt, screenWidth),
		y: startY + 2,
		color: TEXT_COLOR,
	});

	// Stats
	const statsStartY = startY + 4;
	const statsLines = [
		`Score: ${formatNumber(stats.totalScore)}`,
		`Hands Played: ${formatNumber(stats.handsPlayed)}`,
		`Best Hand: ${formatHandType(stats.bestHandType)}`,
	];

	statsLines.forEach((text, i) => {
		lines.push({
			text,
			x: centerX(text, screenWidth),
			y: statsStartY + i,
			color: DIM_COLOR,
		});
	});

	// Options
	const optionsY = statsStartY + statsLines.length + 2;
	const options = getEndScreenOptions(state.type);
	const optionLabels: Record<EndScreenOption, string> = {
		new_run: '[ NEW RUN ]',
		retry: '[ RETRY ]',
		main_menu: '[ MAIN MENU ]',
	};

	const optionTexts = options.map(opt => optionLabels[opt]);
	const totalWidth = optionTexts.reduce((sum, t) => sum + t.length, 0) + (optionTexts.length - 1) * 4;
	let currentX = Math.floor((screenWidth - totalWidth) / 2);

	const renderOptions = options.map((opt, i) => {
		const label = optionLabels[opt];
		const x = currentX;
		currentX += label.length + 4;
		return {
			label,
			x,
			y: optionsY,
			selected: i === state.selectedIndex,
		};
	});

	return { lines, options: renderOptions };
}

/**
 * Gets render data for any end screen type.
 *
 * @param state - End screen state
 * @param screenWidth - Screen width
 * @param screenHeight - Screen height
 * @returns Render data
 */
export function getEndScreenRenderData(
	state: EndScreenState,
	screenWidth: number,
	screenHeight: number,
): EndScreenRenderData {
	if (state.type === 'victory') {
		return getVictoryRenderData(state, screenWidth, screenHeight);
	}
	return getGameOverRenderData(state, screenWidth, screenHeight);
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

export type EndScreenInput =
	| { readonly type: 'left' }
	| { readonly type: 'right' }
	| { readonly type: 'select' };

export type EndScreenAction =
	| { readonly type: 'new_run' }
	| { readonly type: 'retry' }
	| { readonly type: 'main_menu' }
	| { readonly type: 'none' };

/**
 * Processes input on the end screen.
 *
 * @param state - Current state
 * @param input - Input event
 * @returns Tuple of [new state, action]
 */
export function processEndScreenInput(
	state: EndScreenState,
	input: EndScreenInput,
): [EndScreenState, EndScreenAction] {
	switch (input.type) {
		case 'left':
			return [navigateLeft(state), { type: 'none' }];
		case 'right':
			return [navigateRight(state), { type: 'none' }];
		case 'select': {
			const option = getSelectedOption(state);
			return [state, { type: option }];
		}
		default:
			return [state, { type: 'none' }];
	}
}

/**
 * Converts a key name to end screen input.
 *
 * @param key - Key name
 * @returns End screen input or null
 */
export function keyToEndScreenInput(key: string): EndScreenInput | null {
	switch (key) {
		case 'left':
		case 'h':
			return { type: 'left' };
		case 'right':
		case 'l':
			return { type: 'right' };
		case 'return':
		case 'enter':
		case 'space':
			return { type: 'select' };
		default:
			return null;
	}
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if the end screen is a victory.
 *
 * @param state - End screen state
 * @returns True if victory
 */
export function isVictoryScreen(state: EndScreenState): boolean {
	return state.type === 'victory';
}

/**
 * Checks if the end screen is game over.
 *
 * @param state - End screen state
 * @returns True if game over
 */
export function isGameOverScreen(state: EndScreenState): boolean {
	return state.type === 'game_over';
}
