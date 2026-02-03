import { describe, expect, it } from 'vitest';
import { loadSprites, getSpriteFrame, getSpriteRotation } from './spriteData.js';
import type { SpriteStore } from './spriteData.js';
import type { WadFile } from './types.js';
import { parseWad } from './wad.js';

// ─── Test WAD Builder ──────────────────────────────────────────────

/**
 * Build a minimal valid WAD file for testing.
 */
function buildTestWad(
	type: 'IWAD' | 'PWAD',
	lumps: Array<{ name: string; data: Uint8Array }>,
): Uint8Array {
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

		for (let j = 0; j < 8; j++) {
			buffer[entryOffset + 8 + j] = j < lump.name.length ? lump.name.charCodeAt(j) : 0;
		}
	}

	return buffer;
}

/**
 * Build a minimal valid Doom picture (sprite/patch) for testing.
 * Creates a simple 4x4 picture with a single post per column.
 */
function buildMinimalPicture(width: number, height: number): Uint8Array {
	// Header: width(u16) + height(u16) + leftOffset(i16) + topOffset(i16) = 8 bytes
	// Column offsets: width * 4 bytes
	// Column data: per column: topDelta(u8) + length(u8) + pad(u8) + pixels(u8*height) + pad(u8) + 0xFF terminator
	const headerSize = 8 + width * 4;
	const columnDataSize = 1 + 1 + 1 + height + 1 + 1; // per column
	const totalSize = headerSize + width * columnDataSize;

	const data = new Uint8Array(totalSize);
	const view = new DataView(data.buffer);

	// Write picture header
	view.setUint16(0, width, true);
	view.setUint16(2, height, true);
	view.setInt16(4, Math.floor(width / 2), true);  // leftOffset
	view.setInt16(6, height, true);                   // topOffset

	// Write column offsets and column data
	let offset = headerSize;
	for (let col = 0; col < width; col++) {
		view.setUint32(8 + col * 4, offset, true);

		// Write post: topDelta=0, length=height, pad, pixels, pad, 0xFF
		data[offset++] = 0;          // topDelta
		data[offset++] = height;     // length
		data[offset++] = 0;          // pad before pixels
		for (let y = 0; y < height; y++) {
			data[offset++] = (col * height + y) & 0xff; // pixel palette index
		}
		data[offset++] = 0;          // pad after pixels
		data[offset++] = 0xff;       // end-of-column marker
	}

	return data;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('loadSprites', () => {
	it('returns a SpriteStore from a WAD with S_START/S_END', () => {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'TROOА0', data: spriteData }, // Intentional: let's use ASCII
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		expect(store).toBeDefined();
		expect(store.sprites).toBeDefined();
	});

	it('returns empty sprite store when no sprites between markers', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		expect(store.sprites.size).toBe(0);
	});

	it('parses sprite name, frame, and rotation from lump name', () => {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'TROOA0', data: spriteData },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		const def = store.sprites.get('TROO');
		expect(def).toBeDefined();
		expect(def!.name).toBe('TROO');
		expect(def!.frames.length).toBeGreaterThanOrEqual(1);

		// Frame A (index 0), rotation 0 (all angles)
		const frame = def!.frames[0];
		expect(frame).toBeDefined();
		expect(frame!.rotations[0]).not.toBeNull();
	});

	it('handles multi-rotation sprites (rotations 1-8)', () => {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'POSSA1', data: spriteData },
			{ name: 'POSSA2', data: spriteData },
			{ name: 'POSSA3', data: spriteData },
			{ name: 'POSSA4', data: spriteData },
			{ name: 'POSSA5', data: spriteData },
			{ name: 'POSSA6', data: spriteData },
			{ name: 'POSSA7', data: spriteData },
			{ name: 'POSSA8', data: spriteData },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		const def = store.sprites.get('POSS');
		expect(def).toBeDefined();

		const frame = def!.frames[0];
		expect(frame).toBeDefined();

		// Rotations 1-8 map to indices 0-7
		for (let i = 0; i < 8; i++) {
			expect(frame!.rotations[i]).not.toBeNull();
		}
	});

	it('handles 8-char lump names with mirror frame+rotation', () => {
		const spriteData = buildMinimalPicture(4, 4);
		// POSSA1A5 means: frame A rot 1, and also use for frame A rot 5
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'POSSA1A5', data: spriteData },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		const def = store.sprites.get('POSS');
		expect(def).toBeDefined();

		const frame = def!.frames[0];
		expect(frame).toBeDefined();

		// Rotation 1 (index 0) and rotation 5 (index 4) should both be set
		expect(frame!.rotations[0]).not.toBeNull();
		expect(frame!.rotations[4]).not.toBeNull();
	});

	it('skips lumps with names shorter than 6 characters', () => {
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'SHORT', data: new Uint8Array([1, 2, 3]) },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		expect(store.sprites.size).toBe(0);
	});

	it('handles multiple frames for the same sprite', () => {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'TRODA0', data: spriteData },
			{ name: 'TRODB0', data: spriteData },
			{ name: 'TRODC0', data: spriteData },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		const def = store.sprites.get('TROD');
		expect(def).toBeDefined();
		expect(def!.frames.length).toBe(3);
	});
});

describe('getSpriteFrame', () => {
	function buildStore(): SpriteStore {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'TRODA0', data: spriteData },
			{ name: 'TRODB0', data: spriteData },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));
		return loadSprites(wad);
	}

	it('returns null for unknown sprite names', () => {
		const store = buildStore();
		expect(getSpriteFrame(store, 'XXXX', 0)).toBeNull();
	});

	it('returns null for out-of-range frame index', () => {
		const store = buildStore();
		expect(getSpriteFrame(store, 'TROD', 99)).toBeNull();
	});

	it('returns frame for known sprite and valid frame index', () => {
		const store = buildStore();
		const frame = getSpriteFrame(store, 'TROD', 0);
		expect(frame).not.toBeNull();
		expect(frame!.rotations).toBeDefined();
	});

	it('returns different frames for different indices', () => {
		const store = buildStore();
		const frame0 = getSpriteFrame(store, 'TROD', 0);
		const frame1 = getSpriteFrame(store, 'TROD', 1);
		expect(frame0).not.toBeNull();
		expect(frame1).not.toBeNull();
	});
});

describe('getSpriteRotation', () => {
	it('returns rotation 0 when only one rotation exists', () => {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'TRODA0', data: spriteData },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		const frame = getSpriteFrame(store, 'TROD', 0)!;

		// Should return the same picture for any angle
		const pic0 = getSpriteRotation(frame, 0);
		const pic3 = getSpriteRotation(frame, 3);
		const pic7 = getSpriteRotation(frame, 7);

		expect(pic0).not.toBeNull();
		expect(pic0).toBe(pic3);
		expect(pic0).toBe(pic7);
	});

	it('returns specific rotation when multiple rotations exist', () => {
		const spriteData1 = buildMinimalPicture(4, 4);
		const spriteData2 = buildMinimalPicture(8, 8);

		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'POSSA1', data: spriteData1 },
			{ name: 'POSSA2', data: spriteData2 },
			{ name: 'POSSA3', data: spriteData1 },
			{ name: 'POSSA4', data: spriteData2 },
			{ name: 'POSSA5', data: spriteData1 },
			{ name: 'POSSA6', data: spriteData2 },
			{ name: 'POSSA7', data: spriteData1 },
			{ name: 'POSSA8', data: spriteData2 },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		const frame = getSpriteFrame(store, 'POSS', 0)!;

		// Rotation 1 (index 0) should be 4x4
		const pic0 = getSpriteRotation(frame, 0);
		expect(pic0).not.toBeNull();
		expect(pic0!.width).toBe(4);

		// Rotation 2 (index 1) should be 8x8
		const pic1 = getSpriteRotation(frame, 1);
		expect(pic1).not.toBeNull();
		expect(pic1!.width).toBe(8);
	});

	it('returns null for missing rotation in multi-rotation frame', () => {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'POSSA1', data: spriteData },
			{ name: 'POSSA3', data: spriteData },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		const frame = getSpriteFrame(store, 'POSS', 0)!;

		// Rotation 1 (index 0) should exist
		expect(getSpriteRotation(frame, 0)).not.toBeNull();

		// Rotation 2 (index 1) should be null (not loaded)
		expect(getSpriteRotation(frame, 1)).toBeNull();

		// Rotation 3 (index 2) should exist
		expect(getSpriteRotation(frame, 2)).not.toBeNull();
	});
});

describe('sprite name parsing', () => {
	it('extracts 4-char name correctly', () => {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'PLAYA0', data: spriteData },
			{ name: 'SARGA0', data: spriteData },
			{ name: 'BAR1A0', data: spriteData },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		expect(store.sprites.has('PLAY')).toBe(true);
		expect(store.sprites.has('SARG')).toBe(true);
		expect(store.sprites.has('BAR1')).toBe(true);
	});

	it('extracts frame letter correctly', () => {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'PLAYA0', data: spriteData },
			{ name: 'PLAYB0', data: spriteData },
			{ name: 'PLAYC0', data: spriteData },
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		const def = store.sprites.get('PLAY')!;
		expect(def.frames.length).toBe(3); // A=0, B=1, C=2
	});

	it('extracts rotation digit correctly', () => {
		const spriteData = buildMinimalPicture(4, 4);
		const wad = parseWad(buildTestWad('IWAD', [
			{ name: 'S_START', data: new Uint8Array([]) },
			{ name: 'PLAYA0', data: spriteData }, // rotation 0 = all angles
			{ name: 'S_END', data: new Uint8Array([]) },
		]));

		const store = loadSprites(wad);
		const frame = getSpriteFrame(store, 'PLAY', 0)!;

		// Rotation 0 is set
		expect(frame.rotations[0]).not.toBeNull();

		// Single-rotation: getSpriteRotation should return it for any angle
		expect(getSpriteRotation(frame, 5)).not.toBeNull();
	});
});
