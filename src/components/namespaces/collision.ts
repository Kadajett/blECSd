/**
 * Collision component namespace.
 *
 * Provides all operations for collision detection and collider management.
 *
 * @example
 * ```typescript
 * import { collision } from 'blecsd/components';
 * collision.set(world, eid, { type: ColliderType.AABB, width: 16, height: 16 });
 * const hit = collision.test(world, eid1, eid2);
 * ```
 */
import {
	canLayersCollide,
	collisionPairKey,
	createCollisionPair,
	getCollider,
	getColliderAABB,
	hasCollider,
	isTrigger,
	removeCollider,
	setCollider,
	setCollisionLayer,
	setCollisionMask,
	setTrigger,
	testAABBOverlap,
	testCircleAABBOverlap,
	testCircleOverlap,
	testCollision,
} from '../collision';

export const collision = Object.freeze({
	get: getCollider,
	has: hasCollider,
	set: setCollider,
	remove: removeCollider,
	getAABB: getColliderAABB,

	test: testCollision,
	testAABB: testAABBOverlap,
	testCircle: testCircleOverlap,
	testCircleAABB: testCircleAABBOverlap,

	isTrigger,
	setTrigger,

	setLayer: setCollisionLayer,
	setMask: setCollisionMask,
	canLayersCollide,

	createPair: createCollisionPair,
	pairKey: collisionPairKey,
});

export type CollisionModule = typeof collision;
