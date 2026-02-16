/**
 * RadioButton component namespace.
 *
 * Provides all operations for radio button and radio set components.
 *
 * @example
 * ```typescript
 * import { radio } from 'blecsd/components';
 * radio.attach(world, eid);
 * radio.select(world, eid);
 * radio.set.getSelected(world, setEid);
 * ```
 */
import {
	attachRadioButtonBehavior,
	attachRadioSetBehavior,
	clearRadioButtonDisplay,
	clearRadioSetCallbacks,
	deselectRadioButton,
	disableRadioButton,
	enableRadioButton,
	getRadioButtonChar,
	getRadioButtonDisplay,
	getRadioButtonState,
	getRadioButtonsInSet,
	getRadioSet,
	getRadioValue,
	getSelectedButton,
	getSelectedValue,
	handleRadioButtonKeyPress,
	isRadioButton,
	isRadioButtonDisabled,
	isRadioButtonInState,
	isRadioSelected,
	isRadioSet,
	onRadioSelect,
	selectRadioButton,
	selectRadioByValue,
	sendRadioButtonEvent,
	setRadioButtonDisplay,
	setRadioSet,
	setRadioValue,
} from '../radioButton';

export const radio = Object.freeze({
	attach: attachRadioButtonBehavior,
	is: isRadioButton,
	getState: getRadioButtonState,
	isInState: isRadioButtonInState,
	sendEvent: sendRadioButtonEvent,
	handleKeyPress: handleRadioButtonKeyPress,

	select: selectRadioButton,
	deselect: deselectRadioButton,
	selectByValue: selectRadioByValue,
	isSelected: isRadioSelected,
	getValue: getRadioValue,
	setValue: setRadioValue,
	getSelectedValue,

	enable: enableRadioButton,
	disable: disableRadioButton,
	isDisabled: isRadioButtonDisabled,

	display: Object.freeze({
		get: getRadioButtonDisplay,
		set: setRadioButtonDisplay,
		clear: clearRadioButtonDisplay,
		getChar: getRadioButtonChar,
	}),

	set: Object.freeze({
		attach: attachRadioSetBehavior,
		is: isRadioSet,
		get: getRadioSet,
		create: setRadioSet,
		getButtons: getRadioButtonsInSet,
		getSelected: getSelectedButton,
		onSelect: onRadioSelect,
		clearCallbacks: clearRadioSetCallbacks,
	}),
});

export type RadioModule = typeof radio;
