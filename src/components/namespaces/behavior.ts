/**
 * Behavior component namespace.
 *
 * Provides all operations for AI behavior patterns (chase, flee, patrol, idle).
 *
 * @example
 * ```typescript
 * import { behavior } from 'blecsd/components';
 * behavior.setChase(world, eid, targetEid, speed);
 * behavior.setPatrol(world, eid, route);
 * ```
 */
import {
	computeChaseDirection,
	computeFleeDirection,
	computePatrolDirection,
	executeCustomBehavior,
	getBehavior,
	getBehaviorState,
	getBehaviorTarget,
	getBehaviorType,
	getCurrentPatrolPoint,
	getPatrolRoute,
	hasBehavior,
	isBehaviorActive,
	isBehaviorCompleted,
	isBehaviorWaiting,
	removeBehavior,
	resetBehaviorStore,
	setBehavior,
	setBehaviorSpeed,
	setBehaviorTarget,
	setChase,
	setCustomBehavior,
	setDetectionRange,
	setFlee,
	setIdle,
	setPatrol,
	updateBehaviorTimer,
} from '../behavior';

export const behavior = Object.freeze({
	get: getBehavior,
	has: hasBehavior,
	set: setBehavior,
	remove: removeBehavior,

	getType: getBehaviorType,
	getState: getBehaviorState,
	getTarget: getBehaviorTarget,
	setTarget: setBehaviorTarget,
	setSpeed: setBehaviorSpeed,
	setDetectionRange,

	isActive: isBehaviorActive,
	isCompleted: isBehaviorCompleted,
	isWaiting: isBehaviorWaiting,

	setChase,
	setFlee,
	setPatrol,
	setIdle,
	setCustom: setCustomBehavior,
	executeCustom: executeCustomBehavior,

	compute: Object.freeze({
		chase: computeChaseDirection,
		flee: computeFleeDirection,
		patrol: computePatrolDirection,
	}),

	patrol: Object.freeze({
		getRoute: getPatrolRoute,
		getCurrentPoint: getCurrentPatrolPoint,
	}),

	updateTimer: updateBehaviorTimer,
	resetStore: resetBehaviorStore,
});

export type BehaviorModule = typeof behavior;
