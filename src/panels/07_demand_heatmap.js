// Demand pattern — weekday x hour heatmap of plant outflow
const A = frame('A');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const cells = A.col('weekday').map((d, i) => [A.num('hour')[i], d - 1, A.num('demand_m3h')[i]]);
const vals = cells.map((c) => c[2]).filter((v) => v != null);
const max = vals.length ? Math.max(...vals) : 1;
const min = vals.length ? Math.min(...vals) : 0;
const peak = cells.reduce((b, c) => (c[2] > (b?.[2] ?? -1) ? c : b), null);
const hh = (x) => `${String(x).padStart(2, '0')}:00`;

const build = (w, h) => ({
  backgroundColor: 'transparent',
  animation: false,
  textStyle: { fontFamily: FONT },
  graphic: [
    ...card(w, h, { eyebrow: 'Behaviour', title: 'Demand pattern', meta: peak ? `Peak ${DAYS[peak[1]]} ${hh(peak[0])} · ${fmt(peak[2])} m³/h` : '', glow: T.mint }),
    ...(vals.length ? [] : [empty(w, h)]),
  ],
  tooltip: tooltip({
    formatter: (p) => tipHead(`${DAYS[p.value[1]]} · ${hh(p.value[0])}–${hh((p.value[0] + 1) % 24)}`) +
      tipRow(T.mint, 'Avg. demand', `${fmt(p.value[2])} m³/h`) +
      tipRow('transparent', 'vs. peak', `${fmt((100 * p.value[2]) / max, 0)} %`),
  }),
  grid: { left: 18, right: 18, top: 64, bottom: 44, containLabel: true },
  xAxis: {
    type: 'category', data: [...Array(24).keys()],
    axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false },
    axisLabel: { ...axisLabel, interval: w < 520 ? 5 : 2, formatter: (v) => hh(Number(v)) },
  },
  yAxis: {
    type: 'category', data: DAYS, inverse: true,
    axisLine: { show: false }, axisTick: { show: false },
    axisLabel: { ...axisLabel, color: T.ink, fontWeight: 600 },
  },
  visualMap: {
    min, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 10, itemWidth: 10, itemHeight: Math.min(220, w * 0.4),
    text: ['high', 'low'], textGap: 8, textStyle: { color: T.muted, fontSize: 10.5, fontFamily: FONT },
    inRange: { color: isDark ? ['#0F2830', '#13505A', '#1E8C84', '#6EE7B7', '#E6FFF5'] : ['#EEF7F5', '#BDE9DC', '#5DC4A5', '#0E9A73', '#065F46'] },
  },
  series: [{
    type: 'heatmap', data: cells,
    itemStyle: { borderColor: T.cardBottom, borderWidth: 2, borderRadius: 4 },
    emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 1.5 } },
  }],
});
return mount(build);
