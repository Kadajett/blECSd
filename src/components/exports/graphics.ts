/**
 * Graphics components (sprite, tilemap)
 * @module components/exports/graphics
 */

// Sprite component
export type {
	SpriteCell,
	SpriteData,
	SpriteFrame,
	SpriteSheetData,
	SpriteSheetOptions,
} from '../sprite';
export {
	getCurrentFrame,
	getEntitySpriteSheet,
	getSprite,
	getSpriteIdByName,
	getSpriteSheet,
	getSpriteSheetByName,
	hasSprite,
	nextFrame,
	prevFrame,
	registerSprite,
	removeSprite,
	resetSpriteStore,
	Sprite,
	setFrame,
	setSprite,
	setSpriteByName,
	spriteStore,
	unregisterSprite,
} from '../sprite';

// TileMap component
export type {
	RenderedTileCell,
	TileDefinition,
	TileMapComponentData,
	TileMapData,
	TileMapLayer,
	TileMapOptions,
	TilesetData,
	TilesetOptions,
} from '../tilemap';
export {
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
	TileMap,
	tileMapStore,
	tilesetStore,
	unregisterTileset,
} from '../tilemap';
