-- KPI · Active alarms (refId A): open alarms by severity at the end of the range
SELECT severity,
       count(*)                                   AS active,
       min(raised_at)                             AS oldest
FROM ops.alarm
WHERE raised_at <= $__timeTo()::timestamptz
  AND (cleared_at IS NULL OR cleared_at > $__timeTo()::timestamptz)
GROUP BY severity;
