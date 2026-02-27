#!/usr/bin/env node

/**
 * LATAM Financial Regulations MCP Server
 *
 * Provides access to financial/banking cybersecurity regulations across 6 Latin American
 * jurisdictions: Brazil (BACEN, CVM, SUSEP), Chile (CMF), Colombia (SFC),
 * Uruguay (BCU), Mexico (CNBV), Peru (SBS).
 *
 * Transport: stdio (MCP SDK)
 * Database: SQLite via @ansvar/mcp-sqlite
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Database } from '@ansvar/mcp-sqlite';

import { searchRegulations } from './tools/search-regulations.js';
import { getProvision } from './tools/get-provision.js';
import { getCybersecurityRequirements } from './tools/cybersecurity-requirements.js';
import { getReportingRequirements } from './tools/reporting-requirements.js';
import { getOutsourcingRules } from './tools/outsourcing-rules.js';
import { getOpenBankingRules } from './tools/open-banking-rules.js';
import { compareRequirements } from './tools/compare-requirements.js';
import { listSources } from './tools/list-sources.js';
import { about } from './tools/about.js';
import { checkDataFreshness } from './tools/check-data-freshness.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVER_NAME = 'latam-financial-regulations-mcp';
const VERSION = '0.1.0';
const DB_ENV_VAR = 'LATAM_FINANCIAL_REGULATIONS_DB_PATH';

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'search_regulations',
    description:
      'Full-text search across all LATAM financial regulation sources. ' +
      'Returns matching provisions with relevance ranking.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (e.g. "cybersecurity incident reporting")' },
        country: {
          type: 'string',
          description: 'Filter by country code: BR, CL, CO, UY, MX, or PE',
          enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'],
        },
        sector: {
          type: 'string',
          description: 'Filter by sector',
          enum: ['banking', 'securities', 'insurance', 'fintech', 'open_finance'],
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description:
      'Retrieve a single provision (article) from a specific regulation by country, ' +
      'regulation ID, and article reference.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: {
          type: 'string',
          description: 'Country code: BR, CL, CO, UY, MX, or PE',
          enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'],
        },
        regulation_id: { type: 'string', description: 'Regulation identifier (e.g. "bacen-res-4893")' },
        article: { type: 'string', description: 'Article reference (e.g. "art-3", "capitulo-ii")' },
      },
      required: ['country', 'regulation_id', 'article'],
    },
  },
  {
    name: 'get_cybersecurity_requirements',
    description:
      'Retrieve cybersecurity-specific regulatory requirements for financial institutions ' +
      'in a given LATAM country, with optional sector filter.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: {
          type: 'string',
          description: 'Country code: BR, CL, CO, UY, MX, or PE',
          enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'],
        },
        sector: {
          type: 'string',
          description: 'Filter by sector',
          enum: ['banking', 'securities', 'insurance', 'fintech', 'open_finance'],
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['country'],
    },
  },
  {
    name: 'get_reporting_requirements',
    description:
      'Retrieve incident and breach reporting requirements for financial regulators in a given ' +
      'LATAM country. Includes timelines, channels, and penalties.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: {
          type: 'string',
          description: 'Country code: BR, CL, CO, UY, MX, or PE',
          enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'],
        },
        event_type: {
          type: 'string',
          description: 'Filter by event type (e.g. "cyber_incident", "data_breach", "operational_disruption")',
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['country'],
    },
  },
  {
    name: 'get_outsourcing_rules',
    description:
      'Retrieve cloud computing and third-party outsourcing requirements for financial ' +
      'institutions in a given LATAM country.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: {
          type: 'string',
          description: 'Country code: BR, CL, CO, UY, MX, or PE',
          enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'],
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['country'],
    },
  },
  {
    name: 'get_open_banking_rules',
    description:
      'Retrieve Open Finance / Open Banking framework details for a given LATAM country. ' +
      'Covers API standards, data sharing rules, and regulatory basis.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        country: {
          type: 'string',
          description: 'Country code: BR, CL, CO, UY, MX, or PE',
          enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'],
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['country'],
    },
  },
  {
    name: 'compare_requirements',
    description:
      'Cross-jurisdictional comparison of financial regulatory requirements across multiple ' +
      'LATAM countries for a given topic (e.g. "incident reporting", "cloud outsourcing").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        countries: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'],
          },
          description: 'Array of at least 2 country codes to compare',
          minItems: 2,
        },
        topic: { type: 'string', description: 'Topic to compare (e.g. "cybersecurity", "data protection")' },
        limit: { type: 'number', description: 'Max results per country (default 20, max 20)' },
      },
      required: ['countries', 'topic'],
    },
  },
  {
    name: 'list_sources',
    description:
      'List all data sources backing this MCP server, including regulator details, ' +
      'source URLs, freshness dates, and record counts.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'about',
    description:
      'Server metadata: version, description, coverage summary, available tools, ' +
      'and per-country provision counts.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'check_data_freshness',
    description:
      'Evaluate the freshness of ingested regulatory data. Reports per-source ' +
      'staleness with a 90-day threshold and country-level summary.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const dbPath = process.env[DB_ENV_VAR] ?? new URL('../data/database.db', import.meta.url).pathname;
  const db = new Database(dbPath, { readonly: true });

  const server = new Server(
    { name: SERVER_NAME, version: VERSION },
    { capabilities: { tools: {} } },
  );

  // -- List tools -----------------------------------------------------------

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // -- Call tool ------------------------------------------------------------

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'search_regulations':
          result = await searchRegulations(db, args as Parameters<typeof searchRegulations>[1]);
          break;

        case 'get_provision':
          result = await getProvision(db, args as Parameters<typeof getProvision>[1]);
          break;

        case 'get_cybersecurity_requirements':
          result = await getCybersecurityRequirements(db, args as Parameters<typeof getCybersecurityRequirements>[1]);
          break;

        case 'get_reporting_requirements':
          result = await getReportingRequirements(db, args as Parameters<typeof getReportingRequirements>[1]);
          break;

        case 'get_outsourcing_rules':
          result = await getOutsourcingRules(db, args as Parameters<typeof getOutsourcingRules>[1]);
          break;

        case 'get_open_banking_rules':
          result = await getOpenBankingRules(db, args as Parameters<typeof getOpenBankingRules>[1]);
          break;

        case 'compare_requirements':
          result = await compareRequirements(db, args as Parameters<typeof compareRequirements>[1]);
          break;

        case 'list_sources':
          result = await listSources(db);
          break;

        case 'about':
          result = await about(db);
          break;

        case 'check_data_freshness':
          result = await checkDataFreshness(db);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  });

  // -- Transport ------------------------------------------------------------

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // -- Graceful shutdown ----------------------------------------------------

  const shutdown = async (): Promise<void> => {
    db.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
