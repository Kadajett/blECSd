import { describe, expect, it, vi } from 'vitest';
import { debounceResize, throttleResize } from './throttledResize';

describe('ThrottledResize', () => {
	describe('throttleResize', () => {
		it('calls function immediately on first call', () => {
			const fn = vi.fn();
			const throttled = throttleResize(fn, 30);

			throttled();
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it('throttles rapid calls', () => {
			const fn = vi.fn();

			// Mock performance.now BEFORE creating the throttled function
			let mockTime = 100;
			vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

			const throttled = throttleResize(fn, 30);
			// minInterval = 1000/30 = ~33.3ms

			throttled(); // t=100 - allowed (100 - 0 >= 33.3)
			expect(fn).toHaveBeenCalledTimes(1);

			mockTime = 110;
			throttled(); // t=110 - too soon (110 - 100 = 10 < 33.3)
			expect(fn).toHaveBeenCalledTimes(1);

			mockTime = 120;
			throttled(); // t=120 - too soon (120 - 100 = 20 < 33.3)
			expect(fn).toHaveBeenCalledTimes(1);

			mockTime = 140;
			throttled(); // t=140 - allowed (140 - 100 = 40 >= 33.3)
			expect(fn).toHaveBeenCalledTimes(2);

			vi.restoreAllMocks();
		});
	});

	describe('debounceResize', () => {
		it('delays function call', () => {
			vi.useFakeTimers();
			const fn = vi.fn();
			const { fn: debounced } = debounceResize(fn, 100);

			debounced();
			expect(fn).not.toHaveBeenCalled();

			vi.advanceTimersByTime(100);
			expect(fn).toHaveBeenCalledTimes(1);

			vi.useRealTimers();
		});

		it('resets delay on subsequent calls', () => {
			vi.useFakeTimers();
			const fn = vi.fn();
			const { fn: debounced } = debounceResize(fn, 100);

			debounced();
			vi.advanceTimersByTime(50);
			debounced(); // Reset timer
			vi.advanceTimersByTime(50);
			expect(fn).not.toHaveBeenCalled();

			vi.advanceTimersByTime(50);
			expect(fn).toHaveBeenCalledTimes(1);

			vi.useRealTimers();
		});

		it('cancel prevents execution', () => {
			vi.useFakeTimers();
			const fn = vi.fn();
			const { fn: debounced, cancel } = debounceResize(fn, 100);

			debounced();
			cancel();
			vi.advanceTimersByTime(200);

			expect(fn).not.toHaveBeenCalled();

			vi.useRealTimers();
		});
	});
});
