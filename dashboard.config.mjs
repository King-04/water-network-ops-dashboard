// Dashboard manifest: layout, panel sources and the queries each panel uses.
// `npm run build` turns this into grafana/dashboards/lumenvale-network-ops.json
export default {
  uid: 'lumenvale-network-ops',
  title: 'Lumenvale Water · Network Operations',
  subtitle: 'Supply, storage, losses, water quality and pumping for a fictional 21 000-connection utility',
  datasource: { type: 'grafana-postgresql-datasource', uid: 'lumenvale-pg' },
  time: { from: 'now-7d', to: 'now' },
  kit: ['src/kit.js'],
  // Only used by tools/render.mjs for the portfolio screenshots
  showcase: {
    width: 1600,
    font: "'Plus Jakarta Sans', system-ui, sans-serif",
    fonts: [{ family: 'Plus Jakarta Sans', pkg: 'plus-jakarta-sans', weights: [400, 500, 600, 700, 800] }],
    chipRight: 'PostgreSQL 16 · Grafana 11 · ECharts',
    logo: '<svg width="22" height="22" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DD3FC"/><stop offset="1" stop-color="#6EE7B7"/></linearGradient></defs><path d="M12 2.5c3.6 4.3 6.5 8 6.5 11.4A6.5 6.5 0 0 1 5.5 13.9C5.5 10.5 8.4 6.8 12 2.5z" fill="url(#g)"/></svg>',
    dark: {
      bg: '#061015', ink: '#E9F2F4', muted: '#8CA3AD', stroke: 'rgba(148,226,213,0.14)', accent: '#6EE7B7', accentSoft: 'rgba(110,231,183,0.18)',
      logoBg: 'rgba(110,231,183,0.10)',
      bgImage: 'radial-gradient(1200px 500px at 85% -10%, rgba(125,211,252,0.10), transparent 60%), radial-gradient(900px 500px at 0% 0%, rgba(110,231,183,0.07), transparent 60%)',
    },
    light: {
      bg: '#EEF4F4', ink: '#0E1C24', muted: '#5D7380', stroke: '#D5E2E4', accent: '#059669', accentSoft: 'rgba(5,150,105,0.15)',
      logoBg: '#0E1C24', chipBg: '#FFFFFF',
      bgImage: 'radial-gradient(1200px 500px at 85% -10%, rgba(2,132,199,0.07), transparent 60%)',
    },
  },
  panels: [
    { id: 1,  src: '01_system_demand.js',         include: ['src/kpi.js'], gridPos: { x: 0,  y: 0,  w: 6,  h: 5 },  queries: { A: '01_kpi_system_demand' } },
    { id: 2,  src: '02_non_revenue_water.js',     include: ['src/kpi.js'], gridPos: { x: 6,  y: 0,  w: 6,  h: 5 },  queries: { A: '02_kpi_non_revenue_water' } },
    { id: 3,  src: '03_energy_intensity.js',      include: ['src/kpi.js'], gridPos: { x: 12, y: 0,  w: 6,  h: 5 },  queries: { A: '03_kpi_energy_intensity' } },
    { id: 4,  src: '04_active_alarms.js',         include: ['src/kpi.js'], gridPos: { x: 18, y: 0,  w: 6,  h: 5 },  queries: { A: '04a_kpi_active_alarms', B: '04b_kpi_active_alarms_trend' } },
    { id: 5,  src: '05_production_and_storage.js',                        gridPos: { x: 0,  y: 5,  w: 16, h: 10 }, queries: { A: '05_production_and_storage' } },
    { id: 6,  src: '06_reservoir_storage.js',                             gridPos: { x: 16, y: 5,  w: 8,  h: 10 }, queries: { A: '06_reservoir_storage' } },
    { id: 7,  src: '07_demand_heatmap.js',                                gridPos: { x: 0,  y: 15, w: 12, h: 9 },  queries: { A: '07_demand_heatmap' } },
    { id: 8,  src: '08_night_flow_by_dma.js',                             gridPos: { x: 12, y: 15, w: 12, h: 9 },  queries: { A: '08_night_flow_by_dma' } },
    { id: 9,  src: '09_chlorine_residual.js',                             gridPos: { x: 0,  y: 24, w: 10, h: 10 }, queries: { A: '09_chlorine_residual' } },
    { id: 10, src: '10_pump_stations.js',                                 gridPos: { x: 10, y: 24, w: 14, h: 10 }, queries: { A: '10_pump_stations' } },
  ],
};
