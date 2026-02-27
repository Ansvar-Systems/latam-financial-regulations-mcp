# Tools

## search_regulations

Search financial regulations across all LATAM jurisdictions using full-text search.

**Parameters:**
- `query` (string, required) — Search query. Supports FTS5 phrase and boolean terms.
- `country` (string) — Country code filter (BR, CL, CO, UY, MX, PE).
- `sector` (string) — Sector filter (banking, securities, insurance, fintech, open_finance).
- `limit` (number) — Max results (1-50, default 10).

**Returns:** Array of matching provisions with snippet highlights, regulator, and article reference.

## get_provision

Retrieve a single provision by country, regulation ID, and article reference.

**Parameters:**
- `country` (string, required) — Country code.
- `regulation_id` (string, required) — Regulation identifier.
- `article` (string, required) — Article reference.

**Returns:** Full provision text, regulation title, regulator, and citation metadata.

## get_cybersecurity_requirements

Get cybersecurity requirements from financial regulators for a jurisdiction.

**Parameters:**
- `country` (string, required) — Country code.
- `sector` (string) — Sector filter.

**Returns:** Array of cybersecurity requirements with legal basis and category.

## get_reporting_requirements

Get incident and breach reporting requirements for financial regulators.

**Parameters:**
- `country` (string, required) — Country code.
- `event_type` (string) — Event type filter (cyber_incident, data_breach, operational_disruption).

**Returns:** Reporting timelines, channels, and penalties per regulator.

## get_outsourcing_rules

Get cloud and third-party outsourcing rules from financial regulators.

**Parameters:**
- `country` (string, required) — Country code.

**Returns:** Outsourcing rules covering cloud, critical services, and data residency.

## get_open_banking_rules

Get Open Finance/Banking framework details for a jurisdiction.

**Parameters:**
- `country` (string, required) — Country code.

**Returns:** Framework name, API standards, data sharing rules, and legal basis.

## compare_requirements

Compare financial regulatory requirements across multiple jurisdictions.

**Parameters:**
- `countries` (string[], required) — Array of country codes to compare.
- `topic` (string, required) — Topic to compare (cybersecurity, reporting, outsourcing, open_banking).

**Returns:** Per-country comparison with requirement summary and key differences.

## list_sources

List all available data sources in the database.

**Parameters:** None required.

**Returns:** Array of sources with ID, name, regulator, jurisdiction, and item count.

## about

Return server metadata and corpus statistics.

**Parameters:**
- `include_sources` (boolean) — Include per-source metadata.

**Returns:** Server name, version, description, total provisions, regulator count, and data freshness.

## check_data_freshness

Evaluate data freshness against warning and critical thresholds.

**Parameters:**
- `warn_after_days` (number) — Warning threshold in days (default 45).
- `critical_after_days` (number) — Critical threshold in days (default 120).

**Returns:** Per-source freshness report with status and days since last update.
