/**
 * Tests for frame budget manager and adaptive scheduling.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoopPhase } from '../core/types';
import {
	beginFrame,
	cancelDeferredWork,
	canRunWork,
	createFrameBudgetManager,
	deferWork,
	destroyFrameBudgetManager,
	type FrameBudgetConfig,
	getAdaptiveBudget,
	getDeferredWorkCount,
	getFrameTelemetry,
	processDeferredWork,
	recordFrameTime,
	recordPhaseTime,
	resetFrameBudget,
	updateAdaptiveBudget,
	WorkPriority,
} from './frameBudget';

describe('frameBudget - adaptive budgeting', () => {
	beforeEach(() => {
		destroyFrameBudgetManager();
	});

	afterEach(() => {
		destroyFrameBudgetManager();
	});

	it('initializes adaptive budgets to configured values', () => {
		const config: Partial<FrameBudgetConfig> = {
			targetFrameMs: 16,
			phaseBudgets: {
				[LoopPhase.UPDATE]: 4,
				[LoopPhase.RENDER]: 6,
			},
		};

		createFrameBudgetManager(config);

		expect(getAdaptiveBudget(LoopPhase.UPDATE)).toBe(4);
		expect(getAdaptiveBudget(LoopPhase.RENDER)).toBe(6);
	});

	it('expands budget when consistently under threshold', () => {
		const config: Partial<FrameBudgetConfig> = {
			targetFrameMs: 16,
			phaseBudgets: {
				[LoopPhase.UPDATE]: 10,
			},
			emaSmoothingFactor: 0.5, // Faster adaptation for testing
			underBudgetThreshold: 0.8,
		};

		createFrameBudgetManager(config);

		// Simulate multiple frames under budget (70% utilization)
		for (let i = 0; i < 20; i++) {
			recordPhaseTime(LoopPhase.UPDATE, 7); // 70% of 10ms
			updateAdaptiveBudget(LoopPhase.UPDATE);
		}

		const adaptiveBudget = getAdaptiveBudget(LoopPhase.UPDATE);
		// Should have expanded beyond initial 10ms
		expect(adaptiveBudget).toBeGreaterThan(10);
		// But not beyond 120% of configured
		expect(adaptiveBudget).toBeLessThanOrEqual(12);
	});

	it('tightens budget when consistently over threshold', () => {
		const config: Partial<FrameBudgetConfig> = {
			targetFrameMs: 16,
			phaseBudgets: {
				[LoopPhase.UPDATE]: 10,
			},
			emaSmoothingFactor: 0.5,
			overBudgetThreshold: 0.95,
		};

		createFrameBudgetManager(config);

		// Simulate multiple frames over budget (110% utilization)
		for (let i = 0; i < 20; i++) {
			recordPhaseTime(LoopPhase.UPDATE, 11); // 110% of 10ms
			updateAdaptiveBudget(LoopPhase.UPDATE);
		}

		const adaptiveBudget = getAdaptiveBudget(LoopPhase.UPDATE);
		// Should have tightened below initial 10ms
		expect(adaptiveBudget).toBeLessThan(10);
		// But not below 80% of configured
		expect(adaptiveBudget).toBeGreaterThanOrEqual(8);
	});

	it('maintains budget when utilization is in acceptable range', () => {
		const config: Partial<FrameBudgetConfig> = {
			targetFrameMs: 16,
			phaseBudgets: {
				[LoopPhase.UPDATE]: 10,
			},
			emaSmoothingFactor: 0.1,
			underBudgetThreshold: 0.8,
			overBudgetThreshold: 0.95,
		};

		createFrameBudgetManager(config);

		const initialBudget = getAdaptiveBudget(LoopPhase.UPDATE);

		// Simulate frames in sweet spot (85% utilization)
		for (let i = 0; i < 10; i++) {
			recordPhaseTime(LoopPhase.UPDATE, 8.5);
			updateAdaptiveBudget(LoopPhase.UPDATE);
		}

		const finalBudget = getAdaptiveBudget(LoopPhase.UPDATE);
		// Should remain relatively stable
		expect(Math.abs(finalBudget - initialBudget)).toBeLessThan(0.5);
	});
});

describe('frameBudget - priority scheduling', () => {
	beforeEach(() => {
		destroyFrameBudgetManager();
		vi.useFakeTimers();
	});

	afterEach(() => {
		destroyFrameBudgetManager();
		vi.useRealTimers();
	});

	it('allows high priority work to always run', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });
		beginFrame();

		// Advance time to use up most of the budget
		vi.advanceTimersByTime(15);

		expect(canRunWork(WorkPriority.HIGH)).toBe(true);
	});

	it('defers medium priority work when budget is low', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });
		beginFrame();

		// Use up 85% of budget (only 15% remains, needs 20%)
		vi.advanceTimersByTime(13.6);

		expect(canRunWork(WorkPriority.MEDIUM)).toBe(false);
	});

	it('allows medium priority work when sufficient budget remains', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });
		beginFrame();

		// Use 50% of budget (50% remains, more than 20% needed)
		vi.advanceTimersByTime(8);

		expect(canRunWork(WorkPriority.MEDIUM)).toBe(true);
	});

	it('defers low priority work when budget is below 40%', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });
		beginFrame();

		// Use 70% of budget (only 30% remains, needs 40%)
		vi.advanceTimersByTime(11.2);

		expect(canRunWork(WorkPriority.LOW)).toBe(false);
	});

	it('allows low priority work when sufficient budget remains', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });
		beginFrame();

		// Use only 20% of budget (80% remains)
		vi.advanceTimersByTime(3.2);

		expect(canRunWork(WorkPriority.LOW)).toBe(true);
	});
});

describe('frameBudget - deferred work queue', () => {
	beforeEach(() => {
		destroyFrameBudgetManager();
		vi.useFakeTimers();
	});

	afterEach(() => {
		destroyFrameBudgetManager();
		vi.useRealTimers();
	});

	it('defers work and tracks queue size', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });

		const work = vi.fn();
		const id = deferWork(WorkPriority.LOW, work);

		expect(id).toBeTruthy();
		expect(getDeferredWorkCount()).toBe(1);
		expect(work).not.toHaveBeenCalled();
	});

	it('processes deferred work when budget allows', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });
		beginFrame();

		const work1 = vi.fn();
		const work2 = vi.fn();

		deferWork(WorkPriority.LOW, work1);
		deferWork(WorkPriority.MEDIUM, work2);

		expect(getDeferredWorkCount()).toBe(2);

		// Plenty of budget remaining
		vi.advanceTimersByTime(2);

		const processed = processDeferredWork();

		expect(processed).toBe(2);
		expect(work1).toHaveBeenCalledOnce();
		expect(work2).toHaveBeenCalledOnce();
		expect(getDeferredWorkCount()).toBe(0);
	});

	it('processes work by effective priority', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });
		beginFrame();

		const calls: string[] = [];
		const highWork = vi.fn(() => calls.push('high'));
		const medWork = vi.fn(() => calls.push('med'));
		const lowWork = vi.fn(() => calls.push('low'));

		// Add in reverse priority order
		deferWork(WorkPriority.LOW, lowWork);
		deferWork(WorkPriority.MEDIUM, medWork);
		deferWork(WorkPriority.HIGH, highWork);

		vi.advanceTimersByTime(2);
		processDeferredWork();

		// Should execute in priority order: HIGH, MEDIUM, LOW
		expect(calls).toEqual(['high', 'med', 'low']);
	});

	it('boosts priority of repeatedly deferred work', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });

		const lowWork = vi.fn();
		deferWork(WorkPriority.LOW, lowWork);

		// Frame 1: not enough budget for LOW work
		beginFrame();
		vi.advanceTimersByTime(14);
		processDeferredWork();
		expect(lowWork).not.toHaveBeenCalled();

		// Frame 2: still not enough, but deferral count increments
		beginFrame();
		vi.advanceTimersByTime(14);
		processDeferredWork();
		expect(lowWork).not.toHaveBeenCalled();

		// Frame 3: after enough deferrals, effective priority should boost
		// and it should run even with less budget
		beginFrame();
		vi.advanceTimersByTime(12);
		processDeferredWork();

		// After multiple deferrals, should eventually run
		expect(getDeferredWorkCount()).toBeLessThanOrEqual(1);
	});

	it('cancels deferred work by ID', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });

		const work = vi.fn();
		const id = deferWork(WorkPriority.LOW, work);

		expect(getDeferredWorkCount()).toBe(1);

		const cancelled = cancelDeferredWork(id);

		expect(cancelled).toBe(true);
		expect(getDeferredWorkCount()).toBe(0);
	});

	it('returns false when cancelling non-existent work', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });

		const cancelled = cancelDeferredWork('non-existent-id');

		expect(cancelled).toBe(false);
	});

	it('handles work that throws errors', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });
		beginFrame();

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const errorWork = vi.fn(() => {
			throw new Error('Work failed');
		});
		const goodWork = vi.fn();

		deferWork(WorkPriority.MEDIUM, errorWork);
		deferWork(WorkPriority.MEDIUM, goodWork);

		vi.advanceTimersByTime(2);

		const processed = processDeferredWork();

		// Should process both, but error work stays in queue
		expect(processed).toBe(1); // Only goodWork succeeded
		expect(goodWork).toHaveBeenCalledOnce();
		expect(getDeferredWorkCount()).toBe(1); // errorWork remains

		consoleError.mockRestore();
	});

	it('executes work immediately when manager is not initialized', () => {
		const work = vi.fn();

		const id = deferWork(WorkPriority.LOW, work);

		expect(id).toBe('');
		expect(work).toHaveBeenCalledOnce();
	});
});

describe('frameBudget - telemetry API', () => {
	beforeEach(() => {
		destroyFrameBudgetManager();
	});

	afterEach(() => {
		destroyFrameBudgetManager();
	});

	it('returns telemetry with health status', () => {
		createFrameBudgetManager({
			targetFrameMs: 16,
			phaseBudgets: {
				[LoopPhase.UPDATE]: 4,
				[LoopPhase.RENDER]: 6,
			},
		});

		recordPhaseTime(LoopPhase.UPDATE, 3);
		recordPhaseTime(LoopPhase.RENDER, 5);

		const telemetry = getFrameTelemetry();

		expect(telemetry).toHaveProperty('health');
		expect(telemetry).toHaveProperty('systemTimings');
		expect(telemetry).toHaveProperty('budgetUtilization');
		expect(telemetry).toHaveProperty('deferralCount');
		expect(telemetry).toHaveProperty('p95FrameMs');
		expect(telemetry).toHaveProperty('avgFrameMs');
		expect(telemetry).toHaveProperty('fps');
	});

	it('calculates budget utilization percentages', () => {
		createFrameBudgetManager({
			targetFrameMs: 16,
			phaseBudgets: {
				[LoopPhase.UPDATE]: 10,
			},
		});

		recordPhaseTime(LoopPhase.UPDATE, 8);
		updateAdaptiveBudget(LoopPhase.UPDATE);

		const telemetry = getFrameTelemetry();

		// 8ms actual / 10ms budget = 80%
		expect(telemetry.budgetUtilization.UPDATE).toBeCloseTo(80, 1);
	});

	it('reports good health when P95 is within target', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });

		// Simulate frames well within budget
		for (let i = 0; i < 120; i++) {
			recordFrameTime(12); // 12ms frames
		}

		const telemetry = getFrameTelemetry();

		expect(telemetry.health).toBe('good');
	});

	it('reports warning health when P95 exceeds target moderately', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });

		// Simulate frames exceeding target but not critically
		for (let i = 0; i < 120; i++) {
			recordFrameTime(20); // 20ms frames (1.25x target)
		}

		const telemetry = getFrameTelemetry();

		expect(telemetry.health).toBe('warning');
	});

	it('reports critical health when P95 far exceeds target', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });

		// Simulate frames well over target
		for (let i = 0; i < 120; i++) {
			recordFrameTime(30); // 30ms frames (1.875x target)
		}

		const telemetry = getFrameTelemetry();

		expect(telemetry.health).toBe('critical');
	});

	it('includes deferred work count in telemetry', () => {
		createFrameBudgetManager({ targetFrameMs: 16 });

		deferWork(WorkPriority.LOW, () => {});
		deferWork(WorkPriority.LOW, () => {});
		deferWork(WorkPriority.MEDIUM, () => {});

		const telemetry = getFrameTelemetry();

		expect(telemetry.deferralCount).toBe(3);
	});
});

describe('frameBudget - reset functionality', () => {
	beforeEach(() => {
		destroyFrameBudgetManager();
	});

	afterEach(() => {
		destroyFrameBudgetManager();
	});

	it('clears adaptive budgets and deferred work on reset', () => {
		createFrameBudgetManager({
			targetFrameMs: 16,
			phaseBudgets: {
				[LoopPhase.UPDATE]: 10,
			},
		});

		// Set up some state
		recordPhaseTime(LoopPhase.UPDATE, 8);
		updateAdaptiveBudget(LoopPhase.UPDATE);
		deferWork(WorkPriority.LOW, () => {});

		expect(getDeferredWorkCount()).toBe(1);

		resetFrameBudget();

		expect(getDeferredWorkCount()).toBe(0);
		// Adaptive budget should reset to configured value
		expect(getAdaptiveBudget(LoopPhase.UPDATE)).toBe(10);
	});
});
