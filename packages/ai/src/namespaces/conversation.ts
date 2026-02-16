/**
 * Conversation namespace for rendering conversation threads.
 *
 * @example
 * ```typescript
 * import { conversation } from '@blecsd/ai';
 *
 * const conv = conversation.createConversation(world, { width: 80, height: 30 });
 * conversation.addMessage({ role: 'user', content: 'Hello!' });
 * conversation.startStreamingMessage({ role: 'assistant', content: '' });
 * conversation.appendToMessage(msgId, 'Hi there!');
 * conversation.endStreamingMessage(msgId);
 * ```
 */

import {
	addMessage,
	appendToMessage,
	collapseMessage,
	createConversation,
	createConversationState,
	endStreamingMessage,
	expandMessage,
	formatConversationDisplay,
	getVisibleMessages,
	isConversation,
	resetConversationStore,
	searchMessages,
	startStreamingMessage,
} from '../widgets/conversation';

export const conversation = Object.freeze({
	createConversation,
	isConversation,
	createConversationState,
	addMessage,
	startStreamingMessage,
	appendToMessage,
	endStreamingMessage,
	collapseMessage,
	expandMessage,
	getVisibleMessages,
	searchMessages,
	formatConversationDisplay,
	resetConversationStore,
});

export type ConversationModule = typeof conversation;
