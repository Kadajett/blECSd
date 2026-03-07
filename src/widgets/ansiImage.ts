/**
 * ANSIImage Widget
 *
 * Renders bitmap images as ANSI art using braille, half-block, or color characters.
 * A specialized widget focused on text-art rendering with color quantization
 * to the terminal palette.
 *
 * @module widgets/ansiImage
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { Bitmap, CellMap, RenderMode } from '../terminal/graphics/cellRenderer';
import { cellMapToString, renderToAnsi } from '../terminal/graphics/cellRenderer';
import { calculateAspectRatioDimensions } from './image';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating an ANSIImage widget.
 *
 * @example
 * ```typescript
 * import type { ANSIImageConfig } from 'blecsd';
 *
 * const config: ANSIImageConfig = {
 *   x: 10,
 *   y: 5,
 *   width: 40,
 *   height: 20,
 *   renderMode: 'braille',
 *   dither: true,
 * };
 * ```
 */
export interface ANSIImageConfig {
	/** X position */
	readonly x?: number;
	/** Y position */
	readonly y?: number;
	/** Width in terminal columns */
	readonly width?: number;
	/** Height in terminal rows */
	readonly height?: number;
	/** Initial bitmap data to render */
	readonly bitmap?: Bitmap;
	/**
	 * Render mode:
	 * - 'color': Half-block characters with 256-color palette (best color fidelity)
	 * - 'ascii': Luminance-based ASCII art character ramp
	 * - 'braille': Braille pattern characters (highest resolution, monochrome-ish)
	 */
	readonly renderMode?: RenderMode;
	/** Enable Floyd-Steinberg dithering for smoother color gradients (default: false) */
	readonly dither?: boolean;
	/** Whether to show initially (default: true) */
	readonly visible?: boolean;
	/** Preserve aspect ratio when resizing (default: true) */
	readonly preserveAspectRatio?: boolean;
}

/**
 * ANSIImage widget interface providing chainable methods.
 *
 * @example
 * ```typescript
 * import { createANSIImage } from 'blecsd';
 *
 * const img = createANSIImage(world, {
 *   width: 40, height: 20, renderMode: 'braille',
 * });
 * img.setImage(bitmap).show();
 * console.log(img.render());
 * ```
 */
export interface ANSIImageWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the widget */
	show(): ANSIImageWidget;
	/** Hides the widget */
	hide(): ANSIImageWidget;
	/** Checks if visible */
	isVisible(): boolean;

	// Position
	/** Moves the widget by dx, dy */
	move(dx: number, dy: number): ANSIImageWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): ANSIImageWidget;
	/** Gets current position */
	getPosition(): { x: number; y: number };

	// Image data
	/** Sets the bitmap to render */
	setImage(bitmap: Bitmap): ANSIImageWidget;
	/** Gets the current bitmap data */
	getImage(): Bitmap | undefined;
	/** Gets the last rendered CellMap */
	getCellMap(): CellMap | undefined;

	// Render options
	/** Sets the render mode (color, ascii, braille) */
	setRenderMode(mode: RenderMode): ANSIImageWidget;
	/** Gets the current render mode */
	getRenderMode(): RenderMode;
	/** Enables or disables dithering */
	setDither(enabled: boolean): ANSIImageWidget;
	/** Gets whether dithering is enabled */
	getDither(): boolean;
	/** Renders the current bitmap to an ANSI string */
	render(): string;

	// Lifecycle
	/** Destroys the widget and cleans up resources */
	destroy(): void;
}

// =============================================================================
// ZOD SCHEMA
// =============================================================================

/**
 * Zod schema for ANSIImage widget configuration.
 */
export const ANSIImageConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
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
	preserveAspectRatio: z.boolean().default(true),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

const DEFAULT_CAPACITY = 10000;

/** ANSIImage component marker */
export const ANSIImage = {
	isANSIImage: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

const bitmapStore = new Map<Entity, Bitmap>();
const renderModeStore = new Map<Entity, RenderMode>();
const ditherStore = new Map<Entity, boolean>();
const cellMapStore = new Map<Entity, CellMap>();
const visibleStore = new Map<Entity, boolean>();
const preserveAspectRatioStore = new Map<Entity, boolean>();
const cellMapCacheStore = new Map<Entity, Map<string, CellMap>>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function createCacheKey(
	bitmapDataPtr: number,
	mode: RenderMode,
	dither: boolean,
	width: number,
	height: number,
): string {
	return `${bitmapDataPtr}:${mode}:${dither ? '1' : '0'}:${width}:${height}`;
}

function renderContent(world: World, eid: Entity): void {
	const bitmap = bitmapStore.get(eid);
	if (!bitmap || bitmap.width === 0 || bitmap.height === 0) {
		setContent(world, eid, '');
		cellMapStore.delete(eid);
		return;
	}

	const mode = renderModeStore.get(eid) ?? 'color';
	const dither = ditherStore.get(eid) ?? false;
	const bitmapDataPtr = bitmap.data.byteOffset;
	const cacheKey = createCacheKey(bitmapDataPtr, mode, dither, bitmap.width, bitmap.height);

	let cache = cellMapCacheStore.get(eid);
	if (!cache) {
		cache = new Map<string, CellMap>();
		cellMapCacheStore.set(eid, cache);
	}

	let cellMap = cache.get(cacheKey);
	if (!cellMap) {
		cellMap = renderToAnsi(bitmap, { mode, dither });
		cache.set(cacheKey, cellMap);
	}

	cellMapStore.set(eid, cellMap);
	setContent(world, eid, cellMapToString(cellMap));
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates an ANSIImage widget for rendering bitmaps as terminal art.
 *
 * Supports three rendering modes:
 * - **color**: 256-color half-block characters (▀) — best color fidelity
 * - **ascii**: Luminance-based ASCII character ramp — works everywhere
 * - **braille**: Braille dot patterns (⠿) — highest effective resolution
 *
 * @param world - The ECS world
 * @param config - ANSIImage configuration
 * @returns ANSIImageWidget interface
 *
 * @example
 * ```typescript
 * import { createANSIImage } from 'blecsd';
 *
 * const bitmap = {
 *   width: 4, height: 4,
 *   data: new Uint8Array([
 *     255, 0, 0, 255,  0, 255, 0, 255,  0, 0, 255, 255,  255, 255, 0, 255,
 *     255, 0, 0, 255,  0, 255, 0, 255,  0, 0, 255, 255,  255, 255, 0, 255,
 *     255, 0, 0, 255,  0, 255, 0, 255,  0, 0, 255, 255,  255, 255, 0, 255,
 *     255, 0, 0, 255,  0, 255, 0, 255,  0, 0, 255, 255,  255, 255, 0, 255,
 *   ]),
 * };
 *
 * const img = createANSIImage(world, { renderMode: 'braille', bitmap });
 * console.log(img.render());
 * ```
 */
export function createANSIImage(world: World, config: ANSIImageConfig = {}): ANSIImageWidget {
	const parsed = ANSIImageConfigSchema.parse(config);
	const eid = addEntity(world);

	setPosition(world, eid, parsed.x, parsed.y);

	let width: number;
	let height: number;
	if (parsed.bitmap) {
		const dims = calculateAspectRatioDimensions(
			parsed.bitmap.width,
			parsed.bitmap.height,
			parsed.width,
			parsed.height,
			parsed.preserveAspectRatio,
		);
		width = dims.width;
		height = dims.height;
	} else {
		width = parsed.width ?? 0;
		height = parsed.height ?? 0;
	}

	setDimensions(world, eid, width, height);

	ANSIImage.isANSIImage[eid] = 1;
	renderModeStore.set(eid, parsed.renderMode);
	ditherStore.set(eid, parsed.dither);
	visibleStore.set(eid, parsed.visible);
	preserveAspectRatioStore.set(eid, parsed.preserveAspectRatio);

	if (parsed.bitmap) {
		bitmapStore.set(eid, parsed.bitmap);
		renderContent(world, eid);
	}

	if (!parsed.visible) {
		setVisible(world, eid, false);
	}

	return createANSIImageInterface(world, eid);
}

function createANSIImageInterface(world: World, eid: Entity): ANSIImageWidget {
	return {
		get eid() {
			return eid;
		},

		show() {
			visibleStore.set(eid, true);
			setVisible(world, eid, true);
			markDirty(world, eid);
			return this;
		},

		hide() {
			visibleStore.set(eid, false);
			setVisible(world, eid, false);
			markDirty(world, eid);
			return this;
		},

		isVisible() {
			return visibleStore.get(eid) ?? false;
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
			bitmapStore.set(eid, bitmap);
			cellMapCacheStore.delete(eid);
			renderContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getImage() {
			return bitmapStore.get(eid);
		},

		getCellMap() {
			return cellMapStore.get(eid);
		},

		setRenderMode(mode: RenderMode) {
			renderModeStore.set(eid, mode);
			cellMapCacheStore.delete(eid);
			renderContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getRenderMode() {
			return renderModeStore.get(eid) ?? 'color';
		},

		setDither(enabled: boolean) {
			ditherStore.set(eid, enabled);
			cellMapCacheStore.delete(eid);
			renderContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getDither() {
			return ditherStore.get(eid) ?? false;
		},

		render() {
			const bitmap = bitmapStore.get(eid);
			if (!bitmap) return '';
			const mode = renderModeStore.get(eid) ?? 'color';
			const dither = ditherStore.get(eid) ?? false;
			const cellMap = renderToAnsi(bitmap, { mode, dither });
			return cellMapToString(cellMap);
		},

		destroy() {
			ANSIImage.isANSIImage[eid] = 0;
			bitmapStore.delete(eid);
			renderModeStore.delete(eid);
			ditherStore.delete(eid);
			cellMapStore.delete(eid);
			visibleStore.delete(eid);
			preserveAspectRatioStore.delete(eid);
			cellMapCacheStore.delete(eid);
			removeEntity(world, eid);
		},
	};
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is an ANSIImage widget.
 */
export function isANSIImage(_world: World, eid: Entity): boolean {
	return ANSIImage.isANSIImage[eid] === 1;
}

/**
 * Gets the bitmap stored for an ANSIImage entity.
 */
export function getANSIImageBitmap(eid: Entity): Bitmap | undefined {
	return bitmapStore.get(eid);
}

/**
 * Gets the last rendered CellMap for an ANSIImage entity.
 */
export function getANSIImageCellMap(eid: Entity): CellMap | undefined {
	return cellMapStore.get(eid);
}

/**
 * Resets all ANSIImage widget stores. Useful for testing.
 * @internal
 */
export function resetANSIImageStore(): void {
	ANSIImage.isANSIImage.fill(0);
	bitmapStore.clear();
	renderModeStore.clear();
	ditherStore.clear();
	cellMapStore.clear();
	visibleStore.clear();
	preserveAspectRatioStore.clear();
	cellMapCacheStore.clear();
}
