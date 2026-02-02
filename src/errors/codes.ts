/**
 * Error code constants for the BlECSd library.
 *
 * Error codes follow the pattern: `<CATEGORY>_<SPECIFIC_ERROR>`
 * where CATEGORY matches the BlECSdErrorKind.
 *
 * @module errors/codes
 */

// =============================================================================
// VALIDATION ERROR CODES
// =============================================================================

/**
 * Validation error codes for input/config validation failures.
 */
export const ValidationErrorCode = {
	/** Generic validation failure */
	INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
	/** Invalid hex color format */
	INVALID_HEX_COLOR: 'VALIDATION_INVALID_HEX_COLOR',
	/** Invalid hex color length */
	INVALID_HEX_LENGTH: 'VALIDATION_INVALID_HEX_LENGTH',
	/** Invalid color object */
	INVALID_COLOR_OBJECT: 'VALIDATION_INVALID_COLOR_OBJECT',
	/** Invalid color value */
	INVALID_COLOR_VALUE: 'VALIDATION_INVALID_COLOR_VALUE',
	/** Invalid palette index */
	INVALID_PALETTE_INDEX: 'VALIDATION_INVALID_PALETTE_INDEX',
	/** Invalid color cube index */
	INVALID_CUBE_INDEX: 'VALIDATION_INVALID_CUBE_INDEX',
	/** Invalid grayscale index */
	INVALID_GRAYSCALE_INDEX: 'VALIDATION_INVALID_GRAYSCALE_INDEX',
	/** Invalid dimension value */
	INVALID_DIMENSION: 'VALIDATION_INVALID_DIMENSION',
	/** Invalid buffer dimensions */
	INVALID_BUFFER_DIMENSIONS: 'VALIDATION_INVALID_BUFFER_DIMENSIONS',
	/** Invalid surrogate pair */
	INVALID_SURROGATE_PAIR: 'VALIDATION_INVALID_SURROGATE_PAIR',
	/** Schema validation failed */
	SCHEMA_VALIDATION_FAILED: 'VALIDATION_SCHEMA_FAILED',
	/** Required field missing */
	REQUIRED_FIELD_MISSING: 'VALIDATION_REQUIRED_FIELD_MISSING',
	/** Value out of range */
	VALUE_OUT_OF_RANGE: 'VALIDATION_VALUE_OUT_OF_RANGE',
} as const;

export type ValidationErrorCodeType =
	(typeof ValidationErrorCode)[keyof typeof ValidationErrorCode];

// =============================================================================
// TERMINAL ERROR CODES
// =============================================================================

/**
 * Terminal error codes for terminal I/O and capability failures.
 */
export const TerminalErrorCode = {
	/** Generic terminal error */
	TERMINAL_ERROR: 'TERMINAL_ERROR',
	/** Terminal not initialized */
	NOT_INITIALIZED: 'TERMINAL_NOT_INITIALIZED',
	/** Terminal already initialized */
	ALREADY_INITIALIZED: 'TERMINAL_ALREADY_INITIALIZED',
	/** Terminfo file not found */
	TERMINFO_NOT_FOUND: 'TERMINAL_TERMINFO_NOT_FOUND',
	/** Capability negotiation not started */
	NEGOTIATION_NOT_STARTED: 'TERMINAL_NEGOTIATION_NOT_STARTED',
	/** Capability negotiation already started */
	NEGOTIATION_ALREADY_STARTED: 'TERMINAL_NEGOTIATION_ALREADY_STARTED',
	/** Capability not supported */
	CAPABILITY_NOT_SUPPORTED: 'TERMINAL_CAPABILITY_NOT_SUPPORTED',
	/** Terminal write failed */
	WRITE_FAILED: 'TERMINAL_WRITE_FAILED',
	/** Terminal read failed */
	READ_FAILED: 'TERMINAL_READ_FAILED',
	/** Terminal cleanup failed */
	CLEANUP_FAILED: 'TERMINAL_CLEANUP_FAILED',
} as const;

export type TerminalErrorCodeType = (typeof TerminalErrorCode)[keyof typeof TerminalErrorCode];

// =============================================================================
// SYSTEM ERROR CODES
// =============================================================================

/**
 * System error codes for ECS system and game loop failures.
 */
export const SystemErrorCode = {
	/** Generic system error */
	SYSTEM_ERROR: 'SYSTEM_ERROR',
	/** Game loop already running */
	LOOP_ALREADY_RUNNING: 'SYSTEM_LOOP_ALREADY_RUNNING',
	/** Game loop not running */
	LOOP_NOT_RUNNING: 'SYSTEM_LOOP_NOT_RUNNING',
	/** Cannot change world while running */
	CANNOT_CHANGE_WORLD: 'SYSTEM_CANNOT_CHANGE_WORLD',
	/** System execution failed */
	SYSTEM_EXECUTION_FAILED: 'SYSTEM_EXECUTION_FAILED',
	/** Phase not found */
	PHASE_NOT_FOUND: 'SYSTEM_PHASE_NOT_FOUND',
	/** Phase already exists */
	PHASE_ALREADY_EXISTS: 'SYSTEM_PHASE_ALREADY_EXISTS',
	/** Invalid phase order */
	INVALID_PHASE_ORDER: 'SYSTEM_INVALID_PHASE_ORDER',
	/** Scheduler not initialized */
	SCHEDULER_NOT_INITIALIZED: 'SYSTEM_SCHEDULER_NOT_INITIALIZED',
} as const;

export type SystemErrorCodeType = (typeof SystemErrorCode)[keyof typeof SystemErrorCode];

// =============================================================================
// ENTITY ERROR CODES
// =============================================================================

/**
 * Entity error codes for ECS entity management failures.
 */
export const EntityErrorCode = {
	/** Generic entity error */
	ENTITY_ERROR: 'ENTITY_ERROR',
	/** Entity not found */
	NOT_FOUND: 'ENTITY_NOT_FOUND',
	/** Entity already exists (e.g., singleton violation) */
	ALREADY_EXISTS: 'ENTITY_ALREADY_EXISTS',
	/** Screen entity already exists */
	SCREEN_ALREADY_EXISTS: 'ENTITY_SCREEN_ALREADY_EXISTS',
	/** Invalid entity ID */
	INVALID_ID: 'ENTITY_INVALID_ID',
	/** Entity missing required component */
	MISSING_COMPONENT: 'ENTITY_MISSING_COMPONENT',
	/** Entity hierarchy error */
	HIERARCHY_ERROR: 'ENTITY_HIERARCHY_ERROR',
} as const;

export type EntityErrorCodeType = (typeof EntityErrorCode)[keyof typeof EntityErrorCode];

// =============================================================================
// COMPONENT ERROR CODES
// =============================================================================

/**
 * Component error codes for ECS component failures.
 */
export const ComponentErrorCode = {
	/** Generic component error */
	COMPONENT_ERROR: 'COMPONENT_ERROR',
	/** Component not found on entity */
	NOT_FOUND: 'COMPONENT_NOT_FOUND',
	/** Component already exists on entity */
	ALREADY_EXISTS: 'COMPONENT_ALREADY_EXISTS',
	/** Invalid component data */
	INVALID_DATA: 'COMPONENT_INVALID_DATA',
	/** Component store not initialized */
	STORE_NOT_INITIALIZED: 'COMPONENT_STORE_NOT_INITIALIZED',
} as const;

export type ComponentErrorCodeType = (typeof ComponentErrorCode)[keyof typeof ComponentErrorCode];

// =============================================================================
// INPUT ERROR CODES
// =============================================================================

/**
 * Input error codes for input handling failures.
 */
export const InputErrorCode = {
	/** Generic input error */
	INPUT_ERROR: 'INPUT_ERROR',
	/** Invalid key sequence */
	INVALID_KEY_SEQUENCE: 'INPUT_INVALID_KEY_SEQUENCE',
	/** Invalid mouse event */
	INVALID_MOUSE_EVENT: 'INPUT_INVALID_MOUSE_EVENT',
	/** Input handler not registered */
	HANDLER_NOT_REGISTERED: 'INPUT_HANDLER_NOT_REGISTERED',
	/** Input buffer overflow */
	BUFFER_OVERFLOW: 'INPUT_BUFFER_OVERFLOW',
} as const;

export type InputErrorCodeType = (typeof InputErrorCode)[keyof typeof InputErrorCode];

// =============================================================================
// RENDER ERROR CODES
// =============================================================================

/**
 * Render error codes for rendering failures.
 */
export const RenderErrorCode = {
	/** Generic render error */
	RENDER_ERROR: 'RENDER_ERROR',
	/** Buffer not initialized */
	BUFFER_NOT_INITIALIZED: 'RENDER_BUFFER_NOT_INITIALIZED',
	/** Invalid cell coordinates */
	INVALID_COORDINATES: 'RENDER_INVALID_COORDINATES',
	/** Screen buffer overflow */
	BUFFER_OVERFLOW: 'RENDER_BUFFER_OVERFLOW',
	/** Render cycle timeout */
	CYCLE_TIMEOUT: 'RENDER_CYCLE_TIMEOUT',
} as const;

export type RenderErrorCodeType = (typeof RenderErrorCode)[keyof typeof RenderErrorCode];

// =============================================================================
// CONFIG ERROR CODES
// =============================================================================

/**
 * Config error codes for configuration failures.
 */
export const ConfigErrorCode = {
	/** Generic config error */
	CONFIG_ERROR: 'CONFIG_ERROR',
	/** Invalid game config */
	INVALID_GAME_CONFIG: 'CONFIG_INVALID_GAME_CONFIG',
	/** Invalid screen config */
	INVALID_SCREEN_CONFIG: 'CONFIG_INVALID_SCREEN_CONFIG',
	/** Invalid widget config */
	INVALID_WIDGET_CONFIG: 'CONFIG_INVALID_WIDGET_CONFIG',
	/** Missing required config */
	MISSING_REQUIRED: 'CONFIG_MISSING_REQUIRED',
} as const;

export type ConfigErrorCodeType = (typeof ConfigErrorCode)[keyof typeof ConfigErrorCode];

// =============================================================================
// INTERNAL ERROR CODES
// =============================================================================

/**
 * Internal error codes for library internal failures.
 * These indicate bugs in the library itself.
 */
export const InternalErrorCode = {
	/** Generic internal error */
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	/** Unexpected state */
	UNEXPECTED_STATE: 'INTERNAL_UNEXPECTED_STATE',
	/** Assertion failed */
	ASSERTION_FAILED: 'INTERNAL_ASSERTION_FAILED',
	/** Not implemented */
	NOT_IMPLEMENTED: 'INTERNAL_NOT_IMPLEMENTED',
	/** Unreachable code path */
	UNREACHABLE: 'INTERNAL_UNREACHABLE',
} as const;

export type InternalErrorCodeType = (typeof InternalErrorCode)[keyof typeof InternalErrorCode];

// =============================================================================
// ALL ERROR CODES
// =============================================================================

/**
 * All BlECSd error codes combined.
 */
export const BlECSdErrorCode = {
	...ValidationErrorCode,
	...TerminalErrorCode,
	...SystemErrorCode,
	...EntityErrorCode,
	...ComponentErrorCode,
	...InputErrorCode,
	...RenderErrorCode,
	...ConfigErrorCode,
	...InternalErrorCode,
} as const;

export type BlECSdErrorCodeType =
	| ValidationErrorCodeType
	| TerminalErrorCodeType
	| SystemErrorCodeType
	| EntityErrorCodeType
	| ComponentErrorCodeType
	| InputErrorCodeType
	| RenderErrorCodeType
	| ConfigErrorCodeType
	| InternalErrorCodeType;
