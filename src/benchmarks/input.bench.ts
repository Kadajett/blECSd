/**
 * Input Processing Benchmarks
 *
 * Measures input event buffering, processing, and latency tracking performance.
 *
 * Run with: pnpm bench src/benchmarks/input.bench.ts
 *
 * @module benchmarks/input
 */

import { bench, describe } from 'vitest';
import {
	createInputEventBuffer,
	drainAllEvents,
	getLatencyStats,
	type InputEventBufferData,
	pushKeyEvent,
	pushMouseEvent,
	recordLatency,
	recordLatencyBatch,
	resetStats,
} from '../core/inputEventBuffer';
import type { KeyEvent } from '../terminal/keyParser';
import type { MouseEvent } from '../terminal/mouseParser';

// =============================================================================
// MOCK EVENT GENERATORS
// =============================================================================

function createKeyEvent(key: string): KeyEvent {
	return {
		raw: new Uint8Array([key.charCodeAt(0)]),
		name: key as KeyEvent['name'],
		sequence: key,
		meta: false,
		ctrl: false,
		shift: false,
	};
}

function createMouseEvent(x: number, y: number): MouseEvent {
	return {
		raw: new Uint8Array([27, 91, 77, 32, x + 33, y + 33]),
		x,
		y,
		button: 'left',
		action: 'press',
		ctrl: false,
		meta: false,
		shift: false,
		protocol: 'x10',
	};
}

// Pre-create events to avoid allocation overhead in benchmarks
const keyEvents = 'abcdefghijklmnopqrstuvwxyz'.split('').map(createKeyEvent);
const mouseEvents = Array.from({ length: 100 }, (_, i) =>
	createMouseEvent(i % 80, Math.floor(i / 80) % 24),
);

// =============================================================================
// EVENT PUSH BENCHMARKS
// =============================================================================

describe('Input Event Push', () => {
	describe('key event push', () => {
		bench('push single key event', () => {
			const buffer = createInputEventBuffer();
			pushKeyEvent(buffer, keyEvents[0]!);
		});

		bench('push 100 key events', () => {
			const buffer = createInputEventBuffer();
			for (let i = 0; i < 100; i++) {
				pushKeyEvent(buffer, keyEvents[i % keyEvents.length]!);
			}
		});

		bench('push 1,000 key events', () => {
			const buffer = createInputEventBuffer();
			for (let i = 0; i < 1000; i++) {
				pushKeyEvent(buffer, keyEvents[i % keyEvents.length]!);
			}
		});
	});

	describe('mouse event push', () => {
		bench('push single mouse event', () => {
			const buffer = createInputEventBuffer();
			pushMouseEvent(buffer, mouseEvents[0]!);
		});

		bench('push 100 mouse events', () => {
			const buffer = createInputEventBuffer();
			for (let i = 0; i < 100; i++) {
				pushMouseEvent(buffer, mouseEvents[i % mouseEvents.length]!);
			}
		});

		bench('push 1,000 mouse events', () => {
			const buffer = createInputEventBuffer();
			for (let i = 0; i < 1000; i++) {
				pushMouseEvent(buffer, mouseEvents[i % mouseEvents.length]!);
			}
		});
	});

	describe('mixed event push', () => {
		bench('push 100 mixed events (50/50)', () => {
			const buffer = createInputEventBuffer();
			for (let i = 0; i < 100; i++) {
				if (i % 2 === 0) {
					pushKeyEvent(buffer, keyEvents[i % keyEvents.length]!);
				} else {
					pushMouseEvent(buffer, mouseEvents[i % mouseEvents.length]!);
				}
			}
		});
	});
});

// =============================================================================
// EVENT DRAIN BENCHMARKS
// =============================================================================

describe('Input Event Drain', () => {
	describe('drain all events', () => {
		let buffer: InputEventBufferData;

		bench(
			'drain 100 events',
			() => {
				drainAllEvents(buffer);
			},
			{
				setup() {
					buffer = createInputEventBuffer();
					for (let i = 0; i < 100; i++) {
						pushKeyEvent(buffer, keyEvents[i % keyEvents.length]!);
					}
				},
			},
		);

		bench(
			'drain 1,000 events',
			() => {
				drainAllEvents(buffer);
			},
			{
				setup() {
					buffer = createInputEventBuffer();
					for (let i = 0; i < 1000; i++) {
						pushKeyEvent(buffer, keyEvents[i % keyEvents.length]!);
					}
				},
			},
		);
	});

	describe('push + drain cycle (simulates frame)', () => {
		bench('100 events per frame', () => {
			const buffer = createInputEventBuffer();
			// Push events (async input simulation)
			for (let i = 0; i < 100; i++) {
				pushKeyEvent(buffer, keyEvents[i % keyEvents.length]!);
			}
			// Drain all (frame processing)
			drainAllEvents(buffer);
		});

		bench('10 events per frame x 100 frames', () => {
			const buffer = createInputEventBuffer();
			for (let frame = 0; frame < 100; frame++) {
				// Push 10 events
				for (let i = 0; i < 10; i++) {
					pushKeyEvent(buffer, keyEvents[i % keyEvents.length]!);
				}
				// Drain
				drainAllEvents(buffer);
			}
		});
	});
});

// =============================================================================
// LATENCY TRACKING BENCHMARKS
// =============================================================================

describe('Latency Tracking', () => {
	describe('record individual latency', () => {
		bench('record 100 latencies', () => {
			const buffer = createInputEventBuffer();
			for (let i = 0; i < 100; i++) {
				recordLatency(buffer, i % 16);
			}
		});

		bench('record 1,000 latencies', () => {
			const buffer = createInputEventBuffer();
			for (let i = 0; i < 1000; i++) {
				recordLatency(buffer, i % 16);
			}
		});
	});

	describe('record batch latency', () => {
		bench('record batch of 100 events', () => {
			const buffer = createInputEventBuffer();
			recordLatencyBatch(buffer, 5.0, 100);
		});

		bench('record batch of 1,000 events', () => {
			const buffer = createInputEventBuffer();
			recordLatencyBatch(buffer, 5.0, 1000);
		});
	});

	describe('latency stats calculation', () => {
		let buffer: ReturnType<typeof createInputEventBuffer>;

		bench(
			'calculate stats with 100 samples',
			() => {
				getLatencyStats(buffer);
			},
			{
				setup() {
					buffer = createInputEventBuffer();
					for (let i = 0; i < 100; i++) {
						recordLatency(buffer, Math.random() * 16);
					}
				},
			},
		);

		bench(
			'calculate stats with 1,000 samples',
			() => {
				getLatencyStats(buffer);
			},
			{
				setup() {
					buffer = createInputEventBuffer();
					for (let i = 0; i < 1000; i++) {
						recordLatency(buffer, Math.random() * 16);
					}
				},
			},
		);
	});

	describe('stats reset', () => {
		let buffer: ReturnType<typeof createInputEventBuffer>;

		bench(
			'reset stats with 1,000 samples',
			() => {
				resetStats(buffer);
			},
			{
				setup() {
					buffer = createInputEventBuffer();
					for (let i = 0; i < 1000; i++) {
						recordLatency(buffer, Math.random() * 16);
					}
				},
			},
		);
	});
});

// =============================================================================
// THROUGHPUT BENCHMARKS
// =============================================================================

describe('Input Throughput', () => {
	describe('sustained input rate', () => {
		bench('1,000 events/sec simulation (1 frame = 10 events)', () => {
			const buffer = createInputEventBuffer();
			// Simulate 100 frames at 100fps = 1 second
			// 1000 events / 100 frames = 10 events per frame
			for (let frame = 0; frame < 100; frame++) {
				for (let i = 0; i < 10; i++) {
					pushKeyEvent(buffer, keyEvents[i % keyEvents.length]!);
				}
				const events = drainAllEvents(buffer);
				// Process events (measure overhead)
				for (const _event of events) {
					// Simulate minimal processing
				}
			}
		});

		bench('10,000 events/sec simulation (1 frame = 100 events)', () => {
			const buffer = createInputEventBuffer();
			// Simulate 100 frames at 100fps = 1 second
			// 10000 events / 100 frames = 100 events per frame
			for (let frame = 0; frame < 100; frame++) {
				for (let i = 0; i < 100; i++) {
					pushKeyEvent(buffer, keyEvents[i % keyEvents.length]!);
				}
				const events = drainAllEvents(buffer);
				for (const _event of events) {
					// Simulate minimal processing
				}
			}
		});
	});
});
