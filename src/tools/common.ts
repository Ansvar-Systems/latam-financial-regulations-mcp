/**
 * Shared utilities and constants for LATAM Financial Regulations MCP tools.
 */

export const COUNTRIES: Record<string, string> = {
  BR: 'Brazil',
  CL: 'Chile',
  CO: 'Colombia',
  UY: 'Uruguay',
  MX: 'Mexico',
  PE: 'Peru',
};

export const COUNTRY_CODES = Object.keys(COUNTRIES) as Array<keyof typeof COUNTRIES>;

export const REGULATORS: Record<string, { name: string; fullName: string; country: string; sector: string }> = {
  BACEN: { name: 'BACEN', fullName: 'Banco Central do Brasil', country: 'BR', sector: 'banking' },
  CVM: { name: 'CVM', fullName: 'Comissão de Valores Mobiliários', country: 'BR', sector: 'securities' },
  SUSEP: { name: 'SUSEP', fullName: 'Superintendência de Seguros Privados', country: 'BR', sector: 'insurance' },
  CMF: { name: 'CMF', fullName: 'Comisión para el Mercado Financiero', country: 'CL', sector: 'banking' },
  SFC: { name: 'SFC', fullName: 'Superintendencia Financiera de Colombia', country: 'CO', sector: 'banking' },
  BCU: { name: 'BCU', fullName: 'Banco Central del Uruguay', country: 'UY', sector: 'banking' },
  CNBV: { name: 'CNBV', fullName: 'Comisión Nacional Bancaria y de Valores', country: 'MX', sector: 'banking' },
  SBS: { name: 'SBS', fullName: 'Superintendencia de Banca, Seguros y AFP', country: 'PE', sector: 'banking' },
};

export const SECTORS = ['banking', 'securities', 'insurance', 'fintech', 'open_finance'] as const;
export type Sector = (typeof SECTORS)[number];

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Clamp a user-supplied limit to a safe range.
 */
export function clampLimit(limit: number | undefined, max: number = MAX_LIMIT): number {
  if (limit === undefined || limit === null) return DEFAULT_LIMIT;
  if (limit < 1) return 1;
  if (limit > max) return max;
  return Math.floor(limit);
}

/**
 * Build a robust FTS5 query from user input.
 * - Strips FTS5 special chars
 * - Adds prefix matching (word*) for cross-language partial matching
 * - Returns null for empty/whitespace-only input
 */
export function buildFtsQuery(raw: string): string | null {
  const cleaned = raw
    .replace(/["\*\(\)\{\}\[\]:^~!@#$%&|\\<>=;,]/g, ' ')
    .replace(/\b(AND|OR|NOT|NEAR)\b/gi, '')
    .trim();

  if (!cleaned) return null;

  const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return null;

  return tokens.map(t => `"${t}"*`).join(' ');
}

/** @deprecated Use buildFtsQuery instead */
export function escapeFTS5Query(query: string): string {
  return buildFtsQuery(query) ?? '';
}

/**
 * Calculate days elapsed since a given ISO date string.
 */
export function daysSince(isoDate: string): number {
  const then = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Convert a Date to an ISO date string (YYYY-MM-DD).
 */
export function toIsoDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Validate a country code against the supported list.
 */
export function validateCountryCode(code: string): boolean {
  return code.toUpperCase() in COUNTRIES;
}

/**
 * Validate a sector value.
 */
export function validateSector(sector: string): boolean {
  return (SECTORS as readonly string[]).includes(sector.toLowerCase());
}
