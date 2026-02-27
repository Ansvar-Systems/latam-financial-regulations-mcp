import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';
import { about } from '../../src/tools/about.js';
import { listSources } from '../../src/tools/list-sources.js';
import { checkDataFreshness } from '../../src/tools/check-data-freshness.js';
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

describe('about', () => {
  it('returns server name, version, and jurisdictions', async () => {
    const result = await about(db);
    expect(result.name).toBe('latam-financial-regulations-mcp');
    expect(result.version).toBe('0.1.0');
    expect(result.jurisdictions).toBeDefined();
    expect((result.jurisdictions as any[]).length).toBe(6);
  });

  it('reports statistics with non-zero counts', async () => {
    const result = await about(db);
    expect(result.stats.regulators).toBeGreaterThan(0);
    expect(result.stats.regulations).toBeGreaterThan(0);
    expect(result.stats.provisions).toBeGreaterThan(0);
  });

  it('lists all 10 tools', async () => {
    const result = await about(db);
    expect(result.tools).toHaveLength(10);
    expect(result.tools).toContain('search_regulations');
    expect(result.tools).toContain('about');
  });

  it('lists regulators', async () => {
    const result = await about(db);
    expect((result.regulators as any[]).length).toBeGreaterThan(0);
    const regulatorIds = (result.regulators as any[]).map((r: any) => r.id);
    expect(regulatorIds).toContain('BACEN');
  });

  it('includes _metadata in response', async () => {
    const result = await about(db);
    expect(result._metadata).toBeDefined();
  });
});

describe('list_sources', () => {
  it('returns sources with correct count', async () => {
    const result = await listSources(db);
    expect(result.total_sources).toBe(8);
    expect((result.sources as any[]).length).toBe(8);
  });

  it('each source has expected fields', async () => {
    const result = await listSources(db);
    for (const source of result.sources as any[]) {
      expect(source).toHaveProperty('id');
      expect(source).toHaveProperty('full_name');
    }
  });

  it('includes stats in response', async () => {
    const result = await listSources(db);
    expect(result.stats.regulators).toBeGreaterThan(0);
    expect(result.stats.regulations).toBeGreaterThan(0);
    expect(result.stats.provisions).toBeGreaterThan(0);
  });
});

describe('check_data_freshness', () => {
  it('returns freshness data with threshold', async () => {
    const result = await checkDataFreshness(db);
    expect(result.stale_threshold_days).toBe(90);
    expect(result.summary.total_sources).toBeGreaterThan(0);
    expect((result.sources as any[]).length).toBeGreaterThan(0);
  });

  it('each source has freshness fields', async () => {
    const result = await checkDataFreshness(db);
    for (const source of result.sources as any[]) {
      expect(source).toHaveProperty('source_id');
      expect(source).toHaveProperty('stale');
      expect(typeof source.stale).toBe('boolean');
    }
  });
});
