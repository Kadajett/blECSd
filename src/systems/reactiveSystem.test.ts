/**
 * Tests for reactive system ECS integration.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScheduledEffect, resetScheduledEffects } from '../core/reactiveEffects';
import { createSignal } from '../core/signals';
import { LoopPhase } from '../core/types';
import { createWorld } from '../core/world';
import { createReactiveSystem, createReactiveSystemsForAllPhases } from './reactiveSystem';

describe('reactiveSystem', () => {
	afterEach(() => {
		resetScheduledEffects();
	});
	describe('createReactiveSystem', () => {
		it('creates a system function', () => {
			const system = createReactiveSystem();
			expect(typeof system).toBe('function');
		});

		it('returns the world unchanged', () => {
			const world = createWorld();
			const system = createReactiveSystem();
			const result = system(world);
			expect(result).toBe(world);
		});

		it('flushes effects for the specified phase', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			createScheduledEffect(spy, LoopPhase.EARLY_UPDATE);

			const system = createReactiveSystem(LoopPhase.EARLY_UPDATE);
			const world = createWorld();

			expect(spy).not.toHaveBeenCalled();

			// Trigger effect
			setCount(1);

			// Run system
			system(world);
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it('uses EARLY_UPDATE as default phase', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			createScheduledEffect(spy, LoopPhase.EARLY_UPDATE);

			const system = createReactiveSystem(); // No phase specified
			const world = createWorld();

			setCount(1);
			system(world);
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it('does not flush effects from other phases', () => {
			const [count, setCount] = createSignal(0);
			const updateSpy = vi.fn(() => {
				count();
			});
			const renderSpy = vi.fn(() => {
				count();
			});

			createScheduledEffect(updateSpy, LoopPhase.UPDATE);
			createScheduledEffect(renderSpy, LoopPhase.RENDER);

			const system = createReactiveSystem(LoopPhase.UPDATE);
			const world = createWorld();

			setCount(1);
			system(world);

			expect(updateSpy).toHaveBeenCalledTimes(1);
			expect(renderSpy).not.toHaveBeenCalled();
		});

		it('integrates with scheduler', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			createScheduledEffect(spy, LoopPhase.EARLY_UPDATE);

			const system = createReactiveSystem(LoopPhase.EARLY_UPDATE);
			const world = createWorld();

			// Simulate multiple frames
			setCount(1);
			system(world);
			expect(spy).toHaveBeenCalledTimes(1);

			setCount(2);
			system(world);
			expect(spy).toHaveBeenCalledTimes(2);

			setCount(3);
			system(world);
			expect(spy).toHaveBeenCalledTimes(3);
		});
	});

	describe('createReactiveSystemsForAllPhases', () => {
		it('creates systems for all phases except INPUT', () => {
			const systems = createReactiveSystemsForAllPhases();

			// Should have systems for all phases except INPUT
			const expectedPhases = [
				LoopPhase.EARLY_UPDATE,
				LoopPhase.UPDATE,
				LoopPhase.LATE_UPDATE,
				LoopPhase.ANIMATION,
				LoopPhase.LAYOUT,
				LoopPhase.RENDER,
				LoopPhase.POST_RENDER,
			];

			expect(systems.size).toBe(expectedPhases.length);

			for (const phase of expectedPhases) {
				expect(systems.has(phase)).toBe(true);
				expect(typeof systems.get(phase)).toBe('function');
			}

			// Should NOT have INPUT phase
			expect(systems.has(LoopPhase.INPUT)).toBe(false);
		});

		it('each system flushes effects for its phase', () => {
			const [count, setCount] = createSignal(0);

			const updateSpy = vi.fn(() => {
				count();
			});
			const renderSpy = vi.fn(() => {
				count();
			});
			const layoutSpy = vi.fn(() => {
				count();
			});

			createScheduledEffect(updateSpy, LoopPhase.UPDATE);
			createScheduledEffect(renderSpy, LoopPhase.RENDER);
			createScheduledEffect(layoutSpy, LoopPhase.LAYOUT);

			const systems = createReactiveSystemsForAllPhases();
			const world = createWorld();

			setCount(1);

			// Run UPDATE system
			const updateSystem = systems.get(LoopPhase.UPDATE);
			if (updateSystem) {
				updateSystem(world);
			}
			expect(updateSpy).toHaveBeenCalledTimes(1);
			expect(renderSpy).not.toHaveBeenCalled();
			expect(layoutSpy).not.toHaveBeenCalled();

			// Run RENDER system
			const renderSystem = systems.get(LoopPhase.RENDER);
			if (renderSystem) {
				renderSystem(world);
			}
			expect(updateSpy).toHaveBeenCalledTimes(1);
			expect(renderSpy).toHaveBeenCalledTimes(1);
			expect(layoutSpy).not.toHaveBeenCalled();

			// Run LAYOUT system
			const layoutSystem = systems.get(LoopPhase.LAYOUT);
			if (layoutSystem) {
				layoutSystem(world);
			}
			expect(updateSpy).toHaveBeenCalledTimes(1);
			expect(renderSpy).toHaveBeenCalledTimes(1);
			expect(layoutSpy).toHaveBeenCalledTimes(1);
		});

		it('systems return the world unchanged', () => {
			const systems = createReactiveSystemsForAllPhases();
			const world = createWorld();

			for (const system of systems.values()) {
				const result = system(world);
				expect(result).toBe(world);
			}
		});
	});
});
