/**
 * Input state tracking for keyboard and mouse.
 *
 * Provides frame-aware input queries like isKeyPressed (just this frame),
 * isKeyReleased, key hold time, and repeat handling.
 *
 * @module core/inputState
 */

import type { KeyEvent, KeyName } from '../terminal/keyParser';
import type { MouseAction, MouseButton, MouseEvent } from '../terminal/mouseParser';
import type { TimestampedKeyEvent, TimestampedMouseEvent } from './inputEventBuffer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * State of a single key.
 */
export interface KeyState {
	/** Key is currently pressed down */
	readonly pressed: boolean;
	/** Key was pressed this frame (transitioned from up to down) */
	readonly justPressed: boolean;
	/** Key was released this frame (transitioned from down to up) */
	readonly justReleased: boolean;
	/** Time the key has been held in milliseconds */
	readonly heldTime: number;
	/** Number of auto-repeat events received while held */
	readonly repeatCount: number;
	/** Last event timestamp */
	readonly lastEventTime: number;
}

/**
 * State of a mouse button.
 */
export interface MouseButtonState {
	/** Button is currently pressed */
	readonly pressed: boolean;
	/** Button was pressed this frame */
	readonly justPressed: boolean;
	/** Button was released this frame */
	readonly justReleased: boolean;
	/** Time the button has been held in milliseconds */
	readonly heldTime: number;
	/** Last event timestamp */
	readonly lastEventTime: number;
}

/**
 * Current mouse position and state.
 */
export interface MouseState {
	/** Current X position */
	readonly x: number;
	/** Current Y position */
	readonly y: number;
	/** X movement since last frame */
	readonly deltaX: number;
	/** Y movement since last frame */
	readonly deltaY: number;
	/** Scroll wheel delta since last frame (positive = up) */
	readonly wheelDelta: number;
	/** State of each button */
	readonly buttons: Readonly<Record<MouseButton, MouseButtonState>>;
}

/**
 * Input state statistics.
 */
export interface InputStateStats {
	/** Number of keys currently held down */
	readonly keysDown: number;
	/** Number of keys pressed this frame */
	readonly keysPressed: number;
	/** Number of keys released this frame */
	readonly keysReleased: number;
	/** Total key events processed this frame */
	readonly keyEventsThisFrame: number;
	/** Total mouse events processed this frame */
	readonly mouseEventsThisFrame: number;
	/** Current frame number */
	readonly frameCount: number;
}

/**
 * Configuration for input state tracking.
 */
export interface InputStateConfig {
	/**
	 * Whether to track OS key repeats separately.
	 * When true, repeatCount increments for each repeat event.
	 * When false, repeats are ignored after initial press.
	 * @default true
	 */
	readonly trackRepeats?: boolean;

	/**
	 * Minimum time (ms) between key events to consider them separate presses.
	 * Helps filter out very fast unintentional double-presses.
	 * @default 0 (no debouncing)
	 */
	readonly debounceTime?: number;

	/**
	 * Custom repeat rate in ms. When set, overrides OS key repeat.
	 * InputState will generate synthetic repeat events at this rate.
	 * @default undefined (use OS repeat)
	 */
	readonly customRepeatRate?: number;

	/**
	 * Initial delay before custom repeat starts (ms).
	 * @default 500
	 */
	readonly customRepeatDelay?: number;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_KEY_STATE: KeyState = {
	pressed: false,
	justPressed: false,
	justReleased: false,
	heldTime: 0,
	repeatCount: 0,
	lastEventTime: 0,
};

const DEFAULT_MOUSE_BUTTON_STATE: MouseButtonState = {
	pressed: false,
	justPressed: false,
	justReleased: false,
	heldTime: 0,
	lastEventTime: 0,
};

function createDefaultMouseState(): MouseState {
	return {
		x: 0,
		y: 0,
		deltaX: 0,
		deltaY: 0,
		wheelDelta: 0,
		buttons: {
			left: { ...DEFAULT_MOUSE_BUTTON_STATE },
			right: { ...DEFAULT_MOUSE_BUTTON_STATE },
			middle: { ...DEFAULT_MOUSE_BUTTON_STATE },
			wheelup: { ...DEFAULT_MOUSE_BUTTON_STATE },
			wheeldown: { ...DEFAULT_MOUSE_BUTTON_STATE },
			wheelright: { ...DEFAULT_MOUSE_BUTTON_STATE },
			wheelleft: { ...DEFAULT_MOUSE_BUTTON_STATE },
			button4: { ...DEFAULT_MOUSE_BUTTON_STATE },
			button5: { ...DEFAULT_MOUSE_BUTTON_STATE },
			unknown: { ...DEFAULT_MOUSE_BUTTON_STATE },
		},
	};
}

// =============================================================================
// INTERNAL MUTABLE STATE
// =============================================================================

interface MutableKeyState {
	pressed: boolean;
	justPressed: boolean;
	justReleased: boolean;
	heldTime: number;
	repeatCount: number;
	lastEventTime: number;
}

interface MutableMouseButtonState {
	pressed: boolean;
	justPressed: boolean;
	justReleased: boolean;
	heldTime: number;
	lastEventTime: number;
}

interface MutableMouseState {
	x: number;
	y: number;
	deltaX: number;
	deltaY: number;
	wheelDelta: number;
	buttons: Record<MouseButton, MutableMouseButtonState>;
}

// =============================================================================
// INPUT STATE CLASS
// =============================================================================

/**
 * Tracks input state across frames.
 *
 * Call `update()` at the start of each frame with input events from the buffer.
 * Then use query methods like `isKeyDown()`, `isKeyPressed()`, etc.
 *
 * @example
 * ```typescript
 * import { InputState, createInputEventBuffer } from 'blecsd';
 *
 * const buffer = createInputEventBuffer();
 * const inputState = new InputState();
 *
 * // In game loop
 * function update(deltaTime: number) {
 *   // Update input state with events from buffer
 *   inputState.update(buffer.drainKeys(), buffer.drainMouse(), deltaTime);
 *
 *   // Query input state
 *   if (inputState.isKeyPressed('space')) {
 *     jump();
 *   }
 *   if (inputState.isKeyDown('left')) {
 *     moveLeft();
 *   }
 * }
 * ```
 */
export class InputState {
	private keyStates: Map<string, MutableKeyState> = new Map();
	private mouseState: MutableMouseState = createDefaultMouseState() as MutableMouseState;
	private config: Required<InputStateConfig>;
	private frameCount = 0;
	private keyEventsThisFrame = 0;
	private mouseEventsThisFrame = 0;
	private lastUpdateTime = 0;

	// Modifiers tracked separately for convenience
	private ctrlDown = false;
	private altDown = false;
	private shiftDown = false;

	/**
	 * Creates a new InputState tracker.
	 *
	 * @param config - Configuration options
	 */
	constructor(config: InputStateConfig = {}) {
		this.config = {
			trackRepeats: config.trackRepeats ?? true,
			debounceTime: config.debounceTime ?? 0,
			customRepeatRate: config.customRepeatRate ?? 0,
			customRepeatDelay: config.customRepeatDelay ?? 500,
		};
	}

	// =========================================================================
	// UPDATE
	// =========================================================================

	/**
	 * Updates input state with events from this frame.
	 * Call this once at the start of each frame.
	 *
	 * @param keyEvents - Keyboard events from the input buffer
	 * @param mouseEvents - Mouse events from the input buffer
	 * @param deltaTime - Time since last frame in seconds
	 *
	 * @example
	 * ```typescript
	 * const keys = buffer.drainKeys();
	 * const mouse = buffer.drainMouse();
	 * inputState.update(keys, mouse, deltaTime);
	 * ```
	 */
	update(
		keyEvents: readonly TimestampedKeyEvent[],
		mouseEvents: readonly TimestampedMouseEvent[],
		deltaTime: number,
	): void {
		this.frameCount++;
		this.keyEventsThisFrame = keyEvents.length;
		this.mouseEventsThisFrame = mouseEvents.length;

		const deltaMs = deltaTime * 1000;
		const currentTime = performance.now();
		this.lastUpdateTime = currentTime;

		// Clear just pressed/released flags from previous frame
		this.clearTransientFlags();

		// Update held times for all currently pressed keys
		this.updateHeldTimes(deltaMs);

		// Process key events
		for (const event of keyEvents) {
			this.processKeyEvent(event.event, event.timestamp);
		}

		// Process mouse events
		this.mouseState.deltaX = 0;
		this.mouseState.deltaY = 0;
		this.mouseState.wheelDelta = 0;

		for (const event of mouseEvents) {
			this.processMouseEvent(event.event, event.timestamp);
		}

		// Update mouse button held times
		for (const button of Object.values(this.mouseState.buttons)) {
			if (button.pressed) {
				button.heldTime += deltaMs;
			}
		}
	}

	/**
	 * Clears transient flags (justPressed, justReleased) from previous frame.
	 */
	private clearTransientFlags(): void {
		for (const state of this.keyStates.values()) {
			state.justPressed = false;
			state.justReleased = false;
		}
		for (const button of Object.values(this.mouseState.buttons)) {
			button.justPressed = false;
			button.justReleased = false;
		}
	}

	/**
	 * Updates held times for all pressed keys.
	 */
	private updateHeldTimes(deltaMs: number): void {
		for (const state of this.keyStates.values()) {
			if (state.pressed) {
				state.heldTime += deltaMs;
			}
		}
	}

	/**
	 * Processes a single key event.
	 */
	private processKeyEvent(event: KeyEvent, timestamp: number): void {
		const key = this.normalizeKeyName(event.name, event);
		let state = this.keyStates.get(key);

		if (!state) {
			state = { ...DEFAULT_KEY_STATE } as MutableKeyState;
			this.keyStates.set(key, state);
		}

		// Handle debouncing (only if there was a previous event)
		if (this.config.debounceTime > 0 && state.lastEventTime > 0) {
			const timeSinceLastEvent = timestamp - state.lastEventTime;
			if (timeSinceLastEvent < this.config.debounceTime) {
				return; // Ignore debounced event
			}
		}

		// Detect if this is a repeat event (key already pressed, no release in between)
		const isRepeat = state.pressed;

		if (isRepeat) {
			// This is a key repeat event
			if (this.config.trackRepeats) {
				state.repeatCount++;
			}
			// Don't set justPressed again for repeats
		} else {
			// This is a new key press
			state.pressed = true;
			state.justPressed = true;
			state.justReleased = false;
			state.heldTime = 0;
			state.repeatCount = 0;
		}

		state.lastEventTime = timestamp;

		// Update modifier tracking
		if (event.name === 'ctrl' || (event.ctrl && !state.pressed)) {
			this.ctrlDown = true;
		}
		if (event.name === 'alt' || (event.meta && !state.pressed)) {
			this.altDown = true;
		}
		if (event.name === 'shift' || (event.shift && !state.pressed)) {
			this.shiftDown = true;
		}
	}

	/**
	 * Processes a key release.
	 * Note: Terminal key events don't have explicit "release" events.
	 * Keys are released by calling releaseKey() or releaseAllKeys().
	 */
	private processKeyRelease(key: string, timestamp: number): void {
		const state = this.keyStates.get(key);
		if (!state || !state.pressed) {
			return;
		}

		state.pressed = false;
		state.justPressed = false;
		state.justReleased = true;
		state.lastEventTime = timestamp;

		// Update modifier tracking
		if (key === 'ctrl') {
			this.ctrlDown = false;
		}
		if (key === 'alt') {
			this.altDown = false;
		}
		if (key === 'shift') {
			this.shiftDown = false;
		}
	}

	/**
	 * Processes a mouse event.
	 */
	private processMouseEvent(event: MouseEvent, timestamp: number): void {
		// Update position
		const prevX = this.mouseState.x;
		const prevY = this.mouseState.y;
		this.mouseState.x = event.x;
		this.mouseState.y = event.y;
		this.mouseState.deltaX += event.x - prevX;
		this.mouseState.deltaY += event.y - prevY;

		// Handle wheel events
		if (event.button === 'wheelup') {
			this.mouseState.wheelDelta += 1;
		} else if (event.button === 'wheeldown') {
			this.mouseState.wheelDelta -= 1;
		}

		// Update button state
		const button = this.mouseState.buttons[event.button];
		if (!button) {
			return;
		}

		if (event.action === 'mousedown') {
			if (!button.pressed) {
				button.pressed = true;
				button.justPressed = true;
				button.justReleased = false;
				button.heldTime = 0;
			}
			button.lastEventTime = timestamp;
		} else if (event.action === 'mouseup') {
			if (button.pressed) {
				button.pressed = false;
				button.justPressed = false;
				button.justReleased = true;
			}
			button.lastEventTime = timestamp;
		}
	}

	/**
	 * Normalizes a key name to a consistent format.
	 */
	private normalizeKeyName(name: KeyName, event: KeyEvent): string {
		// Include modifiers in the key identifier for combo tracking
		// But store base key separately for simple queries
		return name.toLowerCase();
	}

	// =========================================================================
	// KEY QUERIES
	// =========================================================================

	/**
	 * Checks if a key is currently pressed down.
	 *
	 * @param key - The key to check
	 * @returns true if the key is currently held down
	 *
	 * @example
	 * ```typescript
	 * if (inputState.isKeyDown('w')) {
	 *   moveForward();
	 * }
	 * ```
	 */
	isKeyDown(key: KeyName | string): boolean {
		const state = this.keyStates.get(key.toLowerCase());
		return state?.pressed ?? false;
	}

	/**
	 * Checks if a key was pressed this frame.
	 * Only returns true on the first frame the key is pressed.
	 *
	 * @param key - The key to check
	 * @returns true if the key was just pressed this frame
	 *
	 * @example
	 * ```typescript
	 * if (inputState.isKeyPressed('space')) {
	 *   jump(); // Only triggers once per press
	 * }
	 * ```
	 */
	isKeyPressed(key: KeyName | string): boolean {
		const state = this.keyStates.get(key.toLowerCase());
		return state?.justPressed ?? false;
	}

	/**
	 * Checks if a key was released this frame.
	 * Only returns true on the first frame after the key is released.
	 *
	 * @param key - The key to check
	 * @returns true if the key was just released this frame
	 *
	 * @example
	 * ```typescript
	 * if (inputState.isKeyReleased('space')) {
	 *   endJump();
	 * }
	 * ```
	 */
	isKeyReleased(key: KeyName | string): boolean {
		const state = this.keyStates.get(key.toLowerCase());
		return state?.justReleased ?? false;
	}

	/**
	 * Gets how long a key has been held in milliseconds.
	 *
	 * @param key - The key to check
	 * @returns Time in milliseconds, or 0 if not pressed
	 *
	 * @example
	 * ```typescript
	 * const chargeTime = inputState.getKeyHeldTime('space');
	 * if (chargeTime > 1000) {
	 *   superJump();
	 * }
	 * ```
	 */
	getKeyHeldTime(key: KeyName | string): number {
		const state = this.keyStates.get(key.toLowerCase());
		return state?.heldTime ?? 0;
	}

	/**
	 * Gets the full state of a key.
	 *
	 * @param key - The key to check
	 * @returns Full key state, or default state if key hasn't been pressed
	 *
	 * @example
	 * ```typescript
	 * const state = inputState.getKeyState('space');
	 * console.log(`Space: pressed=${state.pressed}, held=${state.heldTime}ms`);
	 * ```
	 */
	getKeyState(key: KeyName | string): KeyState {
		return this.keyStates.get(key.toLowerCase()) ?? DEFAULT_KEY_STATE;
	}

	/**
	 * Gets the number of auto-repeat events for a key.
	 *
	 * @param key - The key to check
	 * @returns Number of repeat events since key was pressed
	 */
	getKeyRepeatCount(key: KeyName | string): number {
		const state = this.keyStates.get(key.toLowerCase());
		return state?.repeatCount ?? 0;
	}

	/**
	 * Gets all currently pressed keys.
	 *
	 * @returns Array of key names that are currently held down
	 *
	 * @example
	 * ```typescript
	 * const pressed = inputState.getPressedKeys();
	 * console.log(`Keys held: ${pressed.join(', ')}`);
	 * ```
	 */
	getPressedKeys(): string[] {
		const pressed: string[] = [];
		for (const [key, state] of this.keyStates) {
			if (state.pressed) {
				pressed.push(key);
			}
		}
		return pressed;
	}

	/**
	 * Gets all keys that were just pressed this frame.
	 *
	 * @returns Array of key names that were just pressed
	 */
	getJustPressedKeys(): string[] {
		const pressed: string[] = [];
		for (const [key, state] of this.keyStates) {
			if (state.justPressed) {
				pressed.push(key);
			}
		}
		return pressed;
	}

	/**
	 * Gets all keys that were just released this frame.
	 *
	 * @returns Array of key names that were just released
	 */
	getJustReleasedKeys(): string[] {
		const released: string[] = [];
		for (const [key, state] of this.keyStates) {
			if (state.justReleased) {
				released.push(key);
			}
		}
		return released;
	}

	// =========================================================================
	// MODIFIER QUERIES
	// =========================================================================

	/**
	 * Checks if Ctrl is currently pressed.
	 */
	isCtrlDown(): boolean {
		return this.ctrlDown;
	}

	/**
	 * Checks if Alt/Meta is currently pressed.
	 */
	isAltDown(): boolean {
		return this.altDown;
	}

	/**
	 * Checks if Shift is currently pressed.
	 */
	isShiftDown(): boolean {
		return this.shiftDown;
	}

	/**
	 * Checks if any modifier key is pressed.
	 */
	hasModifier(): boolean {
		return this.ctrlDown || this.altDown || this.shiftDown;
	}

	// =========================================================================
	// MOUSE QUERIES
	// =========================================================================

	/**
	 * Checks if a mouse button is currently pressed.
	 *
	 * @param button - The button to check
	 * @returns true if the button is held down
	 *
	 * @example
	 * ```typescript
	 * if (inputState.isMouseButtonDown('left')) {
	 *   drag();
	 * }
	 * ```
	 */
	isMouseButtonDown(button: MouseButton): boolean {
		return this.mouseState.buttons[button]?.pressed ?? false;
	}

	/**
	 * Checks if a mouse button was just pressed this frame.
	 *
	 * @param button - The button to check
	 * @returns true if the button was just pressed
	 */
	isMouseButtonPressed(button: MouseButton): boolean {
		return this.mouseState.buttons[button]?.justPressed ?? false;
	}

	/**
	 * Checks if a mouse button was just released this frame.
	 *
	 * @param button - The button to check
	 * @returns true if the button was just released
	 */
	isMouseButtonReleased(button: MouseButton): boolean {
		return this.mouseState.buttons[button]?.justReleased ?? false;
	}

	/**
	 * Gets the current mouse X position.
	 */
	getMouseX(): number {
		return this.mouseState.x;
	}

	/**
	 * Gets the current mouse Y position.
	 */
	getMouseY(): number {
		return this.mouseState.y;
	}

	/**
	 * Gets the current mouse position.
	 *
	 * @returns Object with x and y coordinates
	 */
	getMousePosition(): { x: number; y: number } {
		return { x: this.mouseState.x, y: this.mouseState.y };
	}

	/**
	 * Gets the mouse movement since last frame.
	 *
	 * @returns Object with deltaX and deltaY
	 */
	getMouseDelta(): { deltaX: number; deltaY: number } {
		return { deltaX: this.mouseState.deltaX, deltaY: this.mouseState.deltaY };
	}

	/**
	 * Gets the scroll wheel delta since last frame.
	 * Positive = scroll up, negative = scroll down.
	 */
	getWheelDelta(): number {
		return this.mouseState.wheelDelta;
	}

	/**
	 * Gets the full mouse state.
	 */
	getMouseState(): MouseState {
		return this.mouseState;
	}

	// =========================================================================
	// MANUAL KEY MANAGEMENT
	// =========================================================================

	/**
	 * Manually releases a key.
	 * Use this when focus is lost or to implement key timeout.
	 *
	 * @param key - The key to release
	 *
	 * @example
	 * ```typescript
	 * // Release all keys when window loses focus
	 * inputState.releaseKey('a');
	 * ```
	 */
	releaseKey(key: KeyName | string): void {
		this.processKeyRelease(key.toLowerCase(), performance.now());
	}

	/**
	 * Releases all currently held keys.
	 * Call this when the window loses focus or the game pauses.
	 *
	 * @example
	 * ```typescript
	 * // On window blur
	 * inputState.releaseAllKeys();
	 * ```
	 */
	releaseAllKeys(): void {
		const currentTime = performance.now();
		for (const [key, state] of this.keyStates) {
			if (state.pressed) {
				this.processKeyRelease(key, currentTime);
			}
		}
		this.ctrlDown = false;
		this.altDown = false;
		this.shiftDown = false;
	}

	/**
	 * Releases all mouse buttons.
	 */
	releaseAllMouseButtons(): void {
		const currentTime = performance.now();
		for (const button of Object.values(this.mouseState.buttons)) {
			if (button.pressed) {
				button.pressed = false;
				button.justReleased = true;
				button.lastEventTime = currentTime;
			}
		}
	}

	/**
	 * Releases all input (keys and mouse).
	 */
	releaseAll(): void {
		this.releaseAllKeys();
		this.releaseAllMouseButtons();
	}

	// =========================================================================
	// STATS & DEBUG
	// =========================================================================

	/**
	 * Gets input state statistics.
	 *
	 * @returns Statistics about current input state
	 */
	getStats(): InputStateStats {
		let keysDown = 0;
		let keysPressed = 0;
		let keysReleased = 0;

		for (const state of this.keyStates.values()) {
			if (state.pressed) keysDown++;
			if (state.justPressed) keysPressed++;
			if (state.justReleased) keysReleased++;
		}

		return {
			keysDown,
			keysPressed,
			keysReleased,
			keyEventsThisFrame: this.keyEventsThisFrame,
			mouseEventsThisFrame: this.mouseEventsThisFrame,
			frameCount: this.frameCount,
		};
	}

	/**
	 * Gets the current frame number.
	 */
	getFrameCount(): number {
		return this.frameCount;
	}

	/**
	 * Resets all input state.
	 * Clears all tracked keys and mouse state.
	 */
	reset(): void {
		this.keyStates.clear();
		this.mouseState = createDefaultMouseState() as MutableMouseState;
		this.frameCount = 0;
		this.keyEventsThisFrame = 0;
		this.mouseEventsThisFrame = 0;
		this.ctrlDown = false;
		this.altDown = false;
		this.shiftDown = false;
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a new InputState tracker.
 *
 * @param config - Configuration options
 * @returns A new InputState instance
 *
 * @example
 * ```typescript
 * import { createInputState } from 'blecsd';
 *
 * const inputState = createInputState({
 *   trackRepeats: true,
 *   debounceTime: 50, // Ignore inputs within 50ms
 * });
 * ```
 */
export function createInputState(config: InputStateConfig = {}): InputState {
	return new InputState(config);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if any of the specified keys are pressed.
 *
 * @param inputState - The input state to check
 * @param keys - Keys to check
 * @returns true if any key is currently pressed
 *
 * @example
 * ```typescript
 * if (isAnyKeyDown(inputState, ['w', 'up'])) {
 *   moveForward();
 * }
 * ```
 */
export function isAnyKeyDown(inputState: InputState, keys: readonly (KeyName | string)[]): boolean {
	for (const key of keys) {
		if (inputState.isKeyDown(key)) {
			return true;
		}
	}
	return false;
}

/**
 * Checks if all specified keys are pressed.
 *
 * @param inputState - The input state to check
 * @param keys - Keys to check
 * @returns true if all keys are currently pressed
 *
 * @example
 * ```typescript
 * if (isAllKeysDown(inputState, ['ctrl', 's'])) {
 *   save();
 * }
 * ```
 */
export function isAllKeysDown(inputState: InputState, keys: readonly (KeyName | string)[]): boolean {
	for (const key of keys) {
		if (!inputState.isKeyDown(key)) {
			return false;
		}
	}
	return true;
}

/**
 * Checks if any of the specified keys were just pressed this frame.
 *
 * @param inputState - The input state to check
 * @param keys - Keys to check
 * @returns true if any key was just pressed
 */
export function isAnyKeyPressed(
	inputState: InputState,
	keys: readonly (KeyName | string)[],
): boolean {
	for (const key of keys) {
		if (inputState.isKeyPressed(key)) {
			return true;
		}
	}
	return false;
}

/**
 * Gets the direction vector from WASD or arrow keys.
 *
 * @param inputState - The input state to check
 * @returns Object with x (-1, 0, or 1) and y (-1, 0, or 1)
 *
 * @example
 * ```typescript
 * const dir = getMovementDirection(inputState);
 * player.x += dir.x * speed;
 * player.y += dir.y * speed;
 * ```
 */
export function getMovementDirection(inputState: InputState): { x: number; y: number } {
	let x = 0;
	let y = 0;

	if (inputState.isKeyDown('a') || inputState.isKeyDown('left')) {
		x -= 1;
	}
	if (inputState.isKeyDown('d') || inputState.isKeyDown('right')) {
		x += 1;
	}
	if (inputState.isKeyDown('w') || inputState.isKeyDown('up')) {
		y -= 1;
	}
	if (inputState.isKeyDown('s') || inputState.isKeyDown('down')) {
		y += 1;
	}

	return { x, y };
}
