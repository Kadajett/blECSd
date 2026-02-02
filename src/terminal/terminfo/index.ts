/**
 * Terminfo module for terminal capability access.
 * @module terminal/terminfo
 */

// =============================================================================
// TPUT - High-level capability interface
// =============================================================================

export type {
	BooleanCapability,
	NumberCapability,
	StringCapability,
	TerminfoData,
	Tput,
	TputConfig,
} from './tput';
export { createTput, getDefaultTput, getDefaultXtermData, resetDefaultTput } from './tput';

// =============================================================================
// PARSER - Binary terminfo format parser
// =============================================================================

export type {
	ParsedTerminfo,
	ParseResult,
	ParserErrorType,
	TerminfoExtended,
	TerminfoHeader,
} from './parser';
export {
	getTerminfoFormat,
	isValidTerminfo,
	parseTerminfo,
	TERMINFO_MAGIC_EXTENDED,
	TERMINFO_MAGIC_LEGACY,
	toTerminfoData,
} from './parser';
