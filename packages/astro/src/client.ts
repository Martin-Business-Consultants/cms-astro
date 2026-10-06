/**
 * A small client for the CMS's delivery API (/api/v1): live content only,
 * one answer shape, absolute asset URLs. It runs at build time (loaders, the
 * integration) and at request time (on-demand pages, on Workers too: it only
 * needs fetch).
 *
 *   const cms = createClient({ url: "https://cms.example.com", token: "…" });
 *   const { data: page, included } = await cms.page("about");
 *
 * Every response's Cache-Tag header is collected in `cms.tags`, so a page
 * rendered on demand can say what it was built from (see the middleware).
 */
import type {
  CmsCollection, CmsContent, CmsEntry, CmsGlobal, CmsHealthCheck, CmsPage, CmsRedirect, CmsSchema, CmsSite,
  CmsSitemapUrl, ContentMeta, Envelope, ListMeta,
} from "./types.js";

export type * from "./types.js";

export interface ClientOptions {
  /** The CMS's address, e.g. https://cms.example.com */
  url: string;
  /** A service token on the site's role (Settings › Service tokens). */
  token: string;
  fetch?: typeof fetch;
}

export class CmsError extends Error {
  constructor(message: string, readonly status: number, readonly path: string, readonly body?: unknown) {
    super(message);
    this.name = "CmsError";
  }
}

export type CmsClient = ReturnType<typeof createClient>;

export function createClient({ url, token, fetch: fetcher = globalThis.fetch }: ClientOptions) {
  const base = url.replace(/\/+$/, "");
  const tags = new Set<string>();

  async function request(path: string, accept = "application/json"): Promise<Response> {
    const response = await fetcher(`${base}/api/v1${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: accept },
    });
    response.headers.get("Cache-Tag")?.split(",").forEach((tag) => tag && tags.add(tag.trim()));
    if (!response.ok) {
      let body: unknown;
      try { body = await response.json(); } catch { body = undefined; }
      const reason = response.status === 401 ? "the token was refused" : response.status === 404 ? "not found" : `HTTP ${response.status}`;
      throw new CmsError(`CMS ${path}: ${reason}`, response.status, path, body);
    }
    return response;
  }

  async function get<T, M = Record<string, unknown>>(path: string): Promise<Envelope<T, M>> {
    return (await request(path)).json() as Promise<Envelope<T, M>>;
  }

  /** Every page of a list, followed to the end. */
  async function all<T>(path: string): Promise<{ data: T[]; included: Envelope<T>["included"] }> {
    const data: T[] = [];
    const assets: Record<string, any> = {};
    let page: number | null = 1;
    while (page) {
      const separator = path.includes("?") ? "&" : "?";
      const answer: Envelope<T[], ListMeta> = await get<T[], ListMeta>(`${path}${separator}per=100&page=${page}`);
      data.push(...answer.data);
      Object.assign(assets, answer.included?.assets ?? {});
      page = answer.meta.next_page;
    }
    return { data, included: { assets } };
  }

  const query = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return search ? `?${search}` : "";
  };

  return {
    /** The tags of every answer so far (Cache-Tag), for purging what a page used. */
    tags,
    site: () => get<CmsSite>("/site"),
    /** Every live page, entry and global; with `since` (a previous meta.cursor), only what changed. */
    content: (since?: string) => get<CmsContent, ContentMeta>(`/content${query({ since })}`),
    schema: () => get<CmsSchema>("/schema"),
    pages: (options: { locale?: string } = {}) => all<CmsPage>(`/pages${query(options)}`),
    page: (path: string) => get<CmsPage>(`/pages/${path.replace(/^\/+|\/+$/g, "")}`),
    collections: () => get<CmsCollection[]>("/collections"),
    entries: (collection: string, options: { locale?: string } = {}) =>
      all<CmsEntry>(`/collections/${collection}/entries${query(options)}`),
    entry: (collection: string, slug: string) => get<CmsEntry>(`/collections/${collection}/entries/${slug}`),
    globals: () => get<CmsGlobal[]>("/globals"),
    global: (slug: string) => get<CmsGlobal>(`/globals/${slug}`),
    sitemap: () => get<CmsSitemapUrl[]>("/sitemap"),
    redirects: () => get<CmsRedirect[]>("/redirects"),
    /** The redirects as a Cloudflare _redirects file. */
    redirectsFile: async () => (await request("/redirects.txt", "text/plain")).text(),
    siteHealth: () => get<CmsHealthCheck[], { total: number; passing: number; failing: number; ready: boolean }>("/site_health"),
    /** Any other /api/v1 path a plugin adds (e.g. "/forms/contact"). */
    get,
  };
}

/**
 * Where a CMS link field points, as an href: a URL as it is, a page by its
 * path ("home" is "/"), an entry under its collection. Pass the site's
 * locale for a page or entry in a language other than the default.
 *
 *   <a href={linkHref(item.link)}>{item.label}</a>
 */
export function linkHref(
  link: { kind: string; value: string; collection?: string } | null | undefined,
  options: { locale?: string; defaultLocale?: string } = {},
): string | undefined {
  if (!link?.value) return undefined;
  if (link.kind === "url") return link.value;
  const prefix = options.locale && options.locale !== (options.defaultLocale ?? options.locale) ? `/${options.locale}` : "";
  if (link.kind === "page") {
    const path = link.value.replace(/^\/+|\/+$/g, "");
    return path === "home" || path === "" ? prefix || "/" : `${prefix}/${path}`;
  }
  if (link.kind === "entry") return `${prefix}/${link.collection}/${link.value.replace(/^\/+/, "")}`;
  return undefined;
}
