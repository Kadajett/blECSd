/**
 * Tests for the ScrollableText widget.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDimensions } from '../components/dimensions';
import { resetFocusState } from '../components/focusable';
import { getPosition } from '../components/position';
import { getRenderable, hexToColor } from '../components/renderable';
import { getScrollable } from '../components/scrollable';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { resetScrollableBoxStore } from './scrollableBox';
import { createScrollableText, isScrollableText } from './scrollableText';

describe('ScrollableText widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetScrollableBoxStore();
	});

	afterEach(() => {
		resetFocusState();
	});

	describe('createScrollableText', () => {
		it('creates a scrollable text widget', () => {
			const eid = addEntity(world);
			const widget = createScrollableText(world, eid);

			expect(widget.eid).toBe(eid);
			expect(isScrollableText(world, eid)).toBe(true);
		});

		it('forces alwaysScroll to true', () => {
			const eid = addEntity(world);
			createScrollableText(world, eid, {
				width: 40,
				height: 10,
			});

			const scrollable = getScrollable(world, eid);
			expect(scrollable).toBeDefined();
			expect(scrollable?.alwaysScroll).toBe(true);
		});

		it('sets position from config', () => {
			const eid = addEntity(world);
			createScrollableText(world, eid, { left: 10, top: 20 });

			const pos = getPosition(world, eid);
			expect(pos).toBeDefined();
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('sets dimensions from config', () => {
			const eid = addEntity(world);
			createScrollableText(world, eid, { width: 60, height: 20 });

			const dims = getDimensions(world, eid);
			expect(dims).toBeDefined();
			expect(dims?.width).toBe(60);
			expect(dims?.height).toBe(20);
		});

		it('sets style colors from config', () => {
			const eid = addEntity(world);
			createScrollableText(world, eid, { fg: '#ff0000', bg: '#00ff00' });

			const renderable = getRenderable(world, eid);
			expect(renderable).toBeDefined();
			expect(renderable?.fg).toBe(hexToColor('#ff0000'));
			expect(renderable?.bg).toBe(hexToColor('#00ff00'));
		});

		it('sets initial content', () => {
			const eid = addEntity(world);
			const widget = createScrollableText(world, eid, {
				content: 'Test content',
				width: 40,
				height: 10,
			});

			expect(widget.getContent()).toBe('Test content');
		});
	});

	describe('ScrollableText API', () => {
		it('provides all ScrollableBox methods', () => {
			const eid = addEntity(world);
			const widget = createScrollableText(world, eid, {
				width: 40,
				height: 10,
			});

			// Check that key methods exist
			expect(typeof widget.show).toBe('function');
			expect(typeof widget.hide).toBe('function');
			expect(typeof widget.move).toBe('function');
			expect(typeof widget.setPosition).toBe('function');
			expect(typeof widget.setContent).toBe('function');
			expect(typeof widget.getContent).toBe('function');
			expect(typeof widget.scrollTo).toBe('function');
			expect(typeof widget.scrollBy).toBe('function');
			expect(typeof widget.scrollToTop).toBe('function');
			expect(typeof widget.scrollToBottom).toBe('function');
			expect(typeof widget.focus).toBe('function');
			expect(typeof widget.blur).toBe('function');
			expect(typeof widget.destroy).toBe('function');
		});

		describe('visibility', () => {
			it('show() makes the widget visible', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid);

				widget.hide().show();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(true);
			});

			it('hide() makes the widget invisible', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid);

				widget.hide();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(false);
			});

			it('show() returns widget for chaining', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid);

				const result = widget.show();
				expect(result).toBe(widget);
			});
		});

		describe('position', () => {
			it('move() changes position by delta', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid, { left: 10, top: 20 });

				widget.move(5, -3);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(15);
				expect(pos?.y).toBe(17);
			});

			it('setPosition() sets absolute position', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid);

				widget.setPosition(50, 30);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(50);
				expect(pos?.y).toBe(30);
			});
		});

		describe('content', () => {
			it('setContent() updates the content', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid, { width: 40, height: 10 });

				widget.setContent('New content');

				expect(widget.getContent()).toBe('New content');
			});

			it('setContent() returns widget for chaining', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid, { width: 40, height: 10 });

				const result = widget.setContent('Test');
				expect(result).toBe(widget);
			});
		});

		describe('scrolling', () => {
			it('scrollTo() sets scroll position', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid, {
					width: 40,
					height: 10,
					scrollWidth: 100,
					scrollHeight: 100,
				});

				widget.scrollTo(10, 20);

				const scroll = widget.getScroll();
				expect(scroll.x).toBe(10);
				expect(scroll.y).toBe(20);
			});

			it('scrollBy() changes scroll by delta', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid, {
					width: 40,
					height: 10,
					scrollWidth: 100,
					scrollHeight: 100,
				});

				widget.scrollTo(10, 10);
				widget.scrollBy(5, 5);

				const scroll = widget.getScroll();
				expect(scroll.x).toBe(15);
				expect(scroll.y).toBe(15);
			});

			it('scrollToTop() scrolls to top', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid, {
					width: 40,
					height: 10,
					scrollWidth: 100,
					scrollHeight: 100,
				});

				widget.scrollTo(10, 50);
				widget.scrollToTop();

				const scroll = widget.getScroll();
				expect(scroll.y).toBe(0);
			});

			it('scrollToBottom() scrolls to bottom', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid, {
					width: 40,
					height: 10,
					scrollWidth: 100,
					scrollHeight: 100,
				});

				widget.scrollToBottom();

				expect(widget.isAtBottom()).toBe(true);
			});
		});

		describe('focus', () => {
			it('focus() focuses the widget', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid);

				widget.focus();
				expect(widget.isFocused()).toBe(true);
			});

			it('blur() unfocuses the widget', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid);

				widget.focus();
				widget.blur();
				expect(widget.isFocused()).toBe(false);
			});
		});

		describe('destroy', () => {
			it('destroy() removes the widget marker', () => {
				const eid = addEntity(world);
				const widget = createScrollableText(world, eid);

				expect(isScrollableText(world, eid)).toBe(true);
				widget.destroy();
				expect(isScrollableText(world, eid)).toBe(false);
			});
		});
	});

	describe('utility functions', () => {
		describe('isScrollableText', () => {
			it('returns true for scrollable text entities', () => {
				const eid = addEntity(world);
				createScrollableText(world, eid);

				expect(isScrollableText(world, eid)).toBe(true);
			});

			it('returns false for non-scrollable text entities', () => {
				const eid = addEntity(world);

				expect(isScrollableText(world, eid)).toBe(false);
			});
		});
	});

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const eid = addEntity(world);
			const widget = createScrollableText(world, eid, {
				left: 0,
				top: 0,
				width: 40,
				height: 10,
				scrollWidth: 100,
				scrollHeight: 100,
			});

			widget
				.setPosition(10, 10)
				.move(5, 5)
				.setContent('Chained content')
				.scrollTo(20, 30)
				.scrollBy(5, 5)
				.show();

			const pos = getPosition(world, eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(15);
			expect(widget.getContent()).toBe('Chained content');

			const scroll = widget.getScroll();
			expect(scroll.x).toBe(25);
			expect(scroll.y).toBe(35);
		});
	});
});
