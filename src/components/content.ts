/**
 * Content component for text content storage.
 * @module components/content
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { stripAnsi } from '../utils/textWrap';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Text alignment enumeration.
 */
export enum TextAlign {
	Left = 0,
	Center = 1,
	Right = 2,
}

/**
 * Vertical alignment enumeration.
 */
export enum TextVAlign {
	Top = 0,
	Middle = 1,
	Bottom = 2,
}

// =============================================================================
// CONTENT STORE (module-level state, no class)
// =============================================================================

const contentTexts = new Map<number, string>();
let nextContentId = 1;

/**
 * Content store: functional interface for managing string content.
 * Since bitecs uses typed arrays, strings must be stored separately.
 */
export const contentStore = {
	/** Sets content for an entity and returns the content ID. */
	set(_eid: Entity, text: string): number {
		const id = nextContentId++;
		contentTexts.set(id, text);
		return id;
	},
	/** Gets content by ID. */
	get(id: number): string {
		return contentTexts.get(id) ?? '';
	},
	/** Deletes content by ID. */
	delete(id: number): void {
		contentTexts.delete(id);
	},
	/** Clears all content. */
	clear(): void {
		contentTexts.clear();
		nextContentId = 1;
	},
};

/**
 * Simple hash function for change detection.
 * Uses djb2 algorithm for fast string hashing.
 */
function hashString(str: string): number {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
	}
	return hash >>> 0; // Convert to unsigned 32-bit
}

/**
 * Content component store using SoA (Structure of Arrays) for performance.
 *
 * - `contentId`: Reference to content in ContentStore
 * - `length`: Content length in characters
 * - `hash`: Content hash for change detection
 * - `wrap`: Whether to wrap text (0=no, 1=yes)
 * - `align`: Horizontal text alignment
 * - `valign`: Vertical text alignment
 * - `parseTags`: Whether to parse markup tags (0=no, 1=yes)
 *
 * @example
 * ```typescript
 * import { Content, setContent, getContent, TextAlign } from 'blecsd';
 *
 * setContent(world, entity, 'Hello, World!', { align: TextAlign.Center });
 * const text = getContent(world, entity);
 * console.log(text); // 'Hello, World!'
 * ```
 */
export const Content = {
	/** Reference to content store */
	contentId: new Uint32Array(DEFAULT_CAPACITY),
	/** Content length in characters */
	length: new Uint32Array(DEFAULT_CAPACITY),
	/** Content hash for change detection */
	hash: new Uint32Array(DEFAULT_CAPACITY),
	/** Text wrap (0=no, 1=yes) */
	wrap: new Uint8Array(DEFAULT_CAPACITY),
	/** Horizontal alignment (0=left, 1=center, 2=right) */
	align: new Uint8Array(DEFAULT_CAPACITY),
	/** Vertical alignment (0=top, 1=middle, 2=bottom) */
	valign: new Uint8Array(DEFAULT_CAPACITY),
	/** Parse markup tags (0=no, 1=yes) */
	parseTags: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Content configuration options.
 */
export interface ContentOptions {
	/** Whether to wrap text */
	wrap?: boolean;
	/** Horizontal text alignment */
	align?: TextAlign;
	/** Vertical text alignment */
	valign?: TextVAlign;
	/** Whether to parse markup tags */
	parseTags?: boolean;
}

/**
 * Content data returned by getContentData.
 */
export interface ContentData {
	readonly text: string;
	readonly length: number;
	readonly hash: number;
	readonly wrap: boolean;
	readonly align: TextAlign;
	readonly valign: TextVAlign;
	readonly parseTags: boolean;
}

/**
 * Initializes a Content component with default values.
 */
function initContent(eid: Entity): void {
	Content.contentId[eid] = 0;
	Content.length[eid] = 0;
	Content.hash[eid] = 0;
	Content.wrap[eid] = 0;
	Content.align[eid] = TextAlign.Left;
	Content.valign[eid] = TextVAlign.Top;
	Content.parseTags[eid] = 0;
}

/**
 * Ensures an entity has the Content component, initializing if needed.
 */
function ensureContent(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Content)) {
		addComponent(world, eid, Content);
		initContent(eid);
	}
}

/**
 * Applies content options to an entity.
 * @internal
 */
function applyContentOptions(eid: Entity, options: ContentOptions): void {
	if (options.wrap !== undefined) Content.wrap[eid] = options.wrap ? 1 : 0;
	if (options.align !== undefined) Content.align[eid] = options.align;
	if (options.valign !== undefined) Content.valign[eid] = options.valign;
	if (options.parseTags !== undefined) Content.parseTags[eid] = options.parseTags ? 1 : 0;
}

/**
 * Sets the text content of an entity.
 * Adds the Content component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param text - The text content
 * @param options - Optional content configuration
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setContent, TextAlign } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Set content with options
 * setContent(world, entity, 'Hello, World!', {
 *   align: TextAlign.Center,
 *   wrap: true,
 * });
 *
 * // Simple text content
 * setContent(world, entity, 'Plain text');
 * ```
 */
export function setContent(
	world: World,
	eid: Entity,
	text: string,
	options?: ContentOptions,
): Entity {
	ensureContent(world, eid);

	const contentId = contentStore.set(eid, text);
	Content.contentId[eid] = contentId;
	Content.length[eid] = text.length;
	Content.hash[eid] = hashString(text);

	if (options) {
		applyContentOptions(eid, options);
	}

	return eid;
}

/**
 * Gets the text content of an entity.
 * Returns empty string if no Content component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The text content or empty string
 *
 * @example
 * ```typescript
 * import { getContent } from 'blecsd';
 *
 * const text = getContent(world, entity);
 * console.log(text);
 * ```
 */
export function getContent(world: World, eid: Entity): string {
	if (!hasComponent(world, eid, Content)) {
		return '';
	}
	const contentId = Content.contentId[eid] as number;
	return contentStore.get(contentId);
}

/**
 * Gets the full content data of an entity.
 * Returns undefined if no Content component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Content data or undefined
 *
 * @example
 * ```typescript
 * import { getContentData, TextAlign } from 'blecsd';
 *
 * const data = getContentData(world, entity);
 * if (data) {
 *   console.log(`Text: ${data.text}, Align: ${data.align}`);
 * }
 * ```
 */
export function getContentData(world: World, eid: Entity): ContentData | undefined {
	if (!hasComponent(world, eid, Content)) {
		return undefined;
	}
	const contentId = Content.contentId[eid] as number;
	return {
		text: contentStore.get(contentId),
		length: Content.length[eid] as number,
		hash: Content.hash[eid] as number,
		wrap: Content.wrap[eid] === 1,
		align: Content.align[eid] as TextAlign,
		valign: Content.valign[eid] as TextVAlign,
		parseTags: Content.parseTags[eid] === 1,
	};
}

/**
 * Sets the text content of an entity, stripping any ANSI escape codes.
 * Use this when you want to set plain text without formatting codes.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param text - The text to set (ANSI codes will be stripped)
 * @param options - Optional content options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setText, getText } from 'blecsd';
 *
 * // ANSI codes are stripped
 * setText(world, entity, '\x1b[31mRed Text\x1b[0m');
 * console.log(getText(world, entity)); // 'Red Text'
 * ```
 */
export function setText(world: World, eid: Entity, text: string, options?: ContentOptions): Entity {
	const plainText = stripAnsi(text);
	return setContent(world, eid, plainText, options);
}

/**
 * Gets the text content of an entity with ANSI codes stripped.
 * Returns empty string if no Content component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The plain text content without ANSI codes
 *
 * @example
 * ```typescript
 * import { setContent, getText } from 'blecsd';
 *
 * // Content may contain ANSI codes
 * setContent(world, entity, '\x1b[31mRed\x1b[0m');
 * console.log(getText(world, entity)); // 'Red'
 * ```
 */
export function getText(world: World, eid: Entity): string {
	const content = getContent(world, eid);
	return stripAnsi(content);
}

/**
 * Appends text to an entity's content.
 * Adds the Content component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param text - The text to append
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setContent, appendContent } from 'blecsd';
 *
 * setContent(world, entity, 'Hello');
 * appendContent(world, entity, ', World!');
 * // Content is now 'Hello, World!'
 * ```
 */
export function appendContent(world: World, eid: Entity, text: string): Entity {
	const currentText = getContent(world, eid);
	return setContent(world, eid, currentText + text);
}

/**
 * Clears the content of an entity.
 * Removes the content from the store but keeps the component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { clearContent } from 'blecsd';
 *
 * clearContent(world, entity);
 * ```
 */
export function clearContent(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, Content)) {
		return eid;
	}

	const contentId = Content.contentId[eid] as number;
	if (contentId !== 0) {
		contentStore.delete(contentId);
	}

	Content.contentId[eid] = 0;
	Content.length[eid] = 0;
	Content.hash[eid] = 0;

	return eid;
}

/**
 * Checks if an entity has a Content component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Content component
 */
export function hasContent(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Content);
}

/**
 * Gets the content length of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Content length or 0 if no Content component
 */
export function getContentLength(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Content)) {
		return 0;
	}
	return Content.length[eid] as number;
}

/**
 * Gets the content hash of an entity.
 * Useful for change detection.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Content hash or 0 if no Content component
 */
export function getContentHash(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Content)) {
		return 0;
	}
	return Content.hash[eid] as number;
}

/**
 * Sets the text alignment of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param align - Horizontal alignment
 * @returns The entity ID for chaining
 */
export function setTextAlign(world: World, eid: Entity, align: TextAlign): Entity {
	ensureContent(world, eid);
	Content.align[eid] = align;
	return eid;
}

/**
 * Sets the vertical alignment of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param valign - Vertical alignment
 * @returns The entity ID for chaining
 */
export function setTextVAlign(world: World, eid: Entity, valign: TextVAlign): Entity {
	ensureContent(world, eid);
	Content.valign[eid] = valign;
	return eid;
}

/**
 * Sets the text wrap setting of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param wrap - Whether to wrap text
 * @returns The entity ID for chaining
 */
export function setTextWrap(world: World, eid: Entity, wrap: boolean): Entity {
	ensureContent(world, eid);
	Content.wrap[eid] = wrap ? 1 : 0;
	return eid;
}

/**
 * Checks if text wrapping is enabled for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if text wrapping is enabled
 */
export function isTextWrapped(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Content)) {
		return false;
	}
	return Content.wrap[eid] === 1;
}

/**
 * Sets whether to parse markup tags in content.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param parse - Whether to parse tags
 * @returns The entity ID for chaining
 */
export function setParseTags(world: World, eid: Entity, parse: boolean): Entity {
	ensureContent(world, eid);
	Content.parseTags[eid] = parse ? 1 : 0;
	return eid;
}

/**
 * Checks if tag parsing is enabled for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if tag parsing is enabled
 */
export function isParsingTags(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Content)) {
		return false;
	}
	return Content.parseTags[eid] === 1;
}

/**
 * Resets the content store. Useful for testing.
 * @internal
 */
export function resetContentStore(): void {
	contentStore.clear();
}
