import { describe, expect, it } from 'vitest';
import {
	FilePathSchema,
	IntervalSchema,
	OpacitySchema,
	PackedColorSchema,
	SpeedMultiplierSchema,
	TextAlignSchema,
	TreePathSchema,
	VAlignSchema,
	WidgetBorderSchema,
	WidgetColorSchema,
	WidgetDimensionSchema,
	WidgetPaddingSchema,
	WidgetPositionSchema,
} from './widgets';

describe('Widget Schemas', () => {
	describe('PackedColorSchema', () => {
		it('should accept valid packed colors', () => {
			expect(() => PackedColorSchema.parse(0x000000ff)).not.toThrow();
			expect(() => PackedColorSchema.parse(0xffffffff)).not.toThrow();
			expect(() => PackedColorSchema.parse(0)).not.toThrow();
		});

		it('should reject negative values', () => {
			expect(() => PackedColorSchema.parse(-1)).toThrow();
		});

		it('should reject values over 0xFFFFFFFF', () => {
			expect(() => PackedColorSchema.parse(0xffffffff + 1)).toThrow();
		});
	});

	describe('WidgetColorSchema', () => {
		it('should accept hex strings', () => {
			expect(() => WidgetColorSchema.parse('#ff0000')).not.toThrow();
			expect(() => WidgetColorSchema.parse('#fff')).not.toThrow();
			expect(() => WidgetColorSchema.parse('#ff0000ff')).not.toThrow();
		});

		it('should accept packed numbers', () => {
			expect(() => WidgetColorSchema.parse(0xff0000ff)).not.toThrow();
		});

		it('should reject invalid hex', () => {
			expect(() => WidgetColorSchema.parse('#xyz')).toThrow();
		});
	});

	describe('WidgetDimensionSchema', () => {
		it('should accept positive numbers', () => {
			expect(() => WidgetDimensionSchema.parse(80)).not.toThrow();
		});

		it('should accept percentage strings', () => {
			expect(() => WidgetDimensionSchema.parse('50%')).not.toThrow();
		});

		it('should accept auto', () => {
			expect(() => WidgetDimensionSchema.parse('auto')).not.toThrow();
		});

		it('should reject zero', () => {
			expect(() => WidgetDimensionSchema.parse(0)).toThrow();
		});

		it('should reject negative', () => {
			expect(() => WidgetDimensionSchema.parse(-10)).toThrow();
		});
	});

	describe('WidgetPositionSchema', () => {
		it('should accept numbers', () => {
			expect(() => WidgetPositionSchema.parse(10)).not.toThrow();
			expect(() => WidgetPositionSchema.parse(0)).not.toThrow();
		});

		it('should accept percentage strings', () => {
			expect(() => WidgetPositionSchema.parse('50%')).not.toThrow();
		});

		it('should accept keywords', () => {
			expect(() => WidgetPositionSchema.parse('center')).not.toThrow();
			expect(() => WidgetPositionSchema.parse('left')).not.toThrow();
		});
	});

	describe('IntervalSchema', () => {
		it('should accept valid intervals', () => {
			expect(() => IntervalSchema.parse(100)).not.toThrow();
			expect(() => IntervalSchema.parse(1000)).not.toThrow();
		});

		it('should reject too small intervals', () => {
			expect(() => IntervalSchema.parse(5)).toThrow();
		});

		it('should reject too large intervals', () => {
			expect(() => IntervalSchema.parse(100000)).toThrow();
		});
	});

	describe('SpeedMultiplierSchema', () => {
		it('should accept valid multipliers', () => {
			expect(() => SpeedMultiplierSchema.parse(1)).not.toThrow();
			expect(() => SpeedMultiplierSchema.parse(0.5)).not.toThrow();
		});

		it('should reject too small', () => {
			expect(() => SpeedMultiplierSchema.parse(0.01)).toThrow();
		});

		it('should reject too large', () => {
			expect(() => SpeedMultiplierSchema.parse(100)).toThrow();
		});
	});

	describe('FilePathSchema', () => {
		it('should accept valid paths', () => {
			expect(() => FilePathSchema.parse('/usr/bin/test')).not.toThrow();
			expect(() => FilePathSchema.parse('./relative/path')).not.toThrow();
		});

		it('should reject empty strings', () => {
			expect(() => FilePathSchema.parse('')).toThrow();
		});

		it('should reject null bytes', () => {
			expect(() => FilePathSchema.parse('/path/with\x00null')).toThrow();
		});
	});

	describe('TextAlignSchema', () => {
		it('should accept left, center, right', () => {
			expect(() => TextAlignSchema.parse('left')).not.toThrow();
			expect(() => TextAlignSchema.parse('center')).not.toThrow();
			expect(() => TextAlignSchema.parse('right')).not.toThrow();
		});

		it('should reject invalid values', () => {
			expect(() => TextAlignSchema.parse('justify')).toThrow();
		});
	});

	describe('VAlignSchema', () => {
		it('should accept top, middle, bottom', () => {
			expect(() => VAlignSchema.parse('top')).not.toThrow();
			expect(() => VAlignSchema.parse('middle')).not.toThrow();
			expect(() => VAlignSchema.parse('bottom')).not.toThrow();
		});
	});

	describe('WidgetBorderSchema', () => {
		it('should accept boolean', () => {
			expect(() => WidgetBorderSchema.parse(true)).not.toThrow();
			expect(() => WidgetBorderSchema.parse(false)).not.toThrow();
		});

		it('should accept object config', () => {
			expect(() => WidgetBorderSchema.parse({ type: 'line', fg: '#ff0000' })).not.toThrow();
		});

		it('should accept undefined', () => {
			expect(() => WidgetBorderSchema.parse(undefined)).not.toThrow();
		});
	});

	describe('WidgetPaddingSchema', () => {
		it('should accept number', () => {
			expect(() => WidgetPaddingSchema.parse(2)).not.toThrow();
		});

		it('should accept object', () => {
			expect(() =>
				WidgetPaddingSchema.parse({ left: 1, top: 2, right: 1, bottom: 2 }),
			).not.toThrow();
		});

		it('should reject padding > 255', () => {
			expect(() => WidgetPaddingSchema.parse(256)).toThrow();
		});
	});

	describe('OpacitySchema', () => {
		it('should accept 0-1', () => {
			expect(() => OpacitySchema.parse(0)).not.toThrow();
			expect(() => OpacitySchema.parse(0.5)).not.toThrow();
			expect(() => OpacitySchema.parse(1)).not.toThrow();
		});

		it('should reject out of range', () => {
			expect(() => OpacitySchema.parse(-0.1)).toThrow();
			expect(() => OpacitySchema.parse(1.1)).toThrow();
		});
	});

	describe('TreePathSchema', () => {
		it('should accept valid paths', () => {
			expect(() => TreePathSchema.parse('/root/child')).not.toThrow();
		});

		it('should reject empty strings', () => {
			expect(() => TreePathSchema.parse('')).toThrow();
		});

		it('should reject null bytes', () => {
			expect(() => TreePathSchema.parse('path\x00hack')).toThrow();
		});
	});
});
