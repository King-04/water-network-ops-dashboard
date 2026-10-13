// KPI · Pumping energy intensity — kWh per m³, last 7 days vs the 7 before
const A = frame('A');
const t = A.col('time'); const k = A.num('kwh_per_m3'); const kwh = A.num('kwh');
const n = t.length;
const avg = (a, b) => { const v = k.slice(Math.max(0, a), b).filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const cur = avg(n - 8, n - 1);                    // last complete 7 days (today is partial)
const prev = avg(n - 15, n - 8);
const delta = cur != null && prev ? ((cur - prev) / prev) * 100 : null;
const energy7d = kwh.slice(Math.max(0, n - 8), n - 1).reduce((s, x) => s + (x || 0), 0);

return mount(kpiCard({
  eyebrow: 'Energy',
  title: 'Pumping intensity',
  value: cur, dec: 3, unit: 'kWh/m³',
  deltaText: delta == null ? '' : `${delta >= 0 ? '▲' : '▼'} ${fmt(Math.abs(delta), 1)} %`,
  good: delta == null ? null : delta <= 0,
  caption: `${fmtK(energy7d)} kWh in 7 days · target 0.36`,
  spark: t.slice(0, n - 1).map((x, i) => [x, k[i]]),
  sparkColor: T.iris,
  glow: T.iris,
  target: 0.36,
}), ['graphic']);
