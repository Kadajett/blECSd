/**
 * Tests for help overlay and key bindings reference
 */

import { describe, expect, it } from 'vitest';
import {
	createHelpOverlayState,
	showHelpOverlay,
	hideHelpOverlay,
	toggleHelpOverlay,
	showPokerHandReference,
	togglePokerHandReference,
	getKeyBindings,
	getAllBindings,
	getPokerHandInfo,
	formatPokerHand,
	calculateBoxDimensions,
	getHelpRenderData,
	getPokerHandsRenderData,
	createBoxLines,
	createSeparatorLine,
	isHelpKey,
	isPokerHandsKey,
	isDismissKey,
	isHelpVisible,
	isShowingPokerHands,
	getOverlayTitle,
} from './help-overlay';
import type { HelpOverlayState } from './help-overlay';

describe('createHelpOverlayState', () => {
	it('creates initial state', () => {
		const state = createHelpOverlayState();

		expect(state.visible).toBe(false);
		expect(state.context).toBe('playing');
		expect(state.showingPokerHands).toBe(false);
	});
});

describe('showHelpOverlay', () => {
	it('shows overlay with context', () => {
		const state = createHelpOverlayState();
		const newState = showHelpOverlay(state, 'shop');

		expect(newState.visible).toBe(true);
		expect(newState.context).toBe('shop');
		expect(newState.showingPokerHands).toBe(false);
	});
});

describe('hideHelpOverlay', () => {
	it('hides overlay', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: true,
		};
		const newState = hideHelpOverlay(state);

		expect(newState.visible).toBe(false);
		expect(newState.showingPokerHands).toBe(false);
	});
});

describe('toggleHelpOverlay', () => {
	it('shows when hidden', () => {
		const state = createHelpOverlayState();
		const newState = toggleHelpOverlay(state, 'menu');

		expect(newState.visible).toBe(true);
		expect(newState.context).toBe('menu');
	});

	it('hides when visible', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: false,
		};
		const newState = toggleHelpOverlay(state, 'playing');

		expect(newState.visible).toBe(false);
	});
});

describe('showPokerHandReference', () => {
	it('shows poker hands', () => {
		const state = createHelpOverlayState();
		const newState = showPokerHandReference(state);

		expect(newState.visible).toBe(true);
		expect(newState.showingPokerHands).toBe(true);
	});
});

describe('togglePokerHandReference', () => {
	it('shows when hidden', () => {
		const state = createHelpOverlayState();
		const newState = togglePokerHandReference(state);

		expect(newState.visible).toBe(true);
		expect(newState.showingPokerHands).toBe(true);
	});

	it('hides when showing poker hands', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: true,
		};
		const newState = togglePokerHandReference(state);

		expect(newState.visible).toBe(false);
	});
});

describe('getKeyBindings', () => {
	it('returns playing bindings', () => {
		const bindings = getKeyBindings('playing');

		expect(bindings.length).toBeGreaterThan(0);
		expect(bindings.some(s => s.title === 'CARD SELECTION')).toBe(true);
	});

	it('returns menu bindings', () => {
		const bindings = getKeyBindings('menu');

		expect(bindings.length).toBeGreaterThan(0);
		expect(bindings.some(s => s.title === 'NAVIGATION')).toBe(true);
	});

	it('returns shop bindings', () => {
		const bindings = getKeyBindings('shop');

		expect(bindings.length).toBeGreaterThan(0);
		expect(bindings.some(s => s.title === 'SHOP')).toBe(true);
	});

	it('returns pack opening bindings', () => {
		const bindings = getKeyBindings('pack_opening');

		expect(bindings.length).toBeGreaterThan(0);
		expect(bindings.some(s => s.title === 'PACK OPENING')).toBe(true);
	});
});

describe('getAllBindings', () => {
	it('returns flat list of bindings', () => {
		const bindings = getAllBindings('playing');

		expect(bindings.length).toBeGreaterThan(0);
		expect(bindings.every(b => b.keys.length > 0)).toBe(true);
		expect(bindings.every(b => b.description.length > 0)).toBe(true);
	});
});

describe('getPokerHandInfo', () => {
	it('returns all hand types', () => {
		const hands = getPokerHandInfo();

		expect(hands.length).toBe(10);
		expect(hands[0]?.type).toBe('HIGH_CARD');
		expect(hands[9]?.type).toBe('ROYAL_FLUSH');
	});

	it('includes base chips and mult', () => {
		const hands = getPokerHandInfo();
		const flush = hands.find(h => h.type === 'FLUSH');

		expect(flush?.baseChips).toBeGreaterThan(0);
		expect(flush?.baseMult).toBeGreaterThan(0);
	});

	it('applies hand levels', () => {
		const hands = getPokerHandInfo({ PAIR: 3 });
		const pair = hands.find(h => h.type === 'PAIR');

		expect(pair?.level).toBe(3);
	});

	it('defaults to level 1', () => {
		const hands = getPokerHandInfo();

		expect(hands.every(h => h.level === 1)).toBe(true);
	});
});

describe('formatPokerHand', () => {
	it('formats hand without level', () => {
		const info = {
			name: 'Pair',
			type: 'PAIR' as const,
			baseChips: 10,
			baseMult: 2,
			level: 1,
			description: 'Two cards of same rank',
		};
		const formatted = formatPokerHand(info);

		expect(formatted).toBe('Pair: 10 chips × 2 mult');
	});

	it('includes level when > 1', () => {
		const info = {
			name: 'Pair',
			type: 'PAIR' as const,
			baseChips: 10,
			baseMult: 2,
			level: 3,
			description: 'Two cards of same rank',
		};
		const formatted = formatPokerHand(info);

		expect(formatted).toContain('Lvl 3');
	});
});

describe('calculateBoxDimensions', () => {
	it('calculates dimensions based on content', () => {
		const sections = [
			{
				title: 'TEST',
				bindings: [
					{ keys: ['A'], description: 'Action A' },
					{ keys: ['B'], description: 'Action B' },
				],
			},
		];
		const { width, height } = calculateBoxDimensions(sections);

		expect(width).toBeGreaterThanOrEqual(40);
		expect(height).toBeGreaterThan(0);
	});
});

describe('getHelpRenderData', () => {
	it('returns render data', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: false,
		};
		const data = getHelpRenderData(state, 80, 24);

		expect(data.title).toBe('CONTROLS');
		expect(data.sections.length).toBeGreaterThan(0);
		expect(data.footer).toContain('key');
		expect(data.boxWidth).toBeGreaterThan(0);
		expect(data.boxHeight).toBeGreaterThan(0);
	});

	it('centers box on screen', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: false,
		};
		const data = getHelpRenderData(state, 80, 24);

		expect(data.boxX).toBeGreaterThan(0);
		expect(data.boxY).toBeGreaterThan(0);
	});
});

describe('getPokerHandsRenderData', () => {
	it('returns render data', () => {
		const data = getPokerHandsRenderData({}, 80, 24);

		expect(data.title).toBe('POKER HANDS');
		expect(data.hands.length).toBe(10);
		expect(data.footer).toContain('key');
	});

	it('applies hand levels', () => {
		const data = getPokerHandsRenderData({ FLUSH: 2 }, 80, 24);
		const flush = data.hands.find(h => h.type === 'FLUSH');

		expect(flush?.level).toBe(2);
	});
});

describe('createBoxLines', () => {
	it('creates box with correct dimensions', () => {
		const lines = createBoxLines(5, 3, 20, 10);

		expect(lines.length).toBe(10);
		expect(lines[0]?.text.startsWith('┌')).toBe(true);
		expect(lines[0]?.text.endsWith('┐')).toBe(true);
		expect(lines[9]?.text.startsWith('└')).toBe(true);
		expect(lines[9]?.text.endsWith('┘')).toBe(true);
	});

	it('positions lines correctly', () => {
		const lines = createBoxLines(5, 3, 20, 10);

		expect(lines[0]?.x).toBe(5);
		expect(lines[0]?.y).toBe(3);
		expect(lines[9]?.y).toBe(12);
	});
});

describe('createSeparatorLine', () => {
	it('creates separator line', () => {
		const line = createSeparatorLine(5, 10, 20);

		expect(line.text.startsWith('├')).toBe(true);
		expect(line.text.endsWith('┤')).toBe(true);
		expect(line.x).toBe(5);
		expect(line.y).toBe(10);
	});
});

describe('isHelpKey', () => {
	it('returns true for help keys', () => {
		expect(isHelpKey('?')).toBe(true);
		expect(isHelpKey('f1')).toBe(true);
	});

	it('returns false for other keys', () => {
		expect(isHelpKey('a')).toBe(false);
		expect(isHelpKey('h')).toBe(false);
	});
});

describe('isPokerHandsKey', () => {
	it('returns true for h key', () => {
		expect(isPokerHandsKey('h')).toBe(true);
		expect(isPokerHandsKey('H')).toBe(true);
	});

	it('returns false for other keys', () => {
		expect(isPokerHandsKey('?')).toBe(false);
		expect(isPokerHandsKey('a')).toBe(false);
	});
});

describe('isDismissKey', () => {
	it('returns true for most keys', () => {
		expect(isDismissKey('a')).toBe(true);
		expect(isDismissKey('escape')).toBe(true);
		expect(isDismissKey('return')).toBe(true);
	});

	it('returns false for help key', () => {
		expect(isDismissKey('?')).toBe(false);
		expect(isDismissKey('f1')).toBe(false);
	});
});

describe('isHelpVisible', () => {
	it('returns true when visible', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: false,
		};
		expect(isHelpVisible(state)).toBe(true);
	});

	it('returns false when hidden', () => {
		const state = createHelpOverlayState();
		expect(isHelpVisible(state)).toBe(false);
	});
});

describe('isShowingPokerHands', () => {
	it('returns true when showing poker hands', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: true,
		};
		expect(isShowingPokerHands(state)).toBe(true);
	});

	it('returns false when not showing', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: false,
		};
		expect(isShowingPokerHands(state)).toBe(false);
	});

	it('returns false when hidden', () => {
		const state = createHelpOverlayState();
		expect(isShowingPokerHands(state)).toBe(false);
	});
});

describe('getOverlayTitle', () => {
	it('returns CONTROLS for help', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: false,
		};
		expect(getOverlayTitle(state)).toBe('CONTROLS');
	});

	it('returns POKER HANDS for poker hands', () => {
		const state: HelpOverlayState = {
			visible: true,
			context: 'playing',
			showingPokerHands: true,
		};
		expect(getOverlayTitle(state)).toBe('POKER HANDS');
	});
});
