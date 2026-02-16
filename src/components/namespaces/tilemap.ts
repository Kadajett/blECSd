/**
 * TileMap component namespace.
 *
 * Provides all operations for tile maps, tilesets, and tile rendering.
 *
 * @example
 * ```typescript
 * import { tilemap } from 'blecsd/components';
 * tilemap.set(world, eid, { tilesetId, dataId, width: 40, height: 30 });
 * tilemap.setTile(world, eid, 5, 3, tileId);
 * ```
 */
import {
	addLayer,
	createTileData,
	fillTileRect,
	fillTiles,
	getLayerCount,
	getTile,
	getTileData,
	getTileMap,
	getTileMapDataId,
	getTileset,
	getTilesetByName,
	hasTileMap,
	isLayerVisible,
	registerTileset,
	removeTileData,
	removeTileMap,
	renderTileMapArea,
	resetTileMapStore,
	resetTilesetStore,
	setLayerVisible,
	setTile,
	setTileMap,
	unregisterTileset,
} from '../tilemap';

export const tilemap = Object.freeze({
	get: getTileMap,
	has: hasTileMap,
	set: setTileMap,
	remove: removeTileMap,
	getDataId: getTileMapDataId,
	render: renderTileMapArea,

	tile: Object.freeze({
		get: getTile,
		set: setTile,
		fill: fillTiles,
		fillRect: fillTileRect,
	}),

	data: Object.freeze({
		create: createTileData,
		get: getTileData,
		remove: removeTileData,
	}),

	layer: Object.freeze({
		add: addLayer,
		getCount: getLayerCount,
		isVisible: isLayerVisible,
		setVisible: setLayerVisible,
	}),

	tileset: Object.freeze({
		get: getTileset,
		getByName: getTilesetByName,
		register: registerTileset,
		unregister: unregisterTileset,
		resetStore: resetTilesetStore,
	}),

	resetStore: resetTileMapStore,
});

export type TileMapModule = typeof tilemap;
