/**
 * Response metadata generator for LATAM Financial Regulations MCP.
 *
 * Every tool response includes _meta with provenance, disclaimer, and timing.
 */

export interface ResponseMeta {
  server: string;
  version: string;
  disclaimer: string;
  timestamp: string;
  query_ms?: number;
}

const DISCLAIMER =
  'This data is provided for informational purposes only and does not constitute ' +
  'financial, legal, or regulatory advice. Regulations may have been amended after ' +
  'the last data update. Always verify with the official regulator publication and ' +
  'consult qualified legal or compliance professionals before making decisions.';

const SERVER_NAME = 'latam-financial-regulations-mcp';
const VERSION = '0.1.0';

/**
 * Build a _meta object to attach to every tool response.
 */
export function buildMeta(startMs?: number): ResponseMeta {
  const meta: ResponseMeta = {
    server: SERVER_NAME,
    version: VERSION,
    disclaimer: DISCLAIMER,
    timestamp: new Date().toISOString(),
  };
  if (startMs !== undefined) {
    meta.query_ms = Date.now() - startMs;
  }
  return meta;
}

/**
 * Wrap a tool result with _meta.
 */
export function withMeta<T extends Record<string, unknown>>(
  result: T,
  startMs?: number,
): T & { _meta: ResponseMeta } {
  return { ...result, _meta: buildMeta(startMs) };
}
