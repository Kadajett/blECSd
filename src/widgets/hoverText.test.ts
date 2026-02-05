/**
 * Hover Text (Tooltip) System tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';
import {
	clearAllHoverText,
	clearHoverText,
	createHoverTextManager,
	DEFAULT_CURSOR_OFFSET_X,
	DEFAULT_CURSOR_OFFSET_Y,
	DEFAULT_HIDE_DELAY,
	DEFAULT_HOVER_DELAY,
	DEFAULT_TOOLTIP_BG,
	DEFAULT_TOOLTIP_FG,
	getHoverText,
	getHoverTextCount,
	hasHoverText,
	resetHoverTextStore,
	setHoverText,
} from './hoverText';

describe('hoverText', () => {
	let world: World;
	let entity: Entity;
	let entity2: Entity;

	beforeEach(() => {
		world = createWorld() as World;
		entity = addEntity(world) as Entity;
		entity2 = addEntity(world) as Entity;
		resetHoverTextStore();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('setHoverText / getHoverText', () => {
		it('should set hover text from string', () => {
			setHoverText(entity, 'Hello World');

			const config = getHoverText(entity);
			expect(config?.text).toBe('Hello World');
		});

		it('should set hover text from config object', () => {
			setHoverText(entity, {
				text: 'Custom tooltip',
				delay: 200,
				style: { fg: 0xffff0000 },
			});

			const config = getHoverText(entity);
			expect(config?.text).toBe('Custom tooltip');
			expect(config?.delay).toBe(200);
			expect(config?.style?.fg).toBe(0xffff0000);
		});

		it('should return undefined for entity without hover text', () => {
			expect(getHoverText(entity)).toBeUndefined();
		});
	});

	describe('hasHoverText', () => {
		it('should return false for entity without hover text', () => {
			expect(hasHoverText(entity)).toBe(false);
		});

		it('should return true for entity with hover text', () => {
			setHoverText(entity, 'Test');
			expect(hasHoverText(entity)).toBe(true);
		});
	});

	describe('clearHoverText', () => {
		it('should remove hover text from entity', () => {
			setHoverText(entity, 'Test');
			clearHoverText(entity);

			expect(hasHoverText(entity)).toBe(false);
		});
	});

	describe('clearAllHoverText', () => {
		it('should remove all hover text', () => {
			setHoverText(entity, 'Test 1');
			setHoverText(entity2, 'Test 2');

			clearAllHoverText();

			expect(hasHoverText(entity)).toBe(false);
			expect(hasHoverText(entity2)).toBe(false);
		});
	});

	describe('getHoverTextCount', () => {
		it('should return 0 when no hover text', () => {
			expect(getHoverTextCount()).toBe(0);
		});

		it('should return correct count', () => {
			setHoverText(entity, 'Test 1');
			expect(getHoverTextCount()).toBe(1);

			setHoverText(entity2, 'Test 2');
			expect(getHoverTextCount()).toBe(2);
		});
	});

	describe('createHoverTextManager', () => {
		it('should create a manager with default config', () => {
			const manager = createHoverTextManager();

			expect(manager).toBeDefined();
			expect(manager.isVisible()).toBe(false);
		});

		it('should create a manager with custom config', () => {
			const manager = createHoverTextManager({
				showDelay: 100,
				hideDelay: 50,
				offsetX: 5,
				offsetY: 3,
				screenWidth: 100,
				screenHeight: 50,
			});

			expect(manager).toBeDefined();
		});
	});

	describe('HoverTextManager', () => {
		let manager: ReturnType<typeof createHoverTextManager>;

		beforeEach(() => {
			manager = createHoverTextManager({
				screenWidth: 80,
				screenHeight: 24,
			});
		});

		describe('setHoverText / getHoverText', () => {
			it('should store hover text in manager', () => {
				manager.setHoverText(entity, 'Manager tooltip');

				expect(manager.hasHoverText(entity)).toBe(true);
				expect(manager.getHoverText(entity)?.text).toBe('Manager tooltip');
			});
		});

		describe('clearHoverText', () => {
			it('should clear hover text', () => {
				manager.setHoverText(entity, 'Test');
				manager.clearHoverText(entity);

				expect(manager.hasHoverText(entity)).toBe(false);
			});

			it('should hide tooltip if showing for cleared entity', () => {
				manager.setHoverText(entity, 'Test');
				manager.showNow(entity, 10, 10);

				expect(manager.isVisible()).toBe(true);

				manager.clearHoverText(entity);

				expect(manager.isVisible()).toBe(false);
			});
		});

		describe('showNow / hideNow', () => {
			it('should show tooltip immediately', () => {
				manager.setHoverText(entity, 'Immediate');
				manager.showNow(entity, 10, 10);

				expect(manager.isVisible()).toBe(true);
				const state = manager.getState();
				expect(state.text).toBe('Immediate');
				expect(state.sourceEntity).toBe(entity);
			});

			it('should hide tooltip immediately', () => {
				manager.setHoverText(entity, 'Test');
				manager.showNow(entity, 10, 10);
				manager.hideNow();

				expect(manager.isVisible()).toBe(false);
			});

			it('should not show if entity has no hover text', () => {
				manager.showNow(entity, 10, 10);

				expect(manager.isVisible()).toBe(false);
			});
		});

		describe('updateMouse', () => {
			it('should start hover timer when mouse enters entity with hover text', () => {
				manager.setHoverText(entity, 'Test');
				manager.updateMouse(10, 10, entity);

				const state = manager.getState();
				expect(state.hoverStartTime).not.toBeNull();
			});

			it('should not start timer for entity without hover text', () => {
				manager.updateMouse(10, 10, entity);

				const state = manager.getState();
				expect(state.hoverStartTime).toBeNull();
			});
		});

		describe('update (timing)', () => {
			it('should show tooltip after delay', () => {
				manager.setHoverText(entity, 'Delayed');
				manager.updateMouse(10, 10, entity);

				expect(manager.isVisible()).toBe(false);

				// Advance time past the delay
				vi.advanceTimersByTime(DEFAULT_HOVER_DELAY + 10);
				manager.update(DEFAULT_HOVER_DELAY + 10);

				expect(manager.isVisible()).toBe(true);
			});

			it('should hide tooltip after hide delay when mouse leaves', () => {
				manager.setHoverText(entity, 'Test');
				// First, update mouse to be over entity
				manager.updateMouse(10, 10, entity);
				manager.showNow(entity, 10, 10);

				expect(manager.isVisible()).toBe(true);

				// Mouse leaves (hoveredEntity = null)
				manager.updateMouse(10, 10, null);

				expect(manager.isVisible()).toBe(true);

				// Advance time past the hide delay
				vi.advanceTimersByTime(DEFAULT_HIDE_DELAY + 10);
				manager.update(DEFAULT_HIDE_DELAY + 10);

				expect(manager.isVisible()).toBe(false);
			});

			it('should use custom delay from config', () => {
				const customManager = createHoverTextManager({
					showDelay: 100,
					screenWidth: 80,
					screenHeight: 24,
				});

				customManager.setHoverText(entity, 'Quick');
				customManager.updateMouse(10, 10, entity);

				// Not visible yet
				vi.advanceTimersByTime(50);
				customManager.update(50);
				expect(customManager.isVisible()).toBe(false);

				// Now visible after full delay
				vi.advanceTimersByTime(60);
				customManager.update(60);
				expect(customManager.isVisible()).toBe(true);
			});

			it('should use entity-specific delay', () => {
				manager.setHoverText(entity, { text: 'Custom delay', delay: 100 });
				manager.updateMouse(10, 10, entity);

				vi.advanceTimersByTime(50);
				manager.update(50);
				expect(manager.isVisible()).toBe(false);

				vi.advanceTimersByTime(60);
				manager.update(60);
				expect(manager.isVisible()).toBe(true);
			});
		});

		describe('getRenderData', () => {
			it('should return null when not visible', () => {
				expect(manager.getRenderData()).toBeNull();
			});

			it('should return render data when visible', () => {
				manager.setHoverText(entity, 'Test tooltip');
				manager.showNow(entity, 10, 10);

				const data = manager.getRenderData();
				expect(data).not.toBeNull();
				expect(data?.text).toBe('Test tooltip');
				expect(data?.lines).toEqual(['Test tooltip']);
				expect(data?.style.fg).toBe(DEFAULT_TOOLTIP_FG);
				expect(data?.style.bg).toBe(DEFAULT_TOOLTIP_BG);
			});

			it('should calculate correct dimensions', () => {
				manager.setHoverText(entity, 'Line 1\nLine 2');
				manager.showNow(entity, 10, 10);

				const data = manager.getRenderData();
				expect(data?.lines.length).toBe(2);
				// Width = max line length + padding * 2
				expect(data?.width).toBe(6 + 2); // "Line 1" is 6 chars, padding 1
				// Height = lines + padding * 2
				expect(data?.height).toBe(2 + 2);
			});

			it('should use custom style', () => {
				manager.setHoverText(entity, {
					text: 'Styled',
					style: { fg: 0xff00ff00, bg: 0xff0000ff, padding: 2 },
				});
				manager.showNow(entity, 10, 10);

				const data = manager.getRenderData();
				expect(data?.style.fg).toBe(0xff00ff00);
				expect(data?.style.bg).toBe(0xff0000ff);
				expect(data?.style.padding).toBe(2);
			});
		});

		describe('positioning', () => {
			it('should position tooltip with offset from cursor', () => {
				manager.setHoverText(entity, 'Test');
				manager.showNow(entity, 10, 10);

				const data = manager.getRenderData();
				expect(data?.x).toBe(10 + DEFAULT_CURSOR_OFFSET_X);
				expect(data?.y).toBe(10 + DEFAULT_CURSOR_OFFSET_Y);
			});

			it('should clamp position to screen bounds', () => {
				manager.setHoverText(entity, 'Test tooltip');
				// Position near right edge
				manager.showNow(entity, 75, 10);

				const data = manager.getRenderData();
				// Should be clamped to fit within screen
				expect(data?.x).toBeLessThanOrEqual(80 - (data?.width ?? 0));
			});

			it('should clamp position to top-left', () => {
				const customManager = createHoverTextManager({
					screenWidth: 80,
					screenHeight: 24,
					offsetX: -100, // Would go negative
					offsetY: -100,
				});
				customManager.setHoverText(entity, 'Test');
				customManager.showNow(entity, 5, 5);

				const data = customManager.getRenderData();
				expect(data?.x).toBeGreaterThanOrEqual(0);
				expect(data?.y).toBeGreaterThanOrEqual(0);
			});

			it('should update position when mouse moves while visible', () => {
				manager.setHoverText(entity, 'Test');
				manager.showNow(entity, 10, 10);

				const data1 = manager.getRenderData();
				const x1 = data1?.x;

				manager.updateMouse(20, 20, entity);

				const data2 = manager.getRenderData();
				expect(data2?.x).not.toBe(x1);
			});
		});

		describe('setScreenSize', () => {
			it('should update screen dimensions', () => {
				manager.setScreenSize(40, 12);
				manager.setHoverText(entity, 'Test tooltip that is long');
				manager.showNow(entity, 35, 10);

				const data = manager.getRenderData();
				// Should be clamped to new screen size
				expect(data?.x).toBeLessThanOrEqual(40 - (data?.width ?? 0));
			});
		});

		describe('clearAll', () => {
			it('should clear all registrations and hide tooltip', () => {
				manager.setHoverText(entity, 'Test 1');
				manager.setHoverText(entity2, 'Test 2');
				manager.showNow(entity, 10, 10);

				manager.clearAll();

				expect(manager.hasHoverText(entity)).toBe(false);
				expect(manager.hasHoverText(entity2)).toBe(false);
				expect(manager.isVisible()).toBe(false);
			});
		});

		describe('getState', () => {
			it('should return full state object', () => {
				manager.setHoverText(entity, 'Test');
				manager.showNow(entity, 15, 20);

				const state = manager.getState();
				expect(state.visible).toBe(true);
				expect(state.sourceEntity).toBe(entity);
				expect(state.text).toBe('Test');
				expect(state.position).toBeDefined();
			});

			it('should return initial state when nothing shown', () => {
				const state = manager.getState();
				expect(state.visible).toBe(false);
				expect(state.sourceEntity).toBeNull();
				expect(state.text).toBe('');
			});
		});
	});
});
