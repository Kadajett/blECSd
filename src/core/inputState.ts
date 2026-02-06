/**
 * Input state tracking for keyboard and mouse.
 *
 * Provides frame-aware input queries like isKeyPressed (just this frame),
 * isKeyReleased, key hold time, and repeat handling.
 *
 * @module core/inputState
 */

import type { KeyEvent, KeyName } from '../terminal/keyParser';
import type { MouseButton, MouseEvent } from '../terminal/mouseParser';
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

function createDefaultMouseState(): MutableMouseState {
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
			wheelUp: { ...DEFAULT_MOUSE_BUTTON_STATE },
			wheelDown: { ...DEFAULT_MOUSE_BUTTON_STATE },
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
// INPUT STATE INTERFACE
// =============================================================================

/**
 * InputState interface for type-safe access.
 *
 * Tracks input state across frames.
 * Call `update()` at the start of each frame with input events from the buffer.
 * Then use query methods like `isKeyDown()`, `isKeyPressed()`, etc.
 */
export interface InputState {
	update(
		keyEvents: readonly TimestampedKeyEvent[],
		mouseEvents: readonly TimestampedMouseEvent[],
		deltaTime: number,
	): void;
	isKeyDown(key: KeyName | string): boolean;
	isKeyPressed(key: KeyName | string): boolean;
	isKeyReleased(key: KeyName | string): boolean;
	getKeyHeldTime(key: KeyName | string): number;
	getKeyState(key: KeyName | string): KeyState;
	getKeyRepeatCount(key: KeyName | string): number;
	getPressedKeys(): string[];
	getJustPressedKeys(): string[];
	getJustReleasedKeys(): string[];
	isCtrlDown(): boolean;
	isAltDown(): boolean;
	isShiftDown(): boolean;
	hasModifier(): boolean;
	isMouseButtonDown(button: MouseButton): boolean;
	isMouseButtonPressed(button: MouseButton): boolean;
	isMouseButtonReleased(button: MouseButton): boolean;
	getMouseX(): number;
	getMouseY(): number;
	getMousePosition(): { x: number; y: number };
	getMouseDelta(): { deltaX: number; deltaY: number };
	getWheelDelta(): number;
	getMouseState(): MouseState;
	releaseKey(key: KeyName | string): void;
	releaseAllKeys(): void;
	releaseAllMouseButtons(): void;
	releaseAll(): void;
	getStats(): InputStateStats;
	getFrameCount(): number;
	reset(): void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function normalizeKeyName(name: KeyName, _event: KeyEvent): string {
	return name.toLowerCase();
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
	const resolvedConfig = {
		trackRepeats: config.trackRepeats ?? true,
		debounceTime: config.debounceTime ?? 0,
		customRepeatRate: config.customRepeatRate ?? 0,
		customRepeatDelay: config.customRepeatDelay ?? 500,
	};

	const keyStates = new Map<string, MutableKeyState>();
	let mouseState: MutableMouseState = createDefaultMouseState();
	let frameCount = 0;
	let keyEventsThisFrame = 0;
	let mouseEventsThisFrame = 0;

	// Modifiers tracked separately for convenience
	let ctrlDown = false;
	let altDown = false;
	let shiftDown = false;

	function clearTransientFlags(): void {
		for (const state of keyStates.values()) {
			state.justPressed = false;
			state.justReleased = false;
		}
		for (const button of Object.values(mouseState.buttons)) {
			button.justPressed = false;
			button.justReleased = false;
		}
	}

	function updateHeldTimes(deltaMs: number): void {
		for (const state of keyStates.values()) {
			if (state.pressed) {
				state.heldTime += deltaMs;
			}
		}
	}

	function processKeyEvent(event: KeyEvent, timestamp: number): void {
		const key = normalizeKeyName(event.name, event);
		let state = keyStates.get(key);

		if (!state) {
			state = { ...DEFAULT_KEY_STATE } as MutableKeyState;
			keyStates.set(key, state);
		}

		// Handle debouncing (only if there was a previous event)
		if (resolvedConfig.debounceTime > 0 && state.lastEventTime > 0) {
			const timeSinceLastEvent = timestamp - state.lastEventTime;
			if (timeSinceLastEvent < resolvedConfig.debounceTime) {
				return; // Ignore debounced event
			}
		}

		// Detect if this is a repeat event (key already pressed, no release in between)
		const isRepeat = state.pressed;

		if (isRepeat) {
			// This is a key repeat event
			if (resolvedConfig.trackRepeats) {
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

		// Update modifier tracking from event flags
		if (event.ctrl && !state.pressed) {
			ctrlDown = true;
		}
		if (event.meta && !state.pressed) {
			altDown = true;
		}
		if (event.shift && !state.pressed) {
			shiftDown = true;
		}
	}

	function processKeyRelease(key: string, timestamp: number): void {
		const state = keyStates.get(key);
		if (!state || !state.pressed) {
			return;
		}

		state.pressed = false;
		state.justPressed = false;
		state.justReleased = true;
		state.lastEventTime = timestamp;

		// Update modifier tracking
		if (key === 'ctrl') {
			ctrlDown = false;
		}
		if (key === 'alt') {
			altDown = false;
		}
		if (key === 'shift') {
			shiftDown = false;
		}
	}

	function processMouseEvent(event: MouseEvent, timestamp: number): void {
		// Update position
		const prevX = mouseState.x;
		const prevY = mouseState.y;
		mouseState.x = event.x;
		mouseState.y = event.y;
		mouseState.deltaX += event.x - prevX;
		mouseState.deltaY += event.y - prevY;

		// Handle wheel events
		if (event.button === 'wheelUp') {
			mouseState.wheelDelta += 1;
		} else if (event.button === 'wheelDown') {
			mouseState.wheelDelta -= 1;
		}

		// Update button state
		const button = mouseState.buttons[event.button];
		if (!button) {
			return;
		}

		if (event.action === 'press') {
			if (!button.pressed) {
				button.pressed = true;
				button.justPressed = true;
				button.justReleased = false;
				button.heldTime = 0;
			}
			button.lastEventTime = timestamp;
		} else if (event.action === 'release') {
			if (button.pressed) {
				button.pressed = false;
				button.justPressed = false;
				button.justReleased = true;
			}
			button.lastEventTime = timestamp;
		}
	}

	return {
		update(
			keyEvents: readonly TimestampedKeyEvent[],
			mouseEvents: readonly TimestampedMouseEvent[],
			deltaTime: number,
		): void {
			frameCount++;
			keyEventsThisFrame = keyEvents.length;
			mouseEventsThisFrame = mouseEvents.length;

			const deltaMs = deltaTime * 1000;

			// Clear just pressed/released flags from previous frame
			clearTransientFlags();

			// Update held times for all currently pressed keys
			updateHeldTimes(deltaMs);

			// Process key events
			for (const event of keyEvents) {
				processKeyEvent(event.event, event.timestamp);
			}

			// Process mouse events
			mouseState.deltaX = 0;
			mouseState.deltaY = 0;
			mouseState.wheelDelta = 0;

			for (const event of mouseEvents) {
				processMouseEvent(event.event, event.timestamp);
			}

			// Update mouse button held times
			for (const button of Object.values(mouseState.buttons)) {
				if (button.pressed) {
					button.heldTime += deltaMs;
				}
			}
		},

		isKeyDown(key: KeyName | string): boolean {
			const state = keyStates.get(key.toLowerCase());
			return state?.pressed ?? false;
		},

		isKeyPressed(key: KeyName | string): boolean {
			const state = keyStates.get(key.toLowerCase());
			return state?.justPressed ?? false;
		},

		isKeyReleased(key: KeyName | string): boolean {
			const state = keyStates.get(key.toLowerCase());
			return state?.justReleased ?? false;
		},

		getKeyHeldTime(key: KeyName | string): number {
			const state = keyStates.get(key.toLowerCase());
			return state?.heldTime ?? 0;
		},

		getKeyState(key: KeyName | string): KeyState {
			return keyStates.get(key.toLowerCase()) ?? DEFAULT_KEY_STATE;
		},

		getKeyRepeatCount(key: KeyName | string): number {
			const state = keyStates.get(key.toLowerCase());
			return state?.repeatCount ?? 0;
		},

		getPressedKeys(): string[] {
			const pressed: string[] = [];
			for (const [key, state] of keyStates) {
				if (state.pressed) {
					pressed.push(key);
				}
			}
			return pressed;
		},

		getJustPressedKeys(): string[] {
			const pressed: string[] = [];
			for (const [key, state] of keyStates) {
				if (state.justPressed) {
					pressed.push(key);
				}
			}
			return pressed;
		},

		getJustReleasedKeys(): string[] {
			const released: string[] = [];
			for (const [key, state] of keyStates) {
				if (state.justReleased) {
					released.push(key);
				}
			}
			return released;
		},

		isCtrlDown(): boolean {
			return ctrlDown;
		},

		isAltDown(): boolean {
			return altDown;
		},

		isShiftDown(): boolean {
			return shiftDown;
		},

		hasModifier(): boolean {
			return ctrlDown || altDown || shiftDown;
		},

		isMouseButtonDown(button: MouseButton): boolean {
			return mouseState.buttons[button]?.pressed ?? false;
		},

		isMouseButtonPressed(button: MouseButton): boolean {
			return mouseState.buttons[button]?.justPressed ?? false;
		},

		isMouseButtonReleased(button: MouseButton): boolean {
			return mouseState.buttons[button]?.justReleased ?? false;
		},

		getMouseX(): number {
			return mouseState.x;
		},

		getMouseY(): number {
			return mouseState.y;
		},

		getMousePosition(): { x: number; y: number } {
			return { x: mouseState.x, y: mouseState.y };
		},

		getMouseDelta(): { deltaX: number; deltaY: number } {
			return { deltaX: mouseState.deltaX, deltaY: mouseState.deltaY };
		},

		getWheelDelta(): number {
			return mouseState.wheelDelta;
		},

		getMouseState(): MouseState {
			return mouseState;
		},

		releaseKey(key: KeyName | string): void {
			processKeyRelease(key.toLowerCase(), performance.now());
		},

		releaseAllKeys(): void {
			const currentTime = performance.now();
			for (const [key, state] of keyStates) {
				if (state.pressed) {
					processKeyRelease(key, currentTime);
				}
			}
			ctrlDown = false;
			altDown = false;
			shiftDown = false;
		},

		releaseAllMouseButtons(): void {
			const currentTime = performance.now();
			for (const button of Object.values(mouseState.buttons)) {
				if (button.pressed) {
					button.pressed = false;
					button.justReleased = true;
					button.lastEventTime = currentTime;
				}
			}
		},

		releaseAll(): void {
			this.releaseAllKeys();
			this.releaseAllMouseButtons();
		},

		getStats(): InputStateStats {
			let keysDown = 0;
			let keysPressed = 0;
			let keysReleased = 0;

			for (const state of keyStates.values()) {
				if (state.pressed) keysDown++;
				if (state.justPressed) keysPressed++;
				if (state.justReleased) keysReleased++;
			}

			return {
				keysDown,
				keysPressed,
				keysReleased,
				keyEventsThisFrame,
				mouseEventsThisFrame,
				frameCount,
			};
		},

		getFrameCount(): number {
			return frameCount;
		},

		reset(): void {
			keyStates.clear();
			mouseState = createDefaultMouseState();
			frameCount = 0;
			keyEventsThisFrame = 0;
			mouseEventsThisFrame = 0;
			ctrlDown = false;
			altDown = false;
			shiftDown = false;
		},
	};
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
export function isAllKeysDown(
	inputState: InputState,
	keys: readonly (KeyName | string)[],
): boolean {
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
