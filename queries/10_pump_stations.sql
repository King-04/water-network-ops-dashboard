-- Pump stations: live status, load, efficiency and a 24 h flow sparkline
WITH latest AS (
    SELECT DISTINCT ON (s.asset_id, s.kind)
           s.asset_id AS station_id, s.kind, r.value
    FROM ops.reading r
    JOIN ops.sensor s USING (sensor_id)
    WHERE s.asset_type = 'pump_station'
      AND r.ts >  $__timeTo()::timestamptz - interval '1 hour'
      AND r.ts <= $__timeTo()::timestamptz
    ORDER BY s.asset_id, s.kind, r.ts DESC
),
energy AS (
    SELECT s.asset_id AS station_id,
           sum(r.value) FILTER (WHERE s.kind = 'power' AND r.ts >  $__timeTo()::timestamptz - interval '7 days')
         / nullif(sum(r.value) FILTER (WHERE s.kind = 'flow' AND r.ts > $__timeTo()::timestamptz - interval '7 days'), 0)  AS kwh_m3_7d,
           sum(r.value) FILTER (WHERE s.kind = 'power' AND r.ts <= $__timeTo()::timestamptz - interval '7 days')
         / nullif(sum(r.value) FILTER (WHERE s.kind = 'flow' AND r.ts <= $__timeTo()::timestamptz - interval '7 days'), 0) AS kwh_m3_prev,
           100.0 * count(*) FILTER (WHERE s.kind = 'flow' AND r.value > 0 AND r.ts > $__timeTo()::timestamptz - interval '24 hours')
                 / nullif(count(*) FILTER (WHERE s.kind = 'flow' AND r.ts > $__timeTo()::timestamptz - interval '24 hours'), 0)   AS runtime_24h_pct
    FROM ops.reading r
    JOIN ops.sensor s USING (sensor_id)
    WHERE s.asset_type = 'pump_station'
      AND r.ts >  $__timeTo()::timestamptz - interval '14 days'
      AND r.ts <= $__timeTo()::timestamptz
    GROUP BY 1
),
spark AS (
    SELECT station_id, json_agg(round(q::numeric, 0) ORDER BY h)::text AS flow_24h
    FROM (
        SELECT s.asset_id AS station_id,
               date_bin('1 hour', r.ts, timestamptz '2000-01-01') AS h,
               avg(r.value) AS q
        FROM ops.reading r
        JOIN ops.sensor s USING (sensor_id)
        WHERE s.asset_type = 'pump_station' AND s.kind = 'flow'
          AND r.ts > $__timeTo()::timestamptz - interval '24 hours' AND r.ts <= $__timeTo()::timestamptz
        GROUP BY 1, 2
    ) x
    GROUP BY station_id
),
open_alarm AS (
    SELECT DISTINCT ON (asset_id) asset_id AS station_id, severity, message
    FROM ops.alarm
    WHERE raised_at <= $__timeTo()::timestamptz AND (cleared_at IS NULL OR cleared_at > $__timeTo()::timestamptz)
    ORDER BY asset_id, CASE severity WHEN 'critical' THEN 1 WHEN 'major' THEN 2 ELSE 3 END
)
SELECT p.station_id,
       p.name,
       CASE WHEN a.severity = 'critical'          THEN 'tripped'
            WHEN coalesce(f.value, 0) = 0         THEN 'stopped'
            WHEN a.severity IS NOT NULL           THEN 'warning'
            ELSE 'running' END                             AS status,
       a.message                                           AS alarm,
       round(coalesce(f.value, 0)::numeric, 0)             AS flow_m3h,
       round((100 * coalesce(f.value, 0) / p.rated_flow_m3h)::numeric, 0) AS load_pct,
       round(e.kwh_m3_7d::numeric, 3)                      AS kwh_m3,
       round(e.kwh_m3_prev::numeric, 3)                    AS kwh_m3_prev,
       round(e.runtime_24h_pct::numeric, 0)                AS runtime_24h_pct,
       sp.flow_24h
FROM ops.pump_station p
LEFT JOIN latest f      ON f.station_id = p.station_id AND f.kind = 'flow'
LEFT JOIN energy e      ON e.station_id = p.station_id
LEFT JOIN spark sp      ON sp.station_id = p.station_id
LEFT JOIN open_alarm a  ON a.station_id = p.station_id
ORDER BY CASE WHEN a.severity = 'critical' THEN 0 WHEN a.severity IS NOT NULL THEN 1 ELSE 2 END, p.station_id;
