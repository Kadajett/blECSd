/**
 * Game factory implementation.
 *
 * @module game/createGame
 */

import type { Entity, System, Unsubscribe, World } from 'blecsd/core';
import {
	type ActionBinding,
	type BoxConfig,
	type ButtonConfig,
	type CheckboxConfig,
	createBoxEntity,
	createButtonEntity,
	createCheckboxEntity,
	createFormEntity,
	createGameLoop,
	createInputActionManager,
	createInputEntity,
	createInputEventBuffer,
	createInputState,
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
	createWorld,
	drainKeys,
	drainMouse,
	type FormConfig,
	type GameLoop,
	type GameLoopOptions,
	type InputConfig,
	type InputEventBufferData,
	type InputState as InputStateTracker,
	type ListConfig,
	LoopPhase,
	type LoopStats,
	type ProgressBarConfig,
	type RadioButtonConfig,
	type RadioSetConfig,
	type ScreenConfig,
	type SelectConfig,
	type SliderConfig,
	type TextareaConfig,
	type TextboxConfig,
	type TextConfig,
} from 'blecsd/core';
import type { KeyEvent, KeyName, ParsedMouseEvent } from 'blecsd/terminal';
import type { GameConfig, ResolvedGameConfig } from './schema';
import { GameConfigSchema } from './schema';
import type {
	FixedUpdateCallback,
	Game,
	KeyHandler,
	MouseHandler,
	RenderCallback,
	UpdateCallback,
} from './types';

// =============================================================================
// INTERNAL STATE
// =============================================================================

interface GameState {
	world: World;
	config: ResolvedGameConfig;
	screen: Entity;
	loop: GameLoop;
	inputBuffer: InputEventBufferData;
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
	}

	function processMouseEvent(event: ParsedMouseEvent): void {
		// Notify mouse handlers
		for (const handler of mouseHandlers) {
			handler(event);
		}
	}

	// Update input state with batched events (called per frame)
	function updateInputState(deltaTime: number): void {
		const keyEvents = drainKeys(inputBuffer);
		const mouseEvents = drainMouse(inputBuffer);

		// Process events for handlers
		for (const event of keyEvents) {
			processKeyEvent(event.event);
		}
		for (const event of mouseEvents) {
			processMouseEvent(event.event);
		}

		// Update input state with batched events
		inputState.update(keyEvents, mouseEvents, deltaTime);

		// Update action manager with current input state
		actionManager.update(inputState, deltaTime);
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

	// Create input processing system
	function createInputSystem(): System {
		return (w: World): World => {
			const dt = loop.getStats().frameTime / 1000;
			updateInputState(dt);
			return w;
		};
	}

	// Register input system in INPUT phase (using internal method)
	loop.registerInputSystem(createInputSystem());

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
