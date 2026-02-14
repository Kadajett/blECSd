import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import {
	canScroll,
	canScrollX,
	canScrollY,
	getScroll,
	getScrollable,
	getScrollPercentage,
	hasScrollable,
	isAtBottom,
	isAtLeft,
	isAtRight,
	isAtTop,
	scrollBy,
	scrollTo,
	scrollToBottom,
	scrollToLeft,
	scrollToRight,
	scrollToTop,
	setClampEnabled,
	setScroll,
	setScrollable,
	setScrollbarVisibility,
	setScrollPercentage,
	setScrollSize,
	setViewport,
} from '../systems/scrollableSystem';
import { Scrollable, ScrollbarVisibility } from './scrollable';

describe('Scrollable component', () => {
	describe('setScrollable', () => {
		it('adds Scrollable component to entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, {});

			expect(hasScrollable(world, entity)).toBe(true);
		});

		it('sets scroll position', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { scrollX: 10, scrollY: 20 });

			expect(Scrollable.scrollX[entity]).toBe(10);
			expect(Scrollable.scrollY[entity]).toBe(20);
		});

		it('sets scroll size', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { scrollWidth: 500, scrollHeight: 1000 });

			expect(Scrollable.scrollWidth[entity]).toBe(500);
			expect(Scrollable.scrollHeight[entity]).toBe(1000);
		});

		it('sets scrollbar visibility', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { scrollbarVisible: ScrollbarVisibility.Visible });

			expect(Scrollable.scrollbarVisible[entity]).toBe(ScrollbarVisibility.Visible);
		});

		it('sets track visible', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { trackVisible: false });

			expect(Scrollable.trackVisible[entity]).toBe(0);
		});

		it('sets always scroll', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { alwaysScroll: true });

			expect(Scrollable.alwaysScroll[entity]).toBe(1);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setScrollable(world, entity, {});

			expect(result).toBe(entity);
		});

		it('defaults to auto scrollbar visibility', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, {});

			expect(Scrollable.scrollbarVisible[entity]).toBe(ScrollbarVisibility.Auto);
		});
	});

	describe('setScroll', () => {
		it('sets scroll position', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScroll(world, entity, 50, 100);

			expect(Scrollable.scrollX[entity]).toBe(50);
			expect(Scrollable.scrollY[entity]).toBe(100);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setScroll(world, entity, 0, 0);

			expect(result).toBe(entity);
		});
	});

	describe('getScroll', () => {
		it('returns { x: 0, y: 0 } for entity without Scrollable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const scroll = getScroll(world, entity);

			expect(scroll.x).toBe(0);
			expect(scroll.y).toBe(0);
		});

		it('returns scroll position', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScroll(world, entity, 25, 75);

			const scroll = getScroll(world, entity);

			expect(scroll.x).toBe(25);
			expect(scroll.y).toBe(75);
		});
	});

	describe('scrollBy', () => {
		it('adds delta to scroll position', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScroll(world, entity, 10, 20);
			scrollBy(world, entity, 5, 10);

			expect(Scrollable.scrollX[entity]).toBe(15);
			expect(Scrollable.scrollY[entity]).toBe(30);
		});

		it('handles negative delta', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScroll(world, entity, 50, 100);
			scrollBy(world, entity, -10, -20);

			expect(Scrollable.scrollX[entity]).toBe(40);
			expect(Scrollable.scrollY[entity]).toBe(80);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = scrollBy(world, entity, 0, 10);

			expect(result).toBe(entity);
		});
	});

	describe('scrollTo', () => {
		it('sets scroll position (alias for setScroll)', () => {
			const world = createWorld();
			const entity = addEntity(world);

			scrollTo(world, entity, 100, 200);

			expect(Scrollable.scrollX[entity]).toBe(100);
			expect(Scrollable.scrollY[entity]).toBe(200);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = scrollTo(world, entity, 0, 0);

			expect(result).toBe(entity);
		});
	});

	describe('getScrollPercentage', () => {
		it('returns { x: 0, y: 0 } for entity without Scrollable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const percent = getScrollPercentage(world, entity);

			expect(percent.x).toBe(0);
			expect(percent.y).toBe(0);
		});

		it('returns { x: 0, y: 0 } when scroll size is 0', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { scrollWidth: 0, scrollHeight: 0 });

			const percent = getScrollPercentage(world, entity);

			expect(percent.x).toBe(0);
			expect(percent.y).toBe(0);
		});

		it('calculates percentage correctly', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, {
				scrollX: 50,
				scrollY: 250,
				scrollWidth: 100,
				scrollHeight: 500,
			});

			const percent = getScrollPercentage(world, entity);

			expect(percent.x).toBe(50);
			expect(percent.y).toBe(50);
		});

		it('handles 100% scroll', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, {
				scrollX: 200,
				scrollY: 1000,
				scrollWidth: 200,
				scrollHeight: 1000,
			});

			const percent = getScrollPercentage(world, entity);

			expect(percent.x).toBe(100);
			expect(percent.y).toBe(100);
		});
	});

	describe('getScrollable', () => {
		it('returns undefined for entity without Scrollable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getScrollable(world, entity)).toBeUndefined();
		});

		it('returns full scrollable data', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, {
				scrollX: 10,
				scrollY: 20,
				scrollWidth: 100,
				scrollHeight: 200,
				scrollbarVisible: ScrollbarVisibility.Visible,
				trackVisible: true,
				alwaysScroll: true,
			});

			const data = getScrollable(world, entity);

			expect(data).toBeDefined();
			expect(data?.scrollX).toBe(10);
			expect(data?.scrollY).toBe(20);
			expect(data?.scrollWidth).toBe(100);
			expect(data?.scrollHeight).toBe(200);
			expect(data?.scrollbarVisible).toBe(ScrollbarVisibility.Visible);
			expect(data?.trackVisible).toBe(true);
			expect(data?.alwaysScroll).toBe(true);
		});
	});

	describe('hasScrollable', () => {
		it('returns true when entity has Scrollable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, {});

			expect(hasScrollable(world, entity)).toBe(true);
		});

		it('returns false when entity lacks Scrollable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasScrollable(world, entity)).toBe(false);
		});
	});

	describe('setScrollSize', () => {
		it('sets scroll size', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollSize(world, entity, 300, 600);

			expect(Scrollable.scrollWidth[entity]).toBe(300);
			expect(Scrollable.scrollHeight[entity]).toBe(600);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setScrollSize(world, entity, 100, 100);

			expect(result).toBe(entity);
		});
	});

	describe('setScrollbarVisibility', () => {
		it('sets scrollbar visibility', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollbarVisibility(world, entity, ScrollbarVisibility.Hidden);

			expect(Scrollable.scrollbarVisible[entity]).toBe(ScrollbarVisibility.Hidden);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setScrollbarVisibility(world, entity, ScrollbarVisibility.Auto);

			expect(result).toBe(entity);
		});
	});

	describe('scrollToTop', () => {
		it('sets scrollY to 0', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScroll(world, entity, 50, 100);
			scrollToTop(world, entity);

			expect(Scrollable.scrollY[entity]).toBe(0);
			expect(Scrollable.scrollX[entity]).toBe(50); // X unchanged
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = scrollToTop(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('scrollToBottom', () => {
		it('sets scrollY to scrollHeight when no viewport', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { scrollHeight: 500 });
			scrollToBottom(world, entity);

			// Without viewport, scrollHeight - 0 = scrollHeight
			expect(Scrollable.scrollY[entity]).toBe(500);
		});

		it('sets scrollY to scrollHeight - viewportHeight when viewport is set', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, {
				scrollHeight: 500,
				viewportHeight: 100,
			});
			scrollToBottom(world, entity);

			// With viewport: 500 - 100 = 400
			expect(Scrollable.scrollY[entity]).toBe(400);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = scrollToBottom(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('canScroll', () => {
		it('returns false for entity without Scrollable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(canScroll(world, entity)).toBe(false);
		});

		it('returns false when scroll size is 0', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { scrollWidth: 0, scrollHeight: 0 });

			expect(canScroll(world, entity)).toBe(false);
		});

		it('returns true when scroll width > 0', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { scrollWidth: 100 });

			expect(canScroll(world, entity)).toBe(true);
		});

		it('returns true when scroll height > 0', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { scrollHeight: 100 });

			expect(canScroll(world, entity)).toBe(true);
		});
	});

	describe('isAtTop', () => {
		it('returns true for entity without Scrollable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isAtTop(world, entity)).toBe(true);
		});

		it('returns true when scrollY <= 0', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScroll(world, entity, 0, 0);

			expect(isAtTop(world, entity)).toBe(true);
		});

		it('returns false when scrollY > 0', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScroll(world, entity, 0, 10);

			expect(isAtTop(world, entity)).toBe(false);
		});
	});

	describe('isAtBottom', () => {
		it('returns true for entity without Scrollable', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(isAtBottom(world, entity)).toBe(true);
		});

		it('returns true when scrollY >= scrollHeight (no viewport)', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, { scrollY: 500, scrollHeight: 500, clampEnabled: false });

			expect(isAtBottom(world, entity)).toBe(true);
		});

		it('returns true when scrollY >= scrollHeight - viewportHeight', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, {
				scrollY: 400,
				scrollHeight: 500,
				viewportHeight: 100,
				clampEnabled: false,
			});

			// maxScrollY = 500 - 100 = 400, scrollY = 400
			expect(isAtBottom(world, entity)).toBe(true);
		});

		it('returns false when scrollY < scrollHeight - viewportHeight', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setScrollable(world, entity, {
				scrollY: 100,
				scrollHeight: 500,
				viewportHeight: 100,
				clampEnabled: false,
			});

			// maxScrollY = 500 - 100 = 400, scrollY = 100
			expect(isAtBottom(world, entity)).toBe(false);
		});
	});

	describe('ScrollbarVisibility enum', () => {
		it('has correct values', () => {
			expect(ScrollbarVisibility.Hidden).toBe(0);
			expect(ScrollbarVisibility.Visible).toBe(1);
			expect(ScrollbarVisibility.Auto).toBe(2);
		});
	});

	describe('viewport and clamping', () => {
		describe('setViewport', () => {
			it('sets viewport dimensions', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setViewport(world, entity, 80, 20);

				expect(Scrollable.viewportWidth[entity]).toBe(80);
				expect(Scrollable.viewportHeight[entity]).toBe(20);
			});

			it('clamps scroll after setting viewport', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollY: 1000,
					scrollHeight: 500,
					clampEnabled: false, // Disable initially to set large scroll
				});
				setClampEnabled(world, entity, true);
				setViewport(world, entity, 80, 100);

				// maxScrollY = 500 - 100 = 400, so scroll should clamp to 400
				expect(Scrollable.scrollY[entity]).toBe(400);
			});

			it('returns entity for chaining', () => {
				const world = createWorld();
				const entity = addEntity(world);

				const result = setViewport(world, entity, 80, 20);

				expect(result).toBe(entity);
			});
		});

		describe('clamping behavior', () => {
			it('clamps negative scroll to 0', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollWidth: 100,
					scrollHeight: 100,
					viewportWidth: 50,
					viewportHeight: 50,
				});
				setScroll(world, entity, -50, -100);

				expect(Scrollable.scrollX[entity]).toBe(0);
				expect(Scrollable.scrollY[entity]).toBe(0);
			});

			it('clamps scroll beyond max to max', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollWidth: 200,
					scrollHeight: 500,
					viewportWidth: 80,
					viewportHeight: 100,
				});
				setScroll(world, entity, 500, 1000);

				// maxScrollX = 200 - 80 = 120
				// maxScrollY = 500 - 100 = 400
				expect(Scrollable.scrollX[entity]).toBe(120);
				expect(Scrollable.scrollY[entity]).toBe(400);
			});

			it('clamps scrollBy results', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollX: 50,
					scrollY: 200,
					scrollWidth: 200,
					scrollHeight: 500,
					viewportWidth: 80,
					viewportHeight: 100,
				});
				scrollBy(world, entity, 500, 500);

				// maxScrollX = 120, maxScrollY = 400
				expect(Scrollable.scrollX[entity]).toBe(120);
				expect(Scrollable.scrollY[entity]).toBe(400);
			});

			it('clamps to 0 when scrolling negative', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollX: 10,
					scrollY: 10,
					scrollWidth: 200,
					scrollHeight: 500,
					viewportWidth: 80,
					viewportHeight: 100,
				});
				scrollBy(world, entity, -100, -100);

				expect(Scrollable.scrollX[entity]).toBe(0);
				expect(Scrollable.scrollY[entity]).toBe(0);
			});

			it('does not clamp when clampEnabled is false', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollWidth: 100,
					scrollHeight: 100,
					viewportWidth: 50,
					viewportHeight: 50,
					clampEnabled: false,
				});
				setScroll(world, entity, 500, 500);

				expect(Scrollable.scrollX[entity]).toBe(500);
				expect(Scrollable.scrollY[entity]).toBe(500);
			});

			it('re-clamps when clamping is re-enabled', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollWidth: 100,
					scrollHeight: 100,
					viewportWidth: 50,
					viewportHeight: 50,
					clampEnabled: false,
				});
				setScroll(world, entity, 500, 500);
				setClampEnabled(world, entity, true);

				// maxScrollX = 50, maxScrollY = 50
				expect(Scrollable.scrollX[entity]).toBe(50);
				expect(Scrollable.scrollY[entity]).toBe(50);
			});

			it('handles viewport larger than content', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollWidth: 50,
					scrollHeight: 50,
					viewportWidth: 100,
					viewportHeight: 100,
				});
				setScroll(world, entity, 100, 100);

				// maxScroll = max(0, content - viewport) = 0
				expect(Scrollable.scrollX[entity]).toBe(0);
				expect(Scrollable.scrollY[entity]).toBe(0);
			});
		});

		describe('scrollToLeft and scrollToRight', () => {
			it('scrollToLeft sets scrollX to 0', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollX: 100,
					scrollWidth: 200,
					viewportWidth: 50,
				});
				scrollToLeft(world, entity);

				expect(Scrollable.scrollX[entity]).toBe(0);
			});

			it('scrollToRight sets scrollX to max', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollWidth: 200,
					viewportWidth: 50,
				});
				scrollToRight(world, entity);

				// maxScrollX = 200 - 50 = 150
				expect(Scrollable.scrollX[entity]).toBe(150);
			});
		});

		describe('isAtLeft and isAtRight', () => {
			it('isAtLeft returns true when scrollX <= 0', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, { scrollX: 0, scrollWidth: 200, viewportWidth: 50 });

				expect(isAtLeft(world, entity)).toBe(true);
			});

			it('isAtLeft returns false when scrollX > 0', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, { scrollX: 10, scrollWidth: 200, viewportWidth: 50 });

				expect(isAtLeft(world, entity)).toBe(false);
			});

			it('isAtRight returns true when at max scroll', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollX: 150,
					scrollWidth: 200,
					viewportWidth: 50,
					clampEnabled: false,
				});

				// maxScrollX = 200 - 50 = 150
				expect(isAtRight(world, entity)).toBe(true);
			});

			it('isAtRight returns false when not at max', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollX: 100,
					scrollWidth: 200,
					viewportWidth: 50,
					clampEnabled: false,
				});

				expect(isAtRight(world, entity)).toBe(false);
			});
		});

		describe('canScrollX and canScrollY', () => {
			it('canScrollX returns true when content wider than viewport', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, { scrollWidth: 200, viewportWidth: 100 });

				expect(canScrollX(world, entity)).toBe(true);
			});

			it('canScrollX returns false when content fits in viewport', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, { scrollWidth: 50, viewportWidth: 100 });

				expect(canScrollX(world, entity)).toBe(false);
			});

			it('canScrollY returns true when content taller than viewport', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, { scrollHeight: 500, viewportHeight: 100 });

				expect(canScrollY(world, entity)).toBe(true);
			});

			it('canScrollY returns false when content fits in viewport', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, { scrollHeight: 50, viewportHeight: 100 });

				expect(canScrollY(world, entity)).toBe(false);
			});
		});

		describe('getScrollPercentage with viewport', () => {
			it('returns 0% when at top', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollY: 0,
					scrollHeight: 500,
					viewportHeight: 100,
				});

				const percent = getScrollPercentage(world, entity);
				expect(percent.y).toBe(0);
			});

			it('returns 100% when at bottom', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollY: 400, // maxScrollY = 500 - 100 = 400
					scrollHeight: 500,
					viewportHeight: 100,
					clampEnabled: false,
				});

				const percent = getScrollPercentage(world, entity);
				expect(percent.y).toBe(100);
			});

			it('returns 50% when halfway', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollY: 200, // maxScrollY = 400, 50% = 200
					scrollHeight: 500,
					viewportHeight: 100,
					clampEnabled: false,
				});

				const percent = getScrollPercentage(world, entity);
				expect(percent.y).toBe(50);
			});

			it('returns 0% when content fits in viewport', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollY: 0,
					scrollHeight: 50,
					viewportHeight: 100,
				});

				const percent = getScrollPercentage(world, entity);
				expect(percent.y).toBe(0);
			});
		});

		describe('setScrollPercentage', () => {
			it('scrolls to 50%', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollHeight: 500,
					viewportHeight: 100,
				});
				setScrollPercentage(world, entity, 0, 50);

				// maxScrollY = 400, 50% = 200
				expect(Scrollable.scrollY[entity]).toBe(200);
			});

			it('scrolls to 100%', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollHeight: 500,
					viewportHeight: 100,
				});
				setScrollPercentage(world, entity, 0, 100);

				// maxScrollY = 400
				expect(Scrollable.scrollY[entity]).toBe(400);
			});

			it('scrolls to 0%', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollY: 200,
					scrollHeight: 500,
					viewportHeight: 100,
				});
				setScrollPercentage(world, entity, 0, 0);

				expect(Scrollable.scrollY[entity]).toBe(0);
			});

			it('clamps percentage to 0-100', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					scrollHeight: 500,
					viewportHeight: 100,
				});
				setScrollPercentage(world, entity, -50, 150);

				// -50% clamps to 0%, 150% clamps to 100%
				expect(Scrollable.scrollX[entity]).toBe(0);
				expect(Scrollable.scrollY[entity]).toBe(400);
			});
		});

		describe('getScrollable includes new fields', () => {
			it('returns viewport dimensions', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, {
					viewportWidth: 80,
					viewportHeight: 20,
				});

				const data = getScrollable(world, entity);

				expect(data?.viewportWidth).toBe(80);
				expect(data?.viewportHeight).toBe(20);
			});

			it('returns clampEnabled status', () => {
				const world = createWorld();
				const entity = addEntity(world);

				setScrollable(world, entity, { clampEnabled: false });

				const data = getScrollable(world, entity);

				expect(data?.clampEnabled).toBe(false);
			});
		});
	});
});
