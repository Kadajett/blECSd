/**
 * Flexbox Widget State
 *
 * State management for flexbox widgets including component definition.
 *
 * @module widgets/flexbox/state
 */

import type { Entity } from '../../core/types';
import type { AlignItems, FlexDirection, FlexWrap, JustifyContent } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * Flexbox component marker for identifying flexbox containers.
 */
export const FlexContainer = {
	/** Tag indicating this is a flexbox container (1 = yes) */
	isFlexContainer: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * Flex child state.
 * @internal
 */
export interface FlexChildState {
	entity: Entity;
	flex: number;
	flexShrink: number;
	flexBasis: number | 'auto';
	alignSelf: AlignItems | undefined;
}

/**
 * Flex container state.
 * @internal
 */
export interface FlexContainerState {
	direction: FlexDirection;
	justifyContent: JustifyContent;
	alignItems: AlignItems;
	gap: number;
	wrap: FlexWrap;
	children: FlexChildState[];
}

/**
 * Flex container state map.
 * @internal
 */
export const flexContainerStateMap = new Map<Entity, FlexContainerState>();
