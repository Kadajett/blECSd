import { describe, expect, it } from 'vitest';
import type { GraphicsBackend } from './backend';
import {
	clearImage,
	createGraphicsManager,
	DEFAULT_FALLBACK_CHAIN,
	GraphicsCapabilitiesSchema,
	GraphicsManagerConfigSchema,
	getActiveBackend,
	getBackendCapabilities,
	ImageDataSchema,
	RenderOptionsSchema,
	refreshBackend,
	registerBackend,
	renderImage,
	selectBackend,
} from './backend';

// =============================================================================
// HELPERS
// =============================================================================

function createMockBackend(
	name: 'kitty' | 'iterm2' | 'sixel' | 'ansi' | 'ascii',
	supported: boolean,
): GraphicsBackend {
	return {
		name,
		capabilities: {
			staticImages: true,
			animation: false,
			alphaChannel: true,
			maxWidth: null,
			maxHeight: null,
		},
		render: (_image, _options) => `[${name}:render]`,
		clear: (id) => `[${name}:clear:${id ?? 'all'}]`,
		isSupported: () => supported,
	};
}

// =============================================================================
// SCHEMAS
// =============================================================================

describe('GraphicsCapabilitiesSchema', () => {
	it('should accept valid capabilities', () => {
		const result = GraphicsCapabilitiesSchema.parse({
			staticImages: true,
			animation: false,
			alphaChannel: true,
			maxWidth: null,
			maxHeight: null,
		});
		expect(result.staticImages).toBe(true);
		expect(result.maxWidth).toBeNull();
	});

	it('should accept numeric max dimensions', () => {
		const result = GraphicsCapabilitiesSchema.parse({
			staticImages: true,
			animation: true,
			alphaChannel: false,
			maxWidth: 4096,
			maxHeight: 2160,
		});
		expect(result.maxWidth).toBe(4096);
	});
});

describe('ImageDataSchema', () => {
	it('should accept valid image data', () => {
		const result = ImageDataSchema.parse({
			width: 100,
			height: 50,
			data: new Uint8Array(100 * 50 * 4),
			format: 'rgba',
		});
		expect(result.format).toBe('rgba');
	});

	it('should accept png format', () => {
		const result = ImageDataSchema.parse({
			width: 0,
			height: 0,
			data: new Uint8Array([137, 80, 78, 71]),
			format: 'png',
		});
		expect(result.format).toBe('png');
	});

	it('should reject invalid format', () => {
		expect(() =>
			ImageDataSchema.parse({
				width: 10,
				height: 10,
				data: new Uint8Array(0),
				format: 'bmp',
			}),
		).toThrow();
	});
});

describe('RenderOptionsSchema', () => {
	it('should accept minimal options', () => {
		const result = RenderOptionsSchema.parse({ x: 0, y: 0 });
		expect(result.x).toBe(0);
	});

	it('should accept full options', () => {
		const result = RenderOptionsSchema.parse({
			x: 10,
			y: 5,
			width: 40,
			height: 20,
			id: 1,
			preserveAspectRatio: false,
		});
		expect(result.id).toBe(1);
		expect(result.preserveAspectRatio).toBe(false);
	});

	it('should reject negative position', () => {
		expect(() => RenderOptionsSchema.parse({ x: -1, y: 0 })).toThrow();
	});
});

describe('GraphicsManagerConfigSchema', () => {
	it('should accept empty config', () => {
		expect(() => GraphicsManagerConfigSchema.parse({})).not.toThrow();
	});

	it('should accept preference order', () => {
		const result = GraphicsManagerConfigSchema.parse({
			preferenceOrder: ['sixel', 'ansi'],
		});
		expect(result.preferenceOrder).toEqual(['sixel', 'ansi']);
	});
});

// =============================================================================
// FALLBACK CHAIN
// =============================================================================

describe('DEFAULT_FALLBACK_CHAIN', () => {
	it('should have correct order', () => {
		expect(DEFAULT_FALLBACK_CHAIN).toEqual([
			'kitty',
			'iterm2',
			'sixel',
			'ansi',
			'braille',
			'ascii',
		]);
	});
});

describe('selectBackend', () => {
	it('should select first supported backend', () => {
		const backends = new Map([
			['kitty' as const, createMockBackend('kitty', false)],
			['iterm2' as const, createMockBackend('iterm2', true)],
			['ansi' as const, createMockBackend('ansi', true)],
		]);
		const result = selectBackend(backends);
		expect(result?.name).toBe('iterm2');
	});

	it('should prefer higher-priority backends', () => {
		const backends = new Map([
			['kitty' as const, createMockBackend('kitty', true)],
			['iterm2' as const, createMockBackend('iterm2', true)],
		]);
		const result = selectBackend(backends);
		expect(result?.name).toBe('kitty');
	});

	it('should return undefined when none supported', () => {
		const backends = new Map([['kitty' as const, createMockBackend('kitty', false)]]);
		expect(selectBackend(backends)).toBeUndefined();
	});

	it('should return undefined for empty map', () => {
		expect(selectBackend(new Map())).toBeUndefined();
	});

	it('should respect custom preference order', () => {
		const backends = new Map([
			['kitty' as const, createMockBackend('kitty', true)],
			['ansi' as const, createMockBackend('ansi', true)],
		]);
		const result = selectBackend(backends, ['ansi', 'kitty']);
		expect(result?.name).toBe('ansi');
	});
});

// =============================================================================
// GRAPHICS MANAGER
// =============================================================================

describe('createGraphicsManager', () => {
	it('should create with defaults', () => {
		const manager = createGraphicsManager();
		expect(manager.backends.size).toBe(0);
		expect(manager.activeBackend).toBeUndefined();
		expect(manager.preferenceOrder).toEqual(DEFAULT_FALLBACK_CHAIN);
	});

	it('should accept pre-registered backends', () => {
		const ansi = createMockBackend('ansi', true);
		const manager = createGraphicsManager({ backends: [ansi] });
		expect(manager.backends.size).toBe(1);
		expect(manager.backends.get('ansi')).toBe(ansi);
	});

	it('should accept custom preference order', () => {
		const manager = createGraphicsManager({ preferenceOrder: ['ansi', 'ascii'] });
		expect(manager.preferenceOrder).toEqual(['ansi', 'ascii']);
	});
});

describe('registerBackend', () => {
	it('should add backend to manager', () => {
		const manager = createGraphicsManager();
		const ansi = createMockBackend('ansi', true);
		registerBackend(manager, ansi);
		expect(manager.backends.size).toBe(1);
	});

	it('should invalidate cached active backend', () => {
		const manager = createGraphicsManager();
		const ansi = createMockBackend('ansi', true);
		registerBackend(manager, ansi);
		getActiveBackend(manager);
		expect(manager.activeBackend).toBeDefined();

		const kitty = createMockBackend('kitty', true);
		registerBackend(manager, kitty);
		expect(manager.activeBackend).toBeUndefined();
	});
});

describe('getActiveBackend', () => {
	it('should select and cache backend', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('ansi', true));
		// Reset activeBackend to undefined for clean test
		manager.activeBackend = undefined;

		const backend = getActiveBackend(manager);
		expect(backend?.name).toBe('ansi');
		expect(manager.activeBackend).toBe(backend);
	});

	it('should return cached backend on subsequent calls', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('ansi', true));
		manager.activeBackend = undefined;

		const first = getActiveBackend(manager);
		const second = getActiveBackend(manager);
		expect(first).toBe(second);
	});

	it('should return undefined when no backends available', () => {
		const manager = createGraphicsManager();
		expect(getActiveBackend(manager)).toBeUndefined();
	});
});

describe('renderImage', () => {
	it('should render using active backend', () => {
		const manager = createGraphicsManager({ backends: [createMockBackend('ansi', true)] });
		const image = { width: 10, height: 10, data: new Uint8Array(400), format: 'rgba' as const };
		const result = renderImage(manager, image, { x: 0, y: 0 });
		expect(result).toBe('[ansi:render]');
	});

	it('should return empty string without backend', () => {
		const manager = createGraphicsManager();
		const image = { width: 10, height: 10, data: new Uint8Array(400), format: 'rgba' as const };
		expect(renderImage(manager, image, { x: 0, y: 0 })).toBe('');
	});
});

describe('clearImage', () => {
	it('should clear using active backend', () => {
		const manager = createGraphicsManager({ backends: [createMockBackend('ansi', true)] });
		expect(clearImage(manager, 5)).toBe('[ansi:clear:5]');
	});

	it('should clear all without id', () => {
		const manager = createGraphicsManager({ backends: [createMockBackend('ansi', true)] });
		expect(clearImage(manager)).toBe('[ansi:clear:all]');
	});

	it('should return empty string without backend', () => {
		const manager = createGraphicsManager();
		expect(clearImage(manager)).toBe('');
	});
});

describe('refreshBackend', () => {
	it('should re-select backend', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('ansi', true));
		manager.activeBackend = undefined;

		const backend = refreshBackend(manager);
		expect(backend?.name).toBe('ansi');
	});

	it('should pick new backend after registration', () => {
		const manager = createGraphicsManager();
		registerBackend(manager, createMockBackend('ansi', true));
		getActiveBackend(manager);

		registerBackend(manager, createMockBackend('kitty', true));
		const backend = refreshBackend(manager);
		expect(backend?.name).toBe('kitty');
	});
});

describe('getBackendCapabilities', () => {
	it('should return capabilities of active backend', () => {
		const manager = createGraphicsManager({ backends: [createMockBackend('ansi', true)] });
		const caps = getBackendCapabilities(manager);
		expect(caps?.staticImages).toBe(true);
	});

	it('should return undefined without backend', () => {
		const manager = createGraphicsManager();
		expect(getBackendCapabilities(manager)).toBeUndefined();
	});
});
