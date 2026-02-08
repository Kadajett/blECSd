/**
 * ANSI Advanced Terminal Features
 *
 * Advanced and niche terminal features including window manipulation,
 * hyperlinks, media copy (print), and rectangular area operations.
 *
 * @module terminal/ansi/advanced
 * @internal This module is internal and not exported from the main package.
 */

import { CSI, OSC, ST } from './constants';

/**
 * Window manipulation namespace.
 *
 * Provides functions for controlling the terminal window position, size,
 * and state. These are xterm control sequences that may not be supported
 * on all terminals.
 *
 * Note: Some terminals disable window manipulation for security reasons.
 * The `allowWindowOps` resource controls this in xterm.
 *
 * @example
 * ```typescript
 * import { windowOps } from 'blecsd/terminal';
 *
 * // Maximize the window
 * process.stdout.write(windowOps.maximize());
 *
 * // Move window to specific position
 * process.stdout.write(windowOps.move(100, 50));
 *
 * // Resize to specific character dimensions
 * process.stdout.write(windowOps.resizeChars(80, 24));
 * ```
 */
export const windowOps = {
	/**
	 * De-iconify (restore) the terminal window.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Restore minimized window
	 * process.stdout.write(windowOps.deiconify());
	 * ```
	 */
	deiconify(): string {
		return `${CSI}1t`;
	},

	/**
	 * Iconify (minimize) the terminal window.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Minimize window
	 * process.stdout.write(windowOps.iconify());
	 * ```
	 */
	iconify(): string {
		return `${CSI}2t`;
	},

	/**
	 * Move the terminal window to a specific position.
	 *
	 * @param x - X position in pixels from left edge of screen
	 * @param y - Y position in pixels from top edge of screen
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Move window to top-left corner
	 * process.stdout.write(windowOps.move(0, 0));
	 *
	 * // Move window to specific position
	 * process.stdout.write(windowOps.move(100, 50));
	 * ```
	 */
	move(x: number, y: number): string {
		return `${CSI}3;${x};${y}t`;
	},

	/**
	 * Resize the terminal window in pixels.
	 *
	 * @param width - Width in pixels
	 * @param height - Height in pixels
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Resize window to 800x600 pixels
	 * process.stdout.write(windowOps.resizePixels(800, 600));
	 * ```
	 */
	resizePixels(width: number, height: number): string {
		return `${CSI}4;${height};${width}t`;
	},

	/**
	 * Raise the terminal window to the front of the stacking order.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Bring window to front
	 * process.stdout.write(windowOps.raise());
	 * ```
	 */
	raise(): string {
		return `${CSI}5t`;
	},

	/**
	 * Lower the terminal window to the bottom of the stacking order.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Send window to back
	 * process.stdout.write(windowOps.lower());
	 * ```
	 */
	lower(): string {
		return `${CSI}6t`;
	},

	/**
	 * Refresh the terminal window.
	 *
	 * Forces a redraw of the terminal content.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Force window refresh
	 * process.stdout.write(windowOps.refresh());
	 * ```
	 */
	refresh(): string {
		return `${CSI}7t`;
	},

	/**
	 * Resize the text area in characters.
	 *
	 * @param columns - Number of columns
	 * @param rows - Number of rows
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Resize to 80x24 characters
	 * process.stdout.write(windowOps.resizeChars(80, 24));
	 *
	 * // Resize to 132 columns (wide mode)
	 * process.stdout.write(windowOps.resizeChars(132, 43));
	 * ```
	 */
	resizeChars(columns: number, rows: number): string {
		return `${CSI}8;${rows};${columns}t`;
	},

	/**
	 * Restore a maximized window to its previous size.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Restore from maximized state
	 * process.stdout.write(windowOps.restoreMaximized());
	 * ```
	 */
	restoreMaximized(): string {
		return `${CSI}9;0t`;
	},

	/**
	 * Maximize the terminal window.
	 *
	 * Resizes the window to fill the entire screen.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Maximize window
	 * process.stdout.write(windowOps.maximize());
	 * ```
	 */
	maximize(): string {
		return `${CSI}9;1t`;
	},

	/**
	 * Maximize the window vertically only.
	 *
	 * @returns The escape sequence
	 */
	maximizeVertical(): string {
		return `${CSI}9;2t`;
	},

	/**
	 * Maximize the window horizontally only.
	 *
	 * @returns The escape sequence
	 */
	maximizeHorizontal(): string {
		return `${CSI}9;3t`;
	},

	/**
	 * Exit full-screen mode.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Exit full-screen
	 * process.stdout.write(windowOps.exitFullScreen());
	 * ```
	 */
	exitFullScreen(): string {
		return `${CSI}10;0t`;
	},

	/**
	 * Enter full-screen mode.
	 *
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Enter full-screen
	 * process.stdout.write(windowOps.enterFullScreen());
	 * ```
	 */
	enterFullScreen(): string {
		return `${CSI}10;1t`;
	},

	/**
	 * Toggle full-screen mode.
	 *
	 * @returns The escape sequence
	 */
	toggleFullScreen(): string {
		return `${CSI}10;2t`;
	},

	/**
	 * Save the window title and icon title to the stack.
	 *
	 * @param which - Which to save: 'both', 'icon', or 'title'
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps, title } from 'blecsd/terminal';
	 *
	 * // Save current title
	 * process.stdout.write(windowOps.pushTitle('both'));
	 *
	 * // Set temporary title
	 * process.stdout.write(title.set('Processing...'));
	 *
	 * // Later, restore original title
	 * process.stdout.write(windowOps.popTitle('both'));
	 * ```
	 */
	pushTitle(which: 'both' | 'icon' | 'title' = 'both'): string {
		const param = which === 'both' ? 0 : which === 'icon' ? 1 : 2;
		return `${CSI}22;${param}t`;
	},

	/**
	 * Restore the window title and icon title from the stack.
	 *
	 * @param which - Which to restore: 'both', 'icon', or 'title'
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Restore previously saved title
	 * process.stdout.write(windowOps.popTitle('both'));
	 * ```
	 */
	popTitle(which: 'both' | 'icon' | 'title' = 'both'): string {
		const param = which === 'both' ? 0 : which === 'icon' ? 1 : 2;
		return `${CSI}23;${param}t`;
	},

	/**
	 * Resize the window to a specific number of lines (DECSLPP).
	 *
	 * This is the DEC Set Lines Per Page command for setting
	 * the logical page size.
	 *
	 * @param lines - Number of lines (must be >= 24)
	 * @returns The escape sequence
	 *
	 * @example
	 * ```typescript
	 * import { windowOps } from 'blecsd/terminal';
	 *
	 * // Set page to 50 lines
	 * process.stdout.write(windowOps.setLines(50));
	 * ```
	 */
	setLines(lines: number): string {
		const n = Math.max(24, Math.floor(lines));
		return `${CSI}${n}t`;
	},
} as const;

/**
 * Allowed protocols for hyperlinks (security whitelist).
 *
 * Only these URL schemes are allowed in hyperlinks to prevent
 * injection attacks.
 */
export const HYPERLINK_ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'file:', 'tel:'] as const;

/**
 * Type for allowed hyperlink protocols.
 */
export type HyperlinkProtocol = (typeof HYPERLINK_ALLOWED_PROTOCOLS)[number];

/**
 * Options for creating hyperlinks.
 */
export interface HyperlinkOptions {
	/**
	 * Optional ID for multi-line/multi-reference links.
	 *
	 * When multiple hyperlink regions share the same ID, terminals
	 * can highlight them together on hover.
	 */
	id?: string;
}

/**
 * Check if a URL uses an allowed protocol.
 *
 * @param url - The URL to validate
 * @returns True if the URL uses a whitelisted protocol
 *
 * @example
 * ```typescript
 * import { isHyperlinkAllowed } from 'blecsd/terminal';
 *
 * isHyperlinkAllowed('https://example.com');  // true
 * isHyperlinkAllowed('javascript:alert(1)'); // false
 * isHyperlinkAllowed('file:///home/user');   // true
 * ```
 */
export function isHyperlinkAllowed(url: string): boolean {
	try {
		const parsed = new URL(url);
		return HYPERLINK_ALLOWED_PROTOCOLS.includes(parsed.protocol as HyperlinkProtocol);
	} catch {
		// Invalid URL
		return false;
	}
}

/**
 * Hyperlink namespace for terminal clickable links (OSC 8).
 *
 * OSC 8 hyperlinks allow terminals to display clickable links.
 * The visible text can be different from the URL.
 *
 * Supported by: iTerm2, GNOME Terminal, Konsole, Windows Terminal,
 * Kitty, Alacritty, and others.
 *
 * @example
 * ```typescript
 * import { hyperlink } from 'blecsd/terminal';
 *
 * // Simple hyperlink
 * console.log(hyperlink.link('https://example.com', 'Click here'));
 *
 * // Email link
 * console.log(hyperlink.link('mailto:user@example.com', 'Contact us'));
 *
 * // Multi-line link with ID
 * console.log(hyperlink.start('https://doc.example.com', { id: 'doc-link' }));
 * console.log('This is a');
 * console.log('multi-line link');
 * console.log(hyperlink.end());
 * ```
 */
export const hyperlink = {
	/**
	 * Create a complete hyperlink with text.
	 *
	 * @param url - The URL to link to
	 * @param text - The visible text for the link
	 * @param options - Optional link options
	 * @returns The escape sequence with link and text
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // Simple link
	 * process.stdout.write(
	 *   hyperlink.link('https://nodejs.org', 'Node.js') + '\n'
	 * );
	 *
	 * // With ID for highlighting related links
	 * process.stdout.write(
	 *   'See ' +
	 *   hyperlink.link('https://docs.example.com', 'docs', { id: 'main-doc' }) +
	 *   ' for more info.\n'
	 * );
	 * ```
	 */
	link(url: string, text: string, options?: HyperlinkOptions): string {
		return `${hyperlink.start(url, options)}${text}${hyperlink.end()}`;
	},

	/**
	 * Start a hyperlink region.
	 *
	 * Use this for multi-line links or when the link text spans
	 * multiple output calls. Call `end()` to close the link region.
	 *
	 * @param url - The URL to link to
	 * @param options - Optional link options (id for multi-reference links)
	 * @returns The escape sequence to start the link
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // Multi-line link
	 * process.stdout.write(hyperlink.start('https://example.com'));
	 * process.stdout.write('This link\n');
	 * process.stdout.write('spans multiple\n');
	 * process.stdout.write('lines\n');
	 * process.stdout.write(hyperlink.end());
	 *
	 * // With ID (related links highlight together)
	 * const docUrl = 'https://docs.example.com';
	 * process.stdout.write(hyperlink.start(docUrl, { id: 'docs' }));
	 * process.stdout.write('[1]');
	 * process.stdout.write(hyperlink.end());
	 * process.stdout.write(' ... ');
	 * process.stdout.write(hyperlink.start(docUrl, { id: 'docs' }));
	 * process.stdout.write('[2]');
	 * process.stdout.write(hyperlink.end());
	 * ```
	 */
	start(url: string, options?: HyperlinkOptions): string {
		const params = options?.id ? `id=${options.id}` : '';
		return `${OSC}8;${params};${url}${ST}`;
	},

	/**
	 * End a hyperlink region.
	 *
	 * @returns The escape sequence to end the link
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * process.stdout.write(hyperlink.start('https://example.com'));
	 * process.stdout.write('link text');
	 * process.stdout.write(hyperlink.end()); // Closes the link
	 * ```
	 */
	end(): string {
		return `${OSC}8;;${ST}`;
	},

	/**
	 * Create a safe hyperlink with URL validation.
	 *
	 * Only allows whitelisted protocols (http, https, mailto, file, tel).
	 * Returns just the text without a link if the URL is not allowed.
	 *
	 * @param url - The URL to link to
	 * @param text - The visible text for the link
	 * @param options - Optional link options
	 * @returns The escape sequence with link (or just text if URL not allowed)
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // Safe link (URL validated)
	 * hyperlink.safeLink('https://example.com', 'Safe');
	 * // Returns: OSC 8;;https://example.com ST Safe OSC 8;; ST
	 *
	 * // Blocked URL (javascript:)
	 * hyperlink.safeLink('javascript:alert(1)', 'XSS');
	 * // Returns: 'XSS' (no link, just text)
	 * ```
	 */
	safeLink(url: string, text: string, options?: HyperlinkOptions): string {
		if (!isHyperlinkAllowed(url)) {
			return text;
		}
		return hyperlink.link(url, text, options);
	},

	/**
	 * Create a mailto link.
	 *
	 * @param email - Email address
	 * @param text - Optional display text (defaults to email)
	 * @param options - Optional link options
	 * @returns The escape sequence for an email link
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // Email with address as text
	 * process.stdout.write(hyperlink.mailto('user@example.com'));
	 *
	 * // Email with custom text
	 * process.stdout.write(hyperlink.mailto('support@company.com', 'Contact Support'));
	 * ```
	 */
	mailto(email: string, text?: string, options?: HyperlinkOptions): string {
		return hyperlink.link(`mailto:${email}`, text ?? email, options);
	},

	/**
	 * Create a file link.
	 *
	 * @param path - File path (absolute)
	 * @param text - Optional display text (defaults to path)
	 * @param options - Optional link options
	 * @returns The escape sequence for a file link
	 *
	 * @example
	 * ```typescript
	 * import { hyperlink } from 'blecsd/terminal';
	 *
	 * // File link
	 * process.stdout.write(hyperlink.file('/home/user/document.txt', 'document'));
	 *
	 * // Error output with file links
	 * console.log(`Error at ${hyperlink.file('/src/app.ts', 'app.ts')}:42`);
	 * ```
	 */
	file(path: string, text?: string, options?: HyperlinkOptions): string {
		return hyperlink.link(`file://${path}`, text ?? path, options);
	},
} as const;

/**
 * Media copy mode values for printer control.
 */
export const MediaCopyMode = {
	/** Print screen (mc0) */
	PRINT_SCREEN: 0,
	/** Turn off printer controller mode (mc4) */
	PRINTER_OFF: 4,
	/** Turn on printer controller mode (mc5) */
	PRINTER_ON: 5,
	/** Print cursor line (mc1) - VT100 */
	PRINT_LINE: 1,
	/** Print composed display (mc10) - VT300+ */
	PRINT_DISPLAY: 10,
	/** Print all pages (mc11) - VT300+ */
	PRINT_ALL_PAGES: 11,
} as const;

export type MediaCopyModeValue = (typeof MediaCopyMode)[keyof typeof MediaCopyMode];

/**
 * Media copy (print) namespace.
 *
 * These are legacy terminal features for controlling printers and
 * capturing screen output. Rarely used in modern applications but
 * may be useful for specialized printing or screen capture scenarios.
 *
 * @example
 * ```typescript
 * import { mediaCopy } from 'blecsd/terminal';
 *
 * // Print the current screen
 * process.stdout.write(mediaCopy.printScreen());
 *
 * // Enable printer controller mode
 * process.stdout.write(mediaCopy.printerOn());
 * // ... output goes to printer ...
 * process.stdout.write(mediaCopy.printerOff());
 * ```
 */
export const mediaCopy = {
	/**
	 * Send media copy command with specified mode.
	 *
	 * @param mode - Media copy mode value
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mediaCopy.mc(MediaCopyMode.PRINT_SCREEN)
	 * // Returns: '\x1b[0i'
	 * ```
	 */
	mc(mode: MediaCopyModeValue): string {
		return `${CSI}${mode}i`;
	},

	/**
	 * Print screen (mc0).
	 * Sends screen contents to the printer.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * mediaCopy.printScreen()
	 * // Returns: '\x1b[0i'
	 * ```
	 */
	printScreen(): string {
		return `${CSI}0i`;
	},

	/**
	 * Print cursor line (mc1).
	 * Sends the line containing the cursor to the printer.
	 *
	 * @returns ANSI escape sequence
	 */
	printLine(): string {
		return `${CSI}1i`;
	},

	/**
	 * Turn on printer controller mode (mc5).
	 * All subsequent output is sent to the printer until printerOff() is called.
	 *
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Enable printer mode
	 * process.stdout.write(mediaCopy.printerOn());
	 *
	 * // This text goes to printer
	 * process.stdout.write('Hello, Printer!');
	 *
	 * // Disable printer mode
	 * process.stdout.write(mediaCopy.printerOff());
	 * ```
	 */
	printerOn(): string {
		return `${CSI}5i`;
	},

	/**
	 * Turn off printer controller mode (mc4).
	 * Stops sending output to the printer.
	 *
	 * @returns ANSI escape sequence
	 */
	printerOff(): string {
		return `${CSI}4i`;
	},

	/**
	 * Turn on printer for n bytes (mc5p).
	 * Sends exactly n bytes to the printer, then automatically turns off.
	 *
	 * @param n - Number of bytes to send to printer
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Print exactly 100 bytes
	 * mediaCopy.printerForBytes(100)
	 * // Returns: '\x1b[5;100i'
	 * ```
	 */
	printerForBytes(n: number): string {
		return `${CSI}5;${n}i`;
	},

	/**
	 * Print composed display (mc10).
	 * VT300+ feature for printing the composed display.
	 *
	 * @returns ANSI escape sequence
	 */
	printDisplay(): string {
		return `${CSI}10i`;
	},

	/**
	 * Print all pages (mc11).
	 * VT300+ feature for printing all pages.
	 *
	 * @returns ANSI escape sequence
	 */
	printAllPages(): string {
		return `${CSI}11i`;
	},

	/**
	 * Auto print mode - enable.
	 * Lines are automatically printed when cursor moves off them.
	 *
	 * @returns ANSI escape sequence
	 */
	autoPrintOn(): string {
		return `${CSI}?5i`;
	},

	/**
	 * Auto print mode - disable.
	 *
	 * @returns ANSI escape sequence
	 */
	autoPrintOff(): string {
		return `${CSI}?4i`;
	},

	/**
	 * Print cursor position report.
	 * Sends the cursor position to the printer.
	 *
	 * @returns ANSI escape sequence
	 */
	printCursorPosition(): string {
		return `${CSI}?1i`;
	},
} as const;

/**
 * Rectangle namespace for VT400+ rectangular area operations.
 *
 * These advanced features allow manipulation of rectangular areas
 * on the screen, including copying, filling, erasing, and modifying
 * attributes within a region.
 *
 * Note: These features require VT400+ compatible terminals.
 *
 * @example
 * ```typescript
 * import { rectangle } from 'blecsd/terminal';
 *
 * // Fill a rectangle with '#' character
 * process.stdout.write(rectangle.fill(1, 1, 10, 5, '#'));
 *
 * // Erase a rectangle
 * process.stdout.write(rectangle.erase(5, 5, 15, 10));
 *
 * // Copy a rectangle to another location
 * process.stdout.write(rectangle.copy(1, 1, 10, 5, 20, 1));
 * ```
 */
export const rectangle = {
	/**
	 * Set character attributes in a rectangular area (DECCARA).
	 * Changes attributes (bold, underline, etc.) within a rectangle.
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @param attrs - SGR attribute codes to set
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Make text bold and underlined in rectangle
	 * rectangle.setAttrs(1, 1, 10, 20, [SGR.BOLD, SGR.UNDERLINE])
	 * // Returns: '\x1b[1;1;10;20;1;4$r'
	 * ```
	 */
	setAttrs(top: number, left: number, bottom: number, right: number, attrs: number[]): string {
		const attrStr = attrs.length > 0 ? `;${attrs.join(';')}` : '';
		return `${CSI}${top};${left};${bottom};${right}${attrStr}$r`;
	},

	/**
	 * Reverse character attributes in a rectangular area (DECRARA).
	 * Toggles specified attributes within a rectangle.
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @param attrs - SGR attribute codes to reverse
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Toggle inverse attribute in rectangle
	 * rectangle.reverseAttrs(1, 1, 10, 20, [SGR.INVERSE])
	 * // Returns: '\x1b[1;1;10;20;7$t'
	 * ```
	 */
	reverseAttrs(top: number, left: number, bottom: number, right: number, attrs: number[]): string {
		const attrStr = attrs.length > 0 ? `;${attrs.join(';')}` : '';
		return `${CSI}${top};${left};${bottom};${right}${attrStr}$t`;
	},

	/**
	 * Copy rectangular area (DECCRA).
	 * Copies content from one rectangle to another location.
	 *
	 * @param srcTop - Source top row (1-indexed)
	 * @param srcLeft - Source left column (1-indexed)
	 * @param srcBottom - Source bottom row (1-indexed)
	 * @param srcRight - Source right column (1-indexed)
	 * @param destTop - Destination top row (1-indexed)
	 * @param destLeft - Destination left column (1-indexed)
	 * @param srcPage - Source page (default: 1)
	 * @param destPage - Destination page (default: 1)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Copy rectangle from (1,1)-(10,20) to (1,30)
	 * rectangle.copy(1, 1, 10, 20, 1, 30)
	 * // Returns: '\x1b[1;1;10;20;1;1;30$v'
	 * ```
	 */
	copy(
		srcTop: number,
		srcLeft: number,
		srcBottom: number,
		srcRight: number,
		destTop: number,
		destLeft: number,
		srcPage = 1,
		destPage = 1,
	): string {
		return `${CSI}${srcTop};${srcLeft};${srcBottom};${srcRight};${srcPage};${destTop};${destLeft};${destPage}$v`;
	},

	/**
	 * Fill rectangular area with character (DECFRA).
	 * Fills a rectangle with a specified character.
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @param char - Character to fill with (or character code)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Fill rectangle with '#'
	 * rectangle.fill(1, 1, 10, 20, '#')
	 * // Returns: '\x1b[35;1;1;10;20$x'
	 *
	 * // Fill with character code
	 * rectangle.fill(1, 1, 10, 20, 42) // '*' character
	 * ```
	 */
	fill(top: number, left: number, bottom: number, right: number, char: string | number): string {
		const charCode = typeof char === 'string' ? char.charCodeAt(0) : char;
		return `${CSI}${charCode};${top};${left};${bottom};${right}$x`;
	},

	/**
	 * Erase rectangular area (DECERA).
	 * Erases content within a rectangle (fills with spaces).
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Erase rectangle
	 * rectangle.erase(5, 5, 15, 25)
	 * // Returns: '\x1b[5;5;15;25$z'
	 * ```
	 */
	erase(top: number, left: number, bottom: number, right: number): string {
		return `${CSI}${top};${left};${bottom};${right}$z`;
	},

	/**
	 * Selective erase rectangular area (DECSERA).
	 * Erases only characters that are not protected by DECSCA.
	 *
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Selective erase rectangle
	 * rectangle.selectiveErase(5, 5, 15, 25)
	 * // Returns: '\x1b[5;5;15;25${'
	 * ```
	 */
	selectiveErase(top: number, left: number, bottom: number, right: number): string {
		return `${CSI}${top};${left};${bottom};${right}\${`;
	},

	/**
	 * Set character protection attribute (DECSCA).
	 * Protected characters are not affected by selective erase.
	 *
	 * @param protect - Whether to protect characters (true) or unprotect (false)
	 * @returns ANSI escape sequence
	 *
	 * @example
	 * ```typescript
	 * // Protect subsequent characters
	 * rectangle.setProtection(true)
	 * // Returns: '\x1b[1"q'
	 *
	 * // Unprotect
	 * rectangle.setProtection(false)
	 * // Returns: '\x1b[0"q'
	 * ```
	 */
	setProtection(protect: boolean): string {
		return `${CSI}${protect ? 1 : 0}"q`;
	},

	/**
	 * Enable rectangular area checksum reporting (DECRQCRA).
	 * Requests a checksum of a rectangular area.
	 *
	 * @param id - Request ID (returned in response)
	 * @param page - Page number (default: 1)
	 * @param top - Top row (1-indexed)
	 * @param left - Left column (1-indexed)
	 * @param bottom - Bottom row (1-indexed)
	 * @param right - Right column (1-indexed)
	 * @returns ANSI escape sequence
	 */
	requestChecksum(
		id: number,
		page: number,
		top: number,
		left: number,
		bottom: number,
		right: number,
	): string {
		return `${CSI}${id};${page};${top};${left};${bottom};${right}*y`;
	},
} as const;
