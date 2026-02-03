/**
 * Type definitions for WAD file format and map data structures.
 * All types follow the original Doom WAD specification.
 *
 * @module wad/types
 */

import { z } from 'zod';

// ─── WAD File Format ───────────────────────────────────────────────

/** WAD file type: IWAD (main game data) or PWAD (patch/mod data). */
export type WadType = 'IWAD' | 'PWAD';

/** Parsed WAD file header. */
export interface WadHeader {
	readonly type: WadType;
	readonly numLumps: number;
	readonly directoryOffset: number;
}

/** A single entry in the WAD directory. */
export interface WadDirectoryEntry {
	readonly filepos: number;
	readonly size: number;
	readonly name: string;
}

/** A loaded WAD file with directory lookup. */
export interface WadFile {
	readonly header: WadHeader;
	readonly directory: readonly WadDirectoryEntry[];
	readonly data: DataView;
	readonly raw: Uint8Array;
}

// ─── Map Data Structures ───────────────────────────────────────────

/** A map thing (monster, item, player start, etc.). 10 bytes in WAD. */
export interface MapThing {
	readonly x: number;
	readonly y: number;
	readonly angle: number;
	readonly type: number;
	readonly flags: number;
}

/** Thing spawn flags bitmask. */
export const ThingFlags = {
	EASY: 1,
	NORMAL: 2,
	HARD: 4,
	AMBUSH: 8,
	MULTIPLAYER: 16,
} as const;

/** A linedef connecting two vertices. 14 bytes in WAD. */
export interface MapLinedef {
	readonly v1: number;
	readonly v2: number;
	readonly flags: number;
	readonly special: number;
	readonly tag: number;
	readonly frontSidedef: number;
	readonly backSidedef: number;
}

/** Linedef flags bitmask. */
export const LinedefFlags = {
	BLOCKING: 1,
	BLOCK_MONSTERS: 2,
	TWO_SIDED: 4,
	DONT_PEG_TOP: 8,
	DONT_PEG_BOTTOM: 16,
	SECRET: 32,
	BLOCK_SOUND: 64,
	DONT_DRAW: 128,
	MAPPED: 256,
} as const;

/** A sidedef with texture references. 30 bytes in WAD. */
export interface MapSidedef {
	readonly textureOffset: number;
	readonly rowOffset: number;
	readonly topTexture: string;
	readonly bottomTexture: string;
	readonly midTexture: string;
	readonly sector: number;
}

/** A 2D vertex. 4 bytes in WAD. */
export interface MapVertex {
	readonly x: number;
	readonly y: number;
}

/** A BSP segment. 12 bytes in WAD. */
export interface MapSeg {
	readonly v1: number;
	readonly v2: number;
	readonly angle: number;
	readonly linedef: number;
	readonly side: number;
	readonly offset: number;
}

/** A subsector (convex BSP leaf). 4 bytes in WAD. */
export interface MapSubsector {
	readonly numSegs: number;
	readonly firstSeg: number;
}

/** Bounding box: top, bottom, left, right. */
export interface BBox {
	readonly top: number;
	readonly bottom: number;
	readonly left: number;
	readonly right: number;
}

/** A BSP tree node. 28 bytes in WAD. */
export interface MapNode {
	readonly x: number;
	readonly y: number;
	readonly dx: number;
	readonly dy: number;
	readonly rightBBox: BBox;
	readonly leftBBox: BBox;
	readonly rightChild: number;
	readonly leftChild: number;
}

/** Bit flag indicating a BSP child is a subsector (leaf node). */
export const NF_SUBSECTOR = 0x8000;

/** A sector (floor/ceiling region). 26 bytes in WAD. */
export interface MapSector {
	readonly floorHeight: number;
	readonly ceilingHeight: number;
	readonly floorFlat: string;
	readonly ceilingFlat: string;
	readonly lightLevel: number;
	readonly special: number;
	readonly tag: number;
}

/** Blockmap header. */
export interface BlockmapHeader {
	readonly originX: number;
	readonly originY: number;
	readonly columns: number;
	readonly rows: number;
}

/** Complete blockmap data. */
export interface Blockmap {
	readonly header: BlockmapHeader;
	readonly offsets: readonly number[];
	readonly data: DataView;
}

/** All parsed map data for a single level. */
export interface MapData {
	readonly name: string;
	readonly things: readonly MapThing[];
	readonly linedefs: readonly MapLinedef[];
	readonly sidedefs: readonly MapSidedef[];
	readonly vertexes: readonly MapVertex[];
	readonly segs: readonly MapSeg[];
	readonly subsectors: readonly MapSubsector[];
	readonly nodes: readonly MapNode[];
	readonly sectors: readonly MapSector[];
	readonly blockmap: Blockmap;
}

// ─── Texture and Graphics Types ────────────────────────────────────

/** RGB color from PLAYPAL. */
export interface PaletteColor {
	readonly r: number;
	readonly g: number;
	readonly b: number;
}

/** A 256-color palette. */
export type Palette = readonly PaletteColor[];

/** All 14 palettes from PLAYPAL. */
export type PlayPal = readonly Palette[];

/** 34 colormaps x 256 entries for light diminishing. */
export type ColorMap = readonly Uint8Array[];

/** A single column post (run of opaque pixels). */
export interface PicturePost {
	readonly topDelta: number;
	readonly pixels: Uint8Array;
}

/** A column of posts in a picture. */
export type PictureColumn = readonly PicturePost[];

/** A parsed Doom picture (patch or sprite). */
export interface Picture {
	readonly width: number;
	readonly height: number;
	readonly leftOffset: number;
	readonly topOffset: number;
	readonly columns: readonly PictureColumn[];
}

/** A patch placement within a composite texture. */
export interface TexturePatch {
	readonly originX: number;
	readonly originY: number;
	readonly patchIndex: number;
}

/** A composite wall texture definition from TEXTURE1/TEXTURE2. */
export interface TextureDef {
	readonly name: string;
	readonly width: number;
	readonly height: number;
	readonly patches: readonly TexturePatch[];
}

/** A flat (floor/ceiling texture): raw 64x64 palette indices. */
export interface Flat {
	readonly name: string;
	readonly pixels: Uint8Array;
}

// ─── Zod Schemas (boundary validation) ─────────────────────────────

export const WadHeaderSchema = z.object({
	type: z.enum(['IWAD', 'PWAD']),
	numLumps: z.number().int().nonnegative(),
	directoryOffset: z.number().int().nonnegative(),
});

export const WadDirectoryEntrySchema = z.object({
	filepos: z.number().int().nonnegative(),
	size: z.number().int().nonnegative(),
	name: z.string().max(8),
});
