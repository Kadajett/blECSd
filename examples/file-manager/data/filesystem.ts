/**
 * Filesystem operations for reading directory contents.
 * @module data/filesystem
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileType, createFileEntry, type FileEntry } from './fileEntry';

/**
 * Result of reading a directory.
 */
export interface ReadDirectoryResult {
	readonly path: string;
	readonly entries: FileEntry[];
	readonly error?: string;
}

/**
 * Reads a directory and returns its contents as FileEntry array.
 */
export async function readDirectory(dirPath: string): Promise<ReadDirectoryResult> {
	try {
		const absolutePath = path.resolve(dirPath);
		const entries: FileEntry[] = [];

		const dirents = await fs.promises.readdir(absolutePath, { withFileTypes: true });

		for (const dirent of dirents) {
			const entryPath = path.join(absolutePath, dirent.name);
			const entry = await createEntryFromDirent(dirent, entryPath);
			if (entry) {
				entries.push(entry);
			}
		}

		return { path: absolutePath, entries };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return { path: dirPath, entries: [], error: message };
	}
}

/**
 * Creates a FileEntry from a directory entry.
 */
async function createEntryFromDirent(
	dirent: fs.Dirent,
	entryPath: string,
): Promise<FileEntry | null> {
	try {
		const stats = await fs.promises.stat(entryPath);
		const type = getFileType(dirent, stats);
		const isExecutable = checkExecutable(stats);

		return createFileEntry(
			dirent.name,
			entryPath,
			type,
			stats.size,
			stats.mtime,
			isExecutable,
		);
	} catch {
		// Skip entries we can't stat (permission denied, etc.)
		return null;
	}
}

/**
 * Determines file type from dirent and stats.
 */
function getFileType(dirent: fs.Dirent, stats: fs.Stats): FileType {
	if (dirent.isSymbolicLink()) return FileType.Symlink;
	if (stats.isDirectory()) return FileType.Directory;
	if (stats.isFile()) return FileType.File;
	return FileType.Other;
}

/**
 * Checks if a file is executable (Unix).
 */
function checkExecutable(stats: fs.Stats): boolean {
	// Check if any execute bit is set
	// biome-ignore lint/style/useNumberNamespace: Using octal for clarity
	return (stats.mode & 0o111) !== 0;
}

/**
 * Gets the parent directory path.
 */
export function getParentPath(dirPath: string): string {
	return path.dirname(path.resolve(dirPath));
}

/**
 * Checks if a path is the root directory.
 */
export function isRootPath(dirPath: string): boolean {
	const resolved = path.resolve(dirPath);
	return resolved === path.dirname(resolved);
}

/**
 * Gets the home directory.
 */
export function getHomePath(): string {
	return process.env.HOME ?? '/';
}

/**
 * Checks if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.promises.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Reads the first N lines of a text file.
 * If maxLines is 0 or undefined, reads the entire file.
 */
export async function readFilePreview(filePath: string, maxLines?: number): Promise<string[]> {
	try {
		const content = await fs.promises.readFile(filePath, 'utf-8');
		const lines = content.split('\n');
		if (maxLines && maxLines > 0) {
			return lines.slice(0, maxLines);
		}
		return lines;
	} catch {
		return [];
	}
}

/**
 * Reads the entire text file.
 */
export async function readFullFile(filePath: string): Promise<string[]> {
	return readFilePreview(filePath);
}

/**
 * Reads the first N bytes of a file as hex dump.
 */
export async function readFileHexPreview(filePath: string, maxBytes = 256): Promise<string[]> {
	try {
		const handle = await fs.promises.open(filePath, 'r');
		const buffer = Buffer.alloc(maxBytes);
		const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
		await handle.close();

		const lines: string[] = [];
		for (let i = 0; i < bytesRead; i += 16) {
			const hex = buffer.subarray(i, Math.min(i + 16, bytesRead))
				.toString('hex')
				.match(/.{1,2}/g)
				?.join(' ') ?? '';
			const ascii = buffer.subarray(i, Math.min(i + 16, bytesRead))
				.toString('ascii')
				.replace(/[^\x20-\x7E]/g, '.');
			lines.push(`${i.toString(16).padStart(4, '0')}  ${hex.padEnd(47)}  ${ascii}`);
		}
		return lines;
	} catch {
		return [];
	}
}

/**
 * Counts items in a directory (non-recursive).
 */
export async function countDirectoryItems(dirPath: string): Promise<number> {
	try {
		const entries = await fs.promises.readdir(dirPath);
		return entries.length;
	} catch {
		return 0;
	}
}

/**
 * Gets total size of a directory (non-recursive, just immediate children).
 */
export async function getDirectorySize(dirPath: string): Promise<number> {
	try {
		const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
		let total = 0;

		for (const entry of entries) {
			if (entry.isFile()) {
				try {
					const stats = await fs.promises.stat(path.join(dirPath, entry.name));
					total += stats.size;
				} catch {
					// Skip files we can't stat
				}
			}
		}

		return total;
	} catch {
		return 0;
	}
}
