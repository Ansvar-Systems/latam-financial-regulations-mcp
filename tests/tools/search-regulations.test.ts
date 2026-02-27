import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';
import { searchRegulations } from '../../src/tools/search-regulations.js';
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

describe('search_regulations', () => {
  it('returns results when searching "seguranca"', async () => {
    const result = await searchRegulations(db, { query: 'seguranca' });
    expect(result.total).toBeGreaterThan(0);
    expect((result.results as any[]).length).toBeGreaterThan(0);
  });

  it('filters by country code "BR"', async () => {
    const result = await searchRegulations(db, {
      query: 'seguranca',
      country: 'BR',
    });
    expect(result.total).toBeGreaterThan(0);
    for (const row of result.results as any[]) {
      expect(row.country_code).toBe('BR');
    }
  });

  it('filters by sector "banking"', async () => {
    const result = await searchRegulations(db, {
      query: 'data',
      sector: 'banking',
    });
    for (const row of result.results as any[]) {
      expect(row.sector).toBe('banking');
    }
  });

  it('caps results at the specified limit', async () => {
    const result = await searchRegulations(db, {
      query: 'financial',
      limit: 3,
    });
    expect(result.results.length).toBeLessThanOrEqual(3);
  });

  it('returns error for empty query', async () => {
    const result = await searchRegulations(db, { query: '' });
    expect(result.error).toBeDefined();
  });

  it('returns error for invalid country code', async () => {
    const result = await searchRegulations(db, {
      query: 'data',
      country: 'ZZ',
    });
    expect(result.error).toContain('Invalid country code');
  });

  it('returns error for invalid sector', async () => {
    const result = await searchRegulations(db, {
      query: 'data',
      sector: 'invalid_sector',
    });
    expect(result.error).toContain('Invalid sector');
  });

  it('handles special characters in query', async () => {
    const result = await searchRegulations(db, { query: '!!!***###' });
    expect(result.total).toBe(0);
    expect(result.message).toContain('special characters');
  });

  it('includes _metadata in response', async () => {
    const result = await searchRegulations(db, { query: 'risk' });
    expect(result._metadata).toBeDefined();
    expect(result._metadata.disclaimer).toBeTruthy();
  });
});
