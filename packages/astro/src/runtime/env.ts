/**
 * The CMS connection when a page renders: from astro:env (CMS_BASE_URL and
 * CMS_API_TOKEN; on Cloudflare, the Worker's variables and secrets), or, while
 * the build prerenders in Node, the connection the integration resolved.
 *
 * On Cloudflare, prerender in Node — `cloudflare({ prerenderEnvironment:
 * "node" })` — or give workerd the variables (.dev.vars, or `vars` and
 * secrets in wrangler's config): workerd doesn't read .env at build time.
 */
import { getSecret } from "astro:env/server";
import { createClient, type CmsClient } from "../client.js";

const BUILD = Symbol.for("librepublish.astro.connection");

export function runtimeConnection(): { url: string; token: string } {
  const url = getSecret("CMS_BASE_URL");
  const token = getSecret("CMS_API_TOKEN");
  if (url && token) return { url, token };

  const built = (globalThis as Record<symbol, { url: string; token: string } | undefined>)[BUILD];
  if (built) return built;

  throw new Error(
    "@librepublish/astro: CMS_BASE_URL and CMS_API_TOKEN aren't set where this page renders. " +
    "On Cloudflare, set them as the Worker's variables and secrets; for prerendering at build time, " +
    'use cloudflare({ prerenderEnvironment: "node" }) or put them in .dev.vars.',
  );
}

export function runtimeClient(): CmsClient {
  return createClient(runtimeConnection());
}
