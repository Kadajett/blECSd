import { defineConfig } from 'tsup';

export default defineConfig({
	entry: [
		'src/index.ts',
		'src/backends/index.ts',
		'src/components/index.ts',
		'src/loaders/index.ts',
		'src/math/index.ts',
		'src/rasterizer/index.ts',
		'src/schemas/index.ts',
		'src/stores/index.ts',
		'src/systems/index.ts',
		'src/widgets/viewport3d.ts',
	],
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	minify: false,
	target: 'node22',
	outDir: 'dist',
	treeshake: true,
	external: [/^blecsd/],
});
