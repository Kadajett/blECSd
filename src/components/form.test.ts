import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import { createBoxEntity, createCheckboxEntity, createTextboxEntity } from '../core/entities';
import type { World } from '../core/types';
import { resetCheckboxStore } from './checkbox';
import { resetContentStore } from './content';
import { resetFocusState } from './focusable';
import {
	attachFormBehavior,
	clearFormCallbacks,
	getFieldName,
	getFieldValue,
	getFormFields,
	getFormValues,
	handleFormKeyPress,
	isForm,
	isFormKeysEnabled,
	isFormSubmitOnEnter,
	onFormReset,
	onFormSubmit,
	registerFormField,
	resetForm,
	resetFormStore,
	setFieldValue,
	submitForm,
	unregisterFormField,
} from './form';
import { StateMachineStore } from './stateMachine';
import { resetTextInputStore } from './textInput';

describe('Form Component', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld() as World;
		resetFormStore();
		resetContentStore();
		resetFocusState();
		resetCheckboxStore();
		resetTextInputStore();
		StateMachineStore.clear();
	});

	describe('attachFormBehavior', () => {
		it('marks an entity as a form', () => {
			const eid = createBoxEntity(world);
			attachFormBehavior(world, eid);

			expect(isForm(world, eid)).toBe(true);
		});

		it('enables keys by default', () => {
			const eid = createBoxEntity(world);
			attachFormBehavior(world, eid);

			expect(isFormKeysEnabled(eid)).toBe(true);
		});

		it('enables submit on enter by default', () => {
			const eid = createBoxEntity(world);
			attachFormBehavior(world, eid);

			expect(isFormSubmitOnEnter(eid)).toBe(true);
		});

		it('respects keys option', () => {
			const eid = createBoxEntity(world);
			attachFormBehavior(world, eid, { keys: false });

			expect(isFormKeysEnabled(eid)).toBe(false);
		});

		it('respects submitOnEnter option', () => {
			const eid = createBoxEntity(world);
			attachFormBehavior(world, eid, { submitOnEnter: false });

			expect(isFormSubmitOnEnter(eid)).toBe(false);
		});
	});

	describe('isForm', () => {
		it('returns false for non-form entities', () => {
			const eid = createBoxEntity(world);

			expect(isForm(world, eid)).toBe(false);
		});

		it('returns true for form entities', () => {
			const eid = createBoxEntity(world);
			attachFormBehavior(world, eid);

			expect(isForm(world, eid)).toBe(true);
		});
	});

	describe('Field Registration', () => {
		it('registers a field with a name', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field = createTextboxEntity(world, { parent: form });
			registerFormField(world, form, field, 'username');

			expect(getFieldName(form, field)).toBe('username');
		});

		it('returns all registered fields', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field1 = createTextboxEntity(world, { parent: form });
			const field2 = createTextboxEntity(world, { parent: form });
			registerFormField(world, form, field1, 'username');
			registerFormField(world, form, field2, 'password');

			const fields = getFormFields(world, form);
			expect(fields).toContain(field1);
			expect(fields).toContain(field2);
			expect(fields.length).toBe(2);
		});

		it('unregisters a field', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field = createTextboxEntity(world, { parent: form });
			registerFormField(world, form, field, 'username');
			unregisterFormField(world, form, field);

			expect(getFieldName(form, field)).toBeUndefined();
			expect(getFormFields(world, form).length).toBe(0);
		});
	});

	describe('Field Values', () => {
		it('gets textbox field value', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field = createTextboxEntity(world, {
				parent: form,
				value: 'test value',
			});
			registerFormField(world, form, field, 'input');

			expect(getFieldValue(world, field)).toBe('test value');
		});

		it('gets checkbox field value', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field = createCheckboxEntity(world, {
				parent: form,
				checked: true,
			});
			registerFormField(world, form, field, 'agree');

			expect(getFieldValue(world, field)).toBe(true);
		});

		it('sets textbox field value', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field = createTextboxEntity(world, { parent: form });
			registerFormField(world, form, field, 'input');

			setFieldValue(world, field, 'new value');

			expect(getFieldValue(world, field)).toBe('new value');
		});

		it('sets checkbox field value', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field = createCheckboxEntity(world, { parent: form });
			registerFormField(world, form, field, 'agree');

			setFieldValue(world, field, true);

			expect(getFieldValue(world, field)).toBe(true);
		});
	});

	describe('Form Values', () => {
		it('gets all form values', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const username = createTextboxEntity(world, {
				parent: form,
				value: 'john',
			});
			const agree = createCheckboxEntity(world, {
				parent: form,
				checked: true,
			});

			registerFormField(world, form, username, 'username');
			registerFormField(world, form, agree, 'agree');

			const values = getFormValues(world, form);

			expect(values.username).toBe('john');
			expect(values.agree).toBe(true);
		});

		it('returns empty object for form with no fields', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const values = getFormValues(world, form);

			expect(values).toEqual({});
		});
	});

	describe('Form Submit', () => {
		it('returns form values on submit', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field = createTextboxEntity(world, {
				parent: form,
				value: 'test',
			});
			registerFormField(world, form, field, 'input');

			const values = submitForm(world, form);

			expect(values.input).toBe('test');
		});

		it('calls submit callbacks', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const callback = vi.fn();
			onFormSubmit(form, callback);

			const field = createTextboxEntity(world, {
				parent: form,
				value: 'test',
			});
			registerFormField(world, form, field, 'input');

			submitForm(world, form);

			expect(callback).toHaveBeenCalledWith({ input: 'test' });
		});

		it('unsubscribes from submit callback', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const callback = vi.fn();
			const unsubscribe = onFormSubmit(form, callback);
			unsubscribe();

			submitForm(world, form);

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('Form Reset', () => {
		it('resets fields to initial values', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field = createTextboxEntity(world, {
				parent: form,
				value: 'initial',
			});
			registerFormField(world, form, field, 'input', 'initial');

			setFieldValue(world, field, 'changed');
			expect(getFieldValue(world, field)).toBe('changed');

			resetForm(world, form);

			expect(getFieldValue(world, field)).toBe('initial');
		});

		it('calls reset callbacks', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const callback = vi.fn();
			onFormReset(form, callback);

			resetForm(world, form);

			expect(callback).toHaveBeenCalled();
		});

		it('unsubscribes from reset callback', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const callback = vi.fn();
			const unsubscribe = onFormReset(form, callback);
			unsubscribe();

			resetForm(world, form);

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('clearFormCallbacks', () => {
		it('clears all callbacks', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const submitCallback = vi.fn();
			const resetCallback = vi.fn();
			onFormSubmit(form, submitCallback);
			onFormReset(form, resetCallback);

			clearFormCallbacks(form);

			submitForm(world, form);
			resetForm(world, form);

			expect(submitCallback).not.toHaveBeenCalled();
			expect(resetCallback).not.toHaveBeenCalled();
		});
	});

	describe('Key Navigation', () => {
		it('handles tab to focus next field', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field1 = createTextboxEntity(world, { parent: form, tabIndex: 1 });
			const field2 = createTextboxEntity(world, { parent: form, tabIndex: 2 });
			registerFormField(world, form, field1, 'field1');
			registerFormField(world, form, field2, 'field2');

			const handled = handleFormKeyPress(world, form, 'tab', false);

			expect(handled).toBe(true);
		});

		it('handles shift+tab to focus previous field', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field1 = createTextboxEntity(world, { parent: form, tabIndex: 1 });
			const field2 = createTextboxEntity(world, { parent: form, tabIndex: 2 });
			registerFormField(world, form, field1, 'field1');
			registerFormField(world, form, field2, 'field2');

			const handled = handleFormKeyPress(world, form, 'tab', true);

			expect(handled).toBe(true);
		});

		it('handles enter to submit when enabled', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form, { submitOnEnter: true });

			const callback = vi.fn();
			onFormSubmit(form, callback);

			const handled = handleFormKeyPress(world, form, 'return', false);

			expect(handled).toBe(true);
			expect(callback).toHaveBeenCalled();
		});

		it('does not submit on enter when disabled', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form, { submitOnEnter: false });

			const callback = vi.fn();
			onFormSubmit(form, callback);

			const handled = handleFormKeyPress(world, form, 'return', false);

			expect(handled).toBe(false);
			expect(callback).not.toHaveBeenCalled();
		});

		it('ignores keys when keys option is disabled', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form, { keys: false });

			const handled = handleFormKeyPress(world, form, 'tab', false);

			expect(handled).toBe(false);
		});
	});

	describe('resetFormStore', () => {
		it('resets all form data', () => {
			const form = createBoxEntity(world);
			attachFormBehavior(world, form);

			const field = createTextboxEntity(world, { parent: form });
			registerFormField(world, form, field, 'input');

			resetFormStore();

			expect(isForm(world, form)).toBe(false);
			expect(getFormFields(world, form).length).toBe(0);
		});
	});
});
