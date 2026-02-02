/**
 * File preview content loading.
 * @module data/preview
 */

import { formatSize, type SizeFormat, formatDate } from '../config';
import { FileType, getFileCategory, type FileEntry } from './fileEntry';
import {
	countDirectoryItems,
	getDirectorySize,
	readFileHexPreview,
	readFilePreview,
} from './filesystem';

/**
 * Preview content for a file or directory.
 */
export interface PreviewContent {
	/** File name */
	readonly name: string;
	/** File extension (for syntax highlighting) */
	readonly extension: string;
	/** Metadata lines (size, date, type, etc.) */
	readonly metadata: string[];
	/** Content lines (text preview, hex dump, etc.) */
	readonly content: string[];
	/** Whether content is binary (hex dump) */
	readonly isBinary: boolean;
}

/**
 * Empty preview content.
 */
export const EMPTY_PREVIEW: PreviewContent = {
	name: '',
	extension: '',
	metadata: [],
	content: [],
	isBinary: false,
};

/**
 * File extensions that should be previewed as text.
 */
const TEXT_EXTENSIONS = new Set([
	'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'csv', 'log', 'ini', 'conf', 'cfg',
	'js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'c', 'cpp', 'h', 'hpp',
	'java', 'rb', 'php', 'sh', 'bash', 'zsh', 'fish',
	'html', 'css', 'scss', 'less', 'vue', 'svelte',
	'toml', 'lock', 'gitignore', 'dockerignore', 'editorconfig',
	'makefile', 'dockerfile',
]);

/**
 * Checks if a file should be previewed as text.
 */
function isTextFile(entry: FileEntry): boolean {
	if (entry.extension === '' && !entry.name.includes('.')) {
		// Files without extension might be text (scripts, etc.)
		// We'll try to read them as text
		return true;
	}
	return TEXT_EXTENSIONS.has(entry.extension);
}

/**
 * Gets the file type description.
 */
function getFileTypeDescription(entry: FileEntry): string {
	const category = getFileCategory(entry);

	switch (category) {
		case 'directory':
			return 'Directory';
		case 'symlink':
			return 'Symbolic Link';
		case 'executable':
			return 'Executable';
		case 'image':
			return 'Image File';
		case 'audio':
			return 'Audio File';
		case 'video':
			return 'Video File';
		case 'archive':
			return 'Archive';
		case 'code':
			return 'Source Code';
		case 'document':
			return 'Document';
		case 'text':
			return 'Text File';
		default:
			return entry.extension ? `${entry.extension.toUpperCase()} File` : 'File';
	}
}

/**
 * Loads preview content for a file entry.
 * If maxLines is 0 or undefined, loads the full file.
 */
export async function loadPreview(
	entry: FileEntry,
	sizeFormat: SizeFormat,
	maxLines?: number,
): Promise<PreviewContent> {
	const metadata: string[] = [];
	let content: string[] = [];
	let isBinary = false;

	// Basic metadata
	if (entry.type === FileType.Directory) {
		const itemCount = await countDirectoryItems(entry.path);
		const dirSize = await getDirectorySize(entry.path);
		metadata.push(`Items: ${itemCount}`);
		metadata.push(`Size: ${formatSize(dirSize, sizeFormat)}`);
	} else {
		metadata.push(`Size: ${formatSize(entry.size, sizeFormat)}`);
	}

	metadata.push(`Modified: ${formatDate(entry.modified)}`);
	metadata.push(`Type: ${getFileTypeDescription(entry)}`);

	// Content preview
	if (entry.type === FileType.File) {
		if (isTextFile(entry)) {
			// Load full file content (no line limit)
			content = await readFilePreview(entry.path, maxLines);
			// Check if content appears to be binary
			if (content.length > 0 && containsNullBytes(content.join('\n'))) {
				content = await readFileHexPreview(entry.path, 256);
				isBinary = true;
			}
		} else {
			content = await readFileHexPreview(entry.path, 256);
			isBinary = true;
		}
	}

	return {
		name: entry.name,
		extension: entry.extension,
		metadata,
		content,
		isBinary,
	};
}

/**
 * Checks if a string contains null bytes (indicating binary content).
 */
function containsNullBytes(str: string): boolean {
	return str.includes('\0');
}

/**
 * Creates a quick preview without loading content (for fast updates).
 */
export function createQuickPreview(entry: FileEntry, sizeFormat: SizeFormat): PreviewContent {
	const metadata: string[] = [];

	if (entry.type === FileType.Directory) {
		metadata.push('Directory');
	} else {
		metadata.push(`Size: ${formatSize(entry.size, sizeFormat)}`);
	}

	metadata.push(`Modified: ${formatDate(entry.modified)}`);
	metadata.push(`Type: ${getFileTypeDescription(entry)}`);

	return {
		name: entry.name,
		extension: entry.extension,
		metadata,
		content: ['Loading...'],
		isBinary: false,
	};
}
