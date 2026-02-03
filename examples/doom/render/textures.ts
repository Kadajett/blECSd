/**
 * Wall texture and flat loading from WAD data.
 *
 * Wall textures are composites built from patches (TEXTURE1/2 + PNAMES).
 * Flats are raw 64x64 palette-indexed images (between F_START/F_END).
 *
 * @module render/textures
 */

import type { Flat, Picture, TextureDef, TexturePatch } from '../wad/types.js';
import { parsePicture } from '../wad/pictureFormat.js';
import type { WadFile } from '../wad/types.js';
import {
	findLump,
	getLumpByName,
	getLumpData,
	getLumpsBetween,
} from '../wad/wad.js';

// ─── PNAMES Parsing ────────────────────────────────────────────────

/**
 * Parse the PNAMES lump (list of patch lump names).
 *
 * @param data - Raw PNAMES lump bytes
 * @returns Array of patch names
 */
export function parsePNames(data: Uint8Array): readonly string[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const count = view.getInt32(0, true);
	const names: string[] = [];

	for (let i = 0; i < count; i++) {
		const offset = 4 + i * 8;
		let name = '';
		for (let j = 0; j < 8; j++) {
			const byte = data[offset + j];
			if (byte === undefined || byte === 0) break;
			name += String.fromCharCode(byte);
		}
		names.push(name.toUpperCase());
	}

	return names;
}

// ─── TEXTURE1/TEXTURE2 Parsing ─────────────────────────────────────

/**
 * Parse a TEXTUREx lump (composite texture definitions).
 *
 * @param data - Raw TEXTURE1 or TEXTURE2 lump bytes
 * @returns Array of texture definitions
 */
export function parseTextureLump(data: Uint8Array): readonly TextureDef[] {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const numTextures = view.getInt32(0, true);
	const textures: TextureDef[] = [];

	for (let i = 0; i < numTextures; i++) {
		const texOffset = view.getInt32(4 + i * 4, true);

		// Read texture name (8 bytes)
		let name = '';
		for (let j = 0; j < 8; j++) {
			const byte = data[texOffset + j];
			if (byte === undefined || byte === 0) break;
			name += String.fromCharCode(byte);
		}

		// Skip masked (4 bytes) at offset+8
		const width = view.getInt16(texOffset + 12, true);
		const height = view.getInt16(texOffset + 14, true);
		// Skip columndirectory (4 bytes) at offset+16
		const patchCount = view.getInt16(texOffset + 20, true);

		const patches: TexturePatch[] = [];
		for (let p = 0; p < patchCount; p++) {
			const patchOffset = texOffset + 22 + p * 10;
			patches.push({
				originX: view.getInt16(patchOffset, true),
				originY: view.getInt16(patchOffset + 2, true),
				patchIndex: view.getInt16(patchOffset + 4, true),
				// Skip stepdir (2 bytes) and colormap (2 bytes)
			});
		}

		textures.push({ name: name.toUpperCase(), width, height, patches });
	}

	return textures;
}

// ─── Texture Cache ─────────────────────────────────────────────────

/** Cached composite texture: column-major array of palette indices. */
export interface CompositeTexture {
	readonly name: string;
	readonly width: number;
	readonly height: number;
	/** Column-major: columns[x] is a Uint8Array of height palette indices. */
	readonly columns: readonly Uint8Array[];
}

/**
 * Holds all loaded textures, patches, and flats for rendering.
 */
export interface TextureStore {
	/** Wall texture definitions from TEXTURE1/TEXTURE2. */
	readonly textureDefs: readonly TextureDef[];
	/** Patch names from PNAMES. */
	readonly patchNames: readonly string[];
	/** Texture name -> index lookup. */
	readonly textureByName: ReadonlyMap<string, number>;
	/** Flat name -> Flat lookup. */
	readonly flatByName: ReadonlyMap<string, Flat>;
	/** Loaded WAD for accessing patch data on demand. */
	readonly wad: WadFile;
	/** Cache of composited wall textures. */
	readonly compositeCache: Map<number, CompositeTexture>;
}

/**
 * Load all texture metadata from a WAD file.
 * Actual texture compositing is deferred (lazy on first access).
 *
 * @param wad - Loaded WAD file
 * @returns TextureStore for looking up textures during rendering
 *
 * @example
 * ```typescript
 * const textures = loadTextures(wad);
 * const tex = getWallTexture(textures, 'STARTAN3');
 * ```
 */
export function loadTextures(wad: WadFile): TextureStore {
	const patchNames = parsePNames(getLumpByName(wad, 'PNAMES'));

	// Parse TEXTURE1 (always present)
	const tex1 = parseTextureLump(getLumpByName(wad, 'TEXTURE1'));

	// Parse TEXTURE2 (may not exist in shareware)
	let tex2: readonly TextureDef[] = [];
	const tex2Entry = findLump(wad, 'TEXTURE2');
	if (tex2Entry) {
		tex2 = parseTextureLump(getLumpData(wad, tex2Entry));
	}

	const textureDefs = [...tex1, ...tex2];
	const textureByName = new Map<string, number>();
	for (let i = 0; i < textureDefs.length; i++) {
		const def = textureDefs[i];
		if (def) {
			textureByName.set(def.name, i);
		}
	}

	// Load flats
	const flatByName = new Map<string, Flat>();
	const flatEntries = getLumpsBetween(wad, 'F_START', 'F_END');
	for (const entry of flatEntries) {
		if (entry.size === 4096) {
			flatByName.set(entry.name, {
				name: entry.name,
				pixels: getLumpData(wad, entry),
			});
		}
	}

	return {
		textureDefs,
		patchNames,
		textureByName,
		flatByName,
		wad,
		compositeCache: new Map(),
	};
}

/**
 * Get or composite a wall texture by index.
 * Results are cached after first compositing.
 *
 * @param store - Texture store
 * @param textureIndex - Index into textureDefs
 * @returns Composited texture with column data
 */
export function getCompositeTexture(
	store: TextureStore,
	textureIndex: number,
): CompositeTexture | undefined {
	if (textureIndex < 0 || textureIndex >= store.textureDefs.length) return undefined;

	const cached = store.compositeCache.get(textureIndex);
	if (cached) return cached;

	const def = store.textureDefs[textureIndex];
	if (!def) return undefined;

	const composite = compositeTexture(store, def);
	store.compositeCache.set(textureIndex, composite);
	return composite;
}

/**
 * Get a wall texture by name.
 *
 * @param store - Texture store
 * @param name - Texture name (case-insensitive)
 * @returns Composited texture, or undefined if not found or '-'
 */
export function getWallTexture(
	store: TextureStore,
	name: string,
): CompositeTexture | undefined {
	const upper = name.toUpperCase();
	if (upper === '-') return undefined;
	const index = store.textureByName.get(upper);
	if (index === undefined) return undefined;
	return getCompositeTexture(store, index);
}

/**
 * Get a flat texture by name.
 *
 * @param store - Texture store
 * @param name - Flat name (case-insensitive)
 * @returns Flat data, or undefined if not found
 */
export function getFlat(store: TextureStore, name: string): Flat | undefined {
	return store.flatByName.get(name.toUpperCase());
}

// ─── Compositing ───────────────────────────────────────────────────

/**
 * Composite a wall texture from its patch definitions.
 * Draws each patch into the texture at its origin position.
 */
function compositeTexture(store: TextureStore, def: TextureDef): CompositeTexture {
	// Create column-major storage
	const columns: Uint8Array[] = [];
	for (let x = 0; x < def.width; x++) {
		const col = new Uint8Array(def.height);
		col.fill(0); // palette index 0 as default
		columns.push(col);
	}

	// Draw each patch
	for (const patchDef of def.patches) {
		const patchName = store.patchNames[patchDef.patchIndex];
		if (!patchName) continue;

		let picture: Picture;
		try {
			const lumpData = getLumpByName(store.wad, patchName);
			picture = parsePicture(lumpData);
		} catch {
			continue; // Skip patches that can't be loaded
		}

		// Blit patch columns into the composite texture
		for (let col = 0; col < picture.width; col++) {
			const destX = patchDef.originX + col;
			if (destX < 0 || destX >= def.width) continue;

			const destColumn = columns[destX];
			const srcColumn = picture.columns[col];
			if (!destColumn || !srcColumn) continue;

			for (const post of srcColumn) {
				for (let i = 0; i < post.pixels.length; i++) {
					const destY = patchDef.originY + post.topDelta + i;
					if (destY < 0 || destY >= def.height) continue;
					const pixel = post.pixels[i];
					if (pixel !== undefined) {
						destColumn[destY] = pixel;
					}
				}
			}
		}
	}

	return { name: def.name, width: def.width, height: def.height, columns };
}
