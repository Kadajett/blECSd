/**
 * Tests for VirtualizedList widget.
 * @module widgets/virtualizedList.test
 */

import { createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { VirtualViewport } from '../components/virtualViewport';
import { Renderable } from '../components/renderable';
import {
	createVirtualizedList,
	handleVirtualizedListKey,
	handleVirtualizedListWheel,
	isVirtualizedList,
	VirtualizedListConfigSchema,
} from './virtualizedList';
import {
	cleanupVirtualizedRenderSystem,
	getLineStore,
} from '../systems/virtualizedRenderSystem';

describe('VirtualizedList', () => {
	let world: ReturnType<typeof createWorld>;

	beforeEach(() => {
		world = createWorld();
		cleanupVirtualizedRenderSystem();
	});

	// ===========================================================================
	// SCHEMA VALIDATION
	// ===========================================================================

	describe('schema validation', () => {
		it('should validate valid config', () => {
			const config = {
				width: 80,
				height: 24,
			};
			expect(() => VirtualizedListConfigSchema.parse(config)).not.toThrow();
		});

		it('should apply defaults', () => {
			const config = { width: 80, height: 24 };
			const result = VirtualizedListConfigSchema.parse(config);
			expect(result.x).toBe(0);
			expect(result.y).toBe(0);
			expect(result.mouse).toBe(true);
			expect(result.keys).toBe(true);
			expect(result.overscan).toBe(5);
			expect(result.maxLines).toBe(0);
		});

		it('should reject invalid width', () => {
			const config = { width: -1, height: 24 };
			expect(() => VirtualizedListConfigSchema.parse(config)).toThrow();
		});

		it('should reject invalid height', () => {
			const config = { width: 80, height: 0 };
			expect(() => VirtualizedListConfigSchema.parse(config)).toThrow();
		});

		it('should validate style options', () => {
			const config = {
				width: 80,
				height: 24,
				style: {
					fg: 0xffffff,
					bg: 0x000000,
					showLineNumbers: true,
					lineNumberWidth: 5,
				},
			};
			expect(() => VirtualizedListConfigSchema.parse(config)).not.toThrow();
		});
	});

	// ===========================================================================
	// CREATION
	// ===========================================================================

	describe('creation', () => {
		it('should create widget with minimal config', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
			});

			expect(list.eid).toBeDefined();
			expect(list.getLineCount()).toBe(0);
		});

		it('should create widget with initial lines', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				lines: ['Line 1', 'Line 2', 'Line 3'],
			});

			expect(list.getLineCount()).toBe(3);
			expect(list.getLine(0)).toBe('Line 1');
			expect(list.getLine(1)).toBe('Line 2');
			expect(list.getLine(2)).toBe('Line 3');
		});

		it('should register line store', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				lines: ['Test'],
			});

			const store = getLineStore(list.eid);
			expect(store).toBeDefined();
			expect(store?.lineCount).toBe(1);
		});

		it('should set up viewport correctly', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			expect(VirtualViewport.totalLineCount[list.eid]).toBe(100);
			expect(VirtualViewport.visibleLineCount[list.eid]).toBe(24);
		});

		it('should account for border in visible lines', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				border: { type: 1 }, // BorderType.Line
			});

			// Border takes 2 rows (top + bottom)
			expect(VirtualViewport.visibleLineCount[list.eid]).toBe(22);
		});
	});

	// ===========================================================================
	// CONTENT
	// ===========================================================================

	describe('content', () => {
		it('should set lines', () => {
			const list = createVirtualizedList(world, { width: 80, height: 24 });

			list.setLines(['A', 'B', 'C']);

			expect(list.getLineCount()).toBe(3);
			expect(list.getLine(0)).toBe('A');
		});

		it('should append single line', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				lines: ['First'],
			});

			list.appendLine('Second');

			expect(list.getLineCount()).toBe(2);
			expect(list.getLine(1)).toBe('Second');
		});

		it('should append multiple lines', () => {
			const list = createVirtualizedList(world, { width: 80, height: 24 });

			list.appendLines(['One', 'Two', 'Three']);

			expect(list.getLineCount()).toBe(3);
		});

		it('should clear content', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				lines: ['A', 'B', 'C'],
			});

			list.clear();

			expect(list.getLineCount()).toBe(0);
		});

		it('should return undefined for out-of-bounds line', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				lines: ['Only'],
			});

			expect(list.getLine(100)).toBeUndefined();
			expect(list.getLine(-1)).toBeUndefined();
		});

		it('should respect maxLines', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				maxLines: 5,
			});

			list.appendLines(Array.from({ length: 10 }, (_, i) => `Line ${i}`));

			expect(list.getLineCount()).toBe(5);
			// Should keep the last 5 lines
			expect(list.getLine(0)).toBe('Line 5');
		});
	});

	// ===========================================================================
	// SCROLLING
	// ===========================================================================

	describe('scrolling', () => {
		it('should scroll to line', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			list.scrollToLine(50);

			const info = list.getScrollInfo();
			expect(info).toBeDefined();
			// Line 50 should be centered (approx)
			expect(info?.currentLine).toBeGreaterThan(40);
			expect(info?.currentLine).toBeLessThan(60);
		});

		it('should scroll to top', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			list.scrollToLine(50);
			list.scrollToTop();

			const info = list.getScrollInfo();
			expect(info?.atTop).toBe(true);
		});

		it('should scroll to bottom', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			list.scrollToBottom();

			const info = list.getScrollInfo();
			expect(info?.atBottom).toBe(true);
		});

		it('should scroll by lines', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			list.scrollBy(5);

			const info = list.getScrollInfo();
			expect(info?.currentLine).toBe(5);
		});

		it('should scroll by page', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			list.scrollPage(1);

			const info = list.getScrollInfo();
			expect(info?.currentLine).toBeGreaterThanOrEqual(9); // page size - 1
		});
	});

	// ===========================================================================
	// SELECTION
	// ===========================================================================

	describe('selection', () => {
		it('should select line', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: ['A', 'B', 'C'],
			});

			list.select(1);

			expect(list.getSelected()).toBe(1);
		});

		it('should clear selection', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: ['A', 'B', 'C'],
			});

			list.select(1);
			list.clearSelection();

			expect(list.getSelected()).toBe(-1);
		});

		it('should start with no selection', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: ['A', 'B', 'C'],
			});

			expect(list.getSelected()).toBe(-1);
		});
	});

	// ===========================================================================
	// CURSOR
	// ===========================================================================

	describe('cursor', () => {
		it('should move cursor down', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 20 }, (_, i) => `Line ${i}`),
			});

			list.setCursor(0);
			list.cursorDown();

			expect(list.getCursor()).toBe(1);
		});

		it('should move cursor up', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 20 }, (_, i) => `Line ${i}`),
			});

			list.setCursor(5);
			list.cursorUp();

			expect(list.getCursor()).toBe(4);
		});

		it('should move cursor by count', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 20 }, (_, i) => `Line ${i}`),
			});

			list.setCursor(0);
			list.cursorDown(5);

			expect(list.getCursor()).toBe(5);
		});

		it('should set cursor directly', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 20 }, (_, i) => `Line ${i}`),
			});

			list.setCursor(10);

			expect(list.getCursor()).toBe(10);
		});
	});

	// ===========================================================================
	// FOLLOW MODE
	// ===========================================================================

	describe('follow mode', () => {
		it('should enable follow mode', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			list.follow(true);

			expect(list.isFollowing()).toBe(true);
			expect(list.getScrollInfo()?.atBottom).toBe(true);
		});

		it('should disable follow mode', () => {
			const list = createVirtualizedList(world, { width: 80, height: 10 });

			list.follow(true);
			list.follow(false);

			expect(list.isFollowing()).toBe(false);
		});

		it('should auto-scroll on append when following', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 50 }, (_, i) => `Line ${i}`),
			});

			list.follow(true);
			list.appendLine('New line');

			expect(list.getScrollInfo()?.atBottom).toBe(true);
		});
	});

	// ===========================================================================
	// VISIBILITY
	// ===========================================================================

	describe('visibility', () => {
		it('should show widget', () => {
			const list = createVirtualizedList(world, { width: 80, height: 24 });

			list.hide();
			list.show();

			expect(Renderable.visible[list.eid]).toBe(1);
		});

		it('should hide widget', () => {
			const list = createVirtualizedList(world, { width: 80, height: 24 });

			list.hide();

			expect(Renderable.visible[list.eid]).toBe(0);
		});
	});

	// ===========================================================================
	// CHAINING
	// ===========================================================================

	describe('chaining', () => {
		it('should support method chaining', () => {
			const list = createVirtualizedList(world, { width: 80, height: 24 });

			const result = list
				.setLines(['A', 'B', 'C'])
				.appendLine('D')
				.scrollToBottom()
				.follow(true)
				.show();

			expect(result).toBe(list);
			expect(list.getLineCount()).toBe(4);
		});
	});

	// ===========================================================================
	// KEYBOARD HANDLER
	// ===========================================================================

	describe('handleVirtualizedListKey', () => {
		it('should handle up arrow', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 20 }, (_, i) => `Line ${i}`),
			});
			list.setCursor(5);

			const handled = handleVirtualizedListKey(list, 'up');

			expect(handled).toBe(true);
			expect(list.getCursor()).toBe(4);
		});

		it('should handle down arrow', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 20 }, (_, i) => `Line ${i}`),
			});
			list.setCursor(5);

			const handled = handleVirtualizedListKey(list, 'down');

			expect(handled).toBe(true);
			expect(list.getCursor()).toBe(6);
		});

		it('should handle j/k for vim navigation', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 20 }, (_, i) => `Line ${i}`),
			});
			list.setCursor(5);

			handleVirtualizedListKey(list, 'j');
			expect(list.getCursor()).toBe(6);

			handleVirtualizedListKey(list, 'k');
			expect(list.getCursor()).toBe(5);
		});

		it('should handle page up/down', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			handleVirtualizedListKey(list, 'pagedown');
			const afterPageDown = list.getScrollInfo()?.currentLine ?? 0;
			expect(afterPageDown).toBeGreaterThan(0);

			handleVirtualizedListKey(list, 'pageup');
			const afterPageUp = list.getScrollInfo()?.currentLine ?? 0;
			expect(afterPageUp).toBeLessThan(afterPageDown);
		});

		it('should handle home/end', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			handleVirtualizedListKey(list, 'end');
			expect(list.getScrollInfo()?.atBottom).toBe(true);

			handleVirtualizedListKey(list, 'home');
			expect(list.getScrollInfo()?.atTop).toBe(true);
		});

		it('should handle G for go to end', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			handleVirtualizedListKey(list, 'G');

			expect(list.getScrollInfo()?.atBottom).toBe(true);
			expect(list.getCursor()).toBe(99);
		});

		it('should return false for unhandled keys', () => {
			const list = createVirtualizedList(world, { width: 80, height: 10 });

			const handled = handleVirtualizedListKey(list, 'x');

			expect(handled).toBe(false);
		});
	});

	// ===========================================================================
	// MOUSE WHEEL HANDLER
	// ===========================================================================

	describe('handleVirtualizedListWheel', () => {
		it('should scroll up on wheel up', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});
			list.scrollToLine(50);

			const beforeScroll = list.getScrollInfo()?.currentLine ?? 0;
			handleVirtualizedListWheel(list, 'up');
			const afterScroll = list.getScrollInfo()?.currentLine ?? 0;

			expect(afterScroll).toBeLessThan(beforeScroll);
		});

		it('should scroll down on wheel down', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			handleVirtualizedListWheel(list, 'down');
			const currentLine = list.getScrollInfo()?.currentLine ?? 0;

			expect(currentLine).toBeGreaterThan(0);
		});

		it('should respect custom amount', () => {
			const list = createVirtualizedList(world, {
				width: 80,
				height: 10,
				lines: Array.from({ length: 100 }, (_, i) => `Line ${i}`),
			});

			handleVirtualizedListWheel(list, 'down', 10);
			const currentLine = list.getScrollInfo()?.currentLine ?? 0;

			expect(currentLine).toBe(10);
		});
	});

	// ===========================================================================
	// UTILITY
	// ===========================================================================

	describe('isVirtualizedList', () => {
		it('should return true for virtualized list entity', () => {
			const list = createVirtualizedList(world, { width: 80, height: 24 });

			expect(isVirtualizedList(world, list.eid)).toBe(true);
		});
	});

	// ===========================================================================
	// LIFECYCLE
	// ===========================================================================

	describe('lifecycle', () => {
		it('should destroy widget', () => {
			const list = createVirtualizedList(world, { width: 80, height: 24 });
			const eid = list.eid;

			list.destroy();

			// Line store should be cleaned up
			expect(getLineStore(eid)).toBeUndefined();
		});

		it('should refresh widget', () => {
			const list = createVirtualizedList(world, { width: 80, height: 24 });

			// Clear dirty flag first
			Renderable.dirty[list.eid] = 0;

			list.refresh();

			expect(Renderable.dirty[list.eid]).toBe(1);
		});
	});

	// ===========================================================================
	// LARGE CONTENT
	// ===========================================================================

	describe('large content', () => {
		it('should handle 10000 lines', () => {
			const lines = Array.from({ length: 10000 }, (_, i) => `Line ${i}`);
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				lines,
			});

			expect(list.getLineCount()).toBe(10000);
			expect(list.getLine(5000)).toBe('Line 5000');
			expect(list.getLine(9999)).toBe('Line 9999');
		});

		it('should scroll efficiently with large content', () => {
			const lines = Array.from({ length: 10000 }, (_, i) => `Line ${i}`);
			const list = createVirtualizedList(world, {
				width: 80,
				height: 24,
				lines,
			});

			const start = performance.now();
			for (let i = 0; i < 100; i++) {
				list.scrollBy(100);
			}
			const elapsed = performance.now() - start;

			// 100 scroll operations should be very fast
			expect(elapsed).toBeLessThan(100);
		});
	});
});
