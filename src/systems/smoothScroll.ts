/**
 * Smooth Animated Scrolling
 *
 * Provides butter-smooth scroll animations with momentum/inertia physics.
 * Supports velocity-based scrolling, spring-to-boundary behavior, and
 * graceful frame skipping under load.
 *
 * @module systems/smoothScroll
 */

import { z } from 'zod';
import type { Entity, System, World } from '../core/types';
import { createComponentStore } from '../utils/componentStorage';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Scroll physics configuration.
 */
export interface ScrollPhysicsConfig {
	/** Friction coefficient (0-1, lower = more momentum, default: 0.92) */
	readonly friction: number;
	/** Minimum velocity before stopping (default: 0.1) */
	readonly minVelocity: number;
	/** Maximum velocity (default: 200) */
	readonly maxVelocity: number;
	/** Velocity multiplier for input (default: 1) */
	readonly sensitivity: number;
	/** Spring stiffness for overscroll bounce (default: 0.3) */
	readonly springStiffness: number;
	/** Spring damping for overscroll bounce (default: 0.8) */
	readonly springDamping: number;
	/** Maximum overscroll distance (default: 50) */
	readonly maxOverscroll: number;
	/** Whether to enable momentum scrolling (default: true) */
	readonly enableMomentum: boolean;
	/** Whether to enable overscroll bounce (default: true) */
	readonly enableBounce: boolean;
}

/**
 * Zod schema for ScrollPhysicsConfig validation.
 */
export const ScrollPhysicsConfigSchema = z.object({
	friction: z.number().min(0).max(1),
	minVelocity: z.number().nonnegative(),
	maxVelocity: z.number().positive(),
	sensitivity: z.number(),
	springStiffness: z.number().nonnegative(),
	springDamping: z.number().nonnegative(),
	maxOverscroll: z.number().nonnegative(),
	enableMomentum: z.boolean(),
	enableBounce: z.boolean(),
});

/**
 * Scroll animation state for a single entity.
 */
export interface ScrollAnimationState {
	/** Current scroll position */
	scrollX: number;
	scrollY: number;
	/** Current scroll velocity */
	velocityX: number;
	velocityY: number;
	/** Content bounds */
	contentWidth: number;
	contentHeight: number;
	/** Viewport bounds */
	viewportWidth: number;
	viewportHeight: number;
	/** Whether currently animating */
	isAnimating: boolean;
	/** Whether user is actively scrolling (input held) */
	isUserScrolling: boolean;
	/** Target scroll position (for smooth scrollTo) */
	targetX: number | null;
	targetY: number | null;
}

/**
 * Scroll event data.
 */
export interface ScrollEvent {
	/** Entity being scrolled */
	readonly eid: Entity;
	/** Scroll delta X */
	readonly deltaX: number;
	/** Scroll delta Y */
	readonly deltaY: number;
	/** Current scroll position X */
	readonly scrollX: number;
	/** Current scroll position Y */
	readonly scrollY: number;
	/** Whether momentum is active */
	readonly isMomentum: boolean;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_PHYSICS: ScrollPhysicsConfig = {
	friction: 0.92,
	minVelocity: 0.1,
	maxVelocity: 200,
	sensitivity: 1,
	springStiffness: 0.3,
	springDamping: 0.8,
	maxOverscroll: 50,
	enableMomentum: true,
	enableBounce: true,
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/** Active scroll animations backed by PackedStore for cache-friendly iteration */
const scrollStates = createComponentStore<ScrollAnimationState>({ iterable: true });

/**
 * Creates or gets scroll animation state for an entity.
 *
 * @param eid - Entity ID
 * @param contentWidth - Total content width
 * @param contentHeight - Total content height
 * @param viewportWidth - Viewport width
 * @param viewportHeight - Viewport height
 * @returns Scroll animation state
 *
 * @example
 * ```typescript
 * const state = getScrollState(entity, 1000, 5000, 80, 24);
 * ```
 */
export function getScrollState(
	eid: Entity,
	contentWidth: number,
	contentHeight: number,
	viewportWidth: number,
	viewportHeight: number,
): ScrollAnimationState {
	let state = scrollStates.get(eid);

	if (!state) {
		state = {
			scrollX: 0,
			scrollY: 0,
			velocityX: 0,
			velocityY: 0,
			contentWidth,
			contentHeight,
			viewportWidth,
			viewportHeight,
			isAnimating: false,
			isUserScrolling: false,
			targetX: null,
			targetY: null,
		};
		scrollStates.set(eid, state);
	} else {
		state.contentWidth = contentWidth;
		state.contentHeight = contentHeight;
		state.viewportWidth = viewportWidth;
		state.viewportHeight = viewportHeight;
	}

	return state;
}

/**
 * Removes scroll state for an entity.
 *
 * @param _world - The ECS world
 * @param eid - Entity ID
 */
export function removeScrollState(_world: World, eid: Entity): void {
	scrollStates.delete(eid);
}

/**
 * Clears all scroll states. Used for testing.
 * @internal
 */
export function clearAllScrollStates(): void {
	scrollStates.clear();
}

// =============================================================================
// SCROLL INPUT
// =============================================================================

/**
 * Applies a scroll impulse (e.g., from mouse wheel or keyboard).
 *
 * @param eid - Entity to scroll
 * @param deltaX - Horizontal scroll amount
 * @param deltaY - Vertical scroll amount
 * @param physics - Physics configuration
 *
 * @example
 * ```typescript
 * // Mouse wheel scroll
 * applyScrollImpulse(entity, 0, -3, physicsConfig);
 *
 * // Page down
 * applyScrollImpulse(entity, 0, 24, physicsConfig);
 * ```
 */
export function applyScrollImpulse(
	eid: Entity,
	deltaX: number,
	deltaY: number,
	physics?: Partial<ScrollPhysicsConfig>,
): void {
	const merged = { ...DEFAULT_PHYSICS, ...physics };
	const cfg = ScrollPhysicsConfigSchema.parse(merged) as ScrollPhysicsConfig;
	const state = scrollStates.get(eid);
	if (!state) return;

	state.velocityX += deltaX * cfg.sensitivity;
	state.velocityY += deltaY * cfg.sensitivity;

	// Clamp velocity
	state.velocityX = Math.max(-cfg.maxVelocity, Math.min(cfg.maxVelocity, state.velocityX));
	state.velocityY = Math.max(-cfg.maxVelocity, Math.min(cfg.maxVelocity, state.velocityY));

	state.isAnimating = true;
	state.targetX = null;
	state.targetY = null;
}

/**
 * Smoothly scrolls to a target position.
 *
 * @param eid - Entity to scroll
 * @param targetX - Target X scroll position (null = don't change)
 * @param targetY - Target Y scroll position (null = don't change)
 *
 * @example
 * ```typescript
 * // Scroll to top
 * smoothScrollTo(entity, null, 0);
 *
 * // Scroll to bottom
 * smoothScrollTo(entity, null, maxScroll);
 * ```
 */
export function smoothScrollTo(
	_world: World,
	eid: Entity,
	targetX: number | null,
	targetY: number | null,
): void {
	const state = scrollStates.get(eid);
	if (!state) return;

	state.targetX = targetX;
	state.targetY = targetY;
	state.isAnimating = true;
}

/**
 * Sets scroll position immediately without animation.
 *
 * @param _world - The ECS world
 * @param eid - Entity to scroll
 * @param x - X scroll position
 * @param y - Y scroll position
 */
export function setScrollImmediate(_world: World, eid: Entity, x: number, y: number): void {
	const state = scrollStates.get(eid);
	if (!state) return;

	state.scrollX = x;
	state.scrollY = y;
	state.velocityX = 0;
	state.velocityY = 0;
	state.targetX = null;
	state.targetY = null;
	state.isAnimating = false;
}

/**
 * Marks the start of user scrolling (e.g., mouse drag).
 *
 * @param _world - The ECS world
 * @param eid - Entity being scrolled
 */
export function startUserScroll(_world: World, eid: Entity): void {
	const state = scrollStates.get(eid);
	if (!state) return;

	state.isUserScrolling = true;
	state.velocityX = 0;
	state.velocityY = 0;
}

/**
 * Marks the end of user scrolling, enabling momentum.
 *
 * @param _world - The ECS world
 * @param eid - Entity being scrolled
 * @param velocityX - Release velocity X
 * @param velocityY - Release velocity Y
 */
export function endUserScroll(_world: World, eid: Entity, velocityX: number, velocityY: number): void {
	const state = scrollStates.get(eid);
	if (!state) return;

	state.isUserScrolling = false;
	state.velocityX = velocityX;
	state.velocityY = velocityY;
	state.isAnimating = Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1;
}

// =============================================================================
// PHYSICS UPDATE
// =============================================================================

/**
 * Clamps scroll position to content bounds.
 */
function clampScroll(state: ScrollAnimationState, physics: ScrollPhysicsConfig): void {
	const maxX = Math.max(0, state.contentWidth - state.viewportWidth);
	const maxY = Math.max(0, state.contentHeight - state.viewportHeight);

	if (!physics.enableBounce) {
		state.scrollX = Math.max(0, Math.min(maxX, state.scrollX));
		state.scrollY = Math.max(0, Math.min(maxY, state.scrollY));
		return;
	}

	// Allow overscroll with spring-back
	const overscrollX =
		state.scrollX < 0 ? state.scrollX : state.scrollX > maxX ? state.scrollX - maxX : 0;

	const overscrollY =
		state.scrollY < 0 ? state.scrollY : state.scrollY > maxY ? state.scrollY - maxY : 0;

	if (Math.abs(overscrollX) > 0 && !state.isUserScrolling) {
		state.velocityX -= overscrollX * physics.springStiffness;
		state.velocityX *= physics.springDamping;
	}

	if (Math.abs(overscrollY) > 0 && !state.isUserScrolling) {
		state.velocityY -= overscrollY * physics.springStiffness;
		state.velocityY *= physics.springDamping;
	}

	// Hard clamp overscroll
	state.scrollX = Math.max(
		-physics.maxOverscroll,
		Math.min(maxX + physics.maxOverscroll, state.scrollX),
	);
	state.scrollY = Math.max(
		-physics.maxOverscroll,
		Math.min(maxY + physics.maxOverscroll, state.scrollY),
	);
}

/**
 * Updates scroll physics for a single entity.
 *
 * @param state - Scroll animation state
 * @param dt - Delta time in seconds
 * @param physics - Physics configuration
 * @returns True if the scroll position changed
 */
function updateScrollToTarget(state: ScrollAnimationState): void {
	if (state.targetX === null && state.targetY === null) return;

	if (state.targetX !== null) {
		const diff = state.targetX - state.scrollX;
		if (Math.abs(diff) < 0.5) {
			state.scrollX = state.targetX;
			state.targetX = null;
			state.velocityX = 0;
		} else {
			state.velocityX = diff * 0.15;
		}
	}

	if (state.targetY !== null) {
		const diff = state.targetY - state.scrollY;
		if (Math.abs(diff) < 0.5) {
			state.scrollY = state.targetY;
			state.targetY = null;
			state.velocityY = 0;
		} else {
			state.velocityY = diff * 0.15;
		}
	}
}

function applyVelocity(state: ScrollAnimationState, dt: number): void {
	state.scrollX += state.velocityX * dt * 60;
	state.scrollY += state.velocityY * dt * 60;
}

function applyFriction(state: ScrollAnimationState, cfg: ScrollPhysicsConfig): void {
	if (!cfg.enableMomentum || state.isUserScrolling) return;

	state.velocityX *= cfg.friction;
	state.velocityY *= cfg.friction;
}

function shouldStopAnimation(state: ScrollAnimationState, cfg: ScrollPhysicsConfig): boolean {
	return (
		Math.abs(state.velocityX) < cfg.minVelocity &&
		Math.abs(state.velocityY) < cfg.minVelocity &&
		state.targetX === null &&
		state.targetY === null
	);
}

function finalizeScrollPosition(state: ScrollAnimationState): void {
	state.velocityX = 0;
	state.velocityY = 0;
	state.isAnimating = false;

	// Snap to nearest integer when stopped
	state.scrollX = Math.round(state.scrollX);
	state.scrollY = Math.round(state.scrollY);

	// Final clamp
	const maxX = Math.max(0, state.contentWidth - state.viewportWidth);
	const maxY = Math.max(0, state.contentHeight - state.viewportHeight);
	state.scrollX = Math.max(0, Math.min(maxX, state.scrollX));
	state.scrollY = Math.max(0, Math.min(maxY, state.scrollY));
}

export function updateScrollPhysics(
	state: ScrollAnimationState,
	dt: number,
	physics?: Partial<ScrollPhysicsConfig>,
): boolean {
	const merged = { ...DEFAULT_PHYSICS, ...physics };
	const cfg = ScrollPhysicsConfigSchema.parse(merged) as ScrollPhysicsConfig;

	if (!state.isAnimating) return false;

	const prevX = state.scrollX;
	const prevY = state.scrollY;

	// Handle smooth scroll to target
	updateScrollToTarget(state);

	// Apply velocity
	applyVelocity(state, dt);

	// Apply friction (momentum decay)
	applyFriction(state, cfg);

	// Clamp and bounce
	clampScroll(state, cfg);

	// Stop animation when velocity is negligible
	if (shouldStopAnimation(state, cfg)) {
		finalizeScrollPosition(state);
	}

	return state.scrollX !== prevX || state.scrollY !== prevY;
}

/**
 * Checks if an entity has an active scroll animation.
 *
 * @param _world - The ECS world
 * @param eid - Entity to check
 * @returns True if the entity is currently scrolling
 */
export function isScrolling(_world: World, eid: Entity): boolean {
	const state = scrollStates.get(eid);
	return state?.isAnimating ?? false;
}

/**
 * Gets the current scroll position of an entity.
 *
 * @param _world - The ECS world
 * @param eid - Entity to query
 * @returns Scroll position or null if no scroll state
 */
export function getScrollPosition(_world: World, eid: Entity): { x: number; y: number } | null {
	const state = scrollStates.get(eid);
	if (!state) return null;
	return { x: state.scrollX, y: state.scrollY };
}

// =============================================================================
// SYSTEM
// =============================================================================

/**
 * Creates a smooth scroll system that updates all active scroll animations.
 *
 * @param physics - Physics configuration
 * @returns System function
 *
 * @example
 * ```typescript
 * import { createSmoothScrollSystem } from 'blecsd';
 *
 * const scrollSystem = createSmoothScrollSystem({
 *   friction: 0.92,
 *   enableMomentum: true,
 *   enableBounce: true,
 * });
 *
 * scheduler.registerSystem(LoopPhase.ANIMATION, scrollSystem);
 * ```
 */
export function createSmoothScrollSystem(physics?: Partial<ScrollPhysicsConfig>): System {
	let lastTime = performance.now();

	return (world: World): World => {
		const now = performance.now();
		const dt = Math.min((now - lastTime) / 1000, 1 / 15); // Cap at ~15fps minimum
		lastTime = now;

		scrollStates.forEach((state) => {
			updateScrollPhysics(state, dt, physics);
		});

		return world;
	};
}
