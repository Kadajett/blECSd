import { describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import {
	BORDER_ASCII,
	BORDER_BOLD,
	BORDER_DOUBLE,
	BORDER_ROUNDED,
	BORDER_SINGLE,
	Border,
	BorderType,
	DEFAULT_BORDER_BG,
	DEFAULT_BORDER_FG,
	disableAllBorders,
	enableAllBorders,
	getBorder,
	getBorderChar,
	hasBorder,
	hasBorderVisible,
	setBorder,
	setBorderChars,
} from './border';

describe('Border component', () => {
	describe('setBorder', () => {
		it('adds Border component to entity', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line });

			expect(hasBorder(world, entity)).toBe(true);
		});

		it('sets border type', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line });

			expect(Border.type[entity]).toBe(BorderType.Line);
		});

		it('sets border type to custom', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Custom });

			expect(Border.type[entity]).toBe(BorderType.Custom);
		});

		it('sets border type to background', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Background });

			expect(Border.type[entity]).toBe(BorderType.Background);
		});

		it('enables/disables individual sides', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, {
				type: BorderType.Line,
				left: false,
				top: true,
				right: false,
				bottom: true,
			});

			expect(Border.left[entity]).toBe(0);
			expect(Border.top[entity]).toBe(1);
			expect(Border.right[entity]).toBe(0);
			expect(Border.bottom[entity]).toBe(1);
		});

		it('sets foreground color from hex string', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line, fg: '#ff0000' });

			// Expected: 0xffff0000 (alpha=255, r=255, g=0, b=0)
			expect(Border.fg[entity]).toBe(0xffff0000);
		});

		it('sets background color from hex string', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line, bg: '#00ff00' });

			expect(Border.bg[entity]).toBe(0xff00ff00);
		});

		it('sets colors from packed numbers', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, {
				type: BorderType.Line,
				fg: 0x80ff0000,
				bg: 0x8000ff00,
			});

			expect(Border.fg[entity]).toBe(0x80ff0000);
			expect(Border.bg[entity]).toBe(0x8000ff00);
		});

		it('sets border characters from preset', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line, chars: BORDER_DOUBLE });

			expect(Border.charTopLeft[entity]).toBe(BORDER_DOUBLE.topLeft);
			expect(Border.charTopRight[entity]).toBe(BORDER_DOUBLE.topRight);
			expect(Border.charBottomLeft[entity]).toBe(BORDER_DOUBLE.bottomLeft);
			expect(Border.charBottomRight[entity]).toBe(BORDER_DOUBLE.bottomRight);
			expect(Border.charHorizontal[entity]).toBe(BORDER_DOUBLE.horizontal);
			expect(Border.charVertical[entity]).toBe(BORDER_DOUBLE.vertical);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setBorder(world, entity, { type: BorderType.Line });

			expect(result).toBe(entity);
		});

		it('defaults to all sides enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line });

			expect(Border.left[entity]).toBe(1);
			expect(Border.top[entity]).toBe(1);
			expect(Border.right[entity]).toBe(1);
			expect(Border.bottom[entity]).toBe(1);
		});

		it('defaults to single border characters', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line });

			expect(Border.charTopLeft[entity]).toBe(BORDER_SINGLE.topLeft);
			expect(Border.charHorizontal[entity]).toBe(BORDER_SINGLE.horizontal);
		});

		it('defaults to standard colors', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line });

			expect(Border.fg[entity]).toBe(DEFAULT_BORDER_FG);
			expect(Border.bg[entity]).toBe(DEFAULT_BORDER_BG);
		});
	});

	describe('setBorderChars', () => {
		it('sets border characters', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorderChars(world, entity, BORDER_ROUNDED);

			expect(Border.charTopLeft[entity]).toBe(BORDER_ROUNDED.topLeft);
			expect(Border.charTopRight[entity]).toBe(BORDER_ROUNDED.topRight);
			expect(Border.charBottomLeft[entity]).toBe(BORDER_ROUNDED.bottomLeft);
			expect(Border.charBottomRight[entity]).toBe(BORDER_ROUNDED.bottomRight);
			expect(Border.charHorizontal[entity]).toBe(BORDER_ROUNDED.horizontal);
			expect(Border.charVertical[entity]).toBe(BORDER_ROUNDED.vertical);
		});

		it('adds component if not present', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorderChars(world, entity, BORDER_BOLD);

			expect(hasBorder(world, entity)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = setBorderChars(world, entity, BORDER_ASCII);

			expect(result).toBe(entity);
		});
	});

	describe('getBorder', () => {
		it('returns undefined for entity without Border', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getBorder(world, entity)).toBeUndefined();
		});

		it('returns border data', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, {
				type: BorderType.Line,
				left: true,
				top: false,
				right: true,
				bottom: false,
				fg: '#ff0000',
				bg: '#00ff00',
				chars: BORDER_DOUBLE,
			});

			const data = getBorder(world, entity);

			expect(data).toBeDefined();
			expect(data?.type).toBe(BorderType.Line);
			expect(data?.left).toBe(true);
			expect(data?.top).toBe(false);
			expect(data?.right).toBe(true);
			expect(data?.bottom).toBe(false);
			expect(data?.fg).toBe(0xffff0000);
			expect(data?.bg).toBe(0xff00ff00);
			expect(data?.charTopLeft).toBe(BORDER_DOUBLE.topLeft);
		});
	});

	describe('hasBorder', () => {
		it('returns true when entity has Border', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line });

			expect(hasBorder(world, entity)).toBe(true);
		});

		it('returns false when entity lacks Border', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasBorder(world, entity)).toBe(false);
		});
	});

	describe('hasBorderVisible', () => {
		it('returns false for entity without Border', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(hasBorderVisible(world, entity)).toBe(false);
		});

		it('returns false when type is None', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.None });

			expect(hasBorderVisible(world, entity)).toBe(false);
		});

		it('returns true when type is Line and sides enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line });

			expect(hasBorderVisible(world, entity)).toBe(true);
		});

		it('returns false when all sides disabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, {
				type: BorderType.Line,
				left: false,
				top: false,
				right: false,
				bottom: false,
			});

			expect(hasBorderVisible(world, entity)).toBe(false);
		});

		it('returns true when at least one side enabled', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, {
				type: BorderType.Line,
				left: false,
				top: true,
				right: false,
				bottom: false,
			});

			expect(hasBorderVisible(world, entity)).toBe(true);
		});
	});

	describe('enableAllBorders', () => {
		it('enables all sides', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, {
				type: BorderType.Line,
				left: false,
				top: false,
				right: false,
				bottom: false,
			});

			enableAllBorders(world, entity);

			expect(Border.left[entity]).toBe(1);
			expect(Border.top[entity]).toBe(1);
			expect(Border.right[entity]).toBe(1);
			expect(Border.bottom[entity]).toBe(1);
		});

		it('adds component if not present', () => {
			const world = createWorld();
			const entity = addEntity(world);

			enableAllBorders(world, entity);

			expect(hasBorder(world, entity)).toBe(true);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = enableAllBorders(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('disableAllBorders', () => {
		it('disables all sides', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line });
			disableAllBorders(world, entity);

			expect(Border.left[entity]).toBe(0);
			expect(Border.top[entity]).toBe(0);
			expect(Border.right[entity]).toBe(0);
			expect(Border.bottom[entity]).toBe(0);
		});

		it('returns entity for chaining', () => {
			const world = createWorld();
			const entity = addEntity(world);

			const result = disableAllBorders(world, entity);

			expect(result).toBe(entity);
		});
	});

	describe('getBorderChar', () => {
		it('returns undefined for entity without Border', () => {
			const world = createWorld();
			const entity = addEntity(world);

			expect(getBorderChar(world, entity, 'topLeft')).toBeUndefined();
		});

		it('returns correct character for each position', () => {
			const world = createWorld();
			const entity = addEntity(world);

			setBorder(world, entity, { type: BorderType.Line, chars: BORDER_DOUBLE });

			expect(getBorderChar(world, entity, 'topLeft')).toBe(BORDER_DOUBLE.topLeft);
			expect(getBorderChar(world, entity, 'topRight')).toBe(BORDER_DOUBLE.topRight);
			expect(getBorderChar(world, entity, 'bottomLeft')).toBe(BORDER_DOUBLE.bottomLeft);
			expect(getBorderChar(world, entity, 'bottomRight')).toBe(BORDER_DOUBLE.bottomRight);
			expect(getBorderChar(world, entity, 'horizontal')).toBe(BORDER_DOUBLE.horizontal);
			expect(getBorderChar(world, entity, 'vertical')).toBe(BORDER_DOUBLE.vertical);
		});
	});

	describe('border presets', () => {
		it('BORDER_SINGLE has correct characters', () => {
			expect(BORDER_SINGLE.topLeft).toBe(0x250c); // ┌
			expect(BORDER_SINGLE.topRight).toBe(0x2510); // ┐
			expect(BORDER_SINGLE.bottomLeft).toBe(0x2514); // └
			expect(BORDER_SINGLE.bottomRight).toBe(0x2518); // ┘
			expect(BORDER_SINGLE.horizontal).toBe(0x2500); // ─
			expect(BORDER_SINGLE.vertical).toBe(0x2502); // │
		});

		it('BORDER_DOUBLE has correct characters', () => {
			expect(BORDER_DOUBLE.topLeft).toBe(0x2554); // ╔
			expect(BORDER_DOUBLE.topRight).toBe(0x2557); // ╗
			expect(BORDER_DOUBLE.bottomLeft).toBe(0x255a); // ╚
			expect(BORDER_DOUBLE.bottomRight).toBe(0x255d); // ╝
			expect(BORDER_DOUBLE.horizontal).toBe(0x2550); // ═
			expect(BORDER_DOUBLE.vertical).toBe(0x2551); // ║
		});

		it('BORDER_ROUNDED has correct characters', () => {
			expect(BORDER_ROUNDED.topLeft).toBe(0x256d); // ╭
			expect(BORDER_ROUNDED.topRight).toBe(0x256e); // ╮
			expect(BORDER_ROUNDED.bottomLeft).toBe(0x2570); // ╰
			expect(BORDER_ROUNDED.bottomRight).toBe(0x256f); // ╯
			expect(BORDER_ROUNDED.horizontal).toBe(0x2500); // ─
			expect(BORDER_ROUNDED.vertical).toBe(0x2502); // │
		});

		it('BORDER_BOLD has correct characters', () => {
			expect(BORDER_BOLD.topLeft).toBe(0x250f); // ┏
			expect(BORDER_BOLD.topRight).toBe(0x2513); // ┓
			expect(BORDER_BOLD.bottomLeft).toBe(0x2517); // ┗
			expect(BORDER_BOLD.bottomRight).toBe(0x251b); // ┛
			expect(BORDER_BOLD.horizontal).toBe(0x2501); // ━
			expect(BORDER_BOLD.vertical).toBe(0x2503); // ┃
		});

		it('BORDER_ASCII has correct characters', () => {
			expect(BORDER_ASCII.topLeft).toBe(0x2b); // +
			expect(BORDER_ASCII.topRight).toBe(0x2b); // +
			expect(BORDER_ASCII.bottomLeft).toBe(0x2b); // +
			expect(BORDER_ASCII.bottomRight).toBe(0x2b); // +
			expect(BORDER_ASCII.horizontal).toBe(0x2d); // -
			expect(BORDER_ASCII.vertical).toBe(0x7c); // |
		});
	});

	describe('BorderType enum', () => {
		it('has correct values', () => {
			expect(BorderType.None).toBe(0);
			expect(BorderType.Line).toBe(1);
			expect(BorderType.Background).toBe(2);
			expect(BorderType.Custom).toBe(3);
		});
	});
});
