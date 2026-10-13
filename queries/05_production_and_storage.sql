-- Production & storage
-- Plant outflow vs total storage (capacity-weighted level of all
-- reservoirs). Storage should fall during the day and recover overnight.
WITH b AS (
    SELECT CASE WHEN $__timeTo()::timestamptz - $__timeFrom()::timestamptz <= interval '3 days'
                THEN interval '15 minutes' ELSE interval '1 hour' END AS step
),
outflow AS (
    SELECT date_bin(b.step, r.ts, timestamptz '2000-01-01') AS t, avg(r.value) AS q
    FROM ops.reading r JOIN ops.sensor s USING (sensor_id), b
    WHERE s.tag = 'PLANT.OUTFLOW' AND $__timeFilter(r.ts)
    GROUP BY 1
),
storage AS (
    SELECT date_bin(b.step, r.ts, timestamptz '2000-01-01') AS t,
           sum(r.value / 100 * rv.capacity_m3) / count(DISTINCT r.ts)    AS stored_m3,
           100 * sum(r.value / 100 * rv.capacity_m3) / sum(rv.capacity_m3) AS stored_pct
    FROM ops.reading r
    JOIN ops.sensor s    USING (sensor_id)
    JOIN ops.reservoir rv ON rv.reservoir_id = s.asset_id, b
    WHERE s.kind = 'level' AND $__timeFilter(r.ts)
    GROUP BY 1
)
SELECT o.t                                AS "time",
       round(o.q::numeric, 1)             AS outflow_m3h,
       round(st.stored_pct::numeric, 1)   AS storage_pct,
       round(st.stored_m3::numeric, 0)    AS storage_m3
FROM outflow o
JOIN storage st USING (t)
ORDER BY 1;
