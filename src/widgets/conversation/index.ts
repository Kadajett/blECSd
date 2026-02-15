/**
 * Conversation Widget
 *
 * A widget for rendering conversation threads with user/assistant/system
 * message turns, supporting streaming, collapsing, and search functionality.
 *
 * @module widgets/conversation
 */

import type { Entity, World } from '../../core/types';

// Re-export schema
export { ConversationConfigSchema } from './config';
// Re-export factory
export { createConversation } from './factory';
// Re-export state management
// Re-export component (for advanced use cases)
export {
	addMessage,
	appendToMessage,
	Conversation,
	collapseMessage,
	createConversationState,
	endStreamingMessage,
	expandMessage,
	formatConversationDisplay,
	getVisibleMessages,
	searchMessages,
	startStreamingMessage,
} from './state';
// Re-export types
export type {
	ConversationConfig,
	ConversationMessage,
	ConversationState,
	ConversationWidget,
	MessageRole,
} from './types';

// Import for utility functions
import { Conversation } from './state';

/**
 * Checks if an entity is a conversation widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - The entity ID
 * @returns true if the entity is a conversation widget
 */
export function isConversation(_world: World, eid: Entity): boolean {
	return Conversation.isConversation[eid] === 1;
}

/**
 * Resets the Conversation component store. Useful for testing.
 * @internal
 */
export { resetConversationStore } from './state';
