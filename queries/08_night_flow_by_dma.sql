-- Minimum night flow by DMA
-- Average 02:00-04:00 inflow over the last 7 nights vs the 7 nights
-- before and vs the DMA's baseline. Night flow is the classic leak
-- indicator: almost nobody uses water at 3 am, so what flows is mostly loss.
WITH night AS (
    SELECT s.asset_id AS dma_id,
           r.ts,
           r.value
    FROM ops.reading r
    JOIN ops.sensor s USING (sensor_id)
    WHERE s.asset_type = 'dma' AND s.kind = 'flow'
      AND extract(hour FROM r.ts) BETWEEN 2 AND 3
      AND r.ts >  $__timeTo()::timestamptz - interval '14 days'
      AND r.ts <= $__timeTo()::timestamptz
)
SELECT d.dma_id,
       d.name,
       d.connections,
       d.baseline_mnf_m3h,
       round(avg(n.value) FILTER (WHERE n.ts >  $__timeTo()::timestamptz - interval '7 days')::numeric, 2) AS mnf_7d_m3h,
       round(avg(n.value) FILTER (WHERE n.ts <= $__timeTo()::timestamptz - interval '7 days')::numeric, 2) AS mnf_prev_7d_m3h
FROM ops.dma d
JOIN night n USING (dma_id)
GROUP BY d.dma_id, d.name, d.connections, d.baseline_mnf_m3h
ORDER BY (avg(n.value) FILTER (WHERE n.ts > $__timeTo()::timestamptz - interval '7 days')) / d.baseline_mnf_m3h DESC;
