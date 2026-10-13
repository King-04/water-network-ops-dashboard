// Builds the Grafana dashboard JSON from dashboard.config.mjs:
// kit + includes + panel source are concatenated into each Business Charts
// panel's code, and each panel gets its SQL queries as raw targets.
//
//   node tools/build.mjs   ->  grafana/dashboards/<uid>.json
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const cfg = (await import(pathToFileURL(path.join(root, 'dashboard.config.mjs')).href)).default;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const kit = cfg.kit.map(read).join('\n');
const panels = cfg.panels.map((p) => {
  const code = [
    `// ${cfg.title} · panel ${p.id} — generated from src/panels/${p.src}; edit the source, then npm run build`,
    kit,
    ...(p.include || []).map(read),
    `// ---- panel: ${p.src} ----`,
    read(`src/panels/${p.src}`),
  ].join('\n');
  return {
    id: p.id,
    type: 'volkovlabs-echarts-panel',
    title: '',                          // the card draws its own title
    transparent: true,
    gridPos: p.gridPos,
    datasource: cfg.datasource,
    targets: Object.entries(p.queries).map(([refId, q]) => ({
      refId,
      datasource: cfg.datasource,
      editorMode: 'code',
      format: 'table',
      rawQuery: true,
      rawSql: read(`queries/${q}.sql`),
    })),
    options: {
      renderer: 'canvas',
      map: 'none',
      editorMode: 'code',
      editor: { format: 'auto' },
      getOption: code,
      themeEditor: { name: 'default', config: '{}' },
      visualEditor: { code: '', dataset: [], series: [] },
    },
  };
});

const dashboard = {
  uid: cfg.uid,
  title: cfg.title,
  description: cfg.subtitle,
  tags: cfg.tags || ['demo', 'echarts', 'postgres'],
  editable: true,
  graphTooltip: 1,
  refresh: '1m',
  schemaVersion: 39,
  time: cfg.time,
  timepicker: {},
  templating: { list: [] },
  annotations: { list: [] },
  panels,
};

fs.mkdirSync(path.join(root, 'grafana', 'dashboards'), { recursive: true });
const out = path.join(root, 'grafana', 'dashboards', `${cfg.uid}.json`);
fs.writeFileSync(out, JSON.stringify(dashboard, null, 2));
console.log(`built ${path.relative(root, out)} · ${panels.length} panels`);
