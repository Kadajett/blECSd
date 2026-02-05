/**
 * Tests for the ScrollableBox widget.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BorderType, getBorder } from '../components/border';
import { getContent } from '../components/content';
import { getDimensions } from '../components/dimensions';
import { resetFocusState } from '../components/focusable';
import { getParent } from '../components/hierarchy';
import { getPadding } from '../components/padding';
import { getPosition } from '../components/position';
import { getRenderable, hexToColor } from '../components/renderable';
import { hasScrollable } from '../components/scrollable';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	createScrollableBox,
	isKeysScrollEnabled,
	isMouseScrollEnabled,
	isScrollableBox,
	resetScrollableBoxStore,
	ScrollableBoxConfigSchema,
} from './scrollableBox';

describe('ScrollableBox widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFocusState();
		resetScrollableBoxStore();
	});

	afterEach(() => {
		resetFocusState();
	});

	describe('ScrollableBoxConfigSchema', () => {
		it('validates empty config', () => {
			const result = ScrollableBoxConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = ScrollableBoxConfigSchema.safeParse({
				left: 10,
				top: 20,
				right: 30,
				bottom: 40,
			});
			expect(result.success).toBe(true);
		});

		it('validates scroll options', () => {
			const result = ScrollableBoxConfigSchema.safeParse({
				scrollbar: true,
				alwaysScroll: true,
				mouse: true,
				keys: true,
				scrollWidth: 100,
				scrollHeight: 200,
				scrollX: 10,
				scrollY: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates scrollbar config object', () => {
			const result = ScrollableBoxConfigSchema.safeParse({
				scrollbar: {
					mode: 'auto',
					fg: '#ffffff',
					bg: '#000000',
					trackChar: '|',
					thumbChar: '#',
				},
			});
			expect(result.success).toBe(true);
		});

		it('validates scrollbar mode values', () => {
			expect(ScrollableBoxConfigSchema.safeParse({ scrollbar: { mode: 'auto' } }).success).toBe(
				true,
			);
			expect(ScrollableBoxConfigSchema.safeParse({ scrollbar: { mode: 'visible' } }).success).toBe(
				true,
			);
			expect(ScrollableBoxConfigSchema.safeParse({ scrollbar: { mode: 'hidden' } }).success).toBe(
				true,
			);
		});

		it('validates border config', () => {
			const result = ScrollableBoxConfigSchema.safeParse({
				border: {
					type: 'line',
					fg: '#ffffff',
					ch: 'single',
				},
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid scrollbar mode', () => {
			const result = ScrollableBoxConfigSchema.safeParse({
				scrollbar: { mode: 'invalid' },
			});
			expect(result.success).toBe(false);
		});
	});

	describe('createScrollableBox', () => {
		it('creates a scrollable box with default values', () => {
			const eid = addEntity(world);
			const scrollBox = createScrollableBox(world, eid);

			expect(scrollBox.eid).toBe(eid);
			expect(isScrollableBox(world, eid)).toBe(true);
			expect(hasScrollable(world, eid)).toBe(true);
		});

		it('sets position from config', () => {
			const eid = addEntity(world);
			createScrollableBox(world, eid, { left: 10, top: 20 });

			const pos = getPosition(world, eid);
			expect(pos).toBeDefined();
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(20);
		});

		it('sets dimensions from config', () => {
			const eid = addEntity(world);
			createScrollableBox(world, eid, { width: 80, height: 24 });

			const dims = getDimensions(world, eid);
			expect(dims).toBeDefined();
			expect(dims?.width).toBe(80);
			expect(dims?.height).toBe(24);
		});

		it('sets style colors from config', () => {
			const eid = addEntity(world);
			createScrollableBox(world, eid, { fg: '#ff0000', bg: '#00ff00' });

			const renderable = getRenderable(world, eid);
			expect(renderable).toBeDefined();
			expect(renderable?.fg).toBe(hexToColor('#ff0000'));
			expect(renderable?.bg).toBe(hexToColor('#00ff00'));
		});

		it('sets border from config', () => {
			const eid = addEntity(world);
			createScrollableBox(world, eid, {
				border: { type: 'line', fg: '#ffffff' },
			});

			const border = getBorder(world, eid);
			expect(border).toBeDefined();
			expect(border?.type).toBe(BorderType.Line);
			expect(border?.fg).toBe(hexToColor('#ffffff'));
		});

		it('sets padding from number config', () => {
			const eid = addEntity(world);
			createScrollableBox(world, eid, { padding: 2 });

			const padding = getPadding(world, eid);
			expect(padding).toBeDefined();
			expect(padding?.left).toBe(2);
			expect(padding?.top).toBe(2);
			expect(padding?.right).toBe(2);
			expect(padding?.bottom).toBe(2);
		});

		it('sets content from config', () => {
			const eid = addEntity(world);
			createScrollableBox(world, eid, { content: 'Hello, World!' });

			const content = getContent(world, eid);
			expect(content).toBe('Hello, World!');
		});

		it('sets scroll size from config', () => {
			const eid = addEntity(world);
			const scrollBox = createScrollableBox(world, eid, {
				scrollWidth: 200,
				scrollHeight: 500,
			});

			const scrollable = scrollBox.getScrollable();
			expect(scrollable?.scrollWidth).toBe(200);
			expect(scrollable?.scrollHeight).toBe(500);
		});

		it('sets initial scroll position from config', () => {
			const eid = addEntity(world);
			const scrollBox = createScrollableBox(world, eid, {
				scrollX: 10,
				scrollY: 20,
			});

			const scroll = scrollBox.getScroll();
			expect(scroll.x).toBe(10);
			expect(scroll.y).toBe(20);
		});

		it('enables mouse and keys scrolling by default', () => {
			const eid = addEntity(world);
			createScrollableBox(world, eid);

			expect(isMouseScrollEnabled(world, eid)).toBe(true);
			expect(isKeysScrollEnabled(world, eid)).toBe(true);
		});

		it('disables mouse scrolling when config says so', () => {
			const eid = addEntity(world);
			createScrollableBox(world, eid, { mouse: false });

			expect(isMouseScrollEnabled(world, eid)).toBe(false);
		});

		it('disables keys scrolling when config says so', () => {
			const eid = addEntity(world);
			createScrollableBox(world, eid, { keys: false });

			expect(isKeysScrollEnabled(world, eid)).toBe(false);
		});
	});

	describe('ScrollableBoxWidget methods', () => {
		describe('visibility', () => {
			it('show() makes the scrollable box visible', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				scrollBox.hide().show();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(true);
			});

			it('hide() makes the scrollable box invisible', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				scrollBox.hide();

				const renderable = getRenderable(world, eid);
				expect(renderable?.visible).toBe(false);
			});

			it('show() returns widget for chaining', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				const result = scrollBox.show();
				expect(result).toBe(scrollBox);
			});
		});

		describe('position', () => {
			it('move() changes position by delta', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, { left: 10, top: 20 });

				scrollBox.move(5, -3);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(15);
				expect(pos?.y).toBe(17);
			});

			it('setPosition() sets absolute position', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				scrollBox.setPosition(50, 30);

				const pos = getPosition(world, eid);
				expect(pos?.x).toBe(50);
				expect(pos?.y).toBe(30);
			});
		});

		describe('content', () => {
			it('setContent() updates box content', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				scrollBox.setContent('New content');

				expect(getContent(world, eid)).toBe('New content');
			});

			it('getContent() returns current content', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, { content: 'Initial' });

				expect(scrollBox.getContent()).toBe('Initial');
			});
		});

		describe('focus', () => {
			it('focus() focuses the scrollable box', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				scrollBox.focus();

				expect(scrollBox.isFocused()).toBe(true);
			});

			it('blur() removes focus', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				scrollBox.focus().blur();

				expect(scrollBox.isFocused()).toBe(false);
			});
		});

		describe('children', () => {
			it('append() adds a child entity', () => {
				const parentEid = addEntity(world);
				const childEid = addEntity(world);
				const scrollBox = createScrollableBox(world, parentEid);

				scrollBox.append(childEid);

				const parent = getParent(world, childEid);
				expect(parent).toBe(parentEid);
			});

			it('getChildren() returns child entities', () => {
				const parentEid = addEntity(world);
				const child1 = addEntity(world);
				const child2 = addEntity(world);
				const scrollBox = createScrollableBox(world, parentEid);

				scrollBox.append(child1).append(child2);

				const children = scrollBox.getChildren();
				expect(children).toHaveLength(2);
				expect(children).toContain(child1);
				expect(children).toContain(child2);
			});
		});

		describe('scrolling', () => {
			it('scrollTo() sets absolute scroll position', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				scrollBox.scrollTo(50, 100);

				const scroll = scrollBox.getScroll();
				expect(scroll.x).toBe(50);
				expect(scroll.y).toBe(100);
			});

			it('scrollBy() scrolls by delta', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollX: 10,
					scrollY: 20,
				});

				scrollBox.scrollBy(5, 10);

				const scroll = scrollBox.getScroll();
				expect(scroll.x).toBe(15);
				expect(scroll.y).toBe(30);
			});

			it('setScrollPerc() sets scroll by percentage', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollWidth: 100,
					scrollHeight: 100,
				});
				scrollBox.setViewport(20, 20); // Max scroll = 80

				scrollBox.setScrollPerc(50, 50);

				const scroll = scrollBox.getScroll();
				expect(scroll.x).toBe(40); // 50% of 80
				expect(scroll.y).toBe(40);
			});

			it('getScrollPerc() returns scroll percentage', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollWidth: 100,
					scrollHeight: 100,
				});
				scrollBox.setViewport(20, 20);
				scrollBox.scrollTo(40, 40); // 50% of max scroll (80)

				const perc = scrollBox.getScrollPerc();
				expect(perc.x).toBe(50);
				expect(perc.y).toBe(50);
			});

			it('setScrollSize() sets content size', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				scrollBox.setScrollSize(200, 300);

				const scrollable = scrollBox.getScrollable();
				expect(scrollable?.scrollWidth).toBe(200);
				expect(scrollable?.scrollHeight).toBe(300);
			});

			it('setViewport() sets viewport size', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				scrollBox.setViewport(80, 24);

				const scrollable = scrollBox.getScrollable();
				expect(scrollable?.viewportWidth).toBe(80);
				expect(scrollable?.viewportHeight).toBe(24);
			});

			it('scrollToTop() scrolls to top', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, { scrollY: 100 });

				scrollBox.scrollToTop();

				expect(scrollBox.getScroll().y).toBe(0);
			});

			it('scrollToBottom() scrolls to bottom', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollHeight: 100,
				});
				scrollBox.setViewport(0, 20);

				scrollBox.scrollToBottom();

				expect(scrollBox.getScroll().y).toBe(80); // 100 - 20
			});

			it('scrollToLeft() scrolls to left', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, { scrollX: 100 });

				scrollBox.scrollToLeft();

				expect(scrollBox.getScroll().x).toBe(0);
			});

			it('scrollToRight() scrolls to right', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollWidth: 100,
				});
				scrollBox.setViewport(20, 0);

				scrollBox.scrollToRight();

				expect(scrollBox.getScroll().x).toBe(80); // 100 - 20
			});
		});

		describe('scroll queries', () => {
			it('canScroll() returns true when content exceeds viewport', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollWidth: 100,
					scrollHeight: 100,
				});
				scrollBox.setViewport(50, 50);

				expect(scrollBox.canScroll()).toBe(true);
			});

			it('canScroll() returns false when content fits viewport', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollWidth: 50,
					scrollHeight: 50,
				});
				scrollBox.setViewport(100, 100);

				expect(scrollBox.canScroll()).toBe(false);
			});

			it('canScrollX() checks horizontal scrollability', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollWidth: 100,
					scrollHeight: 50,
				});
				scrollBox.setViewport(50, 100);

				expect(scrollBox.canScrollX()).toBe(true);
				expect(scrollBox.canScrollY()).toBe(false);
			});

			it('canScrollY() checks vertical scrollability', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollWidth: 50,
					scrollHeight: 100,
				});
				scrollBox.setViewport(100, 50);

				expect(scrollBox.canScrollX()).toBe(false);
				expect(scrollBox.canScrollY()).toBe(true);
			});

			it('isAtTop() returns true when at top', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				expect(scrollBox.isAtTop()).toBe(true);
			});

			it('isAtTop() returns false when scrolled', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, { scrollY: 50 });

				expect(scrollBox.isAtTop()).toBe(false);
			});

			it('isAtBottom() returns true when at bottom', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollHeight: 100,
				});
				scrollBox.setViewport(0, 20);
				scrollBox.scrollToBottom();

				expect(scrollBox.isAtBottom()).toBe(true);
			});

			it('isAtLeft() returns true when at left', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				expect(scrollBox.isAtLeft()).toBe(true);
			});

			it('isAtRight() returns true when at right', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid, {
					scrollWidth: 100,
				});
				scrollBox.setViewport(20, 0);
				scrollBox.scrollToRight();

				expect(scrollBox.isAtRight()).toBe(true);
			});
		});

		describe('destroy', () => {
			it('destroy() removes the scrollable box marker', () => {
				const eid = addEntity(world);
				const scrollBox = createScrollableBox(world, eid);

				expect(isScrollableBox(world, eid)).toBe(true);
				scrollBox.destroy();
				expect(isScrollableBox(world, eid)).toBe(false);
			});
		});
	});

	describe('utility functions', () => {
		describe('isScrollableBox', () => {
			it('returns true for scrollable box entities', () => {
				const eid = addEntity(world);
				createScrollableBox(world, eid);

				expect(isScrollableBox(world, eid)).toBe(true);
			});

			it('returns false for non-scrollable-box entities', () => {
				const eid = addEntity(world);

				expect(isScrollableBox(world, eid)).toBe(false);
			});
		});

		describe('isMouseScrollEnabled', () => {
			it('returns true when mouse is enabled', () => {
				const eid = addEntity(world);
				createScrollableBox(world, eid, { mouse: true });

				expect(isMouseScrollEnabled(world, eid)).toBe(true);
			});

			it('returns false when mouse is disabled', () => {
				const eid = addEntity(world);
				createScrollableBox(world, eid, { mouse: false });

				expect(isMouseScrollEnabled(world, eid)).toBe(false);
			});
		});

		describe('isKeysScrollEnabled', () => {
			it('returns true when keys is enabled', () => {
				const eid = addEntity(world);
				createScrollableBox(world, eid, { keys: true });

				expect(isKeysScrollEnabled(world, eid)).toBe(true);
			});

			it('returns false when keys is disabled', () => {
				const eid = addEntity(world);
				createScrollableBox(world, eid, { keys: false });

				expect(isKeysScrollEnabled(world, eid)).toBe(false);
			});
		});
	});

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const eid = addEntity(world);
			const scrollBox = createScrollableBox(world, eid, {
				left: 0,
				top: 0,
				scrollHeight: 200,
			});

			scrollBox
				.setPosition(10, 10)
				.move(5, 5)
				.setContent('Scrollable content')
				.setViewport(80, 20)
				.scrollBy(0, 50)
				.focus()
				.show();

			const pos = getPosition(world, eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(15);
			expect(scrollBox.getContent()).toBe('Scrollable content');
			expect(scrollBox.getScroll().y).toBe(50);
			expect(scrollBox.isFocused()).toBe(true);
		});
	});
});
