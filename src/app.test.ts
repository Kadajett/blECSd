import type { Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, createRenderPipeline, onShutdown, renderToString } from './app';
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

describe('createApp', () => {
	afterEach(() => {
		process.removeAllListeners('SIGINT');
		process.removeAllListeners('SIGTERM');
	});

	it('returns an App with world, program, cols, rows, render, shutdown, start', async () => {
		// Mock stdin to avoid raw mode issues in test
		const mockStdin = {
			isTTY: true,
			isRaw: false,
			setRawMode: vi.fn(),
			on: vi.fn(),
			resume: vi.fn(),
			pause: vi.fn(),
			removeListener: vi.fn(),
			removeAllListeners: vi.fn(),
		};
		const mockStdout = {
			columns: 60,
			rows: 20,
			isTTY: true,
			write: vi.fn(() => true),
			on: vi.fn(),
			removeListener: vi.fn(),
		};

		const app = await createApp({
			cols: 60,
			rows: 20,
			fullscreen: false,
			programOptions: {
				input: mockStdin as any,
				output: mockStdout as any,
			},
		});

		expect(app.world).toBeDefined();
		expect(app.program).toBeDefined();
		expect(app.cols).toBe(60);
		expect(app.rows).toBe(20);
		expect(typeof app.render).toBe('function');
		expect(typeof app.shutdown).toBe('function');
		expect(typeof app.start).toBe('function');
	});

	it('render() does not throw', async () => {
		const mockStdin = {
			isTTY: true,
			isRaw: false,
			setRawMode: vi.fn(),
			on: vi.fn(),
			resume: vi.fn(),
			pause: vi.fn(),
			removeListener: vi.fn(),
			removeAllListeners: vi.fn(),
		};
		const mockStdout = {
			columns: 40,
			rows: 10,
			isTTY: true,
			write: vi.fn(() => true),
			on: vi.fn(),
			removeListener: vi.fn(),
		};

		const app = await createApp({
			cols: 40,
			rows: 10,
			fullscreen: false,
			programOptions: {
				input: mockStdin as any,
				output: mockStdout as any,
			},
		});

		expect(() => app.render()).not.toThrow();
	});

	it('start() returns a stop function when fps > 0', async () => {
		const mockStdin = {
			isTTY: true,
			isRaw: false,
			setRawMode: vi.fn(),
			on: vi.fn(),
			resume: vi.fn(),
			pause: vi.fn(),
			removeListener: vi.fn(),
			removeAllListeners: vi.fn(),
		};
		const mockStdout = {
			columns: 40,
			rows: 10,
			isTTY: true,
			write: vi.fn(() => true),
			on: vi.fn(),
			removeListener: vi.fn(),
		};

		const app = await createApp({
			cols: 40,
			rows: 10,
			fps: 10,
			fullscreen: false,
			programOptions: {
				input: mockStdin as any,
				output: mockStdout as any,
			},
		});

		const stop = app.start();
		expect(typeof stop).toBe('function');
		stop(); // clean up interval
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
