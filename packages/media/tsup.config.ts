import { defineConfig } from 'tsup';

export default defineConfig({
	entry: [
		'src/index.ts',
		'src/gif/index.ts',
		'src/overlay/index.ts',
		'src/png/index.ts',
		'src/render/index.ts',
		'src/widgets/image/index.ts',
		'src/widgets/video/index.ts',
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
