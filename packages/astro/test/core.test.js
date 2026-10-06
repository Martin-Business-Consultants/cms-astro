import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createClient, CmsError } from "../dist/client.js";
import { generateTypes } from "../dist/codegen.js";
import { keepConnection } from "../dist/connection.js";
import { cmsPages, cmsEntries } from "../dist/loaders.js";
import { healthChecklist } from "../dist/build-checks.js";

const envelope = (data, meta = {}, included) => ({ data, meta, ...(included ? { included } : {}) });

function fakeFetch(routes) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    const path = new URL(url).pathname + new URL(url).search;
    const route = routes[path] ?? routes[new URL(url).pathname];
    if (!route) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    const { body, status = 200, headers = {} } = typeof route === "function" ? route(path) : route;
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });
  };
  return { fetcher, calls };
}

test("the client sends the token, unwraps nothing and collects cache tags", async () => {
  const { fetcher, calls } = fakeFetch({
    "/api/v1/pages/about": { body: envelope({ path: "about" }), headers: { "Cache-Tag": "page:about,pages" } },
  });
  const cms = createClient({ url: "https://cms.test/", token: "t0k", fetch: fetcher });
  const { data } = await cms.page("/about/");
  assert.equal(data.path, "about");
  assert.equal(calls[0].url, "https://cms.test/api/v1/pages/about");
  assert.equal(calls[0].init.headers.Authorization, "Bearer t0k");
  assert.deepEqual([...cms.tags], ["page:about", "pages"]);
});

test("the client follows every page of a list and merges the assets", async () => {
  const { fetcher } = fakeFetch({
    "/api/v1/pages?per=100&page=1": { body: envelope([{ path: "a" }], { next_page: 2 }, { assets: { 1: { id: 1 } } }) },
    "/api/v1/pages?per=100&page=2": { body: envelope([{ path: "b" }], { next_page: null }, { assets: { 2: { id: 2 } } }) },
  });
  const cms = createClient({ url: "https://cms.test", token: "t", fetch: fetcher });
  const { data, included } = await cms.pages();
  assert.deepEqual(data.map((page) => page.path), ["a", "b"]);
  assert.deepEqual(Object.keys(included.assets), ["1", "2"]);
});

test("a refused token is a CmsError that says so", async () => {
  const { fetcher } = fakeFetch({ "/api/v1/site": { body: { error: "unauthorized" }, status: 401 } });
  const cms = createClient({ url: "https://cms.test", token: "bad", fetch: fetcher });
  await assert.rejects(cms.site(), (error) => error instanceof CmsError && error.status === 401 && /refused/.test(error.message));
});

test("types come from the schema, with the CMS's field types", () => {
  const ts = generateTypes({
    block_types: { hero_banner: { title: "Hero", version: 1, data: { type: "object", required: ["heading"], properties: {
      heading: { type: "string", title: "Heading", "x-cms-type": "string" },
      image: { type: "string", "x-cms-type": "asset" },
      cta: { type: "object", "x-cms-type": "link", properties: {} },
      size: { type: "string", enum: ["s", "l"], "x-cms-type": "select" },
      items: { type: "array", items: { type: "object", properties: { label: { type: "string" } } }, "x-cms-type": "repeater" },
    } } } },
    collections: { posts: { title: "Posts", enable_blocks: false, frontmatter: { type: "object", properties: { cover: { type: "string", "x-cms-type": "asset" } } } } },
    globals: { footer: { title: "Footer", data: { type: "object", properties: {} } } },
    pages: {},
    seo: { type: "object", properties: { meta_title: { type: "string" } } },
  });
  assert.match(ts, /declare module "librepublish:types"/);
  assert.match(ts, /export type HeroBannerBlock = \{/);
  assert.match(ts, /"heading": string;/);
  assert.match(ts, /"image"\?: AssetId;/);
  assert.match(ts, /"cta"\?: Link;/);
  assert.match(ts, /"size"\?: "s" \| "l";/);
  assert.match(ts, /"items"\?: Array<\{/);
  assert.match(ts, /"hero_banner": HeroBannerBlock;/);
  assert.match(ts, /"posts": CmsEntry<PostsFields>;/);
  assert.match(ts, /"footer": CmsGlobal<FooterGlobal>;/);
});

function fakeContext(meta = {}) {
  const entries = new Map();
  return {
    entries,
    context: {
      store: { set: (entry) => entries.set(entry.id, entry), delete: (id) => entries.delete(id), clear: () => entries.clear() },
      meta: { get: (key) => meta[key], set: (key, value) => { meta[key] = value; } },
      parseData: async ({ data }) => data,
      generateDigest: (data) => JSON.stringify(data).length.toString(),
      logger: { info() {} },
    },
    meta,
  };
}

test("loaders load everything, then apply what changed and drop what stopped being live", async () => {
  const content = {
    "/api/v1/content": { body: envelope({ pages: [{ path: "about" }, { path: "gone" }], entries: [{ collection: "posts", slug: "hi" }, { collection: "news", slug: "x" }], globals: [], removed: { pages: [], entries: [], globals: [] } }, { cursor: "c1", full: true }) },
    "/api/v1/content?since=c1": { body: envelope({ pages: [{ path: "about", title: "New" }], entries: [], globals: [], removed: { pages: [{ id: 2, path: "gone" }], entries: [], globals: [] } }, { cursor: "c2", full: false }) },
  };
  const { fetcher } = fakeFetch(content);
  globalThis.fetch = fetcher;
  keepConnection({ url: "https://cms.test", token: "t" });

  const pages = fakeContext();
  await cmsPages().load(pages.context);
  assert.deepEqual([...pages.entries.keys()], ["about", "gone"]);
  assert.equal(pages.meta.cursor, "c1");

  const posts = fakeContext();
  await cmsEntries("posts").load(posts.context);
  assert.deepEqual([...posts.entries.keys()], ["hi"]);

  await new Promise((resolve) => setTimeout(resolve, 10));
  await cmsPages().load(pages.context);
  assert.deepEqual([...pages.entries.keys()], ["about"]);
  assert.equal(pages.entries.get("about").data.title, "New");
  assert.equal(pages.meta.cursor, "c2");
});

test("Site health becomes a checklist grouped as the CMS groups it", () => {
  const md = healthChecklist([
    { key: "a", group: "Pages a site needs", title: "Privacy policy", detail: "Required.", ok: false, state: "fails" },
    { key: "b", group: "Pages a site needs", title: "Terms", detail: "Expected.", ok: true, state: "passes" },
    { key: "c", group: "Business details", title: "Profile matches", detail: "Check it.", ok: null, state: "yours_to_judge" },
  ]);
  assert.match(md, /### Pages a site needs\n- \[ \] \*\*Privacy policy\*\* — Required\.\n- \[x\] \*\*Terms\*\*/);
  assert.match(md, /Profile matches\*\* — Check it\. _\(yours to judge\)_/);
});

test("the purge webhook takes only the CMS's signature", async () => {
  const { verify } = await import("../dist/runtime/signature.js");
  const body = JSON.stringify({ event: "cms.purge", tags: ["page:about"] });
  const good = `sha256=${createHmac("sha256", "s3cret").update(body).digest("hex")}`;
  assert.equal(await verify(body, good, "s3cret"), true);
  assert.equal(await verify(body, good, "other"), false);
  assert.equal(await verify(body + " ", good, "s3cret"), false);
  assert.equal(await verify(body, null, "s3cret"), false);
});

test("linkHref turns a CMS link into an href, home at the root", async () => {
  const { linkHref } = await import("../dist/client.js");
  assert.equal(linkHref({ kind: "url", value: "https://x.test" }), "https://x.test");
  assert.equal(linkHref({ kind: "page", value: "home" }), "/");
  assert.equal(linkHref({ kind: "page", value: "about/team" }), "/about/team");
  assert.equal(linkHref({ kind: "page", value: "home" }, { locale: "fr", defaultLocale: "en" }), "/fr");
  assert.equal(linkHref({ kind: "entry", value: "hello", collection: "posts" }), "/posts/hello");
  assert.equal(linkHref(null), undefined);
});
