# Privacy Policy

## Data Processing

The LATAM Financial Regulations MCP server is designed with privacy as a core principle.

### Stateless Operation

- The server processes queries in memory and returns results immediately
- No query logs, search history, or usage analytics are collected
- No user identifiers, IP addresses, or session data are stored
- No cookies, tokens, or tracking mechanisms are used

### Local Mode (stdio)

When running locally via stdio transport:

- All processing happens on the user's machine
- The SQLite database is read from local disk
- No network requests are made during query processing
- No data leaves the local environment

### Remote Mode (Vercel Streamable HTTP)

When accessed via the remote HTTP endpoint:

- Queries are processed on the server and results returned
- No query content is logged or stored
- Standard Vercel infrastructure logs (access logs) may apply per Vercel's privacy policy
- No application-level telemetry or analytics

### Database Contents

The database contains only publicly available regulatory texts:

- Official regulations published by government financial regulators
- No personal data, client data, or proprietary information
- All source material is from public government publications

## Contact

For privacy-related questions: hello@ansvar.ai
