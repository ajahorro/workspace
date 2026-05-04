-- ==========================================
-- ANALYTICS: LIVE REVENUE VIEW
-- Replace Materialized View with standard View for real-time accuracy
-- ==========================================

DROP MATERIALIZED VIEW IF EXISTS revenue_daily;

CREATE OR REPLACE VIEW revenue_daily AS
SELECT 
  date_trunc('day', created_at)::date as day,
  SUM(amount) as revenue,
  COUNT(id) as transaction_count
FROM payments_v2
WHERE status = 'PAID'
GROUP BY 1
ORDER BY 1 DESC;

GRANT SELECT ON revenue_daily TO authenticated;
GRANT SELECT ON revenue_daily TO service_role;
