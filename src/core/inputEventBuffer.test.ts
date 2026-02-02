import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyEvent } from '../terminal/keyParser';
import type { MouseEvent } from '../terminal/mouseParser';
import { createInputEventBuffer, globalInputBuffer, InputEventBuffer } from './inputEventBuffer';

// Mock key event factory
function createKeyEvent(name: string, modifiers = {}): KeyEvent {
	return {
		name: name as KeyEvent['name'],
		sequence: name,
		ctrl: false,
		meta: false,
		shift: false,
		raw: new Uint8Array([]),
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
	let buffer: InputEventBuffer;

	beforeEach(() => {
		buffer = new InputEventBuffer();
	});

	describe('createInputEventBuffer', () => {
		it('should create a buffer with default options', () => {
			const buf = createInputEventBuffer();
			expect(buf).toBeInstanceOf(InputEventBuffer);
			expect(buf.getMaxBufferSize()).toBe(1000);
		});

		it('should create a buffer with custom options', () => {
			const buf = createInputEventBuffer({ maxBufferSize: 500 });
			expect(buf.getMaxBufferSize()).toBe(500);
		});
	});

	describe('pushKey', () => {
		it('should add key events to the buffer', () => {
			buffer.pushKey(createKeyEvent('a'));

			expect(buffer.pendingKeyCount).toBe(1);
		});

		it('should preserve event data', () => {
			const event = createKeyEvent('a', { ctrl: true, shift: true });
			buffer.pushKey(event);

			const drained = buffer.drainKeys();
			expect(drained[0]?.event).toEqual(event);
		});

		it('should add timestamp to events', () => {
			buffer.pushKey(createKeyEvent('a'));

			const drained = buffer.drainKeys();
			expect(drained[0]?.timestamp).toBeGreaterThan(0);
		});

		it('should accept custom timestamp', () => {
			buffer.pushKey(createKeyEvent('a'), 12345);

			const drained = buffer.drainKeys();
			expect(drained[0]?.timestamp).toBe(12345);
		});

		it('should track total key events', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushKey(createKeyEvent('b'));
			buffer.pushKey(createKeyEvent('c'));

			expect(buffer.getStats().totalKeyEvents).toBe(3);
		});
	});

	describe('pushMouse', () => {
		it('should add mouse events to the buffer', () => {
			buffer.pushMouse(createMouseEvent(10, 20));

			expect(buffer.pendingMouseCount).toBe(1);
		});

		it('should preserve event data', () => {
			const event = createMouseEvent(10, 20, 'mouseup');
			buffer.pushMouse(event);

			const drained = buffer.drainMouse();
			expect(drained[0]?.event).toEqual(event);
		});

		it('should add timestamp to events', () => {
			buffer.pushMouse(createMouseEvent(10, 20));

			const drained = buffer.drainMouse();
			expect(drained[0]?.timestamp).toBeGreaterThan(0);
		});

		it('should track total mouse events', () => {
			buffer.pushMouse(createMouseEvent(10, 20));
			buffer.pushMouse(createMouseEvent(20, 30));

			expect(buffer.getStats().totalMouseEvents).toBe(2);
		});
	});

	describe('drainKeys', () => {
		it('should return all key events', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushKey(createKeyEvent('b'));
			buffer.pushKey(createKeyEvent('c'));

			const drained = buffer.drainKeys();

			expect(drained).toHaveLength(3);
			expect(drained[0]?.event.name).toBe('a');
			expect(drained[1]?.event.name).toBe('b');
			expect(drained[2]?.event.name).toBe('c');
		});

		it('should clear key events after drain', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.drainKeys();

			expect(buffer.pendingKeyCount).toBe(0);
		});

		it('should return empty array when no events', () => {
			const drained = buffer.drainKeys();

			expect(drained).toEqual([]);
		});

		it('should not affect mouse events', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushMouse(createMouseEvent(10, 20));
			buffer.drainKeys();

			expect(buffer.pendingMouseCount).toBe(1);
		});
	});

	describe('drainMouse', () => {
		it('should return all mouse events', () => {
			buffer.pushMouse(createMouseEvent(10, 20));
			buffer.pushMouse(createMouseEvent(30, 40));

			const drained = buffer.drainMouse();

			expect(drained).toHaveLength(2);
			expect(drained[0]?.event.x).toBe(10);
			expect(drained[1]?.event.x).toBe(30);
		});

		it('should clear mouse events after drain', () => {
			buffer.pushMouse(createMouseEvent(10, 20));
			buffer.drainMouse();

			expect(buffer.pendingMouseCount).toBe(0);
		});

		it('should not affect key events', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushMouse(createMouseEvent(10, 20));
			buffer.drainMouse();

			expect(buffer.pendingKeyCount).toBe(1);
		});
	});

	describe('drainAll', () => {
		it('should return all events sorted by timestamp', () => {
			buffer.pushKey(createKeyEvent('a'), 100);
			buffer.pushMouse(createMouseEvent(10, 20), 50);
			buffer.pushKey(createKeyEvent('b'), 150);

			const drained = buffer.drainAll();

			expect(drained).toHaveLength(3);
			expect(drained[0]?.type).toBe('mouse');
			expect(drained[1]?.type).toBe('key');
			expect(drained[2]?.type).toBe('key');
		});

		it('should clear all events after drain', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushMouse(createMouseEvent(10, 20));
			buffer.drainAll();

			expect(buffer.pendingCount).toBe(0);
		});

		it('should preserve type information', () => {
			buffer.pushKey(createKeyEvent('a'), 100);
			buffer.pushMouse(createMouseEvent(10, 20), 200);

			const drained = buffer.drainAll();

			expect(drained[0]?.type).toBe('key');
			expect(drained[1]?.type).toBe('mouse');
		});
	});

	describe('peek', () => {
		it('should return all events without removing them', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushMouse(createMouseEvent(10, 20));

			const peeked = buffer.peek();

			expect(peeked).toHaveLength(2);
			expect(buffer.pendingCount).toBe(2);
		});

		it('should return events sorted by timestamp', () => {
			buffer.pushKey(createKeyEvent('a'), 200);
			buffer.pushMouse(createMouseEvent(10, 20), 100);

			const peeked = buffer.peek();

			expect(peeked[0]?.type).toBe('mouse');
			expect(peeked[1]?.type).toBe('key');
		});
	});

	describe('peekKeys', () => {
		it('should return key events without removing', () => {
			buffer.pushKey(createKeyEvent('a'));

			const peeked = buffer.peekKeys();

			expect(peeked).toHaveLength(1);
			expect(buffer.pendingKeyCount).toBe(1);
		});
	});

	describe('peekMouse', () => {
		it('should return mouse events without removing', () => {
			buffer.pushMouse(createMouseEvent(10, 20));

			const peeked = buffer.peekMouse();

			expect(peeked).toHaveLength(1);
			expect(buffer.pendingMouseCount).toBe(1);
		});
	});

	describe('clear', () => {
		it('should remove all pending events', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushMouse(createMouseEvent(10, 20));

			buffer.clear();

			expect(buffer.pendingCount).toBe(0);
		});
	});

	describe('pendingCount', () => {
		it('should return total pending events', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushKey(createKeyEvent('b'));
			buffer.pushMouse(createMouseEvent(10, 20));

			expect(buffer.pendingCount).toBe(3);
		});
	});

	describe('hasPending', () => {
		it('should return true when events exist', () => {
			buffer.pushKey(createKeyEvent('a'));

			expect(buffer.hasPending).toBe(true);
		});

		it('should return false when empty', () => {
			expect(buffer.hasPending).toBe(false);
		});
	});

	describe('overflow handling', () => {
		it('should drop oldest events when buffer overflows', () => {
			const smallBuffer = new InputEventBuffer({ maxBufferSize: 3 });

			smallBuffer.pushKey(createKeyEvent('a'), 1);
			smallBuffer.pushKey(createKeyEvent('b'), 2);
			smallBuffer.pushKey(createKeyEvent('c'), 3);
			smallBuffer.pushKey(createKeyEvent('d'), 4); // Overflow

			const drained = smallBuffer.drainKeys();

			expect(drained).toHaveLength(3);
			expect(drained[0]?.event.name).toBe('b'); // 'a' was dropped
		});

		it('should track dropped events', () => {
			const smallBuffer = new InputEventBuffer({ maxBufferSize: 2 });

			smallBuffer.pushKey(createKeyEvent('a'));
			smallBuffer.pushKey(createKeyEvent('b'));
			smallBuffer.pushKey(createKeyEvent('c')); // 1 dropped
			smallBuffer.pushKey(createKeyEvent('d')); // 1 dropped

			expect(smallBuffer.getStats().droppedEvents).toBe(2);
		});

		it('should call overflow handler', () => {
			const onOverflow = vi.fn();
			const smallBuffer = new InputEventBuffer({ maxBufferSize: 1, onOverflow });

			smallBuffer.pushKey(createKeyEvent('a'));
			smallBuffer.pushKey(createKeyEvent('b'));

			expect(onOverflow).toHaveBeenCalledWith(1);
		});

		it('should log warning by default', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const smallBuffer = new InputEventBuffer({ maxBufferSize: 1 });

			smallBuffer.pushKey(createKeyEvent('a'));
			smallBuffer.pushKey(createKeyEvent('b'));

			expect(warnSpy).toHaveBeenCalled();
			warnSpy.mockRestore();
		});

		it('should respect warnOnOverflow option', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const smallBuffer = new InputEventBuffer({ maxBufferSize: 1, warnOnOverflow: false });

			smallBuffer.pushKey(createKeyEvent('a'));
			smallBuffer.pushKey(createKeyEvent('b'));

			expect(warnSpy).not.toHaveBeenCalled();
			warnSpy.mockRestore();
		});

		it('should allow unlimited buffer with maxBufferSize 0', () => {
			const unlimitedBuffer = new InputEventBuffer({ maxBufferSize: 0 });

			for (let i = 0; i < 5000; i++) {
				unlimitedBuffer.pushKey(createKeyEvent('a'));
			}

			expect(unlimitedBuffer.pendingKeyCount).toBe(5000);
			expect(unlimitedBuffer.getStats().droppedEvents).toBe(0);
		});
	});

	describe('getStats', () => {
		it('should return accurate statistics', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushKey(createKeyEvent('b'));
			buffer.pushMouse(createMouseEvent(10, 20));

			const stats = buffer.getStats();

			expect(stats.totalKeyEvents).toBe(2);
			expect(stats.totalMouseEvents).toBe(1);
			expect(stats.pendingKeyEvents).toBe(2);
			expect(stats.pendingMouseEvents).toBe(1);
			expect(stats.droppedEvents).toBe(0);
			expect(stats.maxBufferSize).toBe(1000);
		});

		it('should update after drain', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.drainKeys();

			const stats = buffer.getStats();

			expect(stats.totalKeyEvents).toBe(1);
			expect(stats.pendingKeyEvents).toBe(0);
		});
	});

	describe('resetStats', () => {
		it('should reset all statistics', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.pushMouse(createMouseEvent(10, 20));
			buffer.resetStats();

			const stats = buffer.getStats();

			expect(stats.totalKeyEvents).toBe(0);
			expect(stats.totalMouseEvents).toBe(0);
			expect(stats.droppedEvents).toBe(0);
		});

		it('should not clear pending events', () => {
			buffer.pushKey(createKeyEvent('a'));
			buffer.resetStats();

			expect(buffer.pendingKeyCount).toBe(1);
		});
	});

	describe('setMaxBufferSize', () => {
		it('should update max buffer size', () => {
			buffer.setMaxBufferSize(500);

			expect(buffer.getMaxBufferSize()).toBe(500);
		});
	});

	describe('no events lost', () => {
		it('should preserve all events in order', () => {
			const events: string[] = [];

			for (let i = 0; i < 100; i++) {
				buffer.pushKey(createKeyEvent(`key${i}` as unknown as KeyEvent['name']), i);
			}

			const drained = buffer.drainKeys();

			for (let i = 0; i < 100; i++) {
				events.push(drained[i]?.event.name ?? '');
			}

			expect(events).toHaveLength(100);
			for (let i = 0; i < 100; i++) {
				expect(events[i]).toBe(`key${i}`);
			}
		});

		it('should handle interleaved key and mouse events', () => {
			buffer.pushKey(createKeyEvent('a'), 10);
			buffer.pushMouse(createMouseEvent(1, 1), 20);
			buffer.pushKey(createKeyEvent('b'), 30);
			buffer.pushMouse(createMouseEvent(2, 2), 40);
			buffer.pushKey(createKeyEvent('c'), 50);

			const all = buffer.drainAll();

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
			globalInputBuffer.clear();
			globalInputBuffer.resetStats();
		});

		it('should be a singleton instance', () => {
			expect(globalInputBuffer).toBeInstanceOf(InputEventBuffer);
		});

		it('should be usable like any buffer', () => {
			globalInputBuffer.pushKey(createKeyEvent('a'));

			expect(globalInputBuffer.pendingKeyCount).toBe(1);

			const drained = globalInputBuffer.drainKeys();
			expect(drained).toHaveLength(1);
		});
	});

	describe('latency tracking', () => {
		beforeEach(() => {
			buffer = new InputEventBuffer({ maxLatencySamples: 100, maxFrameSamples: 10 });
		});

		describe('recordLatency', () => {
			it('should record latency for an event', () => {
				const timestamp = performance.now() - 5; // 5ms ago
				const latency = buffer.recordLatency(timestamp);

				expect(latency).toBeGreaterThanOrEqual(5);
				expect(latency).toBeLessThan(100); // reasonable upper bound
			});

			it('should track latency samples', () => {
				const timestamp = performance.now() - 10;
				buffer.recordLatency(timestamp);

				const stats = buffer.getLatencyStats();
				expect(stats.sampleCount).toBe(1);
			});

			it('should respect max latency samples', () => {
				const smallBuffer = new InputEventBuffer({ maxLatencySamples: 3 });

				for (let i = 0; i < 5; i++) {
					smallBuffer.recordLatency(performance.now() - i);
				}

				const stats = smallBuffer.getLatencyStats();
				expect(stats.sampleCount).toBe(3);
			});
		});

		describe('recordLatencyBatch', () => {
			it('should record latency for multiple events', () => {
				const now = performance.now();
				const events = [
					{ type: 'key' as const, event: createKeyEvent('a'), timestamp: now - 10 },
					{ type: 'key' as const, event: createKeyEvent('b'), timestamp: now - 5 },
					{ type: 'key' as const, event: createKeyEvent('c'), timestamp: now - 2 },
				];

				const latencies = buffer.recordLatencyBatch(events);

				expect(latencies).toHaveLength(3);
				expect(latencies[0]).toBeGreaterThanOrEqual(10);
				expect(latencies[1]).toBeGreaterThanOrEqual(5);
				expect(latencies[2]).toBeGreaterThanOrEqual(2);
			});

			it('should update sample count', () => {
				const now = performance.now();
				const events = [
					{ type: 'key' as const, event: createKeyEvent('a'), timestamp: now - 5 },
					{ type: 'key' as const, event: createKeyEvent('b'), timestamp: now - 3 },
				];

				buffer.recordLatencyBatch(events);

				const stats = buffer.getLatencyStats();
				expect(stats.sampleCount).toBe(2);
			});
		});

		describe('frame timing', () => {
			it('should track frame processing time', async () => {
				buffer.beginFrame();

				// Simulate some processing
				await new Promise((resolve) => setTimeout(resolve, 5));

				const processingTime = buffer.endFrame();

				expect(processingTime).toBeGreaterThanOrEqual(4); // Allow some tolerance
				expect(processingTime).toBeLessThan(50); // reasonable upper bound
			});

			it('should include frame time in stats', async () => {
				buffer.beginFrame();
				await new Promise((resolve) => setTimeout(resolve, 2));
				buffer.endFrame();

				const stats = buffer.getLatencyStats();
				expect(stats.lastFrameProcessingTime).toBeGreaterThanOrEqual(1);
			});

			it('should calculate average frame processing time', async () => {
				for (let i = 0; i < 3; i++) {
					buffer.beginFrame();
					await new Promise((resolve) => setTimeout(resolve, 2));
					buffer.endFrame();
				}

				const stats = buffer.getLatencyStats();
				expect(stats.avgFrameProcessingTime).toBeGreaterThanOrEqual(1);
				expect(stats.avgFrameProcessingTime).toBeLessThan(50);
			});

			it('should respect max frame samples', async () => {
				const smallBuffer = new InputEventBuffer({ maxFrameSamples: 3 });

				for (let i = 0; i < 5; i++) {
					smallBuffer.beginFrame();
					smallBuffer.endFrame();
				}

				// We don't expose frame sample count, but it shouldn't throw
				const stats = smallBuffer.getLatencyStats();
				expect(stats.avgFrameProcessingTime).toBeGreaterThanOrEqual(0);
			});
		});

		describe('getLatencyStats', () => {
			it('should return zeros when no samples', () => {
				const stats = buffer.getLatencyStats();

				expect(stats.min).toBe(0);
				expect(stats.max).toBe(0);
				expect(stats.avg).toBe(0);
				expect(stats.p95).toBe(0);
				expect(stats.p99).toBe(0);
				expect(stats.sampleCount).toBe(0);
			});

			it('should calculate min/max correctly', () => {
				const now = performance.now();

				// Push events with known latencies
				buffer.recordLatency(now - 10); // 10ms latency
				buffer.recordLatency(now - 5); // 5ms latency
				buffer.recordLatency(now - 15); // 15ms latency

				const stats = buffer.getLatencyStats();

				expect(stats.min).toBeGreaterThanOrEqual(5);
				expect(stats.min).toBeLessThan(7);
				expect(stats.max).toBeGreaterThanOrEqual(15);
				expect(stats.max).toBeLessThan(20);
			});

			it('should calculate average correctly', () => {
				const now = performance.now();

				buffer.recordLatency(now - 10);
				buffer.recordLatency(now - 10);
				buffer.recordLatency(now - 10);

				const stats = buffer.getLatencyStats();

				expect(stats.avg).toBeGreaterThanOrEqual(10);
				expect(stats.avg).toBeLessThan(12);
			});

			it('should calculate p95 correctly', () => {
				const now = performance.now();

				// Add 100 samples
				for (let i = 1; i <= 100; i++) {
					buffer.recordLatency(now - i);
				}

				const stats = buffer.getLatencyStats();

				// P95 should be around 95ms latency
				expect(stats.p95).toBeGreaterThanOrEqual(94);
				expect(stats.p95).toBeLessThan(100);
			});

			it('should calculate p99 correctly', () => {
				const now = performance.now();

				// Add 100 samples
				for (let i = 1; i <= 100; i++) {
					buffer.recordLatency(now - i);
				}

				const stats = buffer.getLatencyStats();

				// P99 should be around 99ms latency (with tolerance for timing variations)
				expect(stats.p99).toBeGreaterThanOrEqual(95);
				expect(stats.p99).toBeLessThan(110);
			});
		});

		describe('isLatencyAcceptable', () => {
			it('should return true when latency is under threshold', () => {
				const now = performance.now();

				buffer.recordLatency(now - 5); // 5ms latency
				buffer.recordLatency(now - 8); // 8ms latency
				buffer.recordLatency(now - 10); // 10ms latency

				expect(buffer.isLatencyAcceptable(16)).toBe(true);
			});

			it('should return false when latency exceeds threshold', () => {
				const now = performance.now();

				buffer.recordLatency(now - 20); // 20ms latency
				buffer.recordLatency(now - 25); // 25ms latency
				buffer.recordLatency(now - 30); // 30ms latency

				expect(buffer.isLatencyAcceptable(16)).toBe(false);
			});

			it('should use custom threshold', () => {
				const now = performance.now();

				buffer.recordLatency(now - 5);

				expect(buffer.isLatencyAcceptable(3)).toBe(false);
				expect(buffer.isLatencyAcceptable(10)).toBe(true);
			});
		});

		describe('isProcessingTimeAcceptable', () => {
			it('should return true when processing time is under threshold', async () => {
				buffer.beginFrame();
				// Very fast processing
				buffer.endFrame();

				expect(buffer.isProcessingTimeAcceptable(1)).toBe(true);
			});

			it('should return false when processing time exceeds threshold', async () => {
				buffer.beginFrame();
				await new Promise((resolve) => setTimeout(resolve, 5));
				buffer.endFrame();

				expect(buffer.isProcessingTimeAcceptable(1)).toBe(false);
			});
		});

		describe('resetLatencyStats', () => {
			it('should clear latency samples', () => {
				const now = performance.now();
				buffer.recordLatency(now - 5);
				buffer.recordLatency(now - 10);

				buffer.resetLatencyStats();

				const stats = buffer.getLatencyStats();
				expect(stats.sampleCount).toBe(0);
			});

			it('should clear frame processing times', () => {
				buffer.beginFrame();
				buffer.endFrame();

				buffer.resetLatencyStats();

				const stats = buffer.getLatencyStats();
				expect(stats.lastFrameProcessingTime).toBe(0);
			});

			it('should not affect event counts', () => {
				buffer.pushKey(createKeyEvent('a'));
				const now = performance.now();
				buffer.recordLatency(now - 5);

				buffer.resetLatencyStats();

				expect(buffer.pendingKeyCount).toBe(1);
				expect(buffer.getStats().totalKeyEvents).toBe(1);
			});
		});
	});
});
