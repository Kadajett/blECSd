/**
 * Form Widget
 *
 * A form widget for grouping and managing multiple input widgets
 * (Textbox, Textarea, Checkbox, RadioButton, Button). Provides field management,
 * validation, submission, tab navigation, and value aggregation.
 *
 * @module widgets/form
 */

import { z } from 'zod';
import { blur, focus } from '../components/focusable';
import { moveBy, Position, setPosition } from '../components/position';
import { markDirty } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { ButtonWidget } from './button';
import type { CheckboxWidget } from './checkbox';
import type { RadioButtonWidget, RadioGroupWidget } from './radioButton';
import type { TextareaWidget } from './textarea';
import type { TextboxWidget } from './textbox';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported form field types.
 */
export type FormField =
	| TextboxWidget
	| TextareaWidget
	| CheckboxWidget
	| RadioButtonWidget
	| RadioGroupWidget
	| ButtonWidget;

/**
 * Validator function that returns validation errors.
 */
export type FormValidator = (values: Record<string, unknown>) => Record<string, string>;

/**
 * Configuration for creating a Form widget.
 */
export interface FormConfig {
	// Position
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
}

/**
 * Form widget interface providing chainable methods.
 */
export interface FormWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Field Management
	/** Adds a field to the form */
	addField(name: string, field: FormField): FormWidget;
	/** Removes a field from the form */
	removeField(name: string): FormWidget;
	/** Gets a field by name */
	getField(name: string): FormField | undefined;
	/** Gets all field names */
	getFieldNames(): string[];

	// Values
	/** Gets value from a specific field */
	getValue(name: string): unknown;
	/** Gets all field values as an object */
	getValues(): Record<string, unknown>;

	// Validation
	/** Sets the validator function */
	setValidator(validator: FormValidator): FormWidget;
	/** Validates the form and returns errors */
	validate(validator?: FormValidator): Record<string, string>;

	// Actions
	/** Resets all fields to default values */
	reset(): FormWidget;
	/** Submits the form (validates and calls onSubmit) */
	submit(): void;

	// Focus Navigation
	/** Focuses the first field */
	focusFirst(): FormWidget;
	/** Focuses the next field */
	focusNext(): FormWidget;
	/** Focuses the previous field */
	focusPrevious(): FormWidget;
	/** Handles keyboard input for navigation */
	handleKey(key: string): boolean;

	// Position
	/** Sets the absolute position */
	setPosition(x: number, y: number): FormWidget;
	/** Moves by dx, dy */
	move(dx: number, dy: number): FormWidget;
	/** Gets current position */
	getPosition(): { x: number; y: number };

	// Events
	/** Registers callback for form submission */
	onSubmit(callback: (values: Record<string, unknown>) => void): FormWidget;
	/** Registers callback for any field change */
	onChange(callback: (values: Record<string, unknown>) => void): FormWidget;
	/** Registers callback for validation errors */
	onValidationError(callback: (errors: Record<string, string>) => void): FormWidget;

	// Lifecycle
	/** Destroys the widget and removes it from the world */
	destroy(): void;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for form widget configuration.
 */
export const FormConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
});

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Form widget component marker.
 */
export const FormComponent = {
	/** Tag indicating this is a form widget (1 = yes) */
	isForm: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Form widget state stored outside ECS for complex data.
 */
interface FormState {
	/** Map of field name to field widget */
	fields: Map<string, FormField>;
	/** Ordered list of field names for navigation */
	fieldOrder: string[];
	/** Current focused field index */
	focusedIndex: number;
	/** Validator function */
	validator?: FormValidator;
	/** Submit callbacks */
	onSubmitCallbacks: Array<(values: Record<string, unknown>) => void>;
	/** Change callbacks */
	onChangeCallbacks: Array<(values: Record<string, unknown>) => void>;
	/** Validation error callbacks */
	onValidationErrorCallbacks: Array<(errors: Record<string, string>) => void>;
}

/** Map of entity to form state */
const formStateMap = new Map<Entity, FormState>();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Gets the value from a form field.
 * @internal
 */
function getFieldValue(field: FormField): unknown {
	if ('getValue' in field) {
		return field.getValue();
	}
	if ('isChecked' in field) {
		return field.isChecked();
	}
	if ('getSelectedValue' in field) {
		return field.getSelectedValue();
	}
	return undefined;
}

/**
 * Resets a form field to default value.
 * @internal
 */
function resetField(field: FormField): void {
	if ('setValue' in field && typeof field.setValue === 'function') {
		field.setValue('');
	} else if ('setChecked' in field && typeof field.setChecked === 'function') {
		field.setChecked(false);
	} else if ('clearSelection' in field && typeof field.clearSelection === 'function') {
		(field.clearSelection as () => void)();
	}
}

/**
 * Emits change callbacks with current form values.
 * @internal
 */
function emitChange(eid: Entity): void {
	const state = formStateMap.get(eid);
	if (!state) return;

	const values: Record<string, unknown> = {};
	for (const [name, field] of state.fields) {
		values[name] = getFieldValue(field);
	}

	for (const callback of state.onChangeCallbacks) {
		callback(values);
	}
}

/**
 * Emits validation error callbacks.
 * @internal
 */
function emitValidationErrors(eid: Entity, errors: Record<string, string>): void {
	const state = formStateMap.get(eid);
	if (!state) return;

	for (const callback of state.onValidationErrorCallbacks) {
		callback(errors);
	}
}

/**
 * Sets up field change listeners to emit form-level change events.
 * @internal
 */
function setupFieldChangeListener(eid: Entity, field: FormField): void {
	if ('onChange' in field && typeof field.onChange === 'function') {
		field.onChange(() => {
			emitChange(eid);
		});
	}
}

/**
 * Handles navigation and submission keys.
 * @internal
 */
function handleNavigationKey(key: string, widget: FormWidget): boolean {
	if (key === 'tab') {
		widget.focusNext();
		return true;
	}

	if (key === 'S-tab' || key === 'shift-tab') {
		widget.focusPrevious();
		return true;
	}

	if (key === 'enter' || key === 'return') {
		widget.submit();
		return true;
	}

	return false;
}

/**
 * Delegates key press to the currently focused field.
 * @internal
 */
function delegateKeyToField(state: FormState, key: string): boolean {
	if (state.focusedIndex < 0) return false;

	const fieldName = state.fieldOrder[state.focusedIndex];
	if (!fieldName) return false;

	const field = state.fields.get(fieldName);

	if (!field || !('handleKey' in field) || typeof field.handleKey !== 'function') {
		return false;
	}

	return field.handleKey(key);
}

/**
 * Blurs the currently focused field.
 * @internal
 */
function blurCurrentField(world: World, state: FormState): void {
	if (state.focusedIndex < 0) return;

	const currentName = state.fieldOrder[state.focusedIndex];
	if (!currentName) return;

	const currentField = state.fields.get(currentName);
	if (currentField && 'blur' in currentField) {
		blur(world, currentField.eid);
	}
}

/**
 * Focuses a field at the given index.
 * @internal
 */
function focusFieldAtIndex(world: World, state: FormState, index: number): void {
	const fieldName = state.fieldOrder[index];
	if (!fieldName) return;

	const field = state.fields.get(fieldName);
	if (field && 'focus' in field) {
		focus(world, field.eid);
	}
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Form widget with the given configuration.
 *
 * The Form widget groups input widgets and provides field management,
 * validation, submission, and tab navigation between fields.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Form widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createForm, createTextbox, createCheckbox, createButton } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * // Create form and fields
 * const form = createForm(world, { x: 10, y: 5 });
 * const username = createTextbox(world);
 * const password = createTextbox(world, { secret: true });
 * const remember = createCheckbox(world, { label: 'Remember me' });
 * const submit = createButton(world, { label: 'Login' });
 *
 * // Add fields to form
 * form
 *   .addField('username', username)
 *   .addField('password', password)
 *   .addField('remember', remember)
 *   .addField('submit', submit);
 *
 * // Set up validation
 * form.setValidator((values) => {
 *   const errors: Record<string, string> = {};
 *   if (!values.username) errors.username = 'Username is required';
 *   if (!values.password) errors.password = 'Password is required';
 *   return errors;
 * });
 *
 * // Handle submission
 * form.onSubmit((values) => {
 *   console.log('Login:', values);
 * });
 *
 * // Focus first field
 * form.focusFirst();
 * ```
 */
export function createForm(world: World, config: FormConfig = {}): FormWidget {
	const validated = FormConfigSchema.parse(config);
	const eid = addEntity(world);

	// Mark as form widget
	FormComponent.isForm[eid] = 1;

	setPosition(world, eid, validated.x, validated.y);

	// Store state
	formStateMap.set(eid, {
		fields: new Map(),
		fieldOrder: [],
		focusedIndex: -1,
		onSubmitCallbacks: [],
		onChangeCallbacks: [],
		onValidationErrorCallbacks: [],
	});

	// Create the widget interface
	const widget: FormWidget = {
		eid,

		// Field Management
		addField(name: string, field: FormField): FormWidget {
			const state = formStateMap.get(eid);
			if (!state) return widget;

			// Remove old field if exists
			if (state.fields.has(name)) {
				const index = state.fieldOrder.indexOf(name);
				if (index !== -1) {
					state.fieldOrder.splice(index, 1);
				}
			}

			state.fields.set(name, field);
			state.fieldOrder.push(name);

			// Set up change listener
			setupFieldChangeListener(eid, field);

			return widget;
		},

		removeField(name: string): FormWidget {
			const state = formStateMap.get(eid);
			if (!state) return widget;

			state.fields.delete(name);
			const index = state.fieldOrder.indexOf(name);
			if (index !== -1) {
				state.fieldOrder.splice(index, 1);
			}

			// Adjust focus index if needed
			if (state.focusedIndex >= index && state.focusedIndex > 0) {
				state.focusedIndex--;
			}

			return widget;
		},

		getField(name: string): FormField | undefined {
			const state = formStateMap.get(eid);
			return state?.fields.get(name);
		},

		getFieldNames(): string[] {
			const state = formStateMap.get(eid);
			return state?.fieldOrder ?? [];
		},

		// Values
		getValue(name: string): unknown {
			const state = formStateMap.get(eid);
			if (!state) return undefined;

			const field = state.fields.get(name);
			if (!field) return undefined;

			return getFieldValue(field);
		},

		getValues(): Record<string, unknown> {
			const state = formStateMap.get(eid);
			if (!state) return {};

			const values: Record<string, unknown> = {};
			for (const [name, field] of state.fields) {
				values[name] = getFieldValue(field);
			}
			return values;
		},

		// Validation
		setValidator(validator: FormValidator): FormWidget {
			const state = formStateMap.get(eid);
			if (state) {
				state.validator = validator;
			}
			return widget;
		},

		validate(validator?: FormValidator): Record<string, string> {
			const state = formStateMap.get(eid);
			if (!state) return {};

			const validatorFn = validator ?? state.validator;
			if (!validatorFn) return {};

			const values = widget.getValues();
			return validatorFn(values);
		},

		// Actions
		reset(): FormWidget {
			const state = formStateMap.get(eid);
			if (!state) return widget;

			for (const field of state.fields.values()) {
				resetField(field);
			}

			emitChange(eid);
			return widget;
		},

		submit(): void {
			const state = formStateMap.get(eid);
			if (!state) return;

			// Validate first
			const errors = widget.validate();
			if (Object.keys(errors).length > 0) {
				emitValidationErrors(eid, errors);
				return;
			}

			// Get values and call submit callbacks
			const values = widget.getValues();
			for (const callback of state.onSubmitCallbacks) {
				callback(values);
			}
		},

		// Focus Navigation
		focusFirst(): FormWidget {
			const state = formStateMap.get(eid);
			if (!state || state.fieldOrder.length === 0) return widget;

			state.focusedIndex = 0;
			focusFieldAtIndex(world, state, 0);

			return widget;
		},

		focusNext(): FormWidget {
			const state = formStateMap.get(eid);
			if (!state || state.fieldOrder.length === 0) return widget;

			blurCurrentField(world, state);

			// Move to next field (wrap around)
			state.focusedIndex = (state.focusedIndex + 1) % state.fieldOrder.length;

			focusFieldAtIndex(world, state, state.focusedIndex);

			return widget;
		},

		focusPrevious(): FormWidget {
			const state = formStateMap.get(eid);
			if (!state || state.fieldOrder.length === 0) return widget;

			blurCurrentField(world, state);

			// Move to previous field (wrap around)
			state.focusedIndex = state.focusedIndex - 1;
			if (state.focusedIndex < 0) {
				state.focusedIndex = state.fieldOrder.length - 1;
			}

			focusFieldAtIndex(world, state, state.focusedIndex);

			return widget;
		},

		handleKey(key: string): boolean {
			const state = formStateMap.get(eid);
			if (!state) return false;

			// Handle navigation and submission
			if (handleNavigationKey(key, widget)) {
				return true;
			}

			// Pass to currently focused field
			return delegateKeyToField(state, key);
		},

		// Position
		setPosition(x: number, y: number): FormWidget {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
		},

		move(dx: number, dy: number): FormWidget {
			moveBy(world, eid, dx, dy);
			markDirty(world, eid);
			return widget;
		},

		getPosition(): { x: number; y: number } {
			return {
				x: Position.x[eid] ?? 0,
				y: Position.y[eid] ?? 0,
			};
		},

		// Events
		onSubmit(callback: (values: Record<string, unknown>) => void): FormWidget {
			const state = formStateMap.get(eid);
			if (state) {
				state.onSubmitCallbacks.push(callback);
			}
			return widget;
		},

		onChange(callback: (values: Record<string, unknown>) => void): FormWidget {
			const state = formStateMap.get(eid);
			if (state) {
				state.onChangeCallbacks.push(callback);
			}
			return widget;
		},

		onValidationError(callback: (errors: Record<string, string>) => void): FormWidget {
			const state = formStateMap.get(eid);
			if (state) {
				state.onValidationErrorCallbacks.push(callback);
			}
			return widget;
		},

		// Lifecycle
		destroy(): void {
			FormComponent.isForm[eid] = 0;
			formStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a form widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a form widget
 *
 * @example
 * ```typescript
 * import { isForm } from 'blecsd/widgets';
 *
 * if (isForm(world, entity)) {
 *   // Handle form-specific logic
 * }
 * ```
 */
export function isForm(_world: World, eid: Entity): boolean {
	return FormComponent.isForm[eid] === 1;
}

/**
 * Resets the form widget store. Useful for testing.
 * @internal
 */
export function resetFormStore(): void {
	FormComponent.isForm.fill(0);
	formStateMap.clear();
}
