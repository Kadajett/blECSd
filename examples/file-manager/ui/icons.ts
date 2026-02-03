/**
 * Unicode file icons.
 * @module ui/icons
 */

import type { FileCategory } from '../data';

/**
 * Unicode icons for file types.
 */
export const FILE_ICONS: Record<FileCategory | 'selected' | 'cursor', string> = {
	directory: '📁',
	file: '📄',
	symlink: '🔗',
	executable: '⚙️',
	image: '🖼️',
	audio: '🎵',
	video: '🎬',
	archive: '📦',
	code: '💻',
	text: '📝',
	document: '📋',
	selected: '✓',
	cursor: '>',
};

/**
 * Fallback ASCII icons for terminals without Unicode support.
 */
export const ASCII_ICONS: Record<FileCategory | 'selected' | 'cursor', string> = {
	directory: 'D',
	file: '-',
	symlink: 'L',
	executable: '*',
	image: 'I',
	audio: 'A',
	video: 'V',
	archive: 'Z',
	code: '#',
	text: 'T',
	document: 'P',
	selected: '+',
	cursor: '>',
};

/**
 * Gets the icon for a file category.
 */
export function getIcon(category: FileCategory, useUnicode = true): string {
	const icons = useUnicode ? FILE_ICONS : ASCII_ICONS;
	return icons[category] ?? icons.file;
}
