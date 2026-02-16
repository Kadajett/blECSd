/**
 * Collision system namespace.
 *
 * @example
 * ```typescript
 * import { collisionSys } from 'blecsd/systems';
 * const world = createWorld();
 * collisionSys.register(world);
 * collisionSys.detect(world);
 * const isHit = collisionSys.areColliding(world, eid1, eid2);
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

export const collisionSys = Object.freeze({
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

export type CollisionSysModule = typeof collisionSys;
