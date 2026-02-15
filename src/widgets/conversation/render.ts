/**
 * Rendering logic for Conversation widget.
 * @module widgets/conversation/render
 */

import { setContent } from '../../components/content';
import { getDimensions } from '../../components/dimensions';
import { markDirty } from '../../components/renderable';
import type { Entity, World } from '../../core/types';
import { Conversation, conversationStateMap, formatConversationDisplay } from './state';

/**
 * Updates the conversation content.
 * @internal
 */
export function updateConversationContent(world: World, eid: Entity): void {
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
