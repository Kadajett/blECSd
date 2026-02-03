/**
 * Tests for mouse input handling
 */

import { describe, expect, it } from 'vitest';
import {
	parseMouseEvent,
	createMouseState,
	updateMouseState,
	findHitTarget,
	isPointInRect,
	clearClickedState,
	wasClicked,
	isHovered,
	createHitRect,
	sortHitTargets,
	getEnableMouseSequence,
	getDisableMouseSequence,
} from './mouse';

describe('parseMouseEvent', () => {
	describe('SGR format', () => {
		it('parses left button press', () => {
			const event = parseMouseEvent('\x1b[<0;10;5M');

			expect(event).not.toBeNull();
			expect(event!.type).toBe('down');
			expect(event!.button).toBe('left');
			expect(event!.x).toBe(9); // 0-based
			expect(event!.y).toBe(4);
		});

		it('parses left button release', () => {
			const event = parseMouseEvent('\x1b[<0;10;5m');

			expect(event).not.toBeNull();
			expect(event!.type).toBe('up');
			expect(event!.button).toBe('left');
		});

		it('parses right button press', () => {
			const event = parseMouseEvent('\x1b[<2;5;3M');

			expect(event).not.toBeNull();
			expect(event!.type).toBe('down');
			expect(event!.button).toBe('right');
		});

		it('parses middle button press', () => {
			const event = parseMouseEvent('\x1b[<1;5;3M');

			expect(event).not.toBeNull();
			expect(event!.button).toBe('middle');
		});

		it('parses mouse motion', () => {
			const event = parseMouseEvent('\x1b[<35;15;10M');

			expect(event).not.toBeNull();
			expect(event!.type).toBe('move');
		});

		it('parses mouse drag', () => {
			const event = parseMouseEvent('\x1b[<32;15;10M');

			expect(event).not.toBeNull();
			expect(event!.type).toBe('drag');
			expect(event!.button).toBe('left');
		});

		it('parses wheel up', () => {
			const event = parseMouseEvent('\x1b[<64;15;10M');

			expect(event).not.toBeNull();
			expect(event!.type).toBe('wheel_up');
		});

		it('parses wheel down', () => {
			const event = parseMouseEvent('\x1b[<65;15;10M');

			expect(event).not.toBeNull();
			expect(event!.type).toBe('wheel_down');
		});

		it('parses modifier keys', () => {
			const event = parseMouseEvent('\x1b[<20;5;3M'); // ctrl + left (16 + 4 for shift test)

			expect(event).not.toBeNull();
			expect(event!.ctrl).toBe(true);
		});
	});

	describe('X10 format', () => {
		it('parses left button press', () => {
			// Button 0 at position (10, 5): CB=32, CX=43 (10+33), CY=38 (5+33)
			const event = parseMouseEvent('\x1b[M +&');

			expect(event).not.toBeNull();
			expect(event!.type).toBe('down');
			expect(event!.button).toBe('left');
		});

		it('parses button release', () => {
			// Button 3 is release in X10
			const event = parseMouseEvent('\x1b[M#!$');

			expect(event).not.toBeNull();
			expect(event!.type).toBe('up');
		});
	});

	it('returns null for non-mouse input', () => {
		expect(parseMouseEvent('a')).toBeNull();
		expect(parseMouseEvent('\x1b[A')).toBeNull(); // Arrow key
	});
});

describe('createMouseState', () => {
	it('creates initial state', () => {
		const state = createMouseState();

		expect(state.position).toEqual({ x: 0, y: 0 });
		expect(state.buttonDown).toBe('none');
		expect(state.hoveredId).toBeNull();
		expect(state.clickedId).toBeNull();
		expect(state.isDragging).toBe(false);
	});
});

describe('updateMouseState', () => {
	const targets = [
		createHitRect('card-1', 0, 0, 10, 10, 1),
		createHitRect('card-2', 5, 5, 10, 10, 2), // Overlaps, higher z
	];
	const sortedTargets = sortHitTargets(targets);

	it('updates position on move', () => {
		const state = createMouseState();
		const event = { type: 'move' as const, button: 'none' as const, x: 15, y: 20, ctrl: false, shift: false, meta: false };

		const newState = updateMouseState(state, event, sortedTargets);

		expect(newState.position).toEqual({ x: 15, y: 20 });
	});

	it('sets hovered id when over target', () => {
		const state = createMouseState();
		const event = { type: 'move' as const, button: 'none' as const, x: 7, y: 7, ctrl: false, shift: false, meta: false };

		const newState = updateMouseState(state, event, sortedTargets);

		expect(newState.hoveredId).toBe('card-2'); // Higher z-index wins
	});

	it('tracks button down state', () => {
		const state = createMouseState();
		const event = { type: 'down' as const, button: 'left' as const, x: 5, y: 5, ctrl: false, shift: false, meta: false };

		const newState = updateMouseState(state, event, sortedTargets);

		expect(newState.buttonDown).toBe('left');
		expect(newState.dragStartPosition).toEqual({ x: 5, y: 5 });
	});

	it('detects click on button up', () => {
		let state = createMouseState();

		// Mouse down
		state = updateMouseState(state, {
			type: 'down', button: 'left', x: 7, y: 7,
			ctrl: false, shift: false, meta: false,
		}, sortedTargets);

		// Mouse up at same position
		state = updateMouseState(state, {
			type: 'up', button: 'left', x: 7, y: 7,
			ctrl: false, shift: false, meta: false,
		}, sortedTargets);

		expect(state.clickedId).toBe('card-2');
		expect(state.buttonDown).toBe('none');
	});

	it('does not click if dragged', () => {
		let state = createMouseState();

		// Mouse down
		state = updateMouseState(state, {
			type: 'down', button: 'left', x: 7, y: 7,
			ctrl: false, shift: false, meta: false,
		}, sortedTargets);

		// Drag
		state = updateMouseState(state, {
			type: 'drag', button: 'left', x: 10, y: 10,
			ctrl: false, shift: false, meta: false,
		}, sortedTargets);

		// Mouse up
		state = updateMouseState(state, {
			type: 'up', button: 'left', x: 10, y: 10,
			ctrl: false, shift: false, meta: false,
		}, sortedTargets);

		expect(state.clickedId).toBeNull();
	});
});

describe('findHitTarget', () => {
	const targets = [
		createHitRect('card-1', 0, 0, 10, 10, 1),
		createHitRect('card-2', 5, 5, 10, 10, 2),
	];
	const sorted = sortHitTargets(targets);

	it('finds target at position', () => {
		const target = findHitTarget(2, 2, sorted);
		expect(target?.id).toBe('card-1');
	});

	it('returns higher z-index target on overlap', () => {
		const target = findHitTarget(7, 7, sorted);
		expect(target?.id).toBe('card-2');
	});

	it('returns null for empty area', () => {
		const target = findHitTarget(100, 100, sorted);
		expect(target).toBeNull();
	});
});

describe('isPointInRect', () => {
	const rect = createHitRect('test', 10, 20, 30, 40, 0);

	it('returns true for point inside', () => {
		expect(isPointInRect(15, 25, rect)).toBe(true);
		expect(isPointInRect(10, 20, rect)).toBe(true);
	});

	it('returns false for point outside', () => {
		expect(isPointInRect(5, 25, rect)).toBe(false);
		expect(isPointInRect(50, 25, rect)).toBe(false);
		expect(isPointInRect(15, 100, rect)).toBe(false);
	});

	it('returns false for point on boundary (exclusive end)', () => {
		expect(isPointInRect(40, 25, rect)).toBe(false); // x + width
		expect(isPointInRect(15, 60, rect)).toBe(false); // y + height
	});
});

describe('clearClickedState', () => {
	it('clears clicked id', () => {
		const state = {
			...createMouseState(),
			clickedId: 'card-1',
		};
		const newState = clearClickedState(state);

		expect(newState.clickedId).toBeNull();
	});
});

describe('wasClicked', () => {
	it('returns true for matching id', () => {
		const state = { ...createMouseState(), clickedId: 'card-1' };
		expect(wasClicked(state, 'card-1')).toBe(true);
	});

	it('returns false for non-matching id', () => {
		const state = { ...createMouseState(), clickedId: 'card-1' };
		expect(wasClicked(state, 'card-2')).toBe(false);
	});
});

describe('isHovered', () => {
	it('returns true for matching id', () => {
		const state = { ...createMouseState(), hoveredId: 'card-1' };
		expect(isHovered(state, 'card-1')).toBe(true);
	});

	it('returns false for non-matching id', () => {
		const state = { ...createMouseState(), hoveredId: 'card-1' };
		expect(isHovered(state, 'card-2')).toBe(false);
	});
});

describe('createHitRect', () => {
	it('creates hit rect with all properties', () => {
		const rect = createHitRect('test', 10, 20, 30, 40, 5);

		expect(rect.id).toBe('test');
		expect(rect.x).toBe(10);
		expect(rect.y).toBe(20);
		expect(rect.width).toBe(30);
		expect(rect.height).toBe(40);
		expect(rect.zIndex).toBe(5);
	});

	it('defaults zIndex to 0', () => {
		const rect = createHitRect('test', 0, 0, 10, 10);
		expect(rect.zIndex).toBe(0);
	});
});

describe('sortHitTargets', () => {
	it('sorts by z-index descending', () => {
		const targets = [
			createHitRect('a', 0, 0, 10, 10, 1),
			createHitRect('b', 0, 0, 10, 10, 3),
			createHitRect('c', 0, 0, 10, 10, 2),
		];
		const sorted = sortHitTargets(targets);

		expect(sorted[0]?.id).toBe('b');
		expect(sorted[1]?.id).toBe('c');
		expect(sorted[2]?.id).toBe('a');
	});
});

describe('mouse mode sequences', () => {
	it('returns enable sequence', () => {
		const seq = getEnableMouseSequence();
		expect(seq).toContain('\x1b[?1000h');
		expect(seq).toContain('\x1b[?1006h');
	});

	it('returns disable sequence', () => {
		const seq = getDisableMouseSequence();
		expect(seq).toContain('\x1b[?1000l');
		expect(seq).toContain('\x1b[?1006l');
	});
});
