/**
 * check_data_freshness — Mandatory meta-tool evaluating the freshness of ingested data.
 *
 * Reports per-source freshness with a staleness warning threshold.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { daysSince, COUNTRIES } from './common.js';
import { withMeta } from '../utils/metadata.js';

const STALE_THRESHOLD_DAYS = 90;

interface SourceFreshness {
  source_id: string;
  full_name: string;
  jurisdiction: string | null;
  last_fetched: string | null;
  last_updated: string | null;
  days_since_fetch: number | null;
  days_since_update: number | null;
  stale: boolean;
}

export async function checkDataFreshness(
  db: Database,
): Promise<ReturnType<typeof withMeta>> {
  const startMs = Date.now();

  const sql = `
    SELECT
      s.id AS source_id,
      s.full_name,
      s.jurisdiction,
      s.last_fetched,
      s.last_updated,
      s.item_count
    FROM sources s
    ORDER BY s.jurisdiction, s.full_name
  `;

  const rows = db.prepare(sql).all() as Array<{
    source_id: string;
    full_name: string;
    jurisdiction: string | null;
    last_fetched: string | null;
    last_updated: string | null;
    item_count: number;
  }>;

  const freshness: SourceFreshness[] = rows.map((row) => {
    const daysFetch = row.last_fetched ? daysSince(row.last_fetched) : null;
    const daysUpdate = row.last_updated ? daysSince(row.last_updated) : null;
    const stale = daysFetch === null || daysFetch > STALE_THRESHOLD_DAYS;

    return {
      source_id: row.source_id,
      full_name: row.full_name,
      jurisdiction: row.jurisdiction,
      last_fetched: row.last_fetched,
      last_updated: row.last_updated,
      days_since_fetch: daysFetch,
      days_since_update: daysUpdate,
      stale,
    };
  });

  const staleCount = freshness.filter((f) => f.stale).length;
  const freshCount = freshness.filter((f) => !f.stale).length;

  // Per-country summary
  const countrySummary: Record<string, { fresh: number; stale: number }> = {};
  for (const f of freshness) {
    const cc = f.jurisdiction ?? 'unknown';
    if (!countrySummary[cc]) {
      countrySummary[cc] = { fresh: 0, stale: 0 };
    }
    if (f.stale) {
      countrySummary[cc].stale++;
    } else {
      countrySummary[cc].fresh++;
    }
  }

  return withMeta(
    {
      stale_threshold_days: STALE_THRESHOLD_DAYS,
      summary: {
        total_sources: freshness.length,
        fresh: freshCount,
        stale: staleCount,
      },
      country_summary: Object.entries(countrySummary).map(([code, counts]) => ({
        country_code: code,
        country_name: COUNTRIES[code] ?? code,
        ...counts,
      })),
      sources: freshness,
    },
    startMs,
  );
}
