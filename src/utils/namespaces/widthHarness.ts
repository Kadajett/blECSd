/**
 * Unicode width testing harness namespace.
 *
 * @example
 * ```typescript
 * import { widthHarness } from 'blecsd/utils';
 *
 * const corpus = widthHarness.buildTestCorpus();
 * const results = widthHarness.runWidthTests(corpus);
 * const report = widthHarness.formatTestReport(results);
 * widthHarness.installWidthOverrides(profile);
 * ```
 */

import {
	buildTestCorpus,
	clearWidthOverrides,
	filterByCategory,
	formatTestReport,
	getCategories,
	getKnownBadSequences,
	getOverrideCount,
	getOverrideWidth,
	installWidthOverrides,
	measureWidthWithOverrides,
	runWidthTests,
	TerminalWidthProfileSchema,
	WidthOverrideSchema,
} from '../unicode/widthHarness';

export const widthHarness = Object.freeze({
	buildTestCorpus,
	runWidthTests,
	formatTestReport,
	installWidthOverrides,
	clearWidthOverrides,
	getOverrideWidth,
	measureWidthWithOverrides,
	getOverrideCount,
	getKnownBadSequences,
	getCategories,
	filterByCategory,
	TerminalWidthProfileSchema,
	WidthOverrideSchema,
});

export type WidthHarnessModule = typeof widthHarness;
