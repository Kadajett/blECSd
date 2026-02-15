/**
 * Factory function for creating Conversation widgets.
 * @module widgets/conversation/factory
 */

import { setDimensions } from '../../components/dimensions';
import { setPosition } from '../../components/position';
import { setStyle } from '../../components/renderable';
import { addEntity, removeEntity } from '../../core/ecs';
import type { World } from '../../core/types';
import { parseColor } from '../../utils/color';
import { ConversationConfigSchema } from './config';
import { updateConversationContent } from './render';
import { Conversation, conversationStateMap, formatConversationDisplay } from './state';
import type {
	ConversationConfig,
	ConversationMessage,
	ConversationWidget,
	MessageRole,
} from './types';

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

		getState() {
			const state = conversationStateMap.get(eid);
			if (!state) {
				return {
					messages: [],
					scrollTop: 0,
					viewportHeight: 10,
					searchQuery: '',
					searchResults: [],
					selectedSearchIndex: -1,
				};
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
