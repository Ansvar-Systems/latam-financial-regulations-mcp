# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email: **security@ansvar.eu**
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix within 7 days for critical issues.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Security Measures

### Input Validation

- All user inputs are validated before use
- Country codes are checked against a fixed allowlist
- Sector values are checked against a fixed allowlist
- FTS5 queries are escaped to prevent query injection
- SQL queries use parameterized statements exclusively

### Database Security

- Database is opened in read-only mode at runtime
- No write operations are performed during query processing
- Database file permissions should be set to read-only (644)

### Dependency Management

- Dependencies are kept to a minimum
- Automated security scanning via GitHub Actions (Trivy, Semgrep, Gitleaks, CodeQL)
- OSSF Scorecard checks for supply chain security
- Regular dependency updates via Dependabot

### Transport Security

- stdio transport: inherits process-level isolation
- HTTP transport: served over HTTPS via Vercel

### No Secrets in Code

- No API keys, credentials, or secrets are stored in the codebase
- Environment variables are used for any configuration that could be sensitive
- `.gitleaks.toml` enforced via CI to prevent accidental secret commits

## Security CI/CD Pipeline

Every pull request runs:

1. **CodeQL** — static analysis for code vulnerabilities
2. **Semgrep** — pattern-based security scanning
3. **Trivy** — dependency vulnerability scanning
4. **Gitleaks** — secret detection
5. **OSSF Scorecard** — supply chain security assessment
