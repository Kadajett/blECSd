/**
 * Tabs Widget State
 *
 * State management for tabs widgets including component definition.
 *
 * @module widgets/tabs/state
 */

import { createComponentStore } from '../../utils/componentStorage';
import type { TabData } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * Tabs component marker for identifying tabs entities.
 */
export const Tabs = {
	/** Tag indicating this is a tabs widget (1 = yes) */
	isTabs: new Uint8Array(DEFAULT_CAPACITY),
	/** Active tab index */
	activeTab: new Uint16Array(DEFAULT_CAPACITY),
	/** Tab position (0 = top, 1 = bottom) */
	position: new Uint8Array(DEFAULT_CAPACITY),
	/** Number of tabs */
	tabCount: new Uint16Array(DEFAULT_CAPACITY),
};

/**
 * Store for tab data (arrays can't be stored in typed arrays).
 * Uses iterable ComponentStore backed by PackedStore for cache-friendly
 * dense iteration when rendering all tab entities.
 */
export const tabDataStore = createComponentStore<TabData[]>({ iterable: true });
