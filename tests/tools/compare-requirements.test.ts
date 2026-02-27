import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';
import { compareRequirements } from '../../src/tools/compare-requirements.js';
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

describe('compare_requirements', () => {
  it('compares BR and CL on "cybersecurity" and returns results', async () => {
    const result = await compareRequirements(db, {
      countries: ['BR', 'CL'],
      topic: 'cybersecurity',
    });
    expect(result.topic).toBe('cybersecurity');
    expect(result.countries_compared).toHaveLength(2);
    expect(result.comparison).toBeDefined();
    expect(result.total_results).toBeGreaterThan(0);
  });

  it('returns error when fewer than 2 countries', async () => {
    const result = await compareRequirements(db, {
      countries: ['BR'],
      topic: 'cybersecurity',
    });
    expect(result.error).toContain('at least 2');
  });

  it('returns error for empty topic', async () => {
    const result = await compareRequirements(db, {
      countries: ['BR', 'CL'],
      topic: '',
    });
    expect(result.error).toContain('topic');
  });

  it('returns error for invalid country codes', async () => {
    const result = await compareRequirements(db, {
      countries: ['BR', 'ZZ'],
      topic: 'cybersecurity',
    });
    expect(result.error).toContain('Invalid country codes');
  });

  it('handles special characters in topic', async () => {
    const result = await compareRequirements(db, {
      countries: ['BR', 'CL'],
      topic: '***!!!###',
    });
    expect(result.total_results).toBe(0);
    expect(result.message).toContain('special characters');
  });

  it('includes _meta in response', async () => {
    const result = await compareRequirements(db, {
      countries: ['BR', 'CL'],
      topic: 'data',
    });
    expect(result._meta).toBeDefined();
  });
});
