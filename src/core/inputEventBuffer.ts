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

// =============================================================================
// TYPES
// =============================================================================

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
	readonly totalKeyEvents: number;
	/** Total mouse events pushed since creation/reset */
	readonly totalMouseEvents: number;
	/** Current key events in buffer */
	readonly pendingKeyEvents: number;
	/** Current mouse events in buffer */
	readonly pendingMouseEvents: number;
	/** Number of events dropped due to overflow */
	readonly droppedEvents: number;
	/** Maximum buffer size */
	readonly maxBufferSize: number;
}

/**
 * Latency statistics for input processing.
 * All values in milliseconds.
 */
export interface InputLatencyStats {
	/** Minimum latency observed */
	readonly min: number;
	/** Maximum latency observed */
	readonly max: number;
	/** Average latency */
	readonly avg: number;
	/** 95th percentile latency */
	readonly p95: number;
	/** 99th percentile latency */
	readonly p99: number;
	/** Number of samples in the window */
	readonly sampleCount: number;
	/** Last frame processing time in ms */
	readonly lastFrameProcessingTime: number;
	/** Average frame processing time */
	readonly avgFrameProcessingTime: number;
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
	readonly maxBufferSize?: number;

	/**
	 * Whether to emit a warning when buffer overflows.
	 * @default true
	 */
	readonly warnOnOverflow?: boolean;

	/**
	 * Custom warning handler for overflow events.
	 * @default console.warn
	 */
	readonly onOverflow?: (droppedCount: number) => void;

	/**
	 * Maximum number of latency samples to keep for statistics.
	 * @default 1000
	 */
	readonly maxLatencySamples?: number;

	/**
	 * Maximum number of frame processing time samples to keep.
	 * @default 100
	 */
	readonly maxFrameSamples?: number;
}

/**
 * Input event buffer data structure.
 * All state is stored in plain arrays for functional manipulation.
 */
export interface InputEventBufferData {
	/** Pending key events */
	keyEvents: TimestampedKeyEvent[];
	/** Pending mouse events */
	mouseEvents: TimestampedMouseEvent[];
	/** Latency samples for statistics */
	latencySamples: number[];
	/** Frame processing time samples */
	frameProcessingTimes: number[];
	/** Frame start timestamp */
	frameStartTime: number;
	/** Total key events pushed since creation/reset */
	totalKeyEvents: number;
	/** Total mouse events pushed since creation/reset */
	totalMouseEvents: number;
	/** Number of events dropped due to overflow */
	droppedEvents: number;
	/** Configuration */
	readonly config: {
		readonly maxBufferSize: number;
		readonly maxLatencySamples: number;
		readonly maxFrameSamples: number;
		readonly warnOnOverflow: boolean;
		readonly onOverflow: (droppedCount: number) => void;
	};
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * High-precision timestamp function.
 */
function getTimestamp(): number {
	return performance.now();
}

/**
 * Calculates the average of an array of numbers.
 */
function calculateAverage(values: readonly number[]): number {
	if (values.length === 0) return 0;
	const sum = values.reduce((a, b) => a + b, 0);
	return sum / values.length;
}

/**
 * Calculates a percentile from a sorted array.
 */
function calculatePercentile(sorted: readonly number[], percentile: number): number {
	if (sorted.length === 0) return 0;
	if (sorted.length === 1) return sorted[0] ?? 0;
	const index = Math.ceil(percentile * sorted.length) - 1;
	return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
}

/**
 * Default overflow handler.
 */
function defaultOnOverflow(count: number, warnOnOverflow: boolean): void {
	if (warnOnOverflow) {
		console.warn(`[InputEventBuffer] Dropped ${count} events due to buffer overflow`);
	}
}

// =============================================================================
// BUFFER CREATION
// =============================================================================

/**
 * Creates a new input event buffer.
 *
 * @param options - Buffer configuration options
 * @returns A new InputEventBufferData
 *
 * @example
 * ```typescript
 * import { createInputEventBuffer, pushKeyEvent, drainKeys } from 'blecsd';
 *
 * const buffer = createInputEventBuffer({ maxBufferSize: 500 });
 *
 * // Push events from stdin
 * pushKeyEvent(buffer, keyEvent);
 *
 * // Drain in game loop
 * const keys = drainKeys(buffer);
 * ```
 */
export function createInputEventBuffer(
	options: InputEventBufferOptions = {},
): InputEventBufferData {
	const warnOnOverflow = options.warnOnOverflow ?? true;
	return {
		keyEvents: [],
		mouseEvents: [],
		latencySamples: [],
		frameProcessingTimes: [],
		frameStartTime: 0,
		totalKeyEvents: 0,
		totalMouseEvents: 0,
		droppedEvents: 0,
		config: {
			maxBufferSize: options.maxBufferSize ?? 1000,
			maxLatencySamples: options.maxLatencySamples ?? 1000,
			maxFrameSamples: options.maxFrameSamples ?? 100,
			warnOnOverflow,
			onOverflow: options.onOverflow ?? ((count) => defaultOnOverflow(count, warnOnOverflow)),
		},
	};
}

// =============================================================================
// EVENT PUSH FUNCTIONS
// =============================================================================

/**
 * Checks for buffer overflow and handles it.
 */
function checkOverflow<T>(buffer: InputEventBufferData, events: T[]): number {
	const maxSize = buffer.config.maxBufferSize;
	if (maxSize <= 0) return 0; // Unlimited

	if (events.length > maxSize) {
		const excess = events.length - maxSize;
		events.splice(0, excess); // Remove oldest events
		buffer.droppedEvents += excess;
		buffer.config.onOverflow(excess);
		return excess;
	}
	return 0;
}

/**
 * Pushes a keyboard event to the buffer.
 *
 * @param buffer - The input event buffer
 * @param event - The keyboard event to buffer
 * @param timestamp - Optional timestamp (default: now)
 *
 * @example
 * ```typescript
 * pushKeyEvent(buffer, { name: 'a', ctrl: false, meta: false, shift: false, sequence: 'a' });
 * ```
 */
export function pushKeyEvent(
	buffer: InputEventBufferData,
	event: KeyEvent,
	timestamp?: number,
): void {
	buffer.totalKeyEvents++;

	const timestampedEvent: TimestampedKeyEvent = {
		type: 'key',
		event,
		timestamp: timestamp ?? getTimestamp(),
	};

	buffer.keyEvents.push(timestampedEvent);
	checkOverflow(buffer, buffer.keyEvents);
}

/**
 * Pushes a mouse event to the buffer.
 *
 * @param buffer - The input event buffer
 * @param event - The mouse event to buffer
 * @param timestamp - Optional timestamp (default: now)
 *
 * @example
 * ```typescript
 * pushMouseEvent(buffer, { x: 10, y: 20, button: 'left', action: 'mousedown', ctrl: false, meta: false, shift: false });
 * ```
 */
export function pushMouseEvent(
	buffer: InputEventBufferData,
	event: MouseEvent,
	timestamp?: number,
): void {
	buffer.totalMouseEvents++;

	const timestampedEvent: TimestampedMouseEvent = {
		type: 'mouse',
		event,
		timestamp: timestamp ?? getTimestamp(),
	};

	buffer.mouseEvents.push(timestampedEvent);
	checkOverflow(buffer, buffer.mouseEvents);
}

// =============================================================================
// EVENT DRAIN FUNCTIONS
// =============================================================================

/**
 * Drains all keyboard events from the buffer.
 * Returns events in order (oldest first) and clears the buffer.
 *
 * @param buffer - The input event buffer
 * @returns Array of timestamped key events
 *
 * @example
 * ```typescript
 * const keys = drainKeys(buffer);
 * for (const { event, timestamp } of keys) {
 *   console.log(`Key: ${event.name} at ${timestamp}`);
 * }
 * ```
 */
export function drainKeys(buffer: InputEventBufferData): TimestampedKeyEvent[] {
	const events = buffer.keyEvents;
	buffer.keyEvents = [];
	return events;
}

/**
 * Drains all mouse events from the buffer.
 * Returns events in order (oldest first) and clears the buffer.
 *
 * @param buffer - The input event buffer
 * @returns Array of timestamped mouse events
 *
 * @example
 * ```typescript
 * const mouse = drainMouse(buffer);
 * for (const { event, timestamp } of mouse) {
 *   console.log(`Mouse: ${event.action} at ${event.x},${event.y}`);
 * }
 * ```
 */
export function drainMouse(buffer: InputEventBufferData): TimestampedMouseEvent[] {
	const events = buffer.mouseEvents;
	buffer.mouseEvents = [];
	return events;
}

/**
 * Drains all events (keys and mouse) from the buffer.
 * Returns events in chronological order by timestamp.
 *
 * @param buffer - The input event buffer
 * @returns Array of all timestamped events sorted by timestamp
 *
 * @example
 * ```typescript
 * const events = drainAllEvents(buffer);
 * for (const event of events) {
 *   if (event.type === 'key') {
 *     handleKey(event.event);
 *   } else {
 *     handleMouse(event.event);
 *   }
 * }
 * ```
 */
export function drainAllEvents(buffer: InputEventBufferData): TimestampedInputEvent[] {
	const keys = drainKeys(buffer);
	const mouse = drainMouse(buffer);
	const all: TimestampedInputEvent[] = [...keys, ...mouse];

	// Sort by timestamp (stable sort preserves order for equal timestamps)
	all.sort((a, b) => a.timestamp - b.timestamp);

	return all;
}

// =============================================================================
// PEEK FUNCTIONS
// =============================================================================

/**
 * Peeks at all pending events without removing them.
 *
 * @param buffer - The input event buffer
 * @returns Array of all pending events sorted by timestamp
 */
export function peekEvents(buffer: InputEventBufferData): TimestampedInputEvent[] {
	const all: TimestampedInputEvent[] = [...buffer.keyEvents, ...buffer.mouseEvents];
	all.sort((a, b) => a.timestamp - b.timestamp);
	return all;
}

/**
 * Peeks at pending key events without removing them.
 *
 * @param buffer - The input event buffer
 * @returns Array of pending key events
 */
export function peekKeys(buffer: InputEventBufferData): readonly TimestampedKeyEvent[] {
	return buffer.keyEvents;
}

/**
 * Peeks at pending mouse events without removing them.
 *
 * @param buffer - The input event buffer
 * @returns Array of pending mouse events
 */
export function peekMouse(buffer: InputEventBufferData): readonly TimestampedMouseEvent[] {
	return buffer.mouseEvents;
}

// =============================================================================
// BUFFER STATE
// =============================================================================

/**
 * Clears all pending events from the buffer.
 *
 * @param buffer - The input event buffer
 */
export function clearBuffer(buffer: InputEventBufferData): void {
	buffer.keyEvents = [];
	buffer.mouseEvents = [];
}

/**
 * Gets the number of pending key events.
 *
 * @param buffer - The input event buffer
 */
export function getPendingKeyCount(buffer: InputEventBufferData): number {
	return buffer.keyEvents.length;
}

/**
 * Gets the number of pending mouse events.
 *
 * @param buffer - The input event buffer
 */
export function getPendingMouseCount(buffer: InputEventBufferData): number {
	return buffer.mouseEvents.length;
}

/**
 * Gets the total number of pending events.
 *
 * @param buffer - The input event buffer
 */
export function getPendingCount(buffer: InputEventBufferData): number {
	return buffer.keyEvents.length + buffer.mouseEvents.length;
}

/**
 * Checks if there are any pending events.
 *
 * @param buffer - The input event buffer
 */
export function hasPendingEvents(buffer: InputEventBufferData): boolean {
	return buffer.keyEvents.length > 0 || buffer.mouseEvents.length > 0;
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Gets buffer statistics for debugging.
 *
 * @param buffer - The input event buffer
 * @returns Statistics about the buffer
 *
 * @example
 * ```typescript
 * const stats = getStats(buffer);
 * console.log(`Total events: ${stats.totalKeyEvents + stats.totalMouseEvents}`);
 * console.log(`Dropped: ${stats.droppedEvents}`);
 * ```
 */
export function getStats(buffer: InputEventBufferData): InputBufferStats {
	return {
		totalKeyEvents: buffer.totalKeyEvents,
		totalMouseEvents: buffer.totalMouseEvents,
		pendingKeyEvents: buffer.keyEvents.length,
		pendingMouseEvents: buffer.mouseEvents.length,
		droppedEvents: buffer.droppedEvents,
		maxBufferSize: buffer.config.maxBufferSize,
	};
}

/**
 * Resets buffer statistics.
 *
 * @param buffer - The input event buffer
 */
export function resetStats(buffer: InputEventBufferData): void {
	buffer.totalKeyEvents = 0;
	buffer.totalMouseEvents = 0;
	buffer.droppedEvents = 0;
}

// =============================================================================
// LATENCY TRACKING
// =============================================================================

/**
 * Marks the start of frame processing.
 * Call this at the beginning of your input processing phase.
 *
 * @param buffer - The input event buffer
 *
 * @example
 * ```typescript
 * beginFrame(buffer);
 * const keys = drainKeys(buffer);
 * // process keys...
 * endFrame(buffer);
 * ```
 */
export function beginFrame(buffer: InputEventBufferData): void {
	buffer.frameStartTime = getTimestamp();
}

/**
 * Marks the end of frame processing and records the processing time.
 * Call this after all input events have been processed.
 *
 * @param buffer - The input event buffer
 * @returns The frame processing time in milliseconds
 */
export function endFrame(buffer: InputEventBufferData): number {
	const endTime = getTimestamp();
	const processingTime = endTime - buffer.frameStartTime;

	buffer.frameProcessingTimes.push(processingTime);
	if (buffer.frameProcessingTimes.length > buffer.config.maxFrameSamples) {
		buffer.frameProcessingTimes.shift();
	}

	return processingTime;
}

/**
 * Records latency for a processed event.
 * Call this when an event has been fully processed to track input latency.
 *
 * @param buffer - The input event buffer
 * @param latencyMs - The latency in milliseconds
 *
 * @example
 * ```typescript
 * for (const { event, timestamp } of drainKeys(buffer)) {
 *   handleKey(event);
 *   const latency = performance.now() - timestamp;
 *   recordLatency(buffer, latency);
 * }
 * ```
 */
export function recordLatency(buffer: InputEventBufferData, latencyMs: number): void {
	buffer.latencySamples.push(latencyMs);
	if (buffer.latencySamples.length > buffer.config.maxLatencySamples) {
		buffer.latencySamples.shift();
	}
}

/**
 * Records latency for multiple events at once.
 * More efficient than calling recordLatency for each event.
 *
 * @param buffer - The input event buffer
 * @param avgLatencyMs - Average latency for all events
 * @param eventCount - Number of events processed
 */
export function recordLatencyBatch(
	buffer: InputEventBufferData,
	avgLatencyMs: number,
	eventCount: number,
): void {
	// Record a representative sample for the batch
	for (let i = 0; i < Math.min(eventCount, 10); i++) {
		buffer.latencySamples.push(avgLatencyMs);
	}

	// Trim to max samples
	while (buffer.latencySamples.length > buffer.config.maxLatencySamples) {
		buffer.latencySamples.shift();
	}
}

/**
 * Gets latency statistics for input processing.
 * Returns min, max, average, and percentile latencies.
 *
 * @param buffer - The input event buffer
 * @returns Latency statistics in milliseconds
 *
 * @example
 * ```typescript
 * const stats = getLatencyStats(buffer);
 * console.log(`Avg latency: ${stats.avg.toFixed(2)}ms`);
 * console.log(`P95 latency: ${stats.p95.toFixed(2)}ms`);
 * if (stats.max > 16) {
 *   console.warn('Input latency exceeds frame budget!');
 * }
 * ```
 */
export function getLatencyStats(buffer: InputEventBufferData): InputLatencyStats {
	const samples = buffer.latencySamples;
	const frameTimes = buffer.frameProcessingTimes;

	if (samples.length === 0) {
		return {
			min: 0,
			max: 0,
			avg: 0,
			p95: 0,
			p99: 0,
			sampleCount: 0,
			lastFrameProcessingTime: frameTimes[frameTimes.length - 1] ?? 0,
			avgFrameProcessingTime: calculateAverage(frameTimes),
		};
	}

	// Sort samples for percentile calculation
	const sorted = [...samples].sort((a, b) => a - b);

	return {
		min: sorted[0] ?? 0,
		max: sorted[sorted.length - 1] ?? 0,
		avg: calculateAverage(sorted),
		p95: calculatePercentile(sorted, 0.95),
		p99: calculatePercentile(sorted, 0.99),
		sampleCount: sorted.length,
		lastFrameProcessingTime: frameTimes[frameTimes.length - 1] ?? 0,
		avgFrameProcessingTime: calculateAverage(frameTimes),
	};
}

/**
 * Resets latency statistics.
 *
 * @param buffer - The input event buffer
 */
export function resetLatencyStats(buffer: InputEventBufferData): void {
	buffer.latencySamples = [];
	buffer.frameProcessingTimes = [];
}

/**
 * Checks if the current latency is within acceptable bounds.
 * By default, checks if p95 latency is under 16ms (one frame at 60fps).
 *
 * @param buffer - The input event buffer
 * @param maxLatencyMs - Maximum acceptable p95 latency in milliseconds
 * @returns True if latency is acceptable
 */
export function isLatencyAcceptable(buffer: InputEventBufferData, maxLatencyMs = 16): boolean {
	const stats = getLatencyStats(buffer);
	return stats.p95 <= maxLatencyMs;
}

/**
 * Checks if frame processing time is within budget.
 * By default, checks if average processing time is under 1ms.
 *
 * @param buffer - The input event buffer
 * @param maxProcessingTimeMs - Maximum acceptable processing time in milliseconds
 * @returns True if processing time is acceptable
 */
export function isProcessingTimeAcceptable(
	buffer: InputEventBufferData,
	maxProcessingTimeMs = 1,
): boolean {
	const stats = getLatencyStats(buffer);
	return stats.avgFrameProcessingTime <= maxProcessingTimeMs;
}

// =============================================================================
// GLOBAL BUFFER (for simple use cases)
// =============================================================================

/**
 * Global shared input buffer for simple use cases.
 *
 * For more complex scenarios (multiple input sources, custom overflow handling),
 * create your own buffer with createInputEventBuffer().
 *
 * @example
 * ```typescript
 * import { globalInputBuffer, pushKeyEvent, drainAllEvents } from 'blecsd';
 *
 * // Push from stdin handler
 * pushKeyEvent(globalInputBuffer, event);
 *
 * // Drain in game loop
 * const events = drainAllEvents(globalInputBuffer);
 * ```
 */
export const globalInputBuffer: InputEventBufferData = createInputEventBuffer();
