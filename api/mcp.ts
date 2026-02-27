/**
 * Vercel Serverless endpoint for LATAM Financial Regulations MCP.
 *
 * Exposes the MCP server over Streamable HTTP for remote access.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';
import { join } from 'path';
import { existsSync, copyFileSync, rmSync } from 'fs';

// Import tool implementations
import { searchRegulations } from '../src/tools/search-regulations.js';
import { getProvision } from '../src/tools/get-provision.js';
import { getCybersecurityRequirements } from '../src/tools/cybersecurity-requirements.js';
import { getReportingRequirements } from '../src/tools/reporting-requirements.js';
import { getOutsourcingRules } from '../src/tools/outsourcing-rules.js';
import { getOpenBankingRules } from '../src/tools/open-banking-rules.js';
import { compareRequirements } from '../src/tools/compare-requirements.js';
import { listSources } from '../src/tools/list-sources.js';
import { about } from '../src/tools/about.js';
import { checkDataFreshness } from '../src/tools/check-data-freshness.js';

const SERVER_NAME = 'latam-financial-regulations-mcp';
const SERVER_VERSION = '0.1.0';

const SOURCE_DB =
  process.env.LATAM_FINANCIAL_REGULATIONS_DB_PATH ||
  join(process.cwd(), 'data', 'database.db');
const TMP_DB = '/tmp/latam-fin-reg-database.db';
const TMP_DB_LOCK = '/tmp/latam-fin-reg-database.db.lock';

let db: InstanceType<typeof Database> | null = null;

function getDatabase(): InstanceType<typeof Database> {
  if (!db) {
    if (existsSync(TMP_DB_LOCK)) {
      rmSync(TMP_DB_LOCK, { recursive: true, force: true });
    }
    if (!existsSync(TMP_DB)) {
      copyFileSync(SOURCE_DB, TMP_DB);
    }
    db = new Database(TMP_DB, { readonly: true });
  }
  return db;
}

// Tool definitions — same as in src/index.ts
const TOOLS = [
  {
    name: 'search_regulations',
    description:
      'Full-text search across all LATAM financial regulation sources. Returns matching provisions with relevance ranking.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (e.g. "cybersecurity incident reporting")' },
        country: { type: 'string', description: 'Filter by country code: BR, CL, CO, UY, MX, or PE', enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'] },
        sector: { type: 'string', description: 'Filter by sector', enum: ['banking', 'securities', 'insurance', 'fintech', 'open_finance'] },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description: 'Retrieve a single provision (article) from a specific regulation by country, regulation ID, and article reference.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: { type: 'string', description: 'Country code: BR, CL, CO, UY, MX, or PE', enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'] },
        regulation_id: { type: 'string', description: 'Regulation identifier (e.g. "bacen-res-cmn-4893")' },
        article: { type: 'string', description: 'Article reference (e.g. "art-3")' },
      },
      required: ['country', 'regulation_id', 'article'],
    },
  },
  {
    name: 'get_cybersecurity_requirements',
    description: 'Retrieve cybersecurity-specific regulatory requirements for financial institutions in a given LATAM country.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: { type: 'string', description: 'Country code: BR, CL, CO, UY, MX, or PE', enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'] },
        sector: { type: 'string', description: 'Filter by sector', enum: ['banking', 'securities', 'insurance', 'fintech', 'open_finance'] },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['country'],
    },
  },
  {
    name: 'get_reporting_requirements',
    description: 'Retrieve incident and breach reporting requirements for financial regulators in a given LATAM country.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: { type: 'string', description: 'Country code: BR, CL, CO, UY, MX, or PE', enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'] },
        event_type: { type: 'string', description: 'Filter by event type (e.g. "cyber_incident", "data_breach")' },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['country'],
    },
  },
  {
    name: 'get_outsourcing_rules',
    description: 'Retrieve cloud computing and third-party outsourcing requirements for financial institutions in a given LATAM country.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: { type: 'string', description: 'Country code: BR, CL, CO, UY, MX, or PE', enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'] },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['country'],
    },
  },
  {
    name: 'get_open_banking_rules',
    description: 'Retrieve Open Finance / Open Banking framework details for a given LATAM country.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: { type: 'string', description: 'Country code: BR, CL, CO, UY, MX, or PE', enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'] },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['country'],
    },
  },
  {
    name: 'compare_requirements',
    description: 'Cross-jurisdictional comparison of financial regulatory requirements across multiple LATAM countries for a given topic.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        countries: { type: 'array', items: { type: 'string', enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'] }, description: 'Array of at least 2 country codes', minItems: 2 },
        topic: { type: 'string', description: 'Topic to compare (e.g. "cybersecurity", "data protection")' },
        limit: { type: 'number', description: 'Max results per country (default 20, max 20)' },
      },
      required: ['countries', 'topic'],
    },
  },
  {
    name: 'list_sources',
    description: 'List all data sources backing this MCP server.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'about',
    description: 'Server metadata: version, description, coverage summary, available tools, and per-country provision counts.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'check_data_freshness',
    description: 'Evaluate the freshness of ingested regulatory data.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      protocol: 'mcp-streamable-http',
    });
    return;
  }

  try {
    if (!existsSync(SOURCE_DB) && !existsSync(TMP_DB)) {
      res.status(500).json({ error: `Database not found at ${SOURCE_DB}` });
      return;
    }

    const database = getDatabase();

    const server = new Server(
      { name: SERVER_NAME, version: SERVER_VERSION },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: unknown;

        switch (name) {
          case 'search_regulations':
            result = await searchRegulations(database, args as Parameters<typeof searchRegulations>[1]);
            break;
          case 'get_provision':
            result = await getProvision(database, args as Parameters<typeof getProvision>[1]);
            break;
          case 'get_cybersecurity_requirements':
            result = await getCybersecurityRequirements(database, args as Parameters<typeof getCybersecurityRequirements>[1]);
            break;
          case 'get_reporting_requirements':
            result = await getReportingRequirements(database, args as Parameters<typeof getReportingRequirements>[1]);
            break;
          case 'get_outsourcing_rules':
            result = await getOutsourcingRules(database, args as Parameters<typeof getOutsourcingRules>[1]);
            break;
          case 'get_open_banking_rules':
            result = await getOpenBankingRules(database, args as Parameters<typeof getOpenBankingRules>[1]);
            break;
          case 'compare_requirements':
            result = await compareRequirements(database, args as Parameters<typeof compareRequirements>[1]);
            break;
          case 'list_sources':
            result = await listSources(database);
            break;
          case 'about':
            result = await about(database);
            break;
          case 'check_data_freshness':
            result = await checkDataFreshness(database);
            break;
          default:
            return {
              content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
              isError: true,
            };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('MCP handler error:', message);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
}
