import { describe, expect, it } from 'vitest';
import {
	AnimationFrameSchema,
	AnimationOptionsSchema,
	DimensionConstraintsSchema,
	DimensionValueSchema,
	ListBehaviorOptionsSchema,
	ListItemSchema,
	PaddingOptionsSchema,
	PaddingValueSchema,
	ScrollableOptionsSchema,
	SetDimensionsSchema,
	SetPositionSchema,
	SliderPercentageSchema,
	SliderRangeSchema,
	SliderStepSchema,
	StyleColorSchema,
	StyleOptionsSchema,
	ZIndexSchema,
} from './components';

describe('Component Schemas', () => {
	describe('SetPositionSchema', () => {
		it('should accept valid positions', () => {
			expect(() => SetPositionSchema.parse({ x: 10, y: 20 })).not.toThrow();
			expect(() => SetPositionSchema.parse({ x: 0, y: 0 })).not.toThrow();
			expect(() => SetPositionSchema.parse({ x: -5, y: 10 })).not.toThrow();
		});

		it('should accept optional z', () => {
			expect(() => SetPositionSchema.parse({ x: 0, y: 0, z: 100 })).not.toThrow();
		});

		it('should reject non-finite values', () => {
			expect(() => SetPositionSchema.parse({ x: Infinity, y: 0 })).toThrow();
			expect(() => SetPositionSchema.parse({ x: 0, y: NaN })).toThrow();
		});

		it('should reject z out of range', () => {
			expect(() => SetPositionSchema.parse({ x: 0, y: 0, z: -1 })).toThrow();
			expect(() => SetPositionSchema.parse({ x: 0, y: 0, z: 70000 })).toThrow();
		});
	});

	describe('ZIndexSchema', () => {
		it('should accept valid z-index values', () => {
			expect(() => ZIndexSchema.parse(0)).not.toThrow();
			expect(() => ZIndexSchema.parse(100)).not.toThrow();
			expect(() => ZIndexSchema.parse(65535)).not.toThrow();
		});

		it('should reject out of range', () => {
			expect(() => ZIndexSchema.parse(-1)).toThrow();
			expect(() => ZIndexSchema.parse(65536)).toThrow();
		});

		it('should reject floats', () => {
			expect(() => ZIndexSchema.parse(1.5)).toThrow();
		});
	});

	describe('DimensionValueSchema', () => {
		it('should accept numbers', () => {
			expect(() => DimensionValueSchema.parse(100)).not.toThrow();
			expect(() => DimensionValueSchema.parse(0)).not.toThrow();
		});

		it('should accept percentage strings', () => {
			expect(() => DimensionValueSchema.parse('50%')).not.toThrow();
			expect(() => DimensionValueSchema.parse('100%')).not.toThrow();
		});

		it('should accept auto', () => {
			expect(() => DimensionValueSchema.parse('auto')).not.toThrow();
		});

		it('should reject invalid strings', () => {
			expect(() => DimensionValueSchema.parse('50px')).toThrow();
		});
	});

	describe('SetDimensionsSchema', () => {
		it('should accept valid dimensions', () => {
			expect(() => SetDimensionsSchema.parse({ width: 80, height: 24 })).not.toThrow();
			expect(() => SetDimensionsSchema.parse({ width: '50%', height: 'auto' })).not.toThrow();
		});
	});

	describe('DimensionConstraintsSchema', () => {
		it('should accept valid constraints', () => {
			expect(() => DimensionConstraintsSchema.parse({ minWidth: 10, maxWidth: 100 })).not.toThrow();
		});

		it('should accept empty constraints', () => {
			expect(() => DimensionConstraintsSchema.parse({})).not.toThrow();
		});

		it('should reject minWidth > maxWidth', () => {
			expect(() => DimensionConstraintsSchema.parse({ minWidth: 100, maxWidth: 10 })).toThrow();
		});

		it('should reject minHeight > maxHeight', () => {
			expect(() => DimensionConstraintsSchema.parse({ minHeight: 100, maxHeight: 10 })).toThrow();
		});
	});

	describe('PaddingValueSchema', () => {
		it('should accept 0-255', () => {
			expect(() => PaddingValueSchema.parse(0)).not.toThrow();
			expect(() => PaddingValueSchema.parse(255)).not.toThrow();
		});

		it('should reject out of range', () => {
			expect(() => PaddingValueSchema.parse(-1)).toThrow();
			expect(() => PaddingValueSchema.parse(256)).toThrow();
		});
	});

	describe('PaddingOptionsSchema', () => {
		it('should accept padding object', () => {
			expect(() =>
				PaddingOptionsSchema.parse({ left: 1, top: 2, right: 1, bottom: 2 }),
			).not.toThrow();
		});

		it('should accept partial padding', () => {
			expect(() => PaddingOptionsSchema.parse({ left: 1 })).not.toThrow();
		});
	});

	describe('StyleColorSchema', () => {
		it('should accept hex strings', () => {
			expect(() => StyleColorSchema.parse('#ff0000')).not.toThrow();
			expect(() => StyleColorSchema.parse('#fff')).not.toThrow();
		});

		it('should accept packed numbers', () => {
			expect(() => StyleColorSchema.parse(0xff0000ff)).not.toThrow();
		});

		it('should reject invalid hex', () => {
			expect(() => StyleColorSchema.parse('#xyz')).toThrow();
		});
	});

	describe('StyleOptionsSchema', () => {
		it('should accept valid style options', () => {
			expect(() =>
				StyleOptionsSchema.parse({
					fg: '#ff0000',
					bg: 0x000000ff,
					bold: true,
					underline: false,
					opacity: 0.8,
				}),
			).not.toThrow();
		});

		it('should accept empty options', () => {
			expect(() => StyleOptionsSchema.parse({})).not.toThrow();
		});

		it('should reject opacity out of range', () => {
			expect(() => StyleOptionsSchema.parse({ opacity: 1.5 })).toThrow();
		});
	});

	describe('ScrollableOptionsSchema', () => {
		it('should accept valid options', () => {
			expect(() =>
				ScrollableOptionsSchema.parse({
					scrollX: 0,
					scrollY: 10,
					scrollWidth: 100,
					scrollHeight: 200,
				}),
			).not.toThrow();
		});

		it('should accept empty options', () => {
			expect(() => ScrollableOptionsSchema.parse({})).not.toThrow();
		});

		it('should reject negative scroll dimensions', () => {
			expect(() => ScrollableOptionsSchema.parse({ scrollWidth: -1 })).toThrow();
		});
	});

	describe('AnimationFrameSchema', () => {
		it('should accept valid frames', () => {
			expect(() => AnimationFrameSchema.parse({ frameIndex: 0, duration: 100 })).not.toThrow();
		});

		it('should reject negative frame index', () => {
			expect(() => AnimationFrameSchema.parse({ frameIndex: -1, duration: 100 })).toThrow();
		});

		it('should reject non-positive duration', () => {
			expect(() => AnimationFrameSchema.parse({ frameIndex: 0, duration: 0 })).toThrow();
		});
	});

	describe('AnimationOptionsSchema', () => {
		it('should accept valid options', () => {
			expect(() =>
				AnimationOptionsSchema.parse({
					name: 'spin',
					frames: [{ frameIndex: 0, duration: 100 }],
				}),
			).not.toThrow();
		});

		it('should reject empty name', () => {
			expect(() =>
				AnimationOptionsSchema.parse({
					name: '',
					frames: [{ frameIndex: 0, duration: 100 }],
				}),
			).toThrow();
		});

		it('should reject empty frames array', () => {
			expect(() => AnimationOptionsSchema.parse({ name: 'spin', frames: [] })).toThrow();
		});
	});

	describe('SliderRangeSchema', () => {
		it('should accept valid range', () => {
			expect(() => SliderRangeSchema.parse({ min: 0, max: 100 })).not.toThrow();
		});

		it('should reject min >= max', () => {
			expect(() => SliderRangeSchema.parse({ min: 100, max: 100 })).toThrow();
			expect(() => SliderRangeSchema.parse({ min: 200, max: 100 })).toThrow();
		});
	});

	describe('SliderStepSchema', () => {
		it('should accept positive numbers', () => {
			expect(() => SliderStepSchema.parse(1)).not.toThrow();
			expect(() => SliderStepSchema.parse(0.5)).not.toThrow();
		});

		it('should reject zero or negative', () => {
			expect(() => SliderStepSchema.parse(0)).toThrow();
			expect(() => SliderStepSchema.parse(-1)).toThrow();
		});
	});

	describe('SliderPercentageSchema', () => {
		it('should accept 0-1', () => {
			expect(() => SliderPercentageSchema.parse(0)).not.toThrow();
			expect(() => SliderPercentageSchema.parse(0.5)).not.toThrow();
			expect(() => SliderPercentageSchema.parse(1)).not.toThrow();
		});

		it('should reject out of range', () => {
			expect(() => SliderPercentageSchema.parse(-0.1)).toThrow();
			expect(() => SliderPercentageSchema.parse(1.1)).toThrow();
		});
	});

	describe('ListBehaviorOptionsSchema', () => {
		it('should accept valid options', () => {
			expect(() =>
				ListBehaviorOptionsSchema.parse({
					interactive: true,
					mouse: true,
					keys: true,
					selectedIndex: 0,
				}),
			).not.toThrow();
		});

		it('should accept -1 selectedIndex', () => {
			expect(() => ListBehaviorOptionsSchema.parse({ selectedIndex: -1 })).not.toThrow();
		});

		it('should reject selectedIndex below -1', () => {
			expect(() => ListBehaviorOptionsSchema.parse({ selectedIndex: -2 })).toThrow();
		});
	});

	describe('ListItemSchema', () => {
		it('should accept valid items', () => {
			expect(() => ListItemSchema.parse({ text: 'Option 1' })).not.toThrow();
			expect(() =>
				ListItemSchema.parse({ text: 'Option 1', value: 'opt1', disabled: false }),
			).not.toThrow();
		});
	});
});
