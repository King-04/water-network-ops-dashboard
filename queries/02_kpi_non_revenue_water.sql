-- KPI · Non-revenue water
-- Daily system input vs billed volume over the last 30 closed days.
-- NRW = water put into the network that never reached a bill
-- (leaks + meter under-registration + unbilled use).
WITH input AS (
    SELECT r.ts::date AS day, sum(r.value) * 0.25 AS input_m3      -- 15-min m3/h -> m3
    FROM ops.reading r
    JOIN ops.sensor s USING (sensor_id)
    WHERE s.kind = 'flow' AND s.asset_type = 'dma'
      AND r.ts >= date_trunc('day', $__timeTo()::timestamptz) - interval '30 days'
      AND r.ts <  date_trunc('day', $__timeTo()::timestamptz)
    GROUP BY 1
),
billed AS (
    SELECT day, sum(billed_m3) AS billed_m3
    FROM ops.billed_daily
    GROUP BY 1
)
SELECT i.day::timestamptz                                   AS "time",
       round(i.input_m3::numeric, 0)                        AS input_m3,
       round(b.billed_m3, 0)                                AS billed_m3,
       round((100 * (i.input_m3 - b.billed_m3) / i.input_m3)::numeric, 2) AS nrw_pct
FROM input i
JOIN billed b USING (day)
ORDER BY 1;
