# @librepublish/astro-forms

LibrePublish CMS forms on an Astro site. Needs the CMS's Forms plugin and
[`@librepublish/astro`](../astro).

```astro
---
import Form from "@librepublish/astro-forms/components/Form.astro";
---
<Form slug="contact" />
```

The form posts straight to the CMS (allow the site's origin in the CMS's
Settings › General › public origins), with Cloudflare Turnstile when the CMS
has it set up (Settings › Forms). With JavaScript it submits in place and
shows the success message or each field's error. Unstyled: `cms-form__*`
classes, and `data-state` on the form.

`getForm(slug)` and `getForms()` (from `@librepublish/astro-forms/runtime`)
give you the form to render yourself.

## Form emails in the site's design

Add `cmsForms()` to the integrations and a route at
`src/pages/emails/[form]/[kind].astro` that renders an email's blocks with
the site's components, using `emailTemplatePaths` as its `getStaticPaths`,
`digestMeta(email)` in its `<head>` and `answersRow(block)` on the row the CMS
repeats per answer. After each build the templates go to the CMS (the token
needs `forms:templates`) and are taken out of the deployed site.
