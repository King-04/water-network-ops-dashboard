-- KPI · Active alarms (refId B): hourly count of open alarms, last 7 days
SELECT h AS "time",
       count(a.alarm_id) AS active
FROM generate_series(date_trunc('hour', $__timeTo()::timestamptz) - interval '7 days',
                     date_trunc('hour', $__timeTo()::timestamptz), interval '1 hour') AS h
LEFT JOIN ops.alarm a
       ON a.raised_at <= h AND (a.cleared_at IS NULL OR a.cleared_at > h)
GROUP BY h
ORDER BY h;
