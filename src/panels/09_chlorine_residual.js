// Chlorine residual by zone — hourly means against the 0.3–0.8 mg/l band
const A = frame('A');
const LOW = 0.3, HIGH = 0.8;
const t = A.col('time');
const Z = [['north', 'North'], ['central', 'Central'], ['south', 'South'], ['east', 'East']]
  .map(([k, label], i) => ({ label, color: SERIES[i], data: t.map((x, j) => [x, A.num(k)[j]]) }));
const hoursBelow = Object.fromEntries(Z.map((z) => [z.label, z.data.filter((p) => p[1] != null && p[1] < LOW).length]));
const worst = Z.reduce((b, z) => (hoursBelow[z.label] > (hoursBelow[b?.label] ?? -1) ? z : b), null);

const build = (w, h) => ({
  backgroundColor: 'transparent',
  animation: false,
  textStyle: { fontFamily: FONT },
  graphic: [
    ...card(w, h, {
      eyebrow: 'Quality', title: 'Chlorine residual',
      meta: worst && hoursBelow[worst.label] ? `${worst.label}: ${hoursBelow[worst.label]} h below target` : 'All zones in band',
      glow: worst && hoursBelow[worst.label] ? T.amber : T.mint,
    }),
    ...(t.length ? [] : [empty(w, h)]),
  ],
  tooltip: tooltip({
    trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: rgba(T.ink, 0.35), width: 1 } },
    formatter: (ps) => tipHead(time(ps[0].value[0], true)) +
      ps.map((p) => tipRow(p.color, p.seriesName, `<span style="color:${p.value[1] < LOW ? T.coral : 'inherit'}">${fmt(p.value[1], 2)} mg/l</span>`)).join(''),
  }),
  legend: {
    top: 62, left: 16, itemWidth: 14, itemHeight: 3, itemGap: 16, icon: 'roundRect',
    textStyle: { color: T.muted, fontSize: 11, fontFamily: FONT, rich: { b: { color: T.coral, fontWeight: 700, fontSize: 11, fontFamily: FONT } } },
    formatter: (n) => (hoursBelow[n] && w > 520 ? `${n} {b|${hoursBelow[n]} h low}` : n),
  },
  grid: { left: 18, right: 18, top: 96, bottom: 14, containLabel: true },
  xAxis: {
    type: 'time', axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
    axisLabel: { ...axisLabel, hideOverlap: true, formatter: axisDate, rich: { d: { color: T.ink, fontWeight: 700, fontSize: 10.5, fontFamily: FONT }, m: { color: T.muted, fontSize: 10.5, fontFamily: FONT } } },
  },
  yAxis: { type: 'value', min: 0, max: 1, interval: 0.2, axisLabel: { ...axisLabel, formatter: (v) => v.toFixed(1) }, splitLine: { lineStyle: { color: T.grid, type: [2, 4] } } },
  series: Z.map((z, i) => ({
    name: z.label, type: 'line', data: z.data, showSymbol: false, smooth: 0.35,
    lineStyle: { width: 1.8, color: z.color }, itemStyle: { color: z.color },
    emphasis: { focus: 'series', lineStyle: { width: 2.6 } },
    ...(i === 0 ? {
      markArea: {
        silent: true,
        data: [
          [{ yAxis: LOW, itemStyle: { color: rgba(T.mint, isDark ? 0.07 : 0.08) } }, { yAxis: HIGH }],
          [{ yAxis: 0, itemStyle: { color: rgba(T.coral, isDark ? 0.07 : 0.05) } }, { yAxis: LOW }],
        ],
      },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: rgba(T.mint, 0.5), type: [4, 4], width: 1 },
        label: { position: 'insideEndTop', color: T.muted, fontSize: 10, fontFamily: FONT, formatter: (p) => (p.value === LOW ? 'min 0.3' : 'max 0.8') },
        data: [{ yAxis: LOW }, { yAxis: HIGH }],
      },
    } : {}),
  })),
});
return mount(build);
