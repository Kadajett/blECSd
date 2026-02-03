/**
 * Input layer exports
 * @module balatro/input
 */

export type {
	KeyAction,
	KeyBinding,
	KeyEvent,
	InputState,
	KeyboardHandler,
} from './keyboard';

export {
	parseKeyEvent,
	createInputState,
	getActionForKey,
	processAction,
	clearPendingActions,
	clearSelections,
	getNextPendingAction,
	consumePendingAction,
	createKeyboardHandler,
	getDefaultBindings,
} from './keyboard';

export type {
	MouseButton,
	MouseEventType,
	MousePosition,
	MouseEvent,
	HitRect,
	MouseState,
} from './mouse';

export {
	parseMouseEvent,
	createMouseState,
	updateMouseState,
	findHitTarget,
	isPointInRect,
	clearClickedState,
	wasClicked,
	isHovered,
	createHitRect,
	sortHitTargets,
	getEnableMouseSequence,
	getDisableMouseSequence,
} from './mouse';
