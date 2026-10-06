/**
 * What the CMS's delivery API (/api/v1) answers. Every answer is
 * `{ data, meta, included? }`; `included.assets` holds the assets the records
 * point at, by id. The fields a site defines (block data, frontmatter, global
 * data) are typed from the CMS's schema by the generated types
 * (.astro/integrations/librepublish/cms.d.ts); here they're open records.
 */

export interface Envelope<T, M = Record<string, unknown>> {
  data: T;
  meta: M;
  included?: { assets?: Record<string, CmsAsset> };
}

export interface ListMeta {
  page: number;
  per: number;
  total: number;
  next_page: number | null;
}

export interface CmsAsset {
  id: number;
  url: string;
  original: string;
  filename: string;
  content_type: string;
  byte_size: number;
  alt: string | null;
  width: number | null;
  height: number | null;
  /** Width-limited renditions, absolute URLs: w640, w1280, w1920. Empty for SVGs. */
  variants?: Record<string, string>;
  thumb_url?: string;
  focal_x?: number;
  focal_y?: number;
  [key: string]: unknown;
}

export interface CmsBlock<D = Record<string, unknown>> {
  id: string;
  type: string;
  version?: number;
  data: D;
}

export interface CmsTerm { id: number; slug: string; title: string }

export interface CmsTranslation { locale: string; path: string }

export interface CmsSeo {
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  noindex?: boolean;
  nofollow?: boolean;
  og_image_id?: string;
  og_title?: string;
  og_description?: string;
  og_type?: string;
  twitter_card?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image_id?: string;
  json_ld?: unknown;
  [key: string]: unknown;
}

export interface CmsPage<F = Record<string, unknown>> {
  id: number;
  path: string;
  slug: string;
  title: string;
  locale: string;
  url: string;
  blocks: CmsBlock[];
  frontmatter: F;
  seo: CmsSeo;
  published_at: string | null;
  updated_at: string;
  category: CmsTerm | null;
  tags: CmsTerm[];
  translations: CmsTranslation[];
}

export interface CmsEntry<F = Record<string, unknown>> {
  id: number;
  slug: string;
  title: string;
  locale: string;
  collection: string;
  url: string;
  frontmatter: F;
  body_markdown: string | null;
  blocks: CmsBlock[] | null;
  seo: CmsSeo;
  published_at: string | null;
  updated_at: string;
  category: CmsTerm | null;
  tags: CmsTerm[];
  translations: CmsTranslation[];
}

export interface CmsGlobal<D = Record<string, unknown>> {
  id: number;
  slug: string;
  name: string;
  data: D;
  updated_at: string;
}

export interface CmsCollection {
  id: number;
  slug: string;
  name: string;
  enable_blocks: boolean;
  fields: unknown[];
}

export interface CmsSite {
  name: string;
  description: string;
  url: string;
  default_locale: string;
  /** Every locale but the default is a path prefix: /fr/… */
  locales: string[];
  contact: Record<string, string>;
  plugins: string[];
  plugin_config: Record<string, any>;
}

export interface CmsContent {
  pages: CmsPage[];
  entries: CmsEntry[];
  globals: CmsGlobal[];
  removed: {
    pages: { id: number; path: string }[];
    entries: { id: number; collection: string; slug: string }[];
    globals: { id: number; slug: string }[];
  };
}

export interface ContentMeta { cursor: string; full: boolean; since: string | null }

export interface CmsSitemapUrl {
  url: string;
  path: string;
  lastmod: string | null;
  changefreq: string;
  priority: number;
  locale: string | null;
  alternates: { locale: string; url: string }[];
}

export interface CmsRedirect { source: string; destination: string; status: number; wildcard: boolean }

export interface CmsHealthCheck {
  key: string;
  group: string;
  title: string;
  detail: string;
  ok: boolean | null;
  state: "passes" | "fails" | "yours_to_judge";
  /** Whether a site is held to it (the rest are how the CMS is run). */
  for_site: boolean;
}

export interface CmsSchema {
  block_types: Record<string, { title: string; version: number; data: JsonSchema }>;
  collections: Record<string, { title: string; enable_blocks: boolean; frontmatter: JsonSchema }>;
  globals: Record<string, { title: string; data: JsonSchema }>;
  pages: Record<string, { title: string; frontmatter: JsonSchema }>;
  seo: JsonSchema;
}

export interface JsonSchema {
  type?: string;
  title?: string;
  description?: string;
  enum?: unknown[];
  format?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  "x-cms-type"?: string;
  [key: string]: unknown;
}
