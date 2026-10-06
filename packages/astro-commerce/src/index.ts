/**
 * @librepublish/astro-commerce — selling by quotation on an Astro site (needs
 * the Commerce plugin in the CMS and @librepublish/astro in the site). A
 * product page asks for a quote; the request lands in Commerce › Quote
 * requests, where the shop drafts an invoice from it.
 *
 *   ---
 *   import QuoteRequest from "@librepublish/astro-commerce/components/QuoteRequest.astro";
 *   ---
 *   <QuoteRequest items={[{ title: product.title, slug: product.slug, quantity: 1 }]} />
 */
import { runtimeClient } from "@librepublish/astro/runtime/env";

export interface QuoteItem {
  title: string;
  slug?: string;
  sku?: string;
  url?: string;
  unit_price?: number;
  quantity?: number;
}

/** Where a quote request posts, on the CMS (from GET /api/v1/site). */
export async function quoteRequestAction(): Promise<string> {
  const { data } = await runtimeClient().site();
  const action = data.plugin_config?.commerce?.quote_request_action as string | undefined;
  if (!action) throw new Error("@librepublish/astro-commerce: the CMS doesn't have the Commerce plugin switched on.");
  return action;
}

/** The field to leave empty; bots fill it in. */
export const HONEYPOT = "website";
