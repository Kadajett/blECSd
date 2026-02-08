# Parameter Order Audit Report - Issue #1014

## Summary

Found **257 exported functions** that violate the `(world: World, eid: Entity, ...)` parameter order convention.

## Convention

All public functions that accept both `world` and `eid` parameters should follow this order:
```typescript
function name(world: World, eid: Entity, ...otherParams): ReturnType
```

## Violations by File

### Components (157 violations)

#### textInput.ts (29 violations)
- `getCursorPos(eid: Entity): number`
- `getSelection(eid: Entity): [number, number] | null`
- `hasSelection(eid: Entity): boolean`
- `getCursorConfig(eid: Entity): CursorConfig`
- `getText(eid: Entity): string`
- `getMaxLength(eid: Entity): number`
- `isSecret(eid: Entity): boolean`
- `getCensorChar(eid: Entity): string`
- `getPlaceholder(eid: Entity): string`
- `isMultiline(eid: Entity): boolean`
- `getValidator(eid: Entity): ValidationFunction | undefined`
- `getValidationTiming(eid: Entity): ValidationTiming`
- `isValid(eid: Entity): boolean`
- `getValidationError(eid: Entity): string | undefined`
- `isModified(eid: Entity): boolean`
- `isComposing(eid: Entity): boolean`
- `onTextChange(eid: Entity, callback: TextChangeCallback): void`
- `onValidation(eid: Entity, callback: ValidationCallback): void`
- `onCompositionStart(eid: Entity, callback: CompositionCallback): void`
- `onCompositionUpdate(eid: Entity, callback: CompositionCallback): void`
- `onCompositionEnd(eid: Entity, callback: CompositionCallback): void`
- `removeTextChangeCallback(eid: Entity, callback: TextChangeCallback): void`
- `removeValidationCallback(eid: Entity, callback: ValidationCallback): void`
- `removeCompositionCallback(eid: Entity, callback: CompositionCallback): void`
- `clearAllCallbacks(eid: Entity): void`
- `setCursorPos(eid: Entity, pos: number): void`
- `setSelection(eid: Entity, start: number, end: number): void`
- `clearSelection(eid: Entity): void`
- `setCursorConfig(eid: Entity, options: CursorConfigOptions): void`

#### table.ts (19 violations)
- `getTableColumns(eid: Entity): readonly TableColumn[]`
- `setTableColumns(eid: Entity, columns: readonly TableColumn[]): void`
- `getTableRows(eid: Entity): readonly TableRow[]`
- `setTableRows(eid: Entity, rows: readonly TableRow[]): void`
- `getTableCellValue(eid: Entity, row: number, col: number): string`
- `setTableCellValue(eid: Entity, row: number, col: number, value: string): void`
- `getTableStyle(eid: Entity): TableStyleConfig`
- `setTableStyle(eid: Entity, style: TableStyleConfig): void`
- `getTableHeader(eid: Entity): boolean`
- `setTableHeader(eid: Entity, enabled: boolean): void`
- `getTableBorder(eid: Entity): boolean`
- `setTableBorder(eid: Entity, enabled: boolean): void`
- `getTablePadding(eid: Entity): number`
- `setTablePadding(eid: Entity, padding: number): void`
- `addTableRow(eid: Entity, row: TableRow): void`
- `removeTableRow(eid: Entity, index: number): void`
- `clearTableRows(eid: Entity): void`
- `sortTableRows(eid: Entity, columnIndex: number, ascending: boolean): void`
- `getTableColumnWidth(eid: Entity, columnIndex: number): number`

#### slider.ts (17 violations)
- `getSliderValue(eid: Entity): number`
- `getSliderMin(eid: Entity): number`
- `getSliderMax(eid: Entity): number`
- `getSliderStep(eid: Entity): number`
- `getSliderPercentage(eid: Entity): number`
- `getSliderOrientation(eid: Entity): SliderOrientationType`
- `isSliderShowValue(eid: Entity): boolean`
- `getSliderTrackChar(eid: Entity): string`
- `getSliderThumbChar(eid: Entity): string`
- `getSliderFillChar(eid: Entity): string`
- `getSliderTrackColor(eid: Entity): number`
- `getSliderThumbColor(eid: Entity): number`
- `getSliderFillColor(eid: Entity): number`
- `onSliderChange(eid: Entity, callback: SliderChangeCallback): void`
- `offSliderChange(eid: Entity, callback: SliderChangeCallback): void`
- `setShowSliderValue(eid: Entity, show: boolean): void`
- `setSliderOrientation(eid: Entity, orientation: SliderOrientationType): void`

#### progressBar.ts (16 violations)
- `getProgressValue(eid: Entity): number`
- `getProgressMin(eid: Entity): number`
- `getProgressMax(eid: Entity): number`
- `getProgressPercentage(eid: Entity): number`
- `getProgressOrientation(eid: Entity): ProgressOrientationType`
- `getProgressFillChar(eid: Entity): string`
- `getProgressEmptyChar(eid: Entity): string`
- `getProgressFillColor(eid: Entity): number`
- `getProgressEmptyColor(eid: Entity): number`
- `isProgressAnimated(eid: Entity): boolean`
- `getProgressAnimationSpeed(eid: Entity): number`
- `onProgressComplete(eid: Entity, callback: ProgressCompleteCallback): void`
- `offProgressComplete(eid: Entity, callback: ProgressCompleteCallback): void`
- `setProgressOrientation(eid: Entity, orientation: ProgressOrientationType): void`
- `setProgressAnimated(eid: Entity, animated: boolean): void`
- `setProgressAnimationSpeed(eid: Entity, speed: number): void`

#### select.ts (15 violations)
- `getSelectOptions(eid: Entity): readonly SelectOption[]`
- `setSelectOptions(eid: Entity, options: readonly SelectOption[]): void`
- `getSelectedOption(eid: Entity): SelectOption | undefined`
- `getSelectedIndex(eid: Entity): number`
- `getSelectPlaceholder(eid: Entity): string`
- `setSelectPlaceholder(eid: Entity, placeholder: string): void`
- `isSelectOpen(eid: Entity): boolean`
- `openSelect(eid: Entity): void`
- `closeSelect(eid: Entity): void`
- `toggleSelect(eid: Entity): void`
- `addSelectOption(eid: Entity, option: SelectOption): void`
- `removeSelectOption(eid: Entity, index: number): void`
- `clearSelectOptions(eid: Entity): void`
- `onSelectChange(eid: Entity, callback: SelectChangeCallback): void`
- `offSelectChange(eid: Entity, callback: SelectChangeCallback): void`

#### radioButton.ts (11 violations)
- `getRadioValue(eid: Entity): string`
- `getRadioSetValue(eid: Entity): string`
- `isRadioSelected(eid: Entity): boolean`
- `getRadioSelectedChar(eid: Entity): string`
- `getRadioUnselectedChar(eid: Entity): string`
- `getRadioLabel(eid: Entity): string`
- `setRadioLabel(eid: Entity, label: string): void`
- `onRadioChange(eid: Entity, callback: RadioChangeCallback): void`
- `offRadioChange(eid: Entity, callback: RadioChangeCallback): void`
- `setRadioButtonDisplay(eid: Entity, options: RadioButtonDisplayOptions): void`
- `selectRadioButton(eid: Entity): void`

#### checkbox.ts (5 violations)
- `isCheckboxChecked(eid: Entity): boolean`
- `getCheckboxLabel(eid: Entity): string`
- `setCheckboxLabel(eid: Entity, label: string): void`
- `onCheckboxChange(eid: Entity, callback: CheckboxChangeCallback): void`
- `offCheckboxChange(eid: Entity, callback: CheckboxChangeCallback): void`

#### form.ts (5 violations)
- `getFormFields(eid: Entity): readonly Entity[]`
- `getFormValues(eid: Entity): Record<string, unknown>`
- `isFormValid(eid: Entity): boolean`
- `getFormErrors(eid: Entity): Record<string, string>`
- `registerFormField(eid: Entity, field: Entity, name: string): void`

#### spinner.ts (7 violations)
- `getSpinnerFrame(eid: Entity): number`
- `getSpinnerFrames(eid: Entity): readonly string[]`
- `getSpinnerInterval(eid: Entity): number`
- `isSpinnerRunning(eid: Entity): boolean`
- `setSpinnerFrames(eid: Entity, frames: readonly string[]): void`
- `setSpinnerInterval(eid: Entity, interval: number): void`
- `resetSpinner(eid: Entity): void`

#### terminalBuffer.ts (6 violations)
- `getTerminalBuffer(eid: Entity): TerminalBuffer`
- `getTerminalScrollback(eid: Entity): string[]`
- `getTerminalScrollPosition(eid: Entity): number`
- `setTerminalScrollPosition(eid: Entity, position: number): void`
- `clearTerminalBuffer(eid: Entity): void`
- `writeToTerminalBuffer(eid: Entity, data: string): void`

#### list/* submodules (40+ violations)

##### list/callbacks.ts (5 violations)
- `onListSelect(eid: Entity, callback: ListSelectCallback): void`
- `onListActivate(eid: Entity, callback: ListActivateCallback): void`
- `onListCancel(eid: Entity, callback: ListCancelCallback): void`
- `offListSelect(eid: Entity, callback: ListSelectCallback): void`
- `offListActivate(eid: Entity, callback: ListActivateCallback): void`

##### list/display.ts (3 violations)
- `setListDisplay(eid: Entity, display: ListDisplayConfig): void`
- `getListDisplay(eid: Entity): ListDisplayConfig`
- `getListItemPrefix(eid: Entity, index: number): string`

##### list/filter.ts (2 violations)
- `getListFilter(eid: Entity): ((item: ListItem) => boolean) | undefined`
- `setListFilter(eid: Entity, filter: ((item: ListItem) => boolean) | undefined): void`

##### list/items.ts (8 violations)
- `getItems(eid: Entity): readonly ListItem[]`
- `getItem(eid: Entity, index: number): ListItem | undefined`
- `getItemCount(eid: Entity): number`
- `addItem(eid: Entity, item: ListItem): void`
- `removeItem(eid: Entity, index: number): void`
- `updateItem(eid: Entity, index: number, item: ListItem): void`
- `clearItems(eid: Entity): void`
- `setItems(eid: Entity, items: readonly ListItem[]): void`

##### list/multiSelect.ts (7 violations)
- `setListMultiSelect(eid: Entity, enabled: boolean): void`
- `isListMultiSelect(eid: Entity): boolean`
- `getMultiSelectIndices(eid: Entity): readonly number[]`
- `toggleMultiSelect(eid: Entity, index: number): void`
- `clearMultiSelection(eid: Entity): void`
- `selectAllItems(eid: Entity): void`
- `invertSelection(eid: Entity): void`

##### list/options.ts (4 violations)
- `isListInteractive(eid: Entity): boolean`
- `isListMouseEnabled(eid: Entity): boolean`
- `isListKeysEnabled(eid: Entity): boolean`
- `setListInputMode(eid: Entity, mode: ListInputMode): void`

##### list/rendering.ts (1 violation)
- `renderListItems(eid: Entity, visibleIndices: readonly number[]): string[]`

##### list/search.ts (4 violations)
- `isListSearchEnabled(eid: Entity): boolean`
- `getListSearchQuery(eid: Entity): string`
- `setListSearchQuery(eid: Entity, query: string): void`
- `clearListSearch(eid: Entity): void`

##### list/selection.ts (4 violations)
- `getSelectedIndex(eid: Entity): number`
- `getSelectedItem(eid: Entity): ListItem | undefined`
- `isItemSelected(eid: Entity, index: number): boolean`
- `getSelectedIndices(eid: Entity): readonly number[]`

##### list/virtualization.ts (10 violations)
- `getFirstVisible(eid: Entity): number`
- `getLastVisible(eid: Entity): number`
- `getVisibleCount(eid: Entity): number`
- `getTotalCount(eid: Entity): number`
- `getScrollOffset(eid: Entity): number`
- `getMaxScroll(eid: Entity): number`
- `isFullyLoaded(eid: Entity): boolean`
- `getLoadedRange(eid: Entity): [number, number]`
- `ensureIndexVisible(eid: Entity, index: number): void`
- `scrollToIndex(eid: Entity, index: number): void`

### Core Systems (31 violations)

#### effects.ts (11 violations)
- `getStoredStyle(eid: Entity): StoredStyle | undefined`
- `hasStoredStyle(eid: Entity): boolean`
- `clearStoredStyle(eid: Entity): void`
- `hasFocusEffectApplied(eid: Entity): boolean`
- `hasHoverEffectApplied(eid: Entity): boolean`
- `getOriginalStyle(eid: Entity): StoredStyle | undefined`
- `applyTemporaryStyle(eid: Entity, style: StyleOptions): void`
- `removeTemporaryStyle(eid: Entity): void`
- `hasTemporaryStyle(eid: Entity): boolean`
- `storeCurrentStyle(eid: Entity): void`
- `restoreStoredStyle(eid: Entity): void`

#### entityData.ts (9 violations)
- `setEntityData(eid: Entity, key: string, value: unknown): void`
- `getEntityData(eid: Entity, key: string): unknown`
- `hasEntityData(eid: Entity, key: string): boolean`
- `deleteEntityData(eid: Entity, key: string): boolean`
- `clearEntityData(eid: Entity): void`
- `getAllEntityData(eid: Entity): Record<string, unknown> | undefined`
- `setEntityMetadata(eid: Entity, metadata: Record<string, unknown>): void`
- `mergeEntityData(eid: Entity, data: Record<string, unknown>): void`
- `getEntityDataKeys(eid: Entity): string[]`

#### lifecycleEvents.ts (4 violations)
- `onEntityCreated(eid: Entity, callback: LifecycleCallback): void`
- `onEntityDestroyed(eid: Entity, callback: LifecycleCallback): void`
- `offEntityCreated(eid: Entity, callback: LifecycleCallback): void`
- `offEntityDestroyed(eid: Entity, callback: LifecycleCallback): void`

#### other core violations (7 total)
- Various utility functions in core modules

### Systems (24 violations)

#### virtualizedRenderSystem.ts (8 violations)
- `getVirtualViewport(eid: Entity): VirtualViewport`
- `setVirtualViewport(eid: Entity, viewport: VirtualViewport): void`
- `isInVirtualViewport(eid: Entity, x: number, y: number): boolean`
- `getVirtualScrollOffset(eid: Entity): { x: number; y: number }`
- `setVirtualScrollOffset(eid: Entity, x: number, y: number): void`
- `getVirtualDimensions(eid: Entity): { width: number; height: number }`
- `updateVirtualViewport(eid: Entity): void`
- `resetVirtualViewport(eid: Entity): void`

#### smoothScroll.ts (7 violations)
- `getSmoothScrollState(eid: Entity): SmoothScrollState | undefined`
- `isSmoothScrolling(eid: Entity): boolean`
- `getSmoothScrollTarget(eid: Entity): number | undefined`
- `setSmoothScrollTarget(eid: Entity, target: number): void`
- `cancelSmoothScroll(eid: Entity): void`
- `getSmoothScrollDuration(eid: Entity): number`
- `setSmoothScrollDuration(eid: Entity, duration: number): void`

#### dragSystem.ts (5 violations)
- `isDragging(eid: Entity): boolean`
- `getDragOffset(eid: Entity): { x: number; y: number } | undefined`
- `startDrag(eid: Entity, x: number, y: number): void`
- `updateDrag(eid: Entity, x: number, y: number): void`
- `endDrag(eid: Entity): void`

#### other system violations (4 total)
- Various system utility functions

### Widgets (23 violations)

#### hoverText.ts (4 violations)
- `getHoverText(eid: Entity): string`
- `setHoverText(eid: Entity, text: string): void`
- `getHoverDelay(eid: Entity): number`
- `setHoverDelay(eid: Entity, delay: number): void`

#### image.ts (3 violations)
- `getImageData(eid: Entity): ImageData | undefined`
- `setImageData(eid: Entity, data: ImageData): void`
- `clearImageData(eid: Entity): void`

#### video.ts (3 violations)
- `getVideoFrame(eid: Entity): VideoFrame | undefined`
- `setVideoFrame(eid: Entity, frame: VideoFrame): void`
- `isVideoPlaying(eid: Entity): boolean`

#### viewport3d.ts (3 violations)
- `getViewport3D(eid: Entity): Viewport3DData | undefined`
- `updateViewport3D(eid: Entity, data: Partial<Viewport3DData>): void`
- `clearViewport3D(eid: Entity): void`

#### prompt.ts (3 violations)
- `getPromptMessage(eid: Entity): string`
- `setPromptMessage(eid: Entity, message: string): void`
- `getPromptResult(eid: Entity): string | undefined`

#### fileManager.ts (3 violations)
- `getCurrentPath(eid: Entity): string`
- `getSelectedFile(eid: Entity): FileEntry | undefined`
- `getFileList(eid: Entity): readonly FileEntry[]`

#### other widget violations (4 total)
- Various widget utility functions

### 3D Components (6 violations)

#### transform3d.ts (3 violations)
- `getPosition3D(eid: Entity): Vector3`
- `getRotation3D(eid: Entity): Quaternion`
- `getScale3D(eid: Entity): Vector3`

#### camera3d.ts (3 violations)
- `getCameraFov(eid: Entity): number`
- `getCameraAspect(eid: Entity): number`
- `getCameraNear(eid: Entity): number`

### Other (16 violations)
Various utility and helper functions across the codebase.

## Recommended Fix Strategy

Given the massive scope (257 functions, potentially thousands of call sites), I recommend:

### Option 1: Complete Fix (Recommended for consistency)
1. Update all 257 function signatures to include `world` as first parameter
2. Update all call sites (use TypeScript compiler to find them)
3. Run full test suite
4. Single large PR for atomic consistency

**Pros:** Complete consistency, clear convention enforced
**Cons:** Very large PR, high risk of merge conflicts

### Option 2: Incremental by Module
1. Fix components first (157 violations)
2. Fix core systems (31 violations)
3. Fix systems (24 violations)
4. Fix widgets (23 violations)
5. Fix 3D (6 violations)
6. Fix misc (16 violations)

**Pros:** Smaller PRs, easier review
**Cons:** Inconsistency during transition, multiple PRs

### Option 3: Prioritize Critical APIs
1. Identify most-used public APIs
2. Fix those first
3. Leave less-used APIs for later

**Pros:** Quick wins on important functions
**Cons:** Inconsistency remains, incomplete solution

## Implementation Notes

- Most getters don't actually use `world` internally - they only read from stores
- Adding `world` parameter is for API consistency, not functional necessity
- TypeScript will catch all call site mismatches during compilation
- Tests will need significant updates
- Documentation and examples will need updates

## Next Steps

Awaiting team lead direction on which strategy to pursue.
