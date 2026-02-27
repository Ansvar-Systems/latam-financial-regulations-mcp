import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';
import { getOutsourcingRules } from '../../src/tools/outsourcing-rules.js';
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

describe('get_outsourcing_rules', () => {
  it('returns outsourcing rules for Brazil', async () => {
    const result = await getOutsourcingRules(db, { country: 'BR' });
    expect(result.country).toBe('BR');
    expect(result.country_name).toBe('Brazil');
    expect(result.total).toBeGreaterThan(0);
    expect((result.rules as any[]).length).toBe(result.total);
  });

  it('returns error for invalid country code', async () => {
    const result = await getOutsourcingRules(db, { country: 'ZZ' });
    expect(result.error).toContain('Invalid country code');
  });

  it('each rule has expected fields', async () => {
    const result = await getOutsourcingRules(db, { country: 'BR' });
    for (const rule of result.rules as any[]) {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('rule_type');
      expect(rule).toHaveProperty('description');
      expect(rule.country_code).toBe('BR');
    }
  });

  it('includes _metadata in response', async () => {
    const result = await getOutsourcingRules(db, { country: 'BR' });
    expect(result._metadata).toBeDefined();
  });
});
