/**
 * TileMap render system namespace.
 *
 * @example
 * ```typescript
 * import { tilemap } from 'blecsd/systems';
 * const world = createWorld();
 * const system = tilemap.create(world);
 * tilemap.renderAll(world);
 * const buffer = tilemap.getBuffer(world);
 * ```
 */
import {
	clearTileMapRenderBuffer,
	createEmptyBuffer,
	createTilemapRenderSystem,
	getTileMapRenderBuffer,
	getTileMapRendererConfig,
	renderAllTileMaps,
	renderTileMapToBuffer,
	resetTileMapRenderer,
	setTileMapRendererConfig,
	tilemapRenderSystem,
} from '../tilemapRenderer';

export const tilemap = Object.freeze({
	create: createTilemapRenderSystem,
	system: tilemapRenderSystem,
	renderAll: renderAllTileMaps,
	renderToBuffer: renderTileMapToBuffer,
	getBuffer: getTileMapRenderBuffer,
	clearBuffer: clearTileMapRenderBuffer,
	createEmptyBuffer,
	getConfig: getTileMapRendererConfig,
	setConfig: setTileMapRendererConfig,
	reset: resetTileMapRenderer,
});

export type TilemapSystemModule = typeof tilemap;
