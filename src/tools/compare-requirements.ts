/**
 * compare_requirements — Cross-jurisdictional comparison of financial regulatory
 * requirements across multiple LATAM countries for a given topic.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { clampLimit, buildFtsQuery, validateCountryCode, COUNTRIES } from './common.js';
import { withMeta } from '../utils/metadata.js';

export interface CompareRequirementsArgs {
  countries: string[];
  topic: string;
  limit?: number;
}

interface ComparisonEntry {
  country_code: string;
  country_name: string;
  regulation_id: string;
  regulation_title: string;
  regulator_id: string;
  article_ref: string;
  title: string | null;
  snippet: string;
}

export async function compareRequirements(
  db: Database,
  args: CompareRequirementsArgs,
): Promise<ReturnType<typeof withMeta>> {
  const startMs = Date.now();

  if (!args.countries || !Array.isArray(args.countries) || args.countries.length < 2) {
    return withMeta(
      { error: 'countries must be an array with at least 2 country codes', comparison: {} },
      startMs,
    );
  }

  if (!args.topic || args.topic.trim().length === 0) {
    return withMeta({ error: 'topic parameter is required', comparison: {} }, startMs);
  }

  const invalidCodes = args.countries.filter((c) => !validateCountryCode(c));
  if (invalidCodes.length > 0) {
    return withMeta(
      {
        error: `Invalid country codes: ${invalidCodes.join(', ')}. Use BR, CL, CO, UY, MX, or PE.`,
        comparison: {},
      },
      startMs,
    );
  }

  const limitPerCountry = clampLimit(args.limit, 20);
  const ftsQuery = buildFtsQuery(args.topic);
  const countryCodes = args.countries.map((c) => c.toUpperCase());

  if (!ftsQuery) {
    return withMeta(
      {
        topic: args.topic,
        countries_compared: countryCodes.map((c) => ({ code: c, name: COUNTRIES[c] ?? c })),
        total_results: 0,
        comparison: {},
        message: 'Topic is empty or contains only special characters.',
      },
      startMs,
    );
  }

  const comparison: Record<string, ComparisonEntry[]> = {};

  for (const code of countryCodes) {
    const sql = `
      SELECT
        p.country_code,
        p.regulation_id,
        r.title AS regulation_title,
        r.regulator_id,
        p.article_ref,
        p.title,
        snippet(provisions_fts, 0, '>>>', '<<<', '...', 48) AS snippet
      FROM provisions_fts
      JOIN provisions p ON p.id = provisions_fts.rowid
      JOIN regulations r ON r.id = p.regulation_id
      WHERE provisions_fts MATCH ?
        AND p.country_code = ?
      ORDER BY rank
      LIMIT ?
    `;

    const rows = db.prepare(sql).all(ftsQuery, code, limitPerCountry) as Omit<ComparisonEntry, 'country_name'>[];

    comparison[code] = rows.map((row) => ({
      ...row,
      country_name: COUNTRIES[code] ?? code,
    }));
  }

  const totalResults = Object.values(comparison).reduce((sum, arr) => sum + arr.length, 0);

  return withMeta(
    {
      topic: args.topic,
      countries_compared: countryCodes.map((c) => ({ code: c, name: COUNTRIES[c] ?? c })),
      total_results: totalResults,
      comparison,
    },
    startMs,
  );
}
