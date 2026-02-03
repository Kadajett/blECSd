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
	readonly mouseButtons?: readonly MouseButton[];
	/** Whether action fires continuously while held (default: false) */
	readonly continuous?: boolean;
	/** Deadzone for analog inputs (0-1, default: 0.1) */
	readonly deadzone?: number;
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
		readonly mouseButtons?: readonly string[];
		readonly continuous?: boolean;
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
// INPUT ACTION MANAGER
// =============================================================================

/**
 * Manages input action mappings and state.
 *
 * @example
 * ```typescript
 * import { InputActionManager, createInputState } from 'blecsd';
 *
 * const inputState = createInputState();
 * const actions = new InputActionManager();
 *
 * // Register actions
 * actions.register({
 *   action: 'jump',
 *   keys: ['space', 'w'],
 *   continuous: false,
 * });
 *
 * actions.register({
 *   action: 'move_left',
 *   keys: ['a', 'left'],
 *   continuous: true,
 * });
 *
 * // In game loop
 * function update(deltaTime: number) {
 *   actions.update(inputState, deltaTime);
 *
 *   if (actions.isJustActivated('jump')) {
 *     player.jump();
 *   }
 *   if (actions.isActive('move_left')) {
 *     player.moveLeft();
 *   }
 * }
 * ```
 */
export class InputActionManager {
	private bindings: Map<string, InternalBinding> = new Map();
	private states: Map<string, MutableActionState> = new Map();
	private callbacks: Map<string, Set<ActionCallback>> = new Map();
	private globalCallbacks: Set<ActionCallback> = new Set();

	// =========================================================================
	// REGISTRATION
	// =========================================================================

	/**
	 * Registers an action binding.
	 * If the action already exists, it will be updated.
	 *
	 * @param binding - The action binding configuration
	 * @returns The manager for chaining
	 *
	 * @example
	 * ```typescript
	 * actions.register({
	 *   action: 'attack',
	 *   keys: ['j', 'enter'],
	 *   mouseButtons: ['left'],
	 *   continuous: false,
	 * });
	 * ```
	 */
	register(binding: ActionBinding): this {
		const validated = ActionBindingSchema.parse(binding);

		const internal: InternalBinding = {
			action: validated.action,
			keys: [...validated.keys],
			mouseButtons: validated.mouseButtons ? [...validated.mouseButtons] : [],
			continuous: validated.continuous ?? false,
			deadzone: validated.deadzone ?? 0.1,
		};

		this.bindings.set(validated.action, internal);

		// Initialize state if not exists
		if (!this.states.has(validated.action)) {
			this.states.set(validated.action, { ...DEFAULT_ACTION_STATE } as MutableActionState);
		}

		return this;
	}

	/**
	 * Registers multiple action bindings at once.
	 *
	 * @param bindings - Array of action bindings
	 * @returns The manager for chaining
	 *
	 * @example
	 * ```typescript
	 * actions.registerAll([
	 *   { action: 'jump', keys: ['space'] },
	 *   { action: 'attack', keys: ['j'] },
	 *   { action: 'move_left', keys: ['a', 'left'], continuous: true },
	 * ]);
	 * ```
	 */
	registerAll(bindings: readonly ActionBinding[]): this {
		for (const binding of bindings) {
			this.register(binding);
		}
		return this;
	}

	/**
	 * Unregisters an action.
	 *
	 * @param action - The action to unregister
	 * @returns true if the action was found and removed
	 */
	unregister(action: string): boolean {
		const existed = this.bindings.delete(action);
		this.states.delete(action);
		this.callbacks.delete(action);
		return existed;
	}

	/**
	 * Checks if an action is registered.
	 *
	 * @param action - The action to check
	 * @returns true if the action is registered
	 */
	hasAction(action: string): boolean {
		return this.bindings.has(action);
	}

	/**
	 * Gets all registered action names.
	 *
	 * @returns Array of action names
	 */
	getActions(): string[] {
		return [...this.bindings.keys()];
	}

	/**
	 * Gets the binding for an action.
	 *
	 * @param action - The action to get bindings for
	 * @returns The action binding, or undefined if not found
	 */
	getBinding(action: string): ActionBinding | undefined {
		const internal = this.bindings.get(action);
		if (!internal) return undefined;

		return {
			action: internal.action,
			keys: [...internal.keys],
			mouseButtons: internal.mouseButtons.length > 0 ? [...internal.mouseButtons] : undefined,
			continuous: internal.continuous,
			deadzone: internal.deadzone,
		};
	}

	// =========================================================================
	// UPDATE
	// =========================================================================

	/**
	 * Updates all action states based on current input.
	 * Call this once per frame after updating InputState.
	 *
	 * @param inputState - The current input state
	 * @param deltaTime - Time since last frame in seconds
	 *
	 * @example
	 * ```typescript
	 * function update(deltaTime: number) {
	 *   inputState.update(keys, mouse, deltaTime);
	 *   actions.update(inputState, deltaTime);
	 *
	 *   // Now query actions
	 *   if (actions.isActive('jump')) { ... }
	 * }
	 * ```
	 */
	update(inputState: InputState, deltaTime: number): void {
		const deltaMs = deltaTime * 1000;

		for (const [action, binding] of this.bindings) {
			const state = this.states.get(action);
			if (!state) continue;

			// Clear transient flags
			state.justActivated = false;
			state.justDeactivated = false;

			// Check if any bound input is active
			const wasActive = state.active;
			const isNowActive = this.checkBindingActive(binding, inputState);

			// Update state
			if (isNowActive && !wasActive) {
				// Just activated
				state.active = true;
				state.justActivated = true;
				state.activeTime = 0;
				state.value = 1;
				this.fireCallbacks(action, state, inputState);
			} else if (!isNowActive && wasActive) {
				// Just deactivated
				state.active = false;
				state.justDeactivated = true;
				state.value = 0;
				this.fireCallbacks(action, state, inputState);
			} else if (isNowActive) {
				// Still active
				state.activeTime += deltaMs;
				state.value = 1;

				// Fire callback for continuous actions
				if (binding.continuous) {
					this.fireCallbacks(action, state, inputState);
				}
			}
		}
	}

	/**
	 * Checks if any input for a binding is active.
	 */
	private checkBindingActive(binding: InternalBinding, inputState: InputState): boolean {
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
	 * Fires callbacks for an action state change.
	 */
	private fireCallbacks(action: string, state: ActionState, inputState: InputState): void {
		// Fire action-specific callbacks
		const actionCallbacks = this.callbacks.get(action);
		if (actionCallbacks) {
			for (const callback of actionCallbacks) {
				callback(action, state, inputState);
			}
		}

		// Fire global callbacks
		for (const callback of this.globalCallbacks) {
			callback(action, state, inputState);
		}
	}

	// =========================================================================
	// QUERIES
	// =========================================================================

	/**
	 * Checks if an action is currently active (input is held).
	 *
	 * @param action - The action to check
	 * @returns true if the action is active
	 *
	 * @example
	 * ```typescript
	 * if (actions.isActive('move_left')) {
	 *   player.moveLeft(deltaTime);
	 * }
	 * ```
	 */
	isActive(action: string): boolean {
		return this.states.get(action)?.active ?? false;
	}

	/**
	 * Checks if an action was just activated this frame.
	 *
	 * @param action - The action to check
	 * @returns true if the action was just activated
	 *
	 * @example
	 * ```typescript
	 * if (actions.isJustActivated('jump')) {
	 *   player.jump(); // Only triggers once per press
	 * }
	 * ```
	 */
	isJustActivated(action: string): boolean {
		return this.states.get(action)?.justActivated ?? false;
	}

	/**
	 * Checks if an action was just deactivated this frame.
	 *
	 * @param action - The action to check
	 * @returns true if the action was just deactivated
	 *
	 * @example
	 * ```typescript
	 * if (actions.isJustDeactivated('charge')) {
	 *   player.releaseCharge();
	 * }
	 * ```
	 */
	isJustDeactivated(action: string): boolean {
		return this.states.get(action)?.justDeactivated ?? false;
	}

	/**
	 * Gets the analog value for an action (0-1).
	 * For digital inputs, returns 1 when active, 0 when inactive.
	 *
	 * @param action - The action to check
	 * @returns Value between 0 and 1
	 *
	 * @example
	 * ```typescript
	 * const throttle = actions.getValue('accelerate');
	 * car.speed += throttle * maxAcceleration * deltaTime;
	 * ```
	 */
	getValue(action: string): number {
		return this.states.get(action)?.value ?? 0;
	}

	/**
	 * Gets how long an action has been active (ms).
	 *
	 * @param action - The action to check
	 * @returns Time in milliseconds, or 0 if not active
	 *
	 * @example
	 * ```typescript
	 * const chargeTime = actions.getActiveTime('charge');
	 * if (chargeTime > 1000) {
	 *   player.fullyCharged = true;
	 * }
	 * ```
	 */
	getActiveTime(action: string): number {
		return this.states.get(action)?.activeTime ?? 0;
	}

	/**
	 * Gets the full state of an action.
	 *
	 * @param action - The action to check
	 * @returns The action state, or default state if not found
	 */
	getState(action: string): ActionState {
		return this.states.get(action) ?? DEFAULT_ACTION_STATE;
	}

	/**
	 * Gets all currently active actions.
	 *
	 * @returns Array of active action names
	 */
	getActiveActions(): string[] {
		const active: string[] = [];
		for (const [action, state] of this.states) {
			if (state.active) {
				active.push(action);
			}
		}
		return active;
	}

	// =========================================================================
	// REBINDING
	// =========================================================================

	/**
	 * Rebinds an action to new keys.
	 * Replaces all existing key bindings.
	 *
	 * @param action - The action to rebind
	 * @param keys - New keys for the action
	 * @returns true if the action was found and rebound
	 *
	 * @example
	 * ```typescript
	 * actions.rebindKeys('jump', ['up', 'space']);
	 * ```
	 */
	rebindKeys(action: string, keys: readonly string[]): boolean {
		const binding = this.bindings.get(action);
		if (!binding) return false;

		binding.keys = [...keys];
		return true;
	}

	/**
	 * Rebinds an action to new mouse buttons.
	 * Replaces all existing mouse bindings.
	 *
	 * @param action - The action to rebind
	 * @param buttons - New mouse buttons for the action
	 * @returns true if the action was found and rebound
	 */
	rebindMouseButtons(action: string, buttons: readonly MouseButton[]): boolean {
		const binding = this.bindings.get(action);
		if (!binding) return false;

		binding.mouseButtons = [...buttons];
		return true;
	}

	/**
	 * Adds a key to an action's bindings.
	 *
	 * @param action - The action to modify
	 * @param key - The key to add
	 * @returns true if the action was found
	 */
	addKey(action: string, key: string): boolean {
		const binding = this.bindings.get(action);
		if (!binding) return false;

		if (!binding.keys.includes(key)) {
			binding.keys.push(key);
		}
		return true;
	}

	/**
	 * Removes a key from an action's bindings.
	 *
	 * @param action - The action to modify
	 * @param key - The key to remove
	 * @returns true if the key was found and removed
	 */
	removeKey(action: string, key: string): boolean {
		const binding = this.bindings.get(action);
		if (!binding) return false;

		const index = binding.keys.indexOf(key);
		if (index !== -1) {
			binding.keys.splice(index, 1);
			return true;
		}
		return false;
	}

	/**
	 * Gets all keys bound to an action.
	 *
	 * @param action - The action to check
	 * @returns Array of key names, or empty array if action not found
	 */
	getKeysForAction(action: string): string[] {
		const binding = this.bindings.get(action);
		return binding ? [...binding.keys] : [];
	}

	/**
	 * Gets all mouse buttons bound to an action.
	 *
	 * @param action - The action to check
	 * @returns Array of mouse buttons, or empty array if action not found
	 */
	getMouseButtonsForAction(action: string): MouseButton[] {
		const binding = this.bindings.get(action);
		return binding ? [...binding.mouseButtons] : [];
	}

	/**
	 * Finds the action bound to a specific key.
	 *
	 * @param key - The key to search for
	 * @returns Array of action names that use this key
	 */
	getActionsForKey(key: string): string[] {
		const actions: string[] = [];
		for (const [action, binding] of this.bindings) {
			if (binding.keys.includes(key)) {
				actions.push(action);
			}
		}
		return actions;
	}

	// =========================================================================
	// CALLBACKS
	// =========================================================================

	/**
	 * Registers a callback for a specific action.
	 *
	 * @param action - The action to listen for
	 * @param callback - Function to call on action state changes
	 * @returns Unsubscribe function
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = actions.onAction('jump', (action, state) => {
	 *   if (state.justActivated) {
	 *     playSound('jump');
	 *   }
	 * });
	 *
	 * // Later
	 * unsubscribe();
	 * ```
	 */
	onAction(action: string, callback: ActionCallback): () => void {
		let callbacks = this.callbacks.get(action);
		if (!callbacks) {
			callbacks = new Set();
			this.callbacks.set(action, callbacks);
		}
		callbacks.add(callback);

		return () => {
			callbacks?.delete(callback);
		};
	}

	/**
	 * Registers a callback for all action state changes.
	 *
	 * @param callback - Function to call on any action state change
	 * @returns Unsubscribe function
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = actions.onAnyAction((action, state) => {
	 *   console.log(`Action ${action}: active=${state.active}`);
	 * });
	 * ```
	 */
	onAnyAction(callback: ActionCallback): () => void {
		this.globalCallbacks.add(callback);
		return () => {
			this.globalCallbacks.delete(callback);
		};
	}

	// =========================================================================
	// SAVE/LOAD
	// =========================================================================

	/**
	 * Saves all bindings to a serializable format.
	 *
	 * @returns Serialized bindings object
	 *
	 * @example
	 * ```typescript
	 * const saved = actions.saveBindings();
	 * localStorage.setItem('controls', JSON.stringify(saved));
	 * ```
	 */
	saveBindings(): SerializedBindings {
		const bindingsArray: Array<{
			action: string;
			keys: string[];
			mouseButtons?: string[];
			continuous?: boolean;
		}> = [];

		for (const [, binding] of this.bindings) {
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
	}

	/**
	 * Loads bindings from a serialized format.
	 * Existing bindings are replaced.
	 *
	 * @param data - Serialized bindings to load
	 * @throws Error if the data is invalid
	 *
	 * @example
	 * ```typescript
	 * const saved = JSON.parse(localStorage.getItem('controls') || '{}');
	 * actions.loadBindings(saved);
	 * ```
	 */
	loadBindings(data: unknown): void {
		const validated = SerializedBindingsSchema.parse(data);

		// Clear existing bindings
		this.bindings.clear();
		this.states.clear();

		// Load new bindings
		for (const binding of validated.bindings) {
			this.register({
				action: binding.action,
				keys: binding.keys,
				mouseButtons: binding.mouseButtons as MouseButton[] | undefined,
				continuous: binding.continuous,
			});
		}
	}

	/**
	 * Exports bindings as a JSON string.
	 *
	 * @param pretty - Whether to format the JSON (default: false)
	 * @returns JSON string
	 */
	toJSON(pretty = false): string {
		const data = this.saveBindings();
		return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
	}

	/**
	 * Imports bindings from a JSON string.
	 *
	 * @param json - JSON string to parse
	 * @throws Error if JSON is invalid
	 */
	fromJSON(json: string): void {
		const data = JSON.parse(json);
		this.loadBindings(data);
	}

	// =========================================================================
	// RESET
	// =========================================================================

	/**
	 * Resets all action states to inactive.
	 * Does not remove bindings.
	 */
	resetStates(): void {
		for (const state of this.states.values()) {
			state.active = false;
			state.justActivated = false;
			state.justDeactivated = false;
			state.activeTime = 0;
			state.value = 0;
		}
	}

	/**
	 * Clears all bindings and states.
	 */
	clear(): void {
		this.bindings.clear();
		this.states.clear();
		this.callbacks.clear();
		this.globalCallbacks.clear();
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

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
	const manager = new InputActionManager();
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
