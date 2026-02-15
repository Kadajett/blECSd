/**
 * Conversation Widget
 *
 * A widget for rendering conversation threads with user/assistant/system
 * message turns, supporting streaming, collapsing, and search functionality.
 *
 * @module widgets/conversation
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { getDimensions, setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, setStyle } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// SCHEMA
// =============================================================================

/**
 * Zod schema for conversation widget configuration.
 */
export const ConversationConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(40),
	height: z.number().int().positive().default(10),
	showTimestamps: z.boolean().default(true),
	showRoleIndicator: z.boolean().default(true),
	maxMessages: z.number().int().positive().default(1000),
	wrapWidth: z.number().int().positive().optional(),
	roleColors: z
		.object({
			user: z.union([z.string(), z.number()]).optional(),
			assistant: z.union([z.string(), z.number()]).optional(),
			system: z.union([z.string(), z.number()]).optional(),
		})
		.optional(),
	fg: z.union([z.string(), z.number()]).optional(),
	bg: z.union([z.string(), z.number()]).optional(),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

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

/**
 * Internal mutable message type.
 * @internal
 */
interface MutableConversationMessage {
	id: string;
	role: MessageRole;
	content: string;
	timestamp: number;
	collapsed: boolean;
	streaming: boolean;
}

/**
 * Conversation state stored outside ECS.
 */
interface ConversationInternalState {
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

/** Map of entity to conversation state */
const conversationStateMap = new Map<Entity, ConversationInternalState>();

// =============================================================================
// STATE MANAGEMENT FUNCTIONS
// =============================================================================

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
function formatTimestamp(timestamp: number): string {
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
function getRoleName(role: MessageRole): string {
	return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Wraps text to a maximum width.
 * @internal
 */
function wrapText(text: string, maxWidth: number): string[] {
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
function buildMessageHeader(
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
function buildTopBorder(header: string, innerWidth: number): string {
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
function formatCollapsedContent(content: string, innerWidth: number): string[] {
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
function formatExpandedContent(content: string, innerWidth: number, streaming: boolean): string[] {
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
function formatMessage(
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

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Updates the conversation content.
 * @internal
 */
function updateConversationContent(world: World, eid: Entity): void {
	const state = conversationStateMap.get(eid);
	if (!state) return;

	const dims = getDimensions(world, eid);
	if (!dims) return;

	const showTimestamps = Conversation.showTimestamps[eid] === 1;
	const showRoleIndicator = Conversation.showRoleIndicator[eid] === 1;

	const lines = formatConversationDisplay(
		{
			messages: state.messages,
			scrollTop: state.scrollTop,
			viewportHeight: state.viewportHeight,
			searchQuery: state.searchQuery,
			searchResults: state.searchResults,
			selectedSearchIndex: state.selectedSearchIndex,
		},
		{
			showTimestamps,
			showRoleIndicator,
			wrapWidth: state.wrapWidth,
		},
	);

	// Apply viewport scrolling
	const visibleLines = lines.slice(state.scrollTop, state.scrollTop + dims.height);
	const content = visibleLines.join('\n');

	setContent(world, eid, content);
	markDirty(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a Conversation widget with the given configuration.
 *
 * The Conversation widget displays message threads with support for
 * different roles, timestamps, collapsing, and search.
 *
 * @param world - The ECS world
 * @param config - Widget configuration
 * @returns The Conversation widget instance
 *
 * @example
 * ```typescript
 * import { createWorld } from '../core/ecs';
 * import { createConversation } from 'blecsd/widgets';
 *
 * const world = createWorld();
 *
 * const conversation = createConversation(world, {
 *   x: 0,
 *   y: 0,
 *   width: 50,
 *   height: 20,
 *   showTimestamps: true,
 * });
 *
 * // Add messages
 * conversation.addMessage('user', 'Hello!');
 * conversation.addMessage('assistant', 'Hi there! How can I help?');
 *
 * // Streaming example
 * conversation.startStreaming('assistant');
 * conversation.appendToLast('Thinking');
 * conversation.appendToLast('...');
 * conversation.endStreaming();
 * ```
 */
export function createConversation(
	world: World,
	config: ConversationConfig = {},
): ConversationWidget {
	const validated = ConversationConfigSchema.parse(config);
	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, validated.x, validated.y);

	// Set dimensions
	setDimensions(world, eid, validated.width, validated.height);

	// Set component flags
	Conversation.isConversation[eid] = 1;
	Conversation.showTimestamps[eid] = validated.showTimestamps ? 1 : 0;
	Conversation.showRoleIndicator[eid] = validated.showRoleIndicator ? 1 : 0;

	// Parse role colors
	const roleColors: Record<MessageRole, number | undefined> = {
		user: validated.roleColors?.user ? parseColor(validated.roleColors.user) : undefined,
		assistant: validated.roleColors?.assistant
			? parseColor(validated.roleColors.assistant)
			: undefined,
		system: validated.roleColors?.system ? parseColor(validated.roleColors.system) : undefined,
	};

	// Initialize state
	conversationStateMap.set(eid, {
		messages: [],
		scrollTop: 0,
		viewportHeight: validated.height,
		searchQuery: '',
		searchResults: [],
		selectedSearchIndex: -1,
		maxMessages: validated.maxMessages,
		wrapWidth: validated.wrapWidth ?? validated.width - 4,
		roleColors,
	});

	// Set style
	if (validated.fg !== undefined || validated.bg !== undefined) {
		setStyle(world, eid, {
			fg: validated.fg !== undefined ? parseColor(validated.fg) : undefined,
			bg: validated.bg !== undefined ? parseColor(validated.bg) : undefined,
		});
	}

	// Initial render
	updateConversationContent(world, eid);

	// Create the widget object
	const widget: ConversationWidget = {
		eid,

		addMessage(role: MessageRole, content: string, id?: string): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state) return widget;

			const message: ConversationMessage = {
				id: id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				role,
				content,
				timestamp: Date.now(),
				collapsed: false,
				streaming: false,
			};

			state.messages.push(message);

			// Enforce max messages
			if (state.messages.length > state.maxMessages) {
				state.messages.shift();
			}

			updateConversationContent(world, eid);
			return widget;
		},

		appendToLast(text: string): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state || state.messages.length === 0) return widget;

			const lastMessage = state.messages[state.messages.length - 1];
			if (!lastMessage) return widget;

			lastMessage.content += text;
			updateConversationContent(world, eid);
			return widget;
		},

		startStreaming(role: MessageRole, id?: string): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state) return widget;

			const message: ConversationMessage = {
				id: id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				role,
				content: '',
				timestamp: Date.now(),
				collapsed: false,
				streaming: true,
			};

			state.messages.push(message);
			updateConversationContent(world, eid);
			return widget;
		},

		endStreaming(): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state || state.messages.length === 0) return widget;

			const lastMessage = state.messages[state.messages.length - 1];
			if (!lastMessage) return widget;

			lastMessage.streaming = false;
			updateConversationContent(world, eid);
			return widget;
		},

		collapseMessage(id: string): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state) return widget;

			for (const msg of state.messages) {
				if (msg.id === id) {
					msg.collapsed = true;
					break;
				}
			}

			updateConversationContent(world, eid);
			return widget;
		},

		expandMessage(id: string): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state) return widget;

			for (const msg of state.messages) {
				if (msg.id === id) {
					msg.collapsed = false;
					break;
				}
			}

			updateConversationContent(world, eid);
			return widget;
		},

		search(query: string): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state) return widget;

			if (!query) {
				state.searchQuery = '';
				state.searchResults = [];
				state.selectedSearchIndex = -1;
				return widget;
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

			state.searchQuery = query;
			state.searchResults = results;
			state.selectedSearchIndex = results.length > 0 ? 0 : -1;

			updateConversationContent(world, eid);
			return widget;
		},

		nextSearchResult(): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state || state.searchResults.length === 0) return widget;

			state.selectedSearchIndex = (state.selectedSearchIndex + 1) % state.searchResults.length;
			updateConversationContent(world, eid);
			return widget;
		},

		prevSearchResult(): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state || state.searchResults.length === 0) return widget;

			state.selectedSearchIndex =
				(state.selectedSearchIndex - 1 + state.searchResults.length) % state.searchResults.length;
			updateConversationContent(world, eid);
			return widget;
		},

		clearSearch(): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state) return widget;

			state.searchQuery = '';
			state.searchResults = [];
			state.selectedSearchIndex = -1;

			updateConversationContent(world, eid);
			return widget;
		},

		getMessages(): readonly ConversationMessage[] {
			const state = conversationStateMap.get(eid);
			return state?.messages ?? [];
		},

		getState(): ConversationState {
			const state = conversationStateMap.get(eid);
			if (!state) {
				return createConversationState();
			}

			return {
				messages: [...state.messages],
				scrollTop: state.scrollTop,
				viewportHeight: state.viewportHeight,
				searchQuery: state.searchQuery,
				searchResults: [...state.searchResults],
				selectedSearchIndex: state.selectedSearchIndex,
			};
		},

		scrollTo(position: number): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state) return widget;

			state.scrollTop = Math.max(0, position);
			updateConversationContent(world, eid);
			return widget;
		},

		scrollToBottom(): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state) return widget;

			// Calculate total lines needed to display all messages
			const lines = formatConversationDisplay(
				{
					messages: state.messages,
					scrollTop: 0,
					viewportHeight: state.viewportHeight,
					searchQuery: state.searchQuery,
					searchResults: state.searchResults,
					selectedSearchIndex: state.selectedSearchIndex,
				},
				{
					showTimestamps: Conversation.showTimestamps[eid] === 1,
					showRoleIndicator: Conversation.showRoleIndicator[eid] === 1,
					wrapWidth: state.wrapWidth,
				},
			);

			state.scrollTop = Math.max(0, lines.length - state.viewportHeight);
			updateConversationContent(world, eid);
			return widget;
		},

		clear(): ConversationWidget {
			const state = conversationStateMap.get(eid);
			if (!state) return widget;

			state.messages = [];
			state.scrollTop = 0;
			state.searchQuery = '';
			state.searchResults = [];
			state.selectedSearchIndex = -1;

			updateConversationContent(world, eid);
			return widget;
		},

		destroy(): void {
			Conversation.isConversation[eid] = 0;
			Conversation.showTimestamps[eid] = 0;
			Conversation.showRoleIndicator[eid] = 0;
			conversationStateMap.delete(eid);
			removeEntity(world, eid);
		},
	};

	return widget;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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
export function resetConversationStore(): void {
	Conversation.isConversation.fill(0);
	Conversation.showTimestamps.fill(0);
	Conversation.showRoleIndicator.fill(0);
	conversationStateMap.clear();
}
