// ===================================================================
//  Lumenvale Water · panel kit
//  Shared by every panel; build.mjs prepends it to each panel's code.
//  Look: soft "aurora" cards (no borders shouting), left-aligned
//  numbers, mint/sky signature, coral only for things that need action.
// ===================================================================
const chart = context.panel.chart;
const dom = chart.getDom();
const isDark = context.grafana.theme.isDark;

// Load the typeface once per page (falls back to system UI if offline)
if (!document.getElementById('lv-font')) {
  const l = document.createElement('link');
  l.id = 'lv-font';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(l);
}
const FONT = "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif";

// ---- Tokens -------------------------------------------------------
const T = isDark
  ? {
      cardTop: '#10202A', cardBottom: '#0A151C', stroke: 'rgba(148,226,213,0.09)',
      ink: '#E9F2F4', muted: '#8CA3AD', faint: '#56707B', grid: 'rgba(148,226,213,0.07)',
      mint: '#6EE7B7', sky: '#7DD3FC', iris: '#A5B4FC', coral: '#FB7185', amber: '#FBBF24',
      track: 'rgba(255,255,255,0.06)', tipBg: 'rgba(9,20,26,0.96)',
    }
  : {
      cardTop: '#FFFFFF', cardBottom: '#F7FBFB', stroke: '#E3ECEE',
      ink: '#0E1C24', muted: '#5D7380', faint: '#9AAEB7', grid: '#EAF1F2',
      mint: '#059669', sky: '#0284C7', iris: '#6366F1', coral: '#E11D48', amber: '#D97706',
      track: '#EDF3F4', tipBg: 'rgba(255,255,255,0.98)',
    };
const SERIES = [T.mint, T.sky, T.iris, T.amber];

// ---- Data ---------------------------------------------------------
// frame('A') -> { rows, col(name), has(name) } for the query with that refId
const frame = (refId = 'A') => {
  const all = context.panel.data.series || [];
  const s = all.find((x) => x.refId === refId) || (refId === 'A' ? all[0] : null);
  const fields = s ? s.fields : [];
  const arr = (f) => (typeof f.values.get === 'function'
    ? Array.from({ length: f.values.length }, (_, i) => f.values.get(i))
    : Array.from(f.values));
  const cols = Object.fromEntries(fields.map((f) => [f.name, arr(f)]));
  const rows = fields.length ? fields[0].values.length : 0;
  return {
    rows,
    has: (n) => n in cols,
    col: (n) => cols[n] || [],
    num: (n) => (cols[n] || []).map((v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))),
  };
};

// ---- Formatting ---------------------------------------------------
const fmt = (v, d = 0) => (v == null || !Number.isFinite(Number(v)) ? '—'
  : Number(v).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }));
const fmtK = (v) => (Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 1)}M` : Math.abs(v) >= 1e4 ? `${fmt(v / 1e3, 0)}k` : Math.abs(v) >= 1e3 ? `${fmt(v / 1e3, 1)}k` : fmt(v, 0));
const rgba = (hex, a) => {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};
const vgrad = (c, a0, a1) => ({ type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: rgba(c, a0) }, { offset: 1, color: rgba(c, a1) }] });
const hgrad = (c0, c1) => ({ type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: c0 }, { offset: 1, color: c1 }] });
const time = (v, withDay) => new Date(v).toLocaleString('en-GB', withDay
  ? { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
  : { hour: '2-digit', minute: '2-digit' });
const axisDate = (v) => {
  const d = new Date(v);
  return d.getHours() === 0 && d.getMinutes() === 0
    ? `{d|${d.toLocaleDateString('en-GB', { weekday: 'short' })}} {m|${d.getDate()}}`
    : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
const _ctx = document.createElement('canvas').getContext('2d');
const textW = (s, size = 11, weight = 500) => { _ctx.font = `${weight} ${size}px ${FONT}`; return _ctx.measureText(String(s)).width; };

// ---- Card ---------------------------------------------------------
// eyebrow: small category label · meta: right-aligned outline chip
const card = (w, h, { eyebrow, title, meta, glow = T.mint } = {}) => {
  const g = [
    {
      type: 'rect', silent: true, z: -20,
      shape: { x: 1, y: 1, width: w - 2, height: h - 2, r: 18 },
      style: {
        fill: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: T.cardTop }, { offset: 1, color: T.cardBottom }] },
        stroke: T.stroke, lineWidth: 1,
        shadowBlur: isDark ? 0 : 18, shadowColor: 'rgba(15,40,50,0.06)', shadowOffsetY: 4,
      },
    },
    // aurora glow in the top-right corner
    {
      type: 'circle', silent: true, z: -19,
      shape: { cx: w - 30, cy: 10, r: Math.min(170, w * 0.45) },
      style: {
        fill: { type: 'radial', x: 0.5, y: 0.5, r: 0.5, colorStops: [{ offset: 0, color: rgba(glow, isDark ? 0.13 : 0.07) }, { offset: 1, color: rgba(glow, 0) }] },
      },
      clipPath: { type: 'rect', shape: { x: 1, y: 1, width: w - 2, height: h - 2 } },
    },
  ];
  if (eyebrow) g.push({
    type: 'text', silent: true,
    style: { x: 20, y: 22, text: eyebrow.toUpperCase(), fill: glow, fontSize: 10, fontWeight: 700, fontFamily: FONT, verticalAlign: 'middle' },
  });
  if (title) g.push({
    type: 'text', silent: true,
    style: {
      x: 20, y: eyebrow ? 41 : 26, text: title, fill: T.ink, fontSize: 15, fontWeight: 700, fontFamily: FONT, verticalAlign: 'middle',
      width: w - 40 - (meta ? textW(meta, 10.5) + 30 : 0), overflow: 'truncate',
    },
  });
  if (meta) {
    const mw = textW(meta, 10.5, 600) + 20;
    g.push(
      { type: 'rect', silent: true, shape: { x: w - 20 - mw, y: 13, width: mw, height: 20, r: 10 }, style: { fill: 'transparent', stroke: T.stroke, lineWidth: 1 } },
      { type: 'text', silent: true, style: { x: w - 20 - mw / 2, y: 23, text: meta, align: 'center', verticalAlign: 'middle', fill: T.muted, fontSize: 10.5, fontWeight: 600, fontFamily: FONT } },
    );
  }
  return g;
};

// Delta chip: "▲ 3.2 %" — colour by whether the change is good or bad
const chip = (x, y, text, color) => {
  const w = textW(text, 11, 700) + 16;
  return [
    { type: 'rect', silent: true, shape: { x, y, width: w, height: 20, r: 6 }, style: { fill: rgba(color, isDark ? 0.14 : 0.10) } },
    { type: 'text', silent: true, style: { x: x + 8, y: y + 10, text, fill: color, fontSize: 11, fontWeight: 700, fontFamily: FONT, verticalAlign: 'middle' } },
  ];
};

const tooltip = (extra = {}) => ({
  backgroundColor: T.tipBg,
  borderColor: T.stroke,
  borderWidth: 1,
  padding: [10, 12],
  textStyle: { color: T.ink, fontSize: 12, fontFamily: FONT },
  extraCssText: `border-radius:12px;box-shadow:0 12px 32px ${isDark ? 'rgba(0,0,0,.45)' : 'rgba(15,40,50,.14)'};backdrop-filter:blur(6px);`,
  ...extra,
});
const tipRow = (color, label, value) =>
  `<div style="display:flex;align-items:center;gap:8px;margin-top:5px">` +
  `<span style="width:7px;height:7px;border-radius:50%;background:${color}"></span>` +
  `<span style="color:${T.muted};flex:1">${label}</span><b style="margin-left:18px">${value}</b></div>`;
const tipHead = (text) => `<div style="color:${T.muted};font-size:11px;font-weight:600">${text}</div>`;

const axisLabel = { color: T.muted, fontSize: 10.5, fontFamily: FONT };
const empty = (w, h, msg = 'No data in range') => ({
  type: 'text', silent: true,
  style: { x: w / 2, y: h / 2 + 16, text: msg, align: 'center', verticalAlign: 'middle', fill: T.faint, fontSize: 13, fontFamily: FONT },
});

// ---- Mount: re-render on resize -----------------------------------
const mount = (build, merge = ['graphic', 'series', 'legend', 'xAxis', 'yAxis', 'grid', 'visualMap']) => {
  if (dom.__lvObs) dom.__lvObs.disconnect();
  dom.__lvObs = new ResizeObserver((entries) => {
    const { width, height } = entries[0].contentRect;
    if (!width || !height) return;
    requestAnimationFrame(() => chart.setOption(build(width, height), { replaceMerge: merge }));
  });
  dom.__lvObs.observe(dom);
  return build(chart.getWidth(), chart.getHeight());
};
