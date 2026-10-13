-- Demand pattern: average plant outflow by weekday x hour of day
SELECT extract(isodow FROM r.ts)::int AS weekday,      -- 1 = Monday
       extract(hour   FROM r.ts)::int AS hour,
       round(avg(r.value)::numeric, 0) AS demand_m3h
FROM ops.reading r
JOIN ops.sensor s USING (sensor_id)
WHERE s.tag = 'PLANT.OUTFLOW'
  AND $__timeFilter(r.ts)
GROUP BY 1, 2
ORDER BY 1, 2;
