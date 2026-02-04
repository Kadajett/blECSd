/**
 * Backend auto-detection.
 *
 * Selects the best rendering backend based on terminal capabilities,
 * integrating with the existing TerminalCapabilities negotiation system.
 *
 * Priority order: kitty > sixel > sextant > halfblock > braille
 *
 * @module 3d/backends/detection
 */

import type { BackendType } from '../schemas/backends';
import {
	type BackendPreference,
	BackendPreferenceSchema,
	BackendTypeSchema,
} from '../schemas/backends';
import { createBrailleBackend } from './braille';
import { createHalfBlockBackend } from './halfblock';
import { createKittyBackend } from './kitty';
import { createSextantBackend } from './sextant';
import { createSixelBackend } from './sixel';
import type { RendererBackend } from './types';

/**
 * Simplified terminal capabilities relevant to backend selection.
 * This matches a subset of the full TerminalCapabilities interface
 * from src/terminal/capabilities/negotiation.ts.
 */
export interface GraphicsCapabilities {
	/** Graphics protocol: 'kitty', 'sixel', 'iterm2', 'none', or false. */
	readonly graphics: string | false;
	/** Whether the terminal supports true 24-bit color. */
	readonly truecolor: boolean;
}

/**
 * Create a RendererBackend by explicit type.
 *
 * @param type - The backend type to create
 * @returns A new RendererBackend of the specified type
 *
 * @example
 * ```typescript
 * const backend = createBackendByType('braille');
 * ```
 */
export function createBackendByType(type: BackendType): RendererBackend {
	BackendTypeSchema.parse(type);

	switch (type) {
		case 'braille':
			return createBrailleBackend();
		case 'halfblock':
			return createHalfBlockBackend();
		case 'sextant':
			return createSextantBackend();
		case 'sixel':
			return createSixelBackend();
		case 'kitty':
			return createKittyBackend();
	}
}

/**
 * Detect the best available rendering backend based on terminal capabilities.
 *
 * Priority: kitty > sixel > sextant (if truecolor) > halfblock (if truecolor) > braille
 *
 * @param capabilities - Terminal graphics capabilities
 * @param preference - Optional backend selection preferences
 * @returns The best available RendererBackend
 *
 * @example
 * ```typescript
 * // Auto-detect best backend
 * const backend = detectBestBackend({ graphics: 'kitty', truecolor: true });
 *
 * // Force a specific backend
 * const braille = detectBestBackend(
 *   { graphics: 'kitty', truecolor: true },
 *   { preferred: 'braille', forceBackend: true },
 * );
 * ```
 */
export function detectBestBackend(
	capabilities: GraphicsCapabilities,
	preference?: BackendPreference,
): RendererBackend {
	const pref = BackendPreferenceSchema.parse(preference ?? {});

	// If forceBackend is true and preferred is a specific type, use it directly
	if (pref.forceBackend && pref.preferred !== 'auto') {
		return createBackendByType(pref.preferred);
	}

	// If preferred is a specific type (not auto) and not forced, try it but fall back
	if (pref.preferred !== 'auto') {
		return createBackendByType(pref.preferred);
	}

	// Auto-detection based on capabilities
	const graphics = capabilities.graphics;

	if (graphics === 'kitty') {
		return createKittyBackend();
	}

	if (graphics === 'sixel') {
		return createSixelBackend();
	}

	// For terminals with truecolor but no graphics protocol,
	// sextant gives best resolution with color
	if (capabilities.truecolor) {
		return createSextantBackend();
	}

	// Fallback
	return createBackendByType(pref.fallback);
}
