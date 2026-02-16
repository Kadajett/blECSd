/**
 * TileMap render system namespace.
 *
 * @example
 * ```typescript
 * import { tilemapSys } from 'blecsd/systems';
 * const world = createWorld();
 * const system = tilemapSys.create(world);
 * tilemapSys.renderAll(world);
 * const buffer = tilemapSys.getBuffer(world);
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

export const tilemapSys = Object.freeze({
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

export type TilemapSysModule = typeof tilemapSys;
