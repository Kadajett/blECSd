/**
 * Input components for keyboard and mouse state.
 * Uses SoA (Structure of Arrays) pattern for cache efficiency.
 * @module components/input
 */

import { addComponent, hasComponent, removeComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Modifier key bit flags for packed storage.
 */
export const ModifierFlags = {
	/** No modifiers pressed */
	NONE: 0,
	/** Ctrl key pressed */
	CTRL: 1 << 0,
	/** Meta/Alt key pressed */
	META: 1 << 1,
	/** Shift key pressed */
	SHIFT: 1 << 2,
} as const;

/**
 * Keyboard input component store using SoA pattern.
 *
 * Stores the current keyboard state for an entity:
 * - `lastKeyCode`: The last key code pressed (Unicode code point)
 * - `lastKeyTime`: Timestamp of the last key press
 * - `modifiers`: Packed modifier flags (ctrl|meta|shift)
 *
 * @example
 * ```typescript
 * import { KeyboardInput, getKeyboardInput, setKeyboardInput } from 'blecsd';
 *
 * // Set keyboard state
 * setKeyboardInput(world, entity, {
 *   lastKeyCode: 65, // 'A'
 *   modifiers: ModifierFlags.SHIFT,
 * });
 *
 * // Get keyboard state
 * const state = getKeyboardInput(world, entity);
 * console.log(state?.lastKeyCode); // 65
 * ```
 */
export const KeyboardInput = {
	/** Last key code pressed (Unicode code point, 0 = none) */
	lastKeyCode: new Uint32Array(DEFAULT_CAPACITY),
	/** Timestamp of last key press (ms since epoch) */
	lastKeyTime: new Float64Array(DEFAULT_CAPACITY),
	/** Packed modifiers: bit 0 = ctrl, bit 1 = meta, bit 2 = shift */
	modifiers: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Keyboard input data returned by getKeyboardInput.
 */
export interface KeyboardInputData {
	readonly lastKeyCode: number;
	readonly lastKeyTime: number;
	readonly modifiers: number;
	readonly ctrl: boolean;
	readonly meta: boolean;
	readonly shift: boolean;
}

/**
 * Options for setting keyboard input.
 */
export interface KeyboardInputOptions {
	/** Last key code pressed (Unicode code point) */
	lastKeyCode?: number;
	/** Timestamp of last key press */
	lastKeyTime?: number;
	/** Packed modifier flags or individual modifiers */
	modifiers?: number;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
}

/**
 * Mouse button constants.
 */
export const MouseButtons = {
	NONE: 0,
	LEFT: 1,
	MIDDLE: 2,
	RIGHT: 3,
	WHEEL_UP: 4,
	WHEEL_DOWN: 5,
} as const;

/**
 * Mouse input component store using SoA pattern.
 *
 * Stores the current mouse state for an entity:
 * - `x`, `y`: Current mouse position
 * - `button`: Currently pressed button
 * - `pressed`: Whether any button is pressed
 * - `lastClickTime`: Timestamp of last click
 * - `clickCount`: For double/triple click detection
 *
 * @example
 * ```typescript
 * import { MouseInput, getMouseInput, setMouseInput } from 'blecsd';
 *
 * // Set mouse state
 * setMouseInput(world, entity, {
 *   x: 10,
 *   y: 20,
 *   button: MouseButtons.LEFT,
 *   pressed: true,
 * });
 *
 * // Get mouse state
 * const state = getMouseInput(world, entity);
 * console.log(`Mouse at ${state?.x}, ${state?.y}`);
 * ```
 */
export const MouseInput = {
	/** X coordinate (0-indexed) */
	x: new Int16Array(DEFAULT_CAPACITY),
	/** Y coordinate (0-indexed) */
	y: new Int16Array(DEFAULT_CAPACITY),
	/** Current button (0 = none, 1 = left, 2 = middle, 3 = right, 4 = wheelUp, 5 = wheelDown) */
	button: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether button is currently pressed (0 = released, 1 = pressed) */
	pressed: new Uint8Array(DEFAULT_CAPACITY),
	/** Timestamp of last click (ms since epoch) */
	lastClickTime: new Float64Array(DEFAULT_CAPACITY),
	/** Click count for double/triple click detection */
	clickCount: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Mouse input data returned by getMouseInput.
 */
export interface MouseInputData {
	readonly x: number;
	readonly y: number;
	readonly button: number;
	readonly pressed: boolean;
	readonly lastClickTime: number;
	readonly clickCount: number;
}

/**
 * Options for setting mouse input.
 */
export interface MouseInputOptions {
	x?: number;
	y?: number;
	button?: number;
	pressed?: boolean;
	lastClickTime?: number;
	clickCount?: number;
}

/**
 * Input buffer component store for text input.
 *
 * Used for entities that accept text input (like text fields).
 * The actual text is stored in InputBufferStore, indexed by bufferId.
 *
 * @example
 * ```typescript
 * import { InputBuffer, getInputBuffer, setInputBuffer } from 'blecsd';
 *
 * // Associate entity with a text buffer
 * setInputBuffer(world, entity, { bufferId: 1, cursorPos: 5 });
 *
 * // Get buffer info
 * const buf = getInputBuffer(world, entity);
 * const text = inputBufferStore.getText(buf?.bufferId ?? 0);
 * ```
 */
export const InputBuffer = {
	/** Reference to buffer in InputBufferStore */
	bufferId: new Uint32Array(DEFAULT_CAPACITY),
	/** Cursor position within the buffer */
	cursorPos: new Uint16Array(DEFAULT_CAPACITY),
	/** Selection start position (-1 = no selection) */
	selectionStart: new Int16Array(DEFAULT_CAPACITY),
	/** Selection end position */
	selectionEnd: new Int16Array(DEFAULT_CAPACITY),
};

/**
 * Input buffer data returned by getInputBuffer.
 */
export interface InputBufferData {
	readonly bufferId: number;
	readonly cursorPos: number;
	readonly selectionStart: number;
	readonly selectionEnd: number;
	readonly hasSelection: boolean;
}

/**
 * Options for setting input buffer.
 */
export interface InputBufferOptions {
	bufferId?: number;
	cursorPos?: number;
	selectionStart?: number;
	selectionEnd?: number;
}

// =============================================================================
// InputBufferStore - Text storage for input buffers
// =============================================================================

// =============================================================================
// INPUT BUFFER STORE (module-level state, no class)
// =============================================================================

const inputBuffers = new Map<number, string>();
let nextInputBufferId = 1;

/**
 * Global store for input buffer text content.
 *
 * @example
 * ```typescript
 * import { inputBufferStore } from 'blecsd';
 *
 * // Create a new buffer
 * const bufferId = inputBufferStore.create('Hello');
 *
 * // Manipulate text
 * inputBufferStore.insert(bufferId, 5, ' World');
 * console.log(inputBufferStore.getText(bufferId)); // 'Hello World'
 *
 * // Delete text
 * inputBufferStore.delete(bufferId, 5, 11);
 * console.log(inputBufferStore.getText(bufferId)); // 'Hello'
 * ```
 */
export const inputBufferStore = {
	/** Creates a new buffer and returns its ID. */
	create(initialText = ''): number {
		const id = nextInputBufferId++;
		inputBuffers.set(id, initialText);
		return id;
	},
	/** Gets the text content of a buffer. */
	getText(bufferId: number): string {
		return inputBuffers.get(bufferId) ?? '';
	},
	/** Sets the text content of a buffer. */
	setText(bufferId: number, text: string): void {
		if (inputBuffers.has(bufferId)) {
			inputBuffers.set(bufferId, text);
		}
	},
	/** Inserts text at a position. */
	insert(bufferId: number, position: number, text: string): void {
		const current = inputBuffers.get(bufferId) ?? '';
		const before = current.slice(0, position);
		const after = current.slice(position);
		inputBuffers.set(bufferId, before + text + after);
	},
	/** Deletes text in a range. */
	delete(bufferId: number, start: number, end: number): void {
		const current = inputBuffers.get(bufferId) ?? '';
		const before = current.slice(0, start);
		const after = current.slice(end);
		inputBuffers.set(bufferId, before + after);
	},
	/** Gets the length of a buffer's text. */
	getLength(bufferId: number): number {
		return (inputBuffers.get(bufferId) ?? '').length;
	},
	/** Removes a buffer. */
	remove(bufferId: number): boolean {
		return inputBuffers.delete(bufferId);
	},
	/** Checks if a buffer exists. */
	has(bufferId: number): boolean {
		return inputBuffers.has(bufferId);
	},
	/** Clears all buffers. */
	clear(): void {
		inputBuffers.clear();
		nextInputBufferId = 1;
	},
};

// =============================================================================
// Helper Functions - Keyboard Input
// =============================================================================

/**
 * Packs modifier flags from individual booleans.
 *
 * @param ctrl - Ctrl key pressed
 * @param meta - Meta/Alt key pressed
 * @param shift - Shift key pressed
 * @returns Packed modifier byte
 *
 * @example
 * ```typescript
 * import { packModifiers, ModifierFlags } from 'blecsd';
 *
 * const mods = packModifiers(true, false, true);
 * console.log(mods === (ModifierFlags.CTRL | ModifierFlags.SHIFT)); // true
 * ```
 */
export function packModifiers(ctrl: boolean, meta: boolean, shift: boolean): number {
	let flags = 0;
	if (ctrl) flags |= ModifierFlags.CTRL;
	if (meta) flags |= ModifierFlags.META;
	if (shift) flags |= ModifierFlags.SHIFT;
	return flags;
}

/**
 * Unpacks modifier flags to individual booleans.
 *
 * @param modifiers - Packed modifier byte
 * @returns Object with ctrl, meta, shift booleans
 *
 * @example
 * ```typescript
 * import { unpackModifiers, ModifierFlags } from 'blecsd';
 *
 * const { ctrl, meta, shift } = unpackModifiers(ModifierFlags.CTRL | ModifierFlags.SHIFT);
 * console.log(ctrl);  // true
 * console.log(meta);  // false
 * console.log(shift); // true
 * ```
 */
export function unpackModifiers(modifiers: number): {
	ctrl: boolean;
	meta: boolean;
	shift: boolean;
} {
	return {
		ctrl: !!(modifiers & ModifierFlags.CTRL),
		meta: !!(modifiers & ModifierFlags.META),
		shift: !!(modifiers & ModifierFlags.SHIFT),
	};
}

/**
 * Initializes keyboard input with default values.
 */
function initKeyboardInput(eid: Entity): void {
	KeyboardInput.lastKeyCode[eid] = 0;
	KeyboardInput.lastKeyTime[eid] = 0;
	KeyboardInput.modifiers[eid] = 0;
}

/**
 * Sets the keyboard input state for an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param options - Keyboard input options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setKeyboardInput, ModifierFlags } from 'blecsd';
 *
 * setKeyboardInput(world, entity, {
 *   lastKeyCode: 'A'.charCodeAt(0),
 *   modifiers: ModifierFlags.SHIFT,
 * });
 * ```
 */
export function setKeyboardInput(world: World, eid: Entity, options: KeyboardInputOptions): Entity {
	if (!hasComponent(world, eid, KeyboardInput)) {
		addComponent(world, eid, KeyboardInput);
		initKeyboardInput(eid);
	}

	if (options.lastKeyCode !== undefined) {
		KeyboardInput.lastKeyCode[eid] = options.lastKeyCode;
	}
	if (options.lastKeyTime !== undefined) {
		KeyboardInput.lastKeyTime[eid] = options.lastKeyTime;
	}

	// Handle modifiers
	if (options.modifiers !== undefined) {
		KeyboardInput.modifiers[eid] = options.modifiers;
	} else if (
		options.ctrl !== undefined ||
		options.meta !== undefined ||
		options.shift !== undefined
	) {
		const current = unpackModifiers(KeyboardInput.modifiers[eid] ?? 0);
		KeyboardInput.modifiers[eid] = packModifiers(
			options.ctrl ?? current.ctrl,
			options.meta ?? current.meta,
			options.shift ?? current.shift,
		);
	}

	return eid;
}

/**
 * Gets the keyboard input state for an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Keyboard input data or undefined if no component
 *
 * @example
 * ```typescript
 * import { getKeyboardInput } from 'blecsd';
 *
 * const input = getKeyboardInput(world, entity);
 * if (input?.ctrl && input.lastKeyCode === 'C'.charCodeAt(0)) {
 *   console.log('Ctrl+C pressed');
 * }
 * ```
 */
export function getKeyboardInput(world: World, eid: Entity): KeyboardInputData | undefined {
	if (!hasComponent(world, eid, KeyboardInput)) {
		return undefined;
	}

	const modifiers = KeyboardInput.modifiers[eid] ?? 0;
	const unpacked = unpackModifiers(modifiers);

	return {
		lastKeyCode: KeyboardInput.lastKeyCode[eid] ?? 0,
		lastKeyTime: KeyboardInput.lastKeyTime[eid] ?? 0,
		modifiers,
		ctrl: unpacked.ctrl,
		meta: unpacked.meta,
		shift: unpacked.shift,
	};
}

/**
 * Checks if an entity has the KeyboardInput component.
 */
export function hasKeyboardInput(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, KeyboardInput);
}

/**
 * Removes the KeyboardInput component from an entity.
 */
export function removeKeyboardInput(world: World, eid: Entity): void {
	if (hasComponent(world, eid, KeyboardInput)) {
		removeComponent(world, eid, KeyboardInput);
	}
}

/**
 * Clears the keyboard input state (sets to no key pressed).
 */
export function clearKeyboardInput(world: World, eid: Entity): void {
	if (hasComponent(world, eid, KeyboardInput)) {
		KeyboardInput.lastKeyCode[eid] = 0;
		KeyboardInput.modifiers[eid] = 0;
	}
}

// =============================================================================
// Helper Functions - Mouse Input
// =============================================================================

/** Double-click threshold in milliseconds */
const DOUBLE_CLICK_THRESHOLD = 500;

/** Maximum clicks to track (for triple-click) */
const MAX_CLICK_COUNT = 3;

/**
 * Initializes mouse input with default values.
 */
function initMouseInput(eid: Entity): void {
	MouseInput.x[eid] = 0;
	MouseInput.y[eid] = 0;
	MouseInput.button[eid] = 0;
	MouseInput.pressed[eid] = 0;
	MouseInput.lastClickTime[eid] = 0;
	MouseInput.clickCount[eid] = 0;
}

/**
 * Sets the mouse input state for an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param options - Mouse input options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setMouseInput, MouseButtons } from 'blecsd';
 *
 * setMouseInput(world, entity, {
 *   x: 10,
 *   y: 20,
 *   button: MouseButtons.LEFT,
 *   pressed: true,
 * });
 * ```
 */
export function setMouseInput(world: World, eid: Entity, options: MouseInputOptions): Entity {
	if (!hasComponent(world, eid, MouseInput)) {
		addComponent(world, eid, MouseInput);
		initMouseInput(eid);
	}

	if (options.x !== undefined) {
		MouseInput.x[eid] = options.x;
	}
	if (options.y !== undefined) {
		MouseInput.y[eid] = options.y;
	}
	if (options.button !== undefined) {
		MouseInput.button[eid] = options.button;
	}
	if (options.pressed !== undefined) {
		MouseInput.pressed[eid] = options.pressed ? 1 : 0;
	}
	if (options.lastClickTime !== undefined) {
		MouseInput.lastClickTime[eid] = options.lastClickTime;
	}
	if (options.clickCount !== undefined) {
		MouseInput.clickCount[eid] = options.clickCount;
	}

	return eid;
}

/**
 * Gets the mouse input state for an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Mouse input data or undefined if no component
 *
 * @example
 * ```typescript
 * import { getMouseInput } from 'blecsd';
 *
 * const input = getMouseInput(world, entity);
 * if (input?.pressed && input.button === MouseButtons.LEFT) {
 *   console.log(`Left click at ${input.x}, ${input.y}`);
 * }
 * ```
 */
export function getMouseInput(world: World, eid: Entity): MouseInputData | undefined {
	if (!hasComponent(world, eid, MouseInput)) {
		return undefined;
	}

	return {
		x: MouseInput.x[eid] ?? 0,
		y: MouseInput.y[eid] ?? 0,
		button: MouseInput.button[eid] ?? 0,
		pressed: (MouseInput.pressed[eid] ?? 0) === 1,
		lastClickTime: MouseInput.lastClickTime[eid] ?? 0,
		clickCount: MouseInput.clickCount[eid] ?? 0,
	};
}

/**
 * Checks if an entity has the MouseInput component.
 */
export function hasMouseInput(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, MouseInput);
}

/**
 * Removes the MouseInput component from an entity.
 */
export function removeMouseInput(world: World, eid: Entity): void {
	if (hasComponent(world, eid, MouseInput)) {
		removeComponent(world, eid, MouseInput);
	}
}

/**
 * Records a click event and updates click count for double/triple click detection.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param x - Click X coordinate
 * @param y - Click Y coordinate
 * @param button - Mouse button
 * @param timestamp - Click timestamp (default: Date.now())
 * @returns Updated click count (1 = single, 2 = double, 3 = triple)
 *
 * @example
 * ```typescript
 * import { recordClick, MouseButtons } from 'blecsd';
 *
 * const clickCount = recordClick(world, entity, 10, 20, MouseButtons.LEFT);
 * if (clickCount === 2) {
 *   console.log('Double click!');
 * }
 * ```
 */
export function recordClick(
	world: World,
	eid: Entity,
	x: number,
	y: number,
	button: number,
	timestamp = Date.now(),
): number {
	if (!hasComponent(world, eid, MouseInput)) {
		addComponent(world, eid, MouseInput);
		initMouseInput(eid);
	}

	const lastTime = MouseInput.lastClickTime[eid] ?? 0;
	const lastButton = MouseInput.button[eid] ?? 0;
	let clickCount = MouseInput.clickCount[eid] ?? 0;

	// Check if this is a continuation of clicks
	if (button === lastButton && timestamp - lastTime < DOUBLE_CLICK_THRESHOLD) {
		clickCount = Math.min(clickCount + 1, MAX_CLICK_COUNT);
	} else {
		clickCount = 1;
	}

	MouseInput.x[eid] = x;
	MouseInput.y[eid] = y;
	MouseInput.button[eid] = button;
	MouseInput.pressed[eid] = 1;
	MouseInput.lastClickTime[eid] = timestamp;
	MouseInput.clickCount[eid] = clickCount;

	return clickCount;
}

/**
 * Clears the mouse input state.
 */
export function clearMouseInput(world: World, eid: Entity): void {
	if (hasComponent(world, eid, MouseInput)) {
		MouseInput.button[eid] = 0;
		MouseInput.pressed[eid] = 0;
		MouseInput.clickCount[eid] = 0;
	}
}

// =============================================================================
// Helper Functions - Input Buffer
// =============================================================================

/**
 * Initializes input buffer with default values.
 */
function initInputBuffer(eid: Entity): void {
	InputBuffer.bufferId[eid] = 0;
	InputBuffer.cursorPos[eid] = 0;
	InputBuffer.selectionStart[eid] = -1;
	InputBuffer.selectionEnd[eid] = -1;
}

/**
 * Sets the input buffer state for an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param options - Input buffer options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setInputBuffer, inputBufferStore } from 'blecsd';
 *
 * const bufferId = inputBufferStore.create('Hello');
 * setInputBuffer(world, entity, { bufferId, cursorPos: 5 });
 * ```
 */
export function setInputBuffer(world: World, eid: Entity, options: InputBufferOptions): Entity {
	if (!hasComponent(world, eid, InputBuffer)) {
		addComponent(world, eid, InputBuffer);
		initInputBuffer(eid);
	}

	if (options.bufferId !== undefined) {
		InputBuffer.bufferId[eid] = options.bufferId;
	}
	if (options.cursorPos !== undefined) {
		InputBuffer.cursorPos[eid] = options.cursorPos;
	}
	if (options.selectionStart !== undefined) {
		InputBuffer.selectionStart[eid] = options.selectionStart;
	}
	if (options.selectionEnd !== undefined) {
		InputBuffer.selectionEnd[eid] = options.selectionEnd;
	}

	return eid;
}

/**
 * Gets the input buffer state for an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Input buffer data or undefined if no component
 *
 * @example
 * ```typescript
 * import { getInputBuffer, inputBufferStore } from 'blecsd';
 *
 * const buf = getInputBuffer(world, entity);
 * if (buf) {
 *   const text = inputBufferStore.getText(buf.bufferId);
 *   console.log(`Text: ${text}, cursor at: ${buf.cursorPos}`);
 * }
 * ```
 */
export function getInputBuffer(world: World, eid: Entity): InputBufferData | undefined {
	if (!hasComponent(world, eid, InputBuffer)) {
		return undefined;
	}

	const selStart = InputBuffer.selectionStart[eid] ?? -1;
	const selEnd = InputBuffer.selectionEnd[eid] ?? -1;

	return {
		bufferId: InputBuffer.bufferId[eid] ?? 0,
		cursorPos: InputBuffer.cursorPos[eid] ?? 0,
		selectionStart: selStart,
		selectionEnd: selEnd,
		hasSelection: selStart >= 0 && selEnd >= 0 && selStart !== selEnd,
	};
}

/**
 * Checks if an entity has the InputBuffer component.
 */
export function hasInputBuffer(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, InputBuffer);
}

/**
 * Removes the InputBuffer component from an entity.
 * Also removes the associated buffer from the store.
 */
export function removeInputBuffer(world: World, eid: Entity): void {
	if (hasComponent(world, eid, InputBuffer)) {
		const bufferId = InputBuffer.bufferId[eid] ?? 0;
		if (bufferId > 0) {
			inputBufferStore.remove(bufferId);
		}
		removeComponent(world, eid, InputBuffer);
	}
}

/**
 * Gets the text content of an entity's input buffer.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns Buffer text or empty string if no buffer
 *
 * @example
 * ```typescript
 * import { getInputBufferText } from 'blecsd';
 *
 * const text = getInputBufferText(world, entity);
 * console.log(`Input: ${text}`);
 * ```
 */
export function getInputBufferText(world: World, eid: Entity): string {
	if (!hasComponent(world, eid, InputBuffer)) {
		return '';
	}
	const bufferId = InputBuffer.bufferId[eid] ?? 0;
	return inputBufferStore.getText(bufferId);
}

/**
 * Sets the text content of an entity's input buffer.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param text - New text content
 *
 * @example
 * ```typescript
 * import { setInputBufferText } from 'blecsd';
 *
 * setInputBufferText(world, entity, 'New text');
 * ```
 */
export function setInputBufferText(world: World, eid: Entity, text: string): void {
	if (!hasComponent(world, eid, InputBuffer)) {
		return;
	}
	const bufferId = InputBuffer.bufferId[eid] ?? 0;
	if (bufferId > 0) {
		inputBufferStore.setText(bufferId, text);
	}
}

/**
 * Clears the selection in an input buffer.
 */
export function clearInputBufferSelection(world: World, eid: Entity): void {
	if (hasComponent(world, eid, InputBuffer)) {
		InputBuffer.selectionStart[eid] = -1;
		InputBuffer.selectionEnd[eid] = -1;
	}
}

/**
 * Sets a selection range in an input buffer.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param start - Selection start position
 * @param end - Selection end position
 */
export function setInputBufferSelection(
	world: World,
	eid: Entity,
	start: number,
	end: number,
): void {
	if (hasComponent(world, eid, InputBuffer)) {
		InputBuffer.selectionStart[eid] = start;
		InputBuffer.selectionEnd[eid] = end;
	}
}
