/**
 * Component definition and namespace for Streaming Markdown Widget.
 */

import type { Entity, World } from '../../core/types';
import { createStreamingMarkdown } from './factory';
import type { StreamingMarkdownState } from './types';

// WIDGET STORE

const streamingMarkdownStore = new Map<Entity, StreamingMarkdownState>();

/**
 * Resets the streaming markdown store (for testing).
 */
export function resetStreamingMarkdownStore(): void {
	streamingMarkdownStore.clear();
}

/**
 * Checks if an entity is a streaming markdown widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - Entity ID to check
 * @returns True if the entity has streaming markdown state
 */
export function isStreamingMarkdown(_world: World, eid: Entity): boolean {
	return streamingMarkdownStore.has(eid);
}

// NAMESPACE

/**
 * Streaming markdown widget namespace providing factory-style access.
 *
 * @example
 * ```typescript
 * import { StreamingMarkdown } from 'blecsd';
 *
 * const widget = StreamingMarkdown.create(world, entity, {
 *   wrapWidth: 100,
 *   syntaxHighlight: true,
 * });
 * widget.startStream();
 * widget.append('# Response\n\nHere is some **bold** text.');
 * widget.endStream();
 * ```
 */
export const StreamingMarkdown = {
	create: createStreamingMarkdown,
	is: isStreamingMarkdown,
	resetStore: resetStreamingMarkdownStore,
};

export { streamingMarkdownStore as streamingMarkdownStateStore };
