/**
 * Helper functions for Token Tracker widget rendering.
 * @module widgets/tokenTracker/helpers
 */

/**
 * Renders simple sparkline using ASCII characters.
 * @internal
 */
export function renderSimpleSparkline(history: readonly number[], width: number): string {
	if (history.length === 0) {
		return ' '.repeat(width);
	}

	const max = Math.max(...history);
	if (max === 0) {
		return '_'.repeat(width);
	}

	const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
	const output: string[] = [];

	for (let i = 0; i < width; i++) {
		const dataIdx = Math.floor((i / width) * history.length);
		const value = history[dataIdx] ?? 0;
		const normalized = value / max;
		const blockIdx = Math.min(blocks.length - 1, Math.floor(normalized * blocks.length));
		output.push(blocks[blockIdx] ?? ' ');
	}

	return output.join('');
}
