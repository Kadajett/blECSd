/**
 * Tests for the TileMap rendering system.
 * @module systems/tilemapRenderer.test
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { setPosition } from '../components/position';
import {
	fillTiles,
	getTileMapDataId,
	registerTileset,
	resetTileMapStore,
	resetTilesetStore,
	setTile,
	setTileMap,
	TileMap,
} from '../components/tilemap';
import { addComponent, addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	clearTileMapRenderBuffer,
	createEmptyBuffer,
	getTileMapRenderBuffer,
	getTileMapRendererConfig,
	renderAllTileMaps,
	renderTileMapToBuffer,
	resetTileMapRenderer,
	setTileMapRendererConfig,
	tilemapRenderSystem,
} from './tilemapRenderer';

describe('tilemapRenderer', () => {
	let world: World;
	let tilesetId: number;

	beforeEach(() => {
		world = createWorld();
		resetTilesetStore();
		resetTileMapStore();
		resetTileMapRenderer();

		tilesetId = registerTileset({
			name: 'test',
			tiles: [
				{ char: ' ', fg: 0, bg: 0 },
				{ char: '.', fg: 0x888888ff, bg: 0 },
				{ char: '#', fg: 0xaaaaaaff, bg: 0x444444ff },
				{ char: '~', fg: 0x0000ffff, bg: 0x000066ff },
			],
		});
	});

	// =========================================================================
	// Renderer Config
	// =========================================================================

	describe('setTileMapRendererConfig / getTileMapRendererConfig', () => {
		it('sets and gets renderer config', () => {
			setTileMapRendererConfig({
				viewportWidth: 80,
				viewportHeight: 24,
				camera: { x: 0, y: 0 },
			});

			const config = getTileMapRendererConfig();
			expect(config).toBeDefined();
			expect(config?.viewportWidth).toBe(80);
			expect(config?.viewportHeight).toBe(24);
		});

		it('returns null when not set', () => {
			expect(getTileMapRendererConfig()).toBeNull();
		});
	});

	describe('resetTileMapRenderer', () => {
		it('clears config and buffer', () => {
			setTileMapRendererConfig({
				viewportWidth: 80,
				viewportHeight: 24,
				camera: { x: 0, y: 0 },
			});
			renderAllTileMaps(world);

			resetTileMapRenderer();
			expect(getTileMapRendererConfig()).toBeNull();
			expect(getTileMapRenderBuffer()).toBeNull();
		});
	});

	// =========================================================================
	// createEmptyBuffer
	// =========================================================================

	describe('createEmptyBuffer', () => {
		it('creates a buffer with correct dimensions', () => {
			const buffer = createEmptyBuffer(10, 5);
			expect(buffer.width).toBe(10);
			expect(buffer.height).toBe(5);
			expect(buffer.cells.length).toBe(5);
			expect(buffer.cells[0]?.length).toBe(10);
		});

		it('fills cells with empty space', () => {
			const buffer = createEmptyBuffer(3, 3);
			expect(buffer.cells[0]?.[0]?.char).toBe(' ');
			expect(buffer.cells[0]?.[0]?.fg).toBe(0);
			expect(buffer.cells[0]?.[0]?.bg).toBe(0);
		});
	});

	// =========================================================================
	// renderTileMapToBuffer
	// =========================================================================

	describe('renderTileMapToBuffer', () => {
		it('renders a tile map at entity position', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setTileMap(world, eid, { width: 5, height: 5, tilesetId });

			const dataId = getTileMapDataId(world, eid);
			fillTiles(dataId, 0, 1);
			setTile(dataId, 0, 2, 2, 2);

			const buffer = createEmptyBuffer(10, 10);
			renderTileMapToBuffer(buffer, eid, 0, 0);

			// Floor tiles
			expect(buffer.cells[0]?.[0]?.char).toBe('.');
			// Wall tile at (2,2)
			expect(buffer.cells[2]?.[2]?.char).toBe('#');
		});

		it('handles camera offset', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setTileMap(world, eid, { width: 10, height: 10, tilesetId });

			const dataId = getTileMapDataId(world, eid);
			setTile(dataId, 0, 5, 5, 2);

			const buffer = createEmptyBuffer(10, 10);
			// Camera at (3, 3) means tile (5,5) should appear at screen (2,2)
			renderTileMapToBuffer(buffer, eid, 3, 3);
			expect(buffer.cells[2]?.[2]?.char).toBe('#');
		});

		it('handles entity position offset', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 5, 3);
			setTileMap(world, eid, { width: 5, height: 5, tilesetId });

			const dataId = getTileMapDataId(world, eid);
			setTile(dataId, 0, 0, 0, 2);

			const buffer = createEmptyBuffer(20, 20);
			renderTileMapToBuffer(buffer, eid, 0, 0);
			// Tile (0,0) with entity at (5,3) should appear at screen (5,3)
			expect(buffer.cells[3]?.[5]?.char).toBe('#');
		});

		it('clips tiles outside buffer', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setTileMap(world, eid, { width: 20, height: 20, tilesetId });

			const dataId = getTileMapDataId(world, eid);
			fillTiles(dataId, 0, 1);

			const buffer = createEmptyBuffer(5, 5);
			renderTileMapToBuffer(buffer, eid, 0, 0);

			// Only the visible 5x5 area should be rendered
			expect(buffer.cells[0]?.[0]?.char).toBe('.');
			expect(buffer.cells[4]?.[4]?.char).toBe('.');
		});

		it('handles missing tile data gracefully', () => {
			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			addComponent(world, eid, TileMap);
			TileMap.dataId[eid] = 999;
			TileMap.tilesetId[eid] = 999;

			const buffer = createEmptyBuffer(5, 5);
			renderTileMapToBuffer(buffer, eid, 0, 0);
			// Should not throw, buffer should remain empty
			expect(buffer.cells[0]?.[0]?.char).toBe(' ');
		});
	});

	// =========================================================================
	// renderAllTileMaps
	// =========================================================================

	describe('renderAllTileMaps', () => {
		it('renders all tile map entities', () => {
			setTileMapRendererConfig({
				viewportWidth: 20,
				viewportHeight: 10,
				camera: { x: 0, y: 0 },
			});

			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setTileMap(world, eid, { width: 10, height: 10, tilesetId });
			const dataId = getTileMapDataId(world, eid);
			fillTiles(dataId, 0, 1);

			const buffer = renderAllTileMaps(world);
			expect(buffer).toBeDefined();
			expect(buffer?.width).toBe(20);
			expect(buffer?.height).toBe(10);
			expect(buffer?.cells[0]?.[0]?.char).toBe('.');
		});

		it('returns null without config', () => {
			const buffer = renderAllTileMaps(world);
			expect(buffer).toBeNull();
		});

		it('stores buffer for later retrieval', () => {
			setTileMapRendererConfig({
				viewportWidth: 10,
				viewportHeight: 10,
				camera: { x: 0, y: 0 },
			});

			renderAllTileMaps(world);
			expect(getTileMapRenderBuffer()).toBeDefined();
		});

		it('uses camera offset', () => {
			setTileMapRendererConfig({
				viewportWidth: 10,
				viewportHeight: 10,
				camera: { x: 5, y: 5 },
			});

			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setTileMap(world, eid, { width: 20, height: 20, tilesetId });
			const dataId = getTileMapDataId(world, eid);
			setTile(dataId, 0, 5, 5, 2);

			const buffer = renderAllTileMaps(world);
			// Tile at world (5,5) with camera at (5,5) should appear at screen (0,0)
			expect(buffer?.cells[0]?.[0]?.char).toBe('#');
		});
	});

	// =========================================================================
	// clearTileMapRenderBuffer
	// =========================================================================

	describe('clearTileMapRenderBuffer', () => {
		it('clears the render buffer', () => {
			setTileMapRendererConfig({
				viewportWidth: 10,
				viewportHeight: 10,
				camera: { x: 0, y: 0 },
			});
			renderAllTileMaps(world);
			expect(getTileMapRenderBuffer()).toBeDefined();

			clearTileMapRenderBuffer();
			expect(getTileMapRenderBuffer()).toBeNull();
		});
	});

	// =========================================================================
	// tilemapRenderSystem
	// =========================================================================

	describe('tilemapRenderSystem', () => {
		it('renders tile maps when system runs', () => {
			setTileMapRendererConfig({
				viewportWidth: 10,
				viewportHeight: 10,
				camera: { x: 0, y: 0 },
			});

			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setTileMap(world, eid, { width: 5, height: 5, tilesetId });
			const dataId = getTileMapDataId(world, eid);
			fillTiles(dataId, 0, 1);

			tilemapRenderSystem(world);

			const buffer = getTileMapRenderBuffer();
			expect(buffer).toBeDefined();
			expect(buffer?.cells[0]?.[0]?.char).toBe('.');
		});

		it('returns the world', () => {
			const result = tilemapRenderSystem(world);
			expect(result).toBe(world);
		});
	});

	// =========================================================================
	// Multi-layer rendering
	// =========================================================================

	describe('multi-layer rendering', () => {
		it('composites layers correctly in system', () => {
			setTileMapRendererConfig({
				viewportWidth: 10,
				viewportHeight: 10,
				camera: { x: 0, y: 0 },
			});

			const eid = addEntity(world);
			setPosition(world, eid, 0, 0);
			setTileMap(world, eid, {
				width: 5,
				height: 5,
				tilesetId,
				layerCount: 2,
			});

			const dataId = getTileMapDataId(world, eid);
			fillTiles(dataId, 0, 1); // layer 0: all floor
			setTile(dataId, 1, 2, 2, 3); // layer 1: water at (2,2)

			tilemapRenderSystem(world);

			const buffer = getTileMapRenderBuffer();
			expect(buffer?.cells[0]?.[0]?.char).toBe('.'); // floor shows through
			expect(buffer?.cells[2]?.[2]?.char).toBe('~'); // water on top
		});
	});
});
