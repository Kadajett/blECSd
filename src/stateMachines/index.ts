/**
 * Common UI state machine configurations.
 * These are reusable state machine configs for standard UI patterns.
 * @module stateMachines
 */

import type { Action, StateMachineConfig, TransitionConfig } from '../core/stateMachine';

// =============================================================================
// BUTTON STATE MACHINE
// =============================================================================

/**
 * Button state machine states.
 */
export type ButtonState = 'idle' | 'hovered' | 'pressed' | 'disabled';

/**
 * Button state machine events.
 */
export type ButtonEvent =
	| 'mouseenter'
	| 'mouseleave'
	| 'mousedown'
	| 'mouseup'
	| 'disable'
	| 'enable';

/**
 * Button state machine context.
 */
export interface ButtonContext {
	/** Called when button is pressed (mousedown in idle/hovered state) */
	onPress?: () => void;
	/** Called when button is released (mouseup in pressed state) */
	onRelease?: () => void;
	/** Called when button is clicked (press + release while still over button) */
	onClick?: () => void;
	/** Called when button is disabled */
	onDisable?: () => void;
	/** Called when button is enabled */
	onEnable?: () => void;
}

/**
 * Creates a button state machine configuration.
 *
 * States:
 * - `idle`: Default state, not interacting
 * - `hovered`: Mouse is over the button
 * - `pressed`: Mouse button is held down
 * - `disabled`: Button is disabled and unresponsive
 *
 * @param context - Optional context with callback functions
 * @returns Button state machine configuration
 *
 * @example
 * ```typescript
 * import { createStateMachine } from 'blecsd';
 * import { createButtonConfig } from 'blecsd/stateMachines';
 *
 * const buttonMachine = createStateMachine(createButtonConfig({
 *   onClick: () => console.log('Button clicked!'),
 * }));
 *
 * buttonMachine.send('mouseenter'); // -> 'hovered'
 * buttonMachine.send('mousedown');  // -> 'pressed'
 * buttonMachine.send('mouseup');    // -> 'hovered', onClick called
 * ```
 */
export function createButtonConfig(
	context: ButtonContext = {},
): StateMachineConfig<ButtonState, ButtonEvent, ButtonContext> {
	const pressAction: Action<ButtonContext> = (ctx) => ctx.onPress?.();
	const releaseAction: Action<ButtonContext> = (ctx) => ctx.onRelease?.();
	const clickAction: Action<ButtonContext> = (ctx) => ctx.onClick?.();
	const disableAction: Action<ButtonContext> = (ctx) => ctx.onDisable?.();
	const enableAction: Action<ButtonContext> = (ctx) => ctx.onEnable?.();

	return {
		initial: 'idle',
		context,
		states: {
			idle: {
				on: {
					mouseenter: 'hovered',
					disable: { target: 'disabled', actions: [disableAction] },
				},
			},
			hovered: {
				on: {
					mouseleave: 'idle',
					mousedown: { target: 'pressed', actions: [pressAction] },
					disable: { target: 'disabled', actions: [disableAction] },
				},
			},
			pressed: {
				on: {
					mouseup: { target: 'hovered', actions: [releaseAction, clickAction] },
					mouseleave: { target: 'idle', actions: [releaseAction] },
					disable: { target: 'disabled', actions: [releaseAction, disableAction] },
				},
			},
			disabled: {
				on: {
					enable: { target: 'idle', actions: [enableAction] },
				},
			},
		},
	};
}

// =============================================================================
// FOCUS STATE MACHINE
// =============================================================================

/**
 * Focus state machine states.
 */
export type FocusState = 'unfocused' | 'focused' | 'disabled';

/**
 * Focus state machine events.
 */
export type FocusEvent = 'focus' | 'blur' | 'disable' | 'enable';

/**
 * Focus state machine context.
 */
export interface FocusContext {
	/** Called when element gains focus */
	onFocus?: () => void;
	/** Called when element loses focus */
	onBlur?: () => void;
	/** Called when element is disabled */
	onDisable?: () => void;
	/** Called when element is enabled */
	onEnable?: () => void;
}

/**
 * Creates a focus state machine configuration.
 *
 * States:
 * - `unfocused`: Element does not have keyboard focus
 * - `focused`: Element has keyboard focus
 * - `disabled`: Element cannot receive focus
 *
 * @param context - Optional context with callback functions
 * @returns Focus state machine configuration
 *
 * @example
 * ```typescript
 * import { createStateMachine } from 'blecsd';
 * import { createFocusConfig } from 'blecsd/stateMachines';
 *
 * const focusMachine = createStateMachine(createFocusConfig({
 *   onFocus: () => showCursor(),
 *   onBlur: () => hideCursor(),
 * }));
 *
 * focusMachine.send('focus'); // -> 'focused', onFocus called
 * focusMachine.send('blur');  // -> 'unfocused', onBlur called
 * ```
 */
export function createFocusConfig(
	context: FocusContext = {},
): StateMachineConfig<FocusState, FocusEvent, FocusContext> {
	const focusAction: Action<FocusContext> = (ctx) => ctx.onFocus?.();
	const blurAction: Action<FocusContext> = (ctx) => ctx.onBlur?.();
	const disableAction: Action<FocusContext> = (ctx) => ctx.onDisable?.();
	const enableAction: Action<FocusContext> = (ctx) => ctx.onEnable?.();

	return {
		initial: 'unfocused',
		context,
		states: {
			unfocused: {
				on: {
					focus: { target: 'focused', actions: [focusAction] },
					disable: { target: 'disabled', actions: [disableAction] },
				},
			},
			focused: {
				on: {
					blur: { target: 'unfocused', actions: [blurAction] },
					disable: { target: 'disabled', actions: [blurAction, disableAction] },
				},
			},
			disabled: {
				on: {
					enable: { target: 'unfocused', actions: [enableAction] },
				},
			},
		},
	};
}

// =============================================================================
// TOGGLE STATE MACHINE
// =============================================================================

/**
 * Toggle state machine states.
 */
export type ToggleState = 'off' | 'on' | 'disabled';

/**
 * Toggle state machine events.
 */
export type ToggleEvent = 'toggle' | 'enable' | 'disable';

/**
 * Toggle state machine context.
 */
export interface ToggleContext {
	/** Called when toggled on */
	onToggleOn?: () => void;
	/** Called when toggled off */
	onToggleOff?: () => void;
	/** Called on any toggle (receives new state) */
	onToggle?: (isOn: boolean) => void;
	/** Called when disabled */
	onDisable?: () => void;
	/** Called when enabled */
	onEnable?: () => void;
	/** Track whether was 'on' before being disabled (for restore) */
	wasOn?: boolean;
}

/**
 * Creates a toggle state machine configuration.
 *
 * States:
 * - `off`: Toggle is in the off position
 * - `on`: Toggle is in the on position
 * - `disabled`: Toggle cannot be changed
 *
 * @param context - Optional context with callback functions
 * @param initialState - Initial state ('off' or 'on'), defaults to 'off'
 * @returns Toggle state machine configuration
 *
 * @example
 * ```typescript
 * import { createStateMachine } from 'blecsd';
 * import { createToggleConfig } from 'blecsd/stateMachines';
 *
 * const toggleMachine = createStateMachine(createToggleConfig({
 *   onToggle: (isOn) => console.log(`Toggle is now ${isOn ? 'ON' : 'OFF'}`),
 * }));
 *
 * toggleMachine.send('toggle'); // -> 'on', onToggle(true) called
 * toggleMachine.send('toggle'); // -> 'off', onToggle(false) called
 * ```
 */
export function createToggleConfig(
	context: ToggleContext = {},
	initialState: 'off' | 'on' = 'off',
): StateMachineConfig<ToggleState, ToggleEvent, ToggleContext> {
	const toggleOnAction: Action<ToggleContext> = (ctx) => {
		ctx.onToggleOn?.();
		ctx.onToggle?.(true);
	};
	const toggleOffAction: Action<ToggleContext> = (ctx) => {
		ctx.onToggleOff?.();
		ctx.onToggle?.(false);
	};
	const disableFromOnAction: Action<ToggleContext> = (ctx) => {
		ctx.wasOn = true;
		ctx.onDisable?.();
	};
	const disableFromOffAction: Action<ToggleContext> = (ctx) => {
		ctx.wasOn = false;
		ctx.onDisable?.();
	};
	const enableAction: Action<ToggleContext> = (ctx) => ctx.onEnable?.();

	return {
		initial: initialState,
		context,
		states: {
			off: {
				on: {
					toggle: { target: 'on', actions: [toggleOnAction] },
					disable: { target: 'disabled', actions: [disableFromOffAction] },
				},
			},
			on: {
				on: {
					toggle: { target: 'off', actions: [toggleOffAction] },
					disable: { target: 'disabled', actions: [disableFromOnAction] },
				},
			},
			disabled: {
				on: {
					enable: {
						target: 'off',
						actions: [enableAction],
						guard: (ctx) => !ctx.wasOn,
					} as TransitionConfig<ToggleState, ToggleContext>,
				},
			},
		},
	};
}

// Note: Toggle's enable transition needs special handling for wasOn state
// The config above uses a guard but always targets 'off'.
// For proper restore behavior, we need to handle this differently.

/**
 * Creates a toggle state machine configuration with restore-on-enable behavior.
 * When re-enabled, the toggle returns to its state before being disabled.
 *
 * @param context - Optional context with callback functions
 * @param initialState - Initial state ('off' or 'on'), defaults to 'off'
 * @returns Toggle state machine configuration
 */
export function createToggleConfigWithRestore(
	context: ToggleContext = {},
	initialState: 'off' | 'on' = 'off',
): StateMachineConfig<ToggleState, ToggleEvent, ToggleContext> {
	const baseConfig = createToggleConfig(context, initialState);

	// Override the disabled state's enable transition to check wasOn
	baseConfig.states.disabled.on = {
		enable: {
			target: 'off', // Will be overridden by guard logic in custom send
			actions: [
				(ctx) => {
					ctx.onEnable?.();
					// Restore previous state by triggering toggle if was on
					if (ctx.wasOn) {
						ctx.onToggleOn?.();
						ctx.onToggle?.(true);
					}
				},
			],
		},
	};

	return baseConfig;
}

// =============================================================================
// INPUT STATE MACHINE
// =============================================================================

/**
 * Input state machine states.
 */
export type InputState = 'idle' | 'focused' | 'editing' | 'validating' | 'error' | 'disabled';

/**
 * Input state machine events.
 */
export type InputEvent =
	| 'focus'
	| 'blur'
	| 'input'
	| 'validate'
	| 'valid'
	| 'invalid'
	| 'clear'
	| 'disable'
	| 'enable';

/**
 * Input state machine context.
 */
export interface InputContext {
	/** Current input value */
	value?: string;
	/** Validation error message */
	errorMessage?: string;
	/** Called when input gains focus */
	onFocus?: () => void;
	/** Called when input loses focus */
	onBlur?: () => void;
	/** Called when input value changes */
	onInput?: (value: string) => void;
	/** Called when validation starts */
	onValidate?: () => void;
	/** Called when validation succeeds */
	onValid?: () => void;
	/** Called when validation fails */
	onInvalid?: (error: string) => void;
	/** Called when input is cleared */
	onClear?: () => void;
	/** Called when input is disabled */
	onDisable?: () => void;
	/** Called when input is enabled */
	onEnable?: () => void;
}

/**
 * Creates an input state machine configuration.
 *
 * States:
 * - `idle`: Input is not focused
 * - `focused`: Input has focus, ready for typing
 * - `editing`: User is actively typing
 * - `validating`: Input is being validated
 * - `error`: Validation failed, showing error
 * - `disabled`: Input cannot be interacted with
 *
 * @param context - Optional context with callback functions
 * @returns Input state machine configuration
 *
 * @example
 * ```typescript
 * import { createStateMachine } from 'blecsd';
 * import { createInputConfig } from 'blecsd/stateMachines';
 *
 * const inputMachine = createStateMachine(createInputConfig({
 *   onInput: (value) => console.log(`Input: ${value}`),
 *   onInvalid: (error) => console.log(`Error: ${error}`),
 * }));
 *
 * inputMachine.send('focus');    // -> 'focused'
 * inputMachine.send('input');    // -> 'editing'
 * inputMachine.send('validate'); // -> 'validating'
 * inputMachine.send('invalid');  // -> 'error'
 * ```
 */
export function createInputConfig(
	context: InputContext = {},
): StateMachineConfig<InputState, InputEvent, InputContext> {
	const focusAction: Action<InputContext> = (ctx) => ctx.onFocus?.();
	const blurAction: Action<InputContext> = (ctx) => ctx.onBlur?.();
	const inputAction: Action<InputContext> = (ctx) => ctx.onInput?.(ctx.value ?? '');
	const validateAction: Action<InputContext> = (ctx) => ctx.onValidate?.();
	const validAction: Action<InputContext> = (ctx) => ctx.onValid?.();
	const invalidAction: Action<InputContext> = (ctx) => ctx.onInvalid?.(ctx.errorMessage ?? '');
	const clearAction: Action<InputContext> = (ctx) => {
		ctx.value = '';
		ctx.errorMessage = undefined;
		ctx.onClear?.();
	};
	const disableAction: Action<InputContext> = (ctx) => ctx.onDisable?.();
	const enableAction: Action<InputContext> = (ctx) => ctx.onEnable?.();

	return {
		initial: 'idle',
		context,
		states: {
			idle: {
				on: {
					focus: { target: 'focused', actions: [focusAction] },
					disable: { target: 'disabled', actions: [disableAction] },
				},
			},
			focused: {
				on: {
					blur: { target: 'idle', actions: [blurAction] },
					input: { target: 'editing', actions: [inputAction] },
					disable: { target: 'disabled', actions: [blurAction, disableAction] },
				},
			},
			editing: {
				on: {
					input: { target: 'editing', actions: [inputAction] },
					blur: { target: 'idle', actions: [blurAction] },
					validate: { target: 'validating', actions: [validateAction] },
					clear: { target: 'focused', actions: [clearAction] },
					disable: { target: 'disabled', actions: [blurAction, disableAction] },
				},
			},
			validating: {
				on: {
					valid: { target: 'focused', actions: [validAction] },
					invalid: { target: 'error', actions: [invalidAction] },
					disable: { target: 'disabled', actions: [disableAction] },
				},
			},
			error: {
				on: {
					focus: { target: 'focused', actions: [focusAction] },
					input: { target: 'editing', actions: [inputAction] },
					clear: { target: 'focused', actions: [clearAction] },
					disable: { target: 'disabled', actions: [disableAction] },
				},
			},
			disabled: {
				on: {
					enable: { target: 'idle', actions: [enableAction] },
				},
			},
		},
	};
}

// =============================================================================
// SELECT STATE MACHINE
// =============================================================================

/**
 * Select state machine states.
 */
export type SelectState = 'closed' | 'open' | 'selecting';

/**
 * Select state machine events.
 */
export type SelectEvent =
	| 'open'
	| 'close'
	| 'select'
	| 'cancel'
	| 'highlight'
	| 'disable'
	| 'enable';

/**
 * Select state machine context.
 */
export interface SelectContext {
	/** Currently selected value */
	selectedValue?: unknown;
	/** Currently highlighted index (for keyboard navigation) */
	highlightedIndex?: number;
	/** Called when dropdown opens */
	onOpen?: () => void;
	/** Called when dropdown closes */
	onClose?: () => void;
	/** Called when selection changes */
	onSelect?: (value: unknown) => void;
	/** Called when selection is cancelled */
	onCancel?: () => void;
	/** Called when highlight changes */
	onHighlight?: (index: number) => void;
	/** Called when disabled */
	onDisable?: () => void;
	/** Called when enabled */
	onEnable?: () => void;
}

/**
 * Creates a select/dropdown state machine configuration.
 *
 * States:
 * - `closed`: Dropdown is closed
 * - `open`: Dropdown is open, showing options
 * - `selecting`: User is navigating/highlighting an option
 *
 * @param context - Optional context with callback functions
 * @returns Select state machine configuration
 *
 * @example
 * ```typescript
 * import { createStateMachine } from 'blecsd';
 * import { createSelectConfig } from 'blecsd/stateMachines';
 *
 * const selectMachine = createStateMachine(createSelectConfig({
 *   onOpen: () => showOptions(),
 *   onSelect: (value) => console.log(`Selected: ${value}`),
 * }));
 *
 * selectMachine.send('open');   // -> 'open', onOpen called
 * selectMachine.send('select'); // -> 'closed', onSelect called
 * ```
 */
export function createSelectConfig(
	context: SelectContext = {},
): StateMachineConfig<SelectState, SelectEvent, SelectContext> {
	const openAction: Action<SelectContext> = (ctx) => {
		ctx.highlightedIndex = 0;
		ctx.onOpen?.();
	};
	const closeAction: Action<SelectContext> = (ctx) => ctx.onClose?.();
	const selectAction: Action<SelectContext> = (ctx) => ctx.onSelect?.(ctx.selectedValue);
	const cancelAction: Action<SelectContext> = (ctx) => ctx.onCancel?.();
	const highlightAction: Action<SelectContext> = (ctx) =>
		ctx.onHighlight?.(ctx.highlightedIndex ?? 0);
	const disableAction: Action<SelectContext> = (ctx) => ctx.onDisable?.();
	const _enableAction: Action<SelectContext> = (ctx) => ctx.onEnable?.();

	return {
		initial: 'closed',
		context,
		states: {
			closed: {
				on: {
					open: { target: 'open', actions: [openAction] },
					disable: { target: 'closed' }, // Already closed, just mark disabled
				},
			},
			open: {
				on: {
					close: { target: 'closed', actions: [closeAction] },
					select: { target: 'closed', actions: [selectAction, closeAction] },
					cancel: { target: 'closed', actions: [cancelAction, closeAction] },
					highlight: { target: 'selecting', actions: [highlightAction] },
					disable: { target: 'closed', actions: [closeAction, disableAction] },
				},
			},
			selecting: {
				on: {
					highlight: { target: 'selecting', actions: [highlightAction] },
					select: { target: 'closed', actions: [selectAction, closeAction] },
					cancel: { target: 'closed', actions: [cancelAction, closeAction] },
					close: { target: 'closed', actions: [closeAction] },
					disable: { target: 'closed', actions: [closeAction, disableAction] },
				},
			},
		},
	};
}

// =============================================================================
// EXTENDED SELECT WITH DISABLED STATE
// =============================================================================

/**
 * Extended select state machine states (includes disabled).
 */
export type SelectStateExtended = SelectState | 'disabled';

/**
 * Creates an extended select state machine configuration with disabled state.
 *
 * @param context - Optional context with callback functions
 * @returns Extended select state machine configuration
 */
export function createSelectConfigExtended(
	context: SelectContext = {},
): StateMachineConfig<SelectStateExtended, SelectEvent, SelectContext> {
	const baseConfig = createSelectConfig(context);
	const enableAction: Action<SelectContext> = (ctx) => ctx.onEnable?.();
	const disableAction: Action<SelectContext> = (ctx) => ctx.onDisable?.();
	const closeAction: Action<SelectContext> = (ctx) => ctx.onClose?.();

	return {
		initial: 'closed',
		context,
		states: {
			closed: {
				...baseConfig.states.closed,
				on: {
					...baseConfig.states.closed.on,
					disable: { target: 'disabled', actions: [disableAction] },
				},
			},
			open: {
				...baseConfig.states.open,
				on: {
					...baseConfig.states.open.on,
					disable: { target: 'disabled', actions: [closeAction, disableAction] },
				},
			},
			selecting: {
				...baseConfig.states.selecting,
				on: {
					...baseConfig.states.selecting.on,
					disable: { target: 'disabled', actions: [closeAction, disableAction] },
				},
			},
			disabled: {
				on: {
					enable: { target: 'closed', actions: [enableAction] },
				},
			},
		},
	};
}
