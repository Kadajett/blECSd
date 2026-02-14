/**
 * Constants for syntax highlighting.
 *
 * @module utils/syntaxHighlight/constants
 */

import type { LineState } from './types';

/** Default batch size for background highlighting */
export const DEFAULT_HIGHLIGHT_BATCH = 100;

/** Initial empty line state */
export const EMPTY_STATE: LineState = {
	inString: null,
	inComment: false,
	templateDepth: 0,
	commentDepth: 0,
};
