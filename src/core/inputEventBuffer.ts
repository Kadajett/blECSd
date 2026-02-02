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
