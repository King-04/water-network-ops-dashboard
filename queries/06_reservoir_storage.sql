-- Reservoir storage: latest level of every reservoir, its operating band
-- and the level 24 h earlier (for the trend arrow)
SELECT rv.reservoir_id,
       rv.name,
       rv.capacity_m3,
       rv.low_level_pct,
       rv.high_level_pct,
       cur.value  AS level_pct,
       prev.value AS level_24h_ago_pct
FROM ops.reservoir rv
JOIN ops.sensor s ON s.asset_id = rv.reservoir_id AND s.kind = 'level'
LEFT JOIN LATERAL (
    SELECT value FROM ops.reading
    WHERE sensor_id = s.sensor_id AND ts <= $__timeTo()::timestamptz
    ORDER BY ts DESC LIMIT 1
) cur ON true
LEFT JOIN LATERAL (
    SELECT value FROM ops.reading
    WHERE sensor_id = s.sensor_id AND ts <= $__timeTo()::timestamptz - interval '24 hours'
    ORDER BY ts DESC LIMIT 1
) prev ON true
ORDER BY rv.capacity_m3 DESC;
