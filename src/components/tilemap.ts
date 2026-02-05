/**
 * TileMap component for 2D tile-based game maps.
 *
 * Provides a tile map data structure with multiple layers,
 * tileset management, and per-entity SoA storage for tile map
 * metadata. Tile data is stored in an external side store
 * (Map-based) for variable-sized arrays.
 *
 * @module components/tilemap
 */

import { addComponent, hasComponent, removeComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Empty tile index (no tile rendered) */
export const EMPTY_TILE = 0;

// =============================================================================
// TILE DEFINITION AND TILESET
// =============================================================================

/**
 * A single tile definition in a tileset.
 *
 * @example
 * ```typescript
 * import type { TileDefinition } from 'blecsd';
 *
 * const grass: TileDefinition = { char: '.', fg: 0x00ff00ff, bg: 0x003300ff };
 * const wall: TileDefinition = { char: '#', fg: 0xaaaaaaff, bg: 0x444444ff };
 * ```
 */
export interface TileDefinition {
	/** Character to render for this tile */
	readonly char: string;
	/** Foreground color (packed RGBA) */
	readonly fg: number;
	/** Background color (packed RGBA) */
	readonly bg: number;
}

/**
 * Tileset data stored in the tileset store.
 */
export interface TilesetData {
	/** Unique tileset ID */
	readonly id: number;
	/** Human-readable name */
	readonly name: string;
	/** Array of tile definitions (index 0 = empty/transparent) */
	readonly tiles: readonly TileDefinition[];
}

/**
 * Options for registering a new tileset.
 */
export interface TilesetOptions {
	/** Human-readable name for the tileset */
	name: string;
	/** Array of tile definitions. Index 0 is conventionally empty/transparent. */
	tiles: TileDefinition[];
}

// =============================================================================
// TILESET STORE
// =============================================================================

let nextTilesetId = 1;

/**
 * Storage for tileset data.
 *
 * @example
 * ```typescript
 * import { registerTileset, getTileset } from 'blecsd';
 *
 * const tilesetId = registerTileset({
 *   name: 'dungeon',
 *   tiles: [
 *     { char: ' ', fg: 0, bg: 0 },           // 0: empty
 *     { char: '.', fg: 0x888888ff, bg: 0 },   // 1: floor
 *     { char: '#', fg: 0xaaaaaaff, bg: 0x444444ff }, // 2: wall
 *   ],
 * });
 * ```
 */
export const tilesetStore = {
	/** Map of tileset ID to data */
	tilesets: new Map<number, TilesetData>(),
	/** Map of tileset name to ID */
	nameToId: new Map<string, number>(),
};

/**
 * Resets the tileset store to initial state. Useful for testing.
 *
 * @example
 * ```typescript
 * import { resetTilesetStore } from 'blecsd';
 *
 * resetTilesetStore();
 * ```
 */
export function resetTilesetStore(): void {
	tilesetStore.tilesets.clear();
	tilesetStore.nameToId.clear();
	nextTilesetId = 1;
}

/**
 * Registers a new tileset and returns its ID.
 *
 * @param options - Tileset configuration
 * @returns The tileset ID
 *
 * @example
 * ```typescript
 * import { registerTileset } from 'blecsd';
 *
 * const tilesetId = registerTileset({
 *   name: 'overworld',
 *   tiles: [
 *     { char: ' ', fg: 0, bg: 0 },
 *     { char: '.', fg: 0x00ff00ff, bg: 0x003300ff },
 *     { char: '~', fg: 0x0000ffff, bg: 0x000066ff },
 *   ],
 * });
 * ```
 */
export function registerTileset(options: TilesetOptions): number {
	const id = nextTilesetId++;
	const data: TilesetData = {
		id,
		name: options.name,
		tiles: options.tiles,
	};
	tilesetStore.tilesets.set(id, data);
	tilesetStore.nameToId.set(options.name, id);
	return id;
}

/**
 * Gets a tileset by ID.
 *
 * @param id - The tileset ID
 * @returns The tileset data or undefined
 *
 * @example
 * ```typescript
 * import { getTileset } from 'blecsd';
 *
 * const tileset = getTileset(tilesetId);
 * if (tileset) {
 *   console.log(`Tileset: ${tileset.name}, ${tileset.tiles.length} tiles`);
 * }
 * ```
 */
export function getTileset(id: number): TilesetData | undefined {
	return tilesetStore.tilesets.get(id);
}

/**
 * Gets a tileset by name.
 *
 * @param name - The tileset name
 * @returns The tileset data or undefined
 *
 * @example
 * ```typescript
 * import { getTilesetByName } from 'blecsd';
 *
 * const tileset = getTilesetByName('dungeon');
 * ```
 */
export function getTilesetByName(name: string): TilesetData | undefined {
	const id = tilesetStore.nameToId.get(name);
	if (id === undefined) {
		return undefined;
	}
	return tilesetStore.tilesets.get(id);
}

/**
 * Unregisters a tileset.
 *
 * @param id - The tileset ID to remove
 * @returns true if removed, false if not found
 */
export function unregisterTileset(id: number): boolean {
	const tileset = tilesetStore.tilesets.get(id);
	if (!tileset) {
		return false;
	}
	tilesetStore.nameToId.delete(tileset.name);
	tilesetStore.tilesets.delete(id);
	return true;
}

// =============================================================================
// TILE MAP DATA STORE
// =============================================================================

/**
 * A single layer of tile data.
 */
export interface TileMapLayer {
	/** Flat array of tile indices (width * height), row-major order */
	readonly tiles: Uint16Array;
	/** Whether this layer is visible */
	visible: boolean;
}

/**
 * Tile map data stored in the side store.
 */
export interface TileMapData {
	/** Map width in tiles */
	readonly width: number;
	/** Map height in tiles */
	readonly height: number;
	/** Array of tile layers (bottom to top) */
	readonly layers: TileMapLayer[];
}

let nextTileDataId = 1;

/**
 * Storage for tile map layer data.
 * Maps data IDs to their tile data.
 */
export const tileMapStore = {
	/** Map of data ID to tile map data */
	data: new Map<number, TileMapData>(),
};

/**
 * Resets the tile map store to initial state. Useful for testing.
 *
 * @example
 * ```typescript
 * import { resetTileMapStore } from 'blecsd';
 *
 * resetTileMapStore();
 * ```
 */
export function resetTileMapStore(): void {
	tileMapStore.data.clear();
	nextTileDataId = 1;
}

/**
 * Creates tile map data with the specified dimensions and number of layers.
 * Returns the data ID for referencing in the TileMap component.
 *
 * @param width - Map width in tiles
 * @param height - Map height in tiles
 * @param layerCount - Number of layers (default: 1)
 * @returns The data ID
 *
 * @example
 * ```typescript
 * import { createTileData } from 'blecsd';
 *
 * const dataId = createTileData(32, 32, 2); // 32x32 map, 2 layers
 * ```
 */
export function createTileData(width: number, height: number, layerCount = 1): number {
	const id = nextTileDataId++;
	const layers: TileMapLayer[] = [];

	for (let i = 0; i < layerCount; i++) {
		layers.push({
			tiles: new Uint16Array(width * height),
			visible: true,
		});
	}

	tileMapStore.data.set(id, { width, height, layers });
	return id;
}

/**
 * Gets tile map data by ID.
 *
 * @param dataId - The data ID
 * @returns The tile map data or undefined
 */
export function getTileData(dataId: number): TileMapData | undefined {
	return tileMapStore.data.get(dataId);
}

/**
 * Removes tile map data.
 *
 * @param dataId - The data ID to remove
 * @returns true if removed, false if not found
 */
export function removeTileData(dataId: number): boolean {
	return tileMapStore.data.delete(dataId);
}

/**
 * Sets a tile at a specific position in a layer.
 *
 * @param dataId - The tile map data ID
 * @param layerIndex - The layer index (0-based)
 * @param x - X coordinate in tiles
 * @param y - Y coordinate in tiles
 * @param tileIndex - The tile index in the tileset
 * @returns true if set successfully, false if out of bounds or invalid
 *
 * @example
 * ```typescript
 * import { createTileData, setTile } from 'blecsd';
 *
 * const dataId = createTileData(10, 10);
 * setTile(dataId, 0, 5, 3, 2); // Set tile at (5,3) on layer 0 to tile index 2
 * ```
 */
export function setTile(
	dataId: number,
	layerIndex: number,
	x: number,
	y: number,
	tileIndex: number,
): boolean {
	const data = tileMapStore.data.get(dataId);
	if (!data) {
		return false;
	}

	const layer = data.layers[layerIndex];
	if (!layer) {
		return false;
	}

	if (x < 0 || x >= data.width || y < 0 || y >= data.height) {
		return false;
	}

	layer.tiles[y * data.width + x] = tileIndex;
	return true;
}

/**
 * Gets the tile index at a specific position in a layer.
 *
 * @param dataId - The tile map data ID
 * @param layerIndex - The layer index (0-based)
 * @param x - X coordinate in tiles
 * @param y - Y coordinate in tiles
 * @returns The tile index, or EMPTY_TILE if out of bounds
 *
 * @example
 * ```typescript
 * import { getTile, EMPTY_TILE } from 'blecsd';
 *
 * const tile = getTile(dataId, 0, 5, 3);
 * if (tile !== EMPTY_TILE) {
 *   // Tile is not empty
 * }
 * ```
 */
export function getTile(dataId: number, layerIndex: number, x: number, y: number): number {
	const data = tileMapStore.data.get(dataId);
	if (!data) {
		return EMPTY_TILE;
	}

	const layer = data.layers[layerIndex];
	if (!layer) {
		return EMPTY_TILE;
	}

	if (x < 0 || x >= data.width || y < 0 || y >= data.height) {
		return EMPTY_TILE;
	}

	return layer.tiles[y * data.width + x] as number;
}

/**
 * Fills an entire layer with a tile index.
 *
 * @param dataId - The tile map data ID
 * @param layerIndex - The layer index (0-based)
 * @param tileIndex - The tile index to fill with
 * @returns true if filled, false if invalid
 *
 * @example
 * ```typescript
 * import { createTileData, fillTiles } from 'blecsd';
 *
 * const dataId = createTileData(32, 32);
 * fillTiles(dataId, 0, 1); // Fill entire layer with tile 1 (floor)
 * ```
 */
export function fillTiles(dataId: number, layerIndex: number, tileIndex: number): boolean {
	const data = tileMapStore.data.get(dataId);
	if (!data) {
		return false;
	}

	const layer = data.layers[layerIndex];
	if (!layer) {
		return false;
	}

	layer.tiles.fill(tileIndex);
	return true;
}

/**
 * Fills a rectangular region of a layer with a tile index.
 *
 * @param dataId - The tile map data ID
 * @param layerIndex - The layer index
 * @param x - Start X coordinate
 * @param y - Start Y coordinate
 * @param width - Rectangle width in tiles
 * @param height - Rectangle height in tiles
 * @param tileIndex - The tile index to fill with
 * @returns true if filled, false if invalid
 *
 * @example
 * ```typescript
 * import { fillTileRect } from 'blecsd';
 *
 * // Create a 5x3 wall region at (2, 4)
 * fillTileRect(dataId, 0, 2, 4, 5, 3, 2);
 * ```
 */
export function fillTileRect(
	dataId: number,
	layerIndex: number,
	x: number,
	y: number,
	width: number,
	height: number,
	tileIndex: number,
): boolean {
	const data = tileMapStore.data.get(dataId);
	if (!data) {
		return false;
	}

	const layer = data.layers[layerIndex];
	if (!layer) {
		return false;
	}

	const startX = Math.max(0, x);
	const startY = Math.max(0, y);
	const endX = Math.min(data.width, x + width);
	const endY = Math.min(data.height, y + height);

	for (let ty = startY; ty < endY; ty++) {
		for (let tx = startX; tx < endX; tx++) {
			layer.tiles[ty * data.width + tx] = tileIndex;
		}
	}

	return true;
}

/**
 * Gets the number of layers in a tile map.
 *
 * @param dataId - The tile map data ID
 * @returns The number of layers, or 0 if invalid
 */
export function getLayerCount(dataId: number): number {
	const data = tileMapStore.data.get(dataId);
	if (!data) {
		return 0;
	}
	return data.layers.length;
}

/**
 * Adds a new empty layer to the tile map.
 *
 * @param dataId - The tile map data ID
 * @returns The new layer index, or -1 if invalid
 *
 * @example
 * ```typescript
 * import { addLayer } from 'blecsd';
 *
 * const layerIdx = addLayer(dataId);
 * // Now you can set tiles on the new layer
 * ```
 */
export function addLayer(dataId: number): number {
	const data = tileMapStore.data.get(dataId);
	if (!data) {
		return -1;
	}

	const newLayer: TileMapLayer = {
		tiles: new Uint16Array(data.width * data.height),
		visible: true,
	};
	data.layers.push(newLayer);
	return data.layers.length - 1;
}

/**
 * Sets the visibility of a layer.
 *
 * @param dataId - The tile map data ID
 * @param layerIndex - The layer index
 * @param visible - Whether the layer should be visible
 * @returns true if set, false if invalid
 *
 * @example
 * ```typescript
 * import { setLayerVisible } from 'blecsd';
 *
 * setLayerVisible(dataId, 1, false); // Hide layer 1
 * ```
 */
export function setLayerVisible(dataId: number, layerIndex: number, visible: boolean): boolean {
	const data = tileMapStore.data.get(dataId);
	if (!data) {
		return false;
	}

	const layer = data.layers[layerIndex];
	if (!layer) {
		return false;
	}

	layer.visible = visible;
	return true;
}

/**
 * Gets the visibility of a layer.
 *
 * @param dataId - The tile map data ID
 * @param layerIndex - The layer index
 * @returns true if visible, false if hidden or invalid
 */
export function isLayerVisible(dataId: number, layerIndex: number): boolean {
	const data = tileMapStore.data.get(dataId);
	if (!data) {
		return false;
	}

	const layer = data.layers[layerIndex];
	if (!layer) {
		return false;
	}

	return layer.visible;
}

// =============================================================================
// TILEMAP COMPONENT (per-entity data)
// =============================================================================

/**
 * TileMap component store using SoA (Structure of Arrays) for performance.
 *
 * - `width`: Map width in tiles
 * - `height`: Map height in tiles
 * - `tileWidth`: Tile width in terminal cells (for rendering)
 * - `tileHeight`: Tile height in terminal cells (for rendering)
 * - `dataId`: Reference to tile data in tileMapStore
 * - `tilesetId`: Reference to tileset in tilesetStore
 *
 * @example
 * ```typescript
 * import { TileMap, setTileMap, getTileMap } from 'blecsd';
 *
 * setTileMap(world, entity, {
 *   width: 32,
 *   height: 32,
 *   tileWidth: 1,
 *   tileHeight: 1,
 *   tilesetId: myTilesetId,
 * });
 * ```
 */
export const TileMap = {
	/** Map width in tiles */
	width: new Uint16Array(DEFAULT_CAPACITY),
	/** Map height in tiles */
	height: new Uint16Array(DEFAULT_CAPACITY),
	/** Tile width in terminal cells */
	tileWidth: new Uint8Array(DEFAULT_CAPACITY),
	/** Tile height in terminal cells */
	tileHeight: new Uint8Array(DEFAULT_CAPACITY),
	/** Reference to tile data in tileMapStore */
	dataId: new Uint32Array(DEFAULT_CAPACITY),
	/** Reference to tileset in tilesetStore */
	tilesetId: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * TileMap data returned by getTileMap.
 */
export interface TileMapComponentData {
	readonly width: number;
	readonly height: number;
	readonly tileWidth: number;
	readonly tileHeight: number;
	readonly dataId: number;
	readonly tilesetId: number;
}

/**
 * Options for creating a tile map on an entity.
 */
export interface TileMapOptions {
	/** Map width in tiles */
	width: number;
	/** Map height in tiles */
	height: number;
	/** Tile width in terminal cells (default: 1) */
	tileWidth?: number;
	/** Tile height in terminal cells (default: 1) */
	tileHeight?: number;
	/** Tileset ID to use for rendering */
	tilesetId: number;
	/** Number of layers (default: 1) */
	layerCount?: number;
	/** Existing data ID to use (skips creating new tile data) */
	dataId?: number;
}

/**
 * Initializes TileMap component with default values.
 */
function initTileMap(eid: Entity): void {
	TileMap.width[eid] = 0;
	TileMap.height[eid] = 0;
	TileMap.tileWidth[eid] = 1;
	TileMap.tileHeight[eid] = 1;
	TileMap.dataId[eid] = 0;
	TileMap.tilesetId[eid] = 0;
}

/**
 * Sets a tile map on an entity. Creates tile data if not provided.
 * Adds the TileMap component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Tile map options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setTileMap, registerTileset } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * const tilesetId = registerTileset({
 *   name: 'dungeon',
 *   tiles: [
 *     { char: ' ', fg: 0, bg: 0 },
 *     { char: '.', fg: 0x888888ff, bg: 0 },
 *     { char: '#', fg: 0xaaaaaaff, bg: 0x444444ff },
 *   ],
 * });
 *
 * setTileMap(world, entity, {
 *   width: 20,
 *   height: 15,
 *   tilesetId,
 * });
 * ```
 */
export function setTileMap(world: World, eid: Entity, options: TileMapOptions): Entity {
	if (!hasComponent(world, eid, TileMap)) {
		addComponent(world, eid, TileMap);
		initTileMap(eid);
	}

	TileMap.width[eid] = options.width;
	TileMap.height[eid] = options.height;
	TileMap.tileWidth[eid] = options.tileWidth ?? 1;
	TileMap.tileHeight[eid] = options.tileHeight ?? 1;
	TileMap.tilesetId[eid] = options.tilesetId;

	if (options.dataId !== undefined) {
		TileMap.dataId[eid] = options.dataId;
	} else {
		const dataId = createTileData(options.width, options.height, options.layerCount ?? 1);
		TileMap.dataId[eid] = dataId;
	}

	return eid;
}

/**
 * Gets the tile map data of an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns TileMap component data or undefined
 *
 * @example
 * ```typescript
 * import { getTileMap } from 'blecsd';
 *
 * const tileMap = getTileMap(world, entity);
 * if (tileMap) {
 *   console.log(`Map: ${tileMap.width}x${tileMap.height}`);
 * }
 * ```
 */
export function getTileMap(world: World, eid: Entity): TileMapComponentData | undefined {
	if (!hasComponent(world, eid, TileMap)) {
		return undefined;
	}
	return {
		width: TileMap.width[eid] as number,
		height: TileMap.height[eid] as number,
		tileWidth: TileMap.tileWidth[eid] as number,
		tileHeight: TileMap.tileHeight[eid] as number,
		dataId: TileMap.dataId[eid] as number,
		tilesetId: TileMap.tilesetId[eid] as number,
	};
}

/**
 * Checks if an entity has a TileMap component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has TileMap component
 */
export function hasTileMap(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, TileMap);
}

/**
 * Removes the tile map from an entity.
 * Also removes the associated tile data from the store.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param keepData - If true, does not remove tile data from store (default: false)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { removeTileMap } from 'blecsd';
 *
 * removeTileMap(world, entity);
 * ```
 */
export function removeTileMap(world: World, eid: Entity, keepData = false): Entity {
	if (!hasComponent(world, eid, TileMap)) {
		return eid;
	}

	if (!keepData) {
		const dataId = TileMap.dataId[eid] as number;
		if (dataId > 0) {
			tileMapStore.data.delete(dataId);
		}
	}

	removeComponent(world, eid, TileMap);
	return eid;
}

/**
 * Gets the data ID for an entity's tile map.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The data ID or 0 if not found
 */
export function getTileMapDataId(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, TileMap)) {
		return 0;
	}
	return TileMap.dataId[eid] as number;
}

// =============================================================================
// RENDERED TILE OUTPUT
// =============================================================================

/**
 * A single rendered cell from the tile map.
 */
export interface RenderedTileCell {
	/** Character to display */
	readonly char: string;
	/** Foreground color (packed RGBA) */
	readonly fg: number;
	/** Background color (packed RGBA) */
	readonly bg: number;
}

/** Default empty cell for rendering. */
const EMPTY_CELL: RenderedTileCell = { char: ' ', fg: 0, bg: 0 };

/**
 * Creates an empty row of rendered cells.
 */
function createEmptyRow(width: number): RenderedTileCell[] {
	const row: RenderedTileCell[] = [];
	for (let x = 0; x < width; x++) {
		row.push({ ...EMPTY_CELL });
	}
	return row;
}

/**
 * Composites all visible layers at a tile position into a single cell.
 */
function compositeTile(
	tileData: TileMapData,
	tileset: TilesetData,
	tx: number,
	ty: number,
): RenderedTileCell {
	if (tx < 0 || tx >= tileData.width || ty < 0 || ty >= tileData.height) {
		return EMPTY_CELL;
	}

	let cell: RenderedTileCell = EMPTY_CELL;

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
			cell = { char: tileDef.char, fg: tileDef.fg, bg: tileDef.bg };
		}
	}

	return cell;
}

/**
 * Renders a rectangular viewport of the tile map to an array of cells.
 * Composites all visible layers from bottom to top.
 * Non-empty tiles on upper layers overwrite lower layers.
 *
 * @param dataId - The tile map data ID
 * @param tilesetId - The tileset ID to use for rendering
 * @param viewX - Viewport X offset in tiles
 * @param viewY - Viewport Y offset in tiles
 * @param viewWidth - Viewport width in tiles
 * @param viewHeight - Viewport height in tiles
 * @returns 2D array of rendered cells (row-major: [y][x])
 *
 * @example
 * ```typescript
 * import { renderTileMapArea } from 'blecsd';
 *
 * // Render a 10x8 viewport starting at tile (5, 3)
 * const cells = renderTileMapArea(dataId, tilesetId, 5, 3, 10, 8);
 * for (let y = 0; y < cells.length; y++) {
 *   for (let x = 0; x < cells[y].length; x++) {
 *     const cell = cells[y][x];
 *     // Render cell.char with cell.fg and cell.bg
 *   }
 * }
 * ```
 */
export function renderTileMapArea(
	dataId: number,
	tilesetId: number,
	viewX: number,
	viewY: number,
	viewWidth: number,
	viewHeight: number,
): RenderedTileCell[][] {
	const tileData = tileMapStore.data.get(dataId);
	const tileset = tilesetStore.tilesets.get(tilesetId);

	const result: RenderedTileCell[][] = [];

	if (!tileData || !tileset) {
		for (let y = 0; y < viewHeight; y++) {
			result.push(createEmptyRow(viewWidth));
		}
		return result;
	}

	for (let vy = 0; vy < viewHeight; vy++) {
		const row: RenderedTileCell[] = [];
		for (let vx = 0; vx < viewWidth; vx++) {
			row.push(compositeTile(tileData, tileset, viewX + vx, viewY + vy));
		}
		result.push(row);
	}

	return result;
}
