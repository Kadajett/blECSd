/**
 * Tests for TileMap component and tile data management.
 * @module components/tilemap.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	addLayer,
	createTileData,
	EMPTY_TILE,
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
} from './tilemap';

describe('tilemap', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetTilesetStore();
		resetTileMapStore();
	});

	// =========================================================================
	// Tileset Store
	// =========================================================================

	describe('registerTileset / getTileset', () => {
		it('registers a tileset and retrieves it by ID', () => {
			const id = registerTileset({
				name: 'dungeon',
				tiles: [
					{ char: ' ', fg: 0, bg: 0 },
					{ char: '.', fg: 0x888888ff, bg: 0 },
					{ char: '#', fg: 0xaaaaaaff, bg: 0x444444ff },
				],
			});

			const tileset = getTileset(id);
			expect(tileset).toBeDefined();
			expect(tileset?.name).toBe('dungeon');
			expect(tileset?.tiles.length).toBe(3);
		});

		it('returns unique IDs for each tileset', () => {
			const id1 = registerTileset({ name: 'a', tiles: [] });
			const id2 = registerTileset({ name: 'b', tiles: [] });
			expect(id1).not.toBe(id2);
		});

		it('returns undefined for non-existent tileset', () => {
			expect(getTileset(999)).toBeUndefined();
		});
	});

	describe('getTilesetByName', () => {
		it('retrieves tileset by name', () => {
			registerTileset({
				name: 'forest',
				tiles: [{ char: 'T', fg: 0x00ff00ff, bg: 0 }],
			});

			const tileset = getTilesetByName('forest');
			expect(tileset).toBeDefined();
			expect(tileset?.name).toBe('forest');
		});

		it('returns undefined for unknown name', () => {
			expect(getTilesetByName('nonexistent')).toBeUndefined();
		});
	});

	describe('unregisterTileset', () => {
		it('removes a tileset', () => {
			const id = registerTileset({ name: 'temp', tiles: [] });
			expect(unregisterTileset(id)).toBe(true);
			expect(getTileset(id)).toBeUndefined();
			expect(getTilesetByName('temp')).toBeUndefined();
		});

		it('returns false for non-existent tileset', () => {
			expect(unregisterTileset(999)).toBe(false);
		});
	});

	describe('resetTilesetStore', () => {
		it('clears all tilesets', () => {
			registerTileset({ name: 'a', tiles: [] });
			registerTileset({ name: 'b', tiles: [] });
			resetTilesetStore();
			expect(getTilesetByName('a')).toBeUndefined();
			expect(getTilesetByName('b')).toBeUndefined();
		});
	});

	// =========================================================================
	// Tile Data Store
	// =========================================================================

	describe('createTileData', () => {
		it('creates tile data with specified dimensions', () => {
			const dataId = createTileData(10, 8);
			const data = getTileData(dataId);
			expect(data).toBeDefined();
			expect(data?.width).toBe(10);
			expect(data?.height).toBe(8);
			expect(data?.layers.length).toBe(1);
		});

		it('creates multiple layers', () => {
			const dataId = createTileData(5, 5, 3);
			const data = getTileData(dataId);
			expect(data?.layers.length).toBe(3);
		});

		it('initializes tiles to EMPTY_TILE', () => {
			const dataId = createTileData(4, 4);
			expect(getTile(dataId, 0, 0, 0)).toBe(EMPTY_TILE);
			expect(getTile(dataId, 0, 3, 3)).toBe(EMPTY_TILE);
		});
	});

	describe('setTile / getTile', () => {
		it('sets and gets a tile', () => {
			const dataId = createTileData(10, 10);
			expect(setTile(dataId, 0, 5, 3, 2)).toBe(true);
			expect(getTile(dataId, 0, 5, 3)).toBe(2);
		});

		it('returns false for out-of-bounds set', () => {
			const dataId = createTileData(5, 5);
			expect(setTile(dataId, 0, -1, 0, 1)).toBe(false);
			expect(setTile(dataId, 0, 5, 0, 1)).toBe(false);
			expect(setTile(dataId, 0, 0, -1, 1)).toBe(false);
			expect(setTile(dataId, 0, 0, 5, 1)).toBe(false);
		});

		it('returns EMPTY_TILE for out-of-bounds get', () => {
			const dataId = createTileData(5, 5);
			expect(getTile(dataId, 0, -1, 0)).toBe(EMPTY_TILE);
			expect(getTile(dataId, 0, 5, 0)).toBe(EMPTY_TILE);
		});

		it('returns false for invalid data ID', () => {
			expect(setTile(999, 0, 0, 0, 1)).toBe(false);
			expect(getTile(999, 0, 0, 0)).toBe(EMPTY_TILE);
		});

		it('returns false for invalid layer index', () => {
			const dataId = createTileData(5, 5, 1);
			expect(setTile(dataId, 1, 0, 0, 1)).toBe(false);
			expect(getTile(dataId, 1, 0, 0)).toBe(EMPTY_TILE);
		});
	});

	describe('fillTiles', () => {
		it('fills an entire layer with a tile index', () => {
			const dataId = createTileData(4, 3);
			expect(fillTiles(dataId, 0, 1)).toBe(true);

			for (let y = 0; y < 3; y++) {
				for (let x = 0; x < 4; x++) {
					expect(getTile(dataId, 0, x, y)).toBe(1);
				}
			}
		});

		it('returns false for invalid data ID', () => {
			expect(fillTiles(999, 0, 1)).toBe(false);
		});
	});

	describe('fillTileRect', () => {
		it('fills a rectangular region', () => {
			const dataId = createTileData(10, 10);
			fillTiles(dataId, 0, 1); // fill with floor first
			expect(fillTileRect(dataId, 0, 2, 3, 3, 2, 5)).toBe(true);

			// Inside rect should be 5
			expect(getTile(dataId, 0, 2, 3)).toBe(5);
			expect(getTile(dataId, 0, 4, 4)).toBe(5);

			// Outside rect should still be 1
			expect(getTile(dataId, 0, 1, 3)).toBe(1);
			expect(getTile(dataId, 0, 5, 3)).toBe(1);
		});

		it('clips to map bounds', () => {
			const dataId = createTileData(5, 5);
			expect(fillTileRect(dataId, 0, -2, -2, 10, 10, 3)).toBe(true);

			// All tiles should be 3 (clipped to map bounds)
			for (let y = 0; y < 5; y++) {
				for (let x = 0; x < 5; x++) {
					expect(getTile(dataId, 0, x, y)).toBe(3);
				}
			}
		});

		it('returns false for invalid data ID', () => {
			expect(fillTileRect(999, 0, 0, 0, 1, 1, 1)).toBe(false);
		});
	});

	describe('getLayerCount / addLayer', () => {
		it('returns correct layer count', () => {
			const dataId = createTileData(5, 5, 2);
			expect(getLayerCount(dataId)).toBe(2);
		});

		it('adds a new layer', () => {
			const dataId = createTileData(5, 5, 1);
			const idx = addLayer(dataId);
			expect(idx).toBe(1);
			expect(getLayerCount(dataId)).toBe(2);
		});

		it('new layer tiles are empty', () => {
			const dataId = createTileData(4, 4, 1);
			addLayer(dataId);
			expect(getTile(dataId, 1, 0, 0)).toBe(EMPTY_TILE);
		});

		it('returns -1 for invalid data ID', () => {
			expect(addLayer(999)).toBe(-1);
		});

		it('returns 0 for invalid data ID layer count', () => {
			expect(getLayerCount(999)).toBe(0);
		});
	});

	describe('setLayerVisible / isLayerVisible', () => {
		it('sets and gets layer visibility', () => {
			const dataId = createTileData(5, 5, 2);
			expect(isLayerVisible(dataId, 0)).toBe(true);

			expect(setLayerVisible(dataId, 0, false)).toBe(true);
			expect(isLayerVisible(dataId, 0)).toBe(false);

			expect(setLayerVisible(dataId, 0, true)).toBe(true);
			expect(isLayerVisible(dataId, 0)).toBe(true);
		});

		it('returns false for invalid data or layer', () => {
			expect(setLayerVisible(999, 0, false)).toBe(false);
			expect(isLayerVisible(999, 0)).toBe(false);

			const dataId = createTileData(5, 5, 1);
			expect(setLayerVisible(dataId, 5, false)).toBe(false);
			expect(isLayerVisible(dataId, 5)).toBe(false);
		});
	});

	describe('removeTileData', () => {
		it('removes tile data', () => {
			const dataId = createTileData(5, 5);
			expect(removeTileData(dataId)).toBe(true);
			expect(getTileData(dataId)).toBeUndefined();
		});

		it('returns false for non-existent data', () => {
			expect(removeTileData(999)).toBe(false);
		});
	});

	// =========================================================================
	// TileMap Component
	// =========================================================================

	describe('setTileMap / getTileMap', () => {
		it('sets a tile map on an entity', () => {
			const eid = addEntity(world);
			const tilesetId = registerTileset({
				name: 'test',
				tiles: [{ char: ' ', fg: 0, bg: 0 }],
			});

			setTileMap(world, eid, {
				width: 20,
				height: 15,
				tilesetId,
			});

			expect(hasTileMap(world, eid)).toBe(true);
			const data = getTileMap(world, eid);
			expect(data).toBeDefined();
			expect(data?.width).toBe(20);
			expect(data?.height).toBe(15);
			expect(data?.tileWidth).toBe(1);
			expect(data?.tileHeight).toBe(1);
			expect(data?.tilesetId).toBe(tilesetId);
			expect(data?.dataId).toBeGreaterThan(0);
		});

		it('creates tile data automatically', () => {
			const eid = addEntity(world);
			const tilesetId = registerTileset({ name: 'test', tiles: [] });

			setTileMap(world, eid, { width: 10, height: 8, tilesetId });

			const dataId = getTileMapDataId(world, eid);
			expect(dataId).toBeGreaterThan(0);
			const tileData = getTileData(dataId);
			expect(tileData?.width).toBe(10);
			expect(tileData?.height).toBe(8);
		});

		it('uses provided data ID', () => {
			const eid = addEntity(world);
			const tilesetId = registerTileset({ name: 'test', tiles: [] });
			const dataId = createTileData(5, 5);

			setTileMap(world, eid, { width: 5, height: 5, tilesetId, dataId });
			expect(getTileMapDataId(world, eid)).toBe(dataId);
		});

		it('supports custom tile dimensions', () => {
			const eid = addEntity(world);
			const tilesetId = registerTileset({ name: 'test', tiles: [] });

			setTileMap(world, eid, {
				width: 10,
				height: 10,
				tileWidth: 2,
				tileHeight: 2,
				tilesetId,
			});

			const data = getTileMap(world, eid);
			expect(data?.tileWidth).toBe(2);
			expect(data?.tileHeight).toBe(2);
		});

		it('supports custom layer count', () => {
			const eid = addEntity(world);
			const tilesetId = registerTileset({ name: 'test', tiles: [] });

			setTileMap(world, eid, { width: 10, height: 10, tilesetId, layerCount: 3 });

			const dataId = getTileMapDataId(world, eid);
			expect(getLayerCount(dataId)).toBe(3);
		});
	});

	describe('hasTileMap', () => {
		it('returns false for entity without TileMap', () => {
			const eid = addEntity(world);
			expect(hasTileMap(world, eid)).toBe(false);
		});
	});

	describe('getTileMap returns undefined for missing component', () => {
		it('returns undefined', () => {
			const eid = addEntity(world);
			expect(getTileMap(world, eid)).toBeUndefined();
		});
	});

	describe('getTileMapDataId', () => {
		it('returns 0 for entity without TileMap', () => {
			const eid = addEntity(world);
			expect(getTileMapDataId(world, eid)).toBe(0);
		});
	});

	describe('removeTileMap', () => {
		it('removes the tile map and its data', () => {
			const eid = addEntity(world);
			const tilesetId = registerTileset({ name: 'test', tiles: [] });
			setTileMap(world, eid, { width: 5, height: 5, tilesetId });

			const dataId = getTileMapDataId(world, eid);
			removeTileMap(world, eid);

			expect(hasTileMap(world, eid)).toBe(false);
			expect(getTileData(dataId)).toBeUndefined();
		});

		it('keeps data when keepData is true', () => {
			const eid = addEntity(world);
			const tilesetId = registerTileset({ name: 'test', tiles: [] });
			setTileMap(world, eid, { width: 5, height: 5, tilesetId });

			const dataId = getTileMapDataId(world, eid);
			removeTileMap(world, eid, true);

			expect(hasTileMap(world, eid)).toBe(false);
			expect(getTileData(dataId)).toBeDefined();
		});

		it('is a no-op for entity without TileMap', () => {
			const eid = addEntity(world);
			removeTileMap(world, eid);
			// Should not throw
		});
	});

	// =========================================================================
	// renderTileMapArea
	// =========================================================================

	describe('renderTileMapArea', () => {
		it('renders tiles from a single layer', () => {
			const tilesetId = registerTileset({
				name: 'render-test',
				tiles: [
					{ char: ' ', fg: 0, bg: 0 },
					{ char: '.', fg: 0x888888ff, bg: 0 },
					{ char: '#', fg: 0xaaaaaaff, bg: 0x444444ff },
				],
			});
			const dataId = createTileData(4, 4);
			fillTiles(dataId, 0, 1); // fill with floor
			setTile(dataId, 0, 1, 1, 2); // place a wall

			const cells = renderTileMapArea(dataId, tilesetId, 0, 0, 4, 4);
			expect(cells.length).toBe(4);
			expect(cells[0]?.length).toBe(4);

			// Floor tile
			expect(cells[0]?.[0]?.char).toBe('.');
			// Wall tile
			expect(cells[1]?.[1]?.char).toBe('#');
		});

		it('renders empty cells for out-of-bounds area', () => {
			const tilesetId = registerTileset({ name: 'test', tiles: [] });
			const dataId = createTileData(2, 2);

			const cells = renderTileMapArea(dataId, tilesetId, 5, 5, 3, 3);
			expect(cells.length).toBe(3);
			// All out of bounds, should be empty
			expect(cells[0]?.[0]?.char).toBe(' ');
		});

		it('composites layers bottom to top', () => {
			const tilesetId = registerTileset({
				name: 'layers-test',
				tiles: [
					{ char: ' ', fg: 0, bg: 0 },
					{ char: '.', fg: 1, bg: 1 },
					{ char: '#', fg: 2, bg: 2 },
				],
			});
			const dataId = createTileData(4, 4, 2);
			fillTiles(dataId, 0, 1); // layer 0: all floor
			setTile(dataId, 1, 2, 2, 2); // layer 1: wall at (2,2)

			const cells = renderTileMapArea(dataId, tilesetId, 0, 0, 4, 4);

			// Layer 0 shows through where layer 1 is empty
			expect(cells[0]?.[0]?.char).toBe('.');
			// Layer 1 overrides layer 0
			expect(cells[2]?.[2]?.char).toBe('#');
		});

		it('skips hidden layers', () => {
			const tilesetId = registerTileset({
				name: 'hidden-test',
				tiles: [
					{ char: ' ', fg: 0, bg: 0 },
					{ char: '.', fg: 1, bg: 1 },
					{ char: '#', fg: 2, bg: 2 },
				],
			});
			const dataId = createTileData(4, 4, 2);
			fillTiles(dataId, 0, 1);
			fillTiles(dataId, 1, 2);
			setLayerVisible(dataId, 1, false);

			const cells = renderTileMapArea(dataId, tilesetId, 0, 0, 4, 4);
			// Only layer 0 is visible
			expect(cells[0]?.[0]?.char).toBe('.');
		});

		it('returns empty buffer for invalid data', () => {
			const cells = renderTileMapArea(999, 999, 0, 0, 3, 3);
			expect(cells.length).toBe(3);
			expect(cells[0]?.[0]?.char).toBe(' ');
		});

		it('handles viewport offset', () => {
			const tilesetId = registerTileset({
				name: 'offset-test',
				tiles: [
					{ char: ' ', fg: 0, bg: 0 },
					{ char: 'A', fg: 1, bg: 1 },
					{ char: 'B', fg: 2, bg: 2 },
				],
			});
			const dataId = createTileData(10, 10);
			setTile(dataId, 0, 5, 5, 1);
			setTile(dataId, 0, 6, 5, 2);

			// View starting at (5, 5) with size 3x3
			const cells = renderTileMapArea(dataId, tilesetId, 5, 5, 3, 3);
			expect(cells[0]?.[0]?.char).toBe('A'); // tile (5,5) mapped to view (0,0)
			expect(cells[0]?.[1]?.char).toBe('B'); // tile (6,5) mapped to view (1,0)
		});
	});
});
