// Runs the project's schema + seed in an in-memory Postgres (PGlite) and
// executes every query in ./queries with Grafana's time macros expanded.
// Output: ./.render/data/<query>.json as Grafana-like data frames, which
// render.mjs feeds to the panels to produce the screenshots.
//
//   node tools/run-queries.mjs [--range 7d]
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rangeArg = process.argv.indexOf('--range');
const rangeDays = rangeArg > 0 ? parseFloat(process.argv[rangeArg + 1]) : 7;

const db = new PGlite();
for (const f of fs.readdirSync(path.join(root, 'db')).filter((f) => f.endsWith('.sql')).sort()) {
  const t0 = Date.now();
  await db.exec(fs.readFileSync(path.join(root, 'db', f), 'utf8'));
  console.log(`db/${f}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

// Grafana macros -> literal SQL for a fixed range ending now
const { rows: [{ now }] } = await db.query('SELECT now() AS now');
const to = new Date(now);
const from = new Date(to.getTime() - rangeDays * 864e5);
// Same expansion as Grafana's PostgreSQL data source: plain quoted ISO strings
// (queries cast them with ::timestamptz where needed)
const lit = (d) => `'${d.toISOString().replace(/\.\d{3}Z$/, 'Z')}'`;
const expand = (sql) => sql
  .replace(/\$__timeFilter\(([^)]+)\)/g, (_, c) => `${c} BETWEEN ${lit(from)} AND ${lit(to)}`)
  .replace(/\$__timeFrom\(\)/g, lit(from))
  .replace(/\$__timeTo\(\)/g, lit(to));

// Postgres type -> Grafana field type
const TIME = new Set([1082, 1114, 1184]);           // date, timestamp, timestamptz
const NUM = new Set([20, 21, 23, 700, 701, 1700]);  // int*, float*, numeric
const outDir = path.join(root, '.render', 'data');
fs.mkdirSync(outDir, { recursive: true });

for (const f of fs.readdirSync(path.join(root, 'queries')).filter((f) => f.endsWith('.sql')).sort()) {
  const res = await db.query(expand(fs.readFileSync(path.join(root, 'queries', f), 'utf8')));
  const fields = res.fields.map((fd) => {
    const type = TIME.has(fd.dataTypeID) ? 'time' : NUM.has(fd.dataTypeID) ? 'number' : 'string';
    const values = res.rows.map((r) => {
      const v = r[fd.name];
      if (v == null) return null;
      if (type === 'time') return new Date(v).getTime();
      if (type === 'number') return Number(v);
      return String(v);
    });
    return { name: fd.name, type, values };
  });
  fs.writeFileSync(path.join(outDir, f.replace(/\.sql$/, '.json')), JSON.stringify({ fields, range: { from: +from, to: +to } }));
  console.log(`queries/${f}  ${res.rows.length} rows`);
}
await db.close();
