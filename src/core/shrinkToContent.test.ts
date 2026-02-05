import { beforeEach, describe, expect, it } from 'vitest';
import { BorderType, setBorder } from '../components/border';
import { resetContentStore, setContent } from '../components/content';
import { Dimensions, setConstraints, setDimensions, setShrink } from '../components/dimensions';
import { setPadding, setPaddingAll } from '../components/padding';
import { addEntity, createWorld } from '../core/ecs';
import {
	applyShrink,
	calculateShrinkSize,
	getShrinkBox,
	getShrinkHeight,
	getShrinkWidth,
} from './shrinkToContent';

describe('shrinkToContent', () => {
	beforeEach(() => {
		resetContentStore();
	});

	describe('getShrinkWidth', () => {
		it('returns 0 for entity without content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getShrinkWidth(world, entity)).toBe(0);
		});

		it('returns content width', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');

			expect(getShrinkWidth(world, entity)).toBe(5);
		});

		it('returns width of widest line', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hi\nHello World\nBye');

			expect(getShrinkWidth(world, entity)).toBe(11); // "Hello World" length
		});

		it('includes padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			setPaddingAll(world, entity, 1); // 1 on each side = 2 total horizontal

			expect(getShrinkWidth(world, entity)).toBe(7); // 5 content + 2 padding
		});

		it('includes border', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			setBorder(world, entity, { type: BorderType.Line });

			expect(getShrinkWidth(world, entity)).toBe(7); // 5 content + 2 border
		});

		it('includes both padding and border', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			setPaddingAll(world, entity, 1);
			setBorder(world, entity, { type: BorderType.Line });

			expect(getShrinkWidth(world, entity)).toBe(9); // 5 content + 2 padding + 2 border
		});

		it('handles empty string', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, '');

			expect(getShrinkWidth(world, entity)).toBe(0);
		});
	});

	describe('getShrinkHeight', () => {
		it('returns 0 for entity without content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getShrinkHeight(world, entity)).toBe(0);
		});

		it('returns 1 for single line', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');

			expect(getShrinkHeight(world, entity)).toBe(1);
		});

		it('returns line count for multi-line content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Line 1\nLine 2\nLine 3');

			expect(getShrinkHeight(world, entity)).toBe(3);
		});

		it('includes padding', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			setPaddingAll(world, entity, 1);

			expect(getShrinkHeight(world, entity)).toBe(3); // 1 content + 2 padding
		});

		it('includes border', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			setBorder(world, entity, { type: BorderType.Line });

			expect(getShrinkHeight(world, entity)).toBe(3); // 1 content + 2 border
		});

		it('wraps text when maxWidth provided', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello World');

			// With width 6, "Hello World" wraps to 2 lines
			expect(getShrinkHeight(world, entity, 6)).toBe(2);
		});

		it('handles empty string', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, '');

			expect(getShrinkHeight(world, entity)).toBe(1); // Empty string splits to 1 element
		});
	});

	describe('getShrinkBox', () => {
		it('returns width and height', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello\nWorld');

			const box = getShrinkBox(world, entity);
			expect(box.width).toBe(5);
			expect(box.height).toBe(2);
		});

		it('returns zeros for entity without content', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const box = getShrinkBox(world, entity);
			expect(box.width).toBe(0);
			expect(box.height).toBe(0);
		});

		it('includes chrome in both dimensions', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hi');
			setPaddingAll(world, entity, 1);
			setBorder(world, entity, { type: BorderType.Line });

			const box = getShrinkBox(world, entity);
			expect(box.width).toBe(6); // 2 content + 2 padding + 2 border
			expect(box.height).toBe(5); // 1 content + 2 padding + 2 border
		});
	});

	describe('applyShrink', () => {
		it('returns false when shrink not enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			setDimensions(world, entity, 100, 100);

			expect(applyShrink(world, entity)).toBe(false);
		});

		it('returns false when no dimensions component', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			setShrink(world, entity, true);

			expect(applyShrink(world, entity)).toBe(true);
		});

		it('applies shrink dimensions', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello\nWorld');
			setDimensions(world, entity, 100, 100);
			setShrink(world, entity, true);

			applyShrink(world, entity);

			expect(Dimensions.width[entity]).toBe(5);
			expect(Dimensions.height[entity]).toBe(2);
		});

		it('respects minWidth constraint', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hi');
			setDimensions(world, entity, 100, 100);
			setConstraints(world, entity, { minWidth: 10 });
			setShrink(world, entity, true);

			applyShrink(world, entity);

			expect(Dimensions.width[entity]).toBe(10);
		});

		it('respects maxWidth constraint', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'This is a very long line');
			setDimensions(world, entity, 100, 100);
			setConstraints(world, entity, { maxWidth: 10 });
			setShrink(world, entity, true);

			applyShrink(world, entity);

			expect(Dimensions.width[entity]).toBe(10);
		});

		it('respects minHeight constraint', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hi');
			setDimensions(world, entity, 100, 100);
			setConstraints(world, entity, { minHeight: 5 });
			setShrink(world, entity, true);

			applyShrink(world, entity);

			expect(Dimensions.height[entity]).toBe(5);
		});

		it('respects maxHeight constraint', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9\nL10');
			setDimensions(world, entity, 100, 100);
			setConstraints(world, entity, { maxHeight: 5 });
			setShrink(world, entity, true);

			applyShrink(world, entity);

			expect(Dimensions.height[entity]).toBe(5);
		});
	});

	describe('calculateShrinkSize', () => {
		it('returns undefined without dimensions component', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');

			expect(calculateShrinkSize(world, entity)).toBeUndefined();
		});

		it('returns calculated size', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello\nWorld');
			setDimensions(world, entity, 100, 100);

			const size = calculateShrinkSize(world, entity);
			expect(size).toBeDefined();
			expect(size?.width).toBe(5);
			expect(size?.height).toBe(2);
		});

		it('applies constraints', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hi');
			setDimensions(world, entity, 100, 100);
			setConstraints(world, entity, { minWidth: 10, minHeight: 5 });

			const size = calculateShrinkSize(world, entity);
			expect(size?.width).toBe(10);
			expect(size?.height).toBe(5);
		});

		it('does not modify dimensions', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hello');
			setDimensions(world, entity, 100, 100);

			calculateShrinkSize(world, entity);

			expect(Dimensions.width[entity]).toBe(100);
			expect(Dimensions.height[entity]).toBe(100);
		});
	});

	describe('with ANSI codes', () => {
		it('calculates width ignoring ANSI codes', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, '\x1b[31mHello\x1b[0m');

			expect(getShrinkWidth(world, entity)).toBe(5); // Just "Hello"
		});
	});

	describe('with horizontal padding only', () => {
		it('adds horizontal padding to width', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hi');
			setPadding(world, entity, { left: 2, right: 3 });

			expect(getShrinkWidth(world, entity)).toBe(7); // 2 content + 2 left + 3 right
		});

		it('does not add horizontal padding to height', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hi');
			setPadding(world, entity, { left: 2, right: 3 });

			expect(getShrinkHeight(world, entity)).toBe(1);
		});
	});

	describe('with vertical padding only', () => {
		it('adds vertical padding to height', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hi');
			setPadding(world, entity, { top: 1, bottom: 2 });

			expect(getShrinkHeight(world, entity)).toBe(4); // 1 content + 1 top + 2 bottom
		});

		it('does not add vertical padding to width', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setContent(world, entity, 'Hi');
			setPadding(world, entity, { top: 1, bottom: 2 });

			expect(getShrinkWidth(world, entity)).toBe(2);
		});
	});
});
