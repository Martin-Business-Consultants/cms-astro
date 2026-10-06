# Minimal example

A working site on LibrePublish CMS: pages and posts from the CMS, a contact
form posting straight to it, sitemap, robots, redirects.

```sh
cp .env.example .env   # CMS_BASE_URL and a site token
npx astro build        # static
SSR=1 npx astro build  # for Cloudflare Workers, rendering on demand
```
