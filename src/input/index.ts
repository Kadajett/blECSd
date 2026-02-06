/**
 * Input handling module
 *
 * Vi-style navigation and other input modes.
 *
 * @module input
 */

// Vi navigation mode
export type {
	ViAction,
	ViModeConfig,
	ViModeState,
	ViState,
} from './viMode';
export {
	createViConfig,
	createViState,
	isViKey,
	processViKey,
	resolveJumpTarget,
	resolvePageAmount,
} from './viMode';
