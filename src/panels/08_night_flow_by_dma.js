// Minimum night flow by DMA — dumbbell: baseline -> last 7 nights.
// The gap is the leak signal; colour escalates with the excess.
const A = frame('A');
const D = A.col('name').map((name, i) => {
  const base = A.num('baseline_mnf_m3h')[i];
  const cur = A.num('mnf_7d_m3h')[i];
  const prev = A.num('mnf_prev_7d_m3h')[i];
  return { name, id: A.col('dma_id')[i], base, cur, prev, ex: base ? ((cur - base) / base) * 100 : 0 };
});
const tone = (ex) => (ex >= 20 ? T.coral : ex >= 8 ? T.amber : T.mint);
const flagged = D.filter((d) => d.ex >= 8);
const extra = D.reduce((s, d) => s + Math.max(0, d.cur - d.base), 0);

const build = (w, h) => {
  const nameW = Math.min(150, Math.max(96, w * 0.22));
  return {
    backgroundColor: 'transparent',
    animation: false,
    textStyle: { fontFamily: FONT },
    graphic: [
      ...card(w, h, {
        eyebrow: 'Leakage',
        title: 'Minimum night flow by district',
        meta: flagged.length ? `≈ ${fmt(extra * 24, 0)} m³/day above baseline` : 'All districts on baseline',
        glow: flagged.some((d) => d.ex >= 20) ? T.coral : T.mint,
      }),
      ...(D.length ? [] : [empty(w, h)]),
    ],
    tooltip: tooltip({
      trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: rgba(T.ink, 0.04) } },
      formatter: (ps) => {
        const d = D[ps[0].dataIndex];
        return tipHead(`${d.name} · ${d.id}`) +
          tipRow(T.faint, 'Baseline', `${fmt(d.base, 1)} m³/h`) +
          tipRow(T.muted, 'Previous 7 nights', `${fmt(d.prev, 1)} m³/h`) +
          tipRow(tone(d.ex), 'Last 7 nights', `${fmt(d.cur, 1)} m³/h`) +
          tipRow('transparent', 'Excess', `<span style="color:${tone(d.ex)}">${d.ex >= 0 ? '+' : ''}${fmt(d.ex, 0)} %</span>`);
      },
    }),
    legend: {
      top: 62, left: 16, itemWidth: 9, itemHeight: 9, itemGap: 16, selectedMode: false,
      textStyle: { color: T.muted, fontSize: 11, fontFamily: FONT },
      data: [{ name: 'Baseline', icon: 'circle', itemStyle: { color: 'transparent', borderColor: T.faint, borderWidth: 2 } },
             { name: 'Previous 7 nights', icon: 'circle', itemStyle: { color: T.faint } },
             { name: 'Last 7 nights', icon: 'circle', itemStyle: { color: T.mint } }],
    },
    grid: { left: 18, right: 64, top: 96, bottom: 12, containLabel: true },
    xAxis: { type: 'value', min: (v) => Math.max(0, Math.floor((v.min * 0.8) / 5) * 5), axisLabel: { ...axisLabel, formatter: (v) => `${v}` }, splitLine: { lineStyle: { color: T.grid, type: [2, 4] } }, name: 'm³/h', nameTextStyle: { ...axisLabel }, nameGap: 6 },
    yAxis: {
      type: 'category', inverse: true, data: D.map((d) => d.name),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { ...axisLabel, color: T.ink, fontWeight: 600, fontSize: 11.5, width: nameW, overflow: 'truncate' },
    },
    series: [
      // connector baseline -> current (custom so it can be coloured per row)
      {
        type: 'custom', silent: true, z: 1,
        renderItem: (params, api) => {
          const i = params.dataIndex; const d = D[i];
          const a = api.coord([d.base, i]); const b = api.coord([d.cur, i]);
          const lab = api.coord([Math.max(d.cur, d.base, d.prev), i]);
          return {
            type: 'group', children: [
              { type: 'line', shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: rgba(tone(d.ex), 0.55), lineWidth: 6, lineCap: 'round' } },
              { type: 'text', style: { x: lab[0] + 14, y: lab[1], text: `${d.ex >= 0 ? '+' : ''}${fmt(d.ex, 0)} %`, fill: d.ex >= 8 ? tone(d.ex) : T.muted, fontSize: 11, fontWeight: 700, fontFamily: FONT, verticalAlign: 'middle' } },
            ],
          };
        },
        encode: { x: 0, y: 1 },
        data: D.map((d, i) => [d.base, i]),
      },
      { name: 'Baseline', type: 'scatter', data: D.map((d) => d.base), symbolSize: 11, itemStyle: { color: T.cardBottom, borderColor: T.faint, borderWidth: 2 }, z: 2 },
      { name: 'Previous 7 nights', type: 'scatter', data: D.map((d) => d.prev), symbolSize: 7, itemStyle: { color: T.faint }, z: 3 },
      { name: 'Last 7 nights', type: 'scatter', data: D.map((d) => ({ value: d.cur, itemStyle: { color: tone(d.ex) } })), symbolSize: 13, itemStyle: { borderColor: T.cardBottom, borderWidth: 2 }, z: 4 },
    ],
  };
};
return mount(build);
