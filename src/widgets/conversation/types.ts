/**
 * Type definitions for Conversation widget.
 * @module widgets/conversation/types
 */

import type { Entity } from '../../core/types';

/**
 * Message role in a conversation.
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * A single message in a conversation thread.
 */
export interface ConversationMessage {
	/** Unique identifier for the message */
	readonly id: string;
	/** Role of the message sender */
	readonly role: MessageRole;
	/** Content of the message */
	readonly content: string;
	/** Unix timestamp (milliseconds) */
	readonly timestamp: number;
	/** Whether the message is collapsed */
	readonly collapsed: boolean;
	/** Whether the message is still being streamed */
	readonly streaming: boolean;
}

/**
 * Internal state for a conversation widget.
 */
export interface ConversationState {
	/** Array of messages */
	readonly messages: readonly ConversationMessage[];
	/** Scroll position (top line index) */
	readonly scrollTop: number;
	/** Height of the viewport */
	readonly viewportHeight: number;
	/** Current search query */
	readonly searchQuery: string;
	/** Indices of messages matching the search */
	readonly searchResults: readonly number[];
	/** Currently selected search result index */
	readonly selectedSearchIndex: number;
}

/**
 * Configuration for creating a Conversation widget.
 */
export interface ConversationConfig {
	/** X position (default: 0) */
	readonly x?: number;
	/** Y position (default: 0) */
	readonly y?: number;
	/** Width in characters (default: 40) */
	readonly width?: number;
	/** Height in lines (default: 10) */
	readonly height?: number;
	/** Show timestamps (default: true) */
	readonly showTimestamps?: boolean;
	/** Show role indicator (default: true) */
	readonly showRoleIndicator?: boolean;
	/** Maximum number of messages to keep (default: 1000) */
	readonly maxMessages?: number;
	/** Wrap width for message content (default: width - 4) */
	readonly wrapWidth?: number;
	/** Colors for each role */
	readonly roleColors?: Partial<Record<MessageRole, string | number>>;
	/** Foreground color */
	readonly fg?: string | number;
	/** Background color */
	readonly bg?: string | number;
}

/**
 * Conversation widget interface providing chainable methods.
 */
export interface ConversationWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	/** Adds a new message */
	addMessage(role: MessageRole, content: string, id?: string): ConversationWidget;

	/** Appends text to the last message (for streaming) */
	appendToLast(text: string): ConversationWidget;

	/** Starts a new streaming message */
	startStreaming(role: MessageRole, id?: string): ConversationWidget;

	/** Ends the current streaming message */
	endStreaming(): ConversationWidget;

	/** Collapses a message by ID */
	collapseMessage(id: string): ConversationWidget;

	/** Expands a message by ID */
	expandMessage(id: string): ConversationWidget;

	/** Searches messages for a query */
	search(query: string): ConversationWidget;

	/** Navigates to next search result */
	nextSearchResult(): ConversationWidget;

	/** Navigates to previous search result */
	prevSearchResult(): ConversationWidget;

	/** Clears the current search */
	clearSearch(): ConversationWidget;

	/** Gets all messages */
	getMessages(): readonly ConversationMessage[];

	/** Gets the current state */
	getState(): ConversationState;

	/** Scrolls to a specific position */
	scrollTo(position: number): ConversationWidget;

	/** Scrolls to the bottom */
	scrollToBottom(): ConversationWidget;

	/** Clears all messages */
	clear(): ConversationWidget;

	/** Destroys the widget */
	destroy(): void;
}

/**
 * Internal mutable message type.
 * @internal
 */
export interface MutableConversationMessage {
	id: string;
	role: MessageRole;
	content: string;
	timestamp: number;
	collapsed: boolean;
	streaming: boolean;
}

/**
 * Conversation state stored outside ECS.
 * @internal
 */
export interface ConversationInternalState {
	/** Messages array (mutable for internal use) */
	messages: MutableConversationMessage[];
	/** Scroll position */
	scrollTop: number;
	/** Viewport height */
	viewportHeight: number;
	/** Search query */
	searchQuery: string;
	/** Search result indices */
	searchResults: number[];
	/** Selected search result */
	selectedSearchIndex: number;
	/** Max messages to keep */
	maxMessages: number;
	/** Wrap width */
	wrapWidth: number;
	/** Role colors */
	roleColors: Record<MessageRole, number | undefined>;
}
