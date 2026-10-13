// Pump stations — status, load, 24 h flow sparkline and energy intensity
const A = frame('A');
const P = A.col('station_id').map((id, i) => ({
  id,
  name: A.col('name')[i],
  status: String(A.col('status')[i] || 'running'),
  alarm: A.col('alarm')[i],
  flow: A.num('flow_m3h')[i],
  load: A.num('load_pct')[i],
  kwh: A.num('kwh_m3')[i],
  kwhPrev: A.num('kwh_m3_prev')[i],
  run: A.num('runtime_24h_pct')[i],
  spark: (() => { try { return JSON.parse(A.col('flow_24h')[i] || '[]'); } catch (e) { return []; } })(),
}));
const STATUS = {
  running: { label: 'Running', color: T.mint },
  warning: { label: 'Attention', color: T.amber },
  stopped: { label: 'Stopped', color: T.faint },
  tripped: { label: 'Tripped', color: T.coral },
};
const nRun = P.filter((p) => p.status === 'running' || p.status === 'warning').length;

const build = (w, h) => {
  const g = card(w, h, {
    eyebrow: 'Assets', title: 'Pump stations',
    meta: `${nRun}/${P.length} running`,
    glow: P.some((p) => p.status === 'tripped') ? T.coral : T.mint,
  });
  if (!P.length) return { backgroundColor: 'transparent', graphic: [...g, empty(w, h)] };

  const showSpark = w >= 620;
  const showRun = w >= 760;
  // column layout (fractions of the inner width)
  const cols = [['STATION', 0.27], ['STATUS', 0.15], ['FLOW · LOAD', 0.2]];
  if (showSpark) cols.push(['LAST 24 H', 0.16]);
  cols.push(['KWH/M³ · 7 D', 0.14]);
  if (showRun) cols.push(['RUNTIME', 0.08]);
  const totalF = cols.reduce((s, c) => s + c[1], 0);
  const inner = w - 40;
  let x = 20;
  const X = {};
  cols.forEach(([k, f]) => { X[k] = { x, w: (inner * f) / totalF }; x += (inner * f) / totalF; });

  const headY = 72;
  cols.forEach(([k]) => g.push({ type: 'text', silent: true, style: { x: X[k].x, y: headY, text: k, fill: T.faint, fontSize: 10, fontWeight: 700, fontFamily: FONT, verticalAlign: 'middle' } }));
  const rowTop = headY + 14;
  const rowH = Math.max(34, Math.min(52, (h - rowTop - 30) / P.length));

  P.forEach((p, i) => {
    const y = rowTop + i * rowH;
    const my = y + rowH / 2;
    const st = STATUS[p.status] || STATUS.running;
    if (i) g.push({ type: 'line', silent: true, shape: { x1: 20, y1: y, x2: w - 20, y2: y }, style: { stroke: T.grid, lineWidth: 1 } });
    if (p.status === 'tripped') g.push({ type: 'rect', silent: true, z: -1, shape: { x: 12, y: y + 3, width: w - 24, height: rowH - 6, r: 10 }, style: { fill: rgba(T.coral, isDark ? 0.08 : 0.05) } });

    // station
    g.push({
      type: 'text', silent: true,
      style: {
        x: X.STATION.x, y: my, verticalAlign: 'middle', width: X.STATION.w - 8, overflow: 'truncate',
        text: `{n|${p.name}}  {i|${p.id}}`,
        rich: { n: { fill: T.ink, fontSize: 12.5, fontWeight: 700, fontFamily: FONT }, i: { fill: T.faint, fontSize: 10.5, fontWeight: 600, fontFamily: FONT } },
      },
    });
    // status: dot with halo + label (alarm text on hover via tooltip-less title)
    g.push(
      { type: 'circle', silent: true, shape: { cx: X.STATUS.x + 5, cy: my, r: 8 }, style: { fill: rgba(st.color, 0.18) } },
      { type: 'circle', silent: true, shape: { cx: X.STATUS.x + 5, cy: my, r: 4 }, style: { fill: st.color } },
      { type: 'text', silent: true, style: { x: X.STATUS.x + 18, y: my, text: st.label, fill: st.color, fontSize: 12, fontWeight: 700, fontFamily: FONT, verticalAlign: 'middle' } },
    );
    // flow + load bar
    const fw = X['FLOW · LOAD'];
    const barW = Math.max(30, fw.w - 82);
    g.push(
      { type: 'text', silent: true, style: { x: fw.x, y: my, text: `${fmt(p.flow)} m³/h`, fill: p.flow ? T.ink : T.faint, fontSize: 12, fontWeight: 600, fontFamily: FONT, verticalAlign: 'middle' } },
      { type: 'rect', silent: true, shape: { x: fw.x + 74, y: my - 3, width: barW, height: 6, r: 3 }, style: { fill: T.track } },
      { type: 'rect', silent: true, shape: { x: fw.x + 74, y: my - 3, width: Math.max(p.load ? 4 : 0, (barW * Math.min(100, p.load || 0)) / 100), height: 6, r: 3 }, style: { fill: hgrad(T.mint, T.sky) } },
    );
    // sparkline
    if (showSpark && p.spark.length > 1) {
      const sx = X['LAST 24 H'];
      const sw = sx.w - 16, sh = rowH * 0.5;
      const mx = Math.max(...p.spark, 1);
      const pts = p.spark.map((v, j) => [sx.x + (sw * j) / (p.spark.length - 1), my + sh / 2 - (v / mx) * sh]);
      const c = p.status === 'tripped' ? T.coral : T.sky;
      g.push(
        { type: 'polygon', silent: true, shape: { points: [[pts[0][0], my + sh / 2], ...pts, [pts[pts.length - 1][0], my + sh / 2]] }, style: { fill: vgrad(c, 0.25, 0) } },
        { type: 'polyline', silent: true, shape: { points: pts, smooth: 0.2 }, style: { stroke: c, lineWidth: 1.4, fill: 'none' } },
      );
    }
    // energy intensity with week-on-week change
    const kx = X['KWH/M³ · 7 D'];
    const d = p.kwh != null && p.kwhPrev ? ((p.kwh - p.kwhPrev) / p.kwhPrev) * 100 : null;
    const worse = d != null && d > 2;
    g.push({
      type: 'text', silent: true,
      style: {
        x: kx.x, y: my, verticalAlign: 'middle',
        text: `{v|${fmt(p.kwh, 2)}}` + (d == null ? '' : Math.abs(d) < 0.5 ? '  {g|= wk}' : `  {${worse ? 'b' : 'g'}|${d >= 0 ? '▲' : '▼'} ${fmt(Math.abs(d), 0)}%}`),
        rich: {
          v: { fill: T.ink, fontSize: 12, fontWeight: 700, fontFamily: FONT },
          b: { fill: T.coral, fontSize: 10.5, fontWeight: 700, fontFamily: FONT },
          g: { fill: T.muted, fontSize: 10.5, fontWeight: 600, fontFamily: FONT },
        },
      },
    });
    if (showRun) g.push({ type: 'text', silent: true, style: { x: X.RUNTIME.x, y: my, text: `${fmt(p.run)} %`, fill: (p.run ?? 0) < 90 ? T.amber : T.muted, fontSize: 12, fontWeight: 600, fontFamily: FONT, verticalAlign: 'middle' } });
  });
  // alarm footnote for tripped / attention stations
  const notes = P.filter((p) => p.alarm).map((p) => `${p.id}: ${p.alarm}`);
  if (notes.length && rowTop + P.length * rowH + 20 < h) g.push({ type: 'text', silent: true, style: { x: 20, y: h - 16, text: notes.join('   ·   '), fill: T.muted, fontSize: 10.5, fontFamily: FONT, verticalAlign: 'middle', width: w - 40, overflow: 'truncate' } });
  return { backgroundColor: 'transparent', animation: false, graphic: g };
};
return mount(build, ['graphic']);
