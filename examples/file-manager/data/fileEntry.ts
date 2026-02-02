/**
 * FileEntry type definitions.
 * @module data/fileEntry
 */

/**
 * File type enumeration.
 */
export enum FileType {
	File = 0,
	Directory = 1,
	Symlink = 2,
	Other = 3,
}

/**
 * Represents a file or directory entry.
 */
export interface FileEntry {
	/** File name (basename only) */
	readonly name: string;
	/** Full path */
	readonly path: string;
	/** File type */
	readonly type: FileType;
	/** File size in bytes (0 for directories) */
	readonly size: number;
	/** Last modified date */
	readonly modified: Date;
	/** Whether this is a hidden file (starts with .) */
	readonly isHidden: boolean;
	/** Whether this is executable */
	readonly isExecutable: boolean;
	/** File extension (lowercase, without dot) */
	readonly extension: string;
}

/**
 * Creates a FileEntry from stats.
 */
export function createFileEntry(
	name: string,
	path: string,
	type: FileType,
	size: number,
	modified: Date,
	isExecutable = false,
): FileEntry {
	const isHidden = name.startsWith('.');
	const extension = type === FileType.File ? getExtension(name) : '';

	return {
		name,
		path,
		type,
		size,
		modified,
		isHidden,
		isExecutable,
		extension,
	};
}

/**
 * Gets the file extension (lowercase, without dot).
 */
function getExtension(name: string): string {
	const lastDot = name.lastIndexOf('.');
	if (lastDot <= 0) return '';
	return name.slice(lastDot + 1).toLowerCase();
}

/**
 * Checks if a file entry is a directory.
 */
export function isDirectory(entry: FileEntry): boolean {
	return entry.type === FileType.Directory;
}

import { fuzzyTest, fuzzyMatch } from '../../../src/utils/fuzzySearch';

/**
 * Checks if a file entry matches a filter query using fuzzy matching.
 */
export function matchesFilter(entry: FileEntry, query: string): boolean {
	if (!query) return true;
	return fuzzyTest(query, entry.name, { threshold: 0.3 });
}

/**
 * Result of fuzzy matching a file entry.
 */
export interface FuzzyMatchResult {
	/** Whether the entry matches */
	readonly matches: boolean;
	/** Match score (0-1, higher is better) */
	readonly score: number;
	/** Indices of matched characters in the name */
	readonly indices: readonly number[];
}

/**
 * Performs fuzzy matching on a file entry and returns match details.
 */
export function fuzzyMatchEntry(entry: FileEntry, query: string): FuzzyMatchResult {
	if (!query) {
		return { matches: true, score: 1, indices: [] };
	}
	const result = fuzzyMatch(query, entry.name, { threshold: 0.3 });
	if (!result) {
		return { matches: false, score: 0, indices: [] };
	}
	return {
		matches: true,
		score: result.score,
		indices: result.indices,
	};
}

/**
 * File type categories for icon selection.
 */
export type FileCategory =
	| 'directory'
	| 'file'
	| 'symlink'
	| 'executable'
	| 'image'
	| 'audio'
	| 'video'
	| 'archive'
	| 'code'
	| 'text'
	| 'document';

/**
 * Gets the category of a file for icon/color purposes.
 */
export function getFileCategory(entry: FileEntry): FileCategory {
	if (entry.type === FileType.Directory) return 'directory';
	if (entry.type === FileType.Symlink) return 'symlink';
	if (entry.isExecutable) return 'executable';

	const ext = entry.extension;

	// Images
	if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) {
		return 'image';
	}

	// Audio
	if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
		return 'audio';
	}

	// Video
	if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv'].includes(ext)) {
		return 'video';
	}

	// Archives
	if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'].includes(ext)) {
		return 'archive';
	}

	// Code
	if (['js', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'c', 'cpp', 'h', 'java', 'rb', 'php', 'sh', 'bash'].includes(ext)) {
		return 'code';
	}

	// Documents
	if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt'].includes(ext)) {
		return 'document';
	}

	// Text
	if (['txt', 'md', 'json', 'yaml', 'yml', 'xml', 'csv', 'log', 'ini', 'conf'].includes(ext)) {
		return 'text';
	}

	return 'file';
}
