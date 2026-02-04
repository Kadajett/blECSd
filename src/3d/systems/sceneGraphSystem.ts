/**
 * Scene graph system: computes world matrices from local transforms and parent hierarchy.
 *
 * Processes all entities with Transform3D that are dirty, composing local TRS
 * (translation, rotation, scale) into a world matrix. For entities with parents,
 * the world matrix is the product of the parent's world matrix and the local matrix.
 *
 * @module 3d/systems/sceneGraphSystem
 */

import { hasComponent, query } from 'bitecs';
import { getChildren, Hierarchy, NULL_ENTITY } from '../../components/hierarchy';
import type { Entity, System, World } from '../../core/types';
import { Transform3D } from '../components/transform3d';
import type { Mat4 } from '../math/mat4';
import { mat4FromTRS, mat4Multiply } from '../math/mat4';
import { vec3 } from '../math/vec3';

/**
 * Build the local TRS matrix from a Transform3D entity's data.
 */
function buildLocalMatrix(eid: Entity): Mat4 {
	const translation = vec3(
		Transform3D.tx[eid] as number,
		Transform3D.ty[eid] as number,
		Transform3D.tz[eid] as number,
	);
	const rotation = vec3(
		Transform3D.rx[eid] as number,
		Transform3D.ry[eid] as number,
		Transform3D.rz[eid] as number,
	);
	const scale = vec3(
		Transform3D.sx[eid] as number,
		Transform3D.sy[eid] as number,
		Transform3D.sz[eid] as number,
	);
	return mat4FromTRS(translation, rotation, scale);
}

/**
 * Write a Mat4 into the Transform3D.worldMatrix at the correct offset.
 */
function writeWorldMatrix(eid: Entity, matrix: Mat4): void {
	const offset = eid * 16;
	for (let i = 0; i < 16; i++) {
		Transform3D.worldMatrix[offset + i] = matrix[i] as number;
	}
}

/**
 * Recursively process an entity and its children for world matrix computation.
 * Parent must be processed before children.
 */
function processEntity(world: World, eid: Entity, parentWorldMatrix: Mat4 | null): void {
	if (!hasComponent(world, eid, Transform3D)) {
		return;
	}

	const isDirty = Transform3D.dirty[eid] !== 0;

	if (isDirty) {
		const localMatrix = buildLocalMatrix(eid);

		const worldMatrix = parentWorldMatrix
			? mat4Multiply(parentWorldMatrix, localMatrix)
			: localMatrix;

		writeWorldMatrix(eid, worldMatrix);
		Transform3D.dirty[eid] = 0;
	}

	// Get current world matrix for passing to children
	const offset = eid * 16;
	const currentWorld = Transform3D.worldMatrix.subarray(offset, offset + 16) as Mat4;

	// Process children if this entity has hierarchy
	if (hasComponent(world, eid, Hierarchy)) {
		const children = getChildren(world, eid);
		for (const child of children) {
			// If parent was dirty, mark children dirty too
			if (isDirty && hasComponent(world, child, Transform3D)) {
				Transform3D.dirty[child] = 1;
			}
			processEntity(world, child, currentWorld);
		}
	}
}

/**
 * Scene graph system that computes world matrices from Transform3D + Hierarchy.
 *
 * Processing order: depth-first, parent before children.
 * Only dirty entities and their descendants are recomputed.
 *
 * @param world - ECS world
 * @returns The world (unmodified reference)
 *
 * @example
 * ```typescript
 * import { sceneGraphSystem } from 'blecsd/3d/systems';
 *
 * // Run manually
 * sceneGraphSystem(world);
 *
 * // Or register with scheduler
 * registerSceneGraphSystem(scheduler);
 * ```
 */
export const sceneGraphSystem: System = (world: World): World => {
	// Query all entities with Transform3D
	const entities = query(world, [Transform3D]) as Entity[];

	// Find root entities (no parent or parent doesn't have Transform3D)
	const roots: Entity[] = [];
	for (const eid of entities) {
		if (!hasComponent(world, eid, Hierarchy)) {
			// No hierarchy component = root
			roots.push(eid);
			continue;
		}
		const parent = Hierarchy.parent[eid] as number;
		if (parent === NULL_ENTITY || !hasComponent(world, parent as Entity, Transform3D)) {
			roots.push(eid);
		}
	}

	// Process tree depth-first from roots
	for (const root of roots) {
		processEntity(world, root, null);
	}

	return world;
};
