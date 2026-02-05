/**
 * Codepage character mapping tables.
 *
 * Each codepage maps byte values (0-255) to their corresponding UTF-8 characters.
 * Bytes 0x00-0x7F are standard ASCII for all codepages.
 *
 * @module utils/encoding/codepages
 */

/**
 * CP437 (IBM PC / DOS) extended character set.
 *
 * The high bytes (0x80-0xFF) contain box-drawing characters, block elements,
 * mathematical symbols, and Greek letters commonly used in DOS applications
 * and ANSI art.
 *
 * @see https://en.wikipedia.org/wiki/Code_page_437
 */
export const CP437_HIGH_BYTES: readonly string[] = [
	// 0x80-0x8F: Accented letters (mostly umlauts and accents)
	'Ç', // 0x80
	'ü', // 0x81
	'é', // 0x82
	'â', // 0x83
	'ä', // 0x84
	'à', // 0x85
	'å', // 0x86
	'ç', // 0x87
	'ê', // 0x88
	'ë', // 0x89
	'è', // 0x8A
	'ï', // 0x8B
	'î', // 0x8C
	'ì', // 0x8D
	'Ä', // 0x8E
	'Å', // 0x8F

	// 0x90-0x9F: More accented letters and currency symbols
	'É', // 0x90
	'æ', // 0x91
	'Æ', // 0x92
	'ô', // 0x93
	'ö', // 0x94
	'ò', // 0x95
	'û', // 0x96
	'ù', // 0x97
	'ÿ', // 0x98
	'Ö', // 0x99
	'Ü', // 0x9A
	'¢', // 0x9B
	'£', // 0x9C
	'¥', // 0x9D
	'₧', // 0x9E (peseta sign)
	'ƒ', // 0x9F (florin sign)

	// 0xA0-0xAF: Accented letters and punctuation
	'á', // 0xA0
	'í', // 0xA1
	'ó', // 0xA2
	'ú', // 0xA3
	'ñ', // 0xA4
	'Ñ', // 0xA5
	'ª', // 0xA6
	'º', // 0xA7
	'¿', // 0xA8
	'⌐', // 0xA9
	'¬', // 0xAA
	'½', // 0xAB
	'¼', // 0xAC
	'¡', // 0xAD
	'«', // 0xAE
	'»', // 0xAF

	// 0xB0-0xBF: Block shading and box-drawing (part 1)
	'░', // 0xB0 (light shade)
	'▒', // 0xB1 (medium shade)
	'▓', // 0xB2 (dark shade)
	'│', // 0xB3 (box drawings light vertical)
	'┤', // 0xB4
	'╡', // 0xB5
	'╢', // 0xB6
	'╖', // 0xB7
	'╕', // 0xB8
	'╣', // 0xB9
	'║', // 0xBA (box drawings double vertical)
	'╗', // 0xBB
	'╝', // 0xBC
	'╜', // 0xBD
	'╛', // 0xBE
	'┐', // 0xBF

	// 0xC0-0xCF: Box-drawing (part 2)
	'└', // 0xC0
	'┴', // 0xC1
	'┬', // 0xC2
	'├', // 0xC3
	'─', // 0xC4 (box drawings light horizontal)
	'┼', // 0xC5
	'╞', // 0xC6
	'╟', // 0xC7
	'╚', // 0xC8
	'╔', // 0xC9
	'╩', // 0xCA
	'╦', // 0xCB
	'╠', // 0xCC
	'═', // 0xCD (box drawings double horizontal)
	'╬', // 0xCE
	'╧', // 0xCF

	// 0xD0-0xDF: Box-drawing (part 3) and block elements
	'╨', // 0xD0
	'╤', // 0xD1
	'╥', // 0xD2
	'╙', // 0xD3
	'╘', // 0xD4
	'╒', // 0xD5
	'╓', // 0xD6
	'╫', // 0xD7
	'╪', // 0xD8
	'┘', // 0xD9
	'┌', // 0xDA
	'█', // 0xDB (full block)
	'▄', // 0xDC (lower half block)
	'▌', // 0xDD (left half block)
	'▐', // 0xDE (right half block)
	'▀', // 0xDF (upper half block)

	// 0xE0-0xEF: Greek letters (mostly)
	'α', // 0xE0 (alpha)
	'ß', // 0xE1 (sharp s / beta)
	'Γ', // 0xE2 (Gamma)
	'π', // 0xE3 (pi)
	'Σ', // 0xE4 (Sigma)
	'σ', // 0xE5 (sigma)
	'µ', // 0xE6 (micro sign)
	'τ', // 0xE7 (tau)
	'Φ', // 0xE8 (Phi)
	'Θ', // 0xE9 (Theta)
	'Ω', // 0xEA (Omega)
	'δ', // 0xEB (delta)
	'∞', // 0xEC (infinity)
	'φ', // 0xED (phi)
	'ε', // 0xEE (epsilon)
	'∩', // 0xEF (intersection)

	// 0xF0-0xFF: Mathematical symbols and special characters
	'≡', // 0xF0 (identical to)
	'±', // 0xF1 (plus-minus)
	'≥', // 0xF2 (greater than or equal)
	'≤', // 0xF3 (less than or equal)
	'⌠', // 0xF4 (top half integral)
	'⌡', // 0xF5 (bottom half integral)
	'÷', // 0xF6 (division)
	'≈', // 0xF7 (almost equal)
	'°', // 0xF8 (degree)
	'∙', // 0xF9 (bullet operator)
	'·', // 0xFA (middle dot)
	'√', // 0xFB (square root)
	'ⁿ', // 0xFC (superscript n)
	'²', // 0xFD (superscript 2)
	'■', // 0xFE (black square)
	'\u00A0', // 0xFF (non-breaking space)
];

/**
 * CP437 control character symbols (0x00-0x1F).
 *
 * In CP437, these bytes can display as special symbols rather than control codes.
 */
export const CP437_CONTROL_CHARS: readonly string[] = [
	'\u0000', // 0x00 (NUL - displayed as space in most contexts)
	'☺', // 0x01 (white smiling face)
	'☻', // 0x02 (black smiling face)
	'♥', // 0x03 (heart)
	'♦', // 0x04 (diamond)
	'♣', // 0x05 (club)
	'♠', // 0x06 (spade)
	'•', // 0x07 (bullet)
	'◘', // 0x08 (inverse bullet)
	'○', // 0x09 (white circle)
	'◙', // 0x0A (inverse white circle)
	'♂', // 0x0B (male sign)
	'♀', // 0x0C (female sign)
	'♪', // 0x0D (eighth note)
	'♫', // 0x0E (beamed eighth notes)
	'☼', // 0x0F (sun)
	'►', // 0x10 (right-pointing pointer)
	'◄', // 0x11 (left-pointing pointer)
	'↕', // 0x12 (up-down arrow)
	'‼', // 0x13 (double exclamation)
	'¶', // 0x14 (pilcrow)
	'§', // 0x15 (section sign)
	'▬', // 0x16 (black rectangle)
	'↨', // 0x17 (up-down arrow with base)
	'↑', // 0x18 (up arrow)
	'↓', // 0x19 (down arrow)
	'→', // 0x1A (right arrow)
	'←', // 0x1B (left arrow)
	'∟', // 0x1C (right angle)
	'↔', // 0x1D (left-right arrow)
	'▲', // 0x1E (up-pointing triangle)
	'▼', // 0x1F (down-pointing triangle)
];

/**
 * CP850 (DOS Latin-1) extended character set.
 *
 * Similar to CP437 but with more accented Latin characters and fewer
 * box-drawing/Greek characters.
 */
export const CP850_HIGH_BYTES: readonly string[] = [
	// 0x80-0x8F
	'Ç',
	'ü',
	'é',
	'â',
	'ä',
	'à',
	'å',
	'ç',
	'ê',
	'ë',
	'è',
	'ï',
	'î',
	'ì',
	'Ä',
	'Å',
	// 0x90-0x9F
	'É',
	'æ',
	'Æ',
	'ô',
	'ö',
	'ò',
	'û',
	'ù',
	'ÿ',
	'Ö',
	'Ü',
	'ø',
	'£',
	'Ø',
	'×',
	'ƒ',
	// 0xA0-0xAF
	'á',
	'í',
	'ó',
	'ú',
	'ñ',
	'Ñ',
	'ª',
	'º',
	'¿',
	'®',
	'¬',
	'½',
	'¼',
	'¡',
	'«',
	'»',
	// 0xB0-0xBF
	'░',
	'▒',
	'▓',
	'│',
	'┤',
	'Á',
	'Â',
	'À',
	'©',
	'╣',
	'║',
	'╗',
	'╝',
	'¢',
	'¥',
	'┐',
	// 0xC0-0xCF
	'└',
	'┴',
	'┬',
	'├',
	'─',
	'┼',
	'ã',
	'Ã',
	'╚',
	'╔',
	'╩',
	'╦',
	'╠',
	'═',
	'╬',
	'¤',
	// 0xD0-0xDF
	'ð',
	'Ð',
	'Ê',
	'Ë',
	'È',
	'ı',
	'Í',
	'Î',
	'Ï',
	'┘',
	'┌',
	'█',
	'▄',
	'¦',
	'Ì',
	'▀',
	// 0xE0-0xEF
	'Ó',
	'ß',
	'Ô',
	'Ò',
	'õ',
	'Õ',
	'µ',
	'þ',
	'Þ',
	'Ú',
	'Û',
	'Ù',
	'ý',
	'Ý',
	'¯',
	'´',
	// 0xF0-0xFF
	'\u00AD',
	'±',
	'‗',
	'¾',
	'¶',
	'§',
	'÷',
	'¸',
	'°',
	'¨',
	'·',
	'¹',
	'³',
	'²',
	'■',
	'\u00A0',
];

/**
 * CP866 (DOS Cyrillic) extended character set.
 *
 * Provides Cyrillic characters for Russian and other Slavic languages.
 */
export const CP866_HIGH_BYTES: readonly string[] = [
	// 0x80-0x8F: Cyrillic uppercase А-П
	'А',
	'Б',
	'В',
	'Г',
	'Д',
	'Е',
	'Ж',
	'З',
	'И',
	'Й',
	'К',
	'Л',
	'М',
	'Н',
	'О',
	'П',
	// 0x90-0x9F: Cyrillic uppercase Р-Я
	'Р',
	'С',
	'Т',
	'У',
	'Ф',
	'Х',
	'Ц',
	'Ч',
	'Ш',
	'Щ',
	'Ъ',
	'Ы',
	'Ь',
	'Э',
	'Ю',
	'Я',
	// 0xA0-0xAF: Cyrillic lowercase а-п
	'а',
	'б',
	'в',
	'г',
	'д',
	'е',
	'ж',
	'з',
	'и',
	'й',
	'к',
	'л',
	'м',
	'н',
	'о',
	'п',
	// 0xB0-0xBF: Box-drawing (same as CP437)
	'░',
	'▒',
	'▓',
	'│',
	'┤',
	'╡',
	'╢',
	'╖',
	'╕',
	'╣',
	'║',
	'╗',
	'╝',
	'╜',
	'╛',
	'┐',
	// 0xC0-0xCF: Box-drawing (same as CP437)
	'└',
	'┴',
	'┬',
	'├',
	'─',
	'┼',
	'╞',
	'╟',
	'╚',
	'╔',
	'╩',
	'╦',
	'╠',
	'═',
	'╬',
	'╧',
	// 0xD0-0xDF: Box-drawing (same as CP437)
	'╨',
	'╤',
	'╥',
	'╙',
	'╘',
	'╒',
	'╓',
	'╫',
	'╪',
	'┘',
	'┌',
	'█',
	'▄',
	'▌',
	'▐',
	'▀',
	// 0xE0-0xEF: Cyrillic lowercase р-я
	'р',
	'с',
	'т',
	'у',
	'ф',
	'х',
	'ц',
	'ч',
	'ш',
	'щ',
	'ъ',
	'ы',
	'ь',
	'э',
	'ю',
	'я',
	// 0xF0-0xFF: Special characters
	'Ё',
	'ё',
	'Є',
	'є',
	'Ї',
	'ї',
	'Ў',
	'ў',
	'°',
	'∙',
	'·',
	'√',
	'№',
	'¤',
	'■',
	'\u00A0',
];

/**
 * CP1252 (Windows Latin-1) extended character set.
 *
 * Windows Western European codepage. More standardized than DOS codepages.
 */
export const CP1252_HIGH_BYTES: readonly string[] = [
	// 0x80-0x8F
	'€',
	'\u0081',
	'‚',
	'ƒ',
	'„',
	'…',
	'†',
	'‡',
	'ˆ',
	'‰',
	'Š',
	'‹',
	'Œ',
	'\u008D',
	'Ž',
	'\u008F',
	// 0x90-0x9F
	'\u0090',
	'\u2018', // ' LEFT SINGLE QUOTATION MARK
	'\u2019', // ' RIGHT SINGLE QUOTATION MARK
	'\u201C', // " LEFT DOUBLE QUOTATION MARK
	'\u201D', // " RIGHT DOUBLE QUOTATION MARK
	'\u2022', // • BULLET
	'\u2013', // – EN DASH
	'\u2014', // — EM DASH
	'˜',
	'™',
	'š',
	'›',
	'œ',
	'\u009D',
	'ž',
	'Ÿ',
	// 0xA0-0xAF
	'\u00A0',
	'¡',
	'¢',
	'£',
	'¤',
	'¥',
	'¦',
	'§',
	'¨',
	'©',
	'ª',
	'«',
	'¬',
	'\u00AD',
	'®',
	'¯',
	// 0xB0-0xBF
	'°',
	'±',
	'²',
	'³',
	'´',
	'µ',
	'¶',
	'·',
	'¸',
	'¹',
	'º',
	'»',
	'¼',
	'½',
	'¾',
	'¿',
	// 0xC0-0xCF
	'À',
	'Á',
	'Â',
	'Ã',
	'Ä',
	'Å',
	'Æ',
	'Ç',
	'È',
	'É',
	'Ê',
	'Ë',
	'Ì',
	'Í',
	'Î',
	'Ï',
	// 0xD0-0xDF
	'Ð',
	'Ñ',
	'Ò',
	'Ó',
	'Ô',
	'Õ',
	'Ö',
	'×',
	'Ø',
	'Ù',
	'Ú',
	'Û',
	'Ü',
	'Ý',
	'Þ',
	'ß',
	// 0xE0-0xEF
	'à',
	'á',
	'â',
	'ã',
	'ä',
	'å',
	'æ',
	'ç',
	'è',
	'é',
	'ê',
	'ë',
	'ì',
	'í',
	'î',
	'ï',
	// 0xF0-0xFF
	'ð',
	'ñ',
	'ò',
	'ó',
	'ô',
	'õ',
	'ö',
	'÷',
	'ø',
	'ù',
	'ú',
	'û',
	'ü',
	'ý',
	'þ',
	'ÿ',
];

/**
 * Map of codepage names to their high byte tables.
 */
export const CODEPAGE_TABLES: Record<string, readonly string[]> = {
	cp437: CP437_HIGH_BYTES,
	cp850: CP850_HIGH_BYTES,
	cp866: CP866_HIGH_BYTES,
	cp1252: CP1252_HIGH_BYTES,
};

/**
 * Map of codepage names to their control character tables.
 * Only CP437 has special control character symbols.
 */
export const CODEPAGE_CONTROL_TABLES: Record<string, readonly string[] | undefined> = {
	cp437: CP437_CONTROL_CHARS,
	cp850: undefined,
	cp866: undefined,
	cp1252: undefined,
};
