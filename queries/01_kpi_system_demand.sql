-- KPI · System demand
-- Hourly plant outflow for the 48 h before the end of the range.
-- The panel shows the latest hour, compares it with the same hour
-- yesterday and draws the last 24 h as a sparkline.
SELECT date_bin('1 hour', r.ts, timestamptz '2000-01-01') AS "time",
       round(avg(r.value)::numeric, 1)                     AS demand_m3h
FROM ops.reading r
JOIN ops.sensor s USING (sensor_id)
WHERE s.tag = 'PLANT.OUTFLOW'
  AND r.ts >  $__timeTo()::timestamptz - interval '48 hours'
  AND r.ts <= $__timeTo()::timestamptz
GROUP BY 1
ORDER BY 1;
