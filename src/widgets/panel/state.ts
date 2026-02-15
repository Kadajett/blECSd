/**
 * Panel Widget State
 *
 * State management for panel widgets including component definition,
 * stores, and state manipulation functions.
 *
 * @module widgets/panel/state
 */

import type { Entity } from '../../core/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Default panel title */
export const DEFAULT_PANEL_TITLE = '';

/** Close button character */
export const CLOSE_BUTTON_CHAR = '✕';

/** Collapse button character (when expanded) */
export const COLLAPSE_CHAR = '▼';

/** Expand button character (when collapsed) */
export const EXPAND_CHAR = '▶';

// =============================================================================
// COMPONENT DEFINITION
// =============================================================================

/**
 * Panel component marker for identifying panel entities.
 */
export const Panel = {
	/** Tag indicating this is a panel widget (1 = yes) */
	isPanel: new Uint8Array(DEFAULT_CAPACITY),
	/** Collapsed state (0 = expanded, 1 = collapsed) */
	collapsed: new Uint8Array(DEFAULT_CAPACITY),
	/** Closable flag (0 = no, 1 = yes) */
	closable: new Uint8Array(DEFAULT_CAPACITY),
	/** Collapsible flag (0 = no, 1 = yes) */
	collapsible: new Uint8Array(DEFAULT_CAPACITY),
	/** Original height (before collapse) */
	originalHeight: new Float32Array(DEFAULT_CAPACITY),
	/** Title alignment (0 = left, 1 = center, 2 = right) */
	titleAlign: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Store for panel titles (strings can't be stored in typed arrays).
 */
export const titleStore = new Map<Entity, string>();

/**
 * Store for panel content (strings can't be stored in typed arrays).
 */
export const contentStore = new Map<Entity, string>();

// =============================================================================
// STATE MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Resets the Panel component store. Useful for testing.
 * @internal
 */
export function resetPanelStore(): void {
	Panel.isPanel.fill(0);
	Panel.collapsed.fill(0);
	Panel.closable.fill(0);
	Panel.collapsible.fill(0);
	Panel.originalHeight.fill(0);
	Panel.titleAlign.fill(0);
	titleStore.clear();
	contentStore.clear();
}
