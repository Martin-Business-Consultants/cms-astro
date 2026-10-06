/**
 * For pages rendered on demand: `Astro.locals.cms` is a client for the
 * request, and the response says what content it was built from in a
 * Cache-Tag header (the CMS's tags: page:about, collection:posts, …), so a
 * publish purges exactly those pages (runtime/webhook.ts). Prerendered pages
 * are left alone.
 */
import { defineMiddleware } from "astro:middleware";
import { runtimeClient } from "./env.js";

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) return next();

  const cms = runtimeClient();
  context.locals.cms = cms;
  const response = await next();
  if (cms.tags.size > 0 && !response.headers.has("Cache-Tag")) {
    try {
      response.headers.set("Cache-Tag", [...cms.tags].join(","));
    } catch {
      // A response with immutable headers (a redirect, say) keeps them.
    }
  }
  return response;
});
