// A minimal site on LibrePublish CMS: pages from the CMS, a contact form
// posting straight to it. CMS_BASE_URL and CMS_API_TOKEN come from .env.
// SSR=1 builds it for Cloudflare Workers, rendering on demand: the
// integration then adds the purge webhook and the Cache-Tag middleware.
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import cms from "@librepublish/astro";
import { cmsForms } from "@librepublish/astro-forms";

const onDemand = process.env.SSR === "1";

export default defineConfig({
  // Prerender in Node, where the build reads the CMS (workerd doesn't read .env).
  ...(onDemand ? { adapter: cloudflare({ prerenderEnvironment: "node" }) } : {}),
  integrations: [cms(), cmsForms()],
});
