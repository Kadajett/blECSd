/**
 * Collision system namespace.
 *
 * @example
 * ```typescript
 * import { collision } from 'blecsd/systems';
 * const world = createWorld();
 * collision.register(world);
 * collision.detect(world);
 * const isHit = collision.areColliding(world, eid1, eid2);
 * ```
 */
import {
	areColliding,
	collisionSystem,
	createCollisionSystem,
	detectCollisions,
	getActiveCollisionCount,
	getActiveCollisions,
	getActiveTriggerCount,
	getActiveTriggers,
	getCollidingEntities,
	getCollisionEventBus,
	getTriggerZones,
	isColliding,
	isInTrigger,
	queryColliders,
	registerCollisionSystem,
	resetCollisionState,
} from '../collisionSystem';

export const collision = Object.freeze({
	create: createCollisionSystem,
	register: registerCollisionSystem,
	system: collisionSystem,
	detect: detectCollisions,
	areColliding,
	isColliding,
	isInTrigger,
	query: queryColliders,
	getActiveCollisions,
	getActiveCollisionCount,
	getActiveTriggers,
	getActiveTriggerCount,
	getCollidingEntities,
	getTriggerZones,
	getEventBus: getCollisionEventBus,
	reset: resetCollisionState,
});

export type CollisionSystemModule = typeof collision;
