/**
 * LZW decompression for GIF images.
 *
 * Implements the variable-width LZW decompression algorithm used in GIF files,
 * with support for clear codes, EOI codes, and dynamic code table management.
 *
 * @module media/gif/lzw
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result of successful LZW decompression.
 */
export interface LZWResult {
	readonly ok: true;
	/** Decompressed pixel indices */
	readonly data: Uint8Array;
}

/**
 * Error result from LZW decompression.
 */
export interface LZWError {
	readonly ok: false;
	readonly error: string;
}

/**
 * Result type for LZW decompression.
 */
export type LZWOutput = LZWResult | LZWError;

// =============================================================================
// BIT READER
// =============================================================================

/**
 * State for reading variable-width codes from a byte stream.
 */
interface BitReader {
	/** Source data bytes */
	readonly data: Uint8Array;
	/** Current byte offset */
	byteOffset: number;
	/** Current bit offset within the current byte */
	bitOffset: number;
}

/**
 * Creates a bit reader for the given data.
 *
 * @param data - Source byte array
 * @returns A new bit reader
 *
 * @example
 * ```typescript
 * import { createBitReader } from 'blecsd';
 *
 * const reader = createBitReader(new Uint8Array([0xff, 0x00]));
 * ```
 */
export function createBitReader(data: Uint8Array): BitReader {
	return { data, byteOffset: 0, bitOffset: 0 };
}

/**
 * Reads a variable-width code from the bit stream.
 *
 * @param reader - Bit reader state
 * @param codeSize - Number of bits to read
 * @returns The code value, or -1 if insufficient data
 *
 * @example
 * ```typescript
 * import { createBitReader, readCode } from 'blecsd';
 *
 * const reader = createBitReader(new Uint8Array([0b10110100]));
 * const code = readCode(reader, 4); // reads first 4 bits
 * ```
 */
export function readCode(reader: BitReader, codeSize: number): number {
	let result = 0;
	let bitsRead = 0;

	while (bitsRead < codeSize) {
		if (reader.byteOffset >= reader.data.length) {
			return -1;
		}

		const currentByte = reader.data[reader.byteOffset] ?? 0;
		const bitsAvailable = 8 - reader.bitOffset;
		const bitsNeeded = codeSize - bitsRead;
		const bitsToRead = Math.min(bitsAvailable, bitsNeeded);

		const mask = (1 << bitsToRead) - 1;
		const bits = (currentByte >> reader.bitOffset) & mask;
		result |= bits << bitsRead;

		bitsRead += bitsToRead;
		reader.bitOffset += bitsToRead;

		if (reader.bitOffset >= 8) {
			reader.bitOffset = 0;
			reader.byteOffset++;
		}
	}

	return result;
}

// =============================================================================
// CODE TABLE
// =============================================================================

/** Maximum code size in bits for GIF LZW */
const MAX_CODE_SIZE = 12;
/** Maximum number of entries in the code table */
const MAX_TABLE_SIZE = 1 << MAX_CODE_SIZE;

/**
 * Initializes the LZW code table with single-character entries.
 *
 * @param minCodeSize - Minimum code size (typically the color table size exponent)
 * @returns Array of code table entries (each entry is an array of pixel indices)
 */
function initCodeTable(minCodeSize: number): Array<readonly number[]> {
	const tableSize = 1 << minCodeSize;
	const table: Array<readonly number[]> = [];
	for (let i = 0; i < tableSize; i++) {
		table.push([i]);
	}
	// Clear code and EOI code entries (placeholders)
	table.push([]);
	table.push([]);
	return table;
}

// =============================================================================
// LZW DECOMPRESSION
// =============================================================================

/**
 * Decompresses LZW-encoded GIF image data.
 *
 * Implements the GIF variant of LZW decompression with variable code widths
 * from `minCodeSize + 1` up to 12 bits. Handles clear codes for table resets
 * and EOI codes for stream termination.
 *
 * @param compressedData - LZW compressed byte stream (sub-blocks already concatenated)
 * @param minCodeSize - Minimum LZW code size (from image descriptor)
 * @param expectedPixels - Expected number of output pixels
 * @returns Decompressed pixel indices or an error
 *
 * @example
 * ```typescript
 * import { decompressLZW } from 'blecsd';
 *
 * const result = decompressLZW(compressedBytes, 8, width * height);
 * if (result.ok) {
 *   // result.data contains palette indices
 * }
 * ```
 */
/**
 * Mutable decompression state passed between helper functions.
 */
interface DecompressState {
	readonly reader: BitReader;
	readonly output: Uint8Array;
	readonly expectedPixels: number;
	readonly minCodeSize: number;
	readonly clearCode: number;
	readonly eoiCode: number;
	table: Array<readonly number[]>;
	codeSize: number;
	nextCode: number;
	outputPos: number;
	prevCode: number;
}

/**
 * Handles a clear code by resetting the table and reading the next code.
 * Returns the next code to process, -1 for EOI/end, or an error string.
 */
function handleClearCode(state: DecompressState): number | string {
	state.codeSize = state.minCodeSize + 1;
	state.table = initCodeTable(state.minCodeSize);
	state.nextCode = state.eoiCode + 1;

	const code = readCode(state.reader, state.codeSize);
	if (code === -1 || code === state.eoiCode) return -1;
	if (code >= state.table.length) return `Code ${code} out of range after clear`;

	const entry = state.table[code];
	if (entry) {
		state.outputPos = writePixels(state.output, state.outputPos, entry, state.expectedPixels);
	}
	state.prevCode = code;
	return code;
}

/**
 * Processes a regular (non-clear, non-EOI) code.
 * Returns null on success, or an error string.
 */
function processCode(state: DecompressState, code: number): string | null {
	const prevEntry = state.table[state.prevCode];
	if (!prevEntry) return `Missing table entry for previous code ${state.prevCode}`;

	if (code < state.table.length) {
		const entry = state.table[code];
		if (entry) {
			state.outputPos = writePixels(state.output, state.outputPos, entry, state.expectedPixels);
			if (state.nextCode < MAX_TABLE_SIZE) {
				state.table.push([...prevEntry, entry[0] ?? 0]);
				state.nextCode++;
			}
		}
	} else if (code === state.nextCode) {
		const newEntry = [...prevEntry, prevEntry[0] ?? 0];
		state.outputPos = writePixels(state.output, state.outputPos, newEntry, state.expectedPixels);
		if (state.nextCode < MAX_TABLE_SIZE) {
			state.table.push(newEntry);
			state.nextCode++;
		}
	} else {
		return `Code ${code} out of range (next: ${state.nextCode})`;
	}

	state.prevCode = code;
	if (state.nextCode >= 1 << state.codeSize && state.codeSize < MAX_CODE_SIZE) {
		state.codeSize++;
	}
	return null;
}

/**
 * Reads and processes the first code after initialization or clear.
 * Returns null for end/empty, an error string, or the first code value.
 */
function readFirstCode(state: DecompressState): number | string {
	let code = readCode(state.reader, state.codeSize);
	if (code === state.clearCode) {
		code = readCode(state.reader, state.codeSize);
	}
	if (code === -1 || code === state.eoiCode) return -1;
	if (code >= state.table.length) return `First code ${code} out of range`;

	const entry = state.table[code];
	if (entry) {
		state.outputPos = writePixels(state.output, state.outputPos, entry, state.expectedPixels);
	}
	state.prevCode = code;
	return code;
}

/**
 * Runs the main decompression loop, processing codes until done.
 * Returns null on success or an error string.
 */
function decompressLoop(state: DecompressState): string | null {
	while (state.outputPos < state.expectedPixels) {
		const code = readCode(state.reader, state.codeSize);
		if (code === -1 || code === state.eoiCode) break;

		if (code === state.clearCode) {
			const result = handleClearCode(state);
			if (typeof result === 'string') return result;
			if (result === -1) break;
			continue;
		}

		const error = processCode(state, code);
		if (error) return error;
	}
	return null;
}

export function decompressLZW(
	compressedData: Uint8Array,
	minCodeSize: number,
	expectedPixels: number,
): LZWOutput {
	if (minCodeSize < 2 || minCodeSize > 11) {
		return { ok: false, error: `Invalid minimum code size: ${minCodeSize}` };
	}

	const clearCode = 1 << minCodeSize;
	const eoiCode = clearCode + 1;

	const state: DecompressState = {
		reader: createBitReader(compressedData),
		output: new Uint8Array(expectedPixels),
		expectedPixels,
		minCodeSize,
		clearCode,
		eoiCode,
		table: initCodeTable(minCodeSize),
		codeSize: minCodeSize + 1,
		nextCode: eoiCode + 1,
		outputPos: 0,
		prevCode: 0,
	};

	const firstResult = readFirstCode(state);
	if (firstResult === -1) return { ok: true, data: state.output.subarray(0, state.outputPos) };
	if (typeof firstResult === 'string') return { ok: false, error: firstResult };

	const loopError = decompressLoop(state);
	if (loopError) return { ok: false, error: loopError };

	return { ok: true, data: state.output.subarray(0, state.outputPos) };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Writes pixel indices to the output buffer, respecting the maximum size.
 */
function writePixels(
	output: Uint8Array,
	pos: number,
	pixels: readonly number[],
	maxPixels: number,
): number {
	let writePos = pos;
	for (const pixel of pixels) {
		if (writePos >= maxPixels) break;
		output[writePos] = pixel;
		writePos++;
	}
	return writePos;
}
