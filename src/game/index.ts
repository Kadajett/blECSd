/**
 * High-level Game API for blECSd
 *
 * This module provides a simplified interface for creating terminal games.
 * It wraps the ECS implementation with a more intuitive API.
 *
 * @module game
 *
 * @example
 * ```typescript
 * import { createGame } from 'blecsd';
 *
 * const game = createGame({
 *   title: 'My Game',
 *   width: 80,
 *   height: 24,
 * });
 *
 * // Create UI elements
 * const box = game.createBox({ x: 5, y: 2, width: 20, height: 10 });
 * const text = game.createText({ x: 6, y: 3, text: 'Hello World!' });
 *
 * // Handle input
 * game.onKey('q', () => game.quit());
 * game.onKey('space', () => console.log('Space pressed!'));
 *
 * // Game loop hooks
 * game.onUpdate((dt) => {
 *   // Game logic here
 * });
 *
 * // Start the game
 * game.start();
 * ```
 */

import { createWorld } from 'bitecs';
import { z } from 'zod';

import {
	type BoxConfig,
	type ButtonConfig,
	type CheckboxConfig,
	createBoxEntity,
	createButtonEntity,
	createCheckboxEntity,
	createFormEntity,
	createInputEntity,
	createListEntity,
	createProgressBarEntity,
	createRadioButtonEntity,
	createRadioSetEntity,
	createScreenEntity,
	createSelectEntity,
	createSliderEntity,
	createTextareaEntity,
	createTextboxEntity,
	createTextEntity,
	type FormConfig,
	type InputConfig,
	type ListConfig,
	type ProgressBarConfig,
	type RadioButtonConfig,
	type RadioSetConfig,
	type ScreenConfig,
	type SelectConfig,
	type SliderConfig,
	type TextareaConfig,
	type TextboxConfig,
	type TextConfig,
} from '../core/entities';
import {
	createGameLoop,
	type GameLoop,
	type GameLoopOptions,
	type LoopStats,
} from '../core/gameLoop';
import { type ActionBinding, createInputActionManager } from '../core/inputActions';
import { createInputEventBuffer, type InputEventBuffer } from '../core/inputEventBuffer';
import { createInputState, type InputState as InputStateTracker } from '../core/inputState';
import type { Entity, System, Unsubscribe, World } from '../core/types';
import { LoopPhase } from '../core/types';
import type { KeyEvent, KeyName, MouseEvent as ParsedMouseEvent } from '../terminal';

// =============================================================================
// CONFIG SCHEMA
// =============================================================================

/**
 * Game configuration schema.
 */
export const GameConfigSchema = z.object({
	/**
	 * Game title (displayed in terminal title bar if supported).
	 */
	title: z.string().optional(),

	/**
	 * Terminal width in characters.
	 * @default 80
	 */
	width: z.number().int().positive().optional().default(80),

	/**
	 * Terminal height in characters.
	 * @default 24
	 */
	height: z.number().int().positive().optional().default(24),

	/**
	 * Target frames per second.
	 * @default 60
	 */
	targetFPS: z.number().positive().optional().default(60),

	/**
	 * Whether to enable mouse input.
	 * @default true
	 */
	mouse: z.boolean().optional().default(true),

	/**
	 * Whether to use alternate screen buffer.
	 * @default true
	 */
	alternateScreen: z.boolean().optional().default(true),

	/**
	 * Whether to hide the cursor.
	 * @default true
	 */
	hideCursor: z.boolean().optional().default(true),

	/**
	 * Fixed timestep configuration for physics.
	 */
	fixedTimestep: z
		.object({
			tickRate: z.number().positive().optional().default(60),
			maxUpdatesPerFrame: z.number().positive().optional().default(5),
			interpolate: z.boolean().optional().default(true),
		})
		.optional(),
});

/**
 * Game configuration type.
 */
export type GameConfig = z.input<typeof GameConfigSchema>;

/**
 * Resolved game configuration with defaults applied.
 */
export type ResolvedGameConfig = z.output<typeof GameConfigSchema>;

// =============================================================================
// KEY HANDLER TYPES
// =============================================================================

/**
 * Key event handler function.
 */
export type KeyHandler = (event: KeyEvent) => void;

/**
 * Mouse event handler function.
 */
export type MouseHandler = (event: ParsedMouseEvent) => void;

/**
 * Update callback function.
 * @param deltaTime - Time since last frame in seconds
 */
export type UpdateCallback = (deltaTime: number) => void;

/**
 * Fixed update callback function.
 * @param deltaTime - Fixed delta time in seconds
 * @param tick - Current tick number
 */
export type FixedUpdateCallback = (deltaTime: number, tick: number) => void;

/**
 * Render callback function.
 * @param alpha - Interpolation factor (0-1) for smooth rendering
 */
export type RenderCallback = (alpha: number) => void;

// =============================================================================
// GAME INSTANCE
// =============================================================================

/**
 * Game instance returned by createGame.
 * Provides a high-level API for creating terminal games.
 */
export interface Game {
	/**
	 * The underlying ECS world.
	 * Use this for advanced ECS operations.
	 */
	readonly world: World;

	/**
	 * The game configuration.
	 */
	readonly config: ResolvedGameConfig;

	/**
	 * The root screen entity.
	 */
	readonly screen: Entity;

	/**
	 * The game loop instance.
	 */
	readonly loop: GameLoop;

	/**
	 * The input buffer for raw input events.
	 */
	readonly inputBuffer: InputEventBuffer;

	/**
	 * The input state tracker.
	 */
	readonly inputState: InputStateTracker;

	// =========================================================================
	// WIDGET CREATION
	// =========================================================================

	/**
	 * Creates a box entity.
	 *
	 * @param config - Box configuration
	 * @returns The created entity ID
	 *
	 * @example
	 * ```typescript
	 * const box = game.createBox({
	 *   x: 5, y: 2,
	 *   width: 20, height: 10,
	 *   border: { type: 1 },
	 *   style: { fg: 0xff0000ff }
	 * });
	 * ```
	 */
	createBox(config?: BoxConfig): Entity;

	/**
	 * Creates a text entity.
	 *
	 * @param config - Text configuration
	 * @returns The created entity ID
	 *
	 * @example
	 * ```typescript
	 * const text = game.createText({
	 *   x: 10, y: 5,
	 *   text: 'Hello World!',
	 *   style: { bold: true }
	 * });
	 * ```
	 */
	createText(config?: TextConfig): Entity;

	/**
	 * Creates a button entity.
	 *
	 * @param config - Button configuration
	 * @returns The created entity ID
	 *
	 * @example
	 * ```typescript
	 * const button = game.createButton({
	 *   x: 5, y: 10,
	 *   text: 'Click Me',
	 *   onPress: () => console.log('Pressed!')
	 * });
	 * ```
	 */
	createButton(config?: ButtonConfig): Entity;

	/**
	 * Creates a text input entity.
	 *
	 * @param config - Input configuration
	 * @returns The created entity ID
	 */
	createInput(config?: InputConfig): Entity;

	/**
	 * Creates a textarea entity.
	 *
	 * @param config - Textarea configuration
	 * @returns The created entity ID
	 */
	createTextarea(config?: TextareaConfig): Entity;

	/**
	 * Creates a textbox entity.
	 *
	 * @param config - Textbox configuration
	 * @returns The created entity ID
	 */
	createTextbox(config?: TextboxConfig): Entity;

	/**
	 * Creates a checkbox entity.
	 *
	 * @param config - Checkbox configuration
	 * @returns The created entity ID
	 */
	createCheckbox(config?: CheckboxConfig): Entity;

	/**
	 * Creates a radio button entity.
	 *
	 * @param config - Radio button configuration
	 * @returns The created entity ID
	 */
	createRadioButton(config?: RadioButtonConfig): Entity;

	/**
	 * Creates a radio set entity.
	 *
	 * @param config - Radio set configuration
	 * @returns The created entity ID
	 */
	createRadioSet(config?: RadioSetConfig): Entity;

	/**
	 * Creates a select dropdown entity.
	 *
	 * @param config - Select configuration
	 * @returns The created entity ID
	 */
	createSelect(config?: SelectConfig): Entity;

	/**
	 * Creates a slider entity.
	 *
	 * @param config - Slider configuration
	 * @returns The created entity ID
	 */
	createSlider(config?: SliderConfig): Entity;

	/**
	 * Creates a progress bar entity.
	 *
	 * @param config - Progress bar configuration
	 * @returns The created entity ID
	 */
	createProgressBar(config?: ProgressBarConfig): Entity;

	/**
	 * Creates a list entity.
	 *
	 * @param config - List configuration
	 * @returns The created entity ID
	 */
	createList(config?: ListConfig): Entity;

	/**
	 * Creates a form entity.
	 *
	 * @param config - Form configuration
	 * @returns The created entity ID
	 */
	createForm(config?: FormConfig): Entity;

	// =========================================================================
	// INPUT HANDLING
	// =========================================================================

	/**
	 * Registers a handler for a specific key.
	 *
	 * @param key - The key to listen for (e.g., 'q', 'escape', 'space')
	 * @param handler - The callback function
	 * @returns Function to unsubscribe the handler
	 *
	 * @example
	 * ```typescript
	 * const unsub = game.onKey('q', () => game.quit());
	 * const unsub2 = game.onKey('escape', () => showMenu());
	 * ```
	 */
	onKey(key: KeyName | string, handler: KeyHandler): Unsubscribe;

	/**
	 * Registers a handler for any key press.
	 *
	 * @param handler - The callback function
	 * @returns Function to unsubscribe the handler
	 *
	 * @example
	 * ```typescript
	 * game.onAnyKey((event) => {
	 *   console.log(`Key pressed: ${event.name}`);
	 * });
	 * ```
	 */
	onAnyKey(handler: KeyHandler): Unsubscribe;

	/**
	 * Registers a handler for mouse events.
	 *
	 * @param handler - The callback function
	 * @returns Function to unsubscribe the handler
	 *
	 * @example
	 * ```typescript
	 * game.onMouse((event) => {
	 *   console.log(`Mouse at ${event.x}, ${event.y}`);
	 * });
	 * ```
	 */
	onMouse(handler: MouseHandler): Unsubscribe;

	/**
	 * Defines input action mappings.
	 *
	 * @param bindings - Array of action bindings
	 *
	 * @example
	 * ```typescript
	 * game.defineActions([
	 *   { action: 'jump', keys: ['space', 'w'] },
	 *   { action: 'shoot', keys: ['f'], mouseButtons: ['left'] },
	 * ]);
	 *
	 * // Later, check action state
	 * if (game.isActionActive('jump')) {
	 *   player.jump();
	 * }
	 * ```
	 */
	defineActions(bindings: readonly ActionBinding[]): void;

	/**
	 * Checks if an action is currently active.
	 *
	 * @param action - The action name
	 * @returns true if the action is active
	 */
	isActionActive(action: string): boolean;

	/**
	 * Checks if a key is currently held down.
	 *
	 * @param key - The key to check
	 * @returns true if the key is held
	 */
	isKeyDown(key: KeyName | string): boolean;

	// =========================================================================
	// GAME LOOP HOOKS
	// =========================================================================

	/**
	 * Registers an update callback.
	 * Called every frame with variable delta time.
	 *
	 * @param callback - The update function
	 * @returns Function to unsubscribe
	 *
	 * @example
	 * ```typescript
	 * game.onUpdate((dt) => {
	 *   player.x += player.velocity * dt;
	 * });
	 * ```
	 */
	onUpdate(callback: UpdateCallback): Unsubscribe;

	/**
	 * Registers a fixed update callback.
	 * Called at a fixed rate for deterministic physics.
	 * Only works when fixedTimestep is configured.
	 *
	 * @param callback - The fixed update function
	 * @returns Function to unsubscribe
	 *
	 * @example
	 * ```typescript
	 * game.onFixedUpdate((dt, tick) => {
	 *   physics.step(dt);
	 * });
	 * ```
	 */
	onFixedUpdate(callback: FixedUpdateCallback): Unsubscribe;

	/**
	 * Registers a render callback.
	 * Called after update with interpolation alpha.
	 *
	 * @param callback - The render function
	 * @returns Function to unsubscribe
	 *
	 * @example
	 * ```typescript
	 * game.onRender((alpha) => {
	 *   // Interpolate positions for smooth rendering
	 *   const x = lerp(prevX, currX, alpha);
	 *   drawSprite(x, y);
	 * });
	 * ```
	 */
	onRender(callback: RenderCallback): Unsubscribe;

	/**
	 * Registers a system to run at a specific loop phase.
	 *
	 * @param phase - The loop phase
	 * @param system - The system function
	 * @returns Function to unregister the system
	 *
	 * @example
	 * ```typescript
	 * game.registerSystem(LoopPhase.UPDATE, movementSystem);
	 * game.registerSystem(LoopPhase.PHYSICS, collisionSystem);
	 * ```
	 */
	registerSystem(phase: LoopPhase, system: System): Unsubscribe;

	// =========================================================================
	// LIFECYCLE
	// =========================================================================

	/**
	 * Starts the game loop.
	 *
	 * @example
	 * ```typescript
	 * game.start();
	 * ```
	 */
	start(): void;

	/**
	 * Stops the game loop.
	 *
	 * @example
	 * ```typescript
	 * game.stop();
	 * ```
	 */
	stop(): void;

	/**
	 * Pauses the game loop.
	 * Input is still processed while paused.
	 *
	 * @example
	 * ```typescript
	 * game.pause();
	 * ```
	 */
	pause(): void;

	/**
	 * Resumes the game loop from pause.
	 *
	 * @example
	 * ```typescript
	 * game.resume();
	 * ```
	 */
	resume(): void;

	/**
	 * Quits the game and performs cleanup.
	 *
	 * @example
	 * ```typescript
	 * game.onKey('q', () => game.quit());
	 * ```
	 */
	quit(): void;

	/**
	 * Gets the current loop statistics.
	 *
	 * @returns Current FPS, frame time, etc.
	 *
	 * @example
	 * ```typescript
	 * const stats = game.getStats();
	 * console.log(`FPS: ${stats.fps}`);
	 * ```
	 */
	getStats(): LoopStats;

	/**
	 * Checks if the game is currently running.
	 */
	isRunning(): boolean;

	/**
	 * Checks if the game is currently paused.
	 */
	isPaused(): boolean;
}

// =============================================================================
// INTERNAL STATE
// =============================================================================

interface GameState {
	world: World;
	config: ResolvedGameConfig;
	screen: Entity;
	loop: GameLoop;
	inputBuffer: InputEventBuffer;
	inputState: InputStateTracker;
	actionManager: ReturnType<typeof createInputActionManager>;
	keyHandlers: Map<string, Set<KeyHandler>>;
	anyKeyHandlers: Set<KeyHandler>;
	mouseHandlers: Set<MouseHandler>;
	updateCallbacks: Set<UpdateCallback>;
	fixedUpdateCallbacks: Set<FixedUpdateCallback>;
	renderCallbacks: Set<RenderCallback>;
	isQuitting: boolean;
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new game instance.
 *
 * @param config - Game configuration
 * @returns A Game instance
 *
 * @example
 * ```typescript
 * import { createGame } from 'blecsd';
 *
 * const game = createGame({
 *   title: 'My Game',
 *   width: 80,
 *   height: 24,
 * });
 *
 * // Create widgets
 * const box = game.createBox({ x: 0, y: 0, width: 80, height: 24 });
 *
 * // Handle input
 * game.onKey('q', () => game.quit());
 *
 * // Start the game
 * game.start();
 * ```
 */
export function createGame(config: GameConfig = {}): Game {
	// Parse and validate config
	const resolvedConfig = GameConfigSchema.parse(config);

	// Create ECS world
	const world = createWorld();

	// Create root screen entity
	const screenConfig: ScreenConfig = {
		width: resolvedConfig.width,
		height: resolvedConfig.height,
	};
	const screen = createScreenEntity(world, screenConfig);

	// Create input systems
	const inputBuffer = createInputEventBuffer();
	const inputState = createInputState();
	const actionManager = createInputActionManager();

	// Build game loop options
	const loopOptions: GameLoopOptions = {
		targetFPS: resolvedConfig.targetFPS,
	};

	if (resolvedConfig.fixedTimestep) {
		loopOptions.fixedTimestepMode = {
			tickRate: resolvedConfig.fixedTimestep.tickRate ?? 60,
			maxUpdatesPerFrame: resolvedConfig.fixedTimestep.maxUpdatesPerFrame ?? 5,
			interpolate: resolvedConfig.fixedTimestep.interpolate ?? true,
		};
	}

	// Create callback sets (before loop so hooks can access them)
	const updateCallbacks: Set<UpdateCallback> = new Set();
	const fixedUpdateCallbacks: Set<FixedUpdateCallback> = new Set();
	const renderCallbacks: Set<RenderCallback> = new Set();

	// Create game loop with hooks
	const loop = createGameLoop(world, loopOptions, {
		onAfterFixedUpdate: (_w, fixedDt, tick) => {
			for (const callback of fixedUpdateCallbacks) {
				callback(fixedDt, tick);
			}
		},
		onInterpolate: (_w, alpha) => {
			for (const callback of renderCallbacks) {
				callback(alpha);
			}
		},
	});

	// Create game state
	const state: GameState = {
		world,
		config: resolvedConfig,
		screen,
		loop,
		inputBuffer,
		inputState,
		actionManager,
		keyHandlers: new Map(),
		anyKeyHandlers: new Set(),
		mouseHandlers: new Set(),
		updateCallbacks,
		fixedUpdateCallbacks,
		renderCallbacks,
		isQuitting: false,
	};

	// Create and return game instance
	return createGameInstance(state);
}

/**
 * Creates a game instance from internal state.
 */
function createGameInstance(state: GameState): Game {
	const {
		world,
		config,
		screen,
		loop,
		inputBuffer,
		inputState,
		actionManager,
		keyHandlers,
		anyKeyHandlers,
		mouseHandlers,
		updateCallbacks,
		fixedUpdateCallbacks,
		renderCallbacks,
	} = state;

	// Process input events through handlers
	function processKeyEvent(event: KeyEvent): void {
		// Notify any-key handlers
		for (const handler of anyKeyHandlers) {
			handler(event);
		}

		// Notify specific key handlers
		const handlers = keyHandlers.get(event.name);
		if (handlers) {
			for (const handler of handlers) {
				handler(event);
			}
		}

		// Update action manager
		actionManager.processKeyEvent(event);
	}

	function processMouseEvent(event: ParsedMouseEvent): void {
		// Notify mouse handlers
		for (const handler of mouseHandlers) {
			handler(event);
		}

		// Update action manager
		actionManager.processMouseEvent(event);
	}

	// Update input state with batched events (called per frame)
	function _updateInputState(deltaTime: number): void {
		const keyEvents = inputBuffer.drainKeyEvents();
		const mouseEvents = inputBuffer.drainMouseEvents();

		// Process events for handlers
		for (const event of keyEvents) {
			processKeyEvent(event.event);
		}
		for (const event of mouseEvents) {
			processMouseEvent(event.event);
		}

		// Update input state with batched events
		inputState.update(keyEvents, mouseEvents, deltaTime);
	}

	// Create wrapper system for update callbacks
	function createUpdateCallbackSystem(): System {
		return (w: World): World => {
			const dt = loop.getStats().frameTime / 1000;
			for (const callback of updateCallbacks) {
				callback(dt);
			}
			return w;
		};
	}

	// Register the callback system once
	let callbackSystemRegistered = false;
	function ensureCallbackSystemRegistered(): void {
		if (!callbackSystemRegistered) {
			loop.registerSystem(LoopPhase.UPDATE, createUpdateCallbackSystem());
			callbackSystemRegistered = true;
		}
	}

	const game: Game = {
		get world() {
			return world;
		},
		get config() {
			return config;
		},
		get screen() {
			return screen;
		},
		get loop() {
			return loop;
		},
		get inputBuffer() {
			return inputBuffer;
		},
		get inputState() {
			return inputState;
		},

		// Widget creation
		createBox(cfg?: BoxConfig): Entity {
			return createBoxEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createText(cfg?: TextConfig): Entity {
			return createTextEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createButton(cfg?: ButtonConfig): Entity {
			return createButtonEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createInput(cfg?: InputConfig): Entity {
			return createInputEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createTextarea(cfg?: TextareaConfig): Entity {
			return createTextareaEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createTextbox(cfg?: TextboxConfig): Entity {
			return createTextboxEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createCheckbox(cfg?: CheckboxConfig): Entity {
			return createCheckboxEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createRadioButton(cfg?: RadioButtonConfig): Entity {
			return createRadioButtonEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createRadioSet(cfg?: RadioSetConfig): Entity {
			return createRadioSetEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createSelect(cfg?: SelectConfig): Entity {
			return createSelectEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createSlider(cfg?: SliderConfig): Entity {
			return createSliderEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createProgressBar(cfg?: ProgressBarConfig): Entity {
			return createProgressBarEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createList(cfg?: ListConfig): Entity {
			return createListEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},
		createForm(cfg?: FormConfig): Entity {
			return createFormEntity(world, { ...cfg, parent: cfg?.parent ?? screen });
		},

		// Input handling
		onKey(key: KeyName | string, handler: KeyHandler): Unsubscribe {
			if (!keyHandlers.has(key)) {
				keyHandlers.set(key, new Set());
			}
			keyHandlers.get(key)?.add(handler);
			return () => {
				keyHandlers.get(key)?.delete(handler);
			};
		},

		onAnyKey(handler: KeyHandler): Unsubscribe {
			anyKeyHandlers.add(handler);
			return () => {
				anyKeyHandlers.delete(handler);
			};
		},

		onMouse(handler: MouseHandler): Unsubscribe {
			mouseHandlers.add(handler);
			return () => {
				mouseHandlers.delete(handler);
			};
		},

		defineActions(bindings: readonly ActionBinding[]): void {
			actionManager.registerAll(bindings);
		},

		isActionActive(action: string): boolean {
			return actionManager.isActive(action);
		},

		isKeyDown(key: KeyName | string): boolean {
			return inputState.isKeyDown(key as KeyName);
		},

		// Game loop hooks
		onUpdate(callback: UpdateCallback): Unsubscribe {
			ensureCallbackSystemRegistered();
			updateCallbacks.add(callback);
			return () => {
				updateCallbacks.delete(callback);
			};
		},

		onFixedUpdate(callback: FixedUpdateCallback): Unsubscribe {
			fixedUpdateCallbacks.add(callback);
			return () => {
				fixedUpdateCallbacks.delete(callback);
			};
		},

		onRender(callback: RenderCallback): Unsubscribe {
			renderCallbacks.add(callback);
			return () => {
				renderCallbacks.delete(callback);
			};
		},

		registerSystem(phase: LoopPhase, system: System): Unsubscribe {
			loop.registerSystem(phase, system);
			return () => {
				loop.unregisterSystem(system);
			};
		},

		// Lifecycle
		start(): void {
			loop.start();
		},

		stop(): void {
			loop.stop();
		},

		pause(): void {
			loop.pause();
		},

		resume(): void {
			loop.resume();
		},

		quit(): void {
			state.isQuitting = true;
			loop.stop();
			// Additional cleanup would go here (terminal restore, etc.)
		},

		getStats(): LoopStats {
			return loop.getStats();
		},

		isRunning(): boolean {
			return loop.isRunning();
		},

		isPaused(): boolean {
			return loop.isPaused();
		},
	};

	return game;
}
