# @librepublish/astro-commerce

Selling by quotation with LibrePublish CMS. Needs the CMS's Commerce plugin
and [`@librepublish/astro`](../astro).

```astro
---
import QuoteRequest from "@librepublish/astro-commerce/components/QuoteRequest.astro";
---
<QuoteRequest items={[{ title: product.title, slug: product.slug, quantity: 1 }]} />
```

The request posts straight to the CMS and lands in Commerce › Quote
requests, where the shop drafts an invoice from it. Unstyled: `cms-quote__*`
classes, and `data-state` on the form.
