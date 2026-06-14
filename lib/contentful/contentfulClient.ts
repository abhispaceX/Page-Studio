import "server-only";
import { createClient, type ContentfulClientApi } from "contentful";

import { env } from "@/lib/utils/env";
import { mapContentfulPage } from "./mappers";
import type { RawPage } from "@/lib/schema";

const PAGE_CONTENT_TYPE = "page";

let cachedClients: {
  delivery: ContentfulClientApi<undefined>;
  preview: ContentfulClientApi<undefined>;
} | null = null;

function getClients() {
  if (cachedClients) return cachedClients;

  const space = env.contentful.spaceId;
  const environment = env.contentful.environment;

  cachedClients = {
    delivery: createClient({
      space,
      environment,
      accessToken: env.contentful.deliveryToken,
    }),
    preview: createClient({
      space,
      environment,
      accessToken: env.contentful.previewToken,
      host: "preview.contentful.com",
    }),
  };

  return cachedClients;
}

export interface FetchOptions {
  preview?: boolean;
}

/**
 * Fetch a single Page by slug. Returns null when not found.
 * UI code consumes the returned `RawPage` shape — never the Contentful entry.
 */
export async function getPage(
  slug: string,
  { preview = false }: FetchOptions = {}
): Promise<RawPage | null> {
  const client = preview ? getClients().preview : getClients().delivery;

  const res = await client.getEntries({
    // contentful client typings for getEntries are intentionally loose
    // (different field shapes per content type). Cast the query options.
    content_type: PAGE_CONTENT_TYPE,
    "fields.slug": slug,
    limit: 1,
    include: 2,
  } as Parameters<typeof client.getEntries>[0]);

  const entry = res.items[0];
  if (!entry) return null;

  return mapContentfulPage({
    sys: { id: entry.sys.id },
    fields: entry.fields as {
      slug: string;
      title: string;
      sections?: unknown;
    },
  });
}

/**
 * List all published pages (slug + title) — used by the home page and the
 * Studio's "open page" picker.
 */
export async function listPages(
  { preview = false }: FetchOptions = {}
): Promise<Array<{ slug: string; title: string }>> {
  const client = preview ? getClients().preview : getClients().delivery;

  const res = await client.getEntries({
    content_type: PAGE_CONTENT_TYPE,
    select: ["fields.slug", "fields.title"],
    limit: 100,
  } as Parameters<typeof client.getEntries>[0]);

  return res.items
    .map((e) => {
      const f = e.fields as { slug?: string; title?: string };
      if (!f.slug || !f.title) return null;
      return { slug: f.slug, title: f.title };
    })
    .filter((x): x is { slug: string; title: string } => x !== null);
}
