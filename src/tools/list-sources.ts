/**
 * list_sources — Mandatory meta-tool returning all data sources backing this MCP server.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { withMeta } from '../utils/metadata.js';

export interface Source {
  id: string;
  full_name: string;
  authority: string | null;
  jurisdiction: string | null;
  source_url: string | null;
  last_fetched: string | null;
  last_updated: string | null;
  item_count: number;
}

export async function listSources(
  db: Database,
): Promise<ReturnType<typeof withMeta>> {

  const sql = `
    SELECT
      s.id,
      s.full_name,
      s.authority,
      s.jurisdiction,
      s.source_url,
      s.last_fetched,
      s.last_updated,
      s.item_count
    FROM sources s
    ORDER BY s.jurisdiction, s.full_name
  `;

  const rows = db.prepare(sql).all() as Source[];

  const regulatorsCount = db.prepare('SELECT COUNT(*) AS cnt FROM regulators').get() as { cnt: number };
  const regulationsCount = db.prepare('SELECT COUNT(*) AS cnt FROM regulations').get() as { cnt: number };
  const provisionsCount = db.prepare('SELECT COUNT(*) AS cnt FROM provisions').get() as { cnt: number };

  return withMeta(
    {
      total_sources: rows.length,
      stats: {
        regulators: regulatorsCount.cnt,
        regulations: regulationsCount.cnt,
        provisions: provisionsCount.cnt,
      },
      sources: rows,
    },
  );
}
