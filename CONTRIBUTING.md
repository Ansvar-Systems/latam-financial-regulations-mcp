# Contributing

Thank you for your interest in contributing to the LATAM Financial Regulations MCP.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch from `dev` (not `main`)
4. Make your changes
5. Submit a pull request targeting `dev`

## Branch Strategy

```
feature-branch -> PR to dev -> verify on dev -> PR to main -> deploy
```

- All PRs target `dev`, never `main` directly
- `main` is production-only and receives merges from `dev` after verification
- Feature branches are created from `dev`

## Development Setup

```bash
npm install
npm run build:db    # Create the SQLite database
npm run dev         # Start in development mode
npm run test        # Run tests
npm run lint        # Type check
npm run validate    # Lint + test
```

## Before Submitting a PR

1. Run `npm run validate` and fix any errors
2. Ensure all tools return valid JSON with `_meta`
3. Add tests for new tools or modified queries
4. Update `TOOLS.md` if tool signatures changed
5. Update `COVERAGE.md` if data coverage changed
6. Update `data/coverage.json` if sources changed

## Adding a New Country or Regulator

1. Add the regulator to `scripts/build-db.ts` seed data
2. Add the source to `sources.yml`
3. Update `src/tools/common.ts` with the new country code
4. Create ingestion logic in `scripts/ingest.ts`
5. Add seed data files to `data/seed/<COUNTRY_CODE>/`
6. Update `COVERAGE.md` and `data/coverage.json`

## Adding Regulation Data

1. Place seed data in `data/seed/<COUNTRY>/<REGULATOR>/`
2. Follow the JSON format documented in `data/seed/README.md`
3. Run `npm run build:db` to rebuild
4. Verify with `npm run dev` and test the relevant tools
5. Include the source URL for verification

## Code Standards

- TypeScript strict mode
- Parameterized SQL queries only (no string interpolation)
- Every tool response includes `_meta` with disclaimer
- Validate all user inputs against allowlists
- No hardcoded secrets or credentials

## Commit Messages

Use conventional commits:
- `feat:` new feature or tool
- `fix:` bug fix
- `data:` data ingestion or coverage update
- `docs:` documentation only
- `chore:` build, CI, or dependency updates
- `test:` test additions or changes

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
