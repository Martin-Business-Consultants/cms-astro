/**
 * Where the CMS is and how to reach it. At build time the integration resolves
 * it once (options, then the environment and .env) and keeps it for the
 * content loaders, which run in the same process. At request time the runtime
 * reads it from astro:env (runtime/env.ts), which on Cloudflare means the
 * Worker's variables and secrets.
 */
import { loadEnv } from "vite";
import { createClient, type CmsClient } from "./client.js";

export interface Connection { url: string; token: string }

const KEY = Symbol.for("librepublish.astro.connection");
type Holder = { [KEY]?: Connection };

export function resolveConnection(root: string, mode: string, options: { url?: string; token?: string }): Connection | null {
  const env = { ...loadEnv(mode, root, ""), ...process.env };
  const url = options.url ?? env.CMS_BASE_URL;
  const token = options.token ?? env.CMS_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export function keepConnection(connection: Connection) {
  (globalThis as Holder)[KEY] = connection;
}

/** The build's connection; throws outside a build that has one. */
export function buildConnection(): Connection {
  const connection = (globalThis as Holder)[KEY];
  if (!connection) {
    throw new Error("@librepublish/astro: no CMS connection. Add cms() to astro.config's integrations and set CMS_BASE_URL and CMS_API_TOKEN.");
  }
  return connection;
}

export function buildClient(): CmsClient {
  return createClient(buildConnection());
}
