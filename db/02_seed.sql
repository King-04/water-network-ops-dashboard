-- =====================================================================
--  Lumenvale Water · synthetic seed
--  35 days of 15-minute telemetry ending "now", so the dashboards always
--  look live. Deterministic (setseed) so screenshots are reproducible.
--
--  Story baked into the data (so the dashboards have something to find):
--    * DMA C2 Riverside develops a leak 9 days ago  -> night flow jumps
--    * Old Mill reservoir has been drawn down for 2 days -> below band
--    * Cedar Ridge pump station is losing efficiency (worn impeller)
--    * Old Mill booster tripped 5 hours ago           -> active alarm
--    * East zone chlorine dips under target on warm afternoons
-- =====================================================================
SET search_path TO ops, public;
SELECT setseed(0.42);

-- ---------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------
INSERT INTO reservoir VALUES
  ('RSV-01', 'Hilltop',     12000, 35, 90),
  ('RSV-02', 'Northgate',    8000, 35, 90),
  ('RSV-03', 'Cedar Ridge',  5000, 30, 90),
  ('RSV-04', 'Harbour',      6500, 35, 90),
  ('RSV-05', 'Old Mill',     3000, 40, 92);

INSERT INTO dma VALUES
  ('DMA-N1', 'Northgate',   5200, 46.0),
  ('DMA-N2', 'Ashford',     3100, 27.0),
  ('DMA-C1', 'Old Town',    4400, 39.0),
  ('DMA-C2', 'Riverside',   2700, 23.0),
  ('DMA-S1', 'Harbour',     3900, 33.0),
  ('DMA-S2', 'Cedar Park',  1800, 16.0);

INSERT INTO pump_station VALUES
  ('PS-01', 'Riverside Intake',  950, 4),
  ('PS-02', 'Hilltop Booster',   420, 3),
  ('PS-03', 'Northgate Booster', 360, 2),
  ('PS-04', 'Cedar Ridge',       240, 2),
  ('PS-05', 'Harbour Lift',      310, 2),
  ('PS-06', 'Old Mill Booster',  150, 2);

-- ---------------------------------------------------------------------
-- Sensors
-- ---------------------------------------------------------------------
INSERT INTO sensor (sensor_id, tag, kind, unit, asset_type, asset_id)
SELECT 100 + row_number() OVER (), reservoir_id || '.LEVEL', 'level', '%', 'reservoir', reservoir_id FROM reservoir
UNION ALL
SELECT 200 + row_number() OVER (), dma_id || '.INFLOW', 'flow', 'm3/h', 'dma', dma_id FROM dma
UNION ALL
SELECT 300 + row_number() OVER (), station_id || '.FLOW', 'flow', 'm3/h', 'pump_station', station_id FROM pump_station
UNION ALL
SELECT 400 + row_number() OVER (), station_id || '.POWER', 'power', 'kW', 'pump_station', station_id FROM pump_station
UNION ALL
SELECT 500 + n, z || '.CL2', 'chlorine', 'mg/l', 'zone', z
  FROM unnest(ARRAY['Z-NORTH', 'Z-CENTRAL', 'Z-SOUTH', 'Z-EAST']) WITH ORDINALITY AS t(z, n)
UNION ALL
SELECT 600 + n, z || '.PRESSURE', 'pressure', 'bar', 'zone', z
  FROM unnest(ARRAY['Z-NORTH', 'Z-CENTRAL', 'Z-SOUTH', 'Z-EAST']) WITH ORDINALITY AS t(z, n)
UNION ALL
SELECT 700, 'PLANT.OUTFLOW', 'flow', 'm3/h', 'plant', 'WTP-01';

-- ---------------------------------------------------------------------
-- Time axis + demand shape
-- ---------------------------------------------------------------------
CREATE TEMP TABLE t AS
SELECT ts,
       extract(epoch FROM ts)                                         AS ep,
       extract(hour FROM ts) + extract(minute FROM ts) / 60.0         AS h,
       extract(isodow FROM ts) IN (6, 7)                              AS weekend,
       extract(epoch FROM (now() - ts)) / 86400.0                     AS days_ago
FROM generate_series(date_trunc('hour', now()) - interval '35 days',
                     now(), interval '15 minutes') AS ts;

-- Residential diurnal curve: morning + evening peaks (weekend peak later)
CREATE TEMP TABLE shape AS
SELECT ts, ep, h, weekend, days_ago,
       0.15
       + 0.95 * exp(-power(h - CASE WHEN weekend THEN 9.5 ELSE 7.5 END, 2) / 3.2)
       + 0.70 * exp(-power(h - 19.5, 2) / 5.0)
       + 0.32 * exp(-power(h - 13.5, 2) / 14.0)                         -- daytime plateau
       + 0.05 * sin(ep / 86400.0 * 2 * pi() / 7)                      -- weekly drift
       AS f
FROM t;

-- ---------------------------------------------------------------------
-- DMA inflow = consumption x diurnal shape + background leakage
--   ~0.045 m3/h per connection at shape 1.0; baseline MNF = night use + leakage
-- ---------------------------------------------------------------------
CREATE TEMP TABLE dma_flow AS
SELECT ts, dma_id, use_q, leak_q, use_q + leak_q AS q
FROM (
    SELECT s.ts, d.dma_id,
           d.connections * 0.045 * s.f * (0.94 + random() * 0.12)          AS use_q,   -- legitimate use
           (d.baseline_mnf_m3h - d.connections * 0.00675) * (0.9 + random() * 0.2)    -- background leakage
           + CASE WHEN d.dma_id = 'DMA-C2' AND s.days_ago < 9                         -- the Riverside leak
                  THEN 12 * least(1, (9 - s.days_ago) / 2) ELSE 0 END              AS leak_q
    FROM shape s CROSS JOIN dma d
) x;

INSERT INTO reading
SELECT f.ts, se.sensor_id, round(f.q::numeric, 2)
FROM dma_flow f JOIN sensor se ON se.tag = f.dma_id || '.INFLOW';

-- Plant outflow = sum of DMAs + 3 % transmission losses
INSERT INTO reading
SELECT ts, 700, round((sum(q) * 1.03)::numeric, 1)
FROM dma_flow GROUP BY ts;

-- ---------------------------------------------------------------------
-- Reservoir levels: drawn down by day, refilled overnight
-- ---------------------------------------------------------------------
INSERT INTO reading
SELECT s.ts, se.sensor_id,
       round(greatest(5, least(98,
         r.mid + r.amp * cos(2 * pi() * (s.h - 5.5) / 24)
         + (random() - 0.5) * 1.6
         - CASE WHEN r.reservoir_id = 'RSV-05' AND s.days_ago < 2       -- Old Mill drawdown
                THEN 34 * least(1, (2 - s.days_ago) / 1.2) ELSE 0 END
       ))::numeric, 1)
FROM shape s
CROSS JOIN (VALUES ('RSV-01', 72, 14), ('RSV-02', 66, 16), ('RSV-03', 61, 18),
                   ('RSV-04', 70, 12), ('RSV-05', 68, 15)) AS r(reservoir_id, mid, amp)
JOIN sensor se ON se.tag = r.reservoir_id || '.LEVEL';

-- ---------------------------------------------------------------------
-- Pump stations: flow follows demand; power = flow x specific energy
-- ---------------------------------------------------------------------
CREATE TEMP TABLE pump AS
SELECT s.ts, p.station_id,
       CASE WHEN p.station_id = 'PS-06' AND s.days_ago < 5.0 / 24 THEN 0  -- tripped
            ELSE greatest(0, p.rated_flow_m3h * least(1, 0.28 + 0.55 * s.f) * (0.92 + random() * 0.1))
       END AS q,
       CASE p.station_id
            WHEN 'PS-01' THEN 0.31 WHEN 'PS-02' THEN 0.38 WHEN 'PS-03' THEN 0.41
            WHEN 'PS-04' THEN 0.44 + 0.16 * greatest(0, (35 - s.days_ago) / 35)   -- wear
            WHEN 'PS-05' THEN 0.36 ELSE 0.47 END
       * (0.97 + random() * 0.06) AS kwh_per_m3
FROM shape s CROSS JOIN pump_station p;

INSERT INTO reading
SELECT p.ts, se.sensor_id, round(p.q::numeric, 1)
FROM pump p JOIN sensor se ON se.tag = p.station_id || '.FLOW';

INSERT INTO reading
SELECT p.ts, se.sensor_id, round((p.q * p.kwh_per_m3)::numeric, 1)
FROM pump p JOIN sensor se ON se.tag = p.station_id || '.POWER';

-- ---------------------------------------------------------------------
-- Zone pressure (higher at night, lower at peaks) and chlorine residual
-- ---------------------------------------------------------------------
INSERT INTO reading
SELECT s.ts, 600 + z.n,
       round((z.p0 - 0.7 * (s.f - 0.3) + (random() - 0.5) * 0.12)::numeric, 2)
FROM shape s
CROSS JOIN (VALUES (1, 4.4), (2, 4.0), (3, 3.7), (4, 4.2)) AS z(n, p0);

INSERT INTO reading
SELECT s.ts, 500 + z.n,
       round(greatest(0.05,
         z.c0
         + 0.07 * cos(2 * pi() * (s.h - 4) / 24)
         - CASE WHEN z.n = 4 THEN 0.20 * greatest(0, sin(2 * pi() * (s.h - 10) / 24))   -- warm-afternoon decay, East
                                  * (0.6 + 0.4 * sin(s.ep / 86400.0 / 3)) ELSE 0 END
         + (random() - 0.5) * 0.05
       )::numeric, 3)
FROM shape s
CROSS JOIN (VALUES (1, 0.62), (2, 0.55), (3, 0.50), (4, 0.43)) AS z(n, c0);

-- ---------------------------------------------------------------------
-- Billing: what customers actually paid for (consumption without leaks,
-- minus ~3 % meter under-registration)
-- ---------------------------------------------------------------------
INSERT INTO billed_daily
SELECT f.ts::date, f.dma_id,
       round((sum(f.use_q) * 0.25 * 0.97)::numeric, 1)
FROM dma_flow f
WHERE f.ts < date_trunc('day', now())                             -- billing closes at midnight
GROUP BY 1, 2;

-- ---------------------------------------------------------------------
-- Alarm log
-- ---------------------------------------------------------------------
INSERT INTO alarm (raised_at, cleared_at, severity, asset_id, message)
SELECT r, r + (interval '20 minutes' + random() * interval '9 hours'),
       (ARRAY['minor', 'minor', 'minor', 'major', 'major', 'critical'])[1 + floor(random() * 6)::int],
       (ARRAY['PS-02', 'PS-03', 'PS-04', 'PS-05', 'RSV-03', 'DMA-N2', 'Z-EAST', 'RSV-01'])[1 + floor(random() * 8)::int],
       (ARRAY['Pressure deviation', 'Pump fault — auto restart', 'Comms loss', 'High level',
              'Low chlorine residual', 'Flow meter drift'])[1 + floor(random() * 6)::int]
FROM generate_series(now() - interval '35 days', now() - interval '12 hours', interval '17 hours') AS r;

INSERT INTO alarm (raised_at, cleared_at, severity, asset_id, message) VALUES
  (now() - interval '5 hours',             NULL, 'critical', 'PS-06',  'Pump trip — motor overload'),
  (now() - interval '41 hours',            NULL, 'major',    'RSV-05', 'Level below operating band'),
  (now() - interval '8 days 6 hours',      NULL, 'major',    'DMA-C2', 'Night flow above baseline'),
  (now() - interval '3 hours 20 minutes',  NULL, 'minor',    'Z-EAST', 'Low chlorine residual'),
  (now() - interval '2 days 4 hours',      NULL, 'minor',    'PS-04',  'Specific energy above target');

ANALYZE;
