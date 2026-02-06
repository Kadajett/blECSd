/**
 * Behavior system for processing AI behaviors each frame.
 *
 * Integrates with the Behavior component to update patrol movement,
 * chase/flee logic, custom behaviors, and wait timers.
 *
 * @module systems/behaviorSystem
 */

import {
	Behavior,
	BehaviorType,
	computeChaseDirection,
	computeFleeDirection,
	computePatrolDirection,
	executeCustomBehavior,
	hasBehavior,
	updateBehaviorTimer,
} from '../components/behavior';
import { hasPosition, Position } from '../components/position';
import { hasComponent } from '../core/ecs';
import type { Entity, System, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Position resolver function for getting entity positions.
 * Allows the behavior system to work with any position storage.
 */
export type PositionResolver = (world: World, eid: Entity) => { x: number; y: number } | undefined;

/**
 * Movement applier function for applying computed movement.
 * Allows the behavior system to work with any movement system.
 */
export type MovementApplier = (
	world: World,
	eid: Entity,
	dx: number,
	dy: number,
	delta: number,
) => void;

/**
 * Configuration for the behavior system.
 */
export interface BehaviorSystemConfig {
	/** Function to resolve entity positions (default: uses Position component) */
	getPosition?: PositionResolver;
	/** Function to apply movement (default: directly modifies Position) */
	applyMovement?: MovementApplier;
	/** Function to get delta time */
	getDelta: () => number;
}

// =============================================================================
// DEFAULT IMPLEMENTATIONS
// =============================================================================

/**
 * Default position resolver using the Position component.
 */
function defaultGetPosition(world: World, eid: Entity): { x: number; y: number } | undefined {
	if (!hasPosition(world, eid)) {
		return undefined;
	}
	return {
		x: Position.x[eid] as number,
		y: Position.y[eid] as number,
	};
}

/**
 * Default movement applier that directly modifies Position.
 */
function defaultApplyMovement(
	world: World,
	eid: Entity,
	dx: number,
	dy: number,
	delta: number,
): void {
	if (!hasComponent(world, eid, Position)) {
		return;
	}
	Position.x[eid] = (Position.x[eid] as number) + dx * delta;
	Position.y[eid] = (Position.y[eid] as number) + dy * delta;
}

// =============================================================================
// SYSTEM
// =============================================================================

/**
 * Creates a behavior system that processes all entities with Behavior components.
 *
 * The system computes movement directions for patrol, chase, and flee behaviors,
 * and applies them via the configured movement applier.
 *
 * @param config - System configuration
 * @param entities - Function returning entity IDs to process
 * @returns A system function
 *
 * @example
 * ```typescript
 * import { createBehaviorSystem } from 'blecsd';
 *
 * const behaviorSystem = createBehaviorSystem({
 *   getDelta: () => 1/60,
 * }, () => behaviorEntities);
 *
 * // In update loop
 * behaviorSystem(world);
 * ```
 */
export function createBehaviorSystem(
	config: BehaviorSystemConfig,
	entities: (world: World) => readonly Entity[],
): System {
	const getPos = config.getPosition ?? defaultGetPosition;
	const applyMove = config.applyMovement ?? defaultApplyMovement;

	return (world: World): World => {
		const delta = config.getDelta();
		const eids = entities(world);

		for (const eid of eids) {
			if (!hasBehavior(world, eid)) {
				continue;
			}

			updateBehaviorTimer(world, eid, delta);
			processBehavior(world, eid, delta, getPos, applyMove);
		}

		return world;
	};
}

/**
 * Processes a single entity's behavior.
 */
function processBehavior(
	world: World,
	eid: Entity,
	delta: number,
	getPos: PositionResolver,
	applyMove: MovementApplier,
): void {
	const behaviorType = Behavior.behaviorType[eid] as number;

	if (behaviorType === BehaviorType.Idle) {
		return;
	}

	if (behaviorType === BehaviorType.Custom) {
		executeCustomBehavior(world, eid, delta);
		return;
	}

	const pos = getPos(world, eid);
	if (!pos) {
		return;
	}

	if (behaviorType === BehaviorType.Patrol) {
		processPatrol(world, eid, pos.x, pos.y, delta, applyMove);
		return;
	}

	const targetEid = Behavior.targetEntity[eid] as number;
	if (targetEid === 0) {
		return;
	}

	const targetPos = getPos(world, targetEid as Entity);
	if (!targetPos) {
		return;
	}

	if (behaviorType === BehaviorType.Chase) {
		processChase(world, eid, pos.x, pos.y, targetPos.x, targetPos.y, delta, applyMove);
	} else if (behaviorType === BehaviorType.Flee) {
		processFlee(world, eid, pos.x, pos.y, targetPos.x, targetPos.y, delta, applyMove);
	}
}

/**
 * Processes patrol behavior for a single entity.
 */
function processPatrol(
	world: World,
	eid: Entity,
	x: number,
	y: number,
	delta: number,
	applyMove: MovementApplier,
): void {
	const dir = computePatrolDirection(world, eid, x, y, delta);
	if (dir && (dir.dx !== 0 || dir.dy !== 0)) {
		applyMove(world, eid, dir.dx, dir.dy, delta);
	}
}

/**
 * Processes chase behavior for a single entity.
 */
function processChase(
	world: World,
	eid: Entity,
	x: number,
	y: number,
	tx: number,
	ty: number,
	delta: number,
	applyMove: MovementApplier,
): void {
	const dir = computeChaseDirection(world, eid, x, y, tx, ty);
	if (dir && (dir.dx !== 0 || dir.dy !== 0)) {
		applyMove(world, eid, dir.dx, dir.dy, delta);
	}
}

/**
 * Processes flee behavior for a single entity.
 */
function processFlee(
	world: World,
	eid: Entity,
	x: number,
	y: number,
	tx: number,
	ty: number,
	delta: number,
	applyMove: MovementApplier,
): void {
	const dir = computeFleeDirection(world, eid, x, y, tx, ty);
	if (dir && (dir.dx !== 0 || dir.dy !== 0)) {
		applyMove(world, eid, dir.dx, dir.dy, delta);
	}
}
