/**
 * State management for Conversation widget.
 * @module widgets/conversation/state
 */

import type { Entity } from '../../core/types';
import type {
	ConversationConfig,
	ConversationInternalState,
	ConversationMessage,
	ConversationState,
	MessageRole,
	MutableConversationMessage,
} from './types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Conversation component marker.
 */
export const Conversation = {
	/** Tag indicating this is a conversation widget (1 = yes) */
	isConversation: new Uint8Array(DEFAULT_CAPACITY),
	/** Show timestamps (1 = yes) */
	showTimestamps: new Uint8Array(DEFAULT_CAPACITY),
	/** Show role indicator (1 = yes) */
	showRoleIndicator: new Uint8Array(DEFAULT_CAPACITY),
};

/** Map of entity to conversation state */
export const conversationStateMap = new Map<Entity, ConversationInternalState>();

/**
 * Creates initial conversation state.
 *
 * @param config - Optional configuration
 * @returns A new conversation state
 *
 * @example
 * ```typescript
 * const state = createConversationState({ viewportHeight: 20 });
 * ```
 */
export function createConversationState(
	config?: Partial<Pick<ConversationConfig, 'height' | 'maxMessages' | 'wrapWidth'>>,
): ConversationState {
	return {
		messages: [],
		scrollTop: 0,
		viewportHeight: config?.height ?? 10,
		searchQuery: '',
		searchResults: [],
		selectedSearchIndex: -1,
	};
}

/**
 * Adds a message to the conversation state.
 *
 * @param state - Current state
 * @param role - Message role
 * @param content - Message content
 * @param id - Optional message ID (auto-generated if not provided)
 * @returns New state with the added message
 *
 * @example
 * ```typescript
 * const newState = addMessage(state, 'user', 'Hello world');
 * ```
 */
export function addMessage(
	state: ConversationState,
	role: MessageRole,
	content: string,
	id?: string,
): ConversationState {
	const message: ConversationMessage = {
		id: id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
		role,
		content,
		timestamp: Date.now(),
		collapsed: false,
		streaming: false,
	};

	return {
		...state,
		messages: [...state.messages, message],
	};
}

/**
 * Appends text to a specific message.
 *
 * @param state - Current state
 * @param messageId - ID of the message to append to
 * @param text - Text to append
 * @returns New state with updated message
 *
 * @example
 * ```typescript
 * const newState = appendToMessage(state, 'msg-123', ' more text');
 * ```
 */
export function appendToMessage(
	state: ConversationState,
	messageId: string,
	text: string,
): ConversationState {
	const messages = state.messages.map((msg) =>
		msg.id === messageId ? { ...msg, content: msg.content + text } : msg,
	);

	return {
		...state,
		messages,
	};
}

/**
 * Starts a new streaming message.
 *
 * @param state - Current state
 * @param role - Message role
 * @param id - Optional message ID
 * @returns New state with streaming message
 *
 * @example
 * ```typescript
 * const newState = startStreamingMessage(state, 'assistant');
 * ```
 */
export function startStreamingMessage(
	state: ConversationState,
	role: MessageRole,
	id?: string,
): ConversationState {
	const message: ConversationMessage = {
		id: id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
		role,
		content: '',
		timestamp: Date.now(),
		collapsed: false,
		streaming: true,
	};

	return {
		...state,
		messages: [...state.messages, message],
	};
}

/**
 * Ends the current streaming message.
 *
 * @param state - Current state
 * @returns New state with streaming ended
 *
 * @example
 * ```typescript
 * const newState = endStreamingMessage(state);
 * ```
 */
export function endStreamingMessage(state: ConversationState): ConversationState {
	const messages = state.messages.map((msg) =>
		msg.streaming ? { ...msg, streaming: false } : msg,
	);

	return {
		...state,
		messages,
	};
}

/**
 * Collapses a message by ID.
 *
 * @param state - Current state
 * @param id - Message ID
 * @returns New state with collapsed message
 *
 * @example
 * ```typescript
 * const newState = collapseMessage(state, 'msg-123');
 * ```
 */
export function collapseMessage(state: ConversationState, id: string): ConversationState {
	const messages = state.messages.map((msg) => (msg.id === id ? { ...msg, collapsed: true } : msg));

	return {
		...state,
		messages,
	};
}

/**
 * Expands a message by ID.
 *
 * @param state - Current state
 * @param id - Message ID
 * @returns New state with expanded message
 *
 * @example
 * ```typescript
 * const newState = expandMessage(state, 'msg-123');
 * ```
 */
export function expandMessage(state: ConversationState, id: string): ConversationState {
	const messages = state.messages.map((msg) =>
		msg.id === id ? { ...msg, collapsed: false } : msg,
	);

	return {
		...state,
		messages,
	};
}

/**
 * Searches messages for a query string.
 *
 * @param state - Current state
 * @param query - Search query
 * @returns New state with search results
 *
 * @example
 * ```typescript
 * const newState = searchMessages(state, 'error');
 * ```
 */
export function searchMessages(state: ConversationState, query: string): ConversationState {
	if (!query) {
		return {
			...state,
			searchQuery: '',
			searchResults: [],
			selectedSearchIndex: -1,
		};
	}

	const lowerQuery = query.toLowerCase();
	const results: number[] = [];

	for (let i = 0; i < state.messages.length; i++) {
		const msg = state.messages[i];
		if (!msg) continue;
		if (msg.content.toLowerCase().includes(lowerQuery)) {
			results.push(i);
		}
	}

	return {
		...state,
		searchQuery: query,
		searchResults: results,
		selectedSearchIndex: results.length > 0 ? 0 : -1,
	};
}

/**
 * Gets messages visible in the current viewport.
 *
 * @param state - Current state
 * @returns Messages in the viewport
 *
 * @example
 * ```typescript
 * const visible = getVisibleMessages(state);
 * ```
 */
export function getVisibleMessages(state: ConversationState): readonly ConversationMessage[] {
	const endIndex = Math.min(state.scrollTop + state.viewportHeight, state.messages.length);
	return state.messages.slice(state.scrollTop, endIndex);
}

/**
 * Formats a timestamp for display.
 * @internal
 */
export function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	return `${hours}:${minutes}:${seconds}`;
}

/**
 * Gets role display name.
 * @internal
 */
export function getRoleName(role: MessageRole): string {
	return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Wraps text to a maximum width.
 * @internal
 */
export function wrapText(text: string, maxWidth: number): string[] {
	if (!text) return [];

	const lines: string[] = [];
	const paragraphs = text.split('\n');

	for (const paragraph of paragraphs) {
		if (paragraph.length <= maxWidth) {
			lines.push(paragraph);
			continue;
		}

		const words = paragraph.split(' ');
		let currentLine = '';

		for (const word of words) {
			if (!currentLine) {
				currentLine = word;
			} else if (currentLine.length + 1 + word.length <= maxWidth) {
				currentLine += ` ${word}`;
			} else {
				lines.push(currentLine);
				currentLine = word;
			}
		}

		if (currentLine) {
			lines.push(currentLine);
		}
	}

	return lines;
}

/**
 * Builds the message header text.
 * @internal
 */
export function buildMessageHeader(
	role: MessageRole,
	timestamp: number,
	showRoleIndicator: boolean,
	showTimestamps: boolean,
): string {
	let header = '';
	if (showRoleIndicator) {
		header = getRoleName(role);
	}
	if (showTimestamps) {
		const time = formatTimestamp(timestamp);
		header = header ? `${header} ─ ${time}` : time;
	}
	return header;
}

/**
 * Builds the top border line with header.
 * @internal
 */
export function buildTopBorder(header: string, innerWidth: number): string {
	if (!header) {
		return `┌${'─'.repeat(innerWidth + 2)}┐`;
	}

	const headerPadding = Math.max(0, innerWidth - header.length);
	const leftPadding = '─'.repeat(Math.floor(headerPadding / 2));
	const rightPadding = '─'.repeat(Math.ceil(headerPadding / 2));
	return `┌ ${leftPadding}${header}${rightPadding} ┐`;
}

/**
 * Formats a collapsed message's content lines.
 * @internal
 */
export function formatCollapsedContent(content: string, innerWidth: number): string[] {
	const lines: string[] = [];
	const contentLines = wrapText(content, innerWidth);
	const preview = contentLines[0] ?? '';
	lines.push(`│ ${preview.padEnd(innerWidth)} │`);

	const hiddenCount = Math.max(0, contentLines.length - 1);
	if (hiddenCount > 0) {
		const collapsedText = `[collapsed: ${hiddenCount} more line${hiddenCount > 1 ? 's' : ''}]`;
		lines.push(`│ ${collapsedText.padEnd(innerWidth)} │`);
	}
	return lines;
}

/**
 * Formats an expanded message's content lines.
 * @internal
 */
export function formatExpandedContent(
	content: string,
	innerWidth: number,
	streaming: boolean,
): string[] {
	const lines: string[] = [];
	const contentLines = wrapText(content, innerWidth);

	for (const line of contentLines) {
		lines.push(`│ ${line.padEnd(innerWidth)} │`);
	}

	if (streaming) {
		const streamingText = '[streaming...]';
		lines.push(`│ ${streamingText.padEnd(innerWidth)} │`);
	}

	return lines;
}

/**
 * Formats a single message for display.
 * @internal
 */
export function formatMessage(
	msg: ConversationMessage | MutableConversationMessage,
	innerWidth: number,
	showRoleIndicator: boolean,
	showTimestamps: boolean,
): string[] {
	const lines: string[] = [];

	// Build and add header
	const header = buildMessageHeader(msg.role, msg.timestamp, showRoleIndicator, showTimestamps);
	lines.push(buildTopBorder(header, innerWidth));

	// Add content
	const contentLines = msg.collapsed
		? formatCollapsedContent(msg.content, innerWidth)
		: formatExpandedContent(msg.content, innerWidth, msg.streaming);
	lines.push(...contentLines);

	// Add bottom border
	lines.push(`└${'─'.repeat(innerWidth + 2)}┘`);
	lines.push(''); // Empty line between messages

	return lines;
}

/**
 * Formats conversation for display.
 *
 * @param state - Current state
 * @param config - Display configuration
 * @returns Array of formatted lines
 *
 * @example
 * ```typescript
 * const lines = formatConversationDisplay(state, {
 *   showTimestamps: true,
 *   showRoleIndicator: true,
 *   wrapWidth: 36,
 * });
 * ```
 */
export function formatConversationDisplay(
	state: ConversationState,
	config: {
		showTimestamps: boolean;
		showRoleIndicator: boolean;
		wrapWidth: number;
	},
): string[] {
	const lines: string[] = [];
	const innerWidth = config.wrapWidth - 4; // Account for "│ " prefix and " │" suffix

	for (const msg of state.messages) {
		const messageLines = formatMessage(
			msg,
			innerWidth,
			config.showRoleIndicator,
			config.showTimestamps,
		);
		lines.push(...messageLines);
	}

	return lines;
}

/**
 * Resets the Conversation component store. Useful for testing.
 * @internal
 */
export function resetConversationStore(): void {
	Conversation.isConversation.fill(0);
	Conversation.showTimestamps.fill(0);
	Conversation.showRoleIndicator.fill(0);
	conversationStateMap.clear();
}
