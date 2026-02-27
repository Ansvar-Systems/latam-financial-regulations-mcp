/**
 * about — Mandatory meta-tool returning server metadata, coverage summary, and capabilities.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { COUNTRIES, REGULATORS, SECTORS } from './common.js';
import { withMeta } from '../utils/metadata.js';

export async function about(
  db: Database,
): Promise<ReturnType<typeof withMeta>> {

  const regulatorsCount = db.prepare('SELECT COUNT(*) AS cnt FROM regulators').get() as { cnt: number };
  const regulationsCount = db.prepare('SELECT COUNT(*) AS cnt FROM regulations').get() as { cnt: number };
  const provisionsCount = db.prepare('SELECT COUNT(*) AS cnt FROM provisions').get() as { cnt: number };
  const cyberReqsCount = db.prepare('SELECT COUNT(*) AS cnt FROM cybersecurity_requirements').get() as { cnt: number };
  const reportingCount = db.prepare('SELECT COUNT(*) AS cnt FROM reporting_requirements').get() as { cnt: number };
  const outsourcingCount = db.prepare('SELECT COUNT(*) AS cnt FROM outsourcing_rules').get() as { cnt: number };
  const openBankingCount = db.prepare('SELECT COUNT(*) AS cnt FROM open_banking_rules').get() as { cnt: number };

  const countryCoverage: Record<string, number> = {};
  const rows = db.prepare(
    'SELECT country_code, COUNT(*) AS cnt FROM provisions GROUP BY country_code',
  ).all() as Array<{ country_code: string; cnt: number }>;
  for (const row of rows) {
    countryCoverage[row.country_code] = row.cnt;
  }

  return withMeta(
    {
      name: 'latam-financial-regulations-mcp',
      version: '0.1.0',
      description:
        'LATAM financial regulations MCP covering BACEN, PIX, Open Finance, and banking ' +
        'cybersecurity rules across 6 Latin American jurisdictions (Brazil, Chile, Colombia, ' +
        'Uruguay, Mexico, Peru).',
      jurisdictions: Object.entries(COUNTRIES).map(([code, name]) => ({
        code,
        name,
        provisions: countryCoverage[code] ?? 0,
      })),
      regulators: Object.entries(REGULATORS).map(([id, r]) => ({
        id,
        name: r.fullName,
        country: r.country,
        sector: r.sector,
      })),
      sectors: [...SECTORS],
      stats: {
        regulators: regulatorsCount.cnt,
        regulations: regulationsCount.cnt,
        provisions: provisionsCount.cnt,
        cybersecurity_requirements: cyberReqsCount.cnt,
        reporting_requirements: reportingCount.cnt,
        outsourcing_rules: outsourcingCount.cnt,
        open_banking_rules: openBankingCount.cnt,
      },
      tools: [
        'search_regulations',
        'get_provision',
        'get_cybersecurity_requirements',
        'get_reporting_requirements',
        'get_outsourcing_rules',
        'get_open_banking_rules',
        'compare_requirements',
        'list_sources',
        'about',
        'check_data_freshness',
      ],
      data_basis:
        'Official regulatory publications from BACEN (bcb.gov.br), CVM (cvm.gov.br), ' +
        'SUSEP (susep.gov.br), CMF (cmfchile.cl), SFC (superfinanciera.gov.co), ' +
        'BCU (bcu.gub.uy), CNBV (cnbv.gob.mx), and SBS (sbs.gob.pe).',
    },
  );
}
