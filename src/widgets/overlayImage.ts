/**
 * OverlayImage Widget
 *
 * Renders images using terminal graphics protocols (Kitty, iTerm2, Sixel)
 * with automatic fallback to ANSI art when no graphics protocol is available.
 *
 * Leverages the `src/terminal/graphics/` backend infrastructure for protocol
 * detection and rendering.
 *
 * @module widgets/overlayImage
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { setDimensions } from '../components/dimensions';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';
import type { BackendName, GraphicsManagerState } from '../terminal/graphics/backend';
import {
	getActiveBackend,
	getBackendCapabilities,
	renderImage as renderGraphicsImage,
} from '../terminal/graphics/backend';
import type { Bitmap, CellMap, RenderMode } from '../terminal/graphics/cellRenderer';
import { cellMapToString, renderToAnsi } from '../terminal/graphics/cellRenderer';
import { calculateAspectRatioDimensions } from './image';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for creating an OverlayImage widget.
 *
 * @example
 * ```typescript
 * import { createOverlayImage, createAutoGraphicsManager } from 'blecsd';
 *
 * const manager = createAutoGraphicsManager();
 * const overlay = createOverlayImage(world, {
 *   x: 0, y: 0, width: 60, height: 30,
 *   graphicsManager: manager,
 * });
 * ```
 */
export interface OverlayImageConfig {
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
	/** Graphics manager for protocol-based rendering (required for overlay output) */
	readonly graphicsManager?: GraphicsManagerState;
	/** Fallback ANSI render mode when no graphics protocol available (default: 'color') */
	readonly fallbackRenderMode?: RenderMode;
	/** Enable dithering in fallback mode (default: false) */
	readonly fallbackDither?: boolean;
	/** Whether to show initially (default: true) */
	readonly visible?: boolean;
	/** Preserve aspect ratio when resizing (default: true) */
	readonly preserveAspectRatio?: boolean;
}

/**
 * OverlayImage widget interface providing chainable methods.
 *
 * @example
 * ```typescript
 * import { createOverlayImage, createAutoGraphicsManager } from 'blecsd';
 *
 * const manager = createAutoGraphicsManager();
 * const overlay = createOverlayImage(world, {
 *   graphicsManager: manager,
 * });
 * overlay.setImage(bitmap).show();
 * console.log(overlay.getActiveBackendName()); // 'kitty', 'iterm2', 'sixel', or 'ansi'
 * ```
 */
export interface OverlayImageWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	show(): OverlayImageWidget;
	hide(): OverlayImageWidget;
	isVisible(): boolean;

	// Position
	move(dx: number, dy: number): OverlayImageWidget;
	setPosition(x: number, y: number): OverlayImageWidget;
	getPosition(): { x: number; y: number };

	// Image data
	/** Sets the bitmap to render */
	setImage(bitmap: Bitmap): OverlayImageWidget;
	/** Gets the current bitmap data */
	getImage(): Bitmap | undefined;

	// Graphics manager
	/** Sets or replaces the graphics manager (triggers re-render) */
	setGraphicsManager(manager: GraphicsManagerState): OverlayImageWidget;
	/** Gets the name of the active graphics backend, or 'ansi-fallback' if using fallback */
	getActiveBackendName(): BackendName | 'ansi-fallback';
	/** Returns true if using a native graphics protocol (not ANSI fallback) */
	isUsingGraphicsProtocol(): boolean;

	// Fallback options
	/** Sets the ANSI fallback render mode */
	setFallbackRenderMode(mode: RenderMode): OverlayImageWidget;
	/** Gets the current fallback render mode */
	getFallbackRenderMode(): RenderMode;

	/** Renders the current bitmap to a string (protocol or ANSI fallback) */
	render(): string;

	/** Gets the last rendered CellMap (only available in fallback mode) */
	getCellMap(): CellMap | undefined;

	// Lifecycle
	destroy(): void;
}

// =============================================================================
// ZOD SCHEMA
// =============================================================================

/**
 * Zod schema for OverlayImage widget configuration.
 */
export const OverlayImageConfigSchema = z.object({
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
	fallbackRenderMode: z.enum(['color', 'ascii', 'braille']).default('color'),
	fallbackDither: z.boolean().default(false),
	visible: z.boolean().default(true),
	preserveAspectRatio: z.boolean().default(true),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

const DEFAULT_CAPACITY = 10000;

/** OverlayImage component marker */
export const OverlayImage = {
	isOverlayImage: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

const bitmapStore = new Map<Entity, Bitmap>();
const graphicsManagerStore = new Map<Entity, GraphicsManagerState>();
const fallbackRenderModeStore = new Map<Entity, RenderMode>();
const fallbackDitherStore = new Map<Entity, boolean>();
const cellMapStore = new Map<Entity, CellMap>();
const visibleStore = new Map<Entity, boolean>();
const preserveAspectRatioStore = new Map<Entity, boolean>();

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Checks if the graphics manager has a working graphics protocol backend.
 * Returns the active backend name if a protocol (kitty/iterm2/sixel) is available.
 */
function getProtocolBackend(manager: GraphicsManagerState): BackendName | null {
	const active = getActiveBackend(manager);
	if (!active) return null;

	const caps = getBackendCapabilities(manager);
	if (caps?.staticImages) {
		// It's a real graphics protocol if it's not ansi/ascii/braille
		const name = active.name;
		if (name !== 'ansi' && name !== 'ascii' && name !== 'braille') {
			return name;
		}
	}
	return null;
}

function renderContent(world: World, eid: Entity): void {
	const bitmap = bitmapStore.get(eid);
	if (!bitmap || bitmap.width === 0 || bitmap.height === 0) {
		setContent(world, eid, '');
		cellMapStore.delete(eid);
		return;
	}

	const manager = graphicsManagerStore.get(eid);

	// Try graphics protocol rendering first
	if (manager) {
		const protocolBackend = getProtocolBackend(manager);
		if (protocolBackend) {
			const x = Position.x[eid] ?? 0;
			const y = Position.y[eid] ?? 0;
			const output = renderGraphicsImage(
				manager,
				{ width: bitmap.width, height: bitmap.height, data: bitmap.data, format: 'rgba' },
				{ x, y },
			);
			setContent(world, eid, output);
			cellMapStore.delete(eid); // No CellMap in protocol mode
			return;
		}
	}

	// Fallback to ANSI rendering
	const mode = fallbackRenderModeStore.get(eid) ?? 'color';
	const dither = fallbackDitherStore.get(eid) ?? false;
	const cellMap = renderToAnsi(bitmap, { mode, dither });
	cellMapStore.set(eid, cellMap);
	setContent(world, eid, cellMapToString(cellMap));
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates an OverlayImage widget that uses terminal graphics protocols
 * with automatic ANSI art fallback.
 *
 * **Protocol preference order:** Kitty → iTerm2 → Sixel → ANSI fallback
 *
 * When a graphics protocol is available, the image is rendered natively
 * by the terminal (pixel-perfect). When no protocol is detected, it
 * gracefully falls back to ANSI character art (color/ascii/braille modes).
 *
 * @param world - The ECS world
 * @param config - OverlayImage configuration
 * @returns OverlayImageWidget interface
 *
 * @example
 * ```typescript
 * import { createOverlayImage, createAutoGraphicsManager } from 'blecsd';
 *
 * const manager = createAutoGraphicsManager();
 * const overlay = createOverlayImage(world, {
 *   x: 0, y: 0,
 *   width: 60, height: 30,
 *   graphicsManager: manager,
 *   bitmap: myBitmap,
 * });
 *
 * if (overlay.isUsingGraphicsProtocol()) {
 *   console.log(`Using ${overlay.getActiveBackendName()}`);
 * } else {
 *   console.log('Fell back to ANSI art');
 * }
 * ```
 */
export function createOverlayImage(
	world: World,
	config: OverlayImageConfig = {},
): OverlayImageWidget {
	const parsed = OverlayImageConfigSchema.parse(config);
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

	OverlayImage.isOverlayImage[eid] = 1;
	fallbackRenderModeStore.set(eid, parsed.fallbackRenderMode);
	fallbackDitherStore.set(eid, parsed.fallbackDither);
	visibleStore.set(eid, parsed.visible);
	preserveAspectRatioStore.set(eid, parsed.preserveAspectRatio);

	if (config.graphicsManager) {
		graphicsManagerStore.set(eid, config.graphicsManager);
	}

	if (parsed.bitmap) {
		bitmapStore.set(eid, parsed.bitmap);
		renderContent(world, eid);
	}

	if (!parsed.visible) {
		setVisible(world, eid, false);
	}

	return createOverlayImageInterface(world, eid);
}

function createOverlayImageInterface(world: World, eid: Entity): OverlayImageWidget {
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
			renderContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getImage() {
			return bitmapStore.get(eid);
		},

		setGraphicsManager(manager: GraphicsManagerState) {
			graphicsManagerStore.set(eid, manager);
			renderContent(world, eid);
			markDirty(world, eid);
			return this;
		},

		getActiveBackendName(): BackendName | 'ansi-fallback' {
			const manager = graphicsManagerStore.get(eid);
			if (manager) {
				const protocol = getProtocolBackend(manager);
				if (protocol) return protocol;
			}
			return 'ansi-fallback';
		},

		isUsingGraphicsProtocol() {
			const manager = graphicsManagerStore.get(eid);
			if (!manager) return false;
			return getProtocolBackend(manager) !== null;
		},

		setFallbackRenderMode(mode: RenderMode) {
			fallbackRenderModeStore.set(eid, mode);
			// Re-render only if currently in fallback mode
			if (!this.isUsingGraphicsProtocol()) {
				renderContent(world, eid);
				markDirty(world, eid);
			}
			return this;
		},

		getFallbackRenderMode() {
			return fallbackRenderModeStore.get(eid) ?? 'color';
		},

		render() {
			const bitmap = bitmapStore.get(eid);
			if (!bitmap) return '';

			const manager = graphicsManagerStore.get(eid);
			if (manager) {
				const protocolBackend = getProtocolBackend(manager);
				if (protocolBackend) {
					const x = Position.x[eid] ?? 0;
					const y = Position.y[eid] ?? 0;
					return renderGraphicsImage(
						manager,
						{ width: bitmap.width, height: bitmap.height, data: bitmap.data, format: 'rgba' },
						{ x, y },
					);
				}
			}

			// Fallback
			const mode = fallbackRenderModeStore.get(eid) ?? 'color';
			const dither = fallbackDitherStore.get(eid) ?? false;
			const cellMap = renderToAnsi(bitmap, { mode, dither });
			return cellMapToString(cellMap);
		},

		getCellMap() {
			return cellMapStore.get(eid);
		},

		destroy() {
			OverlayImage.isOverlayImage[eid] = 0;
			bitmapStore.delete(eid);
			graphicsManagerStore.delete(eid);
			fallbackRenderModeStore.delete(eid);
			fallbackDitherStore.delete(eid);
			cellMapStore.delete(eid);
			visibleStore.delete(eid);
			preserveAspectRatioStore.delete(eid);
			removeEntity(world, eid);
		},
	};
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is an OverlayImage widget.
 */
export function isOverlayImage(_world: World, eid: Entity): boolean {
	return OverlayImage.isOverlayImage[eid] === 1;
}

/**
 * Gets the bitmap stored for an OverlayImage entity.
 */
export function getOverlayImageBitmap(eid: Entity): Bitmap | undefined {
	return bitmapStore.get(eid);
}

/**
 * Resets all OverlayImage widget stores. Useful for testing.
 * @internal
 */
export function resetOverlayImageStore(): void {
	OverlayImage.isOverlayImage.fill(0);
	bitmapStore.clear();
	graphicsManagerStore.clear();
	fallbackRenderModeStore.clear();
	fallbackDitherStore.clear();
	cellMapStore.clear();
	visibleStore.clear();
	preserveAspectRatioStore.clear();
}
