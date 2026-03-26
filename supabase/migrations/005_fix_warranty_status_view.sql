-- Fix broken warranty_status view and get_warranty_status function
-- The original view was recursively self-referencing and non-functional
-- The function now computes status inline without depending on the broken view

-- Fix the function to be self-contained
CREATE OR REPLACE FUNCTION get_warranty_status(p_warranty_id uuid, p_expiry_date date)
RETURNS TABLE(warranty_id uuid, status warranty_status_enum, days_left integer)
LANGUAGE plpgsql
AS \$\$
DECLARE
  v_status warranty_status_enum;
  v_days_left integer;
BEGIN
  IF p_expiry_date IS NULL THEN
    v_status := 'active';
    v_days_left := NULL;
  ELSE
    v_days_left := (CURRENT_DATE - p_expiry_date)::integer * -1;
    IF v_days_left < 0 THEN
      v_status := 'expired';
    ELSIF v_days_left <= 30 THEN
      v_status := 'expiring';
    ELSE
      v_status := 'active';
    END IF;
  END IF;

  RETURN QUERY SELECT p_warranty_id, v_status, v_days_left;
END;
\$\$;

-- Fix the warranty_status view (was recursively self-referencing)
CREATE OR REPLACE VIEW warranty_status AS
SELECT
  w.id as warranty_id,
  CASE
    WHEN w.expiry_date IS NULL THEN 'active'::warranty_status_enum
    WHEN (CURRENT_DATE - w.expiry_date::date) > 0 THEN 'expired'::warranty_status_enum
    WHEN (CURRENT_DATE - w.expiry_date::date) BETWEEN 0 AND 30 THEN 'expiring'::warranty_status_enum
    ELSE 'active'::warranty_status_enum
  END as status,
  (CURRENT_DATE - w.expiry_date::date) * -1 as days_left
FROM warranties w;
