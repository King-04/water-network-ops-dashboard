// KPI · Non-revenue water — last 7 days vs the 7 before (volume-weighted)
const A = frame('A');
const t = A.col('time'); const inp = A.num('input_m3'); const bil = A.num('billed_m3'); const pct = A.num('nrw_pct');
const n = t.length;
const nrw = (from, to) => {
  let i0 = 0, b0 = 0;
  for (let i = Math.max(0, from); i < to; i++) { i0 += inp[i] || 0; b0 += bil[i] || 0; }
  return i0 ? (100 * (i0 - b0)) / i0 : null;
};
const cur = nrw(n - 7, n);
const prev = nrw(n - 14, n - 7);
const delta = cur != null && prev != null ? cur - prev : null;
const lost = (() => { let s = 0; for (let i = Math.max(0, n - 7); i < n; i++) s += (inp[i] || 0) - (bil[i] || 0); return s; })();

return mount(kpiCard({
  eyebrow: 'Losses',
  title: 'Non-revenue water',
  value: cur, dec: 1, unit: '%',
  deltaText: delta == null ? '' : `${delta >= 0 ? '▲' : '▼'} ${fmt(Math.abs(delta), 1)} pp`,
  good: delta == null ? null : delta <= 0,        // less NRW is good
  caption: `${fmtK(lost)} m³ lost in 7 days · target 12 %`,
  spark: t.map((x, i) => [x, pct[i]]),
  sparkColor: delta != null && delta > 0.5 ? T.coral : T.mint,
  glow: delta != null && delta > 0.5 ? T.coral : T.mint,
  target: 12,
}), ['graphic']);
