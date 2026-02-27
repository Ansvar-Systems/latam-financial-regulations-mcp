/**
 * get_open_banking_rules — Retrieve Open Finance / Open Banking framework details
 * for a given LATAM country.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { clampLimit, validateCountryCode, COUNTRIES } from './common.js';
import { withMeta } from '../utils/metadata.js';

export interface OpenBankingRulesArgs {
  country: string;
  limit?: number;
}

export interface OpenBankingRule {
  id: number;
  country_code: string;
  framework_name: string;
  description: string | null;
  api_standards: string | null;
  data_sharing_rules: string | null;
  legal_basis: string | null;
}

export async function getOpenBankingRules(
  db: Database,
  args: OpenBankingRulesArgs,
): Promise<ReturnType<typeof withMeta>> {

  if (!args.country) {
    return withMeta({ error: 'country parameter is required', rules: [] });
  }

  if (!validateCountryCode(args.country)) {
    return withMeta(
      { error: `Invalid country code: ${args.country}. Use BR, CL, CO, UY, MX, or PE.`, rules: [] },
    );
  }

  const limit = clampLimit(args.limit);
  const countryCode = args.country.toUpperCase();

  const sql = `
    SELECT
      ob.id,
      ob.country_code,
      ob.framework_name,
      ob.description,
      ob.api_standards,
      ob.data_sharing_rules,
      ob.legal_basis
    FROM open_banking_rules ob
    WHERE ob.country_code = ?
    ORDER BY ob.framework_name, ob.id
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(countryCode, limit) as OpenBankingRule[];

  return withMeta(
    {
      country: countryCode,
      country_name: COUNTRIES[countryCode],
      total: rows.length,
      rules: rows,
    },
  );
}
