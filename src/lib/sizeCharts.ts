/**
 * Standard fashion size conversion tables and helpers used across the
 * native tenant websites, catalogue editor, and cart flow.
 *
 * Values are approximate industry conversions — orgs can override the
 * per-product `size_chart` JSON on `org_catalogue_items` for exact
 * measurements per size.
 */

export type SizeStandard = "UK" | "US" | "EU" | "CN";

export const SIZE_STANDARDS: SizeStandard[] = ["UK", "US", "EU", "CN"];

/**
 * Validate a `size_chart_standards` value before saving. Ensures it is an
 * array of allowed standards with no duplicates. Returns a normalized array
 * or an error message describing why the value is invalid.
 *
 * Mirrors the server-side trigger `validate_org_website_size_chart` on
 * `public.org_websites` so client and DB agree on the accepted shape.
 */
export function validateSizeChartStandards(
  value: unknown,
  opts: { showSizeChart?: boolean } = {},
): { ok: true; value: SizeStandard[] } | { ok: false; error: string } {
  if (value == null) {
    return opts.showSizeChart
      ? { ok: true, value: [...SIZE_STANDARDS] }
      : { ok: true, value: [] };
  }
  if (!Array.isArray(value)) {
    return { ok: false, error: "Size chart standards must be a list." };
  }
  const seen = new Set<string>();
  const out: SizeStandard[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") {
      return { ok: false, error: "Each size chart standard must be a string." };
    }
    const s = raw.trim().toUpperCase();
    if (!(SIZE_STANDARDS as string[]).includes(s)) {
      return { ok: false, error: `Unsupported size chart standard "${raw}". Allowed: ${SIZE_STANDARDS.join(", ")}.` };
    }
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s as SizeStandard);
  }
  if (opts.showSizeChart && out.length === 0) {
    return { ok: true, value: [...SIZE_STANDARDS] };
  }
  return { ok: true, value: out };
}

// Womenswear reference — most common for fashion catalogues.
// Row order matches across standards so lookups can be done positionally.
export const WOMEN_SIZE_TABLE: Record<SizeStandard, string[]> = {
  UK: ["6", "8", "10", "12", "14", "16", "18", "20"],
  US: ["2", "4", "6", "8", "10", "12", "14", "16"],
  EU: ["34", "36", "38", "40", "42", "44", "46", "48"],
  CN: ["155/80A", "160/84A", "165/88A", "170/92A", "170/96A", "175/100A", "175/104A", "180/108A"],
};

export const MEN_SIZE_TABLE: Record<SizeStandard, string[]> = {
  UK: ["34", "36", "38", "40", "42", "44", "46", "48"],
  US: ["34", "36", "38", "40", "42", "44", "46", "48"],
  EU: ["44", "46", "48", "50", "52", "54", "56", "58"],
  CN: ["165", "170", "175", "180", "185", "190", "195", "200"],
};

/**
 * Convert a size from one standard to another using positional lookup
 * against the reference table. Returns the input when no match is found.
 */
export function convertSize(
  value: string,
  from: SizeStandard,
  to: SizeStandard,
  table: Record<SizeStandard, string[]> = WOMEN_SIZE_TABLE,
): string {
  const idx = table[from].indexOf(value);
  if (idx < 0) return value;
  return table[to][idx] ?? value;
}

/**
 * Given a product's chosen standard + list of available sizes, return a
 * comparison table with rows per size showing UK / US / EU / CN.
 */
export function buildComparisonRows(
  chosen: SizeStandard,
  sizes: string[],
  table: Record<SizeStandard, string[]> = WOMEN_SIZE_TABLE,
): Array<Record<SizeStandard, string>> {
  return sizes.map((s) => {
    const row = {} as Record<SizeStandard, string>;
    for (const std of SIZE_STANDARDS) row[std] = convertSize(s, chosen, std, table);
    return row;
  });
}