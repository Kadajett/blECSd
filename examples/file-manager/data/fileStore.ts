/**
 * FileStore manages the file data with sorting and filtering.
 * @module data/fileStore
 */

import type { Entity, World } from 'blecsd';
import { sortByName } from '../../../src/utils/helpers';
import { SortDirection, SortField, type FileManagerConfig } from '../config';
import type { FileEntry } from './fileEntry';
import { FileType, fuzzyMatchEntry } from './fileEntry';
import { readDirectory, getParentPath, isRootPath } from './filesystem';
import { getSelectedIndices } from '../components';

/**
 * Fuzzy match info for a file entry.
 */
export interface EntryMatchInfo {
	/** Match score (0-1) */
	readonly score: number;
	/** Matched character indices for highlighting */
	readonly indices: readonly number[];
}

/**
 * FileStore manages file entries outside of ECS.
 * Only UI state (selection, viewport) is in ECS; data is here.
 */
export class FileStore {
	/** Raw entries from filesystem */
	private rawEntries: FileEntry[] = [];
	/** Filtered and sorted entries (what the UI sees) */
	private displayEntries: FileEntry[] = [];
	/** Fuzzy match info for display entries (for highlighting) */
	private matchInfo: Map<number, EntryMatchInfo> = new Map();
	/** Current directory path */
	private _currentPath = '';
	/** Current filter query */
	private _filterQuery = '';
	/** Last error message */
	private _error: string | undefined;

	/**
	 * Current directory path.
	 */
	get currentPath(): string {
		return this._currentPath;
	}

	/**
	 * Number of entries after filtering.
	 */
	get count(): number {
		return this.displayEntries.length;
	}

	/**
	 * Total number of entries before filtering.
	 */
	get totalCount(): number {
		return this.rawEntries.length;
	}

	/**
	 * Current filter query.
	 */
	get filterQuery(): string {
		return this._filterQuery;
	}

	/**
	 * Last error message.
	 */
	get error(): string | undefined {
		return this._error;
	}

	/**
	 * Loads a directory.
	 */
	async loadDirectory(path: string, config: FileManagerConfig): Promise<boolean> {
		const result = await readDirectory(path);

		if (result.error) {
			this._error = result.error;
			return false;
		}

		this._currentPath = result.path;
		this.rawEntries = result.entries;
		this._error = undefined;

		this.applyFiltersAndSort(config);
		return true;
	}

	/**
	 * Navigates to parent directory.
	 */
	async goUp(config: FileManagerConfig): Promise<boolean> {
		if (isRootPath(this._currentPath)) {
			return false;
		}

		const parentPath = getParentPath(this._currentPath);
		return this.loadDirectory(parentPath, config);
	}

	/**
	 * Sets the filter query and reapplies filters.
	 */
	setFilter(query: string, config: FileManagerConfig): void {
		this._filterQuery = query;
		this.applyFiltersAndSort(config);
	}

	/**
	 * Clears the filter.
	 */
	clearFilter(config: FileManagerConfig): void {
		this._filterQuery = '';
		this.applyFiltersAndSort(config);
	}

	/**
	 * Re-sorts the entries with updated config.
	 */
	resort(config: FileManagerConfig): void {
		this.applyFiltersAndSort(config);
	}

	/**
	 * Gets an entry at the given index.
	 */
	getEntryAt(index: number): FileEntry | undefined {
		return this.displayEntries[index];
	}

	/**
	 * Gets all display entries (for debugging/testing).
	 */
	getEntries(): readonly FileEntry[] {
		return this.displayEntries;
	}

	/**
	 * Gets fuzzy match info for an entry at the given index.
	 * Used for highlighting matched characters.
	 */
	getMatchInfo(index: number): EntryMatchInfo | undefined {
		return this.matchInfo.get(index);
	}

	/**
	 * Applies filters and sorting to raw entries.
	 */
	private applyFiltersAndSort(config: FileManagerConfig): void {
		// Clear previous match info
		this.matchInfo.clear();

		// Filter with fuzzy matching
		const matchedEntries: Array<{ entry: FileEntry; score: number; indices: readonly number[] }> = [];

		for (const entry of this.rawEntries) {
			// Hidden files filter
			if (!config.showHidden && entry.isHidden) {
				continue;
			}
			// Search filter with fuzzy matching
			if (this._filterQuery) {
				const matchResult = fuzzyMatchEntry(entry, this._filterQuery);
				if (!matchResult.matches) {
					continue;
				}
				matchedEntries.push({
					entry,
					score: matchResult.score,
					indices: matchResult.indices,
				});
			} else {
				matchedEntries.push({ entry, score: 1, indices: [] });
			}
		}

		// Sort by fuzzy score first (when filtering), then by regular sort
		if (this._filterQuery) {
			// When filtering, sort by fuzzy score descending first
			matchedEntries.sort((a, b) => {
				// Directories still come first
				const aIsDir = a.entry.type === FileType.Directory;
				const bIsDir = b.entry.type === FileType.Directory;
				if (aIsDir && !bIsDir) return -1;
				if (!aIsDir && bIsDir) return 1;
				// Then by fuzzy score (higher score = better match)
				return b.score - a.score;
			});
		} else {
			// Normal sorting when not filtering
			const entries = matchedEntries.map((m) => m.entry);
			const sorted = this.sortEntries(entries, config.sortField, config.sortDirection);
			matchedEntries.length = 0;
			for (const entry of sorted) {
				matchedEntries.push({ entry, score: 1, indices: [] });
			}
		}

		// Store display entries and match info
		this.displayEntries = matchedEntries.map((m) => m.entry);
		for (let i = 0; i < matchedEntries.length; i++) {
			const match = matchedEntries[i];
			if (match && match.indices.length > 0) {
				this.matchInfo.set(i, { score: match.score, indices: match.indices });
			}
		}
	}

	/**
	 * Sorts entries by the specified field and direction.
	 * Directories always come first.
	 * Uses sortByName utility to properly sort hidden files (dot-prefixed) after regular files.
	 */
	private sortEntries(
		entries: FileEntry[],
		field: SortField,
		direction: SortDirection,
	): FileEntry[] {
		// First, separate directories and files
		const directories = entries.filter((e) => e.type === FileType.Directory);
		const files = entries.filter((e) => e.type !== FileType.Directory);

		// Sort each group
		const sortGroup = (group: FileEntry[]): FileEntry[] => {
			if (field === SortField.Name) {
				// Use sortByName for proper dot-prefix handling
				const sorted = sortByName(group);
				return direction === SortDirection.Descending ? sorted.reverse() : sorted;
			}

			const multiplier = direction === SortDirection.Ascending ? 1 : -1;
			return [...group].sort((a, b) => {
				switch (field) {
					case SortField.Size:
						return multiplier * (a.size - b.size);
					case SortField.Modified:
						return multiplier * (a.modified.getTime() - b.modified.getTime());
					case SortField.Type:
						return multiplier * a.extension.localeCompare(b.extension);
					default:
						return 0;
				}
			});
		};

		// Directories first, then files
		return [...sortGroup(directories), ...sortGroup(files)];
	}

	/**
	 * Gets all selected file entries.
	 */
	getSelectedEntries(world: World, listEid: Entity): FileEntry[] {
		const selectedIndices = getSelectedIndices(world, listEid);
		const entries: FileEntry[] = [];

		for (const index of selectedIndices) {
			const entry = this.getEntryAt(index);
			if (entry) {
				entries.push(entry);
			}
		}

		return entries;
	}

	/**
	 * Calculates total size of all entries.
	 */
	getTotalSize(): number {
		return this.rawEntries.reduce((sum, entry) => sum + entry.size, 0);
	}

	/**
	 * Gets the index of an entry by path.
	 */
	findIndexByPath(path: string): number {
		return this.displayEntries.findIndex((entry) => entry.path === path);
	}

	/**
	 * Gets the index of an entry by name.
	 */
	findIndexByName(name: string): number {
		return this.displayEntries.findIndex((entry) => entry.name === name);
	}
}

/**
 * Creates a new FileStore instance.
 */
export function createFileStore(): FileStore {
	return new FileStore();
}
