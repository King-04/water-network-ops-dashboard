// KPI · System demand — latest hour vs the same hour yesterday
const A = frame('A');
const pts = A.col('time').map((t, i) => [t, A.num('demand_m3h')[i]]).filter((p) => p[1] != null);
const last = pts[pts.length - 1];
const dayAgo = last && pts.reduce((best, p) => (Math.abs(p[0] - (last[0] - 864e5)) < Math.abs(best[0] - (last[0] - 864e5)) ? p : best), pts[0]);
const delta = last && dayAgo && dayAgo[1] ? ((last[1] - dayAgo[1]) / dayAgo[1]) * 100 : null;

return mount(kpiCard({
  eyebrow: 'Demand',
  title: 'System demand',
  value: last?.[1],
  unit: 'm³/h',
  deltaText: delta == null ? '' : `${delta >= 0 ? '▲' : '▼'} ${fmt(Math.abs(delta), 1)} %`,
  good: null,                                     // demand is neither good nor bad
  caption: last ? `${time(last[0])} · vs same hour yesterday` : 'No readings',
  spark: pts.filter((p) => p[0] > (last?.[0] ?? 0) - 864e5),
  sparkColor: T.sky,
}), ['graphic']);
