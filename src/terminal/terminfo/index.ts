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

// =============================================================================
// LOCATOR - Terminfo file location
// =============================================================================

export type { LocatorConfig, LocatorResult } from './locator';
export {
	findCurrentTerminfo,
	findTerminfo,
	findTerminfoDetailed,
	getCurrentTerminal,
	getExistingSearchPaths,
	getTerminfoPath,
	getTerminfoSearchPaths,
	listTerminals,
	listTerminalsMatching,
	terminalExists,
} from './locator';

// =============================================================================
// CAPABILITIES - Capability name mappings and aliases
// =============================================================================

export type { BooleanCapName, CapabilityType, NumberCapName, StringCapName } from './capabilities';
export {
	BOOLEAN_CAPS,
	CAPABILITY_ALIASES,
	CAPABILITY_REVERSE_ALIASES,
	getCapabilitiesByType,
	getCapabilityIndex,
	getCapabilityType,
	getTermcapName,
	isBooleanCapability,
	isCapabilityName,
	isNumberCapability,
	isStringCapability,
	NUMBER_CAPS,
	resolveCapabilityName,
	STRING_CAPS,
} from './capabilities';
