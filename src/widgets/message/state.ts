/**
 * Message Widget State
 *
 * State management for message widgets including component definition.
 *
 * @module widgets/message/state
 */

import type { Entity } from '../../core/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * Message component marker for identifying message widget entities.
 */
export const Message = {
	/** Tag indicating this is a message widget (1 = yes) */
	isMessage: new Uint8Array(DEFAULT_CAPACITY),
	/** Dismiss on click enabled (1 = yes) */
	dismissOnClick: new Uint8Array(DEFAULT_CAPACITY),
	/** Dismiss on key enabled (1 = yes) */
	dismissOnKey: new Uint8Array(DEFAULT_CAPACITY),
	/** Message has been dismissed (1 = yes) */
	dismissed: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * Message state stored outside ECS for complex data.
 * @internal
 */
export interface MessageState {
	/** Message content text */
	content: string;
	/** Dismiss callback */
	onDismissCallback?: () => void;
	/** Timer ID for auto-dismiss */
	timerId?: ReturnType<typeof setTimeout> | undefined;
}

/** Map of entity to message state */
export const messageStateMap = new Map<Entity, MessageState>();
