// Reservoir storage — one tank per reservoir: water level with a wavy
// surface, the operating band as two ticks, and the 24 h change.
const A = frame('A');
const R = A.col('name').map((name, i) => ({
  id: A.col('reservoir_id')[i],
  name,
  cap: A.num('capacity_m3')[i],
  low: A.num('low_level_pct')[i],
  high: A.num('high_level_pct')[i],
  lvl: A.num('level_pct')[i],
  prev: A.num('level_24h_ago_pct')[i],
}));
const total = R.reduce((s, r) => s + (r.cap || 0), 0);
const stored = R.reduce((s, r) => s + ((r.cap || 0) * (r.lvl || 0)) / 100, 0);
const below = R.filter((r) => r.lvl != null && r.lvl < r.low);

// wave path across the water surface
const wave = (x, y, width, amp, phase) => {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const px = x + (width * i) / 24;
    pts.push([px, y + Math.sin((i / 24) * Math.PI * 2 * 1.5 + phase) * amp]);
  }
  return pts;
};

const build = (w, h) => {
  const g = card(w, h, {
    eyebrow: 'Storage',
    title: 'Reservoirs',
    meta: total ? `${fmt((100 * stored) / total, 0)} % · ${fmtK(stored)} m³` : '',
    glow: below.length ? T.coral : T.mint,
  });
  if (!R.length) return { backgroundColor: 'transparent', graphic: [...g, empty(w, h)] };

  const top = below.length ? 86 : 70, bottom = h - 54;
  const n = R.length;
  const slot = (w - 32) / n;
  const tankW = Math.min(64, slot * 0.58);
  const tankH = Math.max(60, bottom - top);
  R.forEach((r, i) => {
    const cx = 16 + slot * i + slot / 2;
    const x = cx - tankW / 2;
    const alarm = r.lvl != null && r.lvl < r.low;
    const c = alarm ? T.coral : i % 2 ? T.sky : T.mint;
    const lvl = Math.max(0, Math.min(100, r.lvl ?? 0));
    const wy = top + tankH * (1 - lvl / 100);
    const clip = { type: 'rect', shape: { x, y: top, width: tankW, height: tankH, r: 12 } };
    g.push(
      // tank shell
      { type: 'rect', silent: true, shape: { x, y: top, width: tankW, height: tankH, r: 12 }, style: { fill: T.track, stroke: T.stroke, lineWidth: 1 } },
      // water body + surface
      {
        type: 'polygon', silent: true, clipPath: clip,
        shape: { points: [[x, top + tankH], ...wave(x, wy, tankW, Math.min(3, tankW * 0.05), i), [x + tankW, top + tankH]] },
        style: { fill: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: rgba(c, isDark ? 0.85 : 0.75) }, { offset: 1, color: rgba(c, isDark ? 0.25 : 0.22) }] } },
      },
      // operating band ticks (low / high)
      ...[r.low, r.high].map((b) => ({
        type: 'line', silent: true,
        shape: { x1: x - 5, y1: top + tankH * (1 - b / 100), x2: x + 3, y2: top + tankH * (1 - b / 100) },
        style: { stroke: T.faint, lineWidth: 1.5 },
      })),
      // level label inside the tank
      {
        type: 'text', silent: true,
        style: {
          x: cx, y: Math.min(top + tankH - 12, Math.max(top + 14, wy - 12)),
          text: `${fmt(lvl, 0)}%`, align: 'center', verticalAlign: 'middle',
          fill: wy - 12 < top + 14 ? (isDark ? '#05141A' : '#FFFFFF') : T.ink, fontSize: 13, fontWeight: 800, fontFamily: FONT,
        },
      },
      // name + volume + 24 h trend under the tank
      {
        type: 'text', silent: true,
        style: { x: cx, y: top + tankH + 16, text: r.name, align: 'center', verticalAlign: 'middle', fill: T.ink, fontSize: 11.5, fontWeight: 700, fontFamily: FONT, width: slot - 4, overflow: 'truncate' },
      },
    );
    const d = r.lvl != null && r.prev != null ? r.lvl - r.prev : null;
    const dTxt = d == null ? '' : Math.abs(d) < 0.5 ? '→ steady' : `${d > 0 ? '↑' : '↓'} ${fmt(Math.abs(d), 0)} pt`;
    g.push({
      type: 'text', silent: true,
      style: {
        x: cx, y: top + tankH + 33, align: 'center', verticalAlign: 'middle', width: slot - 2, overflow: 'truncate',
        text: `{v|${fmtK(((r.cap || 0) * lvl) / 100)} m³}  {${alarm || (d != null && d <= -5) ? 'bad' : 'd'}|${dTxt}}`,
        rich: {
          v: { fill: T.muted, fontSize: 10.5, fontFamily: FONT },
          d: { fill: T.muted, fontSize: 10.5, fontWeight: 600, fontFamily: FONT },
          bad: { fill: T.coral, fontSize: 10.5, fontWeight: 700, fontFamily: FONT },
        },
      },
    });
  });
  if (below.length) g.push(...chip(20, 56, `${below.map((r) => r.name).join(', ')} below operating band`, T.coral));
  return { backgroundColor: 'transparent', animation: false, graphic: g };
};
return mount(build, ['graphic']);
