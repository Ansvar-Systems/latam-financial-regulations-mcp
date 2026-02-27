/**
 * get_reporting_requirements — Retrieve incident/breach reporting requirements
 * for financial regulators in a given LATAM country.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { clampLimit, validateCountryCode, COUNTRIES } from './common.js';
import { withMeta } from '../utils/metadata.js';

export interface ReportingRequirementsArgs {
  country: string;
  event_type?: string;
  limit?: number;
}

export interface ReportingRequirement {
  id: number;
  country_code: string;
  regulator_id: string | null;
  event_type: string;
  timeline: string | null;
  channel: string | null;
  penalties: string | null;
}

export async function getReportingRequirements(
  db: Database,
  args: ReportingRequirementsArgs,
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

  const limit = clampLimit(args.limit);
  const countryCode = args.country.toUpperCase();

  const conditions: string[] = ['rr.country_code = ?'];
  const params: (string | number)[] = [countryCode];

  if (args.event_type) {
    conditions.push('rr.event_type = ?');
    params.push(args.event_type);
  }

  params.push(limit);

  const sql = `
    SELECT
      rr.id,
      rr.country_code,
      rr.regulator_id,
      rr.event_type,
      rr.timeline,
      rr.channel,
      rr.penalties
    FROM reporting_requirements rr
    WHERE ${conditions.join(' AND ')}
    ORDER BY rr.event_type, rr.id
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(...params) as ReportingRequirement[];

  return withMeta(
    {
      country: countryCode,
      country_name: COUNTRIES[countryCode],
      event_type_filter: args.event_type ?? 'all',
      total: rows.length,
      requirements: rows,
    },
    startMs,
  );
}
