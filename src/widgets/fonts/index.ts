import { createRequire } from 'node:module';
import { z } from 'zod';

/**
 * Schema for a single character's bitmap data.
 *
 * @example
 * ```typescript
 * import { CharBitmapSchema } from 'blecsd/widgets/fonts';
 *
 * const result = CharBitmapSchema.safeParse({
 *   width: 8,
 *   height: 14,
 *   bitmap: [
 *     [0, 1, 1, 0],
 *   ],
 * });
 * ```
 */
export const CharBitmapSchema = z
	.object({
		/** Character width in pixels */
		width: z.number().int().positive(),
		/** Character height in pixels */
		height: z.number().int().positive(),
		/** Bitmap data as array of rows (each row is array of 0/1) */
		bitmap: z.array(z.array(z.union([z.literal(0), z.literal(1)]))),
	})
	.superRefine((value, ctx) => {
		if (value.bitmap.length !== value.height) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Bitmap row count (${value.bitmap.length}) does not match height (${value.height}).`,
				path: ['bitmap'],
			});
		}

		value.bitmap.forEach((row, index) => {
			if (row.length !== value.width) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Bitmap row ${index} length (${row.length}) does not match width (${value.width}).`,
					path: ['bitmap', index],
				});
			}
		});
	});

/**
 * A single character's bitmap data.
 *
 * @example
 * ```typescript
 * import type { CharBitmap } from 'blecsd/widgets/fonts';
 *
 * const glyph: CharBitmap = {
 *   width: 8,
 *   height: 14,
 *   bitmap: [],
 * };
 * ```
 */
export type CharBitmap = z.infer<typeof CharBitmapSchema>;

/**
 * Schema for a complete bitmap font.
 *
 * @example
 * ```typescript
 * import { BitmapFontSchema } from 'blecsd/widgets/fonts';
 *
 * const font = BitmapFontSchema.parse({
 *   name: 'Terminus',
 *   size: 14,
 *   weight: 'bold',
 *   charWidth: 8,
 *   charHeight: 14,
 *   chars: {},
 * });
 * ```
 */
export const BitmapFontSchema = z
	.object({
		/** Font name */
		name: z.string(),
		/** Font size in points */
		size: z.number().int().positive(),
		/** Font weight */
		weight: z.enum(['normal', 'bold']),
		/** Character width (monospace) */
		charWidth: z.number().int().positive(),
		/** Character height */
		charHeight: z.number().int().positive(),
		/** Map of character code to bitmap data */
		chars: z.record(z.string().regex(/^\d+$/), CharBitmapSchema),
	})
	.superRefine((value, ctx) => {
		for (const [code, glyph] of Object.entries(value.chars)) {
			if (glyph.width !== value.charWidth) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Glyph ${code} width (${glyph.width}) does not match font width (${value.charWidth}).`,
					path: ['chars', code, 'width'],
				});
			}
			if (glyph.height !== value.charHeight) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Glyph ${code} height (${glyph.height}) does not match font height (${value.charHeight}).`,
					path: ['chars', code, 'height'],
				});
			}
		}
	});

/**
 * A complete bitmap font.
 *
 * @example
 * ```typescript
 * import type { BitmapFont } from 'blecsd/widgets/fonts';
 *
 * const font: BitmapFont = {
 *   name: 'Terminus',
 *   size: 14,
 *   weight: 'normal',
 *   charWidth: 8,
 *   charHeight: 14,
 *   chars: {},
 * };
 * ```
 */
export type BitmapFont = z.infer<typeof BitmapFontSchema>;

/**
 * Built-in bitmap font names.
 *
 * @example
 * ```typescript
 * import type { FontName } from 'blecsd/widgets/fonts';
 *
 * const name: FontName = 'terminus-14-bold';
 * ```
 */
export type FontName = 'terminus-14-bold' | 'terminus-14-normal';

/**
 * Error thrown when a font name is not recognized.
 *
 * @example
 * ```typescript
 * import type { FontNotFoundError } from 'blecsd/widgets/fonts';
 *
 * const error = new Error('missing') as FontNotFoundError;
 * error.name = 'FontNotFoundError';
 * ```
 */
export type FontNotFoundError = Error & { name: 'FontNotFoundError' };

/**
 * Rendering options for bitmap characters.
 *
 * @example
 * ```typescript
 * import type { RenderCharOptions } from 'blecsd/widgets/fonts';
 *
 * const options: RenderCharOptions = { fillChar: '#', emptyChar: '.' };
 * ```
 */
export type RenderCharOptions = {
	/** Character used to draw filled pixels */
	fillChar?: string;
	/** Character used to draw empty pixels */
	emptyChar?: string;
};

const BUILTIN_FONT_NAMES = ['terminus-14-bold', 'terminus-14-normal'] as const;

const requireJson = createRequire(import.meta.url);
const fontCache: Partial<Record<FontName, BitmapFont>> = {};

const loadBuiltinFont = (name: FontName): BitmapFont => {
	const cached = fontCache[name];
	if (cached) {
		return cached;
	}

	let font: BitmapFont;
	switch (name) {
		case 'terminus-14-bold':
			font = requireJson('./terminus-14-bold.json') as BitmapFont;
			break;
		case 'terminus-14-normal':
			font = requireJson('./terminus-14-normal.json') as BitmapFont;
			break;
		default:
			throw createFontNotFoundError(name);
	}

	fontCache[name] = font;
	return font;
};

const DEFAULT_FILL_CHAR = '█';
const DEFAULT_EMPTY_CHAR = ' ';

const normalizeGlyphChar = (value: string | undefined, fallback: string): string => {
	if (!value) {
		return fallback;
	}
	const [first] = Array.from(value);
	return first ?? fallback;
};

/**
 * Creates a font-not-found error for the given name.
 *
 * @param name - Font identifier that was requested
 * @returns Error instance with a FontNotFoundError name
 *
 * @example
 * ```typescript
 * import { createFontNotFoundError } from 'blecsd/widgets/fonts';
 *
 * throw createFontNotFoundError('terminus-14-mono');
 * ```
 */
export const createFontNotFoundError = (name: string): FontNotFoundError => {
	const available = [...BUILTIN_FONT_NAMES].sort().join(', ');
	const error = new Error(
		`Font '${name}' not found. Available fonts: ${available || 'none'}`,
	) as FontNotFoundError;
	error.name = 'FontNotFoundError';
	return error;
};

/**
 * Loads a built-in bitmap font by name.
 *
 * @param name - Font identifier ('terminus-14-bold' | 'terminus-14-normal')
 * @returns The loaded bitmap font
 * @throws {FontNotFoundError} If font name is not recognized
 *
 * @example
 * ```typescript
 * import { loadFont } from 'blecsd/widgets/fonts';
 *
 * const font = loadFont('terminus-14-bold');
 * console.log(font.charWidth, font.charHeight); // 8, 14
 * ```
 */
export const loadFont = (name: FontName): BitmapFont => {
	return loadBuiltinFont(name);
};

/**
 * Gets the bitmap data for a specific character.
 *
 * @param font - The bitmap font to use
 * @param char - Single character to look up
 * @returns Bitmap data for the character, or undefined if not found
 *
 * @example
 * ```typescript
 * const bitmap = getCharBitmap(font, 'A');
 * if (bitmap) {
 *   console.log(bitmap.width, bitmap.height);
 * }
 * ```
 */
export const getCharBitmap = (font: BitmapFont, char: string): CharBitmap | undefined => {
	const glyphs = Array.from(char);
	if (glyphs.length !== 1) {
		return undefined;
	}
	const codePoint = glyphs[0]?.codePointAt(0);
	if (codePoint === undefined) {
		return undefined;
	}
	return font.chars[String(codePoint)];
};

/**
 * Renders a character to an array of strings using block characters.
 *
 * @param font - The bitmap font to use
 * @param char - Character to render
 * @param options - Rendering options
 * @returns Array of strings representing the rendered character
 *
 * @example
 * ```typescript
 * const lines = renderChar(font, 'A', { fillChar: '█', emptyChar: ' ' });
 * lines.forEach(line => console.log(line));
 * ```
 */
export const renderChar = (
	font: BitmapFont,
	char: string,
	options?: RenderCharOptions,
): readonly string[] => {
	const bitmap = getCharBitmap(font, char);
	if (!bitmap) {
		return [];
	}

	const fillChar = normalizeGlyphChar(options?.fillChar, DEFAULT_FILL_CHAR);
	const emptyChar = normalizeGlyphChar(options?.emptyChar, DEFAULT_EMPTY_CHAR);

	return bitmap.bitmap.map((row) =>
		row.map((cell) => (cell === 1 ? fillChar : emptyChar)).join(''),
	);
};
