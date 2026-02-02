import { addEntity, createWorld } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDimensions } from '../components/dimensions';
import {
	focus,
	getFocusedEntity,
	makeFocusable,
	resetFocusState,
	setFocusable,
} from '../components/focusable';
import { KeyboardInput, MouseInput, setKeyboardInput, setMouseInput } from '../components/input';
import { isHovered, isPressed, setInteractive } from '../components/interactive';
import { setPosition } from '../components/position';
import type { KeyEvent } from '../terminal/keyParser';
import type { MouseEvent } from '../terminal/mouseParser';
import {
	captureMouseTo,
	clearEntityInput,
	clearEventQueue,
	getEventQueue,
	getInputEventBus,
	getInteractiveEntityAt,
	getMouseCaptureEntity,
	hitTest,
	inputState,
	inputSystem,
	isMouseCaptured,
	pointInEntity,
	queryInputReceivers,
	queueKeyEvent,
	queueMouseEvent,
	releaseMouse,
	resetInputState,
} from './inputSystem';

describe('inputSystem', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		resetInputState();
		resetFocusState();
	});

	afterEach(() => {
		resetInputState();
		resetFocusState();
	});

	describe('event queue', () => {
		it('queues key events', () => {
			const event: KeyEvent = {
				name: 'a',
				ctrl: false,
				meta: false,
				shift: false,
				raw: 'a',
			};

			queueKeyEvent(event);

			const queue = getEventQueue();
			expect(queue.length).toBe(1);
			expect(queue[0].type).toBe('key');
		});

		it('queues mouse events', () => {
			const event: MouseEvent = {
				x: 10,
				y: 5,
				button: 'left',
				action: 'press',
				raw: '',
			};

			queueMouseEvent(event);

			const queue = getEventQueue();
			expect(queue.length).toBe(1);
			expect(queue[0].type).toBe('mouse');
		});

		it('clears event queue', () => {
			queueKeyEvent({ name: 'a', ctrl: false, meta: false, shift: false, raw: 'a' });
			queueMouseEvent({ x: 0, y: 0, button: 'left', action: 'press', raw: '' });

			clearEventQueue();

			expect(getEventQueue().length).toBe(0);
		});

		it('processes events in order', () => {
			const events: string[] = [];
			const bus = getInputEventBus();

			bus.on('keypress', () => events.push('key'));
			bus.on('click', () => events.push('click'));

			// Create a focusable entity to receive key events
			const eid = addEntity(world);
			makeFocusable(world, eid, true);
			setInteractive(world, eid, { clickable: true });
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 100, 100);
			focus(world, eid);

			queueKeyEvent({ name: 'a', ctrl: false, meta: false, shift: false, raw: 'a' });
			queueMouseEvent({ x: 10, y: 5, button: 'left', action: 'press', raw: '' });
			queueMouseEvent({ x: 10, y: 5, button: 'left', action: 'release', raw: '' });

			inputSystem(world);

			expect(events).toEqual(['key', 'click']);
		});
	});

	describe('pointInEntity', () => {
		it('returns false for entity without Position', () => {
			const eid = addEntity(world);
			setDimensions(world, eid, 10, 10);

			expect(pointInEntity(world, eid, 5, 5)).toBe(false);
		});

		it('returns false for entity without Dimensions', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);

			expect(pointInEntity(world, eid, 5, 5)).toBe(false);
		});

		it('returns true for point inside entity', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10);
			setDimensions(world, eid, 20, 20);

			expect(pointInEntity(world, eid, 15, 15)).toBe(true);
			expect(pointInEntity(world, eid, 10, 10)).toBe(true); // Top-left corner
			expect(pointInEntity(world, eid, 29, 29)).toBe(true); // Just inside bottom-right
		});

		it('returns false for point outside entity', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10);
			setDimensions(world, eid, 20, 20);

			expect(pointInEntity(world, eid, 5, 5)).toBe(false); // Before top-left
			expect(pointInEntity(world, eid, 30, 30)).toBe(false); // At bottom-right (exclusive)
			expect(pointInEntity(world, eid, 35, 35)).toBe(false); // After bottom-right
		});

		it('returns false for zero-size entity', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10);
			setDimensions(world, eid, 0, 0);

			expect(pointInEntity(world, eid, 10, 10)).toBe(false);
		});
	});

	describe('hitTest', () => {
		it('returns empty array when no entities hit', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 100, 100);
			setDimensions(world, eid, 10, 10);

			const hits = hitTest(world, 0, 0);
			expect(hits).toEqual([]);
		});

		it('returns hit entity with local coordinates', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 10, 10, 5);
			setDimensions(world, eid, 20, 20);

			const hits = hitTest(world, 15, 15);

			expect(hits.length).toBe(1);
			expect(hits[0].entity).toBe(eid);
			expect(hits[0].localX).toBe(5);
			expect(hits[0].localY).toBe(5);
			expect(hits[0].zIndex).toBe(5);
		});

		it('returns multiple overlapping entities sorted by z-index', () => {
			const eid1 = addEntity(world);
			setPosition(world, eid1, 0, 0, 1);
			setDimensions(world, eid1, 50, 50);

			const eid2 = addEntity(world);
			setPosition(world, eid2, 0, 0, 10);
			setDimensions(world, eid2, 50, 50);

			const eid3 = addEntity(world);
			setPosition(world, eid3, 0, 0, 5);
			setDimensions(world, eid3, 50, 50);

			const hits = hitTest(world, 25, 25);

			expect(hits.length).toBe(3);
			expect(hits[0].entity).toBe(eid2); // z=10 (highest)
			expect(hits[1].entity).toBe(eid3); // z=5
			expect(hits[2].entity).toBe(eid1); // z=1 (lowest)
		});
	});

	describe('getInteractiveEntityAt', () => {
		it('returns null when no interactive entity at point', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 50, 50);
			// Not interactive

			expect(getInteractiveEntityAt(world, 25, 25)).toBeNull();
		});

		it('returns topmost interactive entity', () => {
			const eid1 = addEntity(world);
			setPosition(world, eid1, 0, 0, 1);
			setDimensions(world, eid1, 50, 50);
			setInteractive(world, eid1, { clickable: true });

			const eid2 = addEntity(world);
			setPosition(world, eid2, 0, 0, 10);
			setDimensions(world, eid2, 50, 50);
			setInteractive(world, eid2, { clickable: true });

			expect(getInteractiveEntityAt(world, 25, 25)).toBe(eid2);
		});

		it('skips non-interactive entities', () => {
			const eid1 = addEntity(world);
			setPosition(world, eid1, 0, 0, 1);
			setDimensions(world, eid1, 50, 50);
			setInteractive(world, eid1, { clickable: true });

			const eid2 = addEntity(world);
			setPosition(world, eid2, 0, 0, 10);
			setDimensions(world, eid2, 50, 50);
			// eid2 not interactive

			expect(getInteractiveEntityAt(world, 25, 25)).toBe(eid1);
		});
	});

	describe('mouse capture', () => {
		it('captures mouse to entity', () => {
			const eid = addEntity(world);

			captureMouseTo(eid);

			expect(isMouseCaptured()).toBe(true);
			expect(getMouseCaptureEntity()).toBe(eid);
		});

		it('releases mouse capture', () => {
			const eid = addEntity(world);
			captureMouseTo(eid);

			releaseMouse();

			expect(isMouseCaptured()).toBe(false);
			expect(getMouseCaptureEntity()).toBeNull();
		});

		it('directs events to captured entity', () => {
			const eid1 = addEntity(world);
			setPosition(world, eid1, 0, 0);
			setDimensions(world, eid1, 50, 50);
			setInteractive(world, eid1, { clickable: true });
			setMouseInput(world, eid1, {});

			const eid2 = addEntity(world);
			setPosition(world, eid2, 60, 60);
			setDimensions(world, eid2, 50, 50);
			setInteractive(world, eid2, { clickable: true });
			setMouseInput(world, eid2, {});

			// Capture to eid1
			captureMouseTo(eid1);

			// Click at eid2's position
			queueMouseEvent({ x: 70, y: 70, button: 'left', action: 'press', raw: '' });
			inputSystem(world);

			// eid1 should receive the event
			expect(MouseInput.pressed[eid1]).toBe(1);
			// eid2 should not
			expect(MouseInput.pressed[eid2]).toBe(0);
		});
	});

	describe('hover state', () => {
		it('sets hovered when mouse enters entity', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 50, 50);
			setInteractive(world, eid, { hoverable: true });

			queueMouseEvent({ x: 25, y: 25, button: 'none', action: 'move', raw: '' });
			inputSystem(world);

			expect(isHovered(world, eid)).toBe(true);
		});

		it('clears hovered when mouse leaves entity', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 50, 50);
			setInteractive(world, eid, { hoverable: true });

			// Enter
			queueMouseEvent({ x: 25, y: 25, button: 'none', action: 'move', raw: '' });
			inputSystem(world);
			expect(isHovered(world, eid)).toBe(true);

			// Leave
			queueMouseEvent({ x: 100, y: 100, button: 'none', action: 'move', raw: '' });
			inputSystem(world);
			expect(isHovered(world, eid)).toBe(false);
		});
	});

	describe('pressed state', () => {
		it('sets pressed on mouse down', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 50, 50);
			setInteractive(world, eid, { clickable: true });

			queueMouseEvent({ x: 25, y: 25, button: 'left', action: 'press', raw: '' });
			inputSystem(world);

			expect(isPressed(world, eid)).toBe(true);
		});

		it('clears pressed on mouse up', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 50, 50);
			setInteractive(world, eid, { clickable: true });

			queueMouseEvent({ x: 25, y: 25, button: 'left', action: 'press', raw: '' });
			inputSystem(world);

			queueMouseEvent({ x: 25, y: 25, button: 'left', action: 'release', raw: '' });
			inputSystem(world);

			expect(isPressed(world, eid)).toBe(false);
		});
	});

	describe('focus management', () => {
		it('focuses entity on click', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 50, 50);
			setInteractive(world, eid, { clickable: true });
			makeFocusable(world, eid, true);

			queueMouseEvent({ x: 25, y: 25, button: 'left', action: 'press', raw: '' });
			inputSystem(world);

			expect(getFocusedEntity()).toBe(eid);
		});

		it('navigates focus with Tab', () => {
			const eid1 = addEntity(world);
			setFocusable(world, eid1, { focusable: true, tabIndex: 0 });

			const eid2 = addEntity(world);
			setFocusable(world, eid2, { focusable: true, tabIndex: 1 });

			focus(world, eid1);
			expect(getFocusedEntity()).toBe(eid1);

			queueKeyEvent({ name: 'tab', ctrl: false, meta: false, shift: false, raw: '\t' });
			inputSystem(world);

			expect(getFocusedEntity()).toBe(eid2);
		});

		it('navigates focus backwards with Shift+Tab', () => {
			const eid1 = addEntity(world);
			setFocusable(world, eid1, { focusable: true, tabIndex: 0 });

			const eid2 = addEntity(world);
			setFocusable(world, eid2, { focusable: true, tabIndex: 1 });

			focus(world, eid2);
			expect(getFocusedEntity()).toBe(eid2);

			queueKeyEvent({ name: 'tab', ctrl: false, meta: false, shift: true, raw: '\t' });
			inputSystem(world);

			expect(getFocusedEntity()).toBe(eid1);
		});
	});

	describe('keyboard input', () => {
		it('updates KeyboardInput component on focused entity', () => {
			const eid = addEntity(world);
			makeFocusable(world, eid, true);
			setKeyboardInput(world, eid, {});
			focus(world, eid);

			queueKeyEvent({ name: 'a', ctrl: true, meta: false, shift: false, raw: 'a' });
			inputSystem(world);

			expect(KeyboardInput.lastKeyCode[eid]).toBe(97); // 'a' char code
		});
	});

	describe('event bus', () => {
		it('emits click event', () => {
			const handler = vi.fn();
			getInputEventBus().on('click', handler);

			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 50, 50);
			setInteractive(world, eid, { clickable: true });

			queueMouseEvent({ x: 25, y: 25, button: 'left', action: 'press', raw: '' });
			queueMouseEvent({ x: 25, y: 25, button: 'left', action: 'release', raw: '' });
			inputSystem(world);

			expect(handler).toHaveBeenCalledWith({ x: 25, y: 25, button: 1 });
		});

		it('emits mousemove event', () => {
			const handler = vi.fn();
			getInputEventBus().on('mousemove', handler);

			queueMouseEvent({ x: 10, y: 20, button: 'none', action: 'move', raw: '' });
			inputSystem(world);

			expect(handler).toHaveBeenCalledWith({ x: 10, y: 20 });
		});

		it('emits scroll event', () => {
			const handler = vi.fn();
			getInputEventBus().on('scroll', handler);

			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setDimensions(world, eid, 50, 50);
			setInteractive(world, eid, { clickable: true });

			queueMouseEvent({ x: 25, y: 25, button: 'wheelup', action: 'wheel', raw: '' });
			inputSystem(world);

			expect(handler).toHaveBeenCalledWith({ direction: 'up', amount: 1 });
		});
	});

	describe('clearEntityInput', () => {
		it('clears keyboard input', () => {
			const eid = addEntity(world);
			setKeyboardInput(world, eid, {
				lastKeyCode: 65,
				ctrl: true,
			});

			clearEntityInput(world, eid);

			expect(KeyboardInput.lastKeyCode[eid]).toBe(0);
		});

		it('clears mouse input', () => {
			const eid = addEntity(world);
			setMouseInput(world, eid, {
				button: 1,
				pressed: true,
			});

			clearEntityInput(world, eid);

			expect(MouseInput.button[eid]).toBe(0);
			expect(MouseInput.pressed[eid]).toBe(0);
		});
	});

	describe('queryInputReceivers', () => {
		it('returns entities with Interactive component', () => {
			const eid = addEntity(world);
			setInteractive(world, eid, { clickable: true });

			const receivers = queryInputReceivers(world);
			expect(receivers).toContain(eid);
		});

		it('returns entities with Focusable component', () => {
			const eid = addEntity(world);
			makeFocusable(world, eid, true);

			const receivers = queryInputReceivers(world);
			expect(receivers).toContain(eid);
		});

		it('deduplicates entities with both components', () => {
			const eid = addEntity(world);
			setInteractive(world, eid, { clickable: true });
			makeFocusable(world, eid, true);

			const receivers = queryInputReceivers(world);
			const count = receivers.filter((id) => id === eid).length;
			expect(count).toBe(1);
		});
	});

	describe('resetInputState', () => {
		it('clears all state', () => {
			queueKeyEvent({ name: 'a', ctrl: false, meta: false, shift: false, raw: 'a' });
			captureMouseTo(1);
			inputState.lastMouseX = 100;
			inputState.lastMouseY = 100;
			inputState.lastHoveredEntity = 5;

			resetInputState();

			expect(getEventQueue().length).toBe(0);
			expect(isMouseCaptured()).toBe(false);
			expect(inputState.lastMouseX).toBe(0);
			expect(inputState.lastMouseY).toBe(0);
			expect(inputState.lastHoveredEntity).toBeNull();
		});
	});
});
