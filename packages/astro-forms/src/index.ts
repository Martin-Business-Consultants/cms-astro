/**
 * @librepublish/astro-forms — the CMS's forms on an Astro site (needs the
 * Forms plugin in the CMS and @librepublish/astro in the site).
 *
 *   ---
 *   import Form from "@librepublish/astro-forms/components/Form.astro";
 *   ---
 *   <Form slug="contact" />
 *
 * The browser posts straight to the CMS (allowed by Settings › General's
 * public origins), with Cloudflare Turnstile when the CMS has it set up.
 * `getForm` and `getForms` are in ./runtime. For form emails in the site's own
 * design, add `cmsForms()` to the integrations and an email route (./emails).
 */
export type * from "./types.js";
export { default as cmsForms, default } from "./emails.js";
export { answersRow, digestMeta, emailTemplatePaths } from "./emails.js";
