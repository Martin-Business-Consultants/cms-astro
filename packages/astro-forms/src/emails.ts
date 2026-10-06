/**
 * Form emails in the site's own design. The CMS keeps what a form's
 * notification and confirmation emails say (blocks) and sends them; the site
 * gives them its look:
 *
 *   1. A route renders each email's blocks with the site's components,
 *      leaving {{tokens}} as they are — src/pages/emails/[form]/[kind].astro,
 *      with `emailTemplatePaths` as its getStaticPaths. It stamps the digest of
 *      the blocks it was built from (`digestMeta(email)`) and marks the row
 *      the CMS repeats per answer (`answersRow(block)`).
 *   2. `cmsForms()` sends every built template to the CMS after the build and
 *      takes them out of the deployed site.
 *
 * The CMS sends a template only while its digest matches the email's blocks;
 * until a newer build lands it uses its own layout, so an email never waits.
 */
import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import type { CmsEmailBlock, CmsFormEmail } from "./types.js";

/** The meta tag the digest goes in. */
export const DIGEST_META = "cms-email-digest";
const KINDS: CmsFormEmail["kind"][] = ["notification", "confirmation"];

// The build's connection, kept by @librepublish/astro's integration.
function connection(): { url: string; token: string } {
  const held = (globalThis as Record<symbol, { url: string; token: string } | undefined>)[Symbol.for("librepublish.astro.connection")];
  if (!held) throw new Error("@librepublish/astro-forms: add cms() from @librepublish/astro to the integrations, before cmsForms().");
  return held;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, token } = connection();
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error(`CMS ${path}: HTTP ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

/**
 * getStaticPaths for the email route: one page per form and kind, with the
 * form slug and the email as props. Every form, published or not, so a
 * draft form's emails are ready when it goes live.
 */
export async function emailTemplatePaths() {
  const { forms } = await api<{ forms: { slug: string }[] }>("/api/forms");
  const perForm = await Promise.all(forms.map(async (form) => {
    const { emails } = await api<{ emails: CmsFormEmail[] }>(`/api/forms/${encodeURIComponent(form.slug)}/emails`);
    return emails.map((email) => ({ params: { form: form.slug, kind: email.kind }, props: { form: form.slug, email } }));
  }));
  return perForm.flat();
}

/** Spread onto a <meta> in the template's <head>. */
export function digestMeta(email: CmsFormEmail) {
  return { name: DIGEST_META, content: email.content_digest };
}

/** Spread onto the row the CMS repeats per answer ({{answer.label}}, {{answer.value}}). */
export function answersRow(block: Extract<CmsEmailBlock, { type: "email_submission" }>) {
  return { "data-cms-repeat": "answers", ...(block.data.skip_empty ? { "data-cms-skip-empty": "true" } : {}) };
}

export interface FormsOptions {
  /** Where the email route builds to, under the output. Default: "emails". */
  route?: string;
  /** Keep the built templates in the deployed site. Default: false. */
  keep?: boolean;
}

/**
 * After `astro build`, sends each template under <output>/<route>/<form>/<kind>
 * to the CMS (needs a token with forms:templates). A failed send fails the
 * build, so a site never deploys believing its emails are current.
 */
export default function cmsForms({ route = "emails", keep = false }: FormsOptions = {}): AstroIntegration {
  return {
    name: "librepublish-forms",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = join(fileURLToPath(dir), route);
        const templates = await findTemplates(root);
        if (templates.length === 0) {
          logger.info(`No form email templates under ${route}/ (add src/pages/${route}/[form]/[kind].astro to design them).`);
          return;
        }
        for (const { form, kind, file } of templates) {
          const html = await readFile(file, "utf8");
          const digest = readDigest(html);
          if (!digest) throw new Error(`${file} has no <meta name="${DIGEST_META}">; add digestMeta(email) to its <head>.`);
          const { status } = await api<{ status: string }>(`/api/forms/${encodeURIComponent(form)}/emails/${kind}/template`, {
            method: "PUT", body: JSON.stringify({ html, digest }),
          });
          logger.info(`${form} ${kind} email → CMS (${status})`);
        }
        if (!keep) await rm(root, { recursive: true, force: true });
      },
    },
  };
}

// <form>/<kind>/index.html (build.format "directory") or <form>/<kind>.html ("file").
async function findTemplates(root: string) {
  const forms = await readdir(root).catch(() => [] as string[]);
  const found: { form: string; kind: CmsFormEmail["kind"]; file: string }[] = [];
  for (const form of forms) {
    const entries = await readdir(join(root, form)).catch(() => [] as string[]);
    for (const kind of KINDS) {
      if (entries.includes(kind)) found.push({ form, kind, file: join(root, form, kind, "index.html") });
      else if (entries.includes(`${kind}.html`)) found.push({ form, kind, file: join(root, form, `${kind}.html`) });
    }
  }
  return found;
}

export function readDigest(html: string): string | null {
  const tag = html.match(new RegExp(`<meta[^>]+name=["']${DIGEST_META}["'][^>]*>`, "i"))?.[0];
  return tag?.match(/content=["']([^"']+)["']/i)?.[1] ?? null;
}
