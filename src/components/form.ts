/**
 * Form component and helper functions.
 * Provides form container functionality with field management.
 * @module components/form
 */

import type { Entity, World } from '../core/types';
import { getContent, setContent } from './content';
import { focusNext, focusPrev, getTabOrder, isFocusable } from './focusable';
import { getChildren, getDescendants } from './hierarchy';
import { markDirty } from './renderable';
import {
	getTextInputState,
	isTextInput,
	sendTextInputEvent,
} from './textInput';
import {
	getCheckboxState,
	isCheckbox,
	isChecked,
	sendCheckboxEvent,
	setChecked,
} from './checkbox';
import { getButtonState, isButton } from './button';

/** Default capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Form component store for tracking form entities.
 * Uses entity ID as index.
 */
export interface FormStore {
	/** Whether entity is a form (1 = true, 0 = false) */
	isForm: Uint8Array;
	/** Form-specific settings stored as bitfield */
	flags: Uint8Array;
}

/** Flag constants for form settings */
const FLAG_KEYS_ENABLED = 1;
const FLAG_SUBMIT_ON_ENTER = 2;

/**
 * Creates a new form store with default capacity.
 */
function createFormStore(capacity = DEFAULT_CAPACITY): FormStore {
	return {
		isForm: new Uint8Array(capacity),
		flags: new Uint8Array(capacity),
	};
}

/**
 * Global form store instance.
 */
export const formStore = createFormStore();

/**
 * Stores for form field data.
 * Maps entity ID to field-specific data.
 */
const fieldNamesStore = new Map<Entity, Map<Entity, string>>();
const initialValuesStore = new Map<Entity, Map<Entity, unknown>>();

/**
 * Form field value type.
 */
export type FormFieldValue = string | boolean | number | null;

/**
 * Form values object mapping field names to values.
 */
export type FormValues = Record<string, FormFieldValue>;

/**
 * Callback type for form submission.
 */
export type FormSubmitCallback = (values: FormValues) => void;

/**
 * Callback type for form reset.
 */
export type FormResetCallback = () => void;

/**
 * Stores for callbacks.
 */
const submitCallbacks = new Map<Entity, FormSubmitCallback[]>();
const resetCallbacks = new Map<Entity, FormResetCallback[]>();

/**
 * Resets the form store to initial state.
 * Useful for testing.
 */
export function resetFormStore(): void {
	formStore.isForm.fill(0);
	formStore.flags.fill(0);
	fieldNamesStore.clear();
	initialValuesStore.clear();
	submitCallbacks.clear();
	resetCallbacks.clear();
}

/**
 * Marks an entity as a form.
 *
 * @param world - The ECS world
 * @param eid - Entity ID to mark as form
 * @param options - Form options
 *
 * @example
 * ```typescript
 * import { attachFormBehavior } from 'blecsd';
 *
 * attachFormBehavior(world, formEntity, { keys: true });
 * ```
 */
export function attachFormBehavior(
	world: World,
	eid: Entity,
	options: { keys?: boolean; submitOnEnter?: boolean } = {},
): void {
	formStore.isForm[eid] = 1;

	let flags = 0;
	if (options.keys !== false) {
		flags |= FLAG_KEYS_ENABLED;
	}
	if (options.submitOnEnter !== false) {
		flags |= FLAG_SUBMIT_ON_ENTER;
	}
	formStore.flags[eid] = flags;

	fieldNamesStore.set(eid, new Map());
	initialValuesStore.set(eid, new Map());

	markDirty(world, eid);
}

/**
 * Checks if an entity is a form.
 *
 * @param world - The ECS world
 * @param eid - Entity to check
 * @returns True if entity is a form
 *
 * @example
 * ```typescript
 * import { isForm } from 'blecsd';
 *
 * if (isForm(world, eid)) {
 *   // Handle form entity
 * }
 * ```
 */
export function isForm(world: World, eid: Entity): boolean {
	return formStore.isForm[eid] === 1;
}

/**
 * Checks if keyboard navigation is enabled for a form.
 *
 * @param eid - Form entity ID
 * @returns True if keys are enabled
 */
export function isFormKeysEnabled(eid: Entity): boolean {
	return ((formStore.flags[eid] as number) & FLAG_KEYS_ENABLED) !== 0;
}

/**
 * Checks if submit on Enter is enabled for a form.
 *
 * @param eid - Form entity ID
 * @returns True if submit on Enter is enabled
 */
export function isFormSubmitOnEnter(eid: Entity): boolean {
	return ((formStore.flags[eid] as number) & FLAG_SUBMIT_ON_ENTER) !== 0;
}

/**
 * Registers a field within a form.
 * Fields must be descendants of the form entity.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @param fieldEntity - Field entity to register
 * @param name - Name for the field (used in form values)
 * @param initialValue - Optional initial value for reset
 *
 * @example
 * ```typescript
 * import { registerFormField } from 'blecsd';
 *
 * registerFormField(world, form, textbox, 'username', '');
 * registerFormField(world, form, checkbox, 'rememberMe', false);
 * ```
 */
export function registerFormField(
	world: World,
	formEntity: Entity,
	fieldEntity: Entity,
	name: string,
	initialValue?: unknown,
): void {
	if (!isForm(world, formEntity)) {
		return;
	}

	const names = fieldNamesStore.get(formEntity);
	const initials = initialValuesStore.get(formEntity);

	if (names && initials) {
		names.set(fieldEntity, name);

		// Store initial value or derive from current state
		if (initialValue !== undefined) {
			initials.set(fieldEntity, initialValue);
		} else {
			initials.set(fieldEntity, getFieldValue(world, fieldEntity));
		}
	}
}

/**
 * Unregisters a field from a form.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @param fieldEntity - Field entity to unregister
 */
export function unregisterFormField(
	world: World,
	formEntity: Entity,
	fieldEntity: Entity,
): void {
	const names = fieldNamesStore.get(formEntity);
	const initials = initialValuesStore.get(formEntity);

	if (names) {
		names.delete(fieldEntity);
	}
	if (initials) {
		initials.delete(fieldEntity);
	}
}

/**
 * Gets all field entities in a form.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @returns Array of field entity IDs
 */
export function getFormFields(world: World, formEntity: Entity): Entity[] {
	const names = fieldNamesStore.get(formEntity);
	if (!names) {
		return [];
	}
	return Array.from(names.keys());
}

/**
 * Gets the name of a form field.
 *
 * @param formEntity - Form entity ID
 * @param fieldEntity - Field entity ID
 * @returns Field name or undefined
 */
export function getFieldName(
	formEntity: Entity,
	fieldEntity: Entity,
): string | undefined {
	return fieldNamesStore.get(formEntity)?.get(fieldEntity);
}

/**
 * Gets the current value of a field entity.
 * Supports textbox, checkbox, and button fields.
 *
 * @param world - The ECS world
 * @param eid - Field entity ID
 * @returns Field value
 */
export function getFieldValue(world: World, eid: Entity): FormFieldValue {
	// TextInput: value is the content
	if (isTextInput(world, eid)) {
		return getContent(world, eid) ?? '';
	}

	// Checkbox: value is checked state
	if (isCheckbox(world, eid)) {
		return isChecked(world, eid);
	}

	// Button: value is pressed state (typically not useful for form values)
	if (isButton(world, eid)) {
		return getButtonState(world, eid) === 'pressed';
	}

	// Default: return content if available
	const content = getContent(world, eid);
	return content ?? null;
}

/**
 * Sets the value of a field entity.
 * Supports textbox and checkbox fields.
 *
 * @param world - The ECS world
 * @param eid - Field entity ID
 * @param value - Value to set
 */
export function setFieldValue(
	world: World,
	eid: Entity,
	value: FormFieldValue,
): void {
	// TextInput: set content
	if (isTextInput(world, eid)) {
		setContent(world, eid, String(value ?? ''));
		return;
	}

	// Checkbox: set checked state
	if (isCheckbox(world, eid)) {
		setChecked(world, eid, Boolean(value));
		return;
	}

	// Default: set content
	if (value !== null) {
		setContent(world, eid, String(value));
	}
}

/**
 * Gets all values from a form as a key-value object.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @returns Object mapping field names to values
 *
 * @example
 * ```typescript
 * import { getFormValues } from 'blecsd';
 *
 * const values = getFormValues(world, form);
 * console.log(values.username, values.rememberMe);
 * ```
 */
export function getFormValues(world: World, formEntity: Entity): FormValues {
	const values: FormValues = {};
	const names = fieldNamesStore.get(formEntity);

	if (!names) {
		return values;
	}

	for (const [fieldEntity, name] of names) {
		values[name] = getFieldValue(world, fieldEntity);
	}

	return values;
}

/**
 * Resets all form fields to their initial values.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 *
 * @example
 * ```typescript
 * import { resetForm } from 'blecsd';
 *
 * resetForm(world, form);
 * ```
 */
export function resetForm(world: World, formEntity: Entity): void {
	const initials = initialValuesStore.get(formEntity);
	if (!initials) {
		return;
	}

	for (const [fieldEntity, initialValue] of initials) {
		setFieldValue(world, fieldEntity, initialValue as FormFieldValue);
	}

	// Emit reset callbacks
	const callbacks = resetCallbacks.get(formEntity);
	if (callbacks) {
		for (const callback of callbacks) {
			callback();
		}
	}

	markDirty(world, formEntity);
}

/**
 * Submits a form, collecting all field values.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @returns Form values object
 *
 * @example
 * ```typescript
 * import { submitForm } from 'blecsd';
 *
 * const values = submitForm(world, form);
 * // Handle form submission
 * ```
 */
export function submitForm(world: World, formEntity: Entity): FormValues {
	const values = getFormValues(world, formEntity);

	// Emit submit callbacks
	const callbacks = submitCallbacks.get(formEntity);
	if (callbacks) {
		for (const callback of callbacks) {
			callback(values);
		}
	}

	return values;
}

/**
 * Registers a callback for form submission.
 *
 * @param eid - Form entity ID
 * @param callback - Function to call on submit
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * import { onFormSubmit } from 'blecsd';
 *
 * const unsubscribe = onFormSubmit(form, (values) => {
 *   console.log('Form submitted:', values);
 * });
 * ```
 */
export function onFormSubmit(
	eid: Entity,
	callback: FormSubmitCallback,
): () => void {
	const callbacks = submitCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	submitCallbacks.set(eid, callbacks);

	return () => {
		const current = submitCallbacks.get(eid);
		if (current) {
			const index = current.indexOf(callback);
			if (index !== -1) {
				current.splice(index, 1);
			}
		}
	};
}

/**
 * Registers a callback for form reset.
 *
 * @param eid - Form entity ID
 * @param callback - Function to call on reset
 * @returns Unsubscribe function
 */
export function onFormReset(eid: Entity, callback: FormResetCallback): () => void {
	const callbacks = resetCallbacks.get(eid) ?? [];
	callbacks.push(callback);
	resetCallbacks.set(eid, callbacks);

	return () => {
		const current = resetCallbacks.get(eid);
		if (current) {
			const index = current.indexOf(callback);
			if (index !== -1) {
				current.splice(index, 1);
			}
		}
	};
}

/**
 * Clears all callbacks for a form.
 *
 * @param eid - Form entity ID
 */
export function clearFormCallbacks(eid: Entity): void {
	submitCallbacks.delete(eid);
	resetCallbacks.delete(eid);
}

/**
 * Focuses the next field in the form.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @returns The newly focused entity or null
 *
 * @example
 * ```typescript
 * import { focusNextField } from 'blecsd';
 *
 * focusNextField(world, form);
 * ```
 */
export function focusNextField(
	world: World,
	formEntity: Entity,
): Entity | null {
	const fields = getFormFields(world, formEntity);
	const focusableFields = fields.filter((eid) => isFocusable(world, eid));
	return focusNext(world, focusableFields);
}

/**
 * Focuses the previous field in the form.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @returns The newly focused entity or null
 *
 * @example
 * ```typescript
 * import { focusPrevField } from 'blecsd';
 *
 * focusPrevField(world, form);
 * ```
 */
export function focusPrevField(
	world: World,
	formEntity: Entity,
): Entity | null {
	const fields = getFormFields(world, formEntity);
	const focusableFields = fields.filter((eid) => isFocusable(world, eid));
	return focusPrev(world, focusableFields);
}

/**
 * Gets all focusable descendant entities in tab order.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @returns Array of focusable entities in tab order
 */
export function getFormTabOrder(world: World, formEntity: Entity): Entity[] {
	const descendants = getDescendants(world, formEntity);
	const focusable = descendants.filter((eid) => isFocusable(world, eid));
	return getTabOrder(world, focusable);
}

/**
 * Handles key press events for form navigation.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @param key - Key name
 * @param shift - Whether shift is held
 * @returns True if the key was handled
 *
 * @example
 * ```typescript
 * import { handleFormKeyPress } from 'blecsd';
 *
 * if (handleFormKeyPress(world, form, 'tab', false)) {
 *   // Key was handled
 * }
 * ```
 */
export function handleFormKeyPress(
	world: World,
	formEntity: Entity,
	key: string,
	shift: boolean,
): boolean {
	if (!isForm(world, formEntity)) {
		return false;
	}

	if (!isFormKeysEnabled(formEntity)) {
		return false;
	}

	// Tab/Shift+Tab navigation
	if (key === 'tab') {
		if (shift) {
			focusPrevField(world, formEntity);
		} else {
			focusNextField(world, formEntity);
		}
		return true;
	}

	// Enter to submit (if enabled)
	if (key === 'return' || key === 'enter') {
		if (isFormSubmitOnEnter(formEntity)) {
			submitForm(world, formEntity);
			return true;
		}
	}

	return false;
}

/**
 * Auto-registers all focusable children as form fields.
 * Uses the entity ID as the field name if no name is provided.
 *
 * @param world - The ECS world
 * @param formEntity - Form entity ID
 * @param namePrefix - Optional prefix for auto-generated names
 */
export function autoRegisterFields(
	world: World,
	formEntity: Entity,
	namePrefix = 'field_',
): void {
	const descendants = getDescendants(world, formEntity);

	for (const eid of descendants) {
		// Only register fields that can hold values
		if (isTextInput(world, eid) || isCheckbox(world, eid)) {
			const name = `${namePrefix}${eid}`;
			registerFormField(world, formEntity, eid, name);
		}
	}
}
