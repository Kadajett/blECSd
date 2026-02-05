/**
 * TileMap rendering system for rendering tile maps to a buffer.
 *
 * Queries entities with TileMap and Position components, then renders
 * visible tiles to a 2D buffer. Supports camera offset for scrolling
 * and dirty region tracking for efficient updates.
 *
 * @module systems/tilemapRenderer
 */

import { Position } from '../components/position';
import {
	EMPTY_TILE,
	type RenderedTileCell,
	TileMap,
	tileMapStore,
	tilesetStore,
} from '../components/tilemap';
import { query } from '../core/ecs';
import type { Entity, System, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A rendered tile map buffer.
 * Stores the final composited output from all tile map entities.
 */
export interface TileMapBuffer {
	/** Buffer width in cells */
	readonly width: number;
	/** Buffer height in cells */
	readonly height: number;
	/** 2D array of rendered cells (row-major: [y][x]) */
	readonly cells: RenderedTileCell[][];
}

/**
 * Camera offset for tile map rendering.
 */
export interface TileMapCamera {
	/** Camera X offset in world units (pixels/cells) */
	x: number;
	/** Camera Y offset in world units (pixels/cells) */
	y: number;
}

/**
 * Configuration for the tile map renderer.
 */
export interface TileMapRendererConfig {
	/** Viewport width in cells */
	viewportWidth: number;
	/** Viewport height in cells */
	viewportHeight: number;
	/** Camera offset */
	camera: TileMapCamera;
}

// =============================================================================
// RENDERER STATE
// =============================================================================

/** Module-level renderer config */
let rendererConfig: TileMapRendererConfig | null = null;

/** Module-level render buffer */
let renderBuffer: TileMapBuffer | null = null;

/**
 * Sets the tile map renderer configuration.
 *
 * @param config - The renderer configuration
 *
 * @example
 * ```typescript
 * import { setTileMapRendererConfig } from 'blecsd';
 *
 * setTileMapRendererConfig({
 *   viewportWidth: 80,
 *   viewportHeight: 24,
 *   camera: { x: 0, y: 0 },
 * });
 * ```
 */
export function setTileMapRendererConfig(config: TileMapRendererConfig): void {
	rendererConfig = config;
}

/**
 * Gets the current tile map renderer configuration.
 *
 * @returns The renderer config or null if not set
 */
export function getTileMapRendererConfig(): TileMapRendererConfig | null {
	return rendererConfig;
}

/**
 * Gets the current render buffer.
 *
 * @returns The render buffer or null if not rendered yet
 *
 * @example
 * ```typescript
 * import { getTileMapRenderBuffer } from 'blecsd';
 *
 * const buffer = getTileMapRenderBuffer();
 * if (buffer) {
 *   for (let y = 0; y < buffer.height; y++) {
 *     for (let x = 0; x < buffer.width; x++) {
 *       const cell = buffer.cells[y][x];
 *       // Use cell.char, cell.fg, cell.bg
 *     }
 *   }
 * }
 * ```
 */
export function getTileMapRenderBuffer(): TileMapBuffer | null {
	return renderBuffer;
}

/**
 * Clears the render buffer.
 */
export function clearTileMapRenderBuffer(): void {
	renderBuffer = null;
}

/**
 * Resets the tile map renderer state (config and buffer).
 * Useful for testing.
 *
 * @example
 * ```typescript
 * import { resetTileMapRenderer } from 'blecsd';
 *
 * resetTileMapRenderer();
 * ```
 */
export function resetTileMapRenderer(): void {
	rendererConfig = null;
	renderBuffer = null;
}

// =============================================================================
// RENDER FUNCTIONS
// =============================================================================

/**
 * Creates an empty tile map buffer filled with empty cells.
 *
 * @param width - Buffer width in cells
 * @param height - Buffer height in cells
 * @returns A new empty buffer
 */
export function createEmptyBuffer(width: number, height: number): TileMapBuffer {
	const cells: RenderedTileCell[][] = [];
	for (let y = 0; y < height; y++) {
		const row: RenderedTileCell[] = [];
		for (let x = 0; x < width; x++) {
			row.push({ char: ' ', fg: 0, bg: 0 });
		}
		cells.push(row);
	}
	return { width, height, cells };
}

/**
 * Renders a single tile map entity into a buffer.
 * Takes into account entity position and camera offset.
 *
 * @param buffer - The target buffer
 * @param eid - The entity ID
 * @param cameraX - Camera X offset in world units
 * @param cameraY - Camera Y offset in world units
 *
 * @example
 * ```typescript
 * import { createEmptyBuffer, renderTileMapToBuffer } from 'blecsd';
 *
 * const buffer = createEmptyBuffer(80, 24);
 * renderTileMapToBuffer(buffer, mapEntity, 0, 0);
 * ```
 */
export function renderTileMapToBuffer(
	buffer: TileMapBuffer,
	eid: Entity,
	cameraX: number,
	cameraY: number,
): void {
	const mapWidth = TileMap.width[eid] as number;
	const mapHeight = TileMap.height[eid] as number;
	const tileWidth = TileMap.tileWidth[eid] as number;
	const tileHeight = TileMap.tileHeight[eid] as number;
	const dataId = TileMap.dataId[eid] as number;
	const tilesetId = TileMap.tilesetId[eid] as number;

	const tileData = tileMapStore.data.get(dataId);
	const tileset = tilesetStore.tilesets.get(tilesetId);
	if (!tileData || !tileset) {
		return;
	}

	const entityX = Position.x[eid] as number;
	const entityY = Position.y[eid] as number;

	// World position of the top-left corner of the tile map
	const mapWorldX = entityX - cameraX;
	const mapWorldY = entityY - cameraY;

	// Calculate which tiles are visible in the viewport
	const startTileX = Math.max(0, Math.floor(-mapWorldX / tileWidth));
	const startTileY = Math.max(0, Math.floor(-mapWorldY / tileHeight));
	const endTileX = Math.min(mapWidth, Math.ceil((buffer.width - mapWorldX) / tileWidth));
	const endTileY = Math.min(mapHeight, Math.ceil((buffer.height - mapWorldY) / tileHeight));

	for (let ty = startTileY; ty < endTileY; ty++) {
		for (let tx = startTileX; tx < endTileX; tx++) {
			// Composite all visible layers for this tile
			let finalChar = ' ';
			let finalFg = 0;
			let finalBg = 0;

			for (const layer of tileData.layers) {
				if (!layer.visible) {
					continue;
				}
				const tileIdx = layer.tiles[ty * tileData.width + tx] as number;
				if (tileIdx === EMPTY_TILE) {
					continue;
				}
				const tileDef = tileset.tiles[tileIdx];
				if (tileDef) {
					finalChar = tileDef.char;
					finalFg = tileDef.fg;
					finalBg = tileDef.bg;
				}
			}

			// Write to buffer at the correct screen position
			const screenStartX = Math.round(mapWorldX + tx * tileWidth);
			const screenStartY = Math.round(mapWorldY + ty * tileHeight);

			for (let dy = 0; dy < tileHeight; dy++) {
				const bufY = screenStartY + dy;
				if (bufY < 0 || bufY >= buffer.height) {
					continue;
				}
				const row = buffer.cells[bufY];
				if (!row) {
					continue;
				}
				for (let dx = 0; dx < tileWidth; dx++) {
					const bufX = screenStartX + dx;
					if (bufX < 0 || bufX >= buffer.width) {
						continue;
					}
					row[bufX] = { char: finalChar, fg: finalFg, bg: finalBg };
				}
			}
		}
	}
}

/**
 * Renders all tile map entities in the world to the render buffer.
 * Uses the configured viewport and camera offset.
 *
 * @param world - The ECS world
 * @returns The render buffer
 *
 * @example
 * ```typescript
 * import { setTileMapRendererConfig, renderAllTileMaps } from 'blecsd';
 *
 * setTileMapRendererConfig({
 *   viewportWidth: 80,
 *   viewportHeight: 24,
 *   camera: { x: 0, y: 0 },
 * });
 *
 * const buffer = renderAllTileMaps(world);
 * ```
 */
export function renderAllTileMaps(world: World): TileMapBuffer | null {
	if (!rendererConfig) {
		return null;
	}

	const buffer = createEmptyBuffer(rendererConfig.viewportWidth, rendererConfig.viewportHeight);
	const entities = query(world, [TileMap, Position]) as unknown as readonly Entity[];

	for (const eid of entities) {
		renderTileMapToBuffer(buffer, eid, rendererConfig.camera.x, rendererConfig.camera.y);
	}

	renderBuffer = buffer;
	return buffer;
}

// =============================================================================
// SYSTEM
// =============================================================================

/**
 * TileMap rendering system that renders all tile maps each frame.
 *
 * Requires renderer config to be set via setTileMapRendererConfig()
 * before the system runs. Queries all entities with TileMap and Position
 * components and composites them into a single render buffer.
 *
 * Register this in the RENDER phase.
 *
 * @example
 * ```typescript
 * import {
 *   setTileMapRendererConfig,
 *   tilemapRenderSystem,
 *   createScheduler,
 *   LoopPhase,
 * } from 'blecsd';
 *
 * setTileMapRendererConfig({
 *   viewportWidth: 80,
 *   viewportHeight: 24,
 *   camera: { x: 0, y: 0 },
 * });
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.RENDER, tilemapRenderSystem);
 * ```
 */
export const tilemapRenderSystem: System = (world: World): World => {
	renderAllTileMaps(world);
	return world;
};

/**
 * Creates a new tilemap render system.
 *
 * @returns The system function
 */
export function createTilemapRenderSystem(): System {
	return tilemapRenderSystem;
}
