import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		globals: true,
		environment: 'node',
		testTimeout: 10000,
		hookTimeout: 10000,
		watch: false,
		reporters: ['default'],
	},
});
