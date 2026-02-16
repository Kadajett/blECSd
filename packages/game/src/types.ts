/**
 * Type definitions for the Game API.
 *
 * @module game/types
 */

import type {
	ActionBinding,
	BoxConfig,
	ButtonConfig,
	CheckboxConfig,
	Entity,
	FormConfig,
	GameLoop,
	InputConfig,
	InputEventBufferData,
	InputState as InputStateTracker,
	ListConfig,
	LoopPhase,
	LoopStats,
	ProgressBarConfig,
	RadioButtonConfig,
	RadioSetConfig,
	SelectConfig,
	SliderConfig,
	System,
	TextareaConfig,
	TextboxConfig,
	TextConfig,
	Unsubscribe,
	World,
} from 'blecsd/core';
import type { KeyEvent, KeyName, ParsedMouseEvent } from 'blecsd/terminal';
import type { ResolvedGameConfig } from './schema';

// =============================================================================
// HANDLER TYPES
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
	readonly inputBuffer: InputEventBufferData;

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
	 * game.registerSystem(LoopPhase.ANIMATION, collisionSystem);
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
