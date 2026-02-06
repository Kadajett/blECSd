import { describe, expect, it } from 'vitest';
import type { ITerm2EnvChecker } from './iterm2';
import {
	buildImageSequence,
	buildParams,
	clearITerm2Image,
	createITerm2Backend,
	cursorPosition,
	encodeBase64,
	formatSize,
	ITERM2_BACKEND_NAME,
	ITerm2ImageConfigSchema,
	ITerm2SizeSchema,
	isITerm2Supported,
	OSC_1337_PREFIX,
	renderITerm2Image,
	ST,
} from './iterm2';

// =============================================================================
// CONSTANTS
// =============================================================================

describe('constants', () => {
	it('should have correct OSC prefix', () => {
		expect(OSC_1337_PREFIX).toBe('\x1b]1337;File=');
	});

	it('should have correct string terminator', () => {
		expect(ST).toBe('\x07');
	});

	it('should have correct backend name', () => {
		expect(ITERM2_BACKEND_NAME).toBe('iterm2');
	});
});

// =============================================================================
// SCHEMAS
// =============================================================================

describe('ITerm2SizeSchema', () => {
	it('should accept valid sizes', () => {
		expect(ITerm2SizeSchema.parse({ value: 40, unit: 'cells' })).toEqual({
			value: 40,
			unit: 'cells',
		});
		expect(ITerm2SizeSchema.parse({ value: 100, unit: 'px' })).toEqual({
			value: 100,
			unit: 'px',
		});
		expect(ITerm2SizeSchema.parse({ value: 0, unit: 'auto' })).toEqual({
			value: 0,
			unit: 'auto',
		});
		expect(ITerm2SizeSchema.parse({ value: 50, unit: '%' })).toEqual({ value: 50, unit: '%' });
	});

	it('should reject negative values', () => {
		expect(() => ITerm2SizeSchema.parse({ value: -1, unit: 'px' })).toThrow();
	});

	it('should reject invalid units', () => {
		expect(() => ITerm2SizeSchema.parse({ value: 10, unit: 'em' })).toThrow();
	});
});

describe('ITerm2ImageConfigSchema', () => {
	it('should accept empty config with defaults', () => {
		const result = ITerm2ImageConfigSchema.parse({});
		expect(result.inline).toBe(true);
		expect(result.preserveAspectRatio).toBe(true);
	});

	it('should accept full config', () => {
		const result = ITerm2ImageConfigSchema.parse({
			inline: false,
			name: 'test.png',
			width: { value: 40, unit: 'cells' },
			height: { value: 20, unit: 'cells' },
			preserveAspectRatio: false,
		});
		expect(result.inline).toBe(false);
		expect(result.name).toBe('test.png');
		expect(result.preserveAspectRatio).toBe(false);
	});
});

// =============================================================================
// BASE64
// =============================================================================

describe('encodeBase64', () => {
	it('should encode empty data', () => {
		expect(encodeBase64(new Uint8Array([]))).toBe('');
	});

	it('should encode simple data', () => {
		const data = new Uint8Array([72, 101, 108, 108, 111]);
		expect(encodeBase64(data)).toBe('SGVsbG8=');
	});

	it('should encode binary data', () => {
		const data = new Uint8Array([0, 255, 128, 64]);
		const result = encodeBase64(data);
		expect(result).toBe(Buffer.from(data).toString('base64'));
	});
});

// =============================================================================
// SIZE FORMATTING
// =============================================================================

describe('formatSize', () => {
	it('should format cells (no suffix)', () => {
		expect(formatSize({ value: 40, unit: 'cells' })).toBe('40');
	});

	it('should format pixels', () => {
		expect(formatSize({ value: 100, unit: 'px' })).toBe('100px');
	});

	it('should format percentage', () => {
		expect(formatSize({ value: 50, unit: '%' })).toBe('50%');
	});

	it('should format auto', () => {
		expect(formatSize({ value: 0, unit: 'auto' })).toBe('auto');
	});
});

// =============================================================================
// PARAMS BUILDING
// =============================================================================

describe('buildParams', () => {
	it('should build minimal params', () => {
		const params = buildParams({ inline: true }, 1024);
		expect(params).toBe('size=1024;inline=1');
	});

	it('should include name as base64', () => {
		const params = buildParams({ inline: true, name: 'test.png' }, 100);
		const expectedName = Buffer.from('test.png', 'utf-8').toString('base64');
		expect(params).toContain(`name=${expectedName}`);
	});

	it('should include width and height', () => {
		const params = buildParams(
			{
				inline: true,
				width: { value: 40, unit: 'cells' },
				height: { value: 20, unit: 'px' },
			},
			100,
		);
		expect(params).toContain('width=40');
		expect(params).toContain('height=20px');
	});

	it('should include preserveAspectRatio=0 when false', () => {
		const params = buildParams({ inline: true, preserveAspectRatio: false }, 100);
		expect(params).toContain('preserveAspectRatio=0');
	});

	it('should not include preserveAspectRatio when true', () => {
		const params = buildParams({ inline: true, preserveAspectRatio: true }, 100);
		expect(params).not.toContain('preserveAspectRatio');
	});

	it('should set inline=0 when inline is false', () => {
		const params = buildParams({ inline: false }, 100);
		expect(params).toContain('inline=0');
	});
});

// =============================================================================
// IMAGE SEQUENCE
// =============================================================================

describe('buildImageSequence', () => {
	it('should build complete sequence', () => {
		const data = new Uint8Array([1, 2, 3]);
		const seq = buildImageSequence(data, { inline: true });
		expect(seq.startsWith(OSC_1337_PREFIX)).toBe(true);
		expect(seq).toContain('size=3');
		expect(seq).toContain('inline=1');
		expect(seq).toContain(':');
		expect(seq).toContain(encodeBase64(data));
		expect(seq.endsWith(ST)).toBe(true);
	});

	it('should use default config', () => {
		const data = new Uint8Array([0]);
		const seq = buildImageSequence(data);
		expect(seq).toContain('inline=1');
	});
});

// =============================================================================
// CURSOR POSITIONING
// =============================================================================

describe('cursorPosition', () => {
	it('should format CUP sequence (1-based)', () => {
		expect(cursorPosition(0, 0)).toBe('\x1b[1;1H');
		expect(cursorPosition(9, 4)).toBe('\x1b[5;10H');
	});

	it('should handle large positions', () => {
		expect(cursorPosition(199, 49)).toBe('\x1b[50;200H');
	});
});

// =============================================================================
// DETECTION
// =============================================================================

describe('isITerm2Supported', () => {
	it('should detect iTerm2', () => {
		const env: ITerm2EnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'iTerm.app' : undefined),
		};
		expect(isITerm2Supported(env)).toBe(true);
	});

	it('should detect WezTerm', () => {
		const env: ITerm2EnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'WezTerm' : undefined),
		};
		expect(isITerm2Supported(env)).toBe(true);
	});

	it('should detect via LC_TERMINAL', () => {
		const env: ITerm2EnvChecker = {
			getEnv: (name: string) => (name === 'LC_TERMINAL' ? 'iTerm.app' : undefined),
		};
		expect(isITerm2Supported(env)).toBe(true);
	});

	it('should detect mintty', () => {
		const env: ITerm2EnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'mintty' : undefined),
		};
		expect(isITerm2Supported(env)).toBe(true);
	});

	it('should return false for unknown terminal', () => {
		const env: ITerm2EnvChecker = {
			getEnv: () => undefined,
		};
		expect(isITerm2Supported(env)).toBe(false);
	});

	it('should return false for xterm', () => {
		const env: ITerm2EnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'xterm' : undefined),
		};
		expect(isITerm2Supported(env)).toBe(false);
	});
});

// =============================================================================
// RENDER
// =============================================================================

describe('renderITerm2Image', () => {
	it('should include cursor positioning', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = renderITerm2Image(image, { x: 5, y: 3 });
		expect(output.startsWith('\x1b[4;6H')).toBe(true); // CUP at row 4, col 6 (1-based)
	});

	it('should include image sequence', () => {
		const image = {
			width: 10,
			height: 10,
			data: new Uint8Array([1, 2, 3]),
			format: 'png' as const,
		};
		const output = renderITerm2Image(image, { x: 0, y: 0 });
		expect(output).toContain(OSC_1337_PREFIX);
		expect(output).toContain(encodeBase64(new Uint8Array([1, 2, 3])));
	});

	it('should include size options', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = renderITerm2Image(image, { x: 0, y: 0, width: 40, height: 20 });
		expect(output).toContain('width=40');
		expect(output).toContain('height=20');
	});

	it('should set preserveAspectRatio=0 when false', () => {
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = renderITerm2Image(image, { x: 0, y: 0, preserveAspectRatio: false });
		expect(output).toContain('preserveAspectRatio=0');
	});
});

// =============================================================================
// CLEAR
// =============================================================================

describe('clearITerm2Image', () => {
	it('should return empty string without options', () => {
		expect(clearITerm2Image()).toBe('');
	});

	it('should generate space-fill for area', () => {
		const output = clearITerm2Image({ x: 0, y: 0, width: 3, height: 2 });
		// Should have cursor positions and spaces for each row
		expect(output).toContain('\x1b[1;1H   ');
		expect(output).toContain('\x1b[2;1H   ');
	});
});

// =============================================================================
// BACKEND FACTORY
// =============================================================================

describe('createITerm2Backend', () => {
	it('should create backend with correct name', () => {
		const backend = createITerm2Backend();
		expect(backend.name).toBe('iterm2');
	});

	it('should have correct capabilities', () => {
		const backend = createITerm2Backend();
		expect(backend.capabilities.staticImages).toBe(true);
		expect(backend.capabilities.animation).toBe(false);
		expect(backend.capabilities.alphaChannel).toBe(true);
		expect(backend.capabilities.maxWidth).toBeNull();
		expect(backend.capabilities.maxHeight).toBeNull();
	});

	it('should detect support using env checker', () => {
		const iterm2Env: ITerm2EnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'iTerm.app' : undefined),
		};
		const backend = createITerm2Backend(iterm2Env);
		expect(backend.isSupported()).toBe(true);

		const xtermEnv: ITerm2EnvChecker = {
			getEnv: (name: string) => (name === 'TERM_PROGRAM' ? 'xterm' : undefined),
		};
		const unsupported = createITerm2Backend(xtermEnv);
		expect(unsupported.isSupported()).toBe(false);
	});

	it('should render images', () => {
		const backend = createITerm2Backend();
		const image = { width: 10, height: 10, data: new Uint8Array([1]), format: 'png' as const };
		const output = backend.render(image, { x: 0, y: 0 });
		expect(output).toContain(OSC_1337_PREFIX);
	});

	it('should return empty string for clear (iTerm2 limitation)', () => {
		const backend = createITerm2Backend();
		expect(backend.clear()).toBe('');
	});
});
