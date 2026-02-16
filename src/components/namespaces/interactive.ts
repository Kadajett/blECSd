/**
 * Interactive component namespace.
 *
 * Provides all operations for entity interaction state (hover, press, click, drag).
 *
 * @example
 * ```typescript
 * import { interactive } from 'blecsd/components';
 * interactive.enable(world, eid);
 * interactive.setClickable(world, eid, true);
 * if (interactive.isHovered(world, eid)) { ... }
 * ```
 */
import {
	clearInteractionState,
	disable,
	disableInput,
	disableKeys,
	disableMouse,
	enable,
	enableInput,
	enableKeys,
	enableMouse,
	getFocusEffect,
	getInteractive,
	hasInputEnabled,
	hasInteractive,
	hasKeysEnabled,
	hasMouseEnabled,
	isClickable,
	isDraggable,
	isEnabled,
	isHoverable,
	isHovered,
	isKeyable,
	isPressed,
	setClickable,
	setDraggable,
	setFocusEffect,
	setFocusedState,
	setHoverable,
	setHovered,
	setInteractive,
	setKeyable,
	setPressed,
} from '../../systems/interactiveSystem';

export const interactive = Object.freeze({
	get: getInteractive,
	has: hasInteractive,
	set: setInteractive,

	enable,
	disable,
	isEnabled,

	enableInput,
	disableInput,
	hasInputEnabled,

	enableKeys,
	disableKeys,
	hasKeysEnabled,

	enableMouse,
	disableMouse,
	hasMouseEnabled,

	isClickable,
	setClickable,
	isDraggable,
	setDraggable,
	isHoverable,
	setHoverable,
	isKeyable,
	setKeyable,

	isHovered,
	setHovered,
	isPressed,
	setPressed,

	getFocusEffect,
	setFocusEffect,
	setFocusedState,

	clearState: clearInteractionState,
});

export type InteractiveModule = typeof interactive;
