/**
 * Input event buffer for frame-independent input handling.
 *
 * Buffers keyboard and mouse events between frames so no input is lost.
 * Events are collected asynchronously from stdin and drained synchronously
 * each frame by the game loop.
 *
 * HARD REQUIREMENT: No input events should ever be lost or delayed.
 *
 * @module core/inputEventBuffer
 */

import type { KeyEvent } from '../terminal/keyParser';
import type { MouseEvent } from '../terminal/mouseParser';

/**
 * A timestamped keyboard event.
 */
export interface TimestampedKeyEvent {
	readonly type: 'key';
	readonly event: KeyEvent;
	readonly timestamp: number;
}

/**
 * A timestamped mouse event.
 */
export interface TimestampedMouseEvent {
	readonly type: 'mouse';
	readonly event: MouseEvent;
	readonly timestamp: number;
}

/**
 * Union of all timestamped input events.
 */
export type TimestampedInputEvent = TimestampedKeyEvent | TimestampedMouseEvent;

/**
 * Statistics about the input buffer.
 */
export interface InputBufferStats {
	/** Total key events pushed since creation/reset */
	totalKeyEvents: number;
	/** Total mouse events pushed since creation/reset */
	totalMouseEvents: number;
	/** Current key events in buffer */
	pendingKeyEvents: number;
	/** Current mouse events in buffer */
	pendingMouseEvents: number;
	/** Number of events dropped due to overflow */
	droppedEvents: number;
	/** Maximum buffer size */
	maxBufferSize: number;
}

/**
 * Latency statistics for input processing.
 * All values in milliseconds.
 */
export interface InputLatencyStats {
	/** Minimum latency observed */
	min: number;
	/** Maximum latency observed */
	max: number;
	/** Average latency */
	avg: number;
	/** 95th percentile latency */
	p95: number;
	/** 99th percentile latency */
	p99: number;
	/** Number of samples in the window */
	sampleCount: number;
	/** Last frame processing time in ms */
	lastFrameProcessingTime: number;
	/** Average frame processing time */
	avgFrameProcessingTime: number;
}

/**
 * Configuration options for the input event buffer.
 */
export interface InputEventBufferOptions {
	/**
	 * Maximum number of events to buffer before dropping oldest.
	 * Set to 0 for unlimited (not recommended).
	 * @default 1000
	 */
	maxBufferSize?: number;

	/**
	 * Whether to emit a warning when buffer overflows.
	 * @default true
	 */
	warnOnOverflow?: boolean;

	/**
	 * Custom warning handler for overflow events.
	 * @default console.warn
	 */
	onOverflow?: (droppedCount: number) => void;

	/**
	 * Maximum number of latency samples to keep for statistics.
	 * @default 1000
	 */
	maxLatencySamples?: number;

	/**
	 * Maximum number of frame processing time samples to keep.
	 * @default 100
	 */
	maxFrameSamples?: number;
}

/**
 * High-precision timestamp function.
 */
function getTimestamp(): number {
	return performance.now();
}

/**
 * Input event buffer for collecting and draining input events.
 *
 * The buffer collects events asynchronously from stdin handlers and
 * allows the game loop to drain all events each frame.
 *
 * @example
 * ```typescript
 * import { InputEventBuffer } from 'blecsd';
 *
 * const buffer = new InputEventBuffer({ maxBufferSize: 500 });
 *
 * // In stdin handler (async)
 * process.stdin.on('data', (data) => {
 *   const keyEvent = parseKey(data);
 *   buffer.pushKey(keyEvent);
 * });
 *
 * // In game loop (sync)
 * function update() {
 *   const keys = buffer.drainKeys();
 *   const mouse = buffer.drainMouse();
 *
 *   for (const event of keys) {
 *     handleKey(event.event, event.timestamp);
 *   }
 * }
 * ```
 */
export class InputEventBuffer {
	private keyEvents: TimestampedKeyEvent[] = [];
	private mouseEvents: TimestampedMouseEvent[] = [];
	private maxBufferSize: number;
	private warnOnOverflow: boolean;
	private onOverflow: (droppedCount: number) => void;

	// Statistics
	private totalKeyEvents = 0;
	private totalMouseEvents = 0;
	private droppedEvents = 0;

	// Latency tracking
	private latencySamples: number[] = [];
	private maxLatencySamples: number;
	private frameProcessingTimes: number[] = [];
	private maxFrameSamples: number;
	private frameStartTime = 0;

	/**
	 * Creates a new input event buffer.
	 *
	 * @param options - Buffer configuration options
	 */
	constructor(options: InputEventBufferOptions = {}) {
		this.maxBufferSize = options.maxBufferSize ?? 1000;
		this.warnOnOverflow = options.warnOnOverflow ?? true;
		this.onOverflow =
			options.onOverflow ??
			((count) => {
				if (this.warnOnOverflow) {
					console.warn(`[InputEventBuffer] Dropped ${count} events due to buffer overflow`);
				}
			});
		this.maxLatencySamples = options.maxLatencySamples ?? 1000;
		this.maxFrameSamples = options.maxFrameSamples ?? 100;
	}

	/**
	 * Pushes a keyboard event to the buffer.
	 *
	 * @param event - The keyboard event to buffer
	 * @param timestamp - Optional timestamp (default: now)
	 *
	 * @example
	 * ```typescript
	 * buffer.pushKey({ name: 'a', ctrl: false, meta: false, shift: false, sequence: 'a' });
	 * ```
	 */
	pushKey(event: KeyEvent, timestamp?: number): void {
		this.totalKeyEvents++;

		const timestampedEvent: TimestampedKeyEvent = {
			type: 'key',
			event,
			timestamp: timestamp ?? getTimestamp(),
		};

		this.keyEvents.push(timestampedEvent);
		this.checkOverflow(this.keyEvents);
	}

	/**
	 * Pushes a mouse event to the buffer.
	 *
	 * @param event - The mouse event to buffer
	 * @param timestamp - Optional timestamp (default: now)
	 *
	 * @example
	 * ```typescript
	 * buffer.pushMouse({ x: 10, y: 20, button: 'left', action: 'mousedown', ctrl: false, meta: false, shift: false });
	 * ```
	 */
	pushMouse(event: MouseEvent, timestamp?: number): void {
		this.totalMouseEvents++;

		const timestampedEvent: TimestampedMouseEvent = {
			type: 'mouse',
			event,
			timestamp: timestamp ?? getTimestamp(),
		};

		this.mouseEvents.push(timestampedEvent);
		this.checkOverflow(this.mouseEvents);
	}

	/**
	 * Drains all keyboard events from the buffer.
	 * Returns events in order (oldest first) and clears the buffer.
	 *
	 * @returns Array of timestamped key events
	 *
	 * @example
	 * ```typescript
	 * const keys = buffer.drainKeys();
	 * for (const { event, timestamp } of keys) {
	 *   console.log(`Key: ${event.name} at ${timestamp}`);
	 * }
	 * ```
	 */
	drainKeys(): TimestampedKeyEvent[] {
		const events = this.keyEvents;
		this.keyEvents = [];
		return events;
	}

	/**
	 * Drains all mouse events from the buffer.
	 * Returns events in order (oldest first) and clears the buffer.
	 *
	 * @returns Array of timestamped mouse events
	 *
	 * @example
	 * ```typescript
	 * const mouse = buffer.drainMouse();
	 * for (const { event, timestamp } of mouse) {
	 *   console.log(`Mouse: ${event.action} at ${event.x},${event.y}`);
	 * }
	 * ```
	 */
	drainMouse(): TimestampedMouseEvent[] {
		const events = this.mouseEvents;
		this.mouseEvents = [];
		return events;
	}

	/**
	 * Drains all events (keys and mouse) from the buffer.
	 * Returns events in chronological order by timestamp.
	 *
	 * @returns Array of all timestamped events sorted by timestamp
	 *
	 * @example
	 * ```typescript
	 * const events = buffer.drainAll();
	 * for (const event of events) {
	 *   if (event.type === 'key') {
	 *     handleKey(event.event);
	 *   } else {
	 *     handleMouse(event.event);
	 *   }
	 * }
	 * ```
	 */
	drainAll(): TimestampedInputEvent[] {
		const keys = this.drainKeys();
		const mouse = this.drainMouse();
		const all: TimestampedInputEvent[] = [...keys, ...mouse];

		// Sort by timestamp (stable sort preserves order for equal timestamps)
		all.sort((a, b) => a.timestamp - b.timestamp);

		return all;
	}

	/**
	 * Peeks at all pending events without removing them.
	 *
	 * @returns Array of all pending events sorted by timestamp
	 *
	 * @example
	 * ```typescript
	 * const pending = buffer.peek();
	 * console.log(`${pending.length} events waiting`);
	 * ```
	 */
	peek(): TimestampedInputEvent[] {
		const all: TimestampedInputEvent[] = [...this.keyEvents, ...this.mouseEvents];
		all.sort((a, b) => a.timestamp - b.timestamp);
		return all;
	}

	/**
	 * Peeks at pending key events without removing them.
	 *
	 * @returns Array of pending key events
	 */
	peekKeys(): readonly TimestampedKeyEvent[] {
		return this.keyEvents;
	}

	/**
	 * Peeks at pending mouse events without removing them.
	 *
	 * @returns Array of pending mouse events
	 */
	peekMouse(): readonly TimestampedMouseEvent[] {
		return this.mouseEvents;
	}

	/**
	 * Clears all pending events from the buffer.
	 *
	 * @example
	 * ```typescript
	 * buffer.clear(); // Discard all pending events
	 * ```
	 */
	clear(): void {
		this.keyEvents = [];
		this.mouseEvents = [];
	}

	/**
	 * Gets the number of pending key events.
	 */
	get pendingKeyCount(): number {
		return this.keyEvents.length;
	}

	/**
	 * Gets the number of pending mouse events.
	 */
	get pendingMouseCount(): number {
		return this.mouseEvents.length;
	}

	/**
	 * Gets the total number of pending events.
	 */
	get pendingCount(): number {
		return this.keyEvents.length + this.mouseEvents.length;
	}

	/**
	 * Checks if there are any pending events.
	 */
	get hasPending(): boolean {
		return this.keyEvents.length > 0 || this.mouseEvents.length > 0;
	}

	/**
	 * Gets buffer statistics for debugging.
	 *
	 * @returns Statistics about the buffer
	 *
	 * @example
	 * ```typescript
	 * const stats = buffer.getStats();
	 * console.log(`Total events: ${stats.totalKeyEvents + stats.totalMouseEvents}`);
	 * console.log(`Dropped: ${stats.droppedEvents}`);
	 * ```
	 */
	getStats(): InputBufferStats {
		return {
			totalKeyEvents: this.totalKeyEvents,
			totalMouseEvents: this.totalMouseEvents,
			pendingKeyEvents: this.keyEvents.length,
			pendingMouseEvents: this.mouseEvents.length,
			droppedEvents: this.droppedEvents,
			maxBufferSize: this.maxBufferSize,
		};
	}

	/**
	 * Resets buffer statistics.
	 */
	resetStats(): void {
		this.totalKeyEvents = 0;
		this.totalMouseEvents = 0;
		this.droppedEvents = 0;
	}

	/**
	 * Resets latency statistics.
	 */
	resetLatencyStats(): void {
		this.latencySamples = [];
		this.frameProcessingTimes = [];
	}

	/**
	 * Marks the start of frame processing.
	 * Call this at the beginning of your input processing phase.
	 *
	 * @example
	 * ```typescript
	 * buffer.beginFrame();
	 * const keys = buffer.drainKeys();
	 * // process keys...
	 * buffer.endFrame();
	 * ```
	 */
	beginFrame(): void {
		this.frameStartTime = getTimestamp();
	}

	/**
	 * Marks the end of frame processing and records the processing time.
	 * Call this after all input events have been processed.
	 *
	 * @returns The frame processing time in milliseconds
	 *
	 * @example
	 * ```typescript
	 * buffer.beginFrame();
	 * const keys = buffer.drainKeys();
	 * // process keys...
	 * const processingTime = buffer.endFrame();
	 * ```
	 */
	endFrame(): number {
		const endTime = getTimestamp();
		const processingTime = endTime - this.frameStartTime;

		this.frameProcessingTimes.push(processingTime);
		if (this.frameProcessingTimes.length > this.maxFrameSamples) {
			this.frameProcessingTimes.shift();
		}

		return processingTime;
	}

	/**
	 * Records latency for a processed event.
	 * Call this when an event has been fully processed to track input latency.
	 *
	 * @param eventTimestamp - The timestamp when the event was received
	 * @returns The latency in milliseconds
	 *
	 * @example
	 * ```typescript
	 * for (const { event, timestamp } of buffer.drainKeys()) {
	 *   handleKey(event);
	 *   buffer.recordLatency(timestamp);
	 * }
	 * ```
	 */
	recordLatency(eventTimestamp: number): number {
		const now = getTimestamp();
		const latency = now - eventTimestamp;

		this.latencySamples.push(latency);
		if (this.latencySamples.length > this.maxLatencySamples) {
			this.latencySamples.shift();
		}

		return latency;
	}

	/**
	 * Records latency for multiple events at once.
	 * More efficient than calling recordLatency for each event.
	 *
	 * @param events - Array of timestamped events that were processed
	 * @returns Array of latencies in milliseconds
	 *
	 * @example
	 * ```typescript
	 * const keys = buffer.drainKeys();
	 * for (const { event } of keys) {
	 *   handleKey(event);
	 * }
	 * buffer.recordLatencyBatch(keys);
	 * ```
	 */
	recordLatencyBatch(events: readonly TimestampedInputEvent[]): number[] {
		const now = getTimestamp();
		const latencies: number[] = [];

		for (const event of events) {
			const latency = now - event.timestamp;
			latencies.push(latency);
			this.latencySamples.push(latency);
		}

		// Trim to max samples
		while (this.latencySamples.length > this.maxLatencySamples) {
			this.latencySamples.shift();
		}

		return latencies;
	}

	/**
	 * Gets latency statistics for input processing.
	 * Returns min, max, average, and percentile latencies.
	 *
	 * @returns Latency statistics in milliseconds
	 *
	 * @example
	 * ```typescript
	 * const stats = buffer.getLatencyStats();
	 * console.log(`Avg latency: ${stats.avg.toFixed(2)}ms`);
	 * console.log(`P95 latency: ${stats.p95.toFixed(2)}ms`);
	 * if (stats.max > 16) {
	 *   console.warn('Input latency exceeds frame budget!');
	 * }
	 * ```
	 */
	getLatencyStats(): InputLatencyStats {
		const samples = this.latencySamples;
		const frameTimes = this.frameProcessingTimes;

		if (samples.length === 0) {
			return {
				min: 0,
				max: 0,
				avg: 0,
				p95: 0,
				p99: 0,
				sampleCount: 0,
				lastFrameProcessingTime: frameTimes[frameTimes.length - 1] ?? 0,
				avgFrameProcessingTime: this.calculateAverage(frameTimes),
			};
		}

		// Sort samples for percentile calculation
		const sorted = [...samples].sort((a, b) => a - b);

		return {
			min: sorted[0] ?? 0,
			max: sorted[sorted.length - 1] ?? 0,
			avg: this.calculateAverage(sorted),
			p95: this.calculatePercentile(sorted, 0.95),
			p99: this.calculatePercentile(sorted, 0.99),
			sampleCount: sorted.length,
			lastFrameProcessingTime: frameTimes[frameTimes.length - 1] ?? 0,
			avgFrameProcessingTime: this.calculateAverage(frameTimes),
		};
	}

	/**
	 * Checks if the current latency is within acceptable bounds.
	 * By default, checks if p95 latency is under 16ms (one frame at 60fps).
	 *
	 * @param maxLatencyMs - Maximum acceptable p95 latency in milliseconds
	 * @returns True if latency is acceptable
	 *
	 * @example
	 * ```typescript
	 * if (!buffer.isLatencyAcceptable(16)) {
	 *   console.warn('Input latency is too high!');
	 * }
	 * ```
	 */
	isLatencyAcceptable(maxLatencyMs = 16): boolean {
		const stats = this.getLatencyStats();
		return stats.p95 <= maxLatencyMs;
	}

	/**
	 * Checks if frame processing time is within budget.
	 * By default, checks if average processing time is under 1ms.
	 *
	 * @param maxProcessingTimeMs - Maximum acceptable processing time in milliseconds
	 * @returns True if processing time is acceptable
	 *
	 * @example
	 * ```typescript
	 * if (!buffer.isProcessingTimeAcceptable(1)) {
	 *   console.warn('Input processing is taking too long!');
	 * }
	 * ```
	 */
	isProcessingTimeAcceptable(maxProcessingTimeMs = 1): boolean {
		const stats = this.getLatencyStats();
		return stats.avgFrameProcessingTime <= maxProcessingTimeMs;
	}

	/**
	 * Calculates the average of an array of numbers.
	 */
	private calculateAverage(values: number[]): number {
		if (values.length === 0) {
			return 0;
		}
		const sum = values.reduce((a, b) => a + b, 0);
		return sum / values.length;
	}

	/**
	 * Calculates a percentile from a sorted array.
	 */
	private calculatePercentile(sorted: number[], percentile: number): number {
		if (sorted.length === 0) {
			return 0;
		}
		if (sorted.length === 1) {
			return sorted[0] ?? 0;
		}
		const index = Math.ceil(percentile * sorted.length) - 1;
		return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
	}

	/**
	 * Sets the maximum buffer size.
	 *
	 * @param size - New maximum size (0 for unlimited)
	 */
	setMaxBufferSize(size: number): void {
		this.maxBufferSize = size;
	}

	/**
	 * Gets the maximum buffer size.
	 */
	getMaxBufferSize(): number {
		return this.maxBufferSize;
	}

	/**
	 * Checks for buffer overflow and handles it.
	 */
	private checkOverflow<T>(events: T[]): void {
		if (this.maxBufferSize <= 0) {
			return; // Unlimited
		}

		if (events.length > this.maxBufferSize) {
			const excess = events.length - this.maxBufferSize;
			events.splice(0, excess); // Remove oldest events
			this.droppedEvents += excess;
			this.onOverflow(excess);
		}
	}
}

/**
 * Creates a new input event buffer.
 *
 * @param options - Buffer configuration options
 * @returns A new InputEventBuffer instance
 *
 * @example
 * ```typescript
 * import { createInputEventBuffer } from 'blecsd';
 *
 * const buffer = createInputEventBuffer({
 *   maxBufferSize: 500,
 *   warnOnOverflow: true,
 * });
 *
 * // Push events from stdin
 * buffer.pushKey(keyEvent);
 *
 * // Drain in game loop
 * const keys = buffer.drainKeys();
 * ```
 */
export function createInputEventBuffer(options: InputEventBufferOptions = {}): InputEventBuffer {
	return new InputEventBuffer(options);
}

/**
 * Global shared input buffer for simple use cases.
 *
 * For more complex scenarios (multiple input sources, custom overflow handling),
 * create your own InputEventBuffer instance.
 *
 * @example
 * ```typescript
 * import { globalInputBuffer } from 'blecsd';
 *
 * // Push from stdin handler
 * globalInputBuffer.pushKey(event);
 *
 * // Drain in game loop
 * const events = globalInputBuffer.drainAll();
 * ```
 */
export const globalInputBuffer = new InputEventBuffer();
