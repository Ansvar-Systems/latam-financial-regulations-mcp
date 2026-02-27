import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';
import { getCybersecurityRequirements } from '../../src/tools/cybersecurity-requirements.js';
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

describe('get_cybersecurity_requirements', () => {
  it('returns cybersecurity requirements for Brazil', async () => {
    const result = await getCybersecurityRequirements(db, { country: 'BR' });
    expect(result.country).toBe('BR');
    expect(result.country_name).toBe('Brazil');
    expect(result.total).toBeGreaterThan(0);
    expect((result.requirements as any[]).length).toBe(result.total);
  });

  it('returns requirements for all 6 countries', async () => {
    const countries = ['BR', 'CL', 'CO', 'UY', 'MX', 'PE'];
    for (const country of countries) {
      const result = await getCybersecurityRequirements(db, { country });
      expect(result.country).toBe(country);
      expect(result.total).toBeGreaterThanOrEqual(0);
    }
  });

  it('filters by sector', async () => {
    const result = await getCybersecurityRequirements(db, {
      country: 'BR',
      sector: 'banking',
    });
    expect(result.sector).toBe('banking');
    for (const req of result.requirements as any[]) {
      expect(req.sector).toBe('banking');
    }
  });

  it('returns error for invalid country code', async () => {
    const result = await getCybersecurityRequirements(db, { country: 'ZZ' });
    expect(result.error).toContain('Invalid country code');
  });

  it('returns error for invalid sector', async () => {
    const result = await getCybersecurityRequirements(db, {
      country: 'BR',
      sector: 'invalid',
    });
    expect(result.error).toContain('Invalid sector');
  });

  it('each requirement has expected fields', async () => {
    const result = await getCybersecurityRequirements(db, { country: 'BR' });
    for (const req of result.requirements as any[]) {
      expect(req).toHaveProperty('id');
      expect(req).toHaveProperty('requirement');
      expect(req).toHaveProperty('country_code');
      expect(req.country_code).toBe('BR');
    }
  });
});
