/**
 * Data layer exports.
 * @module data
 */

export { FileType, type FileEntry, createFileEntry, isDirectory, matchesFilter, fuzzyMatchEntry, getFileCategory, type FileCategory, type FuzzyMatchResult } from './fileEntry';
export { FileStore, createFileStore, type EntryMatchInfo } from './fileStore';
export {
	readDirectory,
	getParentPath,
	isRootPath,
	getHomePath,
	fileExists,
	readFilePreview,
	readFileHexPreview,
	countDirectoryItems,
	getDirectorySize,
	type ReadDirectoryResult,
} from './filesystem';
export { loadPreview, createQuickPreview, EMPTY_PREVIEW, type PreviewContent } from './preview';
