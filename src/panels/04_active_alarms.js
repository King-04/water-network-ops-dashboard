// KPI · Active alarms — open now by severity + 7-day trend (step line)
const A = frame('A');   // severity, active, oldest
const B = frame('B');   // time, active
const sev = Object.fromEntries(A.col('severity').map((s, i) => [s, A.num('active')[i] || 0]));
const total = (sev.critical || 0) + (sev.major || 0) + (sev.minor || 0);
const oldest = A.col('oldest').filter(Boolean).sort((a, b) => a - b)[0];
const rangeEnd = B.col('time').slice(-1)[0] ?? Date.now();      // end of the selected range
const ageH = oldest ? (rangeEnd - oldest) / 36e5 : null;
const SEV = [['critical', 'Critical', T.coral], ['major', 'Major', T.amber], ['minor', 'Minor', T.sky]];

return mount(kpiCard({
  eyebrow: 'Operations',
  title: 'Active alarms',
  value: total,
  caption: ageH == null ? 'All clear' : `Oldest open for ${ageH > 48 ? `${fmt(ageH / 24, 0)} days` : `${fmt(ageH, 0)} h`}`,
  spark: B.col('time').map((t, i) => [t, B.num('active')[i]]),
  sparkColor: sev.critical ? T.coral : T.amber,
  glow: sev.critical ? T.coral : T.amber,
  step: true, zero: true,
  // severity counters to the right of the big number
  extra: (w) => {
    const out = [];
    let x = w - 20;
    [...SEV].reverse().forEach(([k, label, c]) => {
      const txt = `${sev[k] || 0} ${label}`;
      const tw = textW(txt, 11, 700) + 26;
      x -= tw;
      out.push(
        { type: 'rect', silent: true, shape: { x, y: 64, width: tw, height: 22, r: 11 }, style: { fill: rgba(c, (sev[k] || 0) ? (isDark ? 0.15 : 0.10) : 0.04) } },
        { type: 'circle', silent: true, shape: { cx: x + 11, cy: 75, r: 3.5 }, style: { fill: (sev[k] || 0) ? c : T.faint } },
        { type: 'text', silent: true, style: { x: x + 19, y: 75, text: txt, verticalAlign: 'middle', fill: (sev[k] || 0) ? c : T.faint, fontSize: 11, fontWeight: 700, fontFamily: FONT } },
      );
      x -= 6;
    });
    return w > 330 ? out : [];
  },
}), ['graphic']);
