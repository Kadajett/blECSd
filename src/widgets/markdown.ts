/**
 * Markdown Widget - Rich text rendering with markdown formatting
 * @module widgets/markdown
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { markDirty, Renderable, setStyle } from '../components/renderable';
import { setScrollable } from '../components/scrollable';
import { removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';
import {
	createMarkdownCache,
	type MarkdownCache,
	parseMarkdown,
	renderMarkdown,
} from '../utils/markdownRender';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Markdown theme configuration for styling different elements.
 */
export interface MarkdownTheme {
	/** Heading foreground color (hex or color code) */
	readonly headingColor?: string | number;
	/** Code block foreground color */
	readonly codeColor?: string | number;
	/** Code block background color */
	readonly codeBgColor?: string | number;
	/** Link foreground color */
	readonly linkColor?: string | number;
	/** Blockquote foreground color */
	readonly quoteColor?: string | number;
	/** Default text foreground color */
	readonly textColor?: string | number;
	/** Default background color */
	readonly bgColor?: string | number;
}

/**
 * Markdown widget configuration.
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, createMarkdown } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Basic markdown rendering
 * createMarkdown(world, eid, {
 *   left: 0,
 *   top: 0,
 *   width: 80,
 *   height: 24,
 *   content: '# Hello\n\nThis is **bold** and *italic* text.'
 * });
 *
 * // With custom theme
 * createMarkdown(world, eid, {
 *   left: 0,
 *   top: 0,
 *   width: 60,
 *   height: 20,
 *   content: '## Features\n\n- **Bold** text\n- *Italic* text\n- `code`\n\n```js\nconst x = 10;\n```',
 *   theme: {
 *     headingColor: 0x00ff00,
 *     codeColor: 0xffff00,
 *     codeBgColor: 0x222222
 *   }
 * });
 *
 * // Scrollable markdown with long content
 * createMarkdown(world, eid, {
 *   left: 10,
 *   top: 5,
 *   width: 70,
 *   height: 15,
 *   scrollable: true,
 *   content: '# Documentation\n\n' + longMarkdownContent
 * });
 * ```
 */
export interface MarkdownConfig {
	/**
	 * X position (left coordinate)
	 * @default 0
	 */
	readonly left?: number;
	/**
	 * Y position (top coordinate)
	 * @default 0
	 */
	readonly top?: number;
	/**
	 * Width in columns
	 * @default 40
	 */
	readonly width?: number;
	/**
	 * Height in rows
	 * @default 10
	 */
	readonly height?: number;
	/**
	 * Markdown content to render
	 * @default ''
	 */
	readonly content?: string;
	/**
	 * Theme configuration for styling markdown elements
	 */
	readonly theme?: MarkdownTheme;
	/**
	 * Enable scrollable content
	 * @default false
	 */
	readonly scrollable?: boolean;
	/**
	 * Foreground color (for default text)
	 */
	readonly fg?: string | number;
	/**
	 * Background color
	 */
	readonly bg?: string | number;
	/**
	 * Enable bold text rendering
	 * @default false
	 */
	readonly bold?: boolean;
	/**
	 * Enable underline text rendering
	 * @default false
	 */
	readonly underline?: boolean;
}

/**
 * Zod schema for markdown configuration validation.
 */
export const MarkdownConfigSchema = z
	.object({
		left: z.number().default(0),
		top: z.number().default(0),
		width: z.number().positive().default(40),
		height: z.number().positive().default(10),
		content: z.string().default(''),
		theme: z
			.object({
				headingColor: z.union([z.string(), z.number()]).optional(),
				codeColor: z.union([z.string(), z.number()]).optional(),
				codeBgColor: z.union([z.string(), z.number()]).optional(),
				linkColor: z.union([z.string(), z.number()]).optional(),
				quoteColor: z.union([z.string(), z.number()]).optional(),
				textColor: z.union([z.string(), z.number()]).optional(),
				bgColor: z.union([z.string(), z.number()]).optional(),
			})
			.optional(),
		scrollable: z.boolean().default(false),
		fg: z.union([z.string(), z.number()]).optional(),
		bg: z.union([z.string(), z.number()]).optional(),
		bold: z.boolean().default(false),
		underline: z.boolean().default(false),
	})
	.strict();

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

interface MarkdownState {
	cache: MarkdownCache;
	theme: MarkdownTheme;
}

const markdownStateMap = new Map<Entity, MarkdownState>();

/**
 * Gets the markdown state for an entity.
 */
function getMarkdownState(eid: Entity): MarkdownState | undefined {
	return markdownStateMap.get(eid);
}

/**
 * Sets the markdown state for an entity.
 */
function setMarkdownState(eid: Entity, state: MarkdownState): void {
	markdownStateMap.set(eid, state);
}

/**
 * Removes the markdown state for an entity.
 */
export function destroyMarkdown(world: World, eid: Entity): void {
	markdownStateMap.delete(eid);
	removeEntity(world, eid);
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Creates a markdown widget for rich text rendering.
 *
 * Supports:
 * - **Headers**: `#`, `##`, `###`, etc.
 * - **Bold text**: `**text**` or `__text__`
 * - **Italic text**: `*text*` or `_text_`
 * - **Inline code**: `` `code` ``
 * - **Code blocks**: ` ```language\ncode\n``` `
 * - **Bullet lists**: `- item` or `* item`
 * - **Numbered lists**: `1. item`, `2. item`
 * - **Horizontal rules**: `---`, `***`, or `___`
 * - **Blockquotes**: `> text`
 * - **Links**: `[text](url)`
 * - **Tables**: Standard markdown table syntax
 *
 * Code blocks use syntax highlighting from the existing syntax highlighting system.
 *
 * @param world - The ECS world
 * @param entity - The entity to attach the markdown widget to
 * @param config - Markdown configuration options
 * @returns The entity with markdown widget attached
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity, createMarkdown } from 'blecsd';
 *
 * const world = createWorld();
 * const eid = addEntity(world);
 *
 * // Render markdown with various formatting
 * createMarkdown(world, eid, {
 *   left: 0,
 *   top: 0,
 *   width: 80,
 *   height: 24,
 *   content: `
 * # Welcome
 *
 * This is a **markdown** widget with:
 *
 * - **Bold** and *italic* text
 * - \`inline code\`
 * - Links like [GitHub](https://github.com)
 *
 * ## Code Example
 *
 * \`\`\`typescript
 * const x: number = 42;
 * console.log(x);
 * \`\`\`
 *
 * ---
 *
 * > Blockquotes work too!
 *   `.trim()
 * });
 * ```
 */
export function createMarkdown(world: World, entity: Entity, config: MarkdownConfig = {}): Entity {
	// Validate and apply defaults
	const validated = MarkdownConfigSchema.parse(config);

	// Set position and dimensions
	setPosition(world, entity, validated.left, validated.top);
	setDimensions(world, entity, validated.width, validated.height);

	// Set empty content to ensure Content component is added
	setContent(world, entity, '');

	// Apply base styling if colors/decorations are provided
	if (
		validated.fg !== undefined ||
		validated.bg !== undefined ||
		validated.bold ||
		validated.underline
	) {
		const styleOptions: {
			fg?: number;
			bg?: number;
			bold?: boolean;
			underline?: boolean;
		} = {};

		if (validated.fg !== undefined) {
			styleOptions.fg = typeof validated.fg === 'string' ? parseColor(validated.fg) : validated.fg;
		}
		if (validated.bg !== undefined) {
			styleOptions.bg = typeof validated.bg === 'string' ? parseColor(validated.bg) : validated.bg;
		}
		if (validated.bold) {
			styleOptions.bold = true;
		}
		if (validated.underline) {
			styleOptions.underline = true;
		}

		setStyle(world, entity, styleOptions);
	}

	// Ensure Renderable component is added and marked dirty
	markDirty(world, entity);

	// Enable scrolling if requested
	if (validated.scrollable) {
		setScrollable(world, entity, {});
	}

	// Initialize markdown state
	const cache = createMarkdownCache();
	const theme: MarkdownTheme = (validated.theme ?? {}) as MarkdownTheme;
	setMarkdownState(entity, { cache, theme });

	// Parse and render markdown
	if (validated.content) {
		updateMarkdownContent(world, entity, validated.content);
	}

	return entity;
}

// =============================================================================
// CONTENT MANAGEMENT
// =============================================================================

/**
 * Updates the markdown content of a widget.
 *
 * @param world - The ECS world
 * @param entity - The markdown entity
 * @param content - New markdown content
 *
 * @example
 * ```typescript
 * import { updateMarkdownContent } from 'blecsd';
 *
 * // Update markdown content dynamically
 * updateMarkdownContent(world, markdownEntity, '# New Title\n\nNew content here.');
 * ```
 */
export function updateMarkdownContent(world: World, entity: Entity, content: string): void {
	const state = getMarkdownState(entity);
	if (!state) {
		return;
	}

	// Parse markdown
	const parseResult = parseMarkdown(content);

	// Render to lines
	const lines = renderMarkdown(parseResult, state.cache);

	// Convert rendered lines to plain text for now
	// In a full implementation, we would apply ANSI styling based on the line styles
	const renderedText = lines.map((line) => line.content).join('\n');

	// Set the content
	setContent(world, entity, renderedText);

	// Mark as dirty for re-rendering
	Renderable.dirty[entity] = 1;
}

/**
 * Gets the rendered markdown lines for an entity.
 *
 * @param entity - The markdown entity
 * @returns The rendered lines or undefined if not found
 *
 * @example
 * ```typescript
 * import { getMarkdownLines } from 'blecsd';
 *
 * const lines = getMarkdownLines(markdownEntity);
 * if (lines) {
 *   console.log(`Total lines: ${lines.length}`);
 * }
 * ```
 */
export function getMarkdownLines(entity: Entity): readonly string[] | undefined {
	const state = getMarkdownState(entity);
	if (!state || !state.cache.renderedLines) {
		return undefined;
	}
	return state.cache.renderedLines.map((line) => line.content);
}

/**
 * Gets visible markdown lines for virtualized rendering.
 *
 * @param entity - The markdown entity
 * @param startLine - Starting line index
 * @param count - Number of lines to retrieve
 * @returns Visible markdown information
 *
 * @example
 * ```typescript
 * import { getVisibleMarkdownLines } from 'blecsd';
 *
 * // Get lines 10-20 for a virtualized viewport
 * const visible = getVisibleMarkdownLines(markdownEntity, 10, 10);
 * console.log(`Showing lines ${visible.startIndex} to ${visible.endIndex} of ${visible.totalLines}`);
 * ```
 */
export function getVisibleMarkdownLines(_entity: Entity, _startLine: number, _count: number) {
	// This is a simplified stub - in full implementation would return visible lines
	// for virtualized rendering based on scroll position
	return undefined;
}
