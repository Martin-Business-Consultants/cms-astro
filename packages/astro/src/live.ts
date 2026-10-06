/**
 * Live collections, for pages rendered on demand that should show a publish
 * at once (src/live.config.ts):
 *
 *   import { defineLiveCollection } from "astro:content";
 *   import { cmsLivePages, cmsLiveEntries } from "@librepublish/astro/live";
 *
 *   export const collections = {
 *     livePages: defineLiveCollection({ loader: cmsLivePages() }),
 *     livePosts: defineLiveCollection({ loader: cmsLiveEntries("posts") }),
 *   };
 *
 * Each answer carries the CMS's cache tags as its cacheHint.
 */
import { runtimeClient } from "./runtime/env.js";
import { CmsError } from "./client.js";
import type { CmsEntry, CmsPage } from "./types.js";

type Hint = { tags?: string[]; lastModified?: Date };
type LiveEntry<T> = { id: string; data: T; cacheHint?: Hint };

const hint = (tags: Iterable<string>, updated?: string): Hint => ({
  tags: [...tags],
  lastModified: updated ? new Date(updated) : undefined,
});

async function attempt<T>(load: () => Promise<T>): Promise<T | { error: Error }> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof CmsError && error.status === 404) return undefined as T;
    return { error: error as Error };
  }
}

export function cmsLivePages() {
  return {
    name: "librepublish-live-pages",
    loadCollection: ({ filter }: { filter?: { locale?: string } }) => attempt(async () => {
      const cms = runtimeClient();
      const { data } = await cms.pages({ locale: filter?.locale });
      return {
        entries: data.map((page): LiveEntry<CmsPage> => ({ id: page.path, data: page, cacheHint: hint([`page:${page.path}`], page.updated_at) })),
        cacheHint: hint(cms.tags),
      };
    }),
    loadEntry: ({ filter }: { filter: { id: string } }) => attempt(async () => {
      const cms = runtimeClient();
      const { data } = await cms.page(filter.id);
      return { id: data.path, data, cacheHint: hint(cms.tags, data.updated_at) } satisfies LiveEntry<CmsPage>;
    }),
  };
}

export function cmsLiveEntries(collection: string) {
  return {
    name: `librepublish-live-entries-${collection}`,
    loadCollection: ({ filter }: { filter?: { locale?: string } }) => attempt(async () => {
      const cms = runtimeClient();
      const { data } = await cms.entries(collection, { locale: filter?.locale });
      return {
        entries: data.map((entry): LiveEntry<CmsEntry> => ({
          id: entry.slug, data: entry, cacheHint: hint([`entry:${collection}/${entry.slug}`], entry.updated_at),
        })),
        cacheHint: hint(cms.tags),
      };
    }),
    loadEntry: ({ filter }: { filter: { id: string } }) => attempt(async () => {
      const cms = runtimeClient();
      const { data } = await cms.entry(collection, filter.id);
      return { id: data.slug, data, cacheHint: hint(cms.tags, data.updated_at) } satisfies LiveEntry<CmsEntry>;
    }),
  };
}
