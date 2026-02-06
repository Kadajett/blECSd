/**
 * Zod validation schemas for system configuration and boundaries.
 * @module schemas/systems
 */

import { z } from 'zod';

// =============================================================================
// DRAG SYSTEM
// =============================================================================

/**
 * Schema for grid snap configuration (positive x/y step sizes).
 *
 * @example
 * ```typescript
 * import { SnapToGridSchema } from 'blecsd';
 *
 * const snap = SnapToGridSchema.parse({ x: 10, y: 10 });
 * ```
 */
export const SnapToGridSchema = z
	.object({
		x: z.number().positive(),
		y: z.number().positive(),
	})
	.nullable();

/**
 * Schema for drag constraint configuration with axis locking, bounds, and grid snapping.
 *
 * @example
 * ```typescript
 * import { DragConstraintsSchema } from 'blecsd';
 *
 * const constraints = DragConstraintsSchema.parse({
 *   constrainToParent: true,
 *   constrainAxis: 'x',
 *   minX: 0, maxX: 100,
 * });
 * ```
 */
export const DragConstraintsSchema = z
	.object({
		constrainToParent: z.boolean().optional(),
		constrainAxis: z.enum(['x', 'y']).nullable().optional(),
		snapToGrid: SnapToGridSchema.optional(),
		minX: z.number().finite().optional(),
		maxX: z.number().finite().optional(),
		minY: z.number().finite().optional(),
		maxY: z.number().finite().optional(),
		bringToFront: z.boolean().optional(),
		frontZIndex: z.number().int().min(0).max(65535).optional(),
	})
	.refine(
		(data) => {
			if (data.minX !== undefined && data.maxX !== undefined) {
				return data.minX <= data.maxX;
			}
			return true;
		},
		{ message: 'minX must be <= maxX' },
	)
	.refine(
		(data) => {
			if (data.minY !== undefined && data.maxY !== undefined) {
				return data.minY <= data.maxY;
			}
			return true;
		},
		{ message: 'minY must be <= maxY' },
	);

// =============================================================================
// INPUT SYSTEM
// =============================================================================

/**
 * Schema for queued key event data.
 *
 * @example
 * ```typescript
 * import { QueuedKeyEventSchema } from 'blecsd';
 *
 * const event = QueuedKeyEventSchema.parse({ type: 'key', key: 'enter' });
 * ```
 */
export const QueuedKeyEventSchema = z.object({
	type: z.literal('key'),
	key: z.string(),
	raw: z.string().optional(),
});

/**
 * Schema for queued mouse event data.
 *
 * @example
 * ```typescript
 * import { QueuedMouseEventSchema } from 'blecsd';
 *
 * const event = QueuedMouseEventSchema.parse({
 *   type: 'mouse', action: 'click', x: 10, y: 20,
 * });
 * ```
 */
export const QueuedMouseEventSchema = z.object({
	type: z.literal('mouse'),
	action: z.string(),
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
	button: z.string().optional(),
});

/**
 * Schema for queued input events — discriminated union of key and mouse events.
 *
 * @example
 * ```typescript
 * import { QueuedInputEventSchema } from 'blecsd';
 *
 * const event = QueuedInputEventSchema.parse({ type: 'key', key: 'a' });
 * ```
 */
export const QueuedInputEventSchema = z.discriminatedUnion('type', [
	QueuedKeyEventSchema,
	QueuedMouseEventSchema,
]);

// =============================================================================
// OUTPUT SYSTEM
// =============================================================================

/**
 * Schema for output state tracking (cursor position, colors, screen mode).
 *
 * @example
 * ```typescript
 * import { OutputStateSchema } from 'blecsd';
 *
 * const state = OutputStateSchema.parse({
 *   lastX: 0, lastY: 0,
 *   lastFg: 0xffffffff, lastBg: 0x000000ff,
 *   lastAttrs: 0, alternateScreen: false,
 * });
 * ```
 */
export const OutputStateSchema = z.object({
	lastX: z.number().int().nonnegative(),
	lastY: z.number().int().nonnegative(),
	lastFg: z.number().int().nonnegative(),
	lastBg: z.number().int().nonnegative(),
	lastAttrs: z.number().int().nonnegative(),
	alternateScreen: z.boolean(),
});

// =============================================================================
// LAYOUT SYSTEM
// =============================================================================

/**
 * Schema for computed layout data (position + dimensions).
 *
 * @example
 * ```typescript
 * import { ComputedLayoutSchema } from 'blecsd';
 *
 * const layout = ComputedLayoutSchema.parse({ x: 10, y: 5, width: 80, height: 24 });
 * ```
 */
export const ComputedLayoutSchema = z.object({
	x: z.number().finite(),
	y: z.number().finite(),
	width: z.number().finite().nonnegative(),
	height: z.number().finite().nonnegative(),
});

// =============================================================================
// RENDER SYSTEM
// =============================================================================

/**
 * Schema for entity bounds used in rendering (position, size, z-order).
 *
 * @example
 * ```typescript
 * import { EntityBoundsSchema } from 'blecsd';
 *
 * const bounds = EntityBoundsSchema.parse({ x: 0, y: 0, width: 40, height: 12, z: 10 });
 * ```
 */
export const EntityBoundsSchema = z.object({
	x: z.number().finite(),
	y: z.number().finite(),
	width: z.number().finite().nonnegative(),
	height: z.number().finite().nonnegative(),
	z: z.number().int().min(0).max(65535),
});

// =============================================================================
// FOCUS SYSTEM
// =============================================================================

/**
 * Schema for focus event types ('focus' | 'blur').
 *
 * @example
 * ```typescript
 * import { FocusEventTypeSchema } from 'blecsd';
 *
 * const type = FocusEventTypeSchema.parse('focus');
 * ```
 */
export const FocusEventTypeSchema = z.enum(['focus', 'blur']);
