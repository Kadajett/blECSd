/**
 * Tests for the Scene management system.
 * @module core/scene.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from './ecs';
import {
	createFadeTransition,
	createSceneManager,
	createSceneSystem,
	createSlideTransition,
	type Scene,
	type SceneManager,
} from './scene';
import type { World } from './types';

describe('scene', () => {
	let world: World;
	let manager: SceneManager;

	beforeEach(() => {
		world = createWorld();
		manager = createSceneManager();
	});

	// =========================================================================
	// Registration
	// =========================================================================

	describe('registerScene', () => {
		it('registers a scene', () => {
			const result = manager.registerScene({ name: 'menu' });
			expect(result).toBe(true);
			expect(manager.getRegisteredScenes()).toContain('menu');
		});

		it('rejects duplicate names', () => {
			manager.registerScene({ name: 'menu' });
			const result = manager.registerScene({ name: 'menu' });
			expect(result).toBe(false);
		});

		it('registers multiple scenes', () => {
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.registerScene({ name: 'settings' });
			expect(manager.getRegisteredScenes()).toHaveLength(3);
		});
	});

	describe('unregisterScene', () => {
		it('unregisters a scene', () => {
			manager.registerScene({ name: 'menu' });
			const result = manager.unregisterScene(world, 'menu');
			expect(result).toBe(true);
			expect(manager.getRegisteredScenes()).not.toContain('menu');
		});

		it('returns false for unknown scene', () => {
			const result = manager.unregisterScene(world, 'nonexistent');
			expect(result).toBe(false);
		});

		it('calls onDestroy if scene was created', () => {
			const onDestroy = vi.fn();
			manager.registerScene({ name: 'menu', onDestroy });
			manager.switchTo(world, 'menu'); // This creates the scene
			manager.unregisterScene(world, 'menu');
			expect(onDestroy).toHaveBeenCalledOnce();
		});

		it('does not call onDestroy if scene was never entered', () => {
			const onDestroy = vi.fn();
			manager.registerScene({ name: 'menu', onDestroy });
			manager.unregisterScene(world, 'menu');
			expect(onDestroy).not.toHaveBeenCalled();
		});

		it('exits and removes scene from stack', () => {
			const onExit = vi.fn();
			manager.registerScene({ name: 'menu', onExit });
			manager.switchTo(world, 'menu');
			manager.unregisterScene(world, 'menu');
			expect(onExit).toHaveBeenCalled();
			expect(manager.getCurrentScene()).toBeNull();
		});
	});

	// =========================================================================
	// switchTo
	// =========================================================================

	describe('switchTo', () => {
		it('switches to a registered scene', () => {
			manager.registerScene({ name: 'menu' });
			const result = manager.switchTo(world, 'menu');
			expect(result).toBe(true);
			expect(manager.getCurrentScene()?.name).toBe('menu');
		});

		it('returns false for unknown scene', () => {
			const result = manager.switchTo(world, 'nonexistent');
			expect(result).toBe(false);
		});

		it('calls onCreate once on first entry', () => {
			const onCreate = vi.fn();
			manager.registerScene({ name: 'menu', onCreate });
			manager.switchTo(world, 'menu');
			expect(onCreate).toHaveBeenCalledOnce();
		});

		it('calls onEnter each time', () => {
			const onEnter = vi.fn();
			manager.registerScene({ name: 'menu', onEnter });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game');
			manager.switchTo(world, 'menu');
			expect(onEnter).toHaveBeenCalledTimes(2);
		});

		it('calls onExit on the previous scene', () => {
			const onExit = vi.fn();
			manager.registerScene({ name: 'menu', onExit });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game');
			expect(onExit).toHaveBeenCalledOnce();
		});

		it('does not call onCreate again after first entry', () => {
			const onCreate = vi.fn();
			manager.registerScene({ name: 'menu', onCreate });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game');
			manager.switchTo(world, 'menu');
			expect(onCreate).toHaveBeenCalledOnce();
		});

		it('replaces the entire stack', () => {
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.registerScene({ name: 'settings' });

			manager.switchTo(world, 'menu');
			manager.push(world, 'game');
			manager.push(world, 'settings');
			expect(manager.getSceneStack()).toHaveLength(3);

			manager.switchTo(world, 'menu');
			expect(manager.getSceneStack()).toHaveLength(1);
			expect(manager.getCurrentScene()?.name).toBe('menu');
		});

		it('exits all scenes in stack when switching', () => {
			const exit1 = vi.fn();
			const exit2 = vi.fn();
			const exit3 = vi.fn();
			manager.registerScene({ name: 'a', onExit: exit1 });
			manager.registerScene({ name: 'b', onExit: exit2 });
			manager.registerScene({ name: 'c', onExit: exit3 });

			manager.switchTo(world, 'a');
			manager.push(world, 'b');
			manager.push(world, 'c');
			exit1.mockClear();
			exit2.mockClear();
			exit3.mockClear();

			manager.switchTo(world, 'a');
			// c is on top, then b, then a in the stack
			expect(exit3).toHaveBeenCalled();
			expect(exit2).toHaveBeenCalled();
			expect(exit1).toHaveBeenCalled();
		});
	});

	// =========================================================================
	// push / pop
	// =========================================================================

	describe('push', () => {
		it('pushes a scene onto the stack', () => {
			manager.registerScene({ name: 'game' });
			manager.registerScene({ name: 'pause' });

			manager.switchTo(world, 'game');
			manager.push(world, 'pause');

			expect(manager.getSceneStack()).toHaveLength(2);
			expect(manager.getCurrentScene()?.name).toBe('pause');
		});

		it('calls onExit on previous top scene', () => {
			const onExit = vi.fn();
			manager.registerScene({ name: 'game', onExit });
			manager.registerScene({ name: 'pause' });

			manager.switchTo(world, 'game');
			manager.push(world, 'pause');
			expect(onExit).toHaveBeenCalledOnce();
		});

		it('calls onEnter on the pushed scene', () => {
			const onEnter = vi.fn();
			manager.registerScene({ name: 'game' });
			manager.registerScene({ name: 'pause', onEnter });

			manager.switchTo(world, 'game');
			manager.push(world, 'pause');
			expect(onEnter).toHaveBeenCalledOnce();
		});

		it('returns false for unknown scene', () => {
			const result = manager.push(world, 'unknown');
			expect(result).toBe(false);
		});

		it('works on empty stack', () => {
			manager.registerScene({ name: 'menu' });
			const result = manager.push(world, 'menu');
			expect(result).toBe(true);
			expect(manager.getCurrentScene()?.name).toBe('menu');
		});
	});

	describe('pop', () => {
		it('pops the top scene', () => {
			manager.registerScene({ name: 'game' });
			manager.registerScene({ name: 'pause' });

			manager.switchTo(world, 'game');
			manager.push(world, 'pause');

			const result = manager.pop(world);
			expect(result).toBe(true);
			expect(manager.getCurrentScene()?.name).toBe('game');
			expect(manager.getSceneStack()).toHaveLength(1);
		});

		it('calls onExit on popped scene', () => {
			const onExit = vi.fn();
			manager.registerScene({ name: 'game' });
			manager.registerScene({ name: 'pause', onExit });

			manager.switchTo(world, 'game');
			manager.push(world, 'pause');
			manager.pop(world);
			expect(onExit).toHaveBeenCalledOnce();
		});

		it('calls onEnter on newly exposed scene', () => {
			const onEnter = vi.fn();
			manager.registerScene({ name: 'game', onEnter });
			manager.registerScene({ name: 'pause' });

			manager.switchTo(world, 'game');
			manager.push(world, 'pause');
			onEnter.mockClear();
			manager.pop(world);
			expect(onEnter).toHaveBeenCalledOnce();
		});

		it('returns false on empty stack', () => {
			const result = manager.pop(world);
			expect(result).toBe(false);
		});

		it('can pop the last scene', () => {
			manager.registerScene({ name: 'menu' });
			manager.switchTo(world, 'menu');
			manager.pop(world);
			expect(manager.getCurrentScene()).toBeNull();
			expect(manager.getSceneStack()).toHaveLength(0);
		});
	});

	// =========================================================================
	// State queries
	// =========================================================================

	describe('getCurrentScene', () => {
		it('returns null when no scene is active', () => {
			expect(manager.getCurrentScene()).toBeNull();
		});

		it('returns the top of the stack', () => {
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'game');
			expect(manager.getCurrentScene()?.name).toBe('game');
		});
	});

	describe('getSceneStack', () => {
		it('returns empty array when no scenes active', () => {
			expect(manager.getSceneStack()).toHaveLength(0);
		});

		it('returns a copy of the stack', () => {
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'game');
			const stack = manager.getSceneStack();
			expect(stack).toHaveLength(1);
			// Verify it's a copy
			expect(stack).not.toBe(manager.getSceneStack());
		});
	});

	// =========================================================================
	// Transitions
	// =========================================================================

	describe('transitions', () => {
		it('starts a transition on switchTo', () => {
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 1 });
			expect(manager.isTransitioning()).toBe(true);
		});

		it('calls transition onStart', () => {
			const onStart = vi.fn();
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 1, onStart });
			expect(onStart).toHaveBeenCalledOnce();
		});

		it('calls transition onUpdate with progress', () => {
			const onUpdate = vi.fn();
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 1, onUpdate });

			manager.updateTransition(world, 0.5);
			expect(onUpdate).toHaveBeenCalledWith(world, 0.5);
		});

		it('completes transition after duration', () => {
			const onComplete = vi.fn();
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 1, onComplete });

			manager.updateTransition(world, 1.0);
			expect(onComplete).toHaveBeenCalledOnce();
			expect(manager.isTransitioning()).toBe(false);
		});

		it('calls onEnter after transition completes', () => {
			const onEnter = vi.fn();
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game', onEnter });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 1 });
			expect(onEnter).not.toHaveBeenCalled();

			manager.updateTransition(world, 1.0);
			expect(onEnter).toHaveBeenCalledOnce();
		});

		it('clamps progress to 1', () => {
			const onUpdate = vi.fn();
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 0.5, onUpdate });

			manager.updateTransition(world, 2.0);
			expect(onUpdate).toHaveBeenCalledWith(world, 1);
		});

		it('supports incremental updates', () => {
			const onUpdate = vi.fn();
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 1, onUpdate });

			manager.updateTransition(world, 0.3);
			expect(onUpdate).toHaveBeenLastCalledWith(world, expect.closeTo(0.3, 5));
			manager.updateTransition(world, 0.3);
			expect(onUpdate).toHaveBeenLastCalledWith(world, expect.closeTo(0.6, 5));
			manager.updateTransition(world, 0.4);
			expect(onUpdate).toHaveBeenLastCalledWith(world, 1);
		});

		it('getTransitionState returns state during transition', () => {
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 1 });

			const state = manager.getTransitionState();
			expect(state).not.toBeNull();
			expect(state?.toScene.name).toBe('game');
			expect(state?.fromScene?.name).toBe('menu');
		});

		it('getTransitionState returns null when no transition', () => {
			expect(manager.getTransitionState()).toBeNull();
		});

		it('supports push with transition', () => {
			manager.registerScene({ name: 'game' });
			manager.registerScene({ name: 'pause' });
			manager.switchTo(world, 'game');
			manager.push(world, 'pause', { duration: 0.5 });
			expect(manager.isTransitioning()).toBe(true);
			expect(manager.getSceneStack()).toHaveLength(2);
		});

		it('supports pop with transition', () => {
			const onComplete = vi.fn();
			manager.registerScene({ name: 'game' });
			manager.registerScene({ name: 'pause' });
			manager.switchTo(world, 'game');
			manager.push(world, 'pause');
			manager.pop(world, { duration: 0.5, onComplete });
			expect(manager.isTransitioning()).toBe(true);

			manager.updateTransition(world, 0.5);
			expect(onComplete).toHaveBeenCalledOnce();
			expect(manager.isTransitioning()).toBe(false);
		});

		it('no-ops updateTransition when no transition active', () => {
			// Should not throw
			manager.updateTransition(world, 0.1);
			expect(manager.isTransitioning()).toBe(false);
		});
	});

	// =========================================================================
	// reset
	// =========================================================================

	describe('reset', () => {
		it('clears the scene stack', () => {
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.push(world, 'game');

			manager.reset(world);
			expect(manager.getSceneStack()).toHaveLength(0);
			expect(manager.getCurrentScene()).toBeNull();
		});

		it('clears registrations', () => {
			manager.registerScene({ name: 'menu' });
			manager.reset(world);
			expect(manager.getRegisteredScenes()).toHaveLength(0);
		});

		it('calls onExit on active scenes', () => {
			const onExit = vi.fn();
			manager.registerScene({ name: 'menu', onExit });
			manager.switchTo(world, 'menu');

			manager.reset(world);
			expect(onExit).toHaveBeenCalled();
		});

		it('calls onDestroy on created scenes', () => {
			const onDestroy = vi.fn();
			manager.registerScene({ name: 'menu', onDestroy });
			manager.switchTo(world, 'menu');

			manager.reset(world);
			expect(onDestroy).toHaveBeenCalledOnce();
		});

		it('cancels active transition', () => {
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 1 });
			expect(manager.isTransitioning()).toBe(true);

			manager.reset(world);
			expect(manager.isTransitioning()).toBe(false);
		});
	});

	// =========================================================================
	// Lifecycle ordering
	// =========================================================================

	describe('lifecycle ordering', () => {
		it('calls onCreate before onEnter', () => {
			const order: string[] = [];
			manager.registerScene({
				name: 'menu',
				onCreate() {
					order.push('create');
				},
				onEnter() {
					order.push('enter');
				},
			});

			manager.switchTo(world, 'menu');
			expect(order).toEqual(['create', 'enter']);
		});

		it('calls onExit on old scene before onEnter on new', () => {
			const order: string[] = [];
			manager.registerScene({
				name: 'menu',
				onExit() {
					order.push('menu:exit');
				},
			});
			manager.registerScene({
				name: 'game',
				onEnter() {
					order.push('game:enter');
				},
			});

			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game');
			expect(order).toEqual(['menu:exit', 'game:enter']);
		});

		it('onUpdate receives delta time', () => {
			const onUpdate = vi.fn();
			manager.registerScene({ name: 'game', onUpdate });
			manager.switchTo(world, 'game');

			const system = createSceneSystem(manager, () => 0.016);
			system(world);

			expect(onUpdate).toHaveBeenCalledWith(world, 0.016);
		});
	});

	// =========================================================================
	// Scene systems
	// =========================================================================

	describe('scene with systems', () => {
		it('stores systems on the scene', () => {
			const sys1 = vi.fn((w: World) => w);
			const sys2 = vi.fn((w: World) => w);

			const scene: Scene = {
				name: 'game',
				systems: [sys1, sys2],
			};

			manager.registerScene(scene);
			manager.switchTo(world, 'game');

			const current = manager.getCurrentScene();
			expect(current?.systems).toHaveLength(2);
		});
	});

	// =========================================================================
	// Built-in transitions
	// =========================================================================

	describe('createFadeTransition', () => {
		it('creates a transition with the correct duration', () => {
			const t = createFadeTransition(0.5);
			expect(t.duration).toBe(0.5);
		});

		it('calls onProgress callback on update', () => {
			const onProgress = vi.fn();
			const t = createFadeTransition(1.0, onProgress);

			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', t);
			manager.updateTransition(world, 0.5);

			expect(onProgress).toHaveBeenCalledWith(world, 0.5);
		});
	});

	describe('createSlideTransition', () => {
		it('creates a transition with the correct duration', () => {
			const t = createSlideTransition(0.3, 'left');
			expect(t.duration).toBe(0.3);
		});

		it('passes direction to onProgress', () => {
			const onProgress = vi.fn();
			const t = createSlideTransition(1.0, 'right', onProgress);

			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', t);
			manager.updateTransition(world, 0.5);

			expect(onProgress).toHaveBeenCalledWith(world, 0.5, 'right');
		});
	});

	// =========================================================================
	// createSceneSystem
	// =========================================================================

	describe('createSceneSystem', () => {
		it('creates a system function', () => {
			const system = createSceneSystem(manager, () => 0.016);
			expect(typeof system).toBe('function');
		});

		it('returns the world', () => {
			const system = createSceneSystem(manager, () => 0.016);
			const result = system(world);
			expect(result).toBe(world);
		});

		it('updates transitions', () => {
			const onComplete = vi.fn();
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game' });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 0.016, onComplete });

			const system = createSceneSystem(manager, () => 0.016);
			system(world);

			expect(onComplete).toHaveBeenCalledOnce();
		});

		it('calls onUpdate on active scene when not transitioning', () => {
			const onUpdate = vi.fn();
			manager.registerScene({ name: 'game', onUpdate });
			manager.switchTo(world, 'game');

			const system = createSceneSystem(manager, () => 0.016);
			system(world);

			expect(onUpdate).toHaveBeenCalledWith(world, 0.016);
		});

		it('does not call onUpdate during transition', () => {
			const onUpdate = vi.fn();
			manager.registerScene({ name: 'menu' });
			manager.registerScene({ name: 'game', onUpdate });
			manager.switchTo(world, 'menu');
			manager.switchTo(world, 'game', { duration: 10 });

			const system = createSceneSystem(manager, () => 0.016);
			system(world);

			// onUpdate shouldn't be called because transition hasn't completed
			expect(onUpdate).not.toHaveBeenCalled();
		});
	});
});
