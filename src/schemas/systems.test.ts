import { describe, expect, it } from 'vitest';
import {
	ComputedLayoutSchema,
	DragConstraintsSchema,
	EntityBoundsSchema,
	FocusEventTypeSchema,
	OutputStateSchema,
	QueuedInputEventSchema,
	QueuedKeyEventSchema,
	QueuedMouseEventSchema,
} from './systems';

describe('Systems Schemas', () => {
	describe('DragConstraintsSchema', () => {
		it('should accept valid constraints', () => {
			expect(() =>
				DragConstraintsSchema.parse({
					constrainToParent: true,
					constrainAxis: 'x',
					snapToGrid: { x: 10, y: 10 },
					minX: 0,
					maxX: 100,
					minY: 0,
					maxY: 50,
					bringToFront: true,
					frontZIndex: 1000,
				}),
			).not.toThrow();
		});

		it('should accept empty constraints', () => {
			expect(() => DragConstraintsSchema.parse({})).not.toThrow();
		});

		it('should accept null axis', () => {
			expect(() => DragConstraintsSchema.parse({ constrainAxis: null })).not.toThrow();
		});

		it('should reject invalid axis', () => {
			expect(() => DragConstraintsSchema.parse({ constrainAxis: 'z' })).toThrow();
		});

		it('should reject minX > maxX', () => {
			expect(() => DragConstraintsSchema.parse({ minX: 100, maxX: 0 })).toThrow();
		});

		it('should reject minY > maxY', () => {
			expect(() => DragConstraintsSchema.parse({ minY: 100, maxY: 0 })).toThrow();
		});

		it('should reject z-index out of range', () => {
			expect(() => DragConstraintsSchema.parse({ frontZIndex: -1 })).toThrow();
			expect(() => DragConstraintsSchema.parse({ frontZIndex: 70000 })).toThrow();
		});

		it('should reject non-positive grid snap values', () => {
			expect(() => DragConstraintsSchema.parse({ snapToGrid: { x: 0, y: 10 } })).toThrow();
		});
	});

	describe('QueuedKeyEventSchema', () => {
		it('should accept valid key events', () => {
			expect(() => QueuedKeyEventSchema.parse({ type: 'key', key: 'a' })).not.toThrow();
		});

		it('should reject wrong type', () => {
			expect(() => QueuedKeyEventSchema.parse({ type: 'mouse', key: 'a' })).toThrow();
		});
	});

	describe('QueuedMouseEventSchema', () => {
		it('should accept valid mouse events', () => {
			expect(() =>
				QueuedMouseEventSchema.parse({ type: 'mouse', action: 'click', x: 10, y: 20 }),
			).not.toThrow();
		});

		it('should reject negative coordinates', () => {
			expect(() =>
				QueuedMouseEventSchema.parse({ type: 'mouse', action: 'click', x: -1, y: 0 }),
			).toThrow();
		});
	});

	describe('QueuedInputEventSchema', () => {
		it('should accept key events', () => {
			expect(() => QueuedInputEventSchema.parse({ type: 'key', key: 'enter' })).not.toThrow();
		});

		it('should accept mouse events', () => {
			expect(() =>
				QueuedInputEventSchema.parse({ type: 'mouse', action: 'click', x: 0, y: 0 }),
			).not.toThrow();
		});
	});

	describe('OutputStateSchema', () => {
		it('should accept valid state', () => {
			expect(() =>
				OutputStateSchema.parse({
					lastX: 0,
					lastY: 0,
					lastFg: 0xffffffff,
					lastBg: 0x000000ff,
					lastAttrs: 0,
					alternateScreen: false,
				}),
			).not.toThrow();
		});

		it('should reject negative coordinates', () => {
			expect(() =>
				OutputStateSchema.parse({
					lastX: -1,
					lastY: 0,
					lastFg: 0,
					lastBg: 0,
					lastAttrs: 0,
					alternateScreen: false,
				}),
			).toThrow();
		});
	});

	describe('ComputedLayoutSchema', () => {
		it('should accept valid layout', () => {
			expect(() =>
				ComputedLayoutSchema.parse({ x: 10, y: 20, width: 80, height: 24 }),
			).not.toThrow();
		});

		it('should reject negative dimensions', () => {
			expect(() => ComputedLayoutSchema.parse({ x: 0, y: 0, width: -1, height: 24 })).toThrow();
		});
	});

	describe('EntityBoundsSchema', () => {
		it('should accept valid bounds', () => {
			expect(() =>
				EntityBoundsSchema.parse({ x: 0, y: 0, width: 10, height: 5, z: 100 }),
			).not.toThrow();
		});

		it('should reject z out of range', () => {
			expect(() =>
				EntityBoundsSchema.parse({ x: 0, y: 0, width: 10, height: 5, z: 70000 }),
			).toThrow();
		});
	});

	describe('FocusEventTypeSchema', () => {
		it('should accept focus', () => {
			expect(() => FocusEventTypeSchema.parse('focus')).not.toThrow();
		});

		it('should accept blur', () => {
			expect(() => FocusEventTypeSchema.parse('blur')).not.toThrow();
		});

		it('should reject invalid types', () => {
			expect(() => FocusEventTypeSchema.parse('click')).toThrow();
		});
	});
});
