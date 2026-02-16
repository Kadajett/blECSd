/**
 * Button component namespace.
 *
 * Provides all operations for button components.
 *
 * @example
 * ```typescript
 * import { button } from 'blecsd/components';
 * button.attach(world, eid);
 * button.press(world, eid);
 * button.onPress(world, eid, () => { ... });
 * ```
 */
import {
	attachButtonBehavior,
	clearButtonCallbacks,
	disableButton,
	enableButton,
	getButtonState,
	handleButtonKeyPress,
	isButton,
	isButtonDisabled,
	isButtonFocused,
	isButtonHovered,
	isButtonInState,
	isButtonPressed,
	onButtonPress,
	pressButton,
	sendButtonEvent,
} from '../button';

export const button = Object.freeze({
	attach: attachButtonBehavior,
	is: isButton,
	getState: getButtonState,
	isInState: isButtonInState,
	sendEvent: sendButtonEvent,
	handleKeyPress: handleButtonKeyPress,

	press: pressButton,
	onPress: onButtonPress,
	clearCallbacks: clearButtonCallbacks,

	isHovered: isButtonHovered,
	isPressed: isButtonPressed,
	isFocused: isButtonFocused,

	enable: enableButton,
	disable: disableButton,
	isDisabled: isButtonDisabled,
});

export type ButtonModule = typeof button;
