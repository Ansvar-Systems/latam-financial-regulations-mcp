import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';
import { getReportingRequirements } from '../../src/tools/reporting-requirements.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'data', 'database.db');

let db: InstanceType<typeof Database>;

beforeAll(() => {
  db = new Database(DB_PATH, { readonly: true });
});

afterAll(() => {
  db.close();
});

describe('get_reporting_requirements', () => {
  it('returns reporting requirements for Brazil', async () => {
    const result = await getReportingRequirements(db, { country: 'BR' });
    expect(result.country).toBe('BR');
    expect(result.country_name).toBe('Brazil');
    expect(result.total).toBeGreaterThan(0);
    expect((result.requirements as any[]).length).toBe(result.total);
  });

  it('returns error for invalid country code', async () => {
    const result = await getReportingRequirements(db, { country: 'ZZ' });
    expect(result.error).toContain('Invalid country code');
  });

  it('each requirement has event_type field', async () => {
    const result = await getReportingRequirements(db, { country: 'BR' });
    for (const req of result.requirements as any[]) {
      expect(req).toHaveProperty('event_type');
      expect(req).toHaveProperty('country_code');
      expect(req.country_code).toBe('BR');
    }
  });

  it('includes _meta in response', async () => {
    const result = await getReportingRequirements(db, { country: 'BR' });
    expect(result._meta).toBeDefined();
  });
});
