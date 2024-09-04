import { z } from 'zod';
import { SNAKE_CASE_REGEX } from './regexes';

const ResolvedPagePrefOptionSchema = z
  .object({
    // The value of the option, to be used in routes and params
    id: z.string().regex(SNAKE_CASE_REGEX),
    // The display name of the option in the UI
    displayName: z.string()
  })
  .strict();

export const ResolvedPagePrefSchema = z
  .object({
    // The unique ID of the variable
    id: z.string().regex(SNAKE_CASE_REGEX),
    // The display name of the preference in the UI
    displayName: z.string(),
    defaultValue: z.string().regex(SNAKE_CASE_REGEX),
    options: z.array(ResolvedPagePrefOptionSchema),
    currentValue: z.string().regex(SNAKE_CASE_REGEX)
  })
  .strict();

/**
 * A ResolvedPagePref object contains the current value
 * and the current available options for a page pref.
 * Page prefs are resolved by combining data from
 * several sources, such as the page's URL, the frontmatter,
 * the default value for the pref,
 * and the user's stored preferences.
 *
 * @example
 * {
 *   id: 'category',
 *   displayName: 'Category',
 *   defaultValue: 'all',
 *   options: [
 *     { id: 'all', displayName: 'All' },
 *     { id: 'news', displayName: 'News' },
 *     { id: 'events', displayName: 'Events' }
 *   ]
 * }
 */
export type ResolvedPagePref = z.infer<typeof ResolvedPagePrefSchema>;

export const ResolvedPagePrefsSchema = z.record(ResolvedPagePrefSchema);

/**
 * A collection of ResolvedPagePref objects, indexed by their
 * unique IDs.
 *
 * Page prefs are resolved by combining data from
 * several sources, such as the page's URL, the frontmatter,
 * the default value for the pref,
 * and the user's stored preferences.
 *
 * @example
 * {
 *   category: {
 *      id: 'category',
 *      displayName: 'Category',
 *      defaultValue: 'all',
 *      options: [
 *        { id: 'all', displayName: 'All' },
 *        { id: 'news', displayName: 'News' },
 *        { id: 'events', displayName: 'Events' }
 *      ]
 *   }
 * }
 */
export type ResolvedPagePrefs = z.infer<typeof ResolvedPagePrefsSchema>;
