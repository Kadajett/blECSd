/**
 * ScrollableBox Widget State
 *
 * State management for scrollable box widgets including component definition.
 *
 * @module widgets/scrollableBox/state
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * ScrollableBox component marker for identifying scrollable box entities.
 */
export const ScrollableBox = {
	/** Tag indicating this is a scrollable box widget (1 = yes) */
	isScrollableBox: new Uint8Array(DEFAULT_CAPACITY),
	/** Mouse scrolling enabled (1 = yes) */
	mouseEnabled: new Uint8Array(DEFAULT_CAPACITY),
	/** Keyboard scrolling enabled (1 = yes) */
	keysEnabled: new Uint8Array(DEFAULT_CAPACITY),
};
