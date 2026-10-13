// Production & storage — plant outflow (area) vs network storage (line, right axis)
// Night hours are shaded so the daily refill cycle is easy to read.
const A = frame('A');
const t = A.col('time');
const q = A.num('outflow_m3h');
const pct = A.num('storage_pct');
const m3 = A.num('storage_m3');
const flow = t.map((x, i) => [x, q[i]]);
const store = t.map((x, i) => [x, pct[i]]);
const hasData = t.length > 0;

const peak = flow.reduce((b, p) => (p[1] > (b?.[1] ?? -1) ? p : b), null);
const minStore = store.reduce((b, p) => (p[1] != null && p[1] < (b?.[1] ?? 1e9) ? p : b), null);
const vol = flow.length > 1 ? flow.reduce((s, p, i) => s + (i ? ((p[0] - flow[i - 1][0]) / 36e5) * p[1] : 0), 0) : null;

// night bands 00:00-06:00 inside the range
const nights = [];
if (hasData) {
  const d = new Date(t[0]); d.setHours(0, 0, 0, 0);
  for (let s = d.getTime(); s < t[t.length - 1]; s += 864e5) nights.push([{ xAxis: Math.max(s, t[0]) }, { xAxis: Math.min(s + 6 * 36e5, t[t.length - 1]) }]);
}

const build = (w, h) => {
  const legendTop = 66;
  return {
    backgroundColor: 'transparent',
    animation: false,
    textStyle: { fontFamily: FONT },
    graphic: [
      ...card(w, h, { eyebrow: 'Supply', title: 'Production & storage', meta: vol ? `${fmtK(vol)} m³ produced` : '', glow: T.sky }),
      ...(hasData ? [] : [empty(w, h)]),
    ],
    tooltip: tooltip({
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: rgba(T.ink, 0.35), width: 1 } },
      formatter: (ps) => {
        const i = ps[0]?.dataIndex;
        if (i == null) return '';
        return tipHead(time(t[i], true)) +
          tipRow(T.sky, 'Plant outflow', `${fmt(q[i])} m³/h`) +
          tipRow(T.iris, 'Storage', `${fmt(pct[i], 1)} % · ${fmtK(m3[i])} m³`);
      },
    }),
    legend: {
      show: hasData, top: legendTop, left: 16, itemWidth: 14, itemHeight: 8, itemGap: 18,
      icon: 'roundRect',
      textStyle: { color: T.muted, fontSize: 11, fontFamily: FONT, rich: { b: { color: T.ink, fontWeight: 700, fontSize: 11, fontFamily: FONT } } },
      formatter: (n) => (n === 'Plant outflow'
        ? `${n}  {b|peak ${fmt(peak?.[1])}}`
        : `${n}  {b|low ${fmt(minStore?.[1], 0)} %}`),
      data: ['Plant outflow', 'Storage'],
    },
    grid: { left: 18, right: 18, top: legendTop + 34, bottom: 14, containLabel: true },
    xAxis: {
      type: 'time', show: hasData,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { ...axisLabel, hideOverlap: true, formatter: axisDate, rich: { d: { color: T.ink, fontWeight: 700, fontSize: 10.5, fontFamily: FONT }, m: { color: T.muted, fontSize: 10.5, fontFamily: FONT } } },
      splitLine: { show: false },
    },
    yAxis: [
      { type: 'value', show: hasData, min: 0, axisLabel: { ...axisLabel, formatter: (v) => fmtK(v) }, splitLine: { lineStyle: { color: T.grid, type: [2, 4] } } },
      { type: 'value', show: hasData, min: 0, max: 100, interval: 25, axisLabel: { ...axisLabel, color: T.iris, formatter: '{value} %' }, splitLine: { show: false } },
    ],
    series: [
      {
        name: 'Plant outflow', type: 'line', data: flow, showSymbol: false, smooth: 0.3,
        lineStyle: { width: 2, color: T.sky }, itemStyle: { color: T.sky },
        areaStyle: { color: vgrad(T.sky, isDark ? 0.35 : 0.22, 0) },
        markArea: { silent: true, itemStyle: { color: rgba(T.ink, isDark ? 0.025 : 0.03) }, data: nights },
        z: 2,
      },
      {
        name: 'Storage', type: 'line', yAxisIndex: 1, data: store, showSymbol: false, smooth: 0.3,
        lineStyle: { width: 2.2, color: T.iris }, itemStyle: { color: T.iris },
        markPoint: minStore ? {
          symbol: 'circle', symbolSize: 9, itemStyle: { color: T.cardBottom, borderColor: T.iris, borderWidth: 2 },
          label: { show: true, position: 'bottom', distance: 6, formatter: `${fmt(minStore[1], 0)} %`, color: T.iris, fontSize: 10.5, fontWeight: 700, fontFamily: FONT },
          data: [{ coord: minStore }],
        } : undefined,
        z: 3,
      },
    ],
  };
};
return mount(build);
