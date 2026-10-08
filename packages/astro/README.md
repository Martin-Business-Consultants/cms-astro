# @librepublish/astro

The Astro integration for [LibrePublish CMS](https://github.com/Martin-Business-Consultants/cmsv2).
See the [repository README](../../README.md) for setting up a site.

```js
import cms from "@librepublish/astro";
export default defineConfig({ integrations: [cms()] });
```

## Options

| Option | Default | |
|---|---|---|
| `url`, `token` | `CMS_BASE_URL`, `CMS_API_TOKEN` | Where the CMS is, and the site's service token. |
| `i18n` | `true` | Configure Astro's i18n from the CMS's locales (every one but the default a path prefix). |
| `sitemap` | `true` | Add `/sitemap.xml` and (unless `public/robots.txt` exists) `/robots.txt`. |
| `redirects` | `true` | Write the CMS's redirects into `_redirects` after a build (after the site's own rules). |
| `siteHealth` | `"warn"` | Warn about failing Site health checks after a build; `"error"` stops it; `"off"`. |
| `agentsMd` | `true` | Keep the CMS's guide and the Site health checklist in `AGENTS.md`. |
| `report` | `true` | Tell the CMS each build ran, how the site renders and the content it used. |

## Entry points

- `@librepublish/astro/loaders` — `cmsPages({ locale? })`, `cmsEntries(collection, { locale? })`, `cmsGlobals()`, `cmsAssets()`: content collections, read incrementally from `/api/v1/content`.
- `@librepublish/astro/live` — `cmsLivePages()`, `cmsLiveEntries(collection)`: live collections for on-demand pages, with cache hints.
- `@librepublish/astro/client` — `createClient({ url, token })`, `linkHref(link)`, and the API's types. On an on-demand page, `Astro.locals.cms` is a client for the request.
- `@librepublish/astro/components/Blocks.astro`, `Image.astro`, `Seo.astro`.
- `librepublish:types` — generated from the CMS's schema on every build.
