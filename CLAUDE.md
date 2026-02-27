# CLAUDE.md — LATAM Financial Regulations MCP

MCP server providing structured access to financial/banking cybersecurity regulations across 6 Latin American jurisdictions.

## Quick Reference

| Task | Command |
|------|---------|
| Build TypeScript | `npm run build` |
| Build database | `npm run build:db` |
| Dev mode (tsx) | `npm run dev` |
| Run tests | `npm run test` |
| Ingest data | `npm run ingest -- --country BR` |
| Lint | `npm run lint` |
| Validate | `npm run validate` |

## Architecture

- **Transport:** stdio (MCP SDK) + Vercel Streamable HTTP (planned)
- **Database:** SQLite via `@ansvar/mcp-sqlite` (read-only at runtime)
- **Build:** TypeScript -> `dist/`, database -> `data/database.db`
- **Package:** Published as `@anthropic-ai/latam-financial-regulations-mcp` on npm

## Coverage

6 countries, 8 regulators:

| Country | Regulators | Status |
|---------|-----------|--------|
| Brazil | BACEN, CVM, SUSEP | Pending ingestion |
| Chile | CMF | Pending ingestion |
| Colombia | SFC | Pending ingestion |
| Uruguay | BCU | Pending ingestion |
| Mexico | CNBV | Pending ingestion |
| Peru | SBS | Pending ingestion |

## Tools (10)

1. `search_regulations` — FTS across all sources
2. `get_provision` — Single provision retrieval
3. `get_cybersecurity_requirements` — Cyber rules per country/sector
4. `get_reporting_requirements` — Incident reporting rules
5. `get_outsourcing_rules` — Cloud/third-party requirements
6. `get_open_banking_rules` — Open Finance frameworks
7. `compare_requirements` — Cross-jurisdictional comparison
8. `list_sources` — Data source metadata
9. `about` — Server info
10. `check_data_freshness` — Freshness evaluation

## Branching

```
feature-branch -> PR to dev -> verify -> PR to main -> deploy
```

Never push directly to `main`. All changes land on `dev` first.

## Key Files

- `src/index.ts` — Server entry point
- `src/tools/` — Tool implementations
- `scripts/build-db.ts` — Database schema builder
- `scripts/ingest.ts` — Data ingestion pipeline
- `sources.yml` — Authoritative source definitions
- `data/coverage.json` — Machine-readable coverage manifest

## Standards

- Follow the [MCP Golden Standard](https://github.com/Ansvar-Systems/Ansvar-Architecture-Documentation/blob/main/docs/guides/mcp-golden-standard.md)
- Every tool response includes `_meta` with disclaimer, timestamp, and version
- No client/customer data stored in this database
- Apache-2.0 license
