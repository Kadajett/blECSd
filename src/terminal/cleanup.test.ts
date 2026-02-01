/**
 * Tests for CleanupManager
 */

import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CleanupManager, onExit, registerForCleanup, unregisterFromCleanup } from './cleanup';

describe('CleanupManager', () => {
	let manager: CleanupManager;

	beforeEach(() => {
		CleanupManager.reset();
		manager = CleanupManager.instance;
	});

	afterEach(() => {
		CleanupManager.reset();
	});

	describe('singleton', () => {
		it('returns same instance', () => {
			const a = CleanupManager.instance;
			const b = CleanupManager.instance;
			expect(a).toBe(b);
		});

		it('reset creates new instance', () => {
			const a = CleanupManager.instance;
			CleanupManager.reset();
			const b = CleanupManager.instance;
			expect(a).not.toBe(b);
		});
	});

	describe('register', () => {
		it('adds instance', () => {
			const output = new PassThrough();
			manager.register('test', output, () => {});
			expect(manager.instanceCount).toBe(1);
		});

		it('handles multiple instances', () => {
			const output1 = new PassThrough();
			const output2 = new PassThrough();
			manager.register('test1', output1, () => {});
			manager.register('test2', output2, () => {});
			expect(manager.instanceCount).toBe(2);
		});

		it('overwrites duplicate IDs', () => {
			const output1 = new PassThrough();
			const output2 = new PassThrough();
			manager.register('test', output1, () => {});
			manager.register('test', output2, () => {});
			expect(manager.instanceCount).toBe(1);
		});
	});

	describe('unregister', () => {
		it('removes instance', () => {
			const output = new PassThrough();
			manager.register('test', output, () => {});
			manager.unregister('test');
			expect(manager.instanceCount).toBe(0);
		});

		it('handles non-existent ID', () => {
			expect(() => manager.unregister('nonexistent')).not.toThrow();
		});
	});

	describe('runCleanupSync', () => {
		it('runs cleanup for all instances', () => {
			const cleanup1 = vi.fn();
			const cleanup2 = vi.fn();
			const output1 = new PassThrough();
			const output2 = new PassThrough();

			manager.register('test1', output1, cleanup1);
			manager.register('test2', output2, cleanup2);
			manager.runCleanupSync('exit');

			expect(cleanup1).toHaveBeenCalled();
			expect(cleanup2).toHaveBeenCalled();
		});

		it('writes terminal restoration sequences', () => {
			const output = new PassThrough();
			let written = '';
			output.on('data', (chunk) => {
				written += chunk.toString();
			});

			manager.register('test', output, () => {});
			manager.runCleanupSync('exit');

			// Should exit alternate screen
			expect(written).toContain('\x1b[?1049l');
			// Should show cursor
			expect(written).toContain('\x1b[?25h');
			// Should reset styles
			expect(written).toContain('\x1b[0m');
		});

		it('only runs once', () => {
			const cleanup = vi.fn();
			const output = new PassThrough();

			manager.register('test', output, cleanup);
			manager.runCleanupSync('exit');
			manager.runCleanupSync('exit');

			expect(cleanup).toHaveBeenCalledTimes(1);
		});

		it('sets hasCleanedUp flag', () => {
			const output = new PassThrough();
			manager.register('test', output, () => {});

			expect(manager.hasCleanedUp).toBe(false);
			manager.runCleanupSync('exit');
			expect(manager.hasCleanedUp).toBe(true);
		});

		it('continues cleanup even if handler throws', () => {
			const cleanup1 = vi.fn(() => {
				throw new Error('oops');
			});
			const cleanup2 = vi.fn();
			const output1 = new PassThrough();
			const output2 = new PassThrough();

			manager.register('test1', output1, cleanup1);
			manager.register('test2', output2, cleanup2);
			manager.runCleanupSync('exit');

			expect(cleanup2).toHaveBeenCalled();
		});
	});

	describe('runCleanup (async)', () => {
		it('runs async cleanup handlers', async () => {
			const cleanup = vi.fn(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
			});
			const output = new PassThrough();

			manager.register('test', output, cleanup);
			await manager.runCleanup('exit');

			expect(cleanup).toHaveBeenCalled();
		});
	});

	describe('onExit', () => {
		it('calls exit handlers with reason', () => {
			const handler = vi.fn();
			const output = new PassThrough();

			manager.register('test', output, () => {});
			manager.onExit(handler);
			manager.runCleanupSync('SIGINT');

			expect(handler).toHaveBeenCalledWith({ reason: 'SIGINT' });
		});

		it('calls exit handlers with error', () => {
			const handler = vi.fn();
			const output = new PassThrough();
			const error = new Error('test error');

			manager.register('test', output, () => {});
			manager.onExit(handler);
			manager.runCleanupSync('uncaughtException', error);

			expect(handler).toHaveBeenCalledWith({ reason: 'uncaughtException', error });
		});

		it('returns unsubscribe function', () => {
			const handler = vi.fn();
			const output = new PassThrough();

			manager.register('test', output, () => {});
			const unsubscribe = manager.onExit(handler);
			unsubscribe();
			manager.runCleanupSync('exit');

			expect(handler).not.toHaveBeenCalled();
		});

		it('continues even if handler throws', () => {
			const handler1 = vi.fn(() => {
				throw new Error('oops');
			});
			const handler2 = vi.fn();
			const cleanup = vi.fn();
			const output = new PassThrough();

			manager.register('test', output, cleanup);
			manager.onExit(handler1);
			manager.onExit(handler2);
			manager.runCleanupSync('exit');

			expect(handler2).toHaveBeenCalled();
			expect(cleanup).toHaveBeenCalled();
		});
	});
});

describe('convenience functions', () => {
	beforeEach(() => {
		CleanupManager.reset();
	});

	afterEach(() => {
		CleanupManager.reset();
	});

	describe('registerForCleanup', () => {
		it('registers instance', () => {
			const output = new PassThrough();
			registerForCleanup('test', output, () => {});
			expect(CleanupManager.instance.instanceCount).toBe(1);
		});
	});

	describe('unregisterFromCleanup', () => {
		it('unregisters instance', () => {
			const output = new PassThrough();
			registerForCleanup('test', output, () => {});
			unregisterFromCleanup('test');
			expect(CleanupManager.instance.instanceCount).toBe(0);
		});
	});

	describe('onExit', () => {
		it('adds exit handler', () => {
			const handler = vi.fn();
			const output = new PassThrough();

			registerForCleanup('test', output, () => {});
			onExit(handler);
			CleanupManager.instance.runCleanupSync('exit');

			expect(handler).toHaveBeenCalled();
		});
	});
});
