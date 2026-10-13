// ---- KPI card: left-aligned figure, delta chip, full-bleed sparkline ----
// opts: { eyebrow, title, value, dec, unit, delta, deltaText, good, caption,
//         spark: [[t, v], ...], sparkColor, target, step, glow, extra(w, h) }
const kpiCard = (opts) => (w, h) => {
  const g = card(w, h, { eyebrow: opts.eyebrow, title: opts.title, glow: opts.glow || opts.sparkColor || T.mint });
  const big = Math.max(24, Math.min(34, w / 9));
  const numTxt = fmt(opts.value, opts.dec ?? 0);
  const numY = 58 + big / 2 + 4;
  g.push({
    type: 'text', silent: true,
    style: {
      x: 20, y: numY, verticalAlign: 'middle',
      text: `{n|${numTxt}}${opts.unit ? `{u| ${opts.unit}}` : ''}`,
      rich: {
        n: { fill: opts.value == null ? T.faint : T.ink, fontSize: big, fontWeight: 800, fontFamily: FONT },
        u: { fill: T.muted, fontSize: Math.round(big * 0.45), fontWeight: 600, fontFamily: FONT, padding: [Math.round(big * 0.28), 0, 0, 0] },
      },
    },
  });
  // delta chip to the right of the figure, caption under it
  const numW = textW(numTxt, big, 800) + (opts.unit ? textW(` ${opts.unit}`, Math.round(big * 0.45), 600) : 0);
  if (opts.deltaText) {
    const col = opts.good == null ? T.muted : opts.good ? T.mint : T.coral;
    const cx = 20 + numW + 12;
    if (cx + textW(opts.deltaText, 11, 700) + 16 < w - 16) g.push(...chip(cx, numY - 10, opts.deltaText, col));
  }
  if (opts.caption) g.push({
    type: 'text', silent: true,
    style: { x: 20, y: numY + big / 2 + 10, text: opts.caption, fill: T.muted, fontSize: 11, fontFamily: FONT, verticalAlign: 'middle', width: w - 40, overflow: 'truncate' },
  });
  if (opts.extra) g.push(...opts.extra(w, h, numY + big / 2 + 10));

  // sparkline across the bottom of the card
  const pts = (opts.spark || []).filter((p) => p[1] != null);
  const sparkTop = Math.max(numY + big / 2 + 22, h - Math.max(46, h * 0.32));
  const sparkH = h - 8 - sparkTop;
  if (pts.length > 1 && sparkH > 16) {
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (opts.target != null) { y0 = Math.min(y0, opts.target); y1 = Math.max(y1, opts.target); }
    if (opts.zero) y0 = Math.min(0, y0);
    if (y1 === y0) y1 = y0 + 1;
    const X = (t) => 2 + ((t - x0) / (x1 - x0 || 1)) * (w - 4);
    const Y = (v) => sparkTop + 4 + (1 - (v - y0) / (y1 - y0)) * (sparkH - 6);
    let line = pts.map((p) => [X(p[0]), Y(p[1])]);
    if (opts.step) line = line.flatMap((p, i) => (i ? [[p[0], line[i - 1][1]], p] : [p]));
    const c = opts.sparkColor || T.mint;
    const clip = { type: 'rect', shape: { x: 1, y: 1, width: w - 2, height: h - 2, r: 18 } };
    g.push(
      {
        type: 'polygon', silent: true, z: -5,
        shape: { points: [[line[0][0], h], ...line, [line[line.length - 1][0], h]] },
        style: { fill: vgrad(c, isDark ? 0.28 : 0.18, 0) },
        clipPath: clip,
      },
      { type: 'polyline', silent: true, z: -4, shape: { points: line, smooth: opts.step ? 0 : 0.25 }, style: { stroke: c, lineWidth: 1.8, fill: 'none' } },
      { type: 'circle', silent: true, z: -3, shape: { cx: line[line.length - 1][0] - 2, cy: line[line.length - 1][1], r: 3.5 }, style: { fill: c, stroke: T.cardBottom, lineWidth: 2 } },
    );
    if (opts.target != null) g.push({
      type: 'line', silent: true, z: -4,
      shape: { x1: 0, y1: Y(opts.target), x2: w, y2: Y(opts.target) },
      style: { stroke: rgba(T.ink, 0.25), lineDash: [3, 4], lineWidth: 1 },
      clipPath: clip,
    });
  }
  return { backgroundColor: 'transparent', animation: false, graphic: g };
};
