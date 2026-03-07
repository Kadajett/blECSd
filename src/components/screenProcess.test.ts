/**
 * Tests for screen.spawn() and screen.exec() process management
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import type { World } from '../core/types';
import { Renderable } from './renderable';
import { execScreenProcess, resetScreenSingleton, spawnScreenProcess } from './screen';

describe('Screen Process Management', () => {
	let world: World;

	afterEach(() => {
		if (world) {
			resetScreenSingleton(world);
		}
	});

	describe('screenSpawn', () => {
		it('throws if no screen entity exists', () => {
			world = createWorld();
			expect(() => spawnScreenProcess(world, 'echo', ['hello'])).toThrow('No screen entity exists');
		});

		it('pauses rendering during spawn and resumes on exit', async () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			// Verify rendering is initially active
			expect(Renderable.visible[screen]).toBe(1);

			const exitPromise = new Promise<number | null>((resolve) => {
				const _child = spawnScreenProcess(world, 'echo', ['hello'], {
					onExit: (code) => {
						resolve(code);
					},
				});

				// While process is running, rendering should be paused
				expect(Renderable.visible[screen]).toBe(0);
			});

			const code = await exitPromise;
			expect(code).toBe(0);

			// After exit, rendering should be resumed
			expect(Renderable.visible[screen]).toBe(1);
			// And dirty flag set for redraw
			expect(Renderable.dirty[screen]).toBe(1);
		});

		it('supports redrawOnRestore=false', async () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			// Clear dirty flag
			Renderable.dirty[screen] = 0;

			const exitPromise = new Promise<void>((resolve) => {
				spawnScreenProcess(world, 'echo', ['hello'], {
					redrawOnRestore: false,
					onExit: () => resolve(),
				});
			});

			await exitPromise;
			// dirty should NOT have been set
			expect(Renderable.dirty[screen]).toBe(0);
		});

		it('forwards onExit callback', async () => {
			world = createWorld();
			createScreenEntity(world, { width: 80, height: 24 });

			const onExit = vi.fn();
			const exitPromise = new Promise<void>((resolve) => {
				spawnScreenProcess(world, 'echo', ['hello'], {
					onExit: (code, signal) => {
						onExit(code, signal);
						resolve();
					},
				});
			});

			await exitPromise;
			expect(onExit).toHaveBeenCalledWith(0, null);
		});
	});

	describe('screenExec', () => {
		it('throws if no screen entity exists', async () => {
			world = createWorld();
			await expect(execScreenProcess(world, 'echo', ['hello'])).rejects.toThrow(
				'No screen entity exists',
			);
		});

		it('returns stdout/stderr from executed command', async () => {
			world = createWorld();
			createScreenEntity(world, { width: 80, height: 24 });

			const result = await execScreenProcess(world, 'echo', ['hello']);
			expect(result.stdout.trim()).toBe('hello');
			expect(result.exitCode).toBe(0);
		});

		it('pauses rendering during exec and resumes after', async () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			expect(Renderable.visible[screen]).toBe(1);

			const result = await execScreenProcess(world, 'echo', ['test']);

			// After completion, rendering should be resumed
			expect(Renderable.visible[screen]).toBe(1);
			expect(Renderable.dirty[screen]).toBe(1);
			expect(result.stdout.trim()).toBe('test');
		});

		it('resumes rendering even on command failure', async () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			const result = await execScreenProcess(world, 'ls', ['nonexistent-path-12345']);

			// Rendering should still be resumed
			expect(Renderable.visible[screen]).toBe(1);
			expect(result.exitCode).not.toBe(0);
		});

		it('resumes rendering on spawn error', async () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			await expect(execScreenProcess(world, 'nonexistent-command-xyz-12345')).rejects.toThrow();

			// Rendering should still be resumed
			expect(Renderable.visible[screen]).toBe(1);
		});

		it('captures stderr', async () => {
			world = createWorld();
			createScreenEntity(world, { width: 80, height: 24 });

			const result = await execScreenProcess(world, 'sh', ['-c', 'echo err >&2']);
			expect(result.stderr.trim()).toBe('err');
		});
	});
});
