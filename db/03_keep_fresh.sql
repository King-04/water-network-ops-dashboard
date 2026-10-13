-- =====================================================================
--  Keep the demo "live": slide every timestamp forward so the newest
--  reading is the current hour. The `refresher` service in
--  docker-compose.yml calls this every 15 minutes, so a demo stack that
--  has been running for weeks still shows the last 7 days.
-- =====================================================================
CREATE OR REPLACE FUNCTION ops.shift_to_now() RETURNS interval
LANGUAGE plpgsql AS $$
DECLARE
    d interval;
BEGIN
    -- whole hours only, and never past now()
    SELECT floor(extract(epoch FROM now() - max(ts)) / 3600) * interval '1 hour' INTO d FROM ops.reading;
    IF d IS NULL OR d < interval '1 hour' THEN
        RETURN interval '0';
    END IF;
    UPDATE ops.reading      SET ts = ts + d;
    UPDATE ops.alarm        SET raised_at = raised_at + d, cleared_at = cleared_at + d;
    -- billing closes at midnight: the newest billed day is the day before the newest reading
    UPDATE ops.billed_daily
       SET day = day + ((SELECT max(ts)::date FROM ops.reading) - 1 - (SELECT max(day) FROM ops.billed_daily));
    RETURN d;
END $$;
