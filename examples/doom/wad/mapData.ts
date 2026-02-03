/**
 * Parser for Doom map data lumps.
 *
 * A map consists of a marker lump (e.g., E1M1) followed by these lumps:
 * THINGS, LINEDEFS, SIDEDEFS, VERTEXES, SEGS, SSECTORS, NODES, SECTORS,
 * REJECT, BLOCKMAP.
 *
 * @module wad/mapData
 */

import type {
	Blockmap,
	BlockmapHeader,
	MapData,
	MapLinedef,
	MapNode,
	MapSector,
	MapSeg,
	MapSidedef,
	MapSubsector,
	MapThing,
	MapVertex,
} from './types.js';
import type { WadFile } from './types.js';
import { findLumpIndex, getLumpData } from './wad.js';

// ─── Individual Lump Parsers ───────────────────────────────────────

/**
 * Parse THINGS lump. Each thing is 10 bytes.
 *
 * @param data - Raw lump bytes
 * @returns Array of parsed things
 */
export function parseThings(data: Uint8Array): readonly MapThing[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const count = Math.floor(data.length / 10);
	const things: MapThing[] = [];

	for (let i = 0; i < count; i++) {
		const offset = i * 10;
		things.push({
			x: view.getInt16(offset, true),
			y: view.getInt16(offset + 2, true),
			angle: view.getInt16(offset + 4, true),
			type: view.getInt16(offset + 6, true),
			flags: view.getInt16(offset + 8, true),
		});
	}

	return things;
}

/**
 * Parse LINEDEFS lump. Each linedef is 14 bytes.
 *
 * @param data - Raw lump bytes
 * @returns Array of parsed linedefs
 */
export function parseLinedefs(data: Uint8Array): readonly MapLinedef[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const count = Math.floor(data.length / 14);
	const linedefs: MapLinedef[] = [];

	for (let i = 0; i < count; i++) {
		const offset = i * 14;
		linedefs.push({
			v1: view.getUint16(offset, true),
			v2: view.getUint16(offset + 2, true),
			flags: view.getInt16(offset + 4, true),
			special: view.getInt16(offset + 6, true),
			tag: view.getInt16(offset + 8, true),
			frontSidedef: view.getUint16(offset + 10, true),
			backSidedef: view.getUint16(offset + 12, true),
		});
	}

	return linedefs;
}

/**
 * Parse SIDEDEFS lump. Each sidedef is 30 bytes.
 *
 * @param data - Raw lump bytes
 * @returns Array of parsed sidedefs
 */
export function parseSidedefs(data: Uint8Array): readonly MapSidedef[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const count = Math.floor(data.length / 30);
	const sidedefs: MapSidedef[] = [];

	for (let i = 0; i < count; i++) {
		const offset = i * 30;
		sidedefs.push({
			textureOffset: view.getInt16(offset, true),
			rowOffset: view.getInt16(offset + 2, true),
			topTexture: readTextureName(data, offset + 4),
			bottomTexture: readTextureName(data, offset + 12),
			midTexture: readTextureName(data, offset + 20),
			sector: view.getInt16(offset + 28, true),
		});
	}

	return sidedefs;
}

/**
 * Parse VERTEXES lump. Each vertex is 4 bytes.
 *
 * @param data - Raw lump bytes
 * @returns Array of parsed vertices
 */
export function parseVertexes(data: Uint8Array): readonly MapVertex[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const count = Math.floor(data.length / 4);
	const vertexes: MapVertex[] = [];

	for (let i = 0; i < count; i++) {
		const offset = i * 4;
		vertexes.push({
			x: view.getInt16(offset, true),
			y: view.getInt16(offset + 2, true),
		});
	}

	return vertexes;
}

/**
 * Parse SEGS lump. Each seg is 12 bytes.
 *
 * @param data - Raw lump bytes
 * @returns Array of parsed segs
 */
export function parseSegs(data: Uint8Array): readonly MapSeg[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const count = Math.floor(data.length / 12);
	const segs: MapSeg[] = [];

	for (let i = 0; i < count; i++) {
		const offset = i * 12;
		segs.push({
			v1: view.getUint16(offset, true),
			v2: view.getUint16(offset + 2, true),
			angle: view.getInt16(offset + 4, true),
			linedef: view.getUint16(offset + 6, true),
			side: view.getInt16(offset + 8, true),
			offset: view.getInt16(offset + 10, true),
		});
	}

	return segs;
}

/**
 * Parse SSECTORS lump. Each subsector is 4 bytes.
 *
 * @param data - Raw lump bytes
 * @returns Array of parsed subsectors
 */
export function parseSubsectors(data: Uint8Array): readonly MapSubsector[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const count = Math.floor(data.length / 4);
	const subsectors: MapSubsector[] = [];

	for (let i = 0; i < count; i++) {
		const offset = i * 4;
		subsectors.push({
			numSegs: view.getUint16(offset, true),
			firstSeg: view.getUint16(offset + 2, true),
		});
	}

	return subsectors;
}

/**
 * Parse NODES lump. Each node is 28 bytes.
 *
 * @param data - Raw lump bytes
 * @returns Array of parsed BSP nodes
 */
export function parseNodes(data: Uint8Array): readonly MapNode[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const count = Math.floor(data.length / 28);
	const nodes: MapNode[] = [];

	for (let i = 0; i < count; i++) {
		const offset = i * 28;
		nodes.push({
			x: view.getInt16(offset, true),
			y: view.getInt16(offset + 2, true),
			dx: view.getInt16(offset + 4, true),
			dy: view.getInt16(offset + 6, true),
			rightBBox: {
				top: view.getInt16(offset + 8, true),
				bottom: view.getInt16(offset + 10, true),
				left: view.getInt16(offset + 12, true),
				right: view.getInt16(offset + 14, true),
			},
			leftBBox: {
				top: view.getInt16(offset + 16, true),
				bottom: view.getInt16(offset + 18, true),
				left: view.getInt16(offset + 20, true),
				right: view.getInt16(offset + 22, true),
			},
			rightChild: view.getUint16(offset + 24, true),
			leftChild: view.getUint16(offset + 26, true),
		});
	}

	return nodes;
}

/**
 * Parse SECTORS lump. Each sector is 26 bytes.
 *
 * @param data - Raw lump bytes
 * @returns Array of parsed sectors
 */
export function parseSectors(data: Uint8Array): readonly MapSector[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const count = Math.floor(data.length / 26);
	const sectors: MapSector[] = [];

	for (let i = 0; i < count; i++) {
		const offset = i * 26;
		sectors.push({
			floorHeight: view.getInt16(offset, true),
			ceilingHeight: view.getInt16(offset + 2, true),
			floorFlat: readTextureName(data, offset + 4),
			ceilingFlat: readTextureName(data, offset + 12),
			lightLevel: view.getInt16(offset + 20, true),
			special: view.getInt16(offset + 22, true),
			tag: view.getInt16(offset + 24, true),
		});
	}

	return sectors;
}

/**
 * Parse BLOCKMAP lump.
 *
 * @param data - Raw lump bytes
 * @returns Parsed blockmap with header, offset table, and raw data
 */
export function parseBlockmap(data: Uint8Array): Blockmap {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

	const header: BlockmapHeader = {
		originX: view.getInt16(0, true),
		originY: view.getInt16(2, true),
		columns: view.getInt16(4, true),
		rows: view.getInt16(6, true),
	};

	const numCells = header.columns * header.rows;
	const offsets: number[] = [];
	for (let i = 0; i < numCells; i++) {
		offsets.push(view.getUint16(8 + i * 2, true));
	}

	return { header, offsets, data: view };
}

// ─── Full Map Loading ──────────────────────────────────────────────

/** Map lump names in the order they follow a map marker. */
const MAP_LUMP_NAMES = [
	'THINGS',
	'LINEDEFS',
	'SIDEDEFS',
	'VERTEXES',
	'SEGS',
	'SSECTORS',
	'NODES',
	'SECTORS',
	'REJECT',
	'BLOCKMAP',
] as const;

/**
 * Load and parse all data for a complete map.
 *
 * @param wad - Loaded WAD file
 * @param mapName - Map name (e.g., 'E1M1', 'MAP01')
 * @returns Complete parsed map data
 * @throws If the map or any required lump is not found
 *
 * @example
 * ```typescript
 * const wad = loadWad('./doom1.wad');
 * const map = loadMap(wad, 'E1M1');
 * console.log(map.things.length); // number of things in E1M1
 * console.log(map.nodes.length);  // number of BSP nodes
 * ```
 */
export function loadMap(wad: WadFile, mapName: string): MapData {
	const markerIndex = findLumpIndex(wad, mapName);
	if (markerIndex === -1) {
		throw new Error(`Map "${mapName}" not found in WAD`);
	}

	// Map lumps follow immediately after the marker
	const lumps = new Map<string, Uint8Array>();
	for (let i = 0; i < MAP_LUMP_NAMES.length; i++) {
		const expectedName = MAP_LUMP_NAMES[i];
		const entry = wad.directory[markerIndex + 1 + i];
		if (!entry || !expectedName) {
			throw new Error(`Missing map lump at index ${markerIndex + 1 + i}`);
		}
		if (entry.name !== expectedName) {
			throw new Error(
				`Expected lump "${expectedName}" at index ${markerIndex + 1 + i}, got "${entry.name}"`,
			);
		}
		lumps.set(expectedName, getLumpData(wad, entry));
	}

	const requireData = (name: string): Uint8Array => {
		const data = lumps.get(name);
		if (!data) throw new Error(`Missing map lump: ${name}`);
		return data;
	};

	return {
		name: mapName.toUpperCase(),
		things: parseThings(requireData('THINGS')),
		linedefs: parseLinedefs(requireData('LINEDEFS')),
		sidedefs: parseSidedefs(requireData('SIDEDEFS')),
		vertexes: parseVertexes(requireData('VERTEXES')),
		segs: parseSegs(requireData('SEGS')),
		subsectors: parseSubsectors(requireData('SSECTORS')),
		nodes: parseNodes(requireData('NODES')),
		sectors: parseSectors(requireData('SECTORS')),
		blockmap: parseBlockmap(requireData('BLOCKMAP')),
	};
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Read an 8-byte null-padded texture name from raw data.
 * Returns '-' for empty/null textures.
 */
function readTextureName(data: Uint8Array, offset: number): string {
	let name = '';
	for (let i = 0; i < 8; i++) {
		const byte = data[offset + i];
		if (byte === undefined || byte === 0) break;
		name += String.fromCharCode(byte);
	}
	return name.toUpperCase() || '-';
}

/**
 * Get the linedefs in a specific blockmap cell.
 *
 * @param blockmap - Parsed blockmap
 * @param cellX - Cell column index
 * @param cellY - Cell row index
 * @returns Array of linedef indices, or empty array if out of bounds
 */
export function getBlockmapCell(
	blockmap: Blockmap,
	cellX: number,
	cellY: number,
): readonly number[] {
	if (cellX < 0 || cellX >= blockmap.header.columns) return [];
	if (cellY < 0 || cellY >= blockmap.header.rows) return [];

	const cellIndex = cellY * blockmap.header.columns + cellX;
	const offset = blockmap.offsets[cellIndex];
	if (offset === undefined) return [];

	const linedefs: number[] = [];
	// Offsets are in units of int16s from the start of the lump
	let pos = offset * 2;

	// Skip the leading 0x0000
	const first = blockmap.data.getInt16(pos, true);
	if (first !== 0) return [];
	pos += 2;

	// Read linedef indices until 0xFFFF (-1)
	for (;;) {
		if (pos + 2 > blockmap.data.byteLength) break;
		const linedef = blockmap.data.getInt16(pos, true);
		if (linedef === -1) break;
		linedefs.push(linedef);
		pos += 2;
	}

	return linedefs;
}
