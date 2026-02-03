import { describe, expect, it } from 'vitest';
import {
	parseThings,
	parseLinedefs,
	parseSidedefs,
	parseVertexes,
	parseSegs,
	parseSubsectors,
	parseNodes,
	parseSectors,
	parseBlockmap,
	getBlockmapCell,
} from './mapData.js';

// ─── Helper to build little-endian binary data ─────────────────────

function buildInt16LE(values: number[]): Uint8Array {
	const buf = new ArrayBuffer(values.length * 2);
	const view = new DataView(buf);
	for (let i = 0; i < values.length; i++) {
		view.setInt16(i * 2, values[i]!, true);
	}
	return new Uint8Array(buf);
}

function buildUint16LE(values: number[]): Uint8Array {
	const buf = new ArrayBuffer(values.length * 2);
	const view = new DataView(buf);
	for (let i = 0; i < values.length; i++) {
		view.setUint16(i * 2, values[i]!, true);
	}
	return new Uint8Array(buf);
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('parseThings', () => {
	it('parses a single thing (10 bytes)', () => {
		const data = buildInt16LE([100, 200, 90, 1, 7]);
		const things = parseThings(data);

		expect(things.length).toBe(1);
		expect(things[0]?.x).toBe(100);
		expect(things[0]?.y).toBe(200);
		expect(things[0]?.angle).toBe(90);
		expect(things[0]?.type).toBe(1); // player start
		expect(things[0]?.flags).toBe(7); // easy + normal + hard
	});

	it('parses multiple things', () => {
		const data = buildInt16LE([
			10, 20, 0, 3004, 7,  // zombieman
			30, 40, 180, 9, 6,   // shotgun guy
		]);
		const things = parseThings(data);

		expect(things.length).toBe(2);
		expect(things[0]?.type).toBe(3004);
		expect(things[1]?.type).toBe(9);
		expect(things[1]?.angle).toBe(180);
	});

	it('returns empty for empty data', () => {
		expect(parseThings(new Uint8Array([]))).toEqual([]);
	});
});

describe('parseLinedefs', () => {
	it('parses a single linedef (14 bytes)', () => {
		// v1=0, v2=1, flags=1(blocking), special=0, tag=0, front=0, back=0xFFFF
		const buf = new ArrayBuffer(14);
		const view = new DataView(buf);
		view.setUint16(0, 0, true);      // v1
		view.setUint16(2, 1, true);      // v2
		view.setInt16(4, 1, true);       // flags (blocking)
		view.setInt16(6, 0, true);       // special
		view.setInt16(8, 0, true);       // tag
		view.setUint16(10, 0, true);     // front sidedef
		view.setUint16(12, 0xFFFF, true); // back sidedef (none)

		const linedefs = parseLinedefs(new Uint8Array(buf));
		expect(linedefs.length).toBe(1);
		expect(linedefs[0]?.v1).toBe(0);
		expect(linedefs[0]?.v2).toBe(1);
		expect(linedefs[0]?.flags).toBe(1);
		expect(linedefs[0]?.backSidedef).toBe(0xFFFF);
	});
});

describe('parseVertexes', () => {
	it('parses vertices (4 bytes each)', () => {
		const data = buildInt16LE([0, 0, 128, 256, -100, 50]);
		const verts = parseVertexes(data);

		expect(verts.length).toBe(3);
		expect(verts[0]).toEqual({ x: 0, y: 0 });
		expect(verts[1]).toEqual({ x: 128, y: 256 });
		expect(verts[2]).toEqual({ x: -100, y: 50 });
	});
});

describe('parseSegs', () => {
	it('parses a seg (12 bytes)', () => {
		const buf = new ArrayBuffer(12);
		const view = new DataView(buf);
		view.setUint16(0, 5, true);   // v1
		view.setUint16(2, 10, true);  // v2
		view.setInt16(4, 8192, true); // angle (BAM16)
		view.setUint16(6, 3, true);   // linedef
		view.setInt16(8, 0, true);    // side
		view.setInt16(10, 64, true);  // offset

		const segs = parseSegs(new Uint8Array(buf));
		expect(segs.length).toBe(1);
		expect(segs[0]?.v1).toBe(5);
		expect(segs[0]?.v2).toBe(10);
		expect(segs[0]?.linedef).toBe(3);
		expect(segs[0]?.offset).toBe(64);
	});
});

describe('parseSubsectors', () => {
	it('parses subsectors (4 bytes each)', () => {
		const buf = new ArrayBuffer(8);
		const view = new DataView(buf);
		view.setUint16(0, 3, true);  // numSegs
		view.setUint16(2, 0, true);  // firstSeg
		view.setUint16(4, 5, true);  // numSegs
		view.setUint16(6, 3, true);  // firstSeg

		const ssectors = parseSubsectors(new Uint8Array(buf));
		expect(ssectors.length).toBe(2);
		expect(ssectors[0]).toEqual({ numSegs: 3, firstSeg: 0 });
		expect(ssectors[1]).toEqual({ numSegs: 5, firstSeg: 3 });
	});
});

describe('parseNodes', () => {
	it('parses a BSP node (28 bytes)', () => {
		const buf = new ArrayBuffer(28);
		const view = new DataView(buf);
		// Partition line
		view.setInt16(0, 100, true);  // x
		view.setInt16(2, 200, true);  // y
		view.setInt16(4, 50, true);   // dx
		view.setInt16(6, 0, true);    // dy
		// Right bbox: top, bottom, left, right
		view.setInt16(8, 300, true);
		view.setInt16(10, 100, true);
		view.setInt16(12, 0, true);
		view.setInt16(14, 200, true);
		// Left bbox
		view.setInt16(16, 300, true);
		view.setInt16(18, 100, true);
		view.setInt16(20, 200, true);
		view.setInt16(22, 400, true);
		// Children
		view.setUint16(24, 0x8001, true); // right = subsector 1
		view.setUint16(26, 5, true);      // left = node 5

		const nodes = parseNodes(new Uint8Array(buf));
		expect(nodes.length).toBe(1);
		expect(nodes[0]?.x).toBe(100);
		expect(nodes[0]?.dy).toBe(0);
		expect(nodes[0]?.rightChild).toBe(0x8001); // NF_SUBSECTOR | 1
		expect(nodes[0]?.leftChild).toBe(5);
	});
});

describe('parseSectors', () => {
	it('parses a sector (26 bytes)', () => {
		const buf = new ArrayBuffer(26);
		const arr = new Uint8Array(buf);
		const view = new DataView(buf);
		view.setInt16(0, 0, true);    // floor height
		view.setInt16(2, 128, true);  // ceiling height
		// Floor flat name: "FLOOR0_1" (8 bytes)
		const floor = 'FLOOR0_1';
		for (let i = 0; i < 8; i++) {
			arr[4 + i] = i < floor.length ? floor.charCodeAt(i) : 0;
		}
		// Ceiling flat: "CEIL1_1"
		const ceil = 'CEIL1_1';
		for (let i = 0; i < 8; i++) {
			arr[12 + i] = i < ceil.length ? ceil.charCodeAt(i) : 0;
		}
		view.setInt16(20, 160, true); // light level
		view.setInt16(22, 0, true);   // special
		view.setInt16(24, 0, true);   // tag

		const sectors = parseSectors(arr);
		expect(sectors.length).toBe(1);
		expect(sectors[0]?.floorHeight).toBe(0);
		expect(sectors[0]?.ceilingHeight).toBe(128);
		expect(sectors[0]?.floorFlat).toBe('FLOOR0_1');
		expect(sectors[0]?.ceilingFlat).toBe('CEIL1_1');
		expect(sectors[0]?.lightLevel).toBe(160);
	});
});

describe('parseBlockmap', () => {
	it('parses blockmap header', () => {
		// Header: origin (-128, -128), 4 columns, 4 rows
		// Followed by 16 offsets, then blocklists
		const headerWords = [-128, -128, 4, 4];
		// 16 offsets (each pointing to start of its blocklist)
		// Each blocklist: 0x0000, linedef indices..., 0xFFFF
		// For simplicity, first cell has linedefs [0, 1], rest empty
		const baseOffset = 4 + 16; // header words + offset table words
		const offsets = [baseOffset]; // first cell
		for (let i = 1; i < 16; i++) {
			offsets.push(baseOffset + 5); // point to an empty blocklist
		}

		const allWords = [
			...headerWords,
			...offsets,
			// Blocklist for first cell: 0, 0, 1, -1
			0, 0, 1, -1,
			// Empty blocklist: 0, -1
			0, -1,
		];

		const data = buildInt16LE(allWords);
		const blockmap = parseBlockmap(data);

		expect(blockmap.header.originX).toBe(-128);
		expect(blockmap.header.originY).toBe(-128);
		expect(blockmap.header.columns).toBe(4);
		expect(blockmap.header.rows).toBe(4);
	});
});

describe('getBlockmapCell', () => {
	it('returns empty for out-of-bounds cells', () => {
		const data = buildInt16LE([0, 0, 2, 2, 6, 6, 6, 6, 0, -1]);
		const blockmap = parseBlockmap(data);

		expect(getBlockmapCell(blockmap, -1, 0)).toEqual([]);
		expect(getBlockmapCell(blockmap, 0, 5)).toEqual([]);
	});
});
