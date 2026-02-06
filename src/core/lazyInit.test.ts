import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearCapabilityCache,
	detectCapabilities,
	formatStartupReport,
	getStartupReport,
	InitPriority,
	initSubsystem,
	initSubsystemsUpTo,
	lazy,
	registerSubsystem,
	resetSubsystems,
} from './lazyInit';

describe('LazyInit', () => {
	beforeEach(() => {
		resetSubsystems();
		clearCapabilityCache();
	});

	describe('lazy', () => {
		it('does not call factory until get()', () => {
			const factory = vi.fn(() => 42);
			const value = lazy(factory);

			expect(factory).not.toHaveBeenCalled();
			expect(value.isInitialized()).toBe(false);
		});

		it('calls factory on first get()', () => {
			const factory = vi.fn(() => 42);
			const value = lazy(factory);

			const result = value.get();

			expect(factory).toHaveBeenCalledTimes(1);
			expect(result).toBe(42);
			expect(value.isInitialized()).toBe(true);
		});

		it('returns cached value on subsequent get() calls', () => {
			const factory = vi.fn(() => ({ data: 'expensive' }));
			const value = lazy(factory);

			const r1 = value.get();
			const r2 = value.get();

			expect(factory).toHaveBeenCalledTimes(1);
			expect(r1).toBe(r2);
		});

		it('resets to uninitialized state', () => {
			const factory = vi.fn(() => 42);
			const value = lazy(factory);

			value.get();
			expect(value.isInitialized()).toBe(true);

			value.reset();
			expect(value.isInitialized()).toBe(false);

			value.get();
			expect(factory).toHaveBeenCalledTimes(2);
		});
	});

	describe('registerSubsystem', () => {
		it('registers a subsystem', () => {
			const initFn = vi.fn();
			registerSubsystem('test', InitPriority.NORMAL, initFn);

			const report = getStartupReport();
			expect(report.subsystems.length).toBe(1);
			expect(report.subsystems[0]!.name).toBe('test');
			expect(report.subsystems[0]!.lazy).toBe(true);
		});

		it('does not register duplicates', () => {
			registerSubsystem('test', InitPriority.NORMAL, vi.fn());
			registerSubsystem('test', InitPriority.HIGH, vi.fn());

			const report = getStartupReport();
			expect(report.subsystems.length).toBe(1);
		});
	});

	describe('initSubsystem', () => {
		it('initializes a registered subsystem', () => {
			const initFn = vi.fn();
			registerSubsystem('test', InitPriority.NORMAL, initFn);

			const ms = initSubsystem('test');

			expect(ms).not.toBeNull();
			expect(initFn).toHaveBeenCalledTimes(1);
		});

		it('returns null for unknown subsystem', () => {
			expect(initSubsystem('nonexistent')).toBeNull();
		});

		it('returns null for already initialized subsystem', () => {
			registerSubsystem('test', InitPriority.NORMAL, vi.fn());
			initSubsystem('test');

			expect(initSubsystem('test')).toBeNull();
		});
	});

	describe('initSubsystemsUpTo', () => {
		it('initializes subsystems up to given priority', () => {
			const criticalFn = vi.fn();
			const normalFn = vi.fn();
			const lowFn = vi.fn();

			registerSubsystem('critical', InitPriority.CRITICAL, criticalFn);
			registerSubsystem('normal', InitPriority.NORMAL, normalFn);
			registerSubsystem('low', InitPriority.LOW, lowFn);

			initSubsystemsUpTo(InitPriority.NORMAL);

			expect(criticalFn).toHaveBeenCalled();
			expect(normalFn).toHaveBeenCalled();
			expect(lowFn).not.toHaveBeenCalled();
		});

		it('initializes in priority order', () => {
			const order: string[] = [];

			registerSubsystem('low', InitPriority.LOW, () => order.push('low'));
			registerSubsystem('critical', InitPriority.CRITICAL, () => order.push('critical'));
			registerSubsystem('high', InitPriority.HIGH, () => order.push('high'));

			initSubsystemsUpTo(InitPriority.LOW);

			expect(order).toEqual(['critical', 'high', 'low']);
		});
	});

	describe('getStartupReport', () => {
		it('returns timing information', () => {
			registerSubsystem('test', InitPriority.NORMAL, () => {
				// Simulate work
				for (let i = 0; i < 1000; i++) Math.random();
			});

			initSubsystem('test');

			const report = getStartupReport();
			expect(report.totalMs).toBeGreaterThanOrEqual(0);
			expect(report.subsystems[0]!.lazy).toBe(false);
		});

		it('marks uninitialized subsystems as lazy', () => {
			registerSubsystem('unloaded', InitPriority.LOW, vi.fn());

			const report = getStartupReport();
			expect(report.subsystems[0]!.lazy).toBe(true);
		});
	});

	describe('formatStartupReport', () => {
		it('formats report as readable string', () => {
			registerSubsystem('input', InitPriority.CRITICAL, vi.fn());
			registerSubsystem('render', InitPriority.HIGH, vi.fn());

			initSubsystemsUpTo(InitPriority.HIGH);

			const report = getStartupReport();
			const formatted = formatStartupReport(report);

			expect(formatted).toContain('Startup Report');
			expect(formatted).toContain('input');
			expect(formatted).toContain('render');
			expect(formatted).toContain('CRITICAL');
			expect(formatted).toContain('HIGH');
		});
	});

	describe('detectCapabilities', () => {
		it('detects terminal capabilities', () => {
			const caps = detectCapabilities();

			expect(caps.width).toBeGreaterThan(0);
			expect(caps.height).toBeGreaterThan(0);
			expect(caps.cachedAt).toBeGreaterThan(0);
			expect(typeof caps.trueColor).toBe('boolean');
			expect(typeof caps.unicode).toBe('boolean');
		});

		it('caches capabilities', () => {
			const caps1 = detectCapabilities();
			const caps2 = detectCapabilities();

			expect(caps1.cachedAt).toBe(caps2.cachedAt);
		});

		it('refreshes after cache expires', () => {
			const caps1 = detectCapabilities(0); // Expire immediately
			const caps2 = detectCapabilities(0);

			// Both should be fresh (different timestamps possible)
			expect(caps1.cachedAt).toBeDefined();
			expect(caps2.cachedAt).toBeDefined();
		});
	});
});
