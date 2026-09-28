// Turn one captured SQL-editor response into the plain SQL block it carries.
//
// The dashboard returns [{"blob":"<base64>"}]; the base64 is Postgres's own, so it
// is line-wrapped every 76 characters, which base64 -d handles but naive string
// handling does not. Usage:
//
//   node unpack.js incoming/02.json 02_constraints.sql
const fs = require('fs');
const path = require('path');

const [jsonFile, outFile] = process.argv.slice(2);
if (!jsonFile || !outFile) {
  console.error('usage: node unpack.js <captured.json> <out.sql>');
  process.exit(2);
}
const dir = path.dirname(jsonFile);
const rows = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
if (!Array.isArray(rows) || rows.length === 0) {
  console.error(`${jsonFile}: expected a non-empty array of rows`);
  process.exit(1);
}
const b64 = rows.map((r) => r.blob).join('');
if (!b64) {
  console.error(`${jsonFile}: no blob column (${Object.keys(rows[0]).join(',')})`);
  process.exit(1);
}
const sql = Buffer.from(b64.replace(/\s+/g, ''), 'base64').toString('utf8');
const target = path.join(dir, outFile);
fs.writeFileSync(target, sql);
const counts = {
  tables: (sql.match(/^create table /gm) || []).length,
  constraints: (sql.match(/^alter table /gm) || []).length,
  indexes: (sql.match(/^create (unique )?index /gm) || []).length,
  policies: (sql.match(/^create policy /gm) || []).length,
  grants: (sql.match(/^grant /gm) || []).length,
  functions: (sql.match(/^CREATE FUNCTION|^create function/gm) || []).length,
  triggers: (sql.match(/^create trigger/gm) || []).length,
};
console.log(`${outFile}: ${sql.length} bytes`, JSON.stringify(counts));
