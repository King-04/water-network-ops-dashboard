-- Chlorine residual by pressure zone (hourly mean)
-- Target band 0.3-0.8 mg/l is drawn by the panel.
SELECT date_bin('1 hour', r.ts, timestamptz '2000-01-01') AS "time",
       round(avg(r.value) FILTER (WHERE s.asset_id = 'Z-NORTH')::numeric, 3)   AS north,
       round(avg(r.value) FILTER (WHERE s.asset_id = 'Z-CENTRAL')::numeric, 3) AS central,
       round(avg(r.value) FILTER (WHERE s.asset_id = 'Z-SOUTH')::numeric, 3)   AS south,
       round(avg(r.value) FILTER (WHERE s.asset_id = 'Z-EAST')::numeric, 3)    AS east
FROM ops.reading r
JOIN ops.sensor s USING (sensor_id)
WHERE s.kind = 'chlorine'
  AND $__timeFilter(r.ts)
GROUP BY 1
ORDER BY 1;
