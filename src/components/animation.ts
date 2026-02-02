/**
 * Animation component for sprite animation control.
 * Manages playback state, timing, and frame sequencing.
 * @module components/animation
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from '../core/types';
import { Sprite, setFrame } from './sprite';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// ANIMATION DEFINITION TYPES
// =============================================================================

/**
 * A single frame in an animation sequence.
 */
export interface AnimationFrame {
	/** Sprite frame index to display */
	frameIndex: number;
	/** Duration in seconds to display this frame */
	duration: number;
}

/**
 * Complete animation definition stored in the animation store.
 */
export interface AnimationDefinition {
	/** Unique identifier for this animation */
	readonly id: number;
	/** Human-readable name for the animation */
	readonly name: string;
	/** Sequence of frames with their durations */
	readonly frames: readonly AnimationFrame[];
	/** Total duration of one cycle in seconds */
	readonly totalDuration: number;
}

/**
 * Options for creating a new animation.
 */
export interface AnimationOptions {
	/** Human-readable name for the animation */
	name: string;
	/** Sequence of frames with their durations */
	frames: AnimationFrame[];
}

// =============================================================================
// ANIMATION STORE (for animation definitions)
// =============================================================================

let nextAnimationId = 1;

/**
 * Storage for animation definitions.
 * Maps animation IDs to their frame sequence data.
 *
 * @example
 * ```typescript
 * import { animationStore, registerAnimation, getAnimation } from 'blecsd';
 *
 * // Register an animation
 * const walkId = registerAnimation({
 *   name: 'walk',
 *   frames: [
 *     { frameIndex: 0, duration: 0.1 },
 *     { frameIndex: 1, duration: 0.1 },
 *     { frameIndex: 2, duration: 0.1 },
 *     { frameIndex: 3, duration: 0.1 },
 *   ],
 * });
 *
 * // Get animation data
 * const anim = getAnimation(walkId);
 * console.log(anim?.totalDuration); // 0.4
 * ```
 */
export const animationStore = {
	/** Map of animation ID to definition */
	animations: new Map<number, AnimationDefinition>(),
	/** Map of animation name to ID for lookup */
	nameToId: new Map<string, number>(),
};

/**
 * Resets the animation store to initial state.
 * Useful for testing.
 */
export function resetAnimationStore(): void {
	animationStore.animations.clear();
	animationStore.nameToId.clear();
	nextAnimationId = 1;
}

/**
 * Registers a new animation and returns its ID.
 *
 * @param options - Animation configuration
 * @returns The animation ID
 *
 * @example
 * ```typescript
 * import { registerAnimation } from 'blecsd';
 *
 * // Simple looping animation
 * const idleId = registerAnimation({
 *   name: 'idle',
 *   frames: [
 *     { frameIndex: 0, duration: 0.5 },
 *     { frameIndex: 1, duration: 0.5 },
 *   ],
 * });
 *
 * // Animation with varying frame durations
 * const attackId = registerAnimation({
 *   name: 'attack',
 *   frames: [
 *     { frameIndex: 0, duration: 0.05 }, // Wind up fast
 *     { frameIndex: 1, duration: 0.1 },  // Strike
 *     { frameIndex: 2, duration: 0.2 },  // Follow through slow
 *   ],
 * });
 * ```
 */
export function registerAnimation(options: AnimationOptions): number {
	const id = nextAnimationId++;

	// Calculate total duration
	const totalDuration = options.frames.reduce((sum, f) => sum + f.duration, 0);

	const definition: AnimationDefinition = {
		id,
		name: options.name,
		frames: options.frames,
		totalDuration,
	};

	animationStore.animations.set(id, definition);
	animationStore.nameToId.set(options.name, id);

	return id;
}

/**
 * Gets an animation by ID.
 *
 * @param id - The animation ID
 * @returns The animation definition or undefined if not found
 */
export function getAnimation(id: number): AnimationDefinition | undefined {
	return animationStore.animations.get(id);
}

/**
 * Gets an animation by name.
 *
 * @param name - The animation name
 * @returns The animation definition or undefined if not found
 */
export function getAnimationByName(name: string): AnimationDefinition | undefined {
	const id = animationStore.nameToId.get(name);
	if (id === undefined) {
		return undefined;
	}
	return animationStore.animations.get(id);
}

/**
 * Gets an animation ID by name.
 *
 * @param name - The animation name
 * @returns The animation ID or undefined if not found
 */
export function getAnimationIdByName(name: string): number | undefined {
	return animationStore.nameToId.get(name);
}

/**
 * Unregisters an animation.
 *
 * @param id - The animation ID to remove
 * @returns true if removed, false if not found
 */
export function unregisterAnimation(id: number): boolean {
	const anim = animationStore.animations.get(id);
	if (!anim) {
		return false;
	}
	animationStore.nameToId.delete(anim.name);
	animationStore.animations.delete(id);
	return true;
}

// =============================================================================
// ANIMATION COMPONENT (per-entity state)
// =============================================================================

/** Animation playback direction */
export enum AnimationDirection {
	/** Play frames in forward order */
	FORWARD = 1,
	/** Play frames in reverse order */
	REVERSE = -1,
}

/**
 * Animation component store using SoA (Structure of Arrays) for performance.
 *
 * - `animationId`: Reference to animation definition in animationStore
 * - `playing`: 0=stopped, 1=playing
 * - `loop`: 0=play once, 1=loop continuously
 * - `speed`: Playback speed multiplier (1.0 = normal)
 * - `elapsed`: Time elapsed in current frame
 * - `currentFrameIndex`: Current position in animation frames array
 * - `direction`: 1=forward, -1=reverse
 *
 * @example
 * ```typescript
 * import { Animation, playAnimation, stopAnimation, isAnimationPlaying } from 'blecsd';
 *
 * // Play an animation on an entity
 * playAnimation(world, entity, walkAnimId);
 *
 * // Check if playing
 * if (isAnimationPlaying(world, entity)) {
 *   // Animation is running
 * }
 *
 * // Stop animation
 * stopAnimation(world, entity);
 * ```
 */
export const Animation = {
	/** Reference to animation definition ID in animationStore */
	animationId: new Uint32Array(DEFAULT_CAPACITY),
	/** 0 = stopped, 1 = playing */
	playing: new Uint8Array(DEFAULT_CAPACITY),
	/** 0 = play once, 1 = loop */
	loop: new Uint8Array(DEFAULT_CAPACITY),
	/** Playback speed multiplier (1.0 = normal) */
	speed: new Float32Array(DEFAULT_CAPACITY),
	/** Time elapsed in current frame (seconds) */
	elapsed: new Float32Array(DEFAULT_CAPACITY),
	/** Current position in animation frames array */
	currentFrameIndex: new Uint16Array(DEFAULT_CAPACITY),
	/** 1 = forward, -1 = reverse (stored as signed) */
	direction: new Int8Array(DEFAULT_CAPACITY),
};

/**
 * Animation component data returned by getAnimationData.
 */
export interface AnimationData {
	/** Animation definition ID */
	readonly animationId: number;
	/** Whether animation is playing */
	readonly playing: boolean;
	/** Whether animation loops */
	readonly loop: boolean;
	/** Playback speed multiplier */
	readonly speed: number;
	/** Time elapsed in current frame */
	readonly elapsed: number;
	/** Current frame index in animation sequence */
	readonly currentFrameIndex: number;
	/** Playback direction */
	readonly direction: AnimationDirection;
}

/**
 * Options for playing an animation.
 */
export interface PlayAnimationOptions {
	/** Loop the animation (default: true) */
	loop?: boolean;
	/** Playback speed multiplier (default: 1.0) */
	speed?: number;
	/** Playback direction (default: FORWARD) */
	direction?: AnimationDirection;
	/** Starting frame index (default: 0 or last frame if reverse) */
	startFrame?: number;
}

/**
 * Initializes animation component with default values.
 */
function initAnimation(eid: Entity): void {
	Animation.animationId[eid] = 0;
	Animation.playing[eid] = 0;
	Animation.loop[eid] = 1;
	Animation.speed[eid] = 1.0;
	Animation.elapsed[eid] = 0;
	Animation.currentFrameIndex[eid] = 0;
	Animation.direction[eid] = AnimationDirection.FORWARD;
}

/**
 * Plays an animation on an entity.
 * Adds the Animation component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param animationId - The animation ID from registerAnimation()
 * @param options - Playback options
 * @returns The entity ID for chaining, or undefined if animation not found
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from 'bitecs';
 * import { registerAnimation, playAnimation, setSprite } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Setup sprite first
 * setSprite(world, entity, spriteId);
 *
 * // Register and play animation
 * const walkId = registerAnimation({
 *   name: 'walk',
 *   frames: [
 *     { frameIndex: 0, duration: 0.1 },
 *     { frameIndex: 1, duration: 0.1 },
 *   ],
 * });
 *
 * playAnimation(world, entity, walkId, { loop: true });
 * ```
 */
export function playAnimation(
	world: World,
	eid: Entity,
	animationId: number,
	options: PlayAnimationOptions = {},
): Entity | undefined {
	const anim = getAnimation(animationId);
	if (!anim || anim.frames.length === 0) {
		return undefined;
	}

	if (!hasComponent(world, eid, Animation)) {
		addComponent(world, eid, Animation);
		initAnimation(eid);
	}

	const { loop = true, speed = 1.0, direction = AnimationDirection.FORWARD, startFrame } = options;

	// Determine starting frame
	let initialFrame = startFrame;
	if (initialFrame === undefined) {
		initialFrame = direction === AnimationDirection.FORWARD ? 0 : anim.frames.length - 1;
	}
	initialFrame = Math.max(0, Math.min(initialFrame, anim.frames.length - 1));

	Animation.animationId[eid] = animationId;
	Animation.playing[eid] = 1;
	Animation.loop[eid] = loop ? 1 : 0;
	Animation.speed[eid] = speed;
	Animation.elapsed[eid] = 0;
	Animation.currentFrameIndex[eid] = initialFrame;
	Animation.direction[eid] = direction;

	// Set initial sprite frame
	const frame = anim.frames[initialFrame];
	if (frame && hasComponent(world, eid, Sprite)) {
		setFrame(world, eid, frame.frameIndex);
	}

	return eid;
}

/**
 * Plays an animation by name.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param animationName - The animation name
 * @param options - Playback options
 * @returns The entity ID for chaining, or undefined if animation not found
 *
 * @example
 * ```typescript
 * import { playAnimationByName } from 'blecsd';
 *
 * playAnimationByName(world, entity, 'walk', { loop: true });
 * ```
 */
export function playAnimationByName(
	world: World,
	eid: Entity,
	animationName: string,
	options: PlayAnimationOptions = {},
): Entity | undefined {
	const id = getAnimationIdByName(animationName);
	if (id === undefined) {
		return undefined;
	}
	return playAnimation(world, eid, id, options);
}

/**
 * Stops the current animation.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { stopAnimation } from 'blecsd';
 *
 * stopAnimation(world, entity);
 * ```
 */
export function stopAnimation(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Animation)) {
		Animation.playing[eid] = 0;
		Animation.elapsed[eid] = 0;
		Animation.currentFrameIndex[eid] = 0;
	}
	return eid;
}

/**
 * Pauses the current animation without resetting position.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { pauseAnimation, resumeAnimation } from 'blecsd';
 *
 * pauseAnimation(world, entity);
 * // Later...
 * resumeAnimation(world, entity);
 * ```
 */
export function pauseAnimation(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Animation)) {
		Animation.playing[eid] = 0;
	}
	return eid;
}

/**
 * Resumes a paused animation.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function resumeAnimation(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Animation)) {
		Animation.playing[eid] = 1;
	}
	return eid;
}

/**
 * Gets the animation data of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Animation data or undefined
 *
 * @example
 * ```typescript
 * import { getAnimationData } from 'blecsd';
 *
 * const anim = getAnimationData(world, entity);
 * if (anim?.playing) {
 *   console.log(`Frame ${anim.currentFrameIndex}, elapsed: ${anim.elapsed}s`);
 * }
 * ```
 */
export function getAnimationData(world: World, eid: Entity): AnimationData | undefined {
	if (!hasComponent(world, eid, Animation)) {
		return undefined;
	}
	return {
		animationId: Animation.animationId[eid] as number,
		playing: Animation.playing[eid] === 1,
		loop: Animation.loop[eid] === 1,
		speed: Animation.speed[eid] as number,
		elapsed: Animation.elapsed[eid] as number,
		currentFrameIndex: Animation.currentFrameIndex[eid] as number,
		direction: Animation.direction[eid] as AnimationDirection,
	};
}

/**
 * Checks if an entity is currently playing an animation.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if animation is playing
 */
export function isAnimationPlaying(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Animation)) {
		return false;
	}
	return Animation.playing[eid] === 1;
}

/**
 * Checks if an entity has an Animation component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Animation component
 */
export function hasAnimation(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Animation);
}

/**
 * Sets the animation speed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param speed - Speed multiplier (1.0 = normal, 2.0 = double speed)
 * @returns The entity ID for chaining
 */
export function setAnimationSpeed(world: World, eid: Entity, speed: number): Entity {
	if (hasComponent(world, eid, Animation)) {
		Animation.speed[eid] = speed;
	}
	return eid;
}

/**
 * Sets whether the animation should loop.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param loop - true to loop, false to play once
 * @returns The entity ID for chaining
 */
export function setAnimationLoop(world: World, eid: Entity, loop: boolean): Entity {
	if (hasComponent(world, eid, Animation)) {
		Animation.loop[eid] = loop ? 1 : 0;
	}
	return eid;
}

/**
 * Sets the animation playback direction.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param direction - Playback direction
 * @returns The entity ID for chaining
 */
export function setAnimationDirection(
	world: World,
	eid: Entity,
	direction: AnimationDirection,
): Entity {
	if (hasComponent(world, eid, Animation)) {
		Animation.direction[eid] = direction;
	}
	return eid;
}

/**
 * Gets the current animation definition for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The animation definition or undefined
 */
export function getEntityAnimation(world: World, eid: Entity): AnimationDefinition | undefined {
	if (!hasComponent(world, eid, Animation)) {
		return undefined;
	}
	const animId = Animation.animationId[eid] as number;
	return getAnimation(animId);
}

/**
 * Removes the animation component from an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function removeAnimation(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Animation)) {
		Animation.animationId[eid] = 0;
		Animation.playing[eid] = 0;
		Animation.loop[eid] = 1;
		Animation.speed[eid] = 1.0;
		Animation.elapsed[eid] = 0;
		Animation.currentFrameIndex[eid] = 0;
		Animation.direction[eid] = AnimationDirection.FORWARD;
	}
	return eid;
}

/**
 * Advances forward animation frame.
 * @returns true if animation completed (non-looping)
 * @internal
 */
function advanceForward(
	eid: Entity,
	nextFrameIdx: number,
	frameCount: number,
	loop: boolean,
): boolean {
	if (nextFrameIdx >= frameCount) {
		if (loop) {
			Animation.currentFrameIndex[eid] = 0;
			return false;
		}
		Animation.playing[eid] = 0;
		Animation.currentFrameIndex[eid] = frameCount - 1;
		return true;
	}
	Animation.currentFrameIndex[eid] = nextFrameIdx;
	return false;
}

/**
 * Advances reverse animation frame.
 * @returns true if animation completed (non-looping)
 * @internal
 */
function advanceReverse(
	eid: Entity,
	nextFrameIdx: number,
	frameCount: number,
	loop: boolean,
): boolean {
	if (nextFrameIdx < 0) {
		if (loop) {
			Animation.currentFrameIndex[eid] = frameCount - 1;
			return false;
		}
		Animation.playing[eid] = 0;
		Animation.currentFrameIndex[eid] = 0;
		return true;
	}
	Animation.currentFrameIndex[eid] = nextFrameIdx;
	return false;
}

/**
 * Synchronizes sprite frame with animation frame.
 * @internal
 */
function syncSpriteFrame(world: World, eid: Entity, frames: readonly AnimationFrame[]): void {
	const newFrameIdx = Animation.currentFrameIndex[eid] as number;
	const newFrame = frames[newFrameIdx];
	if (newFrame && hasComponent(world, eid, Sprite)) {
		setFrame(world, eid, newFrame.frameIndex);
	}
}

/**
 * Updates animation state for a single entity.
 * Called by the animation system, but can be used manually.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param deltaTime - Time elapsed in seconds
 * @returns true if animation completed (for non-looping animations)
 *
 * @example
 * ```typescript
 * import { updateAnimationEntity } from 'blecsd';
 *
 * // Manual update (typically use the system instead)
 * const completed = updateAnimationEntity(world, entity, 0.016);
 * if (completed) {
 *   console.log('Animation finished');
 * }
 * ```
 */
export function updateAnimationEntity(world: World, eid: Entity, deltaTime: number): boolean {
	if (!hasComponent(world, eid, Animation)) {
		return false;
	}
	if (Animation.playing[eid] !== 1) {
		return false;
	}

	const animId = Animation.animationId[eid] as number;
	const anim = getAnimation(animId);
	if (!anim || anim.frames.length === 0) {
		return false;
	}

	const speed = Animation.speed[eid] as number;
	const direction = Animation.direction[eid] as AnimationDirection;
	const loop = Animation.loop[eid] === 1;

	// Update elapsed time
	const elapsed = (Animation.elapsed[eid] as number) + deltaTime * speed;
	Animation.elapsed[eid] = elapsed;

	// Get current frame info
	const currentFrameIndex = Animation.currentFrameIndex[eid] as number;
	const currentFrame = anim.frames[currentFrameIndex];
	if (!currentFrame || elapsed < currentFrame.duration) {
		return false;
	}

	// Reset elapsed for new frame
	Animation.elapsed[eid] = elapsed - currentFrame.duration;

	// Calculate and apply next frame
	const nextFrameIdx = currentFrameIndex + direction;
	const completed =
		direction === AnimationDirection.FORWARD
			? advanceForward(eid, nextFrameIdx, anim.frames.length, loop)
			: advanceReverse(eid, nextFrameIdx, anim.frames.length, loop);

	if (!completed) {
		syncSpriteFrame(world, eid, anim.frames);
	}

	return completed;
}
