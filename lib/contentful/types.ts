/**
 * Raw shape of a Page entry as returned by the Contentful CDA/CPA.
 * Kept local to the adapter — never exported to UI code.
 */
export interface ContentfulPageFields {
  slug: string;
  title: string;
  // `sections` is a JSON Object field in Contentful. Treated as unknown until
  // it lands at the schema layer.
  sections?: unknown;
}

export type ContentfulPageEntry = {
  sys: { id: string; updatedAt?: string };
  fields: ContentfulPageFields;
};
