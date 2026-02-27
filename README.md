# LATAM Financial Regulations MCP

[![CI](https://github.com/Ansvar-Systems/latam-financial-regulations-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/latam-financial-regulations-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@anthropic-ai/latam-financial-regulations-mcp)](https://www.npmjs.com/package/@anthropic-ai/latam-financial-regulations-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Ansvar-Systems/latam-financial-regulations-mcp/badge)](https://scorecard.dev/viewer/?uri=github.com/Ansvar-Systems/latam-financial-regulations-mcp)

MCP server for financial and banking cybersecurity regulations across 6 Latin American jurisdictions. Part of the [Ansvar MCP Network](https://github.com/Ansvar-Systems).

## Coverage

| Country | Regulator | Key Instruments | Status |
|---------|-----------|-----------------|--------|
| Brazil | BACEN | Res. 4,893, PIX, Open Finance | Pending |
| Brazil | CVM | Securities cybersecurity | Pending |
| Brazil | SUSEP | Insurance data/cyber rules | Pending |
| Chile | CMF | Banking, fintech | Pending |
| Colombia | SFC | Circular 007, cloud outsourcing | Pending |
| Uruguay | BCU | Banking, fintech | Pending |
| Mexico | CNBV | Fintech law, banking | Pending |
| Peru | SBS | Banking, cybersecurity | Pending |

See [COVERAGE.md](COVERAGE.md) for full details and known gaps.

## Quick Start

### stdio (local)

```bash
npx @anthropic-ai/latam-financial-regulations-mcp
```

### Claude Desktop

```json
{
  "mcpServers": {
    "latam-financial-regulations": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/latam-financial-regulations-mcp"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `search_regulations` | Full-text search across all jurisdictions |
| `get_provision` | Retrieve a single article by country, regulation, and reference |
| `get_cybersecurity_requirements` | Cyber-specific rules per country and sector |
| `get_reporting_requirements` | Incident/breach reporting to financial regulators |
| `get_outsourcing_rules` | Cloud and third-party requirements |
| `get_open_banking_rules` | Open Finance/Banking frameworks |
| `compare_requirements` | Cross-jurisdictional comparison |
| `list_sources` | Available data sources |
| `about` | Server metadata and statistics |
| `check_data_freshness` | Source freshness evaluation |

See [TOOLS.md](TOOLS.md) for full parameter and return documentation.

## Data Sources

All regulatory texts are sourced from official financial supervisory authorities. See [sources.yml](sources.yml) for provenance details.

## Disclaimer

This tool is for research and reference purposes only. It does NOT constitute financial, legal, or regulatory advice. Always verify against official publications before making compliance decisions. See [DISCLAIMER.md](DISCLAIMER.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
