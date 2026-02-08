import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Test file patterns
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

		// Enable globals (describe, it, expect)
		globals: true,

		// Environment
		environment: 'node',

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/index.ts'],
			thresholds: {
				lines: 79,
				functions: 78,
				branches: 71,
				statements: 79,
			},
		},

		// Timeouts
		testTimeout: 10000,
		hookTimeout: 10000,

		// Watch mode options
		watch: false,

		// Reporter
		reporters: ['default'],

		// Benchmark configuration
		benchmark: {
			include: ['src/**/*.bench.ts'],
			reporters: ['default'],
			outputFile: './benchmark-results.json',
		},
	},
});
