/**
 * Layout Widget State
 *
 * @module widgets/layout/state
 */

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Layout component marker for identifying layout entities.
 */
export const Layout = {
	/** Tag indicating this is a layout widget (1 = yes) */
	isLayout: new Uint8Array(DEFAULT_CAPACITY),
	/** Layout mode (0=inline, 1=grid, 2=flex) */
	mode: new Uint8Array(DEFAULT_CAPACITY),
	/** Gap between children */
	gap: new Float32Array(DEFAULT_CAPACITY),
	/** Wrap enabled (0=no, 1=yes) */
	wrap: new Uint8Array(DEFAULT_CAPACITY),
	/** Justify content (0=start, 1=center, 2=end, 3=space-between) */
	justify: new Uint8Array(DEFAULT_CAPACITY),
	/** Align items (0=start, 1=center, 2=end) */
	align: new Uint8Array(DEFAULT_CAPACITY),
	/** Grid columns */
	cols: new Uint8Array(DEFAULT_CAPACITY),
	/** Flex direction (0=row, 1=column) */
	direction: new Uint8Array(DEFAULT_CAPACITY),
};
