import { describe, expect, it } from 'vitest';
import {
	BufferEncodingSchema,
	EditorOptionsSchema,
	ExecOptionsSchema,
	SpawnOptionsSchema,
} from './terminal';

describe('Terminal Schemas', () => {
	describe('BufferEncodingSchema', () => {
		it('should accept valid encodings', () => {
			expect(() => BufferEncodingSchema.parse('utf8')).not.toThrow();
			expect(() => BufferEncodingSchema.parse('utf-8')).not.toThrow();
			expect(() => BufferEncodingSchema.parse('ascii')).not.toThrow();
			expect(() => BufferEncodingSchema.parse('hex')).not.toThrow();
			expect(() => BufferEncodingSchema.parse('base64')).not.toThrow();
			expect(() => BufferEncodingSchema.parse('latin1')).not.toThrow();
		});

		it('should reject invalid encodings', () => {
			expect(() => BufferEncodingSchema.parse('invalid')).toThrow();
			expect(() => BufferEncodingSchema.parse('utf32')).toThrow();
		});
	});

	describe('SpawnOptionsSchema', () => {
		it('should accept valid options', () => {
			expect(() =>
				SpawnOptionsSchema.parse({
					isAlternateBuffer: true,
					isMouseEnabled: false,
				}),
			).not.toThrow();
		});

		it('should accept empty options', () => {
			expect(() => SpawnOptionsSchema.parse({})).not.toThrow();
		});

		it('should reject non-boolean flags', () => {
			expect(() => SpawnOptionsSchema.parse({ isAlternateBuffer: 'yes' })).toThrow();
		});
	});

	describe('ExecOptionsSchema', () => {
		it('should accept valid options', () => {
			expect(() =>
				ExecOptionsSchema.parse({
					timeout: 5000,
					maxBuffer: 1048576,
					encoding: 'utf8',
					isAlternateBuffer: false,
					isMouseEnabled: false,
				}),
			).not.toThrow();
		});

		it('should accept empty options', () => {
			expect(() => ExecOptionsSchema.parse({})).not.toThrow();
		});

		it('should reject negative timeout', () => {
			expect(() => ExecOptionsSchema.parse({ timeout: -1 })).toThrow();
		});

		it('should reject timeout over 5 minutes', () => {
			expect(() => ExecOptionsSchema.parse({ timeout: 400000 })).toThrow();
		});

		it('should reject non-positive maxBuffer', () => {
			expect(() => ExecOptionsSchema.parse({ maxBuffer: 0 })).toThrow();
			expect(() => ExecOptionsSchema.parse({ maxBuffer: -100 })).toThrow();
		});

		it('should reject maxBuffer over 100MB', () => {
			expect(() => ExecOptionsSchema.parse({ maxBuffer: 200000000 })).toThrow();
		});

		it('should reject invalid encoding', () => {
			expect(() => ExecOptionsSchema.parse({ encoding: 'utf32' })).toThrow();
		});
	});

	describe('EditorOptionsSchema', () => {
		it('should accept valid options', () => {
			expect(() =>
				EditorOptionsSchema.parse({
					content: '# Hello World',
					extension: '.md',
					editor: 'vim',
				}),
			).not.toThrow();
		});

		it('should accept empty options', () => {
			expect(() => EditorOptionsSchema.parse({})).not.toThrow();
		});

		it('should accept various extensions', () => {
			expect(() => EditorOptionsSchema.parse({ extension: '.txt' })).not.toThrow();
			expect(() => EditorOptionsSchema.parse({ extension: '.ts' })).not.toThrow();
			expect(() => EditorOptionsSchema.parse({ extension: '.json' })).not.toThrow();
		});

		it('should reject extension without dot', () => {
			expect(() => EditorOptionsSchema.parse({ extension: 'txt' })).toThrow();
		});

		it('should reject empty editor', () => {
			expect(() => EditorOptionsSchema.parse({ editor: '' })).toThrow();
		});

		it('should accept empty content', () => {
			expect(() => EditorOptionsSchema.parse({ content: '' })).not.toThrow();
		});
	});
});
