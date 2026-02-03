/**
 * Tests for score popup animation system
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	createPopupState,
	addPopup,
	createScoreSequence,
	createBonusPopup,
	updatePopups,
	clearPopups,
	getPopupRenderState,
	getRenderablePopups,
	hasActivePopups,
	getActivePopupCount,
	POPUP_COLORS,
} from './score-popup';

describe('createPopupState', () => {
	it('creates empty state', () => {
		const state = createPopupState();
		expect(state.popups).toHaveLength(0);
		expect(state.nextId).toBe(1);
	});
});

describe('addPopup', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('adds a popup to state', () => {
		let state = createPopupState();
		state = addPopup(state, '100', 'chips', 10, 20);

		expect(state.popups).toHaveLength(1);
		expect(state.popups[0]?.text).toBe('100');
		expect(state.popups[0]?.type).toBe('chips');
		expect(state.popups[0]?.x).toBe(10);
		expect(state.popups[0]?.y).toBe(20);
	});

	it('assigns correct color by type', () => {
		let state = createPopupState();
		state = addPopup(state, '100', 'chips', 0, 0);
		expect(state.popups[0]?.color).toBe(POPUP_COLORS.chips);

		state = addPopup(state, '×2', 'mult', 0, 0);
		expect(state.popups[1]?.color).toBe(POPUP_COLORS.mult);

		state = addPopup(state, '200', 'total', 0, 0);
		expect(state.popups[2]?.color).toBe(POPUP_COLORS.total);
	});

	it('allows color override', () => {
		let state = createPopupState();
		state = addPopup(state, '100', 'chips', 0, 0, { color: 0xff0000_ff });

		expect(state.popups[0]?.color).toBe(0xff0000_ff);
	});

	it('increments ID counter', () => {
		let state = createPopupState();
		state = addPopup(state, 'a', 'chips', 0, 0);
		state = addPopup(state, 'b', 'chips', 0, 0);

		expect(state.popups[0]?.id).toBe('popup-1');
		expect(state.popups[1]?.id).toBe('popup-2');
		expect(state.nextId).toBe(3);
	});
});

describe('createScoreSequence', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('creates all popup components', () => {
		let state = createPopupState();
		state = createScoreSequence(state, 10, 22, 2, 64, 'Pair', 40, 20);

		expect(state.popups).toHaveLength(5);

		// Check popup types/content
		expect(state.popups[0]?.text).toBe('Pair');
		expect(state.popups[0]?.type).toBe('hand_name');

		expect(state.popups[1]?.text).toBe('32'); // 10 + 22
		expect(state.popups[1]?.type).toBe('chips');

		expect(state.popups[2]?.text).toBe('×2');
		expect(state.popups[2]?.type).toBe('mult');

		expect(state.popups[3]?.text).toBe('=');

		expect(state.popups[4]?.text).toBe('64');
		expect(state.popups[4]?.type).toBe('total');
	});

	it('staggers popup delays', () => {
		let state = createPopupState();
		state = createScoreSequence(state, 10, 22, 2, 64, 'Pair', 40, 20);

		// Each popup should have increasing delay
		const delays = state.popups.map(p => p.delay);
		for (let i = 1; i < delays.length; i++) {
			expect(delays[i]).toBeGreaterThan(delays[i - 1]!);
		}
	});
});

describe('createBonusPopup', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('creates a bonus popup', () => {
		let state = createPopupState();
		state = createBonusPopup(state, '+$5', 10, 20);

		expect(state.popups).toHaveLength(1);
		expect(state.popups[0]?.type).toBe('bonus');
		expect(state.popups[0]?.color).toBe(POPUP_COLORS.bonus);
	});
});

describe('updatePopups', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keeps active popups', () => {
		let state = createPopupState();
		state = addPopup(state, '100', 'chips', 0, 0);

		// Advance time but not past duration
		vi.advanceTimersByTime(100);
		state = updatePopups(state);

		expect(state.popups).toHaveLength(1);
	});

	it('removes expired popups', () => {
		let state = createPopupState();
		state = addPopup(state, '100', 'chips', 0, 0, { duration: 500 });

		// Advance past duration
		vi.advanceTimersByTime(600);
		state = updatePopups(state);

		expect(state.popups).toHaveLength(0);
	});

	it('respects popup delay', () => {
		let state = createPopupState();
		state = addPopup(state, '100', 'chips', 0, 0, { delay: 200, duration: 500 });

		// Just past duration + delay
		vi.advanceTimersByTime(701);
		state = updatePopups(state);

		expect(state.popups).toHaveLength(0);
	});
});

describe('clearPopups', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('removes all popups', () => {
		let state = createPopupState();
		state = addPopup(state, 'a', 'chips', 0, 0);
		state = addPopup(state, 'b', 'chips', 0, 0);
		state = clearPopups(state);

		expect(state.popups).toHaveLength(0);
	});
});

describe('getPopupRenderState', () => {
	it('returns null before popup starts (delay)', () => {
		const popup = {
			id: 'test',
			text: '100',
			type: 'chips' as const,
			x: 10,
			y: 20,
			startY: 20,
			startTime: 1000,
			duration: 800,
			delay: 200,
			color: POPUP_COLORS.chips,
		};

		// At time 1100, delay is 200, so not started yet
		const result = getPopupRenderState(popup, 1100);
		expect(result).toBeNull();
	});

	it('returns null after popup ends', () => {
		const popup = {
			id: 'test',
			text: '100',
			type: 'chips' as const,
			x: 10,
			y: 20,
			startY: 20,
			startTime: 1000,
			duration: 800,
			delay: 0,
			color: POPUP_COLORS.chips,
		};

		// At time 2000, popup has ended (duration 800)
		const result = getPopupRenderState(popup, 2000);
		expect(result).toBeNull();
	});

	it('returns render state during animation', () => {
		const popup = {
			id: 'test',
			text: '100',
			type: 'chips' as const,
			x: 10,
			y: 20,
			startY: 20,
			startTime: 1000,
			duration: 800,
			delay: 0,
			color: POPUP_COLORS.chips,
		};

		// At time 1400, popup is 50% through
		const result = getPopupRenderState(popup, 1400);

		expect(result).not.toBeNull();
		expect(result!.text).toBe('100');
		expect(result!.x).toBe(10);
		expect(result!.y).toBeLessThan(20); // Should have risen
		expect(result!.opacity).toBe(1); // Not fading yet
	});

	it('fades opacity near end', () => {
		const popup = {
			id: 'test',
			text: '100',
			type: 'chips' as const,
			x: 10,
			y: 20,
			startY: 20,
			startTime: 1000,
			duration: 800,
			delay: 0,
			color: POPUP_COLORS.chips,
		};

		// At 90% through (720ms)
		const result = getPopupRenderState(popup, 1720);

		expect(result).not.toBeNull();
		expect(result!.opacity).toBeLessThan(1);
		expect(result!.opacity).toBeGreaterThan(0);
	});
});

describe('getRenderablePopups', () => {
	it('returns empty array for empty state', () => {
		const state = createPopupState();
		const renderables = getRenderablePopups(state, Date.now());

		expect(renderables).toHaveLength(0);
	});

	it('returns only visible popups', () => {
		const now = 1000;
		const state: ReturnType<typeof createPopupState> = {
			popups: [
				// Active popup
				{
					id: 'active',
					text: '100',
					type: 'chips',
					x: 10,
					y: 20,
					startY: 20,
					startTime: 500,
					duration: 800,
					delay: 0,
					color: POPUP_COLORS.chips,
				},
				// Not started yet (delay)
				{
					id: 'delayed',
					text: '200',
					type: 'chips',
					x: 10,
					y: 20,
					startY: 20,
					startTime: 900,
					duration: 800,
					delay: 500,
					color: POPUP_COLORS.chips,
				},
			],
			nextId: 3,
		};

		const renderables = getRenderablePopups(state, now);

		expect(renderables).toHaveLength(1);
		expect(renderables[0]?.text).toBe('100');
	});
});

describe('hasActivePopups', () => {
	it('returns false for empty state', () => {
		const state = createPopupState();
		expect(hasActivePopups(state, Date.now())).toBe(false);
	});

	it('returns true when popups are active', () => {
		const state: ReturnType<typeof createPopupState> = {
			popups: [{
				id: 'test',
				text: '100',
				type: 'chips',
				x: 0,
				y: 0,
				startY: 0,
				startTime: 0,
				duration: 1000,
				delay: 0,
				color: 0,
			}],
			nextId: 2,
		};

		expect(hasActivePopups(state, 500)).toBe(true);
	});

	it('returns false when all popups expired', () => {
		const state: ReturnType<typeof createPopupState> = {
			popups: [{
				id: 'test',
				text: '100',
				type: 'chips',
				x: 0,
				y: 0,
				startY: 0,
				startTime: 0,
				duration: 500,
				delay: 0,
				color: 0,
			}],
			nextId: 2,
		};

		expect(hasActivePopups(state, 1000)).toBe(false);
	});
});

describe('getActivePopupCount', () => {
	it('returns correct count', () => {
		const state: ReturnType<typeof createPopupState> = {
			popups: [
				{
					id: '1',
					text: '100',
					type: 'chips',
					x: 0,
					y: 0,
					startY: 0,
					startTime: 0,
					duration: 1000,
					delay: 0,
					color: 0,
				},
				{
					id: '2',
					text: '200',
					type: 'chips',
					x: 0,
					y: 0,
					startY: 0,
					startTime: 0,
					duration: 500,
					delay: 0,
					color: 0,
				},
			],
			nextId: 3,
		};

		// At time 300, both active
		expect(getActivePopupCount(state, 300)).toBe(2);

		// At time 700, only first active
		expect(getActivePopupCount(state, 700)).toBe(1);

		// At time 1200, none active
		expect(getActivePopupCount(state, 1200)).toBe(0);
	});
});
