-- KPI · Pumping energy intensity (kWh per m3 pumped), last 30 days
WITH d AS (
    SELECT r.ts::date AS day, s.kind, sum(r.value) * 0.25 AS total
    FROM ops.reading r
    JOIN ops.sensor s USING (sensor_id)
    WHERE s.asset_type = 'pump_station'
      AND s.kind IN ('flow', 'power')
      AND r.ts >= date_trunc('day', $__timeTo()::timestamptz) - interval '30 days'
      AND r.ts <= $__timeTo()::timestamptz
    GROUP BY 1, 2
)
SELECT day::timestamptz AS "time",
       round((max(total) FILTER (WHERE kind = 'power')
            / nullif(max(total) FILTER (WHERE kind = 'flow'), 0))::numeric, 3) AS kwh_per_m3,
       round(max(total) FILTER (WHERE kind = 'power')::numeric, 0)            AS kwh
FROM d
GROUP BY day
ORDER BY 1;
