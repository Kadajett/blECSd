/**
 * Component exports.
 * @module components
 */

export {
	Selection,
	selectionBitsetStore,
	type SelectionData,
	setSelection,
	getSelection,
	getCurrentIndex,
	setCurrentIndex,
	moveSelection,
	extendSelection,
	selectFirst,
	selectLast,
	toggleItemSelection,
	isItemSelected,
	selectAll,
	clearItemSelection,
	selectRange,
	getSelectedIndices,
	hasSelection,
	clampSelection,
} from './selection';

export {
	VirtualList,
	type VirtualListData,
	type VirtualListOptions,
	type VisibleRange,
	setVirtualList,
	getVirtualList,
	setTotalItems,
	setVisibleStart,
	setVisibleCount,
	getVisibleRange,
	ensureIndexVisible,
	scrollPage,
	scrollToTop,
	scrollToBottom,
	getScrollPercentage,
	hasVirtualList,
} from './virtualList';

export {
	FileRow,
	type FileRowData,
	setFileRow,
	getFileRow,
	getDataIndex,
	setDataIndex,
	markRowDirty,
	markRowClean,
	isRowDirty,
	isRowEmpty,
	clearRow,
	hasFileRow,
} from './fileRow';

export {
	Preview,
	previewContentStore,
	type PreviewData,
	setPreview,
	getPreview,
	setPreviewIndex,
	setPreviewContent,
	getPreviewContent,
	setPreviewLoading,
	isPreviewLoading,
	scrollPreview,
	getPreviewScroll,
	resetPreviewScroll,
	hasPreview,
	clearPreview,
} from './preview';
