/**
 * Input exports.
 * @module input
 */

export {
	matchKeyBinding,
	DEFAULT_KEY_BINDINGS,
	type Action,
	type KeyBinding,
} from './keyBindings';

export {
	processMouseEvent,
	createUIRegions,
	type MouseAction,
	type UIRegions,
} from './mouseBindings';

export {
	handleAction,
	handleMouseAction,
	handleFilterInput,
	type HandlerContext,
	type HandlerResult,
} from './handlers';
