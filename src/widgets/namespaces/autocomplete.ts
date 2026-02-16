/**
 * Autocomplete widget namespace.
 *
 * @example
 * ```typescript
 * import { autocomplete } from 'blecsd/widgets';
 * const ac = autocomplete.create(world, { suggestions: ['foo', 'bar'] });
 * ```
 */
import { createAutocomplete, isAutocomplete, resetAutocompleteStore } from '../autocomplete';

export const autocomplete = Object.freeze({
	create: createAutocomplete,
	is: isAutocomplete,
	resetStore: resetAutocompleteStore,
});

export type AutocompleteModule = typeof autocomplete;
