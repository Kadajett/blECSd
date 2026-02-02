import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyEvent } from '../terminal/keyParser';
import type { MouseEvent } from '../terminal/mouseParser';
import {
	beginFrame,
	clearBuffer,
	createInputEventBuffer,
	drainAllEvents,
	drainKeys,
	drainMouse,
	endFrame,
	getLatencyStats,
	getPendingCount,
	getPendingKeyCount,
	getPendingMouseCount,
	getStats,
	globalInputBuffer,
	hasPendingEvents,
	type InputEventBufferData,
	isLatencyAcceptable,
	isProcessingTimeAcceptable,
	peekEvents,
	peekKeys,
	peekMouse,
	pushKeyEvent,
	pushMouseEvent,
	recordLatency,
	recordLatencyBatch,
	resetLatencyStats,
	resetStats,
} from './inputEventBuffer';

// Mock key event factory
function createKeyEvent(name: string, modifiers = {}): KeyEvent {
	return {
		raw: new Uint8Array([name.charCodeAt(0)]),
		name: name as KeyEvent['name'],
		sequence: name,
		ctrl: false,
		meta: false,
		shift: false,
		...modifiers,
	};
}

// Mock mouse event factory
function createMouseEvent(
	x: number,
	y: number,
	action: 'mousedown' | 'mouseup' | 'mousemove' | 'wheel' = 'mousedown',
): MouseEvent {
	return {
		x,
		y,
		button: 'left',
		action,
		ctrl: false,
		meta: false,
		shift: false,
	} as MouseEvent;
}

describe('InputEventBuffer', () => {
	let buffer: InputEventBufferData;

	beforeEach(() => {
		buffer = createInputEventBuffer();
	});

	describe('createInputEventBuffer', () => {
		it('should create a buffer with default options', () => {
			const buf = createInputEventBuffer();
			expect(buf.config.maxBufferSize).toBe(1000);
			expect(buf.keyEvents).toEqual([]);
			expect(buf.mouseEvents).toEqual([]);
		});

		it('should create a buffer with custom options', () => {
			const buf = createInputEventBuffer({ maxBufferSize: 500 });
			expect(buf.config.maxBufferSize).toBe(500);
		});
	});

	describe('pushKeyEvent', () => {
		it('should add key events to the buffer', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));

			expect(getPendingKeyCount(buffer)).toBe(1);
		});

		it('should preserve event data', () => {
			const event = createKeyEvent('a', { ctrl: true, shift: true });
			pushKeyEvent(buffer, event);

			const drained = drainKeys(buffer);
			expect(drained[0]?.event).toEqual(event);
		});

		it('should add timestamp to events', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));

			const drained = drainKeys(buffer);
			expect(drained[0]?.timestamp).toBeGreaterThan(0);
		});

		it('should accept custom timestamp', () => {
			pushKeyEvent(buffer, createKeyEvent('a'), 12345);

			const drained = drainKeys(buffer);
			expect(drained[0]?.timestamp).toBe(12345);
		});

		it('should track total key events', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushKeyEvent(buffer, createKeyEvent('b'));
			pushKeyEvent(buffer, createKeyEvent('c'));

			expect(getStats(buffer).totalKeyEvents).toBe(3);
		});
	});

	describe('pushMouseEvent', () => {
		it('should add mouse events to the buffer', () => {
			pushMouseEvent(buffer, createMouseEvent(10, 20));

			expect(getPendingMouseCount(buffer)).toBe(1);
		});

		it('should preserve event data', () => {
			const event = createMouseEvent(10, 20, 'mouseup');
			pushMouseEvent(buffer, event);

			const drained = drainMouse(buffer);
			expect(drained[0]?.event).toEqual(event);
		});

		it('should add timestamp to events', () => {
			pushMouseEvent(buffer, createMouseEvent(10, 20));

			const drained = drainMouse(buffer);
			expect(drained[0]?.timestamp).toBeGreaterThan(0);
		});

		it('should track total mouse events', () => {
			pushMouseEvent(buffer, createMouseEvent(10, 20));
			pushMouseEvent(buffer, createMouseEvent(20, 30));

			expect(getStats(buffer).totalMouseEvents).toBe(2);
		});
	});

	describe('drainKeys', () => {
		it('should return all key events', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushKeyEvent(buffer, createKeyEvent('b'));
			pushKeyEvent(buffer, createKeyEvent('c'));

			const drained = drainKeys(buffer);

			expect(drained).toHaveLength(3);
			expect(drained[0]?.event.name).toBe('a');
			expect(drained[1]?.event.name).toBe('b');
			expect(drained[2]?.event.name).toBe('c');
		});

		it('should clear key events after drain', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			drainKeys(buffer);

			expect(getPendingKeyCount(buffer)).toBe(0);
		});

		it('should return empty array when no events', () => {
			const drained = drainKeys(buffer);

			expect(drained).toEqual([]);
		});

		it('should not affect mouse events', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushMouseEvent(buffer, createMouseEvent(10, 20));
			drainKeys(buffer);

			expect(getPendingMouseCount(buffer)).toBe(1);
		});
	});

	describe('drainMouse', () => {
		it('should return all mouse events', () => {
			pushMouseEvent(buffer, createMouseEvent(10, 20));
			pushMouseEvent(buffer, createMouseEvent(30, 40));

			const drained = drainMouse(buffer);

			expect(drained).toHaveLength(2);
			expect(drained[0]?.event.x).toBe(10);
			expect(drained[1]?.event.x).toBe(30);
		});

		it('should clear mouse events after drain', () => {
			pushMouseEvent(buffer, createMouseEvent(10, 20));
			drainMouse(buffer);

			expect(getPendingMouseCount(buffer)).toBe(0);
		});

		it('should not affect key events', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushMouseEvent(buffer, createMouseEvent(10, 20));
			drainMouse(buffer);

			expect(getPendingKeyCount(buffer)).toBe(1);
		});
	});

	describe('drainAllEvents', () => {
		it('should return all events sorted by timestamp', () => {
			pushKeyEvent(buffer, createKeyEvent('a'), 100);
			pushMouseEvent(buffer, createMouseEvent(10, 20), 50);
			pushKeyEvent(buffer, createKeyEvent('b'), 150);

			const drained = drainAllEvents(buffer);

			expect(drained).toHaveLength(3);
			expect(drained[0]?.type).toBe('mouse');
			expect(drained[1]?.type).toBe('key');
			expect(drained[2]?.type).toBe('key');
		});

		it('should clear all events after drain', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushMouseEvent(buffer, createMouseEvent(10, 20));
			drainAllEvents(buffer);

			expect(getPendingCount(buffer)).toBe(0);
		});

		it('should preserve type information', () => {
			pushKeyEvent(buffer, createKeyEvent('a'), 100);
			pushMouseEvent(buffer, createMouseEvent(10, 20), 200);

			const drained = drainAllEvents(buffer);

			expect(drained[0]?.type).toBe('key');
			expect(drained[1]?.type).toBe('mouse');
		});
	});

	describe('peekEvents', () => {
		it('should return all events without removing them', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushMouseEvent(buffer, createMouseEvent(10, 20));

			const peeked = peekEvents(buffer);

			expect(peeked).toHaveLength(2);
			expect(getPendingCount(buffer)).toBe(2);
		});

		it('should return events sorted by timestamp', () => {
			pushKeyEvent(buffer, createKeyEvent('a'), 200);
			pushMouseEvent(buffer, createMouseEvent(10, 20), 100);

			const peeked = peekEvents(buffer);

			expect(peeked[0]?.type).toBe('mouse');
			expect(peeked[1]?.type).toBe('key');
		});
	});

	describe('peekKeys', () => {
		it('should return key events without removing', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));

			const peeked = peekKeys(buffer);

			expect(peeked).toHaveLength(1);
			expect(getPendingKeyCount(buffer)).toBe(1);
		});
	});

	describe('peekMouse', () => {
		it('should return mouse events without removing', () => {
			pushMouseEvent(buffer, createMouseEvent(10, 20));

			const peeked = peekMouse(buffer);

			expect(peeked).toHaveLength(1);
			expect(getPendingMouseCount(buffer)).toBe(1);
		});
	});

	describe('clearBuffer', () => {
		it('should remove all pending events', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushMouseEvent(buffer, createMouseEvent(10, 20));

			clearBuffer(buffer);

			expect(getPendingCount(buffer)).toBe(0);
		});
	});

	describe('getPendingCount', () => {
		it('should return total pending events', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushKeyEvent(buffer, createKeyEvent('b'));
			pushMouseEvent(buffer, createMouseEvent(10, 20));

			expect(getPendingCount(buffer)).toBe(3);
		});
	});

	describe('hasPendingEvents', () => {
		it('should return true when events exist', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));

			expect(hasPendingEvents(buffer)).toBe(true);
		});

		it('should return false when empty', () => {
			expect(hasPendingEvents(buffer)).toBe(false);
		});
	});

	describe('overflow handling', () => {
		it('should drop oldest events when buffer overflows', () => {
			const smallBuffer = createInputEventBuffer({ maxBufferSize: 3 });

			pushKeyEvent(smallBuffer, createKeyEvent('a'), 1);
			pushKeyEvent(smallBuffer, createKeyEvent('b'), 2);
			pushKeyEvent(smallBuffer, createKeyEvent('c'), 3);
			pushKeyEvent(smallBuffer, createKeyEvent('d'), 4); // Overflow

			const drained = drainKeys(smallBuffer);

			expect(drained).toHaveLength(3);
			expect(drained[0]?.event.name).toBe('b'); // 'a' was dropped
		});

		it('should track dropped events', () => {
			const smallBuffer = createInputEventBuffer({ maxBufferSize: 2 });

			pushKeyEvent(smallBuffer, createKeyEvent('a'));
			pushKeyEvent(smallBuffer, createKeyEvent('b'));
			pushKeyEvent(smallBuffer, createKeyEvent('c')); // 1 dropped
			pushKeyEvent(smallBuffer, createKeyEvent('d')); // 1 dropped

			expect(getStats(smallBuffer).droppedEvents).toBe(2);
		});

		it('should call overflow handler', () => {
			const onOverflow = vi.fn();
			const smallBuffer = createInputEventBuffer({ maxBufferSize: 1, onOverflow });

			pushKeyEvent(smallBuffer, createKeyEvent('a'));
			pushKeyEvent(smallBuffer, createKeyEvent('b'));

			expect(onOverflow).toHaveBeenCalledWith(1);
		});

		it('should log warning by default', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const smallBuffer = createInputEventBuffer({ maxBufferSize: 1 });

			pushKeyEvent(smallBuffer, createKeyEvent('a'));
			pushKeyEvent(smallBuffer, createKeyEvent('b'));

			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});

		it('should respect warnOnOverflow option', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const smallBuffer = createInputEventBuffer({ maxBufferSize: 1, warnOnOverflow: false });

			pushKeyEvent(smallBuffer, createKeyEvent('a'));
			pushKeyEvent(smallBuffer, createKeyEvent('b'));

			expect(warnSpy).not.toHaveBeenCalled();
			warnSpy.mockRestore();
		});

		it('should allow unlimited buffer with maxBufferSize 0', () => {
			const unlimitedBuffer = createInputEventBuffer({ maxBufferSize: 0 });

			for (let i = 0; i < 5000; i++) {
				pushKeyEvent(unlimitedBuffer, createKeyEvent('a'));
			}

			expect(getPendingKeyCount(unlimitedBuffer)).toBe(5000);
			expect(getStats(unlimitedBuffer).droppedEvents).toBe(0);
		});
	});

	describe('getStats', () => {
		it('should return accurate statistics', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushKeyEvent(buffer, createKeyEvent('b'));
			pushMouseEvent(buffer, createMouseEvent(10, 20));

			const stats = getStats(buffer);

			expect(stats.totalKeyEvents).toBe(2);
			expect(stats.totalMouseEvents).toBe(1);
			expect(stats.pendingKeyEvents).toBe(2);
			expect(stats.pendingMouseEvents).toBe(1);
			expect(stats.droppedEvents).toBe(0);
			expect(stats.maxBufferSize).toBe(1000);
		});

		it('should update after drain', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			drainKeys(buffer);

			const stats = getStats(buffer);

			expect(stats.totalKeyEvents).toBe(1);
			expect(stats.pendingKeyEvents).toBe(0);
		});
	});

	describe('resetStats', () => {
		it('should reset all statistics', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			pushMouseEvent(buffer, createMouseEvent(10, 20));
			resetStats(buffer);

			const stats = getStats(buffer);

			expect(stats.totalKeyEvents).toBe(0);
			expect(stats.totalMouseEvents).toBe(0);
			expect(stats.droppedEvents).toBe(0);
		});

		it('should not clear pending events', () => {
			pushKeyEvent(buffer, createKeyEvent('a'));
			resetStats(buffer);

			expect(getPendingKeyCount(buffer)).toBe(1);
		});
	});

	describe('no events lost', () => {
		it('should preserve all events in order', () => {
			const events: string[] = [];

			for (let i = 0; i < 100; i++) {
				pushKeyEvent(buffer, createKeyEvent(`key${i}` as unknown as KeyEvent['name']), i);
			}

			const drained = drainKeys(buffer);

			for (let i = 0; i < 100; i++) {
				events.push(drained[i]?.event.name ?? '');
			}

			expect(events).toHaveLength(100);
			for (let i = 0; i < 100; i++) {
				expect(events[i]).toBe(`key${i}`);
			}
		});

		it('should handle interleaved key and mouse events', () => {
			pushKeyEvent(buffer, createKeyEvent('a'), 10);
			pushMouseEvent(buffer, createMouseEvent(1, 1), 20);
			pushKeyEvent(buffer, createKeyEvent('b'), 30);
			pushMouseEvent(buffer, createMouseEvent(2, 2), 40);
			pushKeyEvent(buffer, createKeyEvent('c'), 50);

			const all = drainAllEvents(buffer);

			expect(all).toHaveLength(5);
			expect(all[0]?.timestamp).toBe(10);
			expect(all[1]?.timestamp).toBe(20);
			expect(all[2]?.timestamp).toBe(30);
			expect(all[3]?.timestamp).toBe(40);
			expect(all[4]?.timestamp).toBe(50);
		});
	});

	describe('globalInputBuffer', () => {
		beforeEach(() => {
			clearBuffer(globalInputBuffer);
			resetStats(globalInputBuffer);
		});

		it('should be a valid buffer data structure', () => {
			expect(globalInputBuffer.keyEvents).toBeDefined();
			expect(globalInputBuffer.mouseEvents).toBeDefined();
			expect(globalInputBuffer.config.maxBufferSize).toBe(1000);
		});

		it('should be usable like any buffer', () => {
			pushKeyEvent(globalInputBuffer, createKeyEvent('a'));

			expect(getPendingKeyCount(globalInputBuffer)).toBe(1);

			const drained = drainKeys(globalInputBuffer);
			expect(drained).toHaveLength(1);
		});
	});

	describe('latency tracking', () => {
		beforeEach(() => {
			buffer = createInputEventBuffer({ maxLatencySamples: 100, maxFrameSamples: 10 });
		});

		describe('recordLatency', () => {
			it('should record latency for an event', () => {
				// Record a 5ms latency directly
				recordLatency(buffer, 5);

				const stats = getLatencyStats(buffer);
				expect(stats.sampleCount).toBe(1);
				expect(stats.avg).toBeGreaterThanOrEqual(5);
			});

			it('should track latency samples', () => {
				recordLatency(buffer, 10);

				const stats = getLatencyStats(buffer);
				expect(stats.sampleCount).toBe(1);
			});

			it('should respect max latency samples', () => {
				const smallBuffer = createInputEventBuffer({ maxLatencySamples: 3 });

				for (let i = 0; i < 5; i++) {
					recordLatency(smallBuffer, i);
				}

				const stats = getLatencyStats(smallBuffer);
				expect(stats.sampleCount).toBe(3);
			});
		});

		describe('recordLatencyBatch', () => {
			it('should record latency for multiple events', () => {
				recordLatencyBatch(buffer, 5.0, 3);

				const stats = getLatencyStats(buffer);
				// Records up to 10 samples per batch
				expect(stats.sampleCount).toBe(3);
			});

			it('should update sample count', () => {
				recordLatencyBatch(buffer, 5.0, 2);

				const stats = getLatencyStats(buffer);
				expect(stats.sampleCount).toBe(2);
			});
		});

		describe('frame timing', () => {
			it('should track frame processing time', async () => {
				beginFrame(buffer);

				// Simulate some processing
				await new Promise((resolve) => setTimeout(resolve, 5));

				const processingTime = endFrame(buffer);

				expect(processingTime).toBeGreaterThanOrEqual(4); // Allow some tolerance
				expect(processingTime).toBeLessThan(50); // reasonable upper bound
			});

			it('should include frame time in stats', async () => {
				beginFrame(buffer);
				await new Promise((resolve) => setTimeout(resolve, 2));
				endFrame(buffer);

				const stats = getLatencyStats(buffer);
				expect(stats.lastFrameProcessingTime).toBeGreaterThanOrEqual(1);
			});

			it('should calculate average frame processing time', async () => {
				for (let i = 0; i < 3; i++) {
					beginFrame(buffer);
					await new Promise((resolve) => setTimeout(resolve, 2));
					endFrame(buffer);
				}

				const stats = getLatencyStats(buffer);
				expect(stats.avgFrameProcessingTime).toBeGreaterThanOrEqual(1);
				expect(stats.avgFrameProcessingTime).toBeLessThan(50);
			});

			it('should respect max frame samples', async () => {
				const smallBuffer = createInputEventBuffer({ maxFrameSamples: 3 });

				for (let i = 0; i < 5; i++) {
					beginFrame(smallBuffer);
					endFrame(smallBuffer);
				}

				// We don't expose frame sample count, but it shouldn't throw
				const stats = getLatencyStats(smallBuffer);
				expect(stats.avgFrameProcessingTime).toBeGreaterThanOrEqual(0);
			});
		});

		describe('getLatencyStats', () => {
			it('should return zeros when no samples', () => {
				const stats = getLatencyStats(buffer);

				expect(stats.min).toBe(0);
				expect(stats.max).toBe(0);
				expect(stats.avg).toBe(0);
				expect(stats.p95).toBe(0);
				expect(stats.p99).toBe(0);
				expect(stats.sampleCount).toBe(0);
			});

			it('should calculate min/max correctly', () => {
				recordLatency(buffer, 10);
				recordLatency(buffer, 5);
				recordLatency(buffer, 15);

				const stats = getLatencyStats(buffer);

				expect(stats.min).toBe(5);
				expect(stats.max).toBe(15);
			});

			it('should calculate average correctly', () => {
				recordLatency(buffer, 10);
				recordLatency(buffer, 10);
				recordLatency(buffer, 10);

				const stats = getLatencyStats(buffer);

				expect(stats.avg).toBe(10);
			});

			it('should calculate p95 correctly', () => {
				// Add 100 samples
				for (let i = 1; i <= 100; i++) {
					recordLatency(buffer, i);
				}

				const stats = getLatencyStats(buffer);

				// P95 should be around 95
				expect(stats.p95).toBeGreaterThanOrEqual(94);
				expect(stats.p95).toBeLessThanOrEqual(96);
			});

			it('should calculate p99 correctly', () => {
				// Add 100 samples
				for (let i = 1; i <= 100; i++) {
					recordLatency(buffer, i);
				}

				const stats = getLatencyStats(buffer);

				// P99 should be around 99
				expect(stats.p99).toBeGreaterThanOrEqual(98);
				expect(stats.p99).toBeLessThanOrEqual(100);
			});
		});

		describe('isLatencyAcceptable', () => {
			it('should return true when latency is under threshold', () => {
				recordLatency(buffer, 5);
				recordLatency(buffer, 8);
				recordLatency(buffer, 10);

				expect(isLatencyAcceptable(buffer, 16)).toBe(true);
			});

			it('should return false when latency exceeds threshold', () => {
				recordLatency(buffer, 20);
				recordLatency(buffer, 25);
				recordLatency(buffer, 30);

				expect(isLatencyAcceptable(buffer, 16)).toBe(false);
			});

			it('should use custom threshold', () => {
				recordLatency(buffer, 5);

				expect(isLatencyAcceptable(buffer, 3)).toBe(false);
				expect(isLatencyAcceptable(buffer, 10)).toBe(true);
			});
		});

		describe('isProcessingTimeAcceptable', () => {
			it('should return true when processing time is under threshold', async () => {
				beginFrame(buffer);
				// Very fast processing
				endFrame(buffer);

				expect(isProcessingTimeAcceptable(buffer, 1)).toBe(true);
			});

			it('should return false when processing time exceeds threshold', async () => {
				beginFrame(buffer);
				await new Promise((resolve) => setTimeout(resolve, 5));
				endFrame(buffer);

				expect(isProcessingTimeAcceptable(buffer, 1)).toBe(false);
			});
		});

		describe('resetLatencyStats', () => {
			it('should clear latency samples', () => {
				recordLatency(buffer, 5);
				recordLatency(buffer, 10);

				resetLatencyStats(buffer);

				const stats = getLatencyStats(buffer);
				expect(stats.sampleCount).toBe(0);
			});

			it('should clear frame processing times', () => {
				beginFrame(buffer);
				endFrame(buffer);

				resetLatencyStats(buffer);

				const stats = getLatencyStats(buffer);
				expect(stats.lastFrameProcessingTime).toBe(0);
			});

			it('should not affect event counts', () => {
				pushKeyEvent(buffer, createKeyEvent('a'));
				recordLatency(buffer, 5);

				resetLatencyStats(buffer);

				expect(getPendingKeyCount(buffer)).toBe(1);
				expect(getStats(buffer).totalKeyEvents).toBe(1);
			});
		});
	});
});
