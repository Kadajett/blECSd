/**
 * Zod validation schemas for system configuration and boundaries.
 * @module schemas/systems
 */

import { z } from 'zod';

// =============================================================================
// DRAG SYSTEM
// =============================================================================

/**
 * Schema for grid snap configuration.
 */
export const SnapToGridSchema = z
	.object({
		x: z.number().positive(),
		y: z.number().positive(),
	})
	.nullable();

/**
 * Schema for drag constraint configuration.
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
 */
export const QueuedKeyEventSchema = z.object({
	type: z.literal('key'),
	key: z.string(),
	raw: z.string().optional(),
});

/**
 * Schema for queued mouse event data.
 */
export const QueuedMouseEventSchema = z.object({
	type: z.literal('mouse'),
	action: z.string(),
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
	button: z.string().optional(),
});

/**
 * Schema for queued input events (union).
 */
export const QueuedInputEventSchema = z.discriminatedUnion('type', [
	QueuedKeyEventSchema,
	QueuedMouseEventSchema,
]);

// =============================================================================
// OUTPUT SYSTEM
// =============================================================================

/**
 * Schema for output state tracking.
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
 * Schema for computed layout data.
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
 * Schema for entity bounds used in rendering.
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
 * Schema for focus event types.
 */
export const FocusEventTypeSchema = z.enum(['focus', 'blur']);
