/**
 * Form component namespace.
 *
 * Provides all operations for form management, field registration, and submission.
 *
 * @example
 * ```typescript
 * import { form } from 'blecsd/components';
 * form.attach(world, eid);
 * form.registerField(world, eid, fieldEid);
 * form.submit(world, eid);
 * ```
 */
import {
	attachFormBehavior,
	autoRegisterFields,
	clearFormCallbacks,
	focusNextField,
	focusPrevField,
	getFieldName,
	getFieldValue,
	getFormFields,
	getFormTabOrder,
	getFormValues,
	handleFormKeyPress,
	isForm,
	isFormKeysEnabled,
	isFormSubmitOnEnter,
	onFormReset,
	onFormSubmit,
	registerFormField,
	resetForm,
	setFieldValue,
	submitForm,
	unregisterFormField,
} from '../form';

export const form = Object.freeze({
	attach: attachFormBehavior,
	is: isForm,
	handleKeyPress: handleFormKeyPress,

	registerField: registerFormField,
	unregisterField: unregisterFormField,
	autoRegisterFields,
	getFields: getFormFields,
	getTabOrder: getFormTabOrder,

	getFieldName,
	getFieldValue,
	setFieldValue,
	getValues: getFormValues,

	submit: submitForm,
	reset: resetForm,
	isKeysEnabled: isFormKeysEnabled,
	isSubmitOnEnter: isFormSubmitOnEnter,

	focusNext: focusNextField,
	focusPrev: focusPrevField,

	callbacks: Object.freeze({
		onSubmit: onFormSubmit,
		onReset: onFormReset,
		clear: clearFormCallbacks,
	}),
});

export type FormModule = typeof form;
