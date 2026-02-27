/**
 * Health check endpoint for LATAM Financial Regulations MCP.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(200).json({
    status: 'ok',
    server: 'latam-financial-regulations-mcp',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
}
