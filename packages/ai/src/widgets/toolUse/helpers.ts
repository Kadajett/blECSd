/**
 * Helper functions for Tool Use widget rendering.
 * @module widgets/toolUse/helpers
 */

import { parseColor } from 'blecsd/utils';
import { getToolCallDuration } from './state';
import type { ToolCallEntry, ToolCallStatus, ToolUseConfig } from './types';

/** Gets status indicator character */
export function getStatusIndicator(status: ToolCallStatus): string {
	switch (status) {
		case 'pending':
			return '○';
		case 'running':
			return '◉';
		case 'complete':
			return '●';
		case 'error':
			return '×';
	}
}

/** Formats duration for display */
export function formatDuration(durationMs: number | null): string {
	if (durationMs === null) return '';
	if (durationMs < 1000) return `${durationMs}ms`;
	return `${(durationMs / 1000).toFixed(1)}s`;
}

/** Truncates text to fit width */
export function truncate(text: string, width: number): string {
	if (text.length <= width) return text;
	return `${text.slice(0, width - 1)}…`;
}

/** Formats a single parameter line */
export function formatParameter(key: string, value: unknown, width: number): string {
	const valueStr = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
	const line = `${key}: ${valueStr}`;
	return truncate(line, width - 4);
}

/** Renders a tool call card */
export function renderToolCallCard(
	call: ToolCallEntry,
	width: number,
	showParameters: boolean,
	showDuration: boolean,
): string[] {
	const lines: string[] = [];
	const contentWidth = width - 4;

	// Status indicator and tool name
	const indicator = getStatusIndicator(call.status);
	const duration = getToolCallDuration(call);
	const durationText = showDuration && duration !== null ? formatDuration(duration) : '';

	const headerLeft = `${indicator} ${call.toolName} [${call.status}]`;
	const headerRight = durationText;
	const padding = Math.max(0, contentWidth - headerLeft.length - headerRight.length);
	const header = `${headerLeft}${' '.repeat(padding)}${headerRight}`;

	lines.push(`┌─ ${truncate(header, contentWidth)} ─┐`);

	// Parameters
	if (showParameters && Object.keys(call.parameters).length > 0) {
		for (const [key, value] of Object.entries(call.parameters)) {
			const paramLine = formatParameter(key, value, width);
			lines.push(`│ ${paramLine.padEnd(contentWidth, ' ')} │`);
		}
		lines.push(`│ ${'─'.repeat(contentWidth)} │`);
	}

	// Result or error
	if (call.status === 'error' && call.error) {
		const errorText = truncate(`Error: ${call.error}`, contentWidth);
		lines.push(`│ ${errorText.padEnd(contentWidth, ' ')} │`);
	} else if (call.status === 'complete') {
		const resultText = call.expanded
			? truncate(JSON.stringify(call.result, null, 2), contentWidth)
			: '(collapsed, click to expand)';
		lines.push(`│ ${resultText.padEnd(contentWidth, ' ')} │`);
	}

	lines.push(`└─${'─'.repeat(contentWidth)}─┘`);

	return lines;
}

/** Parses status colors from config */
export function parseStatusColors(
	config:
		| {
				readonly pending: string | number | undefined;
				readonly running: string | number | undefined;
				readonly complete: string | number | undefined;
				readonly error: string | number | undefined;
		  }
		| undefined,
): Record<ToolCallStatus, number> {
	const defaultColors: Record<ToolCallStatus, number> = {
		pending: parseColor('#ffeb3b'), // Yellow
		running: parseColor('#2196f3'), // Blue
		complete: parseColor('#4caf50'), // Green
		error: parseColor('#f44336'), // Red
	};

	if (!config) return defaultColors;

	return {
		pending: config.pending !== undefined ? parseColor(config.pending) : defaultColors.pending,
		running: config.running !== undefined ? parseColor(config.running) : defaultColors.running,
		complete: config.complete !== undefined ? parseColor(config.complete) : defaultColors.complete,
		error: config.error !== undefined ? parseColor(config.error) : defaultColors.error,
	};
}

/**
 * Formats tool call state for display.
 *
 * @param state - Current state
 * @param config - Display configuration
 * @returns Array of display lines
 *
 * @example
 * ```typescript
 * const lines = formatToolCallDisplay(state, { width: 40, showParameters: true });
 * ```
 */
export function formatToolCallDisplay(
	state: { readonly calls: readonly ToolCallEntry[] },
	config: Pick<ToolUseConfig, 'width' | 'showParameters' | 'showDuration'>,
): string[] {
	const width = config.width ?? 40;
	const showParameters = config.showParameters ?? true;
	const showDuration = config.showDuration ?? true;

	const lines: string[] = [];

	for (const call of state.calls) {
		const cardLines = renderToolCallCard(call, width, showParameters, showDuration);
		lines.push(...cardLines);
		lines.push(''); // Blank line between cards
	}

	// Remove trailing blank line
	if (lines.length > 0 && lines[lines.length - 1] === '') {
		lines.pop();
	}

	return lines;
}
