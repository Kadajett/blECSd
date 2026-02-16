/**
 * Movement system namespace.
 *
 * @example
 * ```typescript
 * import { movementSys } from 'blecsd/systems';
 * const world = createWorld();
 * movementSys.register(world);
 * movementSys.update(world);
 * const movers = movementSys.query(world);
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

export const movementSys = Object.freeze({
	create: createMovementSystem,
	register: registerMovementSystem,
	system: movementSystem,
	has: hasMovementSystem,
	query: queryMovement,
	update: updateMovements,
});

export type MovementSysModule = typeof movementSys;
