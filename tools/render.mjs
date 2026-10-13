// Renders the built dashboard to PNG with real query output — no Grafana
// needed. Uses the same panel code Grafana runs (ECharts 5 + the
// `context` object the Business Charts plugin provides).
//
//   node tools/run-queries.mjs && node tools/render.mjs
// Output: screenshots/dashboard-{dark,light}.png and screenshots/panels/*.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const root = process.cwd();
const cfg = (await import(pathToFileURL(path.join(root, 'dashboard.config.mjs')).href)).default;
const dash = JSON.parse(fs.readFileSync(path.join(root, 'grafana', 'dashboards', `${cfg.uid}.json`), 'utf8'));
const S = cfg.showcase;
const echartsSrc = fs.readFileSync(require.resolve('echarts/dist/echarts.min.js'), 'utf8');

// Local fonts (the panels load Google Fonts in Grafana; here we inline them)
const fontCss = (S.fonts || []).flatMap(({ family, pkg, weights }) => weights.map((wt) => {
  const file = require.resolve(`@fontsource/${pkg}/files/${pkg}-latin-${wt}-normal.woff2`);
  return `@font-face{font-family:'${family}';font-weight:${wt};src:url(data:font/woff2;base64,${fs.readFileSync(file).toString('base64')}) format('woff2');}`;
})).join('\n');

// Panel data: one frame per refId, read from .render/data
const dataFor = (p) => Object.entries(cfg.panels.find((c) => c.id === p.id).queries).map(([refId, q]) => {
  const d = JSON.parse(fs.readFileSync(path.join(root, '.render', 'data', `${q}.json`), 'utf8'));
  return { refId, fields: d.fields };
});
const range = JSON.parse(fs.readFileSync(path.join(root, '.render', 'data', `${Object.values(cfg.panels[0].queries)[0]}.json`), 'utf8')).range;

const W = S.width || 1600;
const PAD = 40, HEAD = 96;
const colW = W / 24, rowH = 30, gap = 10;
const panels = dash.panels.map((p) => ({
  id: p.id,
  code: p.options.getOption,
  data: dataFor(p),
  box: { x: p.gridPos.x * colW, y: p.gridPos.y * (rowH + gap), w: p.gridPos.w * colW - gap, h: p.gridPos.h * rowH + (p.gridPos.h - 1) * gap },
}));
const H = Math.max(...panels.map((p) => p.box.y + p.box.h));

const fmtRange = (a, b) => `${new Date(a).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(b).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

const html = (dark) => {
  const th = dark ? S.dark : S.light;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
  *{box-sizing:border-box} body{margin:0;background:${th.bg};font-family:${S.font};-webkit-font-smoothing:antialiased}
  .wrap{width:${W + PAD * 2}px;padding:${PAD}px;${th.bgImage ? `background-image:${th.bgImage};` : ''}}
  header{height:${HEAD}px;display:flex;align-items:flex-start;justify-content:space-between}
  .brand{display:flex;gap:14px;align-items:center}
  .logo{width:44px;height:44px;border-radius:${S.logoRadius ?? 14}px;display:grid;place-items:center;background:${th.logoBg}}
  h1{margin:0;font-size:24px;font-weight:800;color:${th.ink};letter-spacing:-.3px}
  p{margin:4px 0 0;font-size:13px;color:${th.muted}}
  .chips{display:flex;gap:8px;margin-top:6px}
  .chip{font-size:12px;font-weight:600;color:${th.muted};border:1px solid ${th.stroke};border-radius:${S.chipRadius ?? 999}px;padding:7px 12px;background:${th.chipBg || 'transparent'}}
  .chip b{color:${th.ink}}
  .live{display:inline-block;width:7px;height:7px;border-radius:50%;background:${th.accent};margin-right:7px;box-shadow:0 0 0 4px ${th.accentSoft}}
  #grid{position:relative;width:${W}px;height:${H}px}
  #grid>div{position:absolute}
  </style><script>${echartsSrc}</script></head><body><div class="wrap">
  <header><div class="brand"><div class="logo">${S.logo}</div><div><h1>${dash.title}</h1><p>${dash.description}</p></div></div>
  <div class="chips"><span class="chip"><span class="live"></span>Demo data</span><span class="chip">${fmtRange(range.from, range.to)}</span><span class="chip"><b>${S.chipRight || 'PostgreSQL · ECharts'}</b></span></div></header>
  <div id="grid"></div></div></body></html>`;
};

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const outDir = path.join(root, 'screenshots');
fs.mkdirSync(path.join(outDir, 'panels'), { recursive: true });

for (const dark of [true, false]) {
  const page = await browser.newPage({ viewport: { width: W + PAD * 2, height: H + HEAD + PAD * 2 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.setContent(html(dark));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ panels, dark }) => {
    const grid = document.getElementById('grid');
    for (const p of panels) {
      const el = document.createElement('div');
      el.id = `p${p.id}`;
      Object.assign(el.style, { left: `${p.box.x}px`, top: `${p.box.y}px`, width: `${p.box.w}px`, height: `${p.box.h}px` });
      grid.appendChild(el);
      const chart = echarts.init(el);
      const context = { panel: { chart, data: { series: p.data } }, grafana: { theme: { isDark: dark } } };
      try { chart.setOption(new Function('context', 'echarts', p.code)(context, echarts)); }
      catch (e) { console.error(`panel ${p.id}: ${e.stack}`); }
    }
  }, { panels, dark });
  await page.waitForTimeout(600);
  const tag = dark ? 'dark' : 'light';
  await page.screenshot({ path: path.join(outDir, `dashboard-${tag}.png`), fullPage: true });
  for (const p of panels) {
    await page.locator(`#p${p.id}`).screenshot({ path: path.join(outDir, 'panels', `${String(p.id).padStart(2, '0')}-${tag}.png`) });
  }
  console.log(`${tag}: ${errors.length ? errors.join('\n') : 'no errors'}`);
  await page.close();
}
await browser.close();
