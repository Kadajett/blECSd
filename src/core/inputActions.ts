/**
 * Input action mapping system for game controls.
 *
 * Maps physical inputs (keys, mouse buttons) to logical game actions.
 * Supports multiple bindings per action, runtime rebinding, and save/load.
 *
 * @module core/inputActions
 */

import { z } from 'zod';
import type { MouseButton } from '../terminal/mouseParser';
import type { InputState } from './inputState';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for a single action binding.
 */
export interface ActionBinding {
	/** Unique action identifier (e.g., 'jump', 'attack', 'move_left') */
	readonly action: string;
	/** Keys that activate this action */
	readonly keys: readonly string[];
	/** Mouse buttons that activate this action */
	readonly mouseButtons?: readonly MouseButton[] | undefined;
	/** Whether action fires continuously while held (default: false) */
	readonly continuous?: boolean | undefined;
	/** Deadzone for analog inputs (0-1, default: 0.1) */
	readonly deadzone?: number | undefined;
}

/**
 * Runtime state of an action.
 */
export interface ActionState {
	/** Action is currently active (input is held) */
	readonly active: boolean;
	/** Action was just activated this frame */
	readonly justActivated: boolean;
	/** Action was just deactivated this frame */
	readonly justDeactivated: boolean;
	/** How long the action has been active (ms) */
	readonly activeTime: number;
	/** Analog value (0-1), 1 when digital input is pressed */
	readonly value: number;
}

/**
 * Serialized action bindings for save/load.
 */
export interface SerializedBindings {
	readonly version: number;
	readonly bindings: readonly {
		readonly action: string;
		readonly keys: readonly string[];
		readonly mouseButtons?: readonly string[] | undefined;
		readonly continuous?: boolean | undefined;
	}[];
}

/**
 * Callback for action state changes.
 */
export type ActionCallback = (action: string, state: ActionState, inputState: InputState) => void;

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for action binding validation.
 */
export const ActionBindingSchema = z.object({
	action: z.string().min(1, 'Action name is required'),
	keys: z.array(z.string()).default([]),
	mouseButtons: z
		.array(z.enum(['left', 'right', 'middle', 'wheelUp', 'wheelDown', 'unknown']))
		.optional(),
	continuous: z.boolean().default(false),
	deadzone: z.number().min(0).max(1).default(0.1),
});

/**
 * Zod schema for serialized bindings.
 */
export const SerializedBindingsSchema = z.object({
	version: z.number().int().positive(),
	bindings: z.array(
		z.object({
			action: z.string(),
			keys: z.array(z.string()),
			mouseButtons: z.array(z.string()).optional(),
			continuous: z.boolean().optional(),
		}),
	),
});

// =============================================================================
// INTERNAL TYPES
// =============================================================================

interface MutableActionState {
	active: boolean;
	justActivated: boolean;
	justDeactivated: boolean;
	activeTime: number;
	value: number;
}

interface InternalBinding {
	action: string;
	keys: string[];
	mouseButtons: MouseButton[];
	continuous: boolean;
	deadzone: number;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_ACTION_STATE: ActionState = {
	active: false,
	justActivated: false,
	justDeactivated: false,
	activeTime: 0,
	value: 0,
};

const CURRENT_VERSION = 1;

// =============================================================================
// INPUT ACTION MANAGER INTERFACE
// =============================================================================

/**
 * InputActionManager interface for type-safe access.
 */
export interface InputActionManager {
	register(binding: ActionBinding): InputActionManager;
	registerAll(bindings: readonly ActionBinding[]): InputActionManager;
	unregister(action: string): boolean;
	hasAction(action: string): boolean;
	getActions(): string[];
	getBinding(action: string): ActionBinding | undefined;
	update(inputState: InputState, deltaTime: number): void;
	isActive(action: string): boolean;
	isJustActivated(action: string): boolean;
	isJustDeactivated(action: string): boolean;
	getValue(action: string): number;
	getActiveTime(action: string): number;
	getState(action: string): ActionState;
	getActiveActions(): string[];
	rebindKeys(action: string, keys: readonly string[]): boolean;
	rebindMouseButtons(action: string, buttons: readonly MouseButton[]): boolean;
	addKey(action: string, key: string): boolean;
	removeKey(action: string, key: string): boolean;
	getKeysForAction(action: string): string[];
	getMouseButtonsForAction(action: string): MouseButton[];
	getActionsForKey(key: string): string[];
	onAction(action: string, callback: ActionCallback): () => void;
	onAnyAction(callback: ActionCallback): () => void;
	saveBindings(): SerializedBindings;
	loadBindings(data: unknown): void;
	toJSON(pretty?: boolean): string;
	fromJSON(json: string): void;
	resetStates(): void;
	clear(): void;
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

function checkBindingActive(binding: InternalBinding, inputState: InputState): boolean {
	// Check keys
	for (const key of binding.keys) {
		if (inputState.isKeyDown(key)) {
			return true;
		}
	}

	// Check mouse buttons
	for (const button of binding.mouseButtons) {
		if (inputState.isMouseButtonDown(button)) {
			return true;
		}
	}

	return false;
}

/**
 * Creates a new InputActionManager.
 *
 * @param initialBindings - Optional initial bindings to register
 * @returns A new InputActionManager instance
 *
 * @example
 * ```typescript
 * import { createInputActionManager } from 'blecsd';
 *
 * const actions = createInputActionManager([
 *   { action: 'jump', keys: ['space'] },
 *   { action: 'attack', keys: ['j'], mouseButtons: ['left'] },
 * ]);
 * ```
 */
export function createInputActionManager(
	initialBindings?: readonly ActionBinding[],
): InputActionManager {
	const bindings = new Map<string, InternalBinding>();
	const states = new Map<string, MutableActionState>();
	const callbacks = new Map<string, Set<ActionCallback>>();
	const globalCallbacks = new Set<ActionCallback>();

	function handleActivation(
		state: MutableActionState,
		action: string,
		inputState: InputState,
	): void {
		state.active = true;
		state.justActivated = true;
		state.activeTime = 0;
		state.value = 1;
		fireCallbacks(action, state, inputState);
	}

	function handleDeactivation(
		state: MutableActionState,
		action: string,
		inputState: InputState,
	): void {
		state.active = false;
		state.justDeactivated = true;
		state.value = 0;
		fireCallbacks(action, state, inputState);
	}

	function handleContinuousActive(
		state: MutableActionState,
		binding: InternalBinding,
		action: string,
		deltaMs: number,
		inputState: InputState,
	): void {
		state.activeTime += deltaMs;
		state.value = 1;
		if (binding.continuous) {
			fireCallbacks(action, state, inputState);
		}
	}

	function updateSingleAction(
		action: string,
		binding: InternalBinding,
		state: MutableActionState,
		deltaMs: number,
		inputState: InputState,
	): void {
		state.justActivated = false;
		state.justDeactivated = false;

		const wasActive = state.active;
		const isNowActive = checkBindingActive(binding, inputState);

		if (isNowActive && !wasActive) {
			handleActivation(state, action, inputState);
		} else if (!isNowActive && wasActive) {
			handleDeactivation(state, action, inputState);
		} else if (isNowActive) {
			handleContinuousActive(state, binding, action, deltaMs, inputState);
		}
	}

	function fireCallbacks(action: string, state: ActionState, inputState: InputState): void {
		// Fire action-specific callbacks
		const actionCallbacks = callbacks.get(action);
		if (actionCallbacks) {
			for (const callback of actionCallbacks) {
				callback(action, state, inputState);
			}
		}

		// Fire global callbacks
		for (const callback of globalCallbacks) {
			callback(action, state, inputState);
		}
	}

	const manager: InputActionManager = {
		register(binding: ActionBinding): InputActionManager {
			const validated = ActionBindingSchema.parse(binding);

			const internal: InternalBinding = {
				action: validated.action,
				keys: [...validated.keys],
				mouseButtons: validated.mouseButtons ? [...validated.mouseButtons] : [],
				continuous: validated.continuous ?? false,
				deadzone: validated.deadzone ?? 0.1,
			};

			bindings.set(validated.action, internal);

			// Initialize state if not exists
			if (!states.has(validated.action)) {
				states.set(validated.action, { ...DEFAULT_ACTION_STATE } as MutableActionState);
			}

			return manager;
		},

		registerAll(bindingList: readonly ActionBinding[]): InputActionManager {
			for (const binding of bindingList) {
				manager.register(binding);
			}
			return manager;
		},

		unregister(action: string): boolean {
			const existed = bindings.delete(action);
			states.delete(action);
			callbacks.delete(action);
			return existed;
		},

		hasAction(action: string): boolean {
			return bindings.has(action);
		},

		getActions(): string[] {
			return [...bindings.keys()];
		},

		getBinding(action: string): ActionBinding | undefined {
			const internal = bindings.get(action);
			if (!internal) return undefined;

			return {
				action: internal.action,
				keys: [...internal.keys],
				mouseButtons: internal.mouseButtons.length > 0 ? [...internal.mouseButtons] : undefined,
				continuous: internal.continuous,
				deadzone: internal.deadzone,
			};
		},

		update(inputState: InputState, deltaTime: number): void {
			const deltaMs = deltaTime * 1000;

			for (const [action, binding] of bindings) {
				const state = states.get(action);
				if (!state) continue;
				updateSingleAction(action, binding, state, deltaMs, inputState);
			}
		},

		isActive(action: string): boolean {
			return states.get(action)?.active ?? false;
		},

		isJustActivated(action: string): boolean {
			return states.get(action)?.justActivated ?? false;
		},

		isJustDeactivated(action: string): boolean {
			return states.get(action)?.justDeactivated ?? false;
		},

		getValue(action: string): number {
			return states.get(action)?.value ?? 0;
		},

		getActiveTime(action: string): number {
			return states.get(action)?.activeTime ?? 0;
		},

		getState(action: string): ActionState {
			return states.get(action) ?? DEFAULT_ACTION_STATE;
		},

		getActiveActions(): string[] {
			const active: string[] = [];
			for (const [action, state] of states) {
				if (state.active) {
					active.push(action);
				}
			}
			return active;
		},

		rebindKeys(action: string, keys: readonly string[]): boolean {
			const binding = bindings.get(action);
			if (!binding) return false;

			binding.keys = [...keys];
			return true;
		},

		rebindMouseButtons(action: string, buttons: readonly MouseButton[]): boolean {
			const binding = bindings.get(action);
			if (!binding) return false;

			binding.mouseButtons = [...buttons];
			return true;
		},

		addKey(action: string, key: string): boolean {
			const binding = bindings.get(action);
			if (!binding) return false;

			if (!binding.keys.includes(key)) {
				binding.keys.push(key);
			}
			return true;
		},

		removeKey(action: string, key: string): boolean {
			const binding = bindings.get(action);
			if (!binding) return false;

			const index = binding.keys.indexOf(key);
			if (index !== -1) {
				binding.keys.splice(index, 1);
				return true;
			}
			return false;
		},

		getKeysForAction(action: string): string[] {
			const binding = bindings.get(action);
			return binding ? [...binding.keys] : [];
		},

		getMouseButtonsForAction(action: string): MouseButton[] {
			const binding = bindings.get(action);
			return binding ? [...binding.mouseButtons] : [];
		},

		getActionsForKey(key: string): string[] {
			const actions: string[] = [];
			for (const [action, binding] of bindings) {
				if (binding.keys.includes(key)) {
					actions.push(action);
				}
			}
			return actions;
		},

		onAction(action: string, callback: ActionCallback): () => void {
			let cbs = callbacks.get(action);
			if (!cbs) {
				cbs = new Set();
				callbacks.set(action, cbs);
			}
			cbs.add(callback);

			return () => {
				cbs?.delete(callback);
			};
		},

		onAnyAction(callback: ActionCallback): () => void {
			globalCallbacks.add(callback);
			return () => {
				globalCallbacks.delete(callback);
			};
		},

		saveBindings(): SerializedBindings {
			const bindingsArray: Array<{
				action: string;
				keys: string[];
				mouseButtons?: string[] | undefined;
				continuous?: boolean | undefined;
			}> = [];

			for (const [, binding] of bindings) {
				bindingsArray.push({
					action: binding.action,
					keys: [...binding.keys],
					mouseButtons: binding.mouseButtons.length > 0 ? [...binding.mouseButtons] : undefined,
					continuous: binding.continuous || undefined,
				});
			}

			return {
				version: CURRENT_VERSION,
				bindings: bindingsArray,
			};
		},

		loadBindings(data: unknown): void {
			const validated = SerializedBindingsSchema.parse(data);

			// Clear existing bindings
			bindings.clear();
			states.clear();

			// Load new bindings
			for (const binding of validated.bindings) {
				manager.register({
					action: binding.action,
					keys: binding.keys,
					mouseButtons: binding.mouseButtons as MouseButton[] | undefined,
					continuous: binding.continuous,
				});
			}
		},

		toJSON(pretty = false): string {
			const data = manager.saveBindings();
			return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
		},

		fromJSON(json: string): void {
			const data = JSON.parse(json);
			manager.loadBindings(data);
		},

		resetStates(): void {
			for (const state of states.values()) {
				state.active = false;
				state.justActivated = false;
				state.justDeactivated = false;
				state.activeTime = 0;
				state.value = 0;
			}
		},

		clear(): void {
			bindings.clear();
			states.clear();
			callbacks.clear();
			globalCallbacks.clear();
		},
	};

	if (initialBindings) {
		manager.registerAll(initialBindings);
	}

	return manager;
}

// =============================================================================
// PRESET BINDINGS
// =============================================================================

/**
 * Common action presets for quick setup.
 */
export const ActionPresets = {
	/**
	 * Standard platformer controls.
	 */
	platformer: [
		{ action: 'move_left', keys: ['a', 'left'], continuous: true },
		{ action: 'move_right', keys: ['d', 'right'], continuous: true },
		{ action: 'jump', keys: ['space', 'w', 'up'] },
		{ action: 'crouch', keys: ['s', 'down'], continuous: true },
		{ action: 'attack', keys: ['j', 'enter'] },
	] as readonly ActionBinding[],

	/**
	 * Standard top-down controls.
	 */
	topDown: [
		{ action: 'move_up', keys: ['w', 'up'], continuous: true },
		{ action: 'move_down', keys: ['s', 'down'], continuous: true },
		{ action: 'move_left', keys: ['a', 'left'], continuous: true },
		{ action: 'move_right', keys: ['d', 'right'], continuous: true },
		{ action: 'action', keys: ['space', 'enter'] },
	] as readonly ActionBinding[],

	/**
	 * Menu navigation controls.
	 */
	menu: [
		{ action: 'up', keys: ['w', 'up'] },
		{ action: 'down', keys: ['s', 'down'] },
		{ action: 'left', keys: ['a', 'left'] },
		{ action: 'right', keys: ['d', 'right'] },
		{ action: 'confirm', keys: ['enter', 'space'] },
		{ action: 'cancel', keys: ['escape', 'backspace'] },
	] as readonly ActionBinding[],
} as const;
