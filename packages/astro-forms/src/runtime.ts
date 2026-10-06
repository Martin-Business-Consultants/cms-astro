/**
 * The published forms at render time (build or request): for <Form>, or for
 * rendering a form yourself. Kept apart from the integration (the package's
 * root), which astro.config loads before Astro's env is there.
 */
import { runtimeClient } from "@librepublish/astro/runtime/env";
import type { CmsForm } from "./types.js";

export type * from "./types.js";

/** A published form. */
export async function getForm(slug: string): Promise<CmsForm> {
  return (await runtimeClient().get<CmsForm>(`/forms/${encodeURIComponent(slug)}`)).data;
}

/** Every published form. */
export async function getForms(): Promise<CmsForm[]> {
  return (await runtimeClient().get<CmsForm[]>("/forms")).data;
}
