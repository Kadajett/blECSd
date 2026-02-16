/**
 * Movement system namespace.
 *
 * @example
 * ```typescript
 * import { movement } from 'blecsd/systems';
 * const world = createWorld();
 * movement.register(world);
 * movement.update(world);
 * const movers = movement.query(world);
 * ```
 */
import {
	createMovementSystem,
	hasMovementSystem,
	movementSystem,
	queryMovement,
	registerMovementSystem,
	updateMovements,
} from '../movementSystem';

export const movement = Object.freeze({
	create: createMovementSystem,
	register: registerMovementSystem,
	system: movementSystem,
	has: hasMovementSystem,
	query: queryMovement,
	update: updateMovements,
});

export type MovementSystemModule = typeof movement;
