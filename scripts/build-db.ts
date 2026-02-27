#!/usr/bin/env tsx

/**
 * build-db.ts — Build the SQLite database for LATAM Financial Regulations MCP.
 *
 * Loads seed data from data/seed/ JSON files and creates the full schema
 * with FTS5 indexes.
 *
 * Usage: tsx scripts/build-db.ts [--output path/to/database.db]
 */

import Database from '@ansvar/mcp-sqlite';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync, unlinkSync, readFileSync, statSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(__dirname, '..', 'data', 'database.db');
const seedDir = resolve(__dirname, '..', 'data', 'seed');

function getOutputPath(): string {
  const idx = process.argv.indexOf('--output');
  if (idx !== -1 && process.argv[idx + 1]) {
    return resolve(process.argv[idx + 1]);
  }
  return defaultDbPath;
}

function loadJson<T>(filename: string): T {
  const filePath = join(seedDir, filename);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

function buildSchema(db: InstanceType<typeof Database>): void {
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

    -- Database metadata
    CREATE TABLE IF NOT EXISTS db_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
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

// ---------------------------------------------------------------------------
// Seed data types
// ---------------------------------------------------------------------------

interface Regulator {
  id: string;
  country_code: string;
  name: string;
  full_name: string;
  sector: string;
  website: string;
}

interface Regulation {
  id: string;
  regulator_id: string;
  country_code: string;
  title: string;
  official_number: string;
  year: number;
  sector: string;
  status: string;
  source_url: string;
  last_updated: string;
}

interface Provision {
  regulation_id: string;
  country_code: string;
  article_ref: string;
  title: string | null;
  content: string;
  topic: string | null;
}

interface CyberReq {
  country_code: string;
  regulator_id: string;
  sector: string;
  requirement: string;
  legal_basis: string;
  category: string;
}

interface ReportingReq {
  country_code: string;
  regulator_id: string;
  event_type: string;
  timeline: string;
  channel: string;
  penalties: string;
}

interface OutsourcingRule {
  country_code: string;
  regulator_id: string;
  rule_type: string;
  description: string;
  legal_basis: string;
}

interface OpenBankingRule {
  country_code: string;
  framework_name: string;
  description: string;
  api_standards: string;
  data_sharing_rules: string;
  legal_basis: string;
}

interface Source {
  id: string;
  full_name: string;
  authority: string;
  jurisdiction: string;
  source_url: string;
  last_fetched: string | null;
  last_updated: string | null;
  item_count: number;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const outputPath = getOutputPath();
  const today = new Date().toISOString().split('T')[0]!;

  console.log('=== LATAM Financial Regulations MCP — Database Build ===\n');
  console.log(`Output: ${outputPath}`);

  // Ensure data directory exists
  mkdirSync(dirname(outputPath), { recursive: true });

  // Remove existing database
  if (existsSync(outputPath)) {
    unlinkSync(outputPath);
    console.log('Removed existing database.');
  }

  const db = new Database(outputPath);

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // 1. Schema
  buildSchema(db);
  console.log('Schema created.');

  // 2. Regulators
  const regulators = loadJson<Regulator[]>('regulators.json');
  const insertRegulator = db.prepare(
    'INSERT OR IGNORE INTO regulators (id, country_code, name, full_name, sector, website) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const r of regulators) {
    insertRegulator.run(r.id, r.country_code, r.name, r.full_name, r.sector, r.website);
  }
  console.log(`Seeded ${regulators.length} regulators.`);

  // 3. Sources
  const sources = loadJson<Source[]>('sources.json');
  const insertSource = db.prepare(
    'INSERT OR IGNORE INTO sources (id, full_name, authority, jurisdiction, source_url, last_fetched, last_updated, item_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (const s of sources) {
    insertSource.run(s.id, s.full_name, s.authority, s.jurisdiction, s.source_url, s.last_fetched, s.last_updated, s.item_count);
  }
  console.log(`Seeded ${sources.length} sources.`);

  // 4. Regulations
  const regulations = loadJson<Regulation[]>('regulations.json');
  const insertRegulation = db.prepare(
    'INSERT OR IGNORE INTO regulations (id, regulator_id, country_code, title, official_number, year, sector, status, source_url, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (const reg of regulations) {
    insertRegulation.run(reg.id, reg.regulator_id, reg.country_code, reg.title, reg.official_number, reg.year, reg.sector, reg.status, reg.source_url, reg.last_updated);
  }
  console.log(`Seeded ${regulations.length} regulations.`);

  // 5. Provisions
  const provisions = loadJson<Provision[]>('provisions.json');
  const insertProvision = db.prepare(
    'INSERT OR IGNORE INTO provisions (regulation_id, country_code, article_ref, title, content, topic) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const p of provisions) {
    insertProvision.run(p.regulation_id, p.country_code, p.article_ref, p.title, p.content, p.topic);
  }
  console.log(`Seeded ${provisions.length} provisions.`);

  // 6. Cybersecurity requirements
  const cyberReqs = loadJson<CyberReq[]>('cybersecurity_requirements.json');
  const insertCyber = db.prepare(
    'INSERT INTO cybersecurity_requirements (country_code, regulator_id, sector, requirement, legal_basis, category) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const cr of cyberReqs) {
    insertCyber.run(cr.country_code, cr.regulator_id, cr.sector, cr.requirement, cr.legal_basis, cr.category);
  }
  console.log(`Seeded ${cyberReqs.length} cybersecurity requirements.`);

  // 7. Reporting requirements
  const reportingReqs = loadJson<ReportingReq[]>('reporting_requirements.json');
  const insertReporting = db.prepare(
    'INSERT INTO reporting_requirements (country_code, regulator_id, event_type, timeline, channel, penalties) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const rr of reportingReqs) {
    insertReporting.run(rr.country_code, rr.regulator_id, rr.event_type, rr.timeline, rr.channel, rr.penalties);
  }
  console.log(`Seeded ${reportingReqs.length} reporting requirements.`);

  // 8. Outsourcing rules
  const outsourcingRules = loadJson<OutsourcingRule[]>('outsourcing_rules.json');
  const insertOutsourcing = db.prepare(
    'INSERT INTO outsourcing_rules (country_code, regulator_id, rule_type, description, legal_basis) VALUES (?, ?, ?, ?, ?)',
  );
  for (const o of outsourcingRules) {
    insertOutsourcing.run(o.country_code, o.regulator_id, o.rule_type, o.description, o.legal_basis);
  }
  console.log(`Seeded ${outsourcingRules.length} outsourcing rules.`);

  // 9. Open banking rules
  const openBankingRules = loadJson<OpenBankingRule[]>('open_banking_rules.json');
  const insertOpenBanking = db.prepare(
    'INSERT INTO open_banking_rules (country_code, framework_name, description, api_standards, data_sharing_rules, legal_basis) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const ob of openBankingRules) {
    insertOpenBanking.run(ob.country_code, ob.framework_name, ob.description, ob.api_standards, ob.data_sharing_rules, ob.legal_basis);
  }
  console.log(`Seeded ${openBankingRules.length} open banking rules.`);

  // 10. Update source item counts
  const countByRegulator = db.prepare(`
    SELECT r.regulator_id, COUNT(*) AS cnt
    FROM provisions p
    JOIN regulations r ON r.id = p.regulation_id
    GROUP BY r.regulator_id
  `).all() as Array<{ regulator_id: string; cnt: number }>;

  const regulatorToSource: Record<string, string> = {
    BACEN: 'bacen',
    CVM: 'cvm',
    SUSEP: 'susep',
    CMF: 'cmf',
    SFC: 'sfc',
    BCU: 'bcu',
    CNBV: 'cnbv',
    SBS: 'sbs',
  };

  const updateSource = db.prepare(
    'UPDATE sources SET item_count = ?, last_fetched = ?, last_updated = ? WHERE id = ?',
  );
  for (const row of countByRegulator) {
    const sourceId = regulatorToSource[row.regulator_id];
    if (sourceId) {
      updateSource.run(row.cnt, today, today, sourceId);
    }
  }
  console.log('Updated source item counts.');

  // 11. Rebuild FTS index
  db.exec(`INSERT INTO provisions_fts(provisions_fts) VALUES('rebuild')`);
  console.log('FTS5 index rebuilt.');

  // 12. Metadata
  const insertMeta = db.prepare('INSERT OR REPLACE INTO db_metadata (key, value) VALUES (?, ?)');
  insertMeta.run('tier', 'free');
  insertMeta.run('schema_version', '1.0');
  insertMeta.run('domain', 'financial-regulation');
  insertMeta.run('region', 'latam');
  insertMeta.run('record_count', String(provisions.length));
  insertMeta.run('build_date', today);
  insertMeta.run('regulators', String(regulators.length));
  insertMeta.run('regulations', String(regulations.length));
  insertMeta.run('cybersecurity_requirements', String(cyberReqs.length));
  insertMeta.run('reporting_requirements', String(reportingReqs.length));
  insertMeta.run('outsourcing_rules', String(outsourcingRules.length));
  insertMeta.run('open_banking_rules', String(openBankingRules.length));
  console.log('Metadata inserted.');

  // 13. Set journal mode to DELETE for WASM compatibility, then VACUUM
  db.pragma('journal_mode = DELETE');
  db.exec('VACUUM');
  db.close();

  // Final report
  const dbSize = statSync(outputPath).size;
  const dbSizeMB = (dbSize / 1024 / 1024).toFixed(2);

  console.log('\n=== Build Complete ===');
  console.log(`Regulators:          ${regulators.length}`);
  console.log(`Sources:             ${sources.length}`);
  console.log(`Regulations:         ${regulations.length}`);
  console.log(`Provisions:          ${provisions.length}`);
  console.log(`Cyber Requirements:  ${cyberReqs.length}`);
  console.log(`Reporting Reqs:      ${reportingReqs.length}`);
  console.log(`Outsourcing Rules:   ${outsourcingRules.length}`);
  console.log(`Open Banking Rules:  ${openBankingRules.length}`);
  console.log(`Database Size:       ${dbSizeMB} MB`);
  console.log(`Strategy:            A (Vercel Bundled)`);
  console.log(`Build Date:          ${today}`);
}

main();
