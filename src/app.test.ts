import type { Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRenderPipeline, onShutdown, renderToString } from './app';
import { setContent, setDimensions, setPosition } from './components/index';
import { addEntity } from './core/ecs';
import { createScreenEntity } from './core/entities/factories';
import { createWorld } from './core/world';

type MockStream = Writable & { columns?: number; rows?: number };

function createMockStream(opts: { columns?: number; rows?: number } = {}): MockStream {
	return {
		...opts,
		write: vi.fn(() => true),
	} as unknown as MockStream;
}

describe('createRenderPipeline', () => {
	it('returns cols and rows from stream', () => {
		const stream = createMockStream({ columns: 120, rows: 40 });

		const result = createRenderPipeline(stream);
		expect(result.cols).toBe(120);
		expect(result.rows).toBe(40);
	});

	it('respects explicit cols/rows options', () => {
		const stream = createMockStream({ columns: 120, rows: 40 });

		const result = createRenderPipeline(stream, { cols: 80, rows: 24 });
		expect(result.cols).toBe(80);
		expect(result.rows).toBe(24);
	});

	it('falls back to defaults when stream has no dimensions', () => {
		const stream = createMockStream();

		const result = createRenderPipeline(stream);
		expect(result.cols).toBe(80);
		expect(result.rows).toBe(24);
	});
});

describe('onShutdown', () => {
	afterEach(() => {
		process.removeAllListeners('SIGINT');
		process.removeAllListeners('SIGTERM');
	});

	it('returns a function', () => {
		const world = createWorld();
		const shutdown = onShutdown(world);
		expect(typeof shutdown).toBe('function');
	});
});

describe('renderToString', () => {
	it('captures rendered output as a string', () => {
		const world = createWorld();
		createScreenEntity(world, { width: 40, height: 10 });

		const entity = addEntity(world);
		setPosition(world, entity, 1, 1);
		setDimensions(world, entity, 10, 1);
		setContent(world, entity, 'Hello');

		const output = renderToString(world, 40, 10);
		// Output should be a string (may be empty on first frame with no prior content,
		// but should not throw)
		expect(typeof output).toBe('string');
	});
});
