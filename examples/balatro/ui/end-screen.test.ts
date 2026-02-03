/**
 * Tests for game over and victory screens
 */

import { describe, expect, it } from 'vitest';
import {
	createEndScreenState,
	getEndScreenOptions,
	getOptionCount,
	navigateLeft,
	navigateRight,
	getSelectedOption,
	createRunStatistics,
	createEmptyStatistics,
	formatNumber,
	formatHandType,
	getVictoryRenderData,
	getGameOverRenderData,
	getEndScreenRenderData,
	processEndScreenInput,
	keyToEndScreenInput,
	isVictoryScreen,
	isGameOverScreen,
	VICTORY_COLOR,
	GAME_OVER_COLOR,
} from './end-screen';
import { createGameState } from '../data/game-state';
import type { EndScreenState, RunStatistics } from './end-screen';

// Helper to create mock stats
function mockStats(): RunStatistics {
	return {
		finalAnte: 5,
		finalBlind: 'Big Blind',
		totalScore: 12450,
		handsPlayed: 47,
		bestHandType: 'STRAIGHT_FLUSH',
		bestHandScore: 3500,
		moneyEarned: 85,
		jokersCollected: 3,
	};
}

describe('createEndScreenState', () => {
	it('creates victory state', () => {
		const stats = mockStats();
		const state = createEndScreenState('victory', stats);

		expect(state.type).toBe('victory');
		expect(state.stats).toBe(stats);
		expect(state.selectedIndex).toBe(0);
	});

	it('creates game over state', () => {
		const stats = mockStats();
		const state = createEndScreenState('game_over', stats);

		expect(state.type).toBe('game_over');
	});
});

describe('getEndScreenOptions', () => {
	it('returns new_run and main_menu for victory', () => {
		const options = getEndScreenOptions('victory');

		expect(options).toContain('new_run');
		expect(options).toContain('main_menu');
		expect(options).not.toContain('retry');
	});

	it('returns retry and main_menu for game_over', () => {
		const options = getEndScreenOptions('game_over');

		expect(options).toContain('retry');
		expect(options).toContain('main_menu');
		expect(options).not.toContain('new_run');
	});
});

describe('getOptionCount', () => {
	it('returns 2 for both types', () => {
		expect(getOptionCount('victory')).toBe(2);
		expect(getOptionCount('game_over')).toBe(2);
	});
});

describe('navigation', () => {
	it('navigateLeft wraps around', () => {
		const state = createEndScreenState('victory', mockStats());
		const newState = navigateLeft(state);

		expect(newState.selectedIndex).toBe(1); // Wrapped to last
	});

	it('navigateRight wraps around', () => {
		const state: EndScreenState = {
			...createEndScreenState('victory', mockStats()),
			selectedIndex: 1,
		};
		const newState = navigateRight(state);

		expect(newState.selectedIndex).toBe(0); // Wrapped to first
	});

	it('getSelectedOption returns correct option', () => {
		const state0 = createEndScreenState('victory', mockStats());
		const state1: EndScreenState = { ...state0, selectedIndex: 1 };

		expect(getSelectedOption(state0)).toBe('new_run');
		expect(getSelectedOption(state1)).toBe('main_menu');
	});
});

describe('createRunStatistics', () => {
	it('creates stats from game state', () => {
		const gameState = createGameState();
		const stats = createRunStatistics(gameState, 25, 'FLUSH', 1500);

		expect(stats.finalAnte).toBe(1);
		expect(stats.handsPlayed).toBe(25);
		expect(stats.bestHandType).toBe('FLUSH');
		expect(stats.bestHandScore).toBe(1500);
	});
});

describe('createEmptyStatistics', () => {
	it('creates empty stats', () => {
		const stats = createEmptyStatistics();

		expect(stats.finalAnte).toBe(1);
		expect(stats.handsPlayed).toBe(0);
		expect(stats.bestHandType).toBeNull();
	});
});

describe('formatNumber', () => {
	it('formats numbers with commas', () => {
		expect(formatNumber(1234)).toBe('1,234');
		expect(formatNumber(1000000)).toBe('1,000,000');
		expect(formatNumber(42)).toBe('42');
	});
});

describe('formatHandType', () => {
	it('formats hand types nicely', () => {
		expect(formatHandType('HIGH_CARD')).toBe('High Card');
		expect(formatHandType('STRAIGHT_FLUSH')).toBe('Straight Flush');
		expect(formatHandType('ROYAL_FLUSH')).toBe('Royal Flush');
	});

	it('handles null', () => {
		expect(formatHandType(null)).toBe('None');
	});
});

describe('getVictoryRenderData', () => {
	it('includes victory title', () => {
		const state = createEndScreenState('victory', mockStats());
		const data = getVictoryRenderData(state, 80, 24);

		const titleLine = data.lines.find(l => l.text.includes('VICTORY'));
		expect(titleLine).toBeDefined();
		expect(titleLine?.color).toBe(VICTORY_COLOR);
	});

	it('includes stats', () => {
		const state = createEndScreenState('victory', mockStats());
		const data = getVictoryRenderData(state, 80, 24);

		const scoreLine = data.lines.find(l => l.text.includes('12,450'));
		expect(scoreLine).toBeDefined();
	});

	it('includes options', () => {
		const state = createEndScreenState('victory', mockStats());
		const data = getVictoryRenderData(state, 80, 24);

		expect(data.options.length).toBe(2);
		expect(data.options[0]?.label).toContain('NEW RUN');
		expect(data.options[1]?.label).toContain('MAIN MENU');
	});

	it('marks selected option', () => {
		const state: EndScreenState = {
			...createEndScreenState('victory', mockStats()),
			selectedIndex: 1,
		};
		const data = getVictoryRenderData(state, 80, 24);

		expect(data.options[0]?.selected).toBe(false);
		expect(data.options[1]?.selected).toBe(true);
	});
});

describe('getGameOverRenderData', () => {
	it('includes game over title', () => {
		const state = createEndScreenState('game_over', mockStats());
		const data = getGameOverRenderData(state, 80, 24);

		const titleLine = data.lines.find(l => l.text.includes('GAME OVER'));
		expect(titleLine).toBeDefined();
		expect(titleLine?.color).toBe(GAME_OVER_COLOR);
	});

	it('shows where player failed', () => {
		const state = createEndScreenState('game_over', mockStats());
		const data = getGameOverRenderData(state, 80, 24);

		const failLine = data.lines.find(l => l.text.includes('Ante 5'));
		expect(failLine).toBeDefined();
	});

	it('includes retry option', () => {
		const state = createEndScreenState('game_over', mockStats());
		const data = getGameOverRenderData(state, 80, 24);

		const retryOption = data.options.find(o => o.label.includes('RETRY'));
		expect(retryOption).toBeDefined();
	});
});

describe('getEndScreenRenderData', () => {
	it('returns victory data for victory type', () => {
		const state = createEndScreenState('victory', mockStats());
		const data = getEndScreenRenderData(state, 80, 24);

		const titleLine = data.lines.find(l => l.text.includes('VICTORY'));
		expect(titleLine).toBeDefined();
	});

	it('returns game over data for game_over type', () => {
		const state = createEndScreenState('game_over', mockStats());
		const data = getEndScreenRenderData(state, 80, 24);

		const titleLine = data.lines.find(l => l.text.includes('GAME OVER'));
		expect(titleLine).toBeDefined();
	});
});

describe('processEndScreenInput', () => {
	it('handles left input', () => {
		const state: EndScreenState = {
			...createEndScreenState('victory', mockStats()),
			selectedIndex: 1,
		};
		const [newState, action] = processEndScreenInput(state, { type: 'left' });

		expect(newState.selectedIndex).toBe(0);
		expect(action.type).toBe('none');
	});

	it('handles right input', () => {
		const state = createEndScreenState('victory', mockStats());
		const [newState, action] = processEndScreenInput(state, { type: 'right' });

		expect(newState.selectedIndex).toBe(1);
		expect(action.type).toBe('none');
	});

	it('handles select input', () => {
		const state = createEndScreenState('victory', mockStats());
		const [, action] = processEndScreenInput(state, { type: 'select' });

		expect(action.type).toBe('new_run');
	});

	it('handles select on game over', () => {
		const state = createEndScreenState('game_over', mockStats());
		const [, action] = processEndScreenInput(state, { type: 'select' });

		expect(action.type).toBe('retry');
	});
});

describe('keyToEndScreenInput', () => {
	it('maps arrow keys', () => {
		expect(keyToEndScreenInput('left')?.type).toBe('left');
		expect(keyToEndScreenInput('right')?.type).toBe('right');
	});

	it('maps vim keys', () => {
		expect(keyToEndScreenInput('h')?.type).toBe('left');
		expect(keyToEndScreenInput('l')?.type).toBe('right');
	});

	it('maps select keys', () => {
		expect(keyToEndScreenInput('return')?.type).toBe('select');
		expect(keyToEndScreenInput('enter')?.type).toBe('select');
		expect(keyToEndScreenInput('space')?.type).toBe('select');
	});

	it('returns null for unknown', () => {
		expect(keyToEndScreenInput('x')).toBeNull();
	});
});

describe('helpers', () => {
	it('isVictoryScreen returns true for victory', () => {
		const state = createEndScreenState('victory', mockStats());
		expect(isVictoryScreen(state)).toBe(true);
		expect(isGameOverScreen(state)).toBe(false);
	});

	it('isGameOverScreen returns true for game over', () => {
		const state = createEndScreenState('game_over', mockStats());
		expect(isVictoryScreen(state)).toBe(false);
		expect(isGameOverScreen(state)).toBe(true);
	});
});
