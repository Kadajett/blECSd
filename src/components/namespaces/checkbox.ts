/**
 * Checkbox component namespace.
 *
 * Provides all operations for checkbox components.
 *
 * @example
 * ```typescript
 * import { checkbox } from 'blecsd/components';
 * checkbox.attach(world, eid);
 * checkbox.toggle(world, eid);
 * if (checkbox.isChecked(world, eid)) { ... }
 * ```
 */
import {
	attachCheckboxBehavior,
	checkCheckbox,
	clearCheckboxCallbacks,
	clearCheckboxDisplay,
	disableCheckbox,
	enableCheckbox,
	getCheckboxChar,
	getCheckboxDisplay,
	getCheckboxState,
	handleCheckboxKeyPress,
	isCheckbox,
	isCheckboxDisabled,
	isCheckboxInState,
	isChecked,
	isUnchecked,
	onCheckboxChange,
	sendCheckboxEvent,
	setCheckboxDisplay,
	setChecked,
	toggleCheckbox,
	uncheckCheckbox,
} from '../checkbox';

export const checkbox = Object.freeze({
	attach: attachCheckboxBehavior,
	is: isCheckbox,
	getState: getCheckboxState,
	isInState: isCheckboxInState,
	sendEvent: sendCheckboxEvent,
	handleKeyPress: handleCheckboxKeyPress,

	check: checkCheckbox,
	uncheck: uncheckCheckbox,
	toggle: toggleCheckbox,
	setChecked,
	isChecked,
	isUnchecked,

	enable: enableCheckbox,
	disable: disableCheckbox,
	isDisabled: isCheckboxDisabled,

	display: Object.freeze({
		get: getCheckboxDisplay,
		set: setCheckboxDisplay,
		clear: clearCheckboxDisplay,
		getChar: getCheckboxChar,
	}),

	callbacks: Object.freeze({
		onChange: onCheckboxChange,
		clear: clearCheckboxCallbacks,
	}),
});

export type CheckboxModule = typeof checkbox;
