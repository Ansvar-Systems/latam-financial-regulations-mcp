import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from '@ansvar/mcp-sqlite';
import { getProvision } from '../../src/tools/get-provision.js';
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

describe('get_provision', () => {
  it('retrieves a valid provision from Brazil BACEN', async () => {
    const result = await getProvision(db, {
      country: 'BR',
      regulation_id: 'bacen-res-cmn-4893',
      article: 'art-1',
    });
    expect(result.provision).toBeDefined();
    expect((result.provision as any).country_code).toBe('BR');
    expect((result.provision as any).regulation_id).toBe('bacen-res-cmn-4893');
    expect((result.provision as any).content).toBeTruthy();
  });

  it('returns error for non-existent provision', async () => {
    const result = await getProvision(db, {
      country: 'BR',
      regulation_id: 'bacen-res-cmn-4893',
      article: 'art-99999',
    });
    expect(result.error).toBeDefined();
    expect(result.provision).toBeNull();
  });

  it('returns error for invalid country code', async () => {
    const result = await getProvision(db, {
      country: 'ZZ',
      regulation_id: 'test',
      article: 'art-1',
    });
    expect(result.error).toContain('Invalid country code');
  });

  it('returns error when required parameters are missing', async () => {
    const result = await getProvision(db, {
      country: 'BR',
      regulation_id: '',
      article: '',
    });
    expect(result.error).toBeDefined();
  });

  it('includes _meta in response', async () => {
    const result = await getProvision(db, {
      country: 'BR',
      regulation_id: 'bacen-res-cmn-4893',
      article: 'art-1',
    });
    expect(result._meta).toBeDefined();
  });
});
