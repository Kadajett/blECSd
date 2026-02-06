/**
 * Startup Time Optimization: Lazy Initialization
 *
 * Provides lazy loading and deferred initialization patterns to minimize
 * cold start time. Subsystems are initialized on first use rather than
 * at import time, enabling <100ms time-to-first-render.
 *
 * @module core/lazyInit
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Initialization priority levels.
 * Systems are initialized in order of priority when eager initialization is triggered.
 */
export const InitPriority = {
	/** Critical path: input handling, must be ready immediately */
	CRITICAL: 0,
	/** High priority: rendering, layout */
	HIGH: 1,
	/** Normal priority: widgets, interactions */
	NORMAL: 2,
	/** Low priority: debugging, profiling, optional features */
	LOW: 3,
} as const;

export type InitPriorityLevel = (typeof InitPriority)[keyof typeof InitPriority];

/**
 * Lazy initializer function type.
 */
export type LazyInitFn<T> = () => T;

/**
 * Lazy value container.
 */
export interface LazyValue<T> {
	/** Get the value, initializing if needed */
	get(): T;
	/** Check if already initialized */
	isInitialized(): boolean;
	/** Reset to uninitialized state */
	reset(): void;
}

/**
 * Subsystem registration entry.
 */
export interface SubsystemEntry {
	/** Subsystem name */
	readonly name: string;
	/** Initialization priority */
	readonly priority: InitPriorityLevel;
	/** Initialize the subsystem */
	init(): void;
	/** Whether already initialized */
	readonly initialized: boolean;
	/** Time taken to initialize (ms), or null if not yet initialized */
	readonly initTimeMs: number | null;
}

/**
 * Startup timing report.
 */
export interface StartupReport {
	/** Total startup time in ms */
	readonly totalMs: number;
	/** Per-subsystem timing */
	readonly subsystems: readonly {
		readonly name: string;
		readonly priority: InitPriorityLevel;
		readonly initTimeMs: number;
		readonly lazy: boolean;
	}[];
	/** Time to first init in ms */
	readonly timeToFirstInit: number;
}

// =============================================================================
// LAZY VALUE
// =============================================================================

/**
 * Creates a lazily initialized value that is computed on first access.
 *
 * @param factory - Factory function to create the value
 * @returns Lazy value container
 *
 * @example
 * ```typescript
 * import { lazy } from 'blecsd';
 *
 * const expensiveConfig = lazy(() => {
 *   // This code only runs on first .get() call
 *   return parseTerminfo();
 * });
 *
 * // Later, when actually needed:
 * const config = expensiveConfig.get();
 * ```
 */
export function lazy<T>(factory: LazyInitFn<T>): LazyValue<T> {
	let value: T | undefined;
	let initialized = false;

	return {
		get(): T {
			if (!initialized) {
				value = factory();
				initialized = true;
			}
			return value as T;
		},

		isInitialized(): boolean {
			return initialized;
		},

		reset(): void {
			value = undefined;
			initialized = false;
		},
	};
}

// =============================================================================
// SUBSYSTEM REGISTRY
// =============================================================================

interface InternalSubsystemEntry {
	readonly name: string;
	readonly priority: InitPriorityLevel;
	readonly initFn: () => void;
	initialized: boolean;
	initTimeMs: number | null;
}

/** Registered subsystems */
const subsystems: InternalSubsystemEntry[] = [];

/** Startup timing */
let startupStartTime: number | null = null;
let firstInitTime: number | null = null;

/**
 * Registers a subsystem for managed initialization.
 *
 * @param name - Subsystem name
 * @param priority - Initialization priority
 * @param initFn - Initialization function
 *
 * @example
 * ```typescript
 * import { registerSubsystem, InitPriority } from 'blecsd';
 *
 * registerSubsystem('input', InitPriority.CRITICAL, () => {
 *   setupInputHandling();
 * });
 *
 * registerSubsystem('debug-overlay', InitPriority.LOW, () => {
 *   setupDebugOverlay();
 * });
 * ```
 */
export function registerSubsystem(
	name: string,
	priority: InitPriorityLevel,
	initFn: () => void,
): void {
	// Avoid duplicate registration
	const existing = subsystems.find((s) => s.name === name);
	if (existing) return;

	subsystems.push({
		name,
		priority,
		initFn,
		initialized: false,
		initTimeMs: null,
	});
}

/**
 * Initializes a specific subsystem by name.
 *
 * @param name - Subsystem name
 * @returns Time taken in ms, or null if not found or already initialized
 *
 * @example
 * ```typescript
 * const ms = initSubsystem('input');
 * console.log(`Input init: ${ms}ms`);
 * ```
 */
export function initSubsystem(name: string): number | null {
	const entry = subsystems.find((s) => s.name === name);
	if (!entry || entry.initialized) return null;

	if (startupStartTime === null) {
		startupStartTime = performance.now();
	}

	const start = performance.now();
	entry.initFn();
	const elapsed = performance.now() - start;

	entry.initialized = true;
	entry.initTimeMs = elapsed;

	if (firstInitTime === null) {
		firstInitTime = performance.now() - startupStartTime;
	}

	return elapsed;
}

/**
 * Initializes all subsystems up to and including the given priority level.
 * Subsystems are initialized in priority order (CRITICAL first).
 *
 * @param maxPriority - Maximum priority level to initialize (default: all)
 * @returns Total time taken in ms
 *
 * @example
 * ```typescript
 * import { initSubsystemsUpTo, InitPriority } from 'blecsd';
 *
 * // Initialize only critical systems for fast startup
 * initSubsystemsUpTo(InitPriority.CRITICAL);
 *
 * // Later, initialize everything else
 * initSubsystemsUpTo(InitPriority.LOW);
 * ```
 */
export function initSubsystemsUpTo(maxPriority: InitPriorityLevel = InitPriority.LOW): number {
	if (startupStartTime === null) {
		startupStartTime = performance.now();
	}

	let totalMs = 0;

	// Sort by priority, then init
	const sorted = [...subsystems]
		.filter((s) => !s.initialized && s.priority <= maxPriority)
		.sort((a, b) => a.priority - b.priority);

	for (const entry of sorted) {
		const ms = initSubsystem(entry.name);
		if (ms !== null) {
			totalMs += ms;
		}
	}

	return totalMs;
}

/**
 * Gets a startup timing report.
 *
 * @returns Startup report with per-subsystem timing
 *
 * @example
 * ```typescript
 * const report = getStartupReport();
 * console.log(`Total: ${report.totalMs.toFixed(1)}ms`);
 * for (const sub of report.subsystems) {
 *   console.log(`  ${sub.name}: ${sub.initTimeMs.toFixed(1)}ms ${sub.lazy ? '(lazy)' : ''}`);
 * }
 * ```
 */
export function getStartupReport(): StartupReport {
	const initialized = subsystems.filter((s) => s.initialized);
	const totalMs = initialized.reduce((sum, s) => sum + (s.initTimeMs ?? 0), 0);

	return {
		totalMs,
		subsystems: subsystems.map((s) => ({
			name: s.name,
			priority: s.priority,
			initTimeMs: s.initTimeMs ?? 0,
			lazy: !s.initialized,
		})),
		timeToFirstInit: firstInitTime ?? 0,
	};
}

/**
 * Formats a startup report as a human-readable string.
 *
 * @param report - The startup report
 * @returns Formatted string
 */
export function formatStartupReport(report: StartupReport): string {
	const lines: string[] = [];
	const priorityNames = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

	lines.push('Startup Report');
	lines.push('═'.repeat(40));
	lines.push(`Total init time: ${report.totalMs.toFixed(1)}ms`);
	lines.push(`Time to first init: ${report.timeToFirstInit.toFixed(1)}ms`);
	lines.push('');

	for (const sub of report.subsystems) {
		const status = sub.lazy ? '(lazy)' : `${sub.initTimeMs.toFixed(1)}ms`;
		const pName = priorityNames[sub.priority] ?? 'UNKNOWN';
		lines.push(`  [${pName}] ${sub.name}: ${status}`);
	}

	return lines.join('\n');
}

/**
 * Resets all subsystem registrations. Used for testing.
 * @internal
 */
export function resetSubsystems(): void {
	subsystems.length = 0;
	startupStartTime = null;
	firstInitTime = null;
}

// =============================================================================
// TERMINAL CAPABILITY CACHE
// =============================================================================

/**
 * Cached terminal capabilities.
 */
export interface TerminalCapabilities {
	/** Terminal type (TERM env var) */
	readonly term: string;
	/** Whether true color is supported */
	readonly trueColor: boolean;
	/** Whether 256 color is supported */
	readonly color256: boolean;
	/** Whether unicode is supported */
	readonly unicode: boolean;
	/** Terminal width */
	readonly width: number;
	/** Terminal height */
	readonly height: number;
	/** Timestamp of cache */
	readonly cachedAt: number;
}

/**
 * Detects terminal capabilities, using cache if available and recent.
 *
 * @param maxAge - Maximum cache age in ms (default: 60000 = 1 minute)
 * @returns Terminal capabilities
 *
 * @example
 * ```typescript
 * const caps = detectCapabilities();
 * if (caps.trueColor) {
 *   enableTrueColorMode();
 * }
 * ```
 */
export function detectCapabilities(maxAge = 60000): TerminalCapabilities {
	// Try to use cached value
	const cached = capabilityCache.get();
	if (cached && Date.now() - cached.cachedAt < maxAge) {
		return cached;
	}

	// Detect fresh
	const env = process.env;
	const term = env.TERM ?? '';
	const colorterm = env.COLORTERM ?? '';

	const trueColor =
		colorterm === 'truecolor' ||
		colorterm === '24bit' ||
		term.includes('24bit') ||
		term.includes('truecolor');

	const color256 = trueColor || term.includes('256color') || colorterm === '256color';

	const unicode = (env.LANG ?? '').includes('UTF-8') || (env.LC_ALL ?? '').includes('UTF-8');

	const caps: TerminalCapabilities = {
		term,
		trueColor,
		color256,
		unicode,
		width: process.stdout.columns ?? 80,
		height: process.stdout.rows ?? 24,
		cachedAt: Date.now(),
	};

	capabilityCache.set(caps);
	return caps;
}

/** Simple capability cache */
const capabilityCache = {
	_value: null as TerminalCapabilities | null,
	get(): TerminalCapabilities | null {
		return this._value;
	},
	set(value: TerminalCapabilities): void {
		this._value = value;
	},
	clear(): void {
		this._value = null;
	},
};

/**
 * Clears the terminal capability cache.
 */
export function clearCapabilityCache(): void {
	capabilityCache.clear();
}
