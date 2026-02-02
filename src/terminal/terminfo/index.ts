/**
 * Terminfo module for terminal capability access.
 * @module terminal/terminfo
 */

export type {
	BooleanCapability,
	NumberCapability,
	StringCapability,
	TerminfoData,
	Tput,
	TputConfig,
} from './tput';
export { createTput, getDefaultTput, getDefaultXtermData, resetDefaultTput } from './tput';
