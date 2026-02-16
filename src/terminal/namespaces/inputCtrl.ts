/**
 * Input control namespace.
 *
 * Functions for managing terminal input modes including keyboard input,
 * mouse tracking, and input enable/disable state.
 *
 * @example
 * ```typescript
 * import { inputCtrl } from 'blecsd/terminal';
 *
 * // Create input control
 * const control = inputCtrl.createInputControl(program, options);
 *
 * // Enable keyboard and mouse input
 * inputCtrl.enableInput(control);
 * inputCtrl.enableKeys(control);
 * inputCtrl.enableMouse(control);
 *
 * // Set mouse tracking mode
 * inputCtrl.setMouseMode(control, inputCtrl.MouseTrackingMode.BUTTON_EVENT);
 *
 * // Check input state
 * if (inputCtrl.areKeysEnabled(control)) {
 *   // Process keyboard input
 * }
 * if (inputCtrl.isMouseEnabled(control)) {
 *   // Process mouse input
 * }
 *
 * // Disable input
 * inputCtrl.disableInput(control);
 * ```
 */

import {
	areKeysEnabled,
	createInputControl,
	destroyInputControl,
	disableInput,
	disableKeys,
	disableMouse,
	disableWorldInput,
	disableWorldKeys,
	disableWorldMouse,
	enableInput,
	enableKeys,
	enableMouse,
	enableWorldInput,
	enableWorldKeys,
	enableWorldMouse,
	getInputControl,
	getInputControlEventBus,
	getMouseMode,
	isInputEnabled,
	isMouseEnabled,
	MouseTrackingMode,
	resetInputControlEventBus,
	setMouseMode,
} from '../inputControl';

/**
 * Input control namespace.
 */
export const inputCtrl = Object.freeze({
	areKeysEnabled,
	createInputControl,
	destroyInputControl,
	disableInput,
	disableKeys,
	disableMouse,
	disableWorldInput,
	disableWorldKeys,
	disableWorldMouse,
	enableInput,
	enableKeys,
	enableMouse,
	enableWorldInput,
	enableWorldKeys,
	enableWorldMouse,
	getInputControl,
	getInputControlEventBus,
	getMouseMode,
	isInputEnabled,
	isMouseEnabled,
	MouseTrackingMode: Object.freeze(MouseTrackingMode),
	resetInputControlEventBus,
	setMouseMode,
});

export type InputCtrlModule = typeof inputCtrl;
