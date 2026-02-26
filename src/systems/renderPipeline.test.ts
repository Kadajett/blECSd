/**
 * Tests for createRenderPipeline convenience helper and the one-time
 * warning emitted by renderSystem/outputSystem when called without
 * initialised buffers.
 *
 * @module systems/renderPipeline.test
 */

import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	clearOutputBuffer,
	clearOutputStream,
	getOutputBuffer,
	getOutputStream,
	outputSystem,
} from './outputSystem';
import { createRenderPipeline } from './renderPipeline';
import { clearRenderBuffer, getRenderBuffer, renderSystem } from './renderSystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStream(): PassThrough {
	return new PassThrough();
}

// ---------------------------------------------------------------------------
// createRenderPipeline
// ---------------------------------------------------------------------------

describe('createRenderPipeline', () => {
	afterEach(() => {
		// Reset global state between tests
		clearOutputStream();
		clearOutputBuffer();
		clearRenderBuffer();
	});

	it('sets the output stream', () => {
		const stream = makeStream();
		createRenderPipeline({ output: stream, width: 80, height: 24 });
		expect(getOutputStream()).toBe(stream);
	});

	it('creates and sets the output buffer', () => {
		const stream = makeStream();
		const { doubleBuffer } = createRenderPipeline({ output: stream, width: 80, height: 24 });
		expect(getOutputBuffer()).toBe(doubleBuffer);
		expect(doubleBuffer.width).toBe(80);
		expect(doubleBuffer.height).toBe(24);
	});

	it('creates and sets the render (dirty tracker) buffer', () => {
		const stream = makeStream();
		const { dirtyTracker } = createRenderPipeline({ output: stream, width: 80, height: 24 });
		expect(getRenderBuffer()).toBe(dirtyTracker);
	});

	it('returns a destroy function that clears global state', () => {
		const stream = makeStream();
		const pipeline = createRenderPipeline({ output: stream, width: 80, height: 24 });

		pipeline.destroy();

		expect(getOutputStream()).toBeNull();
		expect(getOutputBuffer()).toBeNull();
		expect(getRenderBuffer()).toBeNull();
	});

	it('supports different terminal sizes', () => {
		const stream = makeStream();
		const { doubleBuffer } = createRenderPipeline({ output: stream, width: 120, height: 40 });
		expect(doubleBuffer.width).toBe(120);
		expect(doubleBuffer.height).toBe(40);
	});

	it('can be created, destroyed, and recreated without error', () => {
		const stream = makeStream();
		const p1 = createRenderPipeline({ output: stream, width: 80, height: 24 });
		p1.destroy();

		const p2 = createRenderPipeline({ output: stream, width: 80, height: 24 });
		expect(getOutputStream()).toBe(stream);
		p2.destroy();
	});
});

// ---------------------------------------------------------------------------
// One-time warning on uninitialised renderSystem
// ---------------------------------------------------------------------------

describe('renderSystem uninitialised buffer warning', () => {
	let world: World;
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		world = createWorld();
		clearRenderBuffer(); // ensures buffers are null (also resets warn flag)
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
		clearRenderBuffer();
	});

	it('emits a warning when render buffers are not initialised', () => {
		renderSystem(world);
		expect(warnSpy).toHaveBeenCalledOnce();
		expect(warnSpy.mock.calls[0][0]).toContain('renderSystem');
	});

	it('emits the warning only once across multiple calls', () => {
		renderSystem(world);
		renderSystem(world);
		renderSystem(world);
		expect(warnSpy).toHaveBeenCalledOnce();
	});

	it('does not warn when render buffers are properly initialised', () => {
		const stream = makeStream();
		const pipeline = createRenderPipeline({ output: stream, width: 80, height: 24 });
		renderSystem(world);
		expect(warnSpy).not.toHaveBeenCalled();
		pipeline.destroy();
	});

	it('resets warn flag after clearRenderBuffer, allowing a new warning', () => {
		renderSystem(world); // triggers first warning
		clearRenderBuffer(); // resets flag
		renderSystem(world); // should trigger again
		expect(warnSpy).toHaveBeenCalledTimes(2);
	});
});

// ---------------------------------------------------------------------------
// One-time warning on uninitialised outputSystem
// ---------------------------------------------------------------------------

describe('outputSystem uninitialised buffer warning', () => {
	let world: World;
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		world = createWorld();
		clearOutputStream();
		clearOutputBuffer();
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
		clearOutputStream();
		clearOutputBuffer();
	});

	it('emits a warning when output buffers are not initialised', () => {
		outputSystem(world);
		expect(warnSpy).toHaveBeenCalledOnce();
		expect(warnSpy.mock.calls[0][0]).toContain('outputSystem');
	});

	it('emits the warning only once across multiple calls', () => {
		outputSystem(world);
		outputSystem(world);
		outputSystem(world);
		expect(warnSpy).toHaveBeenCalledOnce();
	});

	it('does not warn when output buffers are properly initialised', () => {
		const stream = makeStream();
		const pipeline = createRenderPipeline({ output: stream, width: 80, height: 24 });
		outputSystem(world);
		expect(warnSpy).not.toHaveBeenCalled();
		pipeline.destroy();
	});

	it('resets warn flag after clearOutputStream, allowing a new warning', () => {
		outputSystem(world); // triggers first warning
		clearOutputStream(); // resets flag
		outputSystem(world); // should trigger again
		expect(warnSpy).toHaveBeenCalledTimes(2);
	});
});
