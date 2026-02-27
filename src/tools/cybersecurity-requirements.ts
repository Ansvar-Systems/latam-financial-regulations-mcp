/**
 * get_cybersecurity_requirements — Retrieve cybersecurity-specific regulatory requirements
 * for a given LATAM country and optional sector.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { clampLimit, validateCountryCode, validateSector, COUNTRIES } from './common.js';
import { withMeta } from '../utils/metadata.js';

export interface CybersecurityRequirementsArgs {
  country: string;
  sector?: string;
  limit?: number;
}

export interface CybersecurityRequirement {
  id: number;
  country_code: string;
  regulator_id: string | null;
  sector: string | null;
  requirement: string;
  legal_basis: string | null;
  category: string | null;
}

export async function getCybersecurityRequirements(
  db: Database,
  args: CybersecurityRequirementsArgs,
): Promise<ReturnType<typeof withMeta>> {
  const startMs = Date.now();

  if (!args.country) {
    return withMeta({ error: 'country parameter is required', requirements: [] }, startMs);
  }

  if (!validateCountryCode(args.country)) {
    return withMeta(
      { error: `Invalid country code: ${args.country}. Use BR, CL, CO, UY, MX, or PE.`, requirements: [] },
      startMs,
    );
  }

  if (args.sector && !validateSector(args.sector)) {
    return withMeta(
      { error: `Invalid sector: ${args.sector}. Use banking, securities, insurance, fintech, or open_finance.`, requirements: [] },
      startMs,
    );
  }

  const limit = clampLimit(args.limit);
  const countryCode = args.country.toUpperCase();

  const conditions: string[] = ['cr.country_code = ?'];
  const params: (string | number)[] = [countryCode];

  if (args.sector) {
    conditions.push('cr.sector = ?');
    params.push(args.sector.toLowerCase());
  }

  params.push(limit);

  const sql = `
    SELECT
      cr.id,
      cr.country_code,
      cr.regulator_id,
      cr.sector,
      cr.requirement,
      cr.legal_basis,
      cr.category
    FROM cybersecurity_requirements cr
    WHERE ${conditions.join(' AND ')}
    ORDER BY cr.category, cr.id
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(...params) as CybersecurityRequirement[];

  return withMeta(
    {
      country: countryCode,
      country_name: COUNTRIES[countryCode],
      sector: args.sector?.toLowerCase() ?? 'all',
      total: rows.length,
      requirements: rows,
    },
    startMs,
  );
}
