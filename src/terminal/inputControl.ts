/**
 * Screen Input Control
 *
 * Manages input event handling at the screen/program level.
 * Connects Program events to the ECS input system.
 *
 * @module terminal/inputControl
 *
 * @example
 * ```typescript
 * import {
 *   createInputControl,
 *   enableKeys,
 *   enableMouse,
 *   enableInput,
 * } from 'blecsd';
 *
 * const program = new Program();
 * await program.init();
 *
 * const world = createWorld();
 * const screen = createScreenEntity(world, { width: 80, height: 24 });
 *
 * // Create input control
 * const inputControl = createInputControl(world, program);
 *
 * // Enable keyboard and mouse
 * enableInput(inputControl);
 *
 * // Or enable separately
 * enableKeys(inputControl);
 * enableMouse(inputControl);
 * ```
 */

import { createEventBus, type EventBus } from '../core/events';
import { shouldBlockKeyEvent } from '../core/keyLock';
import type { World } from '../core/types';
import { queueKeyEvent, queueMouseEvent } from '../systems/inputSystem';
import { mouse } from './ansi';
import type { KeyName } from './keyParser';
import type { MouseAction, MouseButton, MouseProtocol } from './mouseParser';
import type { KeyEvent, MouseEvent, Program } from './program';

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

/**
 * Converts a Program button number to a MouseButton type.
 */
function buttonToMouseButton(button: number): MouseButton {
	switch (button) {
		case 0:
			return 'left';
		case 1:
			return 'middle';
		case 2:
			return 'right';
		default:
			return 'unknown';
	}
}

/**
 * Converts a Program action to a MouseAction type.
 */
function actionToMouseAction(action: MouseEvent['action']): MouseAction {
	switch (action) {
		case 'mousedown':
			return 'press';
		case 'mouseup':
			return 'release';
		case 'mousemove':
			return 'move';
		case 'wheel':
			return 'wheel';
	}
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Input control state for managing screen-level input.
 */
export interface InputControlState {
	/** The ECS world */
	readonly world: World;
	/** The Program instance */
	readonly program: Program;
	/** Whether keyboard input is enabled */
	keysEnabled: boolean;
	/** Whether mouse input is enabled */
	mouseEnabled: boolean;
	/** Mouse tracking mode */
	mouseMode: MouseModeValue;
	/** Internal key handler */
	readonly keyHandler: (event: KeyEvent) => void;
	/** Internal mouse handler */
	readonly mouseHandler: (event: MouseEvent) => void;
}

/**
 * Mouse tracking modes.
 */
export const MouseTrackingMode = {
	/** No mouse tracking */
	OFF: 0,
	/** Normal click tracking */
	NORMAL: 1,
	/** Button event tracking */
	BUTTON: 2,
	/** Any event tracking (including motion) */
	ANY: 3,
	/** SGR extended mode */
	SGR: 4,
} as const;

export type MouseModeValue = (typeof MouseTrackingMode)[keyof typeof MouseTrackingMode];

/**
 * Input control options.
 */
export interface InputControlOptions {
	/** Initial keyboard state */
	keys?: boolean;
	/** Initial mouse state */
	mouse?: boolean;
	/** Mouse tracking mode */
	mouseMode?: MouseModeValue;
}

/**
 * Input control event data.
 */
export interface InputControlEventData {
	/** Key event received */
	readonly key?: KeyEvent;
	/** Mouse event received */
	readonly mouse?: MouseEvent;
}

/**
 * Input control event map.
 */
export interface InputControlEventMap {
	key: KeyEvent;
	mouse: MouseEvent;
	keysEnabled: void;
	keysDisabled: void;
	mouseEnabled: MouseModeValue;
	mouseDisabled: void;
}

// =============================================================================
// SINGLETON STATE
// =============================================================================

const activeControls = new WeakMap<World, InputControlState>();
let inputEventBus: EventBus<InputControlEventMap> | null = null;

// =============================================================================
// EVENT BUS
// =============================================================================

/**
 * Gets the input control event bus.
 *
 * @returns The event bus for input control events
 *
 * @example
 * ```typescript
 * const bus = getInputControlEventBus();
 * bus.on('key', (event) => {
 *   console.log('Key pressed:', event.name);
 * });
 * ```
 */
export function getInputControlEventBus(): EventBus<InputControlEventMap> {
	if (!inputEventBus) {
		inputEventBus = createEventBus<InputControlEventMap>();
	}
	return inputEventBus;
}

/**
 * Resets the input control event bus (for testing).
 */
export function resetInputControlEventBus(): void {
	inputEventBus = null;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates an input control for a world and program.
 *
 * @param world - The ECS world
 * @param program - The Program instance
 * @param options - Initial options
 * @returns The InputControlState
 *
 * @example
 * ```typescript
 * const inputControl = createInputControl(world, program);
 * enableInput(inputControl);
 * ```
 */
export function createInputControl(
	world: World,
	program: Program,
	options: InputControlOptions = {},
): InputControlState {
	// Create handlers that queue events to input system
	const keyHandler = (event: KeyEvent): void => {
		// Check key lock system
		if (shouldBlockKeyEvent(event)) {
			return;
		}

		// Queue to input system
		queueKeyEvent({
			name: event.name as KeyName,
			sequence: event.sequence,
			ctrl: event.ctrl,
			meta: event.meta,
			shift: event.shift,
			raw: new Uint8Array(Buffer.from(event.sequence)),
		});

		// Emit to event bus
		getInputControlEventBus().emit('key', event);
	};

	const mouseHandler = (event: MouseEvent): void => {
		// Queue to input system
		queueMouseEvent({
			x: event.x,
			y: event.y,
			button: buttonToMouseButton(event.button),
			action: actionToMouseAction(event.action),
			ctrl: event.ctrl,
			meta: event.meta,
			shift: event.shift,
			protocol: 'sgr' as MouseProtocol,
			raw: new Uint8Array(0),
		});

		// Emit to event bus
		getInputControlEventBus().emit('mouse', event);
	};

	const state: InputControlState = {
		world,
		program,
		keysEnabled: false,
		mouseEnabled: false,
		mouseMode: options.mouseMode ?? MouseTrackingMode.NORMAL,
		keyHandler,
		mouseHandler,
	};

	// Register in active controls
	activeControls.set(world, state);

	// Apply initial options
	if (options.keys) {
		enableKeysInternal(state);
	}
	if (options.mouse) {
		enableMouseInternal(state);
	}

	return state;
}

/**
 * Gets the input control for a world.
 *
 * @param world - The ECS world
 * @returns The InputControlState or undefined
 */
export function getInputControl(world: World): InputControlState | undefined {
	return activeControls.get(world);
}

/**
 * Destroys the input control for a world.
 *
 * @param state - The InputControlState
 */
export function destroyInputControl(state: InputControlState): void {
	disableKeys(state);
	disableMouse(state);
	activeControls.delete(state.world);
}

// =============================================================================
// KEYBOARD CONTROL
// =============================================================================

/**
 * Internal function to enable keyboard input.
 */
function enableKeysInternal(state: InputControlState): void {
	if (state.keysEnabled) return;

	state.program.on('key', state.keyHandler);
	state.keysEnabled = true;
}

/**
 * Enables keyboard input handling.
 *
 * @param state - The InputControlState
 *
 * @example
 * ```typescript
 * enableKeys(inputControl);
 * ```
 */
export function enableKeys(state: InputControlState): void {
	enableKeysInternal(state);
	getInputControlEventBus().emit('keysEnabled', undefined);
}

/**
 * Disables keyboard input handling.
 *
 * @param state - The InputControlState
 *
 * @example
 * ```typescript
 * disableKeys(inputControl);
 * ```
 */
export function disableKeys(state: InputControlState): void {
	if (!state.keysEnabled) return;

	state.program.off('key', state.keyHandler);
	state.keysEnabled = false;
	getInputControlEventBus().emit('keysDisabled', undefined);
}

/**
 * Checks if keyboard input is enabled.
 *
 * @param state - The InputControlState
 * @returns true if keyboard input is enabled
 */
export function areKeysEnabled(state: InputControlState): boolean {
	return state.keysEnabled;
}

// =============================================================================
// MOUSE CONTROL
// =============================================================================

/**
 * Internal function to enable mouse input.
 */
function enableMouseInternal(state: InputControlState, mode?: MouseModeValue): void {
	if (state.mouseEnabled) return;

	const mouseMode = mode ?? state.mouseMode;
	state.mouseMode = mouseMode;

	// Send mouse enable sequence to terminal
	const output = state.program.output;
	if (output && typeof output.write === 'function') {
		switch (mouseMode) {
			case MouseTrackingMode.NORMAL:
				output.write(mouse.enableNormal());
				break;
			case MouseTrackingMode.BUTTON:
				output.write(mouse.enableButtonEvent());
				break;
			case MouseTrackingMode.ANY:
				output.write(mouse.enableAnyEvent());
				break;
			case MouseTrackingMode.SGR:
				output.write(mouse.enableSGR());
				break;
		}
	}

	state.program.on('mouse', state.mouseHandler);
	state.mouseEnabled = true;
}

/**
 * Enables mouse input handling.
 *
 * @param state - The InputControlState
 * @param mode - Mouse tracking mode (optional)
 *
 * @example
 * ```typescript
 * // Enable with default mode
 * enableMouse(inputControl);
 *
 * // Enable with specific mode
 * enableMouse(inputControl, MouseTrackingMode.ANY);
 * ```
 */
export function enableMouse(state: InputControlState, mode?: MouseModeValue): void {
	enableMouseInternal(state, mode);
	getInputControlEventBus().emit('mouseEnabled', state.mouseMode);
}

/**
 * Disables mouse input handling.
 *
 * @param state - The InputControlState
 *
 * @example
 * ```typescript
 * disableMouse(inputControl);
 * ```
 */
export function disableMouse(state: InputControlState): void {
	if (!state.mouseEnabled) return;

	// Send mouse disable sequence to terminal
	const output = state.program.output;
	if (output && typeof output.write === 'function') {
		output.write(mouse.disableAll());
	}

	state.program.off('mouse', state.mouseHandler);
	state.mouseEnabled = false;
	getInputControlEventBus().emit('mouseDisabled', undefined);
}

/**
 * Checks if mouse input is enabled.
 *
 * @param state - The InputControlState
 * @returns true if mouse input is enabled
 */
export function isMouseEnabled(state: InputControlState): boolean {
	return state.mouseEnabled;
}

/**
 * Gets the current mouse tracking mode.
 *
 * @param state - The InputControlState
 * @returns The mouse tracking mode
 */
export function getMouseMode(state: InputControlState): MouseModeValue {
	return state.mouseMode;
}

/**
 * Sets the mouse tracking mode.
 * If mouse is currently enabled, it will be re-enabled with the new mode.
 *
 * @param state - The InputControlState
 * @param mode - The new mouse tracking mode
 */
export function setMouseMode(state: InputControlState, mode: MouseModeValue): void {
	const wasEnabled = state.mouseEnabled;

	if (wasEnabled) {
		disableMouse(state);
	}

	state.mouseMode = mode;

	if (wasEnabled) {
		enableMouse(state, mode);
	}
}

// =============================================================================
// COMBINED CONTROL
// =============================================================================

/**
 * Enables both keyboard and mouse input handling.
 *
 * @param state - The InputControlState
 * @param mouseMode - Mouse tracking mode (optional)
 *
 * @example
 * ```typescript
 * enableInput(inputControl);
 * ```
 */
export function enableInput(state: InputControlState, mouseMode?: MouseModeValue): void {
	enableKeys(state);
	enableMouse(state, mouseMode);
}

/**
 * Disables both keyboard and mouse input handling.
 *
 * @param state - The InputControlState
 *
 * @example
 * ```typescript
 * disableInput(inputControl);
 * ```
 */
export function disableInput(state: InputControlState): void {
	disableKeys(state);
	disableMouse(state);
}

/**
 * Checks if any input is enabled.
 *
 * @param state - The InputControlState
 * @returns true if either keyboard or mouse input is enabled
 */
export function isInputEnabled(state: InputControlState): boolean {
	return state.keysEnabled || state.mouseEnabled;
}

// =============================================================================
// WORLD-LEVEL CONVENIENCE
// =============================================================================

/**
 * Enables keyboard input for a world.
 *
 * @param world - The ECS world
 * @returns true if successfully enabled
 */
export function enableWorldKeys(world: World): boolean {
	const state = activeControls.get(world);
	if (!state) return false;
	enableKeys(state);
	return true;
}

/**
 * Disables keyboard input for a world.
 *
 * @param world - The ECS world
 * @returns true if successfully disabled
 */
export function disableWorldKeys(world: World): boolean {
	const state = activeControls.get(world);
	if (!state) return false;
	disableKeys(state);
	return true;
}

/**
 * Enables mouse input for a world.
 *
 * @param world - The ECS world
 * @param mode - Mouse tracking mode (optional)
 * @returns true if successfully enabled
 */
export function enableWorldMouse(world: World, mode?: MouseModeValue): boolean {
	const state = activeControls.get(world);
	if (!state) return false;
	enableMouse(state, mode);
	return true;
}

/**
 * Disables mouse input for a world.
 *
 * @param world - The ECS world
 * @returns true if successfully disabled
 */
export function disableWorldMouse(world: World): boolean {
	const state = activeControls.get(world);
	if (!state) return false;
	disableMouse(state);
	return true;
}

/**
 * Enables all input for a world.
 *
 * @param world - The ECS world
 * @param mouseMode - Mouse tracking mode (optional)
 * @returns true if successfully enabled
 */
export function enableWorldInput(world: World, mouseMode?: MouseModeValue): boolean {
	const state = activeControls.get(world);
	if (!state) return false;
	enableInput(state, mouseMode);
	return true;
}

/**
 * Disables all input for a world.
 *
 * @param world - The ECS world
 * @returns true if successfully disabled
 */
export function disableWorldInput(world: World): boolean {
	const state = activeControls.get(world);
	if (!state) return false;
	disableInput(state);
	return true;
}
