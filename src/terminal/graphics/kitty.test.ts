import { describe, expect, it } from 'vitest';
import type { KittyEnvChecker } from './kitty';
import {
	APC_PREFIX,
	buildAnimationControl,
	buildAnimationFrame,
	buildChunkedSequences,
	buildDeleteAll,
	buildDeleteAtCursor,
	buildDeleteById,
	buildKittySequence,
	buildPlacement,
	buildQuery,
	buildTransmitAndDisplay,
	buildTransmitOnly,
	chunkBase64,
	clearKittyImage,
	createKittyBackend,
	imageFormatToKitty,
	isKittySupported,
	KITTY_BACKEND_NAME,
	KITTY_ST,
	KittyFrameConfigSchema,
	KittyImageConfigSchema,
	kittyCursorPosition,
	kittyEncodeBase64,
	MAX_CHUNK_SIZE,
	renderKittyImage,
	serializeControlData,
} from './kitty';

// =============================================================================
// CONSTANTS
// =============================================================================

describe('constants', () => {
	it('should have correct APC prefix', () => {
		expect(APC_PREFIX).toBe('\x1b_G');
	});

	it('should have correct string terminator', () => {
		expect(KITTY_ST).toBe('\x1b\\');
	});

	it('should have correct max chunk size', () => {
		expect(MAX_CHUNK_SIZE).toBe(4096);
	});

	it('should have correct backend name', () => {
		expect(KITTY_BACKEND_NAME).toBe('kitty');
	});
});

// =============================================================================
// SCHEMAS
// =============================================================================

describe('KittyImageConfigSchema', () => {
	it('should accept empty config', () => {
		expect(() => KittyImageConfigSchema.parse({})).not.toThrow();
	});

	it('should accept full config', () => {
		const result = KittyImageConfigSchema.parse({
			imageId: 42,
			placementId: 7,
			quiet: 2,
			zIndex: -1,
			holdCursor: true,
		});
		expect(result.imageId).toBe(42);
		expect(result.placementId).toBe(7);
		expect(result.quiet).toBe(2);
		expect(result.zIndex).toBe(-1);
		expect(result.holdCursor).toBe(true);
	});

	it('should reject imageId exceeding max', () => {
		expect(() => KittyImageConfigSchema.parse({ imageId: 4294967296 })).toThrow();
	});

	it('should reject zero imageId', () => {
		expect(() => KittyImageConfigSchema.parse({ imageId: 0 })).toThrow();
	});

	it('should reject invalid quiet mode', () => {
		expect(() => KittyImageConfigSchema.parse({ quiet: 3 })).toThrow();
	});
});

describe('KittyFrameConfigSchema', () => {
	it('should accept minimal frame config', () => {
		const result = KittyFrameConfigSchema.parse({ imageId: 1 });
		expect(result.imageId).toBe(1);
	});

	it('should accept full frame config', () => {
		const result = KittyFrameConfigSchema.parse({
			imageId: 1,
			frameNumber: 2,
			backgroundFrame: 1,
			duration: 100,
			x: 0,
			y: 0,
			width: 50,
			height: 50,
		});
		expect(result.frameNumber).toBe(2);
		expect(result.duration).toBe(100);
	});

	it('should reject missing imageId', () => {
		expect(() => KittyFrameConfigSchema.parse({})).toThrow();
	});
});

// =============================================================================
// BASE64
// =============================================================================

describe('kittyEncodeBase64', () => {
	it('should encode empty data', () => {
		expect(kittyEncodeBase64(new Uint8Array([]))).toBe('');
	});

	it('should encode simple data', () => {
		const data = new Uint8Array([72, 101, 108, 108, 111]);
		expect(kittyEncodeBase64(data)).toBe('SGVsbG8=');
	});

	it('should encode binary data', () => {
		const data = new Uint8Array([0, 255, 128, 64]);
		const result = kittyEncodeBase64(data);
		expect(result).toBe(Buffer.from(data).toString('base64'));
	});
});

// =============================================================================
// CONTROL DATA SERIALIZATION
// =============================================================================

describe('serializeControlData', () => {
	it('should serialize single key', () => {
		expect(serializeControlData({ a: 'T' })).toBe('a=T');
	});

	it('should serialize multiple keys', () => {
		const result = serializeControlData({ a: 'T', f: 100, i: 1 });
		expect(result).toContain('a=T');
		expect(result).toContain('f=100');
		expect(result).toContain('i=1');
	});

	it('should skip undefined values', () => {
		const result = serializeControlData({ a: 'T', f: undefined as unknown as 100 });
		expect(result).toBe('a=T');
	});

	it('should handle empty control data', () => {
		expect(serializeControlData({})).toBe('');
	});

	it('should handle zero values', () => {
		const result = serializeControlData({ m: 0 });
		expect(result).toBe('m=0');
	});
});

// =============================================================================
// SEQUENCE BUILDING
// =============================================================================

describe('buildKittySequence', () => {
	it('should build sequence without payload', () => {
		const seq = buildKittySequence({ a: 'd', d: 'A' });
		expect(seq.startsWith(APC_PREFIX)).toBe(true);
		expect(seq.endsWith(KITTY_ST)).toBe(true);
		expect(seq).toContain('a=d');
		expect(seq).toContain('d=A');
		expect(seq).not.toContain(';');
	});

	it('should build sequence with payload', () => {
		const seq = buildKittySequence({ a: 'T', f: 100 }, 'AAAA');
		expect(seq.startsWith(APC_PREFIX)).toBe(true);
		expect(seq.endsWith(KITTY_ST)).toBe(true);
		expect(seq).toContain(';AAAA');
	});
});

// =============================================================================
// CHUNKING
// =============================================================================

describe('chunkBase64', () => {
	it('should return single chunk for small data', () => {
		const chunks = chunkBase64('AAAA');
		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toBe('AAAA');
	});

	it('should return single chunk for exactly MAX_CHUNK_SIZE', () => {
		const data = 'A'.repeat(MAX_CHUNK_SIZE);
		const chunks = chunkBase64(data);
		expect(chunks).toHaveLength(1);
	});

	it('should chunk data larger than MAX_CHUNK_SIZE', () => {
		const data = 'A'.repeat(MAX_CHUNK_SIZE + 100);
		const chunks = chunkBase64(data);
		expect(chunks.length).toBeGreaterThan(1);
	});

	it('should produce chunks as multiples of 4 (except last)', () => {
		const data = 'A'.repeat(MAX_CHUNK_SIZE * 3 + 7);
		const chunks = chunkBase64(data);
		for (let i = 0; i < chunks.length - 1; i++) {
			const chunk = chunks[i];
			if (chunk !== undefined) {
				expect(chunk.length % 4).toBe(0);
			}
		}
	});

	it('should preserve all data', () => {
		const data = 'ABCDEFGH'.repeat(600);
		const chunks = chunkBase64(data);
		expect(chunks.join('')).toBe(data);
	});
});

describe('buildChunkedSequences', () => {
	it('should produce single sequence for small payload', () => {
		const sequences = buildChunkedSequences({ a: 'T', f: 100 }, 'AAAA');
		expect(sequences).toHaveLength(1);
		expect(sequences[0]).toContain('m=0');
		expect(sequences[0]).toContain('a=T');
	});

	it('should produce multiple sequences for large payload', () => {
		const largeData = 'A'.repeat(MAX_CHUNK_SIZE * 2 + 100);
		const sequences = buildChunkedSequences({ a: 'T', f: 100, i: 1 }, largeData);
		expect(sequences.length).toBeGreaterThan(1);
	});

	it('should set m=1 on first chunk of multi-chunk', () => {
		const largeData = 'A'.repeat(MAX_CHUNK_SIZE * 2);
		const sequences = buildChunkedSequences({ a: 'T' }, largeData);
		expect(sequences[0]).toContain('m=1');
		expect(sequences[0]).toContain('a=T');
	});

	it('should set m=0 on last chunk', () => {
		const largeData = 'A'.repeat(MAX_CHUNK_SIZE * 2);
		const sequences = buildChunkedSequences({ a: 'T' }, largeData);
		const last = sequences[sequences.length - 1];
		expect(last).toContain('m=0');
	});

	it('should only have control keys on first chunk', () => {
		const largeData = 'A'.repeat(MAX_CHUNK_SIZE * 2);
		const sequences = buildChunkedSequences({ a: 'T', f: 100, i: 1 }, largeData);
		// First chunk has all keys
		expect(sequences[0]).toContain('a=T');
		expect(sequences[0]).toContain('f=100');
		expect(sequences[0]).toContain('i=1');
		// Subsequent chunks only have m
		for (let i = 1; i < sequences.length; i++) {
			expect(sequences[i]).not.toContain('a=T');
			expect(sequences[i]).not.toContain('f=100');
		}
	});
});

// =============================================================================
// FORMAT MAPPING
// =============================================================================

describe('imageFormatToKitty', () => {
	it('should map rgba to 32', () => {
		expect(imageFormatToKitty('rgba')).toBe(32);
	});

	it('should map rgb to 24', () => {
		expect(imageFormatToKitty('rgb')).toBe(24);
	});

	it('should map png to 100', () => {
		expect(imageFormatToKitty('png')).toBe(100);
	});
});

// =============================================================================
// CURSOR POSITIONING
// =============================================================================

describe('kittyCursorPosition', () => {
	it('should format CUP sequence (1-based)', () => {
		expect(kittyCursorPosition(0, 0)).toBe('\x1b[1;1H');
		expect(kittyCursorPosition(9, 4)).toBe('\x1b[5;10H');
	});

	it('should handle large positions', () => {
		expect(kittyCursorPosition(199, 49)).toBe('\x1b[50;200H');
	});
});

// =============================================================================
// TRANSMIT + DISPLAY
// =============================================================================

describe('buildTransmitAndDisplay', () => {
	it('should include cursor positioning', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 5, y: 3 });
		expect(output.startsWith('\x1b[4;6H')).toBe(true);
	});

	it('should include APC prefix', () => {
		const image = {
			width: 10,
			height: 10,
			data: new Uint8Array([1, 2, 3]),
			format: 'png' as const,
		};
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 });
		expect(output).toContain(APC_PREFIX);
	});

	it('should set action to T (transmit and display)', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 });
		expect(output).toContain('a=T');
	});

	it('should set format for PNG', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 });
		expect(output).toContain('f=100');
	});

	it('should set format and dimensions for RGBA', () => {
		const image = { width: 4, height: 2, data: new Uint8Array(32), format: 'rgba' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 });
		expect(output).toContain('f=32');
		expect(output).toContain('s=4');
		expect(output).toContain('v=2');
	});

	it('should not include s/v for PNG', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 });
		// Should not contain s= or v= for source dimensions
		// (But may contain other keys with s or v in their values)
		const afterPrefix = output.slice(output.indexOf(APC_PREFIX) + APC_PREFIX.length);
		const controlPart = afterPrefix.split(';')[0] ?? '';
		const keys = controlPart.split(',').map((p) => p.split('=')[0]);
		expect(keys).not.toContain('s');
		expect(keys).not.toContain('v');
	});

	it('should include display dimensions when provided', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0, width: 40, height: 20 });
		expect(output).toContain('c=40');
		expect(output).toContain('r=20');
	});

	it('should include image ID when provided', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 }, { imageId: 42 });
		expect(output).toContain('i=42');
	});

	it('should suppress responses by default (q=2)', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 });
		expect(output).toContain('q=2');
	});

	it('should set z-index when provided', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 }, { zIndex: -1 });
		expect(output).toContain('z=-1');
	});

	it('should set hold cursor when provided', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 }, { holdCursor: true });
		expect(output).toContain('C=1');
	});

	it('should encode base64 payload', () => {
		const data = new Uint8Array([1, 2, 3]);
		const image = { width: 1, height: 1, data, format: 'png' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 });
		expect(output).toContain(kittyEncodeBase64(data));
	});
});

// =============================================================================
// TRANSMIT ONLY
// =============================================================================

describe('buildTransmitOnly', () => {
	it('should set action to t (transmit only)', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitOnly(image, 42);
		expect(output).toContain('a=t');
	});

	it('should include image ID', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitOnly(image, 42);
		expect(output).toContain('i=42');
	});

	it('should suppress responses by default', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = buildTransmitOnly(image, 42);
		expect(output).toContain('q=2');
	});

	it('should include source dimensions for RGBA', () => {
		const image = { width: 4, height: 2, data: new Uint8Array(32), format: 'rgba' as const };
		const output = buildTransmitOnly(image, 1);
		expect(output).toContain('s=4');
		expect(output).toContain('v=2');
	});
});

// =============================================================================
// PLACEMENT
// =============================================================================

describe('buildPlacement', () => {
	it('should set action to p (place)', () => {
		const output = buildPlacement(42, { x: 0, y: 0 });
		expect(output).toContain('a=p');
	});

	it('should include image ID', () => {
		const output = buildPlacement(42, { x: 0, y: 0 });
		expect(output).toContain('i=42');
	});

	it('should include cursor positioning', () => {
		const output = buildPlacement(42, { x: 5, y: 3 });
		expect(output.startsWith('\x1b[4;6H')).toBe(true);
	});

	it('should include display dimensions', () => {
		const output = buildPlacement(42, { x: 0, y: 0, width: 20, height: 10 });
		expect(output).toContain('c=20');
		expect(output).toContain('r=10');
	});

	it('should include placement ID', () => {
		const output = buildPlacement(42, { x: 0, y: 0 }, { placementId: 7 });
		expect(output).toContain('p=7');
	});
});

// =============================================================================
// DELETION
// =============================================================================

describe('buildDeleteAll', () => {
	it('should build delete all sequence', () => {
		const seq = buildDeleteAll();
		expect(seq).toContain('a=d');
		expect(seq).toContain('d=A');
	});
});

describe('buildDeleteById', () => {
	it('should build delete by ID with data free (uppercase I)', () => {
		const seq = buildDeleteById(42);
		expect(seq).toContain('a=d');
		expect(seq).toContain('d=I');
		expect(seq).toContain('i=42');
	});

	it('should build delete by ID without data free (lowercase i)', () => {
		const seq = buildDeleteById(42, false);
		expect(seq).toContain('d=i');
		expect(seq).toContain('i=42');
	});
});

describe('buildDeleteAtCursor', () => {
	it('should build delete at cursor with data free (uppercase C)', () => {
		const seq = buildDeleteAtCursor();
		expect(seq).toContain('a=d');
		expect(seq).toContain('d=C');
	});

	it('should build delete at cursor without data free (lowercase c)', () => {
		const seq = buildDeleteAtCursor(false);
		expect(seq).toContain('d=c');
	});
});

// =============================================================================
// ANIMATION
// =============================================================================

describe('buildAnimationFrame', () => {
	it('should set action to f (frame)', () => {
		const output = buildAnimationFrame(new Uint8Array([1]), { imageId: 1 });
		expect(output).toContain('a=f');
	});

	it('should include image ID', () => {
		const output = buildAnimationFrame(new Uint8Array([1]), { imageId: 42 });
		expect(output).toContain('i=42');
	});

	it('should include frame number', () => {
		const output = buildAnimationFrame(new Uint8Array([1]), { imageId: 1, frameNumber: 3 });
		expect(output).toContain('r=3');
	});

	it('should include duration', () => {
		const output = buildAnimationFrame(new Uint8Array([1]), { imageId: 1, duration: 100 });
		expect(output).toContain('z=100');
	});

	it('should include background frame', () => {
		const output = buildAnimationFrame(new Uint8Array([1]), { imageId: 1, backgroundFrame: 1 });
		expect(output).toContain('c=1');
	});

	it('should encode frame data', () => {
		const data = new Uint8Array([1, 2, 3]);
		const output = buildAnimationFrame(data, { imageId: 1 });
		expect(output).toContain(kittyEncodeBase64(data));
	});
});

describe('buildAnimationControl', () => {
	it('should build start command', () => {
		const seq = buildAnimationControl(1, 'start');
		expect(seq).toContain('a=a');
		expect(seq).toContain('i=1');
		expect(seq).toContain('s=3');
		expect(seq).toContain('v=1');
	});

	it('should build stop command', () => {
		const seq = buildAnimationControl(1, 'stop');
		expect(seq).toContain('a=a');
		expect(seq).toContain('i=1');
		expect(seq).toContain('s=1');
	});

	it('should handle loop count', () => {
		const seq = buildAnimationControl(1, 'start', 3);
		expect(seq).toContain('v=4'); // loops + 1
	});

	it('should default to infinite loops', () => {
		const seq = buildAnimationControl(1, 'start');
		expect(seq).toContain('v=1'); // infinite
	});
});

// =============================================================================
// QUERY
// =============================================================================

describe('buildQuery', () => {
	it('should build valid query sequence', () => {
		const seq = buildQuery();
		expect(seq.startsWith(APC_PREFIX)).toBe(true);
		expect(seq.endsWith(KITTY_ST)).toBe(true);
		expect(seq).toContain('a=q');
		expect(seq).toContain('i=31');
		expect(seq).toContain(';AAAA');
	});
});

// =============================================================================
// DETECTION
// =============================================================================

describe('isKittySupported', () => {
	it('should detect xterm-kitty TERM', () => {
		const env: KittyEnvChecker = {
			getEnv: (name: string) => (name === 'TERM' ? 'xterm-kitty' : undefined),
		};
		expect(isKittySupported(env)).toBe(true);
	});

	it('should detect kitty TERM_PROGRAM', () => {
		const env: KittyEnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'kitty' : undefined),
		};
		expect(isKittySupported(env)).toBe(true);
	});

	it('should return false for xterm', () => {
		const env: KittyEnvChecker = {
			getEnv: (name: string) => (name === 'TERM' ? 'xterm-256color' : undefined),
		};
		expect(isKittySupported(env)).toBe(false);
	});

	it('should return false for unknown terminal', () => {
		const env: KittyEnvChecker = {
			getEnv: () => undefined,
		};
		expect(isKittySupported(env)).toBe(false);
	});

	it('should return false for iTerm2', () => {
		const env: KittyEnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'iTerm.app' : undefined),
		};
		expect(isKittySupported(env)).toBe(false);
	});
});

// =============================================================================
// RENDER HELPER
// =============================================================================

describe('renderKittyImage', () => {
	it('should include cursor positioning', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = renderKittyImage(image, { x: 5, y: 3 });
		expect(output.startsWith('\x1b[4;6H')).toBe(true);
	});

	it('should include image sequence', () => {
		const image = {
			width: 10,
			height: 10,
			data: new Uint8Array([1, 2, 3]),
			format: 'png' as const,
		};
		const output = renderKittyImage(image, { x: 0, y: 0 });
		expect(output).toContain(APC_PREFIX);
		expect(output).toContain(kittyEncodeBase64(new Uint8Array([1, 2, 3])));
	});

	it('should include display dimensions', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = renderKittyImage(image, { x: 0, y: 0, width: 40, height: 20 });
		expect(output).toContain('c=40');
		expect(output).toContain('r=20');
	});

	it('should pass through image ID', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = renderKittyImage(image, { x: 0, y: 0, id: 99 });
		expect(output).toContain('i=99');
	});
});

// =============================================================================
// CLEAR
// =============================================================================

describe('clearKittyImage', () => {
	it('should delete all without ID', () => {
		const seq = clearKittyImage();
		expect(seq).toContain('a=d');
		expect(seq).toContain('d=A');
	});

	it('should delete by ID', () => {
		const seq = clearKittyImage(42);
		expect(seq).toContain('a=d');
		expect(seq).toContain('d=I');
		expect(seq).toContain('i=42');
	});
});

// =============================================================================
// BACKEND FACTORY
// =============================================================================

describe('createKittyBackend', () => {
	it('should create backend with correct name', () => {
		const backend = createKittyBackend();
		expect(backend.name).toBe('kitty');
	});

	it('should have correct capabilities', () => {
		const backend = createKittyBackend();
		expect(backend.capabilities.staticImages).toBe(true);
		expect(backend.capabilities.animation).toBe(true);
		expect(backend.capabilities.alphaChannel).toBe(true);
		expect(backend.capabilities.maxWidth).toBeNull();
		expect(backend.capabilities.maxHeight).toBeNull();
	});

	it('should detect support using env checker', () => {
		const kittyEnv: KittyEnvChecker = {
			getEnv: (name: string) => (name === 'TERM' ? 'xterm-kitty' : undefined),
		};
		const backend = createKittyBackend(kittyEnv);
		expect(backend.isSupported()).toBe(true);

		const xtermEnv: KittyEnvChecker = {
			getEnv: (name: string) => (name === 'TERM' ? 'xterm-256color' : undefined),
		};
		const unsupported = createKittyBackend(xtermEnv);
		expect(unsupported.isSupported()).toBe(false);
	});

	it('should render images', () => {
		const backend = createKittyBackend();
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = backend.render(image, { x: 0, y: 0 });
		expect(output).toContain(APC_PREFIX);
	});

	it('should clear all images', () => {
		const backend = createKittyBackend();
		const output = backend.clear();
		expect(output).toContain('a=d');
		expect(output).toContain('d=A');
	});

	it('should clear specific image by ID', () => {
		const backend = createKittyBackend();
		const output = backend.clear(42);
		expect(output).toContain('i=42');
		expect(output).toContain('d=I');
	});
});

// =============================================================================
// LARGE IMAGE CHUNKING INTEGRATION
// =============================================================================

describe('large image chunking', () => {
	it('should correctly chunk a large image', () => {
		// Create data that will produce a large base64 string
		const data = new Uint8Array(8192); // Will be ~10923 base64 chars
		for (let i = 0; i < data.length; i++) {
			data[i] = i % 256;
		}
		const image = { width: 64, height: 32, data, format: 'rgba' as const };
		const output = buildTransmitAndDisplay(image, { x: 0, y: 0 });

		// Should contain multiple APC sequences
		const apcCount = output.split(APC_PREFIX).length - 1;
		expect(apcCount).toBeGreaterThan(1);

		// First sequence has control keys
		expect(output).toContain('a=T');
		expect(output).toContain('f=32');

		// Should end with the string terminator
		expect(output.endsWith(KITTY_ST)).toBe(true);
	});
});
