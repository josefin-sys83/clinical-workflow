#!/usr/bin/env node
// Run: node db/migrate.js
// Applies all *.sql migrations in order, tracking applied ones in a schema_migrations table.

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Split SQL on semicolons, ignoring them inside -- line comments and $$ dollar-quotes.
function splitStatements(sql) {
  const results = [];
  let buf = '';
  let inLineComment = false;
  let inDollarQuote = false;
  let dollarTag = '';

  const hasSQL = (s) => s.split('\n').some(l => { const t = l.trim(); return t && !t.startsWith('--'); });

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    // Newline ends a line comment
    if (ch === '\n') {
      inLineComment = false;
      buf += ch;
      continue;
    }

    // Detect start of -- line comment
    if (!inDollarQuote && !inLineComment && ch === '-' && sql[i + 1] === '-') {
      inLineComment = true;
      buf += ch;
      continue;
    }

    // Inside line comment: pass through verbatim, never split
    if (inLineComment) { buf += ch; continue; }

    // Open dollar-quote
    if (!inDollarQuote && ch === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_0-9]*)\$/);
      if (m) {
        dollarTag = m[0];
        inDollarQuote = true;
        buf += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }

    // Close dollar-quote
    if (inDollarQuote && ch === '$' && sql.slice(i).startsWith(dollarTag)) {
      buf += dollarTag;
      i += dollarTag.length - 1;
      inDollarQuote = false;
      dollarTag = '';
      continue;
    }

    // Statement terminator
    if (!inDollarQuote && ch === ';') {
      const stmt = buf.trim();
      if (hasSQL(stmt)) results.push(stmt);
      buf = '';
      continue;
    }

    buf += ch;
  }

  const stmt = buf.trim();
  if (hasSQL(stmt)) results.push(stmt);
  return results;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error('DATABASE_URL is not set'); process.exit(1); }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename   text        primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const applied = new Set(
      (await client.query('select filename from schema_migrations')).rows.map(r => r.filename)
    );

    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) { console.log(`  skip  ${file}`); continue; }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const statements = splitStatements(sql);
      console.log(`  apply ${file} (${statements.length} statements) ...`);

      await client.query('begin');
      try {
        for (const stmt of statements) await client.query(stmt);
        await client.query('insert into schema_migrations (filename) values ($1)', [file]);
        await client.query('commit');
        console.log(`        done`);
        ran++;
      } catch (err) {
        await client.query('rollback');
        throw new Error(`Migration ${file} failed:\n  ${err.message}`);
      }
    }

    if (ran === 0) console.log('All migrations already up to date.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
