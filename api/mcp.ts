/**
 * Vercel Serverless endpoint for LATAM Financial Regulations MCP.
 *
 * Exposes the MCP server over Streamable HTTP for remote access.
 * This is a stub — full implementation requires Vercel adapter wiring.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    res.status(200).json({
      server: 'latam-financial-regulations-mcp',
      version: '0.1.0',
      status: 'stub',
      message: 'Vercel Streamable HTTP endpoint. Full implementation pending.',
      transport: 'streamable-http',
    });
    return;
  }

  if (req.method === 'POST') {
    // TODO: Wire up MCP SDK StreamableHTTPServerTransport
    res.status(501).json({
      error: 'Streamable HTTP transport not yet implemented',
      hint: 'Use stdio transport for now: npx @anthropic-ai/latam-financial-regulations-mcp',
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
