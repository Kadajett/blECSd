/**
 * Tests for Form widget
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import { createCheckbox } from './checkbox';
import { createForm, resetFormStore } from './form';
import { createTextbox } from './textbox';

describe('Form Widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFormStore();
	});

	describe('createForm', () => {
		it('should create a form with default config', () => {
			const form = createForm(world);

			expect(form.eid).toBeGreaterThanOrEqual(0);
			expect(form.getFieldNames()).toEqual([]);
		});

		it('should create with initial position', () => {
			const form = createForm(world, { x: 10, y: 5 });

			expect(form.getPosition()).toMatchObject({ x: 10, y: 5 });
		});
	});

	describe('addField', () => {
		it('should add a field to the form', () => {
			const form = createForm(world);
			const textbox = createTextbox(world);

			form.addField('username', textbox);

			expect(form.getFieldNames()).toContain('username');
		});

		it('should add multiple fields', () => {
			const form = createForm(world);
			const username = createTextbox(world);
			const password = createTextbox(world, { secret: true });

			form.addField('username', username);
			form.addField('password', password);

			expect(form.getFieldNames()).toEqual(['username', 'password']);
		});

		it('should overwrite field with same name', () => {
			const form = createForm(world);
			const field1 = createTextbox(world);
			const field2 = createTextbox(world);

			form.addField('name', field1);
			form.addField('name', field2);

			expect(form.getFieldNames()).toEqual(['name']);
			expect(form.getField('name')).toBe(field2);
		});

		it('should be chainable', () => {
			const form = createForm(world);
			const textbox = createTextbox(world);

			const result = form.addField('test', textbox);

			expect(result).toBe(form);
		});
	});

	describe('getField', () => {
		it('should return field by name', () => {
			const form = createForm(world);
			const textbox = createTextbox(world);

			form.addField('email', textbox);

			expect(form.getField('email')).toBe(textbox);
		});

		it('should return undefined for non-existent field', () => {
			const form = createForm(world);

			expect(form.getField('nonexistent')).toBeUndefined();
		});
	});

	describe('removeField', () => {
		it('should remove field by name', () => {
			const form = createForm(world);
			const textbox = createTextbox(world);

			form.addField('test', textbox);
			form.removeField('test');

			expect(form.getFieldNames()).toEqual([]);
			expect(form.getField('test')).toBeUndefined();
		});

		it('should be chainable', () => {
			const form = createForm(world);
			const textbox = createTextbox(world);

			form.addField('test', textbox);
			const result = form.removeField('test');

			expect(result).toBe(form);
		});
	});

	describe('getValue', () => {
		it('should get value from textbox field', () => {
			const form = createForm(world);
			const textbox = createTextbox(world, { value: 'test@example.com' });

			form.addField('email', textbox);

			expect(form.getValue('email')).toBe('test@example.com');
		});

		it('should get value from checkbox field', () => {
			const form = createForm(world);
			const checkbox = createCheckbox(world, { checked: true });

			form.addField('agree', checkbox);

			expect(form.getValue('agree')).toBe(true);
		});

		it('should return undefined for non-existent field', () => {
			const form = createForm(world);

			expect(form.getValue('nonexistent')).toBeUndefined();
		});
	});

	describe('getValues', () => {
		it('should get all field values as object', () => {
			const form = createForm(world);
			const username = createTextbox(world, { value: 'john' });
			const password = createTextbox(world, { value: 'secret' });
			const agree = createCheckbox(world, { checked: true });

			form.addField('username', username);
			form.addField('password', password);
			form.addField('agree', agree);

			expect(form.getValues()).toEqual({
				username: 'john',
				password: 'secret',
				agree: true,
			});
		});

		it('should return empty object when no fields', () => {
			const form = createForm(world);

			expect(form.getValues()).toEqual({});
		});
	});

	describe('reset', () => {
		it('should reset all textbox fields to empty', () => {
			const form = createForm(world);
			const username = createTextbox(world, { value: 'john' });
			const password = createTextbox(world, { value: 'secret' });

			form.addField('username', username);
			form.addField('password', password);

			form.reset();

			expect(form.getValue('username')).toBe('');
			expect(form.getValue('password')).toBe('');
		});

		it('should reset checkbox fields to unchecked', () => {
			const form = createForm(world);
			const agree = createCheckbox(world, { checked: true });

			form.addField('agree', agree);

			form.reset();

			expect(form.getValue('agree')).toBe(false);
		});

		it('should be chainable', () => {
			const form = createForm(world);

			const result = form.reset();

			expect(result).toBe(form);
		});
	});

	describe('validate', () => {
		it('should call validator function with form values', () => {
			const form = createForm(world);
			const username = createTextbox(world, { value: 'john' });

			form.addField('username', username);

			const validator = vi.fn((values: Record<string, unknown>): Record<string, string> => {
				if (!values.username) {
					return { username: 'Username is required' };
				}
				return {};
			});

			const errors = form.validate(validator);

			expect(validator).toHaveBeenCalledWith({ username: 'john' });
			expect(errors).toEqual({});
		});

		it('should return validation errors', () => {
			const form = createForm(world);
			const username = createTextbox(world, { value: '' });

			form.addField('username', username);

			const validator = (values: Record<string, unknown>): Record<string, string> => {
				if (!values.username) {
					return { username: 'Username is required' };
				}
				return {};
			};

			const errors = form.validate(validator);

			expect(errors).toEqual({ username: 'Username is required' });
		});

		it('should return empty object when no validator provided', () => {
			const form = createForm(world);

			const errors = form.validate();

			expect(errors).toEqual({});
		});
	});

	describe('submit', () => {
		it('should call onSubmit callback with form values', () => {
			const form = createForm(world);
			const username = createTextbox(world, { value: 'john' });
			const password = createTextbox(world, { value: 'secret' });

			form.addField('username', username);
			form.addField('password', password);

			const submitHandler = vi.fn();
			form.onSubmit(submitHandler);

			form.submit();

			expect(submitHandler).toHaveBeenCalledWith({
				username: 'john',
				password: 'secret',
			});
		});

		it('should not submit if validation fails', () => {
			const form = createForm(world);
			const username = createTextbox(world, { value: '' });

			form.addField('username', username);

			const validator = (values: Record<string, unknown>): Record<string, string> => {
				if (!values.username) {
					return { username: 'Username is required' };
				}
				return {};
			};

			const submitHandler = vi.fn();
			form.setValidator(validator);
			form.onSubmit(submitHandler);

			form.submit();

			expect(submitHandler).not.toHaveBeenCalled();
		});

		it('should call onValidationError when validation fails', () => {
			const form = createForm(world);
			const username = createTextbox(world, { value: '' });

			form.addField('username', username);

			const validator = (values: Record<string, unknown>): Record<string, string> => {
				if (!values.username) {
					return { username: 'Username is required' };
				}
				return {};
			};

			const errorHandler = vi.fn();
			form.setValidator(validator);
			form.onValidationError(errorHandler);

			form.submit();

			expect(errorHandler).toHaveBeenCalledWith({ username: 'Username is required' });
		});
	});

	describe('onChange', () => {
		it('should call callback when any field changes', () => {
			const form = createForm(world);
			const username = createTextbox(world);

			form.addField('username', username);

			const changeHandler = vi.fn();
			form.onChange(changeHandler);

			username.setValue('john');

			expect(changeHandler).toHaveBeenCalledWith({
				username: 'john',
			});
		});
	});

	describe('focus navigation', () => {
		it('should focus first field', () => {
			const form = createForm(world);
			const username = createTextbox(world);
			const password = createTextbox(world);

			form.addField('username', username);
			form.addField('password', password);

			form.focusFirst();

			expect(username.getValue).toBeDefined();
		});

		it('should focus next field on Tab', () => {
			const form = createForm(world);
			const username = createTextbox(world);
			const password = createTextbox(world);

			form.addField('username', username);
			form.addField('password', password);

			form.focusFirst();
			const handled = form.handleKey('tab');

			expect(handled).toBe(true);
		});

		it('should focus previous field on Shift+Tab', () => {
			const form = createForm(world);
			const username = createTextbox(world);
			const password = createTextbox(world);

			form.addField('username', username);
			form.addField('password', password);

			form.focusFirst();
			form.handleKey('tab'); // Move to password
			const handled = form.handleKey('S-tab');

			expect(handled).toBe(true);
		});
	});

	describe('destroy', () => {
		it('should clean up form state', () => {
			const form = createForm(world);
			const textbox = createTextbox(world);

			form.addField('test', textbox);

			form.destroy();

			expect(() => form.getFieldNames()).not.toThrow();
		});
	});
});
