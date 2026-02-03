import { describe, expect, it } from 'vitest';
import {
	findLump,
	findLumpIndex,
	getLumpData,
	getLumpsBetween,
	parseWad,
	readLumpName,
	readWadHeader,
} from './wad.js';
import type { WadFile } from './types.js';

// ─── Test WAD Builder ──────────────────────────────────────────────

/**
 * Build a minimal valid WAD file for testing.
 */
function buildTestWad(
	type: 'IWAD' | 'PWAD',
	lumps: Array<{ name: string; data: Uint8Array }>,
): Uint8Array {
	// Calculate sizes
	const headerSize = 12;
	let dataOffset = headerSize;
	const dataOffsets: number[] = [];

	for (const lump of lumps) {
		dataOffsets.push(dataOffset);
		dataOffset += lump.data.length;
	}

	const directoryOffset = dataOffset;
	const totalSize = directoryOffset + lumps.length * 16;
	const buffer = new Uint8Array(totalSize);
	const view = new DataView(buffer.buffer);

	// Write header
	buffer[0] = type.charCodeAt(0);
	buffer[1] = type.charCodeAt(1);
	buffer[2] = type.charCodeAt(2);
	buffer[3] = type.charCodeAt(3);
	view.setInt32(4, lumps.length, true);
	view.setInt32(8, directoryOffset, true);

	// Write lump data
	for (let i = 0; i < lumps.length; i++) {
		const lump = lumps[i]!;
		const offset = dataOffsets[i]!;
		buffer.set(lump.data, offset);
	}

	// Write directory
	for (let i = 0; i < lumps.length; i++) {
		const lump = lumps[i]!;
		const entryOffset = directoryOffset + i * 16;
		view.setInt32(entryOffset, dataOffsets[i]!, true);
		view.setInt32(entryOffset + 4, lump.data.length, true);

		// Write name (8 bytes, null-padded)
		for (let j = 0; j < 8; j++) {
			buffer[entryOffset + 8 + j] = j < lump.name.length ? lump.name.charCodeAt(j) : 0;
		}
	}

	return buffer;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('readWadHeader', () => {
	it('reads a valid IWAD header', () => {
		const data = buildTestWad('IWAD', []);
		const view = new DataView(data.buffer);
		const header = readWadHeader(view);

		expect(header.type).toBe('IWAD');
		expect(header.numLumps).toBe(0);
		expect(header.directoryOffset).toBe(12);
	});

	it('reads a valid PWAD header', () => {
		const data = buildTestWad('PWAD', [
			{ name: 'TEST', data: new Uint8Array([1, 2, 3]) },
		]);
		const view = new DataView(data.buffer);
		const header = readWadHeader(view);

		expect(header.type).toBe('PWAD');
		expect(header.numLumps).toBe(1);
	});

	it('throws on invalid magic', () => {
		const data = new Uint8Array(12);
		data[0] = 'X'.charCodeAt(0);
		data[1] = 'W'.charCodeAt(0);
		data[2] = 'A'.charCodeAt(0);
		data[3] = 'D'.charCodeAt(0);
		const view = new DataView(data.buffer);

		expect(() => readWadHeader(view)).toThrow('Invalid WAD magic');
	});
});

describe('readLumpName', () => {
	it('reads a full 8-character name', () => {
		const data = new Uint8Array([0x50, 0x4c, 0x41, 0x59, 0x50, 0x41, 0x4c, 0x00]);
		expect(readLumpName(data, 0)).toBe('PLAYPAL');
	});

	it('reads a short name with null padding', () => {
		const data = new Uint8Array([0x45, 0x31, 0x4d, 0x31, 0, 0, 0, 0]);
		expect(readLumpName(data, 0)).toBe('E1M1');
	});

	it('uppercases names', () => {
		const data = new Uint8Array([0x74, 0x65, 0x73, 0x74, 0, 0, 0, 0]); // "test"
		expect(readLumpName(data, 0)).toBe('TEST');
	});
});

describe('parseWad', () => {
	it('parses a WAD with multiple lumps', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'LUMP1', data: new Uint8Array([10, 20, 30]) },
			{ name: 'LUMP2', data: new Uint8Array([40, 50]) },
			{ name: 'LUMP3', data: new Uint8Array([]) },
		]));

		expect(wad.header.type).toBe('IWAD');
		expect(wad.directory.length).toBe(3);
		expect(wad.directory[0]?.name).toBe('LUMP1');
		expect(wad.directory[0]?.size).toBe(3);
		expect(wad.directory[1]?.name).toBe('LUMP2');
		expect(wad.directory[1]?.size).toBe(2);
		expect(wad.directory[2]?.name).toBe('LUMP3');
		expect(wad.directory[2]?.size).toBe(0);
	});
});

describe('findLump', () => {
	it('finds a lump by name', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'ALPHA', data: new Uint8Array([1]) },
			{ name: 'BETA', data: new Uint8Array([2]) },
		]));

		const entry = findLump(wad, 'BETA');
		expect(entry?.name).toBe('BETA');
		expect(entry?.size).toBe(1);
	});

	it('returns undefined for missing lump', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'ALPHA', data: new Uint8Array([1]) },
		]));

		expect(findLump(wad, 'MISSING')).toBeUndefined();
	});

	it('is case-insensitive', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'MYDATA', data: new Uint8Array([1]) },
		]));

		expect(findLump(wad, 'mydata')?.name).toBe('MYDATA');
	});

	it('returns last match (PWAD override behavior)', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'DATA', data: new Uint8Array([1]) },
			{ name: 'DATA', data: new Uint8Array([2, 3]) },
		]));

		const entry = findLump(wad, 'DATA');
		expect(entry?.size).toBe(2); // second entry
	});
});

describe('findLumpIndex', () => {
	it('finds the index of a lump', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'A', data: new Uint8Array([]) },
			{ name: 'B', data: new Uint8Array([]) },
			{ name: 'C', data: new Uint8Array([]) },
		]));

		expect(findLumpIndex(wad, 'B')).toBe(1);
	});

	it('returns -1 for missing lump', () => {
		const wad = parseWad(buildTestWad('IWAD', []));
		expect(findLumpIndex(wad, 'MISSING')).toBe(-1);
	});
});

describe('getLumpData', () => {
	it('extracts lump data bytes', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'TEST', data: new Uint8Array([10, 20, 30, 40]) },
		]));

		const entry = findLump(wad, 'TEST')!;
		const data = getLumpData(wad, entry);
		expect(data.length).toBe(4);
		expect(data[0]).toBe(10);
		expect(data[3]).toBe(40);
	});
});

describe('getLumpsBetween', () => {
	it('returns lumps between markers', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'F_START', data: new Uint8Array([]) },
			{ name: 'FLAT1', data: new Uint8Array(4096) },
			{ name: 'FLAT2', data: new Uint8Array(4096) },
			{ name: 'F_END', data: new Uint8Array([]) },
		]));

		const flats = getLumpsBetween(wad, 'F_START', 'F_END');
		expect(flats.length).toBe(2);
		expect(flats[0]?.name).toBe('FLAT1');
		expect(flats[1]?.name).toBe('FLAT2');
	});

	it('skips zero-size marker lumps', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'MARKER', data: new Uint8Array([]) },
			{ name: 'SPRITE1', data: new Uint8Array([1, 2]) },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const sprites = getLumpsBetween(wad, 'S_START', 'S_END');
		expect(sprites.length).toBe(1);
		expect(sprites[0]?.name).toBe('SPRITE1');
	});
});
