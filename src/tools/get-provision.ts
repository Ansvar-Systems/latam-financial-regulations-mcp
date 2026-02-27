/**
 * get_provision — Retrieve a single provision by country, regulation ID, and article reference.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { validateCountryCode } from './common.js';
import { withMeta } from '../utils/metadata.js';

export interface GetProvisionArgs {
  country: string;
  regulation_id: string;
  article: string;
}

export interface Provision {
  id: number;
  regulation_id: string;
  country_code: string;
  article_ref: string;
  title: string | null;
  content: string;
  topic: string | null;
  regulation_title: string;
  regulator_id: string;
  official_number: string | null;
  year: number | null;
}

export async function getProvision(
  db: Database,
  args: GetProvisionArgs,
): Promise<ReturnType<typeof withMeta>> {

  if (!args.country || !args.regulation_id || !args.article) {
    return withMeta(
      { error: 'country, regulation_id, and article are all required parameters', provision: null },
    );
  }

  if (!validateCountryCode(args.country)) {
    return withMeta(
      { error: `Invalid country code: ${args.country}. Use BR, CL, CO, UY, MX, or PE.`, provision: null },
    );
  }

  const sql = `
    SELECT
      p.id,
      p.regulation_id,
      p.country_code,
      p.article_ref,
      p.title,
      p.content,
      p.topic,
      r.title AS regulation_title,
      r.regulator_id,
      r.official_number,
      r.year
    FROM provisions p
    JOIN regulations r ON r.id = p.regulation_id
    WHERE p.country_code = ?
      AND p.regulation_id = ?
      AND p.article_ref = ?
    LIMIT 1
  `;

  const row = db.prepare(sql).get(
    args.country.toUpperCase(),
    args.regulation_id,
    args.article,
  ) as Provision | undefined;

  if (!row) {
    return withMeta(
      {
        error: `No provision found for ${args.country.toUpperCase()} / ${args.regulation_id} / ${args.article}`,
        provision: null,
      },
    );
  }

  return withMeta({ provision: row });
}
