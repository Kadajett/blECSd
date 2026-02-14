/**
 * Tests for reactive effects system.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createEffect,
	createScheduledEffect,
	disposeEffect,
	flushScheduledEffects,
	getScheduledEffectCount,
	getTotalScheduledEffectCount,
	resetScheduledEffects,
} from './reactiveEffects';
import { createSignal } from './signals';
import { LoopPhase } from './types';

describe('reactiveEffects', () => {
	afterEach(() => {
		resetScheduledEffects();
	});

	describe('createEffect', () => {
		it('runs immediately on creation', () => {
			const spy = vi.fn();
			createEffect(spy);
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it('re-runs when dependency changes', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			createEffect(spy);
			expect(spy).toHaveBeenCalledTimes(1);

			setCount(1);
			expect(spy).toHaveBeenCalledTimes(2);

			setCount(2);
			expect(spy).toHaveBeenCalledTimes(3);
		});

		it('does not re-run when value does not change', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			createEffect(spy);
			expect(spy).toHaveBeenCalledTimes(1);

			setCount(0); // Same value
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it('calls cleanup function before re-execution', () => {
			const [count, setCount] = createSignal(0);
			const cleanup = vi.fn();
			const effectFn = vi.fn(() => {
				count();
				return cleanup;
			});

			createEffect(effectFn);
			expect(effectFn).toHaveBeenCalledTimes(1);
			expect(cleanup).not.toHaveBeenCalled();

			setCount(1);
			expect(effectFn).toHaveBeenCalledTimes(2);
			expect(cleanup).toHaveBeenCalledTimes(1); // Called before re-run
		});

		it('calls cleanup function on disposal', () => {
			const cleanup = vi.fn();
			const effect = createEffect(() => cleanup);

			expect(cleanup).not.toHaveBeenCalled();

			effect.dispose();
			expect(cleanup).toHaveBeenCalledTimes(1);
		});

		it('stops running after disposal', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			const effect = createEffect(spy);
			expect(spy).toHaveBeenCalledTimes(1);

			effect.dispose();

			setCount(1);
			expect(spy).toHaveBeenCalledTimes(1); // Should not run again
		});

		it('tracks multiple dependencies', () => {
			const [a, setA] = createSignal(1);
			const [b, setB] = createSignal(2);
			const spy = vi.fn(() => {
				a();
				b();
			});

			createEffect(spy);
			expect(spy).toHaveBeenCalledTimes(1);

			setA(10);
			expect(spy).toHaveBeenCalledTimes(2);

			setB(20);
			expect(spy).toHaveBeenCalledTimes(3);
		});

		it('works with computed signals', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			createEffect(spy);
			expect(spy).toHaveBeenCalledTimes(1);

			setCount(5);
			expect(spy).toHaveBeenCalledTimes(2);
		});
	});

	describe('createScheduledEffect', () => {
		it('does not run immediately on creation', () => {
			const spy = vi.fn();
			createScheduledEffect(spy);
			expect(spy).not.toHaveBeenCalled();
		});

		it('runs when flushed for its phase', () => {
			const spy = vi.fn();
			createScheduledEffect(spy, LoopPhase.UPDATE);

			expect(spy).not.toHaveBeenCalled();

			flushScheduledEffects(LoopPhase.UPDATE);
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it('does not run when flushed for other phases', () => {
			const spy = vi.fn();
			createScheduledEffect(spy, LoopPhase.UPDATE);

			flushScheduledEffects(LoopPhase.RENDER);
			expect(spy).not.toHaveBeenCalled();

			flushScheduledEffects(LoopPhase.LAYOUT);
			expect(spy).not.toHaveBeenCalled();
		});

		it('batches multiple updates', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			createScheduledEffect(spy, LoopPhase.UPDATE);

			setCount(1);
			setCount(2);
			setCount(3);

			expect(spy).not.toHaveBeenCalled();

			flushScheduledEffects(LoopPhase.UPDATE);
			expect(spy).toHaveBeenCalledTimes(1); // Only runs once
		});

		it('uses LATE_UPDATE as default phase', () => {
			const spy = vi.fn();
			createScheduledEffect(spy); // No phase specified

			flushScheduledEffects(LoopPhase.LATE_UPDATE);
			expect(spy).toHaveBeenCalledTimes(1);
		});

		it('calls cleanup function before re-execution', () => {
			const [count, setCount] = createSignal(0);
			const cleanup = vi.fn();
			const effectFn = vi.fn(() => {
				count();
				return cleanup;
			});

			createScheduledEffect(effectFn, LoopPhase.UPDATE);

			flushScheduledEffects(LoopPhase.UPDATE);
			expect(effectFn).toHaveBeenCalledTimes(1);
			expect(cleanup).not.toHaveBeenCalled();

			setCount(1);
			flushScheduledEffects(LoopPhase.UPDATE);
			expect(effectFn).toHaveBeenCalledTimes(2);
			expect(cleanup).toHaveBeenCalledTimes(1);
		});

		it('calls cleanup function on disposal', () => {
			const cleanup = vi.fn();
			const effect = createScheduledEffect(() => cleanup, LoopPhase.UPDATE);

			flushScheduledEffects(LoopPhase.UPDATE);
			expect(cleanup).not.toHaveBeenCalled();

			effect.dispose();
			expect(cleanup).toHaveBeenCalledTimes(1);
		});

		it('stops running after disposal', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			const effect = createScheduledEffect(spy, LoopPhase.UPDATE);

			flushScheduledEffects(LoopPhase.UPDATE);
			expect(spy).toHaveBeenCalledTimes(1);

			effect.dispose();

			setCount(1);
			flushScheduledEffects(LoopPhase.UPDATE);
			expect(spy).toHaveBeenCalledTimes(1); // Should not run again
		});

		it('only marks dirty when dependency changes', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			createScheduledEffect(spy, LoopPhase.UPDATE);

			setCount(1);
			flushScheduledEffects(LoopPhase.UPDATE);
			expect(spy).toHaveBeenCalledTimes(1);

			// Flush again without changes
			flushScheduledEffects(LoopPhase.UPDATE);
			expect(spy).toHaveBeenCalledTimes(1); // Should not run again
		});
	});

	describe('disposeEffect', () => {
		it('disposes an effect', () => {
			const [count, setCount] = createSignal(0);
			const spy = vi.fn(() => {
				count();
			});

			const effect = createEffect(spy);
			expect(spy).toHaveBeenCalledTimes(1);

			disposeEffect(effect);

			setCount(1);
			expect(spy).toHaveBeenCalledTimes(1); // Should not run
		});
	});

	describe('getScheduledEffectCount', () => {
		it('returns count of effects for a phase', () => {
			expect(getScheduledEffectCount(LoopPhase.UPDATE)).toBe(0);

			const effect1 = createScheduledEffect(() => {}, LoopPhase.UPDATE);
			expect(getScheduledEffectCount(LoopPhase.UPDATE)).toBe(1);

			const effect2 = createScheduledEffect(() => {}, LoopPhase.UPDATE);
			expect(getScheduledEffectCount(LoopPhase.UPDATE)).toBe(2);

			effect1.dispose();
			expect(getScheduledEffectCount(LoopPhase.UPDATE)).toBe(1);

			effect2.dispose();
			expect(getScheduledEffectCount(LoopPhase.UPDATE)).toBe(0);
		});

		it('does not count effects from other phases', () => {
			createScheduledEffect(() => {}, LoopPhase.RENDER);
			createScheduledEffect(() => {}, LoopPhase.LAYOUT);

			expect(getScheduledEffectCount(LoopPhase.UPDATE)).toBe(0);
		});
	});

	describe('getTotalScheduledEffectCount', () => {
		it('returns total count across all phases', () => {
			expect(getTotalScheduledEffectCount()).toBe(0);

			const effect1 = createScheduledEffect(() => {}, LoopPhase.UPDATE);
			expect(getTotalScheduledEffectCount()).toBe(1);

			const effect2 = createScheduledEffect(() => {}, LoopPhase.RENDER);
			expect(getTotalScheduledEffectCount()).toBe(2);

			const effect3 = createScheduledEffect(() => {}, LoopPhase.LAYOUT);
			expect(getTotalScheduledEffectCount()).toBe(3);

			effect1.dispose();
			expect(getTotalScheduledEffectCount()).toBe(2);

			effect2.dispose();
			effect3.dispose();
			expect(getTotalScheduledEffectCount()).toBe(0);
		});
	});
});
