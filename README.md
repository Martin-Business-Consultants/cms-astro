# LibrePublish CMS for Astro

Astro 7+ integrations that make a site on [LibrePublish CMS](https://github.com/Martin-Business-Consultants/opencms)
work the way the CMS expects, on Cloudflare Workers & Pages — clean, minimal
sites that read the CMS predictably.

| Package | What |
|---|---|
| [`@librepublish/astro`](packages/astro) | The integration: content loaders, generated types, `<Blocks>`, `<Image>`, `<Seo>`, sitemap, robots, Cloudflare `_redirects`, cache purges on publish, Site health checks at build, build reports. |
| [`@librepublish/astro-forms`](packages/astro-forms) | `<Form>` with Cloudflare Turnstile, posting straight to the CMS; form emails in the site's design. Needs the CMS's Forms plugin. |
| [`@librepublish/astro-commerce`](packages/astro-commerce) | `<QuoteRequest>`, posting straight to the CMS. Needs the CMS's Commerce plugin. |

They read the CMS's delivery API (`/api/v1`): live content only, one answer
shape, absolute image URLs. See `docs/delivery-api.md` in the CMS.

## Set up a site

```sh
npm install @librepublish/astro @librepublish/astro-forms
```

`.env` (keep it out of git) — a service token on the site's role, from the
CMS's Settings › Service tokens:

```sh
CMS_BASE_URL=https://cms.example.com
CMS_API_TOKEN=…
```

`astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import cms from "@librepublish/astro";
import { cmsForms } from "@librepublish/astro-forms";

export default defineConfig({
  // Leave the adapter out for a fully static site.
  adapter: cloudflare({ prerenderEnvironment: "node" }),
  integrations: [cms(), cmsForms()],
});
```

`src/content.config.ts`:

```ts
import { defineCollection } from "astro:content";
import { cmsAssets, cmsEntries, cmsGlobals, cmsPages } from "@librepublish/astro/loaders";

export const collections = {
  pages: defineCollection({ loader: cmsPages() }),
  posts: defineCollection({ loader: cmsEntries("posts") }),
  globals: defineCollection({ loader: cmsGlobals() }),
  assets: defineCollection({ loader: cmsAssets() }),
};
```

A page route, served where the CMS says each page lives (`url`: `/` for the
home page, `/fr/…` for French):

```astro
---
import { getCollection } from "astro:content";
import Blocks from "@librepublish/astro/components/Blocks.astro";
import Seo from "@librepublish/astro/components/Seo.astro";
import Hero from "../components/Hero.astro";

export async function getStaticPaths() {
  return (await getCollection("pages")).map(({ data }) => ({
    params: { path: data.url.replace(/^\/+/, "") || undefined },
    props: { page: data },
  }));
}
const { page } = Astro.props;
const assets = Object.fromEntries((await getCollection("assets")).map((a) => [a.id, a.data]));
---
<html lang={page.locale}>
  <head><Seo record={page} assets={assets} siteName="Acme" /></head>
  <body><Blocks blocks={page.blocks} components={{ hero: Hero }} assets={assets} /></body>
</html>
```

Types for every block type, collection and global come from the CMS:
`import type { HeroBlock, Collections, Globals } from "librepublish:types"`.

## What publishing does

The build tells the CMS how the site renders. A **static** site (no adapter,
or every page prerendered) is rebuilt on publish — set the CMS's Settings ›
Deploy to a Cloudflare deploy hook, or GitHub. A site that **renders on
demand** gets a signed purge at `/_cms/webhook` naming what changed; set
`CMS_WEBHOOK_SECRET` (Settings › Deploy) and, to purge Cloudflare's cache by
tag, `CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN` (Cache Purge permission)
as the Worker's secrets. Each on-demand response carries a `Cache-Tag` of the
content it used.

On Cloudflare, prerender in Node (`prerenderEnvironment: "node"`): workerd
doesn't read `.env` at build time. At request time the Worker reads
`CMS_BASE_URL` and `CMS_API_TOKEN` from its variables and secrets.

## Held to Site health

`AGENTS.md` gets the CMS's frontend guide and Site health's checklist (the
business's details, the pages a site needs, meta descriptions, alt text…), and
every build warns about checks that fail — or stops with
`cms({ siteHealth: "error" })`. Build so every one passes.

## Develop

```sh
npm install
npm run build   # every package
npm test
```

`examples/minimal` is a working site; point its `.env` at a CMS and run
`npx astro build` (or `SSR=1 npx astro build` for Workers).

Functional Source License 1.1 with an MIT future license, as the CMS ([LICENSE.md](LICENSE.md)).
