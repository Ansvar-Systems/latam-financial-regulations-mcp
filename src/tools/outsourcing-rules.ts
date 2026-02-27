/**
 * get_outsourcing_rules — Retrieve cloud and third-party outsourcing requirements
 * for financial institutions in a given LATAM country.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { clampLimit, validateCountryCode, COUNTRIES } from './common.js';
import { withMeta } from '../utils/metadata.js';

export interface OutsourcingRulesArgs {
  country: string;
  limit?: number;
}

export interface OutsourcingRule {
  id: number;
  country_code: string;
  regulator_id: string | null;
  rule_type: string;
  description: string;
  legal_basis: string | null;
}

export async function getOutsourcingRules(
  db: Database,
  args: OutsourcingRulesArgs,
): Promise<ReturnType<typeof withMeta>> {
  const startMs = Date.now();

  if (!args.country) {
    return withMeta({ error: 'country parameter is required', rules: [] }, startMs);
  }

  if (!validateCountryCode(args.country)) {
    return withMeta(
      { error: `Invalid country code: ${args.country}. Use BR, CL, CO, UY, MX, or PE.`, rules: [] },
      startMs,
    );
  }

  const limit = clampLimit(args.limit);
  const countryCode = args.country.toUpperCase();

  const sql = `
    SELECT
      o.id,
      o.country_code,
      o.regulator_id,
      o.rule_type,
      o.description,
      o.legal_basis
    FROM outsourcing_rules o
    WHERE o.country_code = ?
    ORDER BY o.rule_type, o.id
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(countryCode, limit) as OutsourcingRule[];

  return withMeta(
    {
      country: countryCode,
      country_name: COUNTRIES[countryCode],
      total: rows.length,
      rules: rows,
    },
    startMs,
  );
}
