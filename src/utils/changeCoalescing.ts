/**
 * Text buffer change coalescing.
 *
 * Batches multiple text changes within a single frame into a
 * single re-layout/re-render, eliminating per-keystroke rendering
 * during fast typing or streaming input. Maintains immediate
 * visual cursor feedback while deferring expensive operations.
 *
 * @module utils/changeCoalescing
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single text change operation.
 */
export interface TextChange {
	/** Line index where the change starts (0-based) */
	readonly startLine: number;
	/** Column index where the change starts (0-based) */
	readonly startColumn: number;
	/** Line index where the change ends (0-based, for deletions) */
	readonly endLine: number;
	/** Column index where the change ends (0-based, for deletions) */
	readonly endColumn: number;
	/** Text to insert (empty string for deletions) */
	readonly text: string;
	/** Timestamp when the change was queued */
	readonly timestamp: number;
}

/**
 * A coalesced dirty region representing the union of changes.
 */
export interface DirtyRegion {
	/** First affected line (0-based) */
	readonly startLine: number;
	/** Last affected line (inclusive, 0-based) */
	readonly endLine: number;
	/** Whether the change affects line count (insertions/deletions) */
	readonly lineCountChanged: boolean;
	/** Net change in line count */
	readonly lineDelta: number;
}

/**
 * Configuration for change coalescing.
 */
export interface CoalescingConfig {
	/** Maximum time in ms to coalesce changes before flushing (default: 16) */
	readonly maxDelayMs: number;
	/** Maximum number of changes to coalesce before forcing flush (default: 100) */
	readonly maxBatchSize: number;
	/** Whether to immediately update cursor position (default: true) */
	readonly immediateCursor: boolean;
}

/**
 * Result of flushing coalesced changes.
 */
export interface FlushResult {
	/** The dirty region encompassing all changes */
	readonly dirtyRegion: DirtyRegion;
	/** Number of individual changes that were coalesced */
	readonly changeCount: number;
	/** Time span of the coalesced changes in ms */
	readonly timeSpanMs: number;
	/** The individual changes (in order) */
	readonly changes: readonly TextChange[];
}

/**
 * State snapshot of the change coalescer.
 */
export interface CoalescingState {
	/** Current configuration */
	readonly config: CoalescingConfig;
	/** Number of pending changes */
	readonly pendingCount: number;
	/** Whether a flush is scheduled */
	readonly flushScheduled: boolean;
	/** Total changes processed since creation */
	readonly totalProcessed: number;
	/** Total flushes performed */
	readonly totalFlushes: number;
	/** Average changes per flush */
	readonly avgChangesPerFlush: number;
}

/**
 * Mutable internal state.
 */
interface MutableCoalescingState {
	config: CoalescingConfig;
	pending: TextChange[];
	flushCallback: ((result: FlushResult) => void) | null;
	flushTimer: ReturnType<typeof setTimeout> | null;
	totalProcessed: number;
	totalFlushes: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_COALESCING_CONFIG: CoalescingConfig = {
	maxDelayMs: 16, // ~1 frame at 60fps
	maxBatchSize: 100,
	immediateCursor: true,
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Creates a change coalescer.
 *
 * @param onFlush - Callback invoked when changes are flushed
 * @param config - Optional configuration
 * @returns The coalescer state (opaque handle)
 *
 * @example
 * ```typescript
 * import { createCoalescer, queueChange } from 'blecsd';
 *
 * const coalescer = createCoalescer((result) => {
 *   console.log(`Flushing ${result.changeCount} changes`);
 *   rerender(result.dirtyRegion);
 * });
 *
 * // Fast typing - multiple changes coalesced into one flush
 * queueChange(coalescer, { startLine: 0, startColumn: 5, endLine: 0, endColumn: 5, text: 'a', timestamp: Date.now() });
 * queueChange(coalescer, { startLine: 0, startColumn: 6, endLine: 0, endColumn: 6, text: 'b', timestamp: Date.now() });
 * ```
 */
export function createCoalescer(
	onFlush: (result: FlushResult) => void,
	config?: Partial<CoalescingConfig>,
): MutableCoalescingState {
	return {
		config: { ...DEFAULT_COALESCING_CONFIG, ...config },
		pending: [],
		flushCallback: onFlush,
		flushTimer: null,
		totalProcessed: 0,
		totalFlushes: 0,
	};
}

/**
 * Queues a text change for coalescing.
 * If the batch size limit is reached, flushes immediately.
 * Otherwise, schedules a flush after maxDelayMs.
 *
 * @param state - The coalescer state
 * @param change - The text change to queue
 *
 * @example
 * ```typescript
 * import { createCoalescer, queueChange } from 'blecsd';
 *
 * const coalescer = createCoalescer(handleFlush);
 * queueChange(coalescer, {
 *   startLine: 5, startColumn: 10,
 *   endLine: 5, endColumn: 10,
 *   text: 'hello',
 *   timestamp: Date.now(),
 * });
 * ```
 */
export function queueChange(state: MutableCoalescingState, change: TextChange): void {
	state.pending.push(change);

	// Force flush if batch is full
	if (state.pending.length >= state.config.maxBatchSize) {
		flushChanges(state);
		return;
	}

	// Schedule flush if not already scheduled
	if (!state.flushTimer) {
		state.flushTimer = setTimeout(() => {
			flushChanges(state);
		}, state.config.maxDelayMs);
	}
}

/**
 * Forces an immediate flush of all pending changes.
 *
 * @param state - The coalescer state
 * @returns The flush result, or undefined if no changes were pending
 */
export function flushChanges(state: MutableCoalescingState): FlushResult | undefined {
	if (state.flushTimer) {
		clearTimeout(state.flushTimer);
		state.flushTimer = null;
	}

	if (state.pending.length === 0) return undefined;

	const changes = [...state.pending];
	state.pending = [];

	const dirtyRegion = computeDirtyRegion(changes);
	const timeSpanMs =
		changes.length > 1 ? changes[changes.length - 1]!.timestamp - changes[0]!.timestamp : 0;

	const result: FlushResult = {
		dirtyRegion,
		changeCount: changes.length,
		timeSpanMs,
		changes,
	};

	state.totalProcessed += changes.length;
	state.totalFlushes++;

	if (state.flushCallback) {
		state.flushCallback(result);
	}

	return result;
}

/**
 * Gets the current state of the coalescer.
 *
 * @param state - The coalescer state
 * @returns State snapshot
 */
export function getCoalescingState(state: MutableCoalescingState): CoalescingState {
	return {
		config: state.config,
		pendingCount: state.pending.length,
		flushScheduled: state.flushTimer !== null,
		totalProcessed: state.totalProcessed,
		totalFlushes: state.totalFlushes,
		avgChangesPerFlush: state.totalFlushes > 0 ? state.totalProcessed / state.totalFlushes : 0,
	};
}

/**
 * Creates a text change for an insertion.
 *
 * @param line - Line index
 * @param column - Column index
 * @param text - Text to insert
 * @returns A TextChange object
 */
export function insertChange(line: number, column: number, text: string): TextChange {
	return {
		startLine: line,
		startColumn: column,
		endLine: line,
		endColumn: column,
		text,
		timestamp: Date.now(),
	};
}

/**
 * Creates a text change for a deletion.
 *
 * @param startLine - Start line
 * @param startColumn - Start column
 * @param endLine - End line
 * @param endColumn - End column
 * @returns A TextChange object
 */
export function deleteChange(
	startLine: number,
	startColumn: number,
	endLine: number,
	endColumn: number,
): TextChange {
	return {
		startLine,
		startColumn,
		endLine,
		endColumn,
		text: '',
		timestamp: Date.now(),
	};
}

/**
 * Creates a text change for a replacement.
 *
 * @param startLine - Start line
 * @param startColumn - Start column
 * @param endLine - End line
 * @param endColumn - End column
 * @param text - Replacement text
 * @returns A TextChange object
 */
export function replaceChange(
	startLine: number,
	startColumn: number,
	endLine: number,
	endColumn: number,
	text: string,
): TextChange {
	return {
		startLine,
		startColumn,
		endLine,
		endColumn,
		text,
		timestamp: Date.now(),
	};
}

/**
 * Destroys the coalescer, flushing any remaining changes.
 *
 * @param state - The coalescer state
 * @returns Final flush result if there were pending changes
 */
export function destroyCoalescer(state: MutableCoalescingState): FlushResult | undefined {
	const result = flushChanges(state);
	state.flushCallback = null;
	return result;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function computeDirtyRegion(changes: readonly TextChange[]): DirtyRegion {
	if (changes.length === 0) {
		return { startLine: 0, endLine: 0, lineCountChanged: false, lineDelta: 0 };
	}

	let startLine = Number.POSITIVE_INFINITY;
	let endLine = 0;
	let lineDelta = 0;

	for (const change of changes) {
		startLine = Math.min(startLine, change.startLine);
		endLine = Math.max(endLine, change.endLine);

		// Count new lines in inserted text
		let insertedLines = 0;
		for (let i = 0; i < change.text.length; i++) {
			if (change.text[i] === '\n') insertedLines++;
		}

		// Count deleted lines
		const deletedLines = change.endLine - change.startLine;
		lineDelta += insertedLines - deletedLines;

		// Expand end line to account for inserted text
		endLine = Math.max(endLine, change.startLine + insertedLines);
	}

	return {
		startLine: startLine === Number.POSITIVE_INFINITY ? 0 : startLine,
		endLine,
		lineCountChanged: lineDelta !== 0,
		lineDelta,
	};
}
