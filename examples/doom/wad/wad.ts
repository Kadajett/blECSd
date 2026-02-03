/**
 * WAD file parser for Doom IWAD/PWAD format.
 *
 * Reads the 12-byte header, parses the directory of lumps, and provides
 * lookup functions for accessing lump data by name.
 *
 * @module wad/wad
 */

import { readFileSync } from 'node:fs';
import {
	WadHeaderSchema,
	type WadDirectoryEntry,
	type WadFile,
	type WadHeader,
	type WadType,
} from './types.js';

// ─── WAD Header Parsing ────────────────────────────────────────────

/**
 * Read the 12-byte WAD header from a DataView.
 *
 * @param view - DataView over the WAD file data
 * @returns Parsed and validated WAD header
 * @throws If the header magic is not IWAD or PWAD
 *
 * @example
 * ```typescript
 * const header = readWadHeader(view);
 * console.log(header.type); // 'IWAD'
 * console.log(header.numLumps); // 1264
 * ```
 */
export function readWadHeader(view: DataView): WadHeader {
	const magic = String.fromCharCode(
		view.getUint8(0),
		view.getUint8(1),
		view.getUint8(2),
		view.getUint8(3),
	);

	if (magic !== 'IWAD' && magic !== 'PWAD') {
		throw new Error(`Invalid WAD magic: "${magic}" (expected IWAD or PWAD)`);
	}

	const header: WadHeader = {
		type: magic as WadType,
		numLumps: view.getInt32(4, true),
		directoryOffset: view.getInt32(8, true),
	};

	return WadHeaderSchema.parse(header);
}

// ─── Lump Name Reading ─────────────────────────────────────────────

/**
 * Read an 8-byte null-padded ASCII lump name.
 *
 * @param data - Uint8Array containing the raw WAD data
 * @param offset - Byte offset to start reading from
 * @returns Uppercase lump name with null bytes stripped
 */
export function readLumpName(data: Uint8Array, offset: number): string {
	let name = '';
	for (let i = 0; i < 8; i++) {
		const byte = data[offset + i];
		if (byte === undefined || byte === 0) break;
		name += String.fromCharCode(byte);
	}
	return name.toUpperCase();
}

// ─── Directory Parsing ─────────────────────────────────────────────

/**
 * Parse the WAD directory (lump table).
 *
 * @param view - DataView over the WAD file data
 * @param raw - Raw Uint8Array of the WAD file
 * @param header - Parsed WAD header
 * @returns Array of directory entries
 */
export function readWadDirectory(
	view: DataView,
	raw: Uint8Array,
	header: WadHeader,
): readonly WadDirectoryEntry[] {
	const entries: WadDirectoryEntry[] = [];
	const dirOffset = header.directoryOffset;

	for (let i = 0; i < header.numLumps; i++) {
		const entryOffset = dirOffset + i * 16;
		const filepos = view.getInt32(entryOffset, true);
		const size = view.getInt32(entryOffset + 4, true);
		const name = readLumpName(raw, entryOffset + 8);

		entries.push({ filepos, size, name });
	}

	return entries;
}

// ─── WAD File Loading ──────────────────────────────────────────────

/**
 * Load and parse a WAD file from disk.
 *
 * @param path - Filesystem path to the WAD file
 * @returns Parsed WadFile with header, directory, and raw data
 * @throws If the file cannot be read or has an invalid header
 *
 * @example
 * ```typescript
 * const wad = loadWad('./doom1.wad');
 * console.log(wad.header.type); // 'IWAD'
 * console.log(wad.directory.length); // 1264
 *
 * const e1m1 = getLump(wad, 'E1M1');
 * ```
 */
export function loadWad(path: string): WadFile {
	const buffer = readFileSync(path);
	const raw = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

	const header = readWadHeader(view);
	const directory = readWadDirectory(view, raw, header);

	return { header, directory, data: view, raw };
}

/**
 * Parse a WAD file from raw bytes (for testing or non-filesystem use).
 *
 * @param raw - Raw WAD file bytes
 * @returns Parsed WadFile
 */
export function parseWad(raw: Uint8Array): WadFile {
	const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
	const header = readWadHeader(view);
	const directory = readWadDirectory(view, raw, header);
	return { header, directory, data: view, raw };
}

// ─── Lump Access ───────────────────────────────────────────────────

/**
 * Find a directory entry by lump name.
 * Returns the last matching entry (PWAD override behavior).
 *
 * @param wad - Loaded WAD file
 * @param name - Lump name to find (case-insensitive)
 * @returns Directory entry or undefined if not found
 */
export function findLump(wad: WadFile, name: string): WadDirectoryEntry | undefined {
	const upper = name.toUpperCase();
	// Search backwards: last entry wins (PWAD override behavior)
	for (let i = wad.directory.length - 1; i >= 0; i--) {
		if (wad.directory[i]?.name === upper) {
			return wad.directory[i];
		}
	}
	return undefined;
}

/**
 * Find a directory entry by lump name, throwing if not found.
 *
 * @param wad - Loaded WAD file
 * @param name - Lump name to find
 * @returns Directory entry
 * @throws If the lump is not found
 */
export function requireLump(wad: WadFile, name: string): WadDirectoryEntry {
	const entry = findLump(wad, name);
	if (!entry) {
		throw new Error(`Required lump "${name}" not found in WAD`);
	}
	return entry;
}

/**
 * Get the raw bytes of a lump.
 *
 * @param wad - Loaded WAD file
 * @param entry - Directory entry for the lump
 * @returns Uint8Array view into the lump data
 */
export function getLumpData(wad: WadFile, entry: WadDirectoryEntry): Uint8Array {
	return wad.raw.subarray(entry.filepos, entry.filepos + entry.size);
}

/**
 * Get the raw bytes of a lump by name.
 *
 * @param wad - Loaded WAD file
 * @param name - Lump name
 * @returns Uint8Array of lump data
 * @throws If the lump is not found
 */
export function getLumpByName(wad: WadFile, name: string): Uint8Array {
	const entry = requireLump(wad, name);
	return getLumpData(wad, entry);
}

/**
 * Get a DataView over a lump's data.
 *
 * @param wad - Loaded WAD file
 * @param entry - Directory entry for the lump
 * @returns DataView over the lump data
 */
export function getLumpView(wad: WadFile, entry: WadDirectoryEntry): DataView {
	return new DataView(wad.raw.buffer, wad.raw.byteOffset + entry.filepos, entry.size);
}

/**
 * Find the directory index of a lump by name.
 * Used for finding map lumps (the map marker, then sequential lumps after it).
 *
 * @param wad - Loaded WAD file
 * @param name - Lump name to find
 * @returns Index into the directory, or -1 if not found
 */
export function findLumpIndex(wad: WadFile, name: string): number {
	const upper = name.toUpperCase();
	for (let i = wad.directory.length - 1; i >= 0; i--) {
		if (wad.directory[i]?.name === upper) {
			return i;
		}
	}
	return -1;
}

/**
 * Get all lump names between two marker lumps (exclusive).
 * Used for namespace-bounded lumps like flats (F_START/F_END)
 * and sprites (S_START/S_END).
 *
 * @param wad - Loaded WAD file
 * @param startMarker - Start marker name (e.g., 'F_START')
 * @param endMarker - End marker name (e.g., 'F_END')
 * @returns Array of directory entries between the markers
 */
export function getLumpsBetween(
	wad: WadFile,
	startMarker: string,
	endMarker: string,
): readonly WadDirectoryEntry[] {
	const startUpper = startMarker.toUpperCase();
	const endUpper = endMarker.toUpperCase();
	const results: WadDirectoryEntry[] = [];
	let inside = false;

	for (const entry of wad.directory) {
		if (entry.name === startUpper || entry.name === `F${startUpper.slice(1)}`) {
			inside = true;
			continue;
		}
		if (entry.name === endUpper || entry.name === `F${endUpper.slice(1)}`) {
			inside = false;
			continue;
		}
		// Also handle FF_START/FF_END variants
		if (entry.name === `F${startUpper}`) {
			inside = true;
			continue;
		}
		if (entry.name === `F${endUpper}`) {
			inside = false;
			continue;
		}
		if (inside && entry.size > 0) {
			results.push(entry);
		}
	}

	return results;
}
