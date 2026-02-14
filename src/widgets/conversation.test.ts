/**
 * Tests for Conversation widget.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getContent } from '../components/content';
import { getDimensions } from '../components/dimensions';
import { getPosition } from '../components/position';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	addMessage,
	appendToMessage,
	Conversation,
	ConversationConfigSchema,
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
} from './conversation';

describe('Conversation widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetConversationStore();
	});

	afterEach(() => {
		resetConversationStore();
	});

	describe('ConversationConfigSchema', () => {
		it('validates empty config', () => {
			const result = ConversationConfigSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it('validates position values', () => {
			const result = ConversationConfigSchema.safeParse({
				x: 10,
				y: 20,
			});
			expect(result.success).toBe(true);
		});

		it('validates dimensions', () => {
			const result = ConversationConfigSchema.safeParse({
				width: 50,
				height: 20,
			});
			expect(result.success).toBe(true);
		});

		it('rejects negative dimensions', () => {
			const result = ConversationConfigSchema.safeParse({
				width: -1,
				height: -1,
			});
			expect(result.success).toBe(false);
		});

		it('validates boolean flags', () => {
			const result = ConversationConfigSchema.safeParse({
				showTimestamps: true,
				showRoleIndicator: false,
			});
			expect(result.success).toBe(true);
		});

		it('validates maxMessages', () => {
			const result = ConversationConfigSchema.safeParse({
				maxMessages: 500,
			});
			expect(result.success).toBe(true);
		});

		it('validates role colors', () => {
			const result = ConversationConfigSchema.safeParse({
				roleColors: {
					user: '#0088ff',
					assistant: '#00ff88',
					system: 0xff808080,
				},
			});
			expect(result.success).toBe(true);
		});
	});

	describe('createConversationState', () => {
		it('creates default state', () => {
			const state = createConversationState();
			expect(state.messages).toEqual([]);
			expect(state.scrollTop).toBe(0);
			expect(state.viewportHeight).toBe(10);
			expect(state.searchQuery).toBe('');
			expect(state.searchResults).toEqual([]);
			expect(state.selectedSearchIndex).toBe(-1);
		});

		it('creates state with custom viewport height', () => {
			const state = createConversationState({ height: 25 });
			expect(state.viewportHeight).toBe(25);
		});
	});

	describe('addMessage', () => {
		it('adds a message to state', () => {
			const state = createConversationState();
			const newState = addMessage(state, 'user', 'Hello');

			expect(newState.messages).toHaveLength(1);
			expect(newState.messages[0]?.role).toBe('user');
			expect(newState.messages[0]?.content).toBe('Hello');
			expect(newState.messages[0]?.streaming).toBe(false);
			expect(newState.messages[0]?.collapsed).toBe(false);
		});

		it('uses provided message ID', () => {
			const state = createConversationState();
			const newState = addMessage(state, 'assistant', 'Hi', 'custom-id');

			expect(newState.messages[0]?.id).toBe('custom-id');
		});

		it('generates message ID if not provided', () => {
			const state = createConversationState();
			const newState = addMessage(state, 'system', 'Notice');

			expect(newState.messages[0]?.id).toMatch(/^msg-/);
		});

		it('preserves existing messages', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'First');
			state = addMessage(state, 'assistant', 'Second');

			expect(state.messages).toHaveLength(2);
			expect(state.messages[0]?.content).toBe('First');
			expect(state.messages[1]?.content).toBe('Second');
		});
	});

	describe('appendToMessage', () => {
		it('appends text to a message', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Hello', 'msg-1');
			state = appendToMessage(state, 'msg-1', ' world');

			expect(state.messages[0]?.content).toBe('Hello world');
		});

		it('does nothing if message not found', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Hello', 'msg-1');
			const newState = appendToMessage(state, 'nonexistent', ' world');

			expect(newState.messages[0]?.content).toBe('Hello');
		});
	});

	describe('startStreamingMessage', () => {
		it('creates a streaming message', () => {
			const state = createConversationState();
			const newState = startStreamingMessage(state, 'assistant');

			expect(newState.messages).toHaveLength(1);
			expect(newState.messages[0]?.streaming).toBe(true);
			expect(newState.messages[0]?.content).toBe('');
		});

		it('uses provided message ID', () => {
			const state = createConversationState();
			const newState = startStreamingMessage(state, 'assistant', 'stream-1');

			expect(newState.messages[0]?.id).toBe('stream-1');
		});
	});

	describe('endStreamingMessage', () => {
		it('ends all streaming messages', () => {
			let state = createConversationState();
			state = startStreamingMessage(state, 'assistant');
			state = endStreamingMessage(state);

			expect(state.messages[0]?.streaming).toBe(false);
		});

		it('handles state with no streaming messages', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Hello');
			state = endStreamingMessage(state);

			expect(state.messages[0]?.streaming).toBe(false);
		});
	});

	describe('collapseMessage and expandMessage', () => {
		it('collapses a message by ID', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Long message', 'msg-1');
			state = collapseMessage(state, 'msg-1');

			expect(state.messages[0]?.collapsed).toBe(true);
		});

		it('expands a collapsed message', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Long message', 'msg-1');
			state = collapseMessage(state, 'msg-1');
			state = expandMessage(state, 'msg-1');

			expect(state.messages[0]?.collapsed).toBe(false);
		});

		it('handles nonexistent message ID', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Message', 'msg-1');
			state = collapseMessage(state, 'nonexistent');

			expect(state.messages[0]?.collapsed).toBe(false);
		});
	});

	describe('searchMessages', () => {
		it('finds messages matching query', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Hello world');
			state = addMessage(state, 'assistant', 'How are you?');
			state = addMessage(state, 'user', 'Hello again');
			state = searchMessages(state, 'hello');

			expect(state.searchResults).toEqual([0, 2]);
			expect(state.searchQuery).toBe('hello');
			expect(state.selectedSearchIndex).toBe(0);
		});

		it('is case-insensitive', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'HELLO World');
			state = searchMessages(state, 'hello');

			expect(state.searchResults).toEqual([0]);
		});

		it('clears search when query is empty', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Hello');
			state = searchMessages(state, 'hello');
			state = searchMessages(state, '');

			expect(state.searchResults).toEqual([]);
			expect(state.searchQuery).toBe('');
			expect(state.selectedSearchIndex).toBe(-1);
		});

		it('handles no matches', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Hello');
			state = searchMessages(state, 'goodbye');

			expect(state.searchResults).toEqual([]);
			expect(state.selectedSearchIndex).toBe(-1);
		});
	});

	describe('getVisibleMessages', () => {
		it('returns messages in viewport', () => {
			let state = createConversationState({ height: 2 });
			state = addMessage(state, 'user', 'Message 1');
			state = addMessage(state, 'user', 'Message 2');
			state = addMessage(state, 'user', 'Message 3');

			const visible = getVisibleMessages(state);
			expect(visible).toHaveLength(2);
			expect(visible[0]?.content).toBe('Message 1');
			expect(visible[1]?.content).toBe('Message 2');
		});

		it('handles scrollTop offset', () => {
			let state = createConversationState({ height: 2 });
			state = addMessage(state, 'user', 'Message 1');
			state = addMessage(state, 'user', 'Message 2');
			state = addMessage(state, 'user', 'Message 3');
			state = { ...state, scrollTop: 1 };

			const visible = getVisibleMessages(state);
			expect(visible).toHaveLength(2);
			expect(visible[0]?.content).toBe('Message 2');
			expect(visible[1]?.content).toBe('Message 3');
		});
	});

	describe('formatConversationDisplay', () => {
		it('formats messages with role and timestamp', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Hello');

			const lines = formatConversationDisplay(state, {
				showTimestamps: true,
				showRoleIndicator: true,
				wrapWidth: 40,
			});

			expect(lines.length).toBeGreaterThan(0);
			expect(lines.some((line) => line.includes('User'))).toBe(true);
			expect(lines.some((line) => line.includes('Hello'))).toBe(true);
		});

		it('wraps long content', () => {
			let state = createConversationState();
			const longMessage = 'This is a very long message that should wrap across multiple lines';
			state = addMessage(state, 'user', longMessage);

			const lines = formatConversationDisplay(state, {
				showTimestamps: false,
				showRoleIndicator: true,
				wrapWidth: 20,
			});

			const contentLines = lines.filter((line) => line.includes('This is'));
			expect(contentLines.length).toBeGreaterThan(0);
		});

		it('shows collapsed indicator', () => {
			let state = createConversationState();
			const multiLine = 'Line 1\nLine 2\nLine 3\nLine 4';
			state = addMessage(state, 'user', multiLine, 'msg-1');
			state = collapseMessage(state, 'msg-1');

			const lines = formatConversationDisplay(state, {
				showTimestamps: false,
				showRoleIndicator: true,
				wrapWidth: 40,
			});

			expect(lines.some((line) => line.includes('collapsed'))).toBe(true);
		});

		it('shows streaming indicator', () => {
			let state = createConversationState();
			state = startStreamingMessage(state, 'assistant');

			const lines = formatConversationDisplay(state, {
				showTimestamps: false,
				showRoleIndicator: true,
				wrapWidth: 40,
			});

			expect(lines.some((line) => line.includes('streaming'))).toBe(true);
		});

		it('respects showTimestamps flag', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Hello');

			const withTimestamps = formatConversationDisplay(state, {
				showTimestamps: true,
				showRoleIndicator: true,
				wrapWidth: 40,
			});

			const withoutTimestamps = formatConversationDisplay(state, {
				showTimestamps: false,
				showRoleIndicator: true,
				wrapWidth: 40,
			});

			const hasTime = (lines: string[]) => lines.some((line) => line.match(/\d{2}:\d{2}:\d{2}/));

			expect(hasTime(withTimestamps)).toBe(true);
			expect(hasTime(withoutTimestamps)).toBe(false);
		});

		it('respects showRoleIndicator flag', () => {
			let state = createConversationState();
			state = addMessage(state, 'user', 'Hello');

			const withRole = formatConversationDisplay(state, {
				showTimestamps: false,
				showRoleIndicator: true,
				wrapWidth: 40,
			});

			const withoutRole = formatConversationDisplay(state, {
				showTimestamps: false,
				showRoleIndicator: false,
				wrapWidth: 40,
			});

			expect(withRole.some((line) => line.includes('User'))).toBe(true);
			expect(withoutRole.some((line) => line.includes('User'))).toBe(false);
		});
	});

	describe('createConversation', () => {
		it('creates conversation with default config', () => {
			const widget = createConversation(world);
			expect(widget.eid).toBeGreaterThanOrEqual(0);
		});

		it('sets position correctly', () => {
			const widget = createConversation(world, { x: 10, y: 5 });
			const pos = getPosition(world, widget.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('sets dimensions correctly', () => {
			const widget = createConversation(world, { width: 50, height: 20 });
			const dims = getDimensions(world, widget.eid);
			expect(dims?.width).toBe(50);
			expect(dims?.height).toBe(20);
		});

		it('marks entity as conversation', () => {
			const widget = createConversation(world);
			expect(isConversation(world, widget.eid)).toBe(true);
		});

		it('sets component flags', () => {
			const widget = createConversation(world, {
				showTimestamps: true,
				showRoleIndicator: false,
			});

			expect(Conversation.showTimestamps[widget.eid]).toBe(1);
			expect(Conversation.showRoleIndicator[widget.eid]).toBe(0);
		});

		it('initializes with empty content', () => {
			const widget = createConversation(world);
			const content = getContent(world, widget.eid);
			expect(content).toBeDefined();
		});
	});

	describe('ConversationWidget methods', () => {
		it('addMessage adds messages', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'Hello');
			widget.addMessage('assistant', 'Hi there');

			const messages = widget.getMessages();
			expect(messages).toHaveLength(2);
			expect(messages[0]?.content).toBe('Hello');
			expect(messages[1]?.content).toBe('Hi there');
		});

		it('addMessage enforces maxMessages limit', () => {
			const widget = createConversation(world, { maxMessages: 3 });
			widget.addMessage('user', 'Message 1');
			widget.addMessage('user', 'Message 2');
			widget.addMessage('user', 'Message 3');
			widget.addMessage('user', 'Message 4');

			const messages = widget.getMessages();
			expect(messages).toHaveLength(3);
			expect(messages[0]?.content).toBe('Message 2');
			expect(messages[2]?.content).toBe('Message 4');
		});

		it('appendToLast appends to last message', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'Hello');
			widget.appendToLast(' world');

			const messages = widget.getMessages();
			expect(messages[0]?.content).toBe('Hello world');
		});

		it('appendToLast does nothing if no messages', () => {
			const widget = createConversation(world);
			widget.appendToLast('text');

			const messages = widget.getMessages();
			expect(messages).toHaveLength(0);
		});

		it('startStreaming creates streaming message', () => {
			const widget = createConversation(world);
			widget.startStreaming('assistant');

			const messages = widget.getMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0]?.streaming).toBe(true);
			expect(messages[0]?.content).toBe('');
		});

		it('endStreaming ends streaming', () => {
			const widget = createConversation(world);
			widget.startStreaming('assistant');
			widget.appendToLast('Hello');
			widget.endStreaming();

			const messages = widget.getMessages();
			expect(messages[0]?.streaming).toBe(false);
			expect(messages[0]?.content).toBe('Hello');
		});

		it('collapseMessage and expandMessage work', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'Long message', 'msg-1');

			widget.collapseMessage('msg-1');
			expect(widget.getMessages()[0]?.collapsed).toBe(true);

			widget.expandMessage('msg-1');
			expect(widget.getMessages()[0]?.collapsed).toBe(false);
		});

		it('search finds messages', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'Hello world');
			widget.addMessage('assistant', 'Hi there');
			widget.addMessage('user', 'Hello again');

			widget.search('hello');
			const state = widget.getState();
			expect(state.searchResults).toEqual([0, 2]);
		});

		it('nextSearchResult cycles through results', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'test');
			widget.addMessage('user', 'test');
			widget.search('test');

			const state1 = widget.getState();
			expect(state1.selectedSearchIndex).toBe(0);

			widget.nextSearchResult();
			const state2 = widget.getState();
			expect(state2.selectedSearchIndex).toBe(1);

			widget.nextSearchResult();
			const state3 = widget.getState();
			expect(state3.selectedSearchIndex).toBe(0); // Wraps around
		});

		it('prevSearchResult cycles backwards', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'test');
			widget.addMessage('user', 'test');
			widget.search('test');

			widget.prevSearchResult();
			const state = widget.getState();
			expect(state.selectedSearchIndex).toBe(1); // Wraps to end
		});

		it('clearSearch clears search state', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'test');
			widget.search('test');
			widget.clearSearch();

			const state = widget.getState();
			expect(state.searchQuery).toBe('');
			expect(state.searchResults).toEqual([]);
		});

		it('getState returns current state', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'Hello');

			const state = widget.getState();
			expect(state.messages).toHaveLength(1);
			expect(state.scrollTop).toBe(0);
		});

		it('scrollTo sets scroll position', () => {
			const widget = createConversation(world);
			widget.scrollTo(10);

			const state = widget.getState();
			expect(state.scrollTop).toBe(10);
		});

		it('scrollTo does not allow negative scroll', () => {
			const widget = createConversation(world);
			widget.scrollTo(-5);

			const state = widget.getState();
			expect(state.scrollTop).toBe(0);
		});

		it('scrollToBottom scrolls to end', () => {
			const widget = createConversation(world, { height: 5 });
			// Add many messages to exceed viewport
			for (let i = 0; i < 10; i++) {
				widget.addMessage('user', `Message ${i}`);
			}

			widget.scrollToBottom();

			const state = widget.getState();
			expect(state.scrollTop).toBeGreaterThan(0);
		});

		it('clear removes all messages', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'Hello');
			widget.addMessage('assistant', 'Hi');
			widget.clear();

			const messages = widget.getMessages();
			expect(messages).toHaveLength(0);
		});

		it('destroy cleans up state', () => {
			const widget = createConversation(world);
			const { eid } = widget;

			widget.addMessage('user', 'Hello');
			widget.destroy();

			expect(isConversation(world, eid)).toBe(false);
			expect(Conversation.isConversation[eid]).toBe(0);
		});

		it('chainable methods work', () => {
			const widget = createConversation(world);

			widget
				.addMessage('user', 'Hello')
				.addMessage('assistant', 'Hi')
				.search('hello')
				.scrollToBottom();

			const messages = widget.getMessages();
			expect(messages).toHaveLength(2);
		});
	});

	describe('isConversation', () => {
		it('returns true for conversation entity', () => {
			const widget = createConversation(world);
			expect(isConversation(world, widget.eid)).toBe(true);
		});

		it('returns false for non-conversation entity', () => {
			const widget = createConversation(world);
			widget.destroy();
			expect(isConversation(world, widget.eid)).toBe(false);
		});
	});

	describe('memory efficiency', () => {
		it('handles 1000+ messages', () => {
			const widget = createConversation(world, { maxMessages: 2000 });

			for (let i = 0; i < 1500; i++) {
				widget.addMessage('user', `Message ${i}`);
			}

			const messages = widget.getMessages();
			expect(messages).toHaveLength(1500);
		});

		it('enforces maxMessages when adding many messages', () => {
			const widget = createConversation(world, { maxMessages: 100 });

			for (let i = 0; i < 200; i++) {
				widget.addMessage('user', `Message ${i}`);
			}

			const messages = widget.getMessages();
			expect(messages).toHaveLength(100);
			expect(messages[0]?.content).toBe('Message 100');
			expect(messages[99]?.content).toBe('Message 199');
		});
	});

	describe('streaming workflow', () => {
		it('supports full streaming workflow', () => {
			const widget = createConversation(world);

			widget.startStreaming('assistant');
			widget.appendToLast('Think');
			widget.appendToLast('ing');
			widget.appendToLast('...');
			widget.endStreaming();

			const messages = widget.getMessages();
			expect(messages).toHaveLength(1);
			expect(messages[0]?.content).toBe('Thinking...');
			expect(messages[0]?.streaming).toBe(false);
		});
	});

	describe('different message roles', () => {
		it('handles user messages', () => {
			const widget = createConversation(world);
			widget.addMessage('user', 'User message');

			const messages = widget.getMessages();
			expect(messages[0]?.role).toBe('user');
		});

		it('handles assistant messages', () => {
			const widget = createConversation(world);
			widget.addMessage('assistant', 'Assistant message');

			const messages = widget.getMessages();
			expect(messages[0]?.role).toBe('assistant');
		});

		it('handles system messages', () => {
			const widget = createConversation(world);
			widget.addMessage('system', 'System message');

			const messages = widget.getMessages();
			expect(messages[0]?.role).toBe('system');
		});
	});
});
