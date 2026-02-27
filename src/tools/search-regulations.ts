/**
 * search_regulations — Full-text search across all LATAM financial regulation sources.
 *
 * Searches the provisions_fts table with optional country and sector filters.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { clampLimit, buildFtsQuery, validateCountryCode, validateSector } from './common.js';
import { withMeta } from '../utils/metadata.js';

export interface SearchRegulationsArgs {
  query: string;
  country?: string;
  sector?: string;
  limit?: number;
}

export interface SearchResult {
  regulation_id: string;
  country_code: string;
  article_ref: string;
  title: string | null;
  snippet: string;
  regulation_title: string;
  regulator_id: string;
  sector: string | null;
}

export async function searchRegulations(
  db: Database,
  args: SearchRegulationsArgs,
): Promise<ReturnType<typeof withMeta>> {
  const startMs = Date.now();

  if (!args.query || args.query.trim().length === 0) {
    return withMeta({ error: 'query parameter is required', results: [] }, startMs);
  }

  if (args.country && !validateCountryCode(args.country)) {
    return withMeta({ error: `Invalid country code: ${args.country}. Use BR, CL, CO, UY, MX, or PE.`, results: [] }, startMs);
  }

  if (args.sector && !validateSector(args.sector)) {
    return withMeta({ error: `Invalid sector: ${args.sector}. Use banking, securities, insurance, fintech, or open_finance.`, results: [] }, startMs);
  }

  const limit = clampLimit(args.limit);
  const ftsQuery = buildFtsQuery(args.query);

  if (!ftsQuery) {
    return withMeta(
      {
        query: args.query,
        filters: { country: args.country?.toUpperCase() ?? null, sector: args.sector?.toLowerCase() ?? null },
        total: 0,
        results: [],
        message: 'Query is empty or contains only special characters.',
      },
      startMs,
    );
  }

  const conditions: string[] = ['provisions_fts MATCH ?'];
  const params: (string | number)[] = [ftsQuery];

  if (args.country) {
    conditions.push('p.country_code = ?');
    params.push(args.country.toUpperCase());
  }

  if (args.sector) {
    conditions.push('r.sector = ?');
    params.push(args.sector.toLowerCase());
  }

  params.push(limit);

  const sql = `
    SELECT
      p.regulation_id,
      p.country_code,
      p.article_ref,
      p.title,
      snippet(provisions_fts, 0, '>>>', '<<<', '...', 48) AS snippet,
      r.title AS regulation_title,
      r.regulator_id,
      r.sector
    FROM provisions_fts
    JOIN provisions p ON p.id = provisions_fts.rowid
    JOIN regulations r ON r.id = p.regulation_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY rank
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(...params) as SearchResult[];

  return withMeta(
    {
      query: args.query,
      filters: {
        country: args.country?.toUpperCase() ?? null,
        sector: args.sector?.toLowerCase() ?? null,
      },
      total: rows.length,
      results: rows,
    },
    startMs,
  );
}
