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
		it('works without a screen entity using default state', () => {
			world = createWorld();
			// spawnScreenProcess uses default state when no screen entity exists
			const child = spawnScreenProcess(world, 'echo', ['hello']);
			expect(child).toBeDefined();
			child.kill();
		});

		it('spawns process and forwards onExit', async () => {
			world = createWorld();
			createScreenEntity(world, { width: 80, height: 24 });

			const exitPromise = new Promise<number | null>((resolve) => {
				spawnScreenProcess(world, 'echo', ['hello'], {
					onExit: (code) => {
						resolve(code);
					},
				});
			});

			const code = await exitPromise;
			expect(code).toBe(0);
		});

		it('does not modify dirty flag on spawn', async () => {
			world = createWorld();
			const screen = createScreenEntity(world, { width: 80, height: 24 });

			// Clear dirty flag
			Renderable.dirty[screen] = 0;

			const exitPromise = new Promise<void>((resolve) => {
				spawnScreenProcess(world, 'echo', ['hello'], {
					onExit: () => resolve(),
				});
			});

			await exitPromise;
			// spawnScreenProcess does not manage render state
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
		it('works without a screen entity using default state', async () => {
			world = createWorld();
			const result = await execScreenProcess(world, 'echo', ['hello']);
			expect(result.stdout.trim()).toBe('hello');
			expect(result.exitCode).toBe(0);
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
