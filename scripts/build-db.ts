#!/usr/bin/env tsx

/**
 * build-db.ts — Build the SQLite database with the full schema for
 * LATAM Financial Regulations MCP.
 *
 * Usage: tsx scripts/build-db.ts [--output path/to/database.db]
 */

import { Database } from '@ansvar/mcp-sqlite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(__dirname, '..', 'data', 'database.db');

function getOutputPath(): string {
  const idx = process.argv.indexOf('--output');
  if (idx !== -1 && process.argv[idx + 1]) {
    return resolve(process.argv[idx + 1]);
  }
  return defaultDbPath;
}

function buildSchema(db: Database): void {
  db.exec(`
    -- Regulators
    CREATE TABLE IF NOT EXISTS regulators (
      id TEXT PRIMARY KEY,
      country_code TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT,
      sector TEXT,
      website TEXT
    );

    -- Regulations
    CREATE TABLE IF NOT EXISTS regulations (
      id TEXT PRIMARY KEY,
      regulator_id TEXT NOT NULL REFERENCES regulators(id),
      country_code TEXT NOT NULL,
      title TEXT NOT NULL,
      official_number TEXT,
      year INTEGER,
      sector TEXT,
      status TEXT DEFAULT 'in_force',
      source_url TEXT,
      last_updated TEXT
    );

    -- Provisions (articles)
    CREATE TABLE IF NOT EXISTS provisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      regulation_id TEXT NOT NULL REFERENCES regulations(id),
      country_code TEXT NOT NULL,
      article_ref TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      topic TEXT,
      UNIQUE(regulation_id, article_ref)
    );

    -- FTS5 index on provisions
    CREATE VIRTUAL TABLE IF NOT EXISTS provisions_fts USING fts5(
      content, title, article_ref,
      content='provisions', content_rowid='id'
    );

    -- FTS triggers
    CREATE TRIGGER IF NOT EXISTS provisions_ai AFTER INSERT ON provisions BEGIN
      INSERT INTO provisions_fts(rowid, content, title, article_ref)
      VALUES (new.id, new.content, new.title, new.article_ref);
    END;

    CREATE TRIGGER IF NOT EXISTS provisions_ad AFTER DELETE ON provisions BEGIN
      INSERT INTO provisions_fts(provisions_fts, rowid, content, title, article_ref)
      VALUES ('delete', old.id, old.content, old.title, old.article_ref);
    END;

    CREATE TRIGGER IF NOT EXISTS provisions_au AFTER UPDATE ON provisions BEGIN
      INSERT INTO provisions_fts(provisions_fts, rowid, content, title, article_ref)
      VALUES ('delete', old.id, old.content, old.title, old.article_ref);
      INSERT INTO provisions_fts(rowid, content, title, article_ref)
      VALUES (new.id, new.content, new.title, new.article_ref);
    END;

    -- Cybersecurity requirements
    CREATE TABLE IF NOT EXISTS cybersecurity_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      regulator_id TEXT REFERENCES regulators(id),
      sector TEXT,
      requirement TEXT NOT NULL,
      legal_basis TEXT,
      category TEXT
    );

    -- Reporting requirements (incident/breach)
    CREATE TABLE IF NOT EXISTS reporting_requirements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      regulator_id TEXT REFERENCES regulators(id),
      event_type TEXT NOT NULL,
      timeline TEXT,
      channel TEXT,
      penalties TEXT
    );

    -- Outsourcing rules (cloud/third-party)
    CREATE TABLE IF NOT EXISTS outsourcing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      regulator_id TEXT REFERENCES regulators(id),
      rule_type TEXT NOT NULL,
      description TEXT NOT NULL,
      legal_basis TEXT
    );

    -- Open banking / Open Finance rules
    CREATE TABLE IF NOT EXISTS open_banking_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      framework_name TEXT NOT NULL,
      description TEXT,
      api_standards TEXT,
      data_sharing_rules TEXT,
      legal_basis TEXT
    );

    -- Sources (provenance tracking)
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      authority TEXT,
      jurisdiction TEXT,
      source_url TEXT,
      last_fetched TEXT,
      last_updated TEXT,
      item_count INTEGER DEFAULT 0
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_provisions_country ON provisions(country_code);
    CREATE INDEX IF NOT EXISTS idx_provisions_regulation ON provisions(regulation_id);
    CREATE INDEX IF NOT EXISTS idx_regulations_country ON regulations(country_code);
    CREATE INDEX IF NOT EXISTS idx_regulations_regulator ON regulations(regulator_id);
    CREATE INDEX IF NOT EXISTS idx_regulations_sector ON regulations(sector);
    CREATE INDEX IF NOT EXISTS idx_cyber_country ON cybersecurity_requirements(country_code);
    CREATE INDEX IF NOT EXISTS idx_reporting_country ON reporting_requirements(country_code);
    CREATE INDEX IF NOT EXISTS idx_outsourcing_country ON outsourcing_rules(country_code);
    CREATE INDEX IF NOT EXISTS idx_openbanking_country ON open_banking_rules(country_code);
  `);
}

function seedRegulators(db: Database): void {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO regulators (id, country_code, name, full_name, sector, website) VALUES (?, ?, ?, ?, ?, ?)',
  );

  const regulators = [
    ['BACEN', 'BR', 'BACEN', 'Banco Central do Brasil', 'banking', 'https://www.bcb.gov.br'],
    ['CVM', 'BR', 'CVM', 'Comissao de Valores Mobiliarios', 'securities', 'https://www.cvm.gov.br'],
    ['SUSEP', 'BR', 'SUSEP', 'Superintendencia de Seguros Privados', 'insurance', 'https://www.susep.gov.br'],
    ['CMF', 'CL', 'CMF', 'Comision para el Mercado Financiero', 'banking', 'https://www.cmfchile.cl'],
    ['SFC', 'CO', 'SFC', 'Superintendencia Financiera de Colombia', 'banking', 'https://www.superfinanciera.gov.co'],
    ['BCU', 'UY', 'BCU', 'Banco Central del Uruguay', 'banking', 'https://www.bcu.gub.uy'],
    ['CNBV', 'MX', 'CNBV', 'Comision Nacional Bancaria y de Valores', 'banking', 'https://www.cnbv.gob.mx'],
    ['SBS', 'PE', 'SBS', 'Superintendencia de Banca, Seguros y AFP', 'banking', 'https://www.sbs.gob.pe'],
  ];

  for (const r of regulators) {
    insert.run(...r);
  }
}

function seedSources(db: Database): void {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO sources (id, full_name, authority, jurisdiction, source_url, last_fetched, last_updated, item_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );

  const sources = [
    ['bacen', 'Banco Central do Brasil - Normas', 'BACEN', 'BR', 'https://www.bcb.gov.br/estabilidadefinanceira/buscanormas', null, null, 0],
    ['cvm', 'CVM - Legislacao e Regulamentacao', 'CVM', 'BR', 'https://www.cvm.gov.br/legislacao/', null, null, 0],
    ['susep', 'SUSEP - Normas', 'SUSEP', 'BR', 'https://www.susep.gov.br/menu/informacoes-ao-mercado/normas', null, null, 0],
    ['cmf', 'CMF Chile - Normativa', 'CMF', 'CL', 'https://www.cmfchile.cl/portal/legislacion/615/w3-channel.html', null, null, 0],
    ['sfc', 'SFC Colombia - Normativa', 'SFC', 'CO', 'https://www.superfinanciera.gov.co/jsp/60940', null, null, 0],
    ['bcu', 'BCU Uruguay - Normativa', 'BCU', 'UY', 'https://www.bcu.gub.uy/Acerca-de-BCU/Normativa/', null, null, 0],
    ['cnbv', 'CNBV Mexico - Normatividad', 'CNBV', 'MX', 'https://www.cnbv.gob.mx/Normatividad/', null, null, 0],
    ['sbs', 'SBS Peru - Normativa', 'SBS', 'PE', 'https://www.sbs.gob.pe/normativa', null, null, 0],
  ];

  for (const s of sources) {
    insert.run(...s);
  }
}

function main(): void {
  const outputPath = getOutputPath();
  console.log(`Building database at: ${outputPath}`);

  mkdirSync(dirname(outputPath), { recursive: true });

  const db = new Database(outputPath);

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  buildSchema(db);
  seedRegulators(db);
  seedSources(db);

  // Counts
  const regulators = db.prepare('SELECT COUNT(*) AS cnt FROM regulators').get() as { cnt: number };
  const sources = db.prepare('SELECT COUNT(*) AS cnt FROM sources').get() as { cnt: number };

  console.log(`Schema created.`);
  console.log(`Seeded ${regulators.cnt} regulators.`);
  console.log(`Seeded ${sources.cnt} sources.`);
  console.log(`Database ready: ${outputPath}`);

  db.close();
}

main();
