/**
 * Scene management for game screens.
 *
 * Provides a scene stack with lifecycle callbacks, scene transitions,
 * and per-scene system registration. Scenes can be pushed/popped
 * for overlays (e.g., pause menu) or switched directly.
 *
 * @module core/scene
 */

import type { System, World } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A game scene with lifecycle callbacks and optional per-scene systems.
 *
 * @example
 * ```typescript
 * import type { Scene } from 'blecsd';
 *
 * const menuScene: Scene = {
 *   name: 'menu',
 *   onCreate(world) { // Called once when scene is first entered },
 *   onEnter(world) { // Called each time scene becomes active },
 *   onExit(world) { // Called when scene is deactivated },
 *   onDestroy(world) { // Called when scene is unregistered },
 *   onUpdate(world, delta) { // Called each frame while active },
 * };
 * ```
 */
export interface Scene {
	/** Unique scene name */
	readonly name: string;

	/** Called once when the scene is first entered (lazy initialization) */
	onCreate?(world: World): void;

	/** Called each time the scene becomes the active scene */
	onEnter?(world: World): void;

	/** Called when the scene is deactivated (switched away or popped) */
	onExit?(world: World): void;

	/** Called when the scene is unregistered or the manager is reset */
	onDestroy?(world: World): void;

	/** Called each frame while the scene is active */
	onUpdate?(world: World, delta: number): void;

	/** Optional systems that run only when this scene is active */
	systems?: readonly System[];
}

/**
 * A scene transition configuration.
 *
 * @example
 * ```typescript
 * import type { SceneTransition } from 'blecsd';
 *
 * const fadeTransition: SceneTransition = {
 *   duration: 0.5,
 *   onUpdate(world, progress) {
 *     // progress goes from 0 to 1
 *   },
 * };
 * ```
 */
export interface SceneTransition {
	/** Duration of the transition in seconds */
	readonly duration: number;

	/** Called when the transition starts */
	onStart?(world: World): void;

	/** Called each frame during the transition with progress (0-1) */
	onUpdate?(world: World, progress: number): void;

	/** Called when the transition completes */
	onComplete?(world: World): void;
}

/**
 * Current state of an active transition.
 */
export interface TransitionState {
	/** The transition configuration */
	readonly transition: SceneTransition;
	/** Elapsed time in seconds */
	elapsed: number;
	/** The scene being transitioned from (null if none) */
	readonly fromScene: Scene | null;
	/** The scene being transitioned to */
	readonly toScene: Scene;
}

/**
 * Scene manager for managing game screens.
 *
 * @example
 * ```typescript
 * import { createSceneManager } from 'blecsd';
 *
 * const scenes = createSceneManager();
 *
 * scenes.registerScene({
 *   name: 'menu',
 *   onEnter(world) { console.log('Entering menu'); },
 * });
 *
 * scenes.registerScene({
 *   name: 'game',
 *   onEnter(world) { console.log('Starting game'); },
 *   onUpdate(world, dt) { // game logic },
 * });
 *
 * scenes.switchTo(world, 'menu');
 * scenes.switchTo(world, 'game');
 * ```
 */
export interface SceneManager {
	/** Registers a scene. Returns true if registered, false if name already exists. */
	registerScene(scene: Scene): boolean;

	/** Unregisters a scene by name. Calls onDestroy if scene was created. */
	unregisterScene(world: World, name: string): boolean;

	/** Switches to a scene, replacing the entire stack. */
	switchTo(world: World, name: string, transition?: SceneTransition): boolean;

	/** Pushes a scene onto the stack (current scene stays underneath). */
	push(world: World, name: string, transition?: SceneTransition): boolean;

	/** Pops the top scene from the stack. */
	pop(world: World, transition?: SceneTransition): boolean;

	/** Gets the currently active scene (top of stack). */
	getCurrentScene(): Scene | null;

	/** Gets the full scene stack (bottom to top). */
	getSceneStack(): readonly Scene[];

	/** Gets all registered scene names. */
	getRegisteredScenes(): readonly string[];

	/** Checks if a transition is currently in progress. */
	isTransitioning(): boolean;

	/** Gets the current transition state, if any. */
	getTransitionState(): TransitionState | null;

	/** Advances the current transition by delta seconds. */
	updateTransition(world: World, delta: number): void;

	/** Resets the scene manager, destroying all scenes and clearing the stack. */
	reset(world: World): void;
}

// =============================================================================
// INTERNAL STATE
// =============================================================================

interface SceneEntry {
	scene: Scene;
	created: boolean;
}

interface SceneManagerState {
	registry: Map<string, SceneEntry>;
	stack: Scene[];
	transition: TransitionState | null;
}

// =============================================================================
// TRANSITION HELPERS
// =============================================================================

/**
 * Starts a transition between scenes.
 */
function startTransition(
	state: SceneManagerState,
	world: World,
	fromScene: Scene | null,
	toScene: Scene,
	transition: SceneTransition,
): void {
	state.transition = {
		transition,
		elapsed: 0,
		fromScene,
		toScene,
	};
	transition.onStart?.(world);
}

/**
 * Completes the current transition.
 */
function completeTransition(state: SceneManagerState, world: World): void {
	if (!state.transition) {
		return;
	}
	state.transition.transition.onComplete?.(world);
	state.transition = null;
}

// =============================================================================
// SCENE LIFECYCLE HELPERS
// =============================================================================

/**
 * Ensures a scene has been created (calls onCreate if not yet called).
 */
function ensureCreated(entry: SceneEntry, world: World): void {
	if (!entry.created) {
		entry.scene.onCreate?.(world);
		entry.created = true;
	}
}

/**
 * Enters a scene (ensures created, then calls onEnter).
 */
function enterScene(entry: SceneEntry, world: World): void {
	ensureCreated(entry, world);
	entry.scene.onEnter?.(world);
}

/**
 * Exits a scene (calls onExit).
 */
function exitScene(scene: Scene, world: World): void {
	scene.onExit?.(world);
}

/**
 * Performs a direct scene switch (no transition).
 */
function performSwitch(state: SceneManagerState, world: World, entry: SceneEntry): void {
	// Exit all scenes in the stack (top to bottom)
	for (let i = state.stack.length - 1; i >= 0; i--) {
		const s = state.stack[i];
		if (s) {
			exitScene(s, world);
		}
	}

	// Replace the stack
	state.stack = [entry.scene];

	// Enter the new scene
	enterScene(entry, world);
}

/**
 * Performs a push operation (no transition).
 */
function performPush(state: SceneManagerState, world: World, entry: SceneEntry): void {
	// Exit the current top scene (if any)
	const current = state.stack[state.stack.length - 1];
	if (current) {
		exitScene(current, world);
	}

	// Push and enter the new scene
	state.stack.push(entry.scene);
	enterScene(entry, world);
}

/**
 * Performs a pop operation (no transition).
 */
function performPop(state: SceneManagerState, world: World): boolean {
	if (state.stack.length <= 0) {
		return false;
	}

	// Exit the current top scene
	const top = state.stack[state.stack.length - 1];
	if (top) {
		exitScene(top, world);
	}

	state.stack.pop();

	// Re-enter the new top scene (if any)
	const newTop = state.stack[state.stack.length - 1];
	if (newTop) {
		const entry = state.registry.get(newTop.name);
		if (entry) {
			enterScene(entry, world);
		}
	}

	return true;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a new scene manager.
 *
 * @returns A SceneManager instance
 *
 * @example
 * ```typescript
 * import { createSceneManager } from 'blecsd';
 *
 * const sceneManager = createSceneManager();
 *
 * sceneManager.registerScene({
 *   name: 'title',
 *   onEnter(world) { console.log('Title screen'); },
 * });
 *
 * sceneManager.registerScene({
 *   name: 'gameplay',
 *   onEnter(world) { console.log('Game started'); },
 *   onUpdate(world, dt) { // update game logic },
 *   systems: [movementSystem, collisionSystem],
 * });
 *
 * sceneManager.switchTo(world, 'title');
 * ```
 */
export function createSceneManager(): SceneManager {
	const state: SceneManagerState = {
		registry: new Map(),
		stack: [],
		transition: null,
	};

	return {
		registerScene(scene: Scene): boolean {
			if (state.registry.has(scene.name)) {
				return false;
			}
			state.registry.set(scene.name, { scene, created: false });
			return true;
		},

		unregisterScene(world: World, name: string): boolean {
			const entry = state.registry.get(name);
			if (!entry) {
				return false;
			}

			// Remove from stack if present
			const stackIdx = state.stack.indexOf(entry.scene);
			if (stackIdx !== -1) {
				exitScene(entry.scene, world);
				state.stack.splice(stackIdx, 1);
			}

			// Call onDestroy if created
			if (entry.created) {
				entry.scene.onDestroy?.(world);
			}

			state.registry.delete(name);
			return true;
		},

		switchTo(world: World, name: string, transition?: SceneTransition): boolean {
			const entry = state.registry.get(name);
			if (!entry) {
				return false;
			}

			if (transition) {
				const current = state.stack[state.stack.length - 1] ?? null;
				// Exit all current scenes
				for (let i = state.stack.length - 1; i >= 0; i--) {
					const s = state.stack[i];
					if (s) {
						exitScene(s, world);
					}
				}
				state.stack = [entry.scene];
				ensureCreated(entry, world);
				startTransition(state, world, current, entry.scene, transition);
			} else {
				performSwitch(state, world, entry);
			}

			return true;
		},

		push(world: World, name: string, transition?: SceneTransition): boolean {
			const entry = state.registry.get(name);
			if (!entry) {
				return false;
			}

			if (transition) {
				const current = state.stack[state.stack.length - 1] ?? null;
				if (current) {
					exitScene(current, world);
				}
				state.stack.push(entry.scene);
				ensureCreated(entry, world);
				startTransition(state, world, current, entry.scene, transition);
			} else {
				performPush(state, world, entry);
			}

			return true;
		},

		pop(world: World, transition?: SceneTransition): boolean {
			if (state.stack.length <= 0) {
				return false;
			}

			if (transition) {
				const current = state.stack[state.stack.length - 1] ?? null;
				if (current) {
					exitScene(current, world);
				}
				state.stack.pop();

				const newTop = state.stack[state.stack.length - 1] ?? null;
				if (newTop) {
					startTransition(state, world, current, newTop, transition);
				} else {
					// Nothing left on the stack, just complete immediately
					state.transition = null;
				}
				return true;
			}

			return performPop(state, world);
		},

		getCurrentScene(): Scene | null {
			return state.stack[state.stack.length - 1] ?? null;
		},

		getSceneStack(): readonly Scene[] {
			return [...state.stack];
		},

		getRegisteredScenes(): readonly string[] {
			return Array.from(state.registry.keys());
		},

		isTransitioning(): boolean {
			return state.transition !== null;
		},

		getTransitionState(): TransitionState | null {
			return state.transition;
		},

		updateTransition(world: World, delta: number): void {
			if (!state.transition) {
				return;
			}

			state.transition.elapsed += delta;
			const progress = Math.min(1, state.transition.elapsed / state.transition.transition.duration);

			state.transition.transition.onUpdate?.(world, progress);

			if (progress >= 1) {
				const toScene = state.transition.toScene;
				completeTransition(state, world);

				// Enter the target scene after transition completes
				const entry = state.registry.get(toScene.name);
				if (entry) {
					enterScene(entry, world);
				}
			}
		},

		reset(world: World): void {
			// Cancel any transition
			state.transition = null;

			// Exit all scenes in stack (top to bottom)
			for (let i = state.stack.length - 1; i >= 0; i--) {
				const s = state.stack[i];
				if (s) {
					exitScene(s, world);
				}
			}

			// Destroy all created scenes
			for (const entry of state.registry.values()) {
				if (entry.created) {
					entry.scene.onDestroy?.(world);
				}
			}

			state.registry.clear();
			state.stack = [];
		},
	};
}

// =============================================================================
// BUILT-IN TRANSITIONS
// =============================================================================

/**
 * Creates a fade transition that calls onUpdate with progress 0-1.
 * Useful for fade-in/fade-out effects.
 *
 * @param duration - Duration in seconds
 * @param onProgress - Optional callback for custom fade logic
 * @returns A SceneTransition
 *
 * @example
 * ```typescript
 * import { createFadeTransition } from 'blecsd';
 *
 * sceneManager.switchTo(world, 'game', createFadeTransition(0.5));
 * ```
 */
export function createFadeTransition(
	duration: number,
	onProgress?: (world: World, progress: number) => void,
): SceneTransition {
	return {
		duration,
		onUpdate: onProgress,
	};
}

/**
 * Creates a slide transition.
 * The direction indicates which way the new scene slides in.
 *
 * @param duration - Duration in seconds
 * @param direction - Slide direction
 * @param onProgress - Optional callback with progress and direction
 * @returns A SceneTransition
 *
 * @example
 * ```typescript
 * import { createSlideTransition } from 'blecsd';
 *
 * sceneManager.switchTo(world, 'settings', createSlideTransition(0.3, 'left'));
 * ```
 */
export function createSlideTransition(
	duration: number,
	direction: 'left' | 'right' | 'up' | 'down',
	onProgress?: (world: World, progress: number, direction: string) => void,
): SceneTransition {
	return {
		duration,
		onUpdate(world: World, progress: number): void {
			onProgress?.(world, progress, direction);
		},
	};
}

// =============================================================================
// SCENE SYSTEM
// =============================================================================

/**
 * Creates a system that updates the scene manager each frame.
 * Advances transitions and calls onUpdate on the active scene.
 *
 * @param sceneManager - The scene manager to update
 * @param getDelta - Function to get the current frame's delta time
 * @returns An ECS system
 *
 * @example
 * ```typescript
 * import { createSceneManager, createSceneSystem, getDeltaTime } from 'blecsd';
 *
 * const scenes = createSceneManager();
 * const sceneSystem = createSceneSystem(scenes, getDeltaTime);
 *
 * scheduler.registerSystem(LoopPhase.UPDATE, sceneSystem);
 * ```
 */
export function createSceneSystem(sceneManager: SceneManager, getDelta: () => number): System {
	return (world: World): World => {
		const delta = getDelta();

		// Advance transition if active
		if (sceneManager.isTransitioning()) {
			sceneManager.updateTransition(world, delta);
		}

		// Update the active scene (only if not transitioning)
		if (!sceneManager.isTransitioning()) {
			const current = sceneManager.getCurrentScene();
			current?.onUpdate?.(world, delta);
		}

		return world;
	};
}
