/**
 * Image Widget
 *
 * Factory widget that renders bitmap images in the terminal.
 * Supports ANSI rendering (256-color, ASCII, braille) and an overlay mode
 * for external image protocols (w3m, iTerm2, Kitty, Sixel).
 *
 * @module widgets/image
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { Bitmap, CellMap, RenderMode } from '../media/render/ansi';
import { cellMapToString, renderToAnsi } from '../media/render/ansi';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Image rendering type.
 * - 'ansi': Renders bitmap as ANSI escape sequences using 256-color palette
 * - 'overlay': Stores bitmap for external overlay protocols (w3m, iTerm2, Kitty, Sixel)
 */
export type ImageType = 'ansi' | 'overlay';

/**
 * Configuration for creating an Image widget.
 *
 * @example
 * ```typescript
 * import type { ImageConfig } from 'blecsd';
 *
 * const config: ImageConfig = {
 *   x: 10,
 *   y: 5,
 *   width: 40,
 *   height: 20,
 *   type: 'ansi',
 *   renderMode: 'color',
 * };
 * ```
 */
export interface ImageConfig {
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Width in terminal columns */
	readonly width?: number;
	/** Height in terminal rows */
	readonly height?: number;
	/** Image rendering type (default: 'ansi') */
	readonly type?: ImageType;
	/** Initial bitmap data to render */
	readonly bitmap?: Bitmap;
	/** ANSI render mode (default: 'color'). Only used when type is 'ansi'. */
	readonly renderMode?: RenderMode;
	/** Enable dithering for ANSI color mode (default: false) */
	readonly dither?: boolean;
	/** Whether to show initially (default: true) */
	readonly visible?: boolean;
}

/**
 * Image widget interface providing chainable methods.
 *
 * @example
 * ```typescript
 * import { createImage } from 'blecsd';
 *
 * const image = createImage(world, {
 *   x: 0, y: 0, width: 40, height: 20,
 * });
 * image.setImage(bitmap).show();
 * ```
 */
export interface ImageWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the image */
	show(): ImageWidget;
	/** Hides the image */
	hide(): ImageWidget;
	/** Checks if visible */
	isVisible(): boolean;

	// Position
	/** Moves the image by dx, dy */
	move(dx: number, dy: number): ImageWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): ImageWidget;
	/** Gets current position */
	getPosition(): { x: number; y: number };

	// Image data
	/** Sets the bitmap to render */
	setImage(bitmap: Bitmap): ImageWidget;
	/** Gets the current bitmap data */
	getImage(): Bitmap | undefined;
	/** Gets the image rendering type */
	getType(): ImageType;
	/** Gets the last rendered CellMap (ANSI mode only) */
	getCellMap(): CellMap | undefined;

	// Render options
	/** Sets the ANSI render mode */
	setRenderMode(mode: RenderMode): ImageWidget;
	/** Gets the current render mode */
	getRenderMode(): RenderMode;
	/** Renders the current bitmap to an ANSI string */
	render(): string;

	// Lifecycle
	/** Destroys the image widget */
	destroy(): void;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for image widget configuration.
 *
 * @example
 * ```typescript
 * import { ImageConfigSchema } from 'blecsd';
 *
 * const result = ImageConfigSchema.safeParse({ type: 'ansi', width: 40 });
 * ```
 */
export const ImageConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	type: z.enum(['ansi', 'overlay']).default('ansi'),
	bitmap: z
		.object({
			width: z.number().int().nonnegative(),
			height: z.number().int().nonnegative(),
			data: z.instanceof(Uint8Array),
		})
		.optional(),
	renderMode: z.enum(['color', 'ascii', 'braille']).default('color'),
	dither: z.boolean().default(false),
	visible: z.boolean().default(true),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Image component marker for identifying image entities.
 */
export const Image = {
	/** Tag indicating this is an image widget (1 = yes) */
	isImage: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

/** Maps entity IDs to their bitmap data */
const imageBitmapStore = new Map<Entity, Bitmap>();

/** Maps entity IDs to their image type */
const imageTypeStore = new Map<Entity, ImageType>();

/** Maps entity IDs to their render mode */
const imageRenderModeStore = new Map<Entity, RenderMode>();

/** Maps entity IDs to their dither setting */
const imageDitherStore = new Map<Entity, boolean>();

/** Maps entity IDs to their last rendered CellMap */
const imageCellMapStore = new Map<Entity, CellMap>();

/** Maps entity IDs to their visibility state */
const imageVisibleStore = new Map<Entity, boolean>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Renders the stored bitmap for an entity and updates its content.
 */
function renderImageContent(world: World, eid: Entity): void {
	const bitmap = imageBitmapStore.get(eid);
	if (!bitmap) {
		setContent(world, eid, '');
		imageCellMapStore.delete(eid);
		return;
	}

	const imageType = imageTypeStore.get(eid) ?? 'ansi';
	if (imageType !== 'ansi') {
		// Overlay mode: content is empty, bitmap is stored for external rendering
		setContent(world, eid, '');
		return;
	}

	const mode = imageRenderModeStore.get(eid) ?? 'color';
	const dither = imageDitherStore.get(eid) ?? false;

	const cellMap = renderToAnsi(bitmap, {
		width: undefined,
		height: undefined,
		mode,
		dither,
	});
	imageCellMapStore.set(eid, cellMap);

	const content = cellMapToString(cellMap);
	setContent(world, eid, content);
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates an Image widget.
 *
 * The Image widget renders bitmap data in the terminal using either ANSI escape
 * sequences (for 256-color, ASCII art, or braille output) or stores the bitmap
 * for external overlay protocols.
 *
 * @param world - The ECS world
 * @param config - Image configuration
 * @returns ImageWidget interface
 *
 * @example
 * ```typescript
 * import { createImage } from 'blecsd';
 *
 * // Create a 2x2 red image in ANSI mode
 * const bitmap = {
 *   width: 2,
 *   height: 2,
 *   data: new Uint8Array([
 *     255, 0, 0, 255,  255, 0, 0, 255,
 *     255, 0, 0, 255,  255, 0, 0, 255,
 *   ]),
 * };
 *
 * const image = createImage(world, {
 *   x: 5,
 *   y: 2,
 *   type: 'ansi',
 *   renderMode: 'color',
 *   bitmap,
 * });
 *
 * // Get the rendered ANSI string
 * const output = image.render();
 * ```
 */
export function createImage(world: World, config: ImageConfig = {}): ImageWidget {
	const parsed = ImageConfigSchema.parse(config);

	const eid = addEntity(world);

	// Set position
	setPosition(world, eid, parsed.x, parsed.y);

	// Set dimensions
	const width = parsed.width ?? parsed.bitmap?.width ?? 0;
	const height = parsed.height ?? parsed.bitmap?.height ?? 0;
	setDimensions(world, eid, width, height);

	// Mark as image
	Image.isImage[eid] = 1;

	// Store state
	imageTypeStore.set(eid, parsed.type);
	imageRenderModeStore.set(eid, parsed.renderMode);
	imageDitherStore.set(eid, parsed.dither);
	imageVisibleStore.set(eid, parsed.visible);

	// Store and render bitmap if provided
	if (parsed.bitmap) {
		imageBitmapStore.set(eid, parsed.bitmap);
		renderImageContent(world, eid);
	}

	// Set visibility
	if (!parsed.visible) {
		setVisible(world, eid, false);
	}

	return createImageWidgetInterface(world, eid);
}

/**
 * Creates the ImageWidget interface for an entity.
 */
function createImageWidgetInterface(world: World, eid: Entity): ImageWidget {
	return {
		get eid() {
			return eid;
		},

		show() {
			imageVisibleStore.set(eid, true);
			setVisible(world, eid, true);
			markDirty(world, eid);
			return this;
		},

		hide() {
			imageVisibleStore.set(eid, false);
			setVisible(world, eid, false);
			markDirty(world, eid);
			return this;
		},

		isVisible() {
			return imageVisibleStore.get(eid) ?? false;
		},

		move(dx: number, dy: number) {
			const x = Position.x[eid] ?? 0;
			const y = Position.y[eid] ?? 0;
			setPosition(world, eid, x + dx, y + dy);
			markDirty(world, eid);
			return this;
		},

		setPosition(x: number, y: number) {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return this;
		},

		getPosition() {
			return {
				x: Position.x[eid] ?? 0,
				y: Position.y[eid] ?? 0,
			};
		},

		setImage(bitmap: Bitmap) {
			imageBitmapStore.set(eid, bitmap);
			renderImageContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getImage() {
			return imageBitmapStore.get(eid);
		},

		getType() {
			return imageTypeStore.get(eid) ?? 'ansi';
		},

		getCellMap() {
			return imageCellMapStore.get(eid);
		},

		setRenderMode(mode: RenderMode) {
			imageRenderModeStore.set(eid, mode);
			renderImageContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getRenderMode() {
			return imageRenderModeStore.get(eid) ?? 'color';
		},

		render() {
			const bitmap = imageBitmapStore.get(eid);
			if (!bitmap) return '';

			const mode = imageRenderModeStore.get(eid) ?? 'color';
			const dither = imageDitherStore.get(eid) ?? false;

			const cellMap = renderToAnsi(bitmap, { mode, dither });
			return cellMapToString(cellMap);
		},

		destroy() {
			Image.isImage[eid] = 0;
			imageBitmapStore.delete(eid);
			imageTypeStore.delete(eid);
			imageRenderModeStore.delete(eid);
			imageDitherStore.delete(eid);
			imageCellMapStore.delete(eid);
			imageVisibleStore.delete(eid);
			removeEntity(world, eid);
		},
	};
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is an image widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - Entity ID
 * @returns true if entity is an image widget
 *
 * @example
 * ```typescript
 * import { isImage } from 'blecsd';
 *
 * if (isImage(world, entity)) {
 *   // Handle image-specific logic
 * }
 * ```
 */
export function isImage(_world: World, eid: Entity): boolean {
	return Image.isImage[eid] === 1;
}

/**
 * Gets the bitmap stored for an image entity.
 *
 * @param eid - Entity ID
 * @returns The stored bitmap, or undefined
 *
 * @example
 * ```typescript
 * import { getImageBitmap } from 'blecsd';
 *
 * const bitmap = getImageBitmap(imageEntity);
 * if (bitmap) {
 *   console.log(`Image: ${bitmap.width}x${bitmap.height}`);
 * }
 * ```
 */
export function getImageBitmap(eid: Entity): Bitmap | undefined {
	return imageBitmapStore.get(eid);
}

/**
 * Gets the last rendered CellMap for an image entity.
 *
 * @param eid - Entity ID
 * @returns The cached CellMap, or undefined
 *
 * @example
 * ```typescript
 * import { getImageCellMap } from 'blecsd';
 *
 * const cellMap = getImageCellMap(imageEntity);
 * if (cellMap) {
 *   console.log(`Cells: ${cellMap.width}x${cellMap.height}`);
 * }
 * ```
 */
export function getImageCellMap(eid: Entity): CellMap | undefined {
	return imageCellMapStore.get(eid);
}

/**
 * Resets all image widget stores. Useful for testing.
 *
 * @internal
 */
export function resetImageStore(): void {
	Image.isImage.fill(0);
	imageBitmapStore.clear();
	imageTypeStore.clear();
	imageRenderModeStore.clear();
	imageDitherStore.clear();
	imageCellMapStore.clear();
	imageVisibleStore.clear();
}
