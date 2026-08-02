-- ============================================================================
-- Migration: PMS Phase 1 Fix — product_history delete handling
-- Purpose: The original Phase 1 trigger logged deletes in an AFTER DELETE
--          trigger, which failed because the product row no longer exists
--          when the FK-referencing history row is inserted. This fix:
--            1. Makes product_history.product_id nullable with ON DELETE SET
--               NULL so the audit trail survives product deletion.
--            2. Logs deletes in a BEFORE DELETE trigger (row still exists).
--            3. Keeps INSERT/UPDATE logging in the AFTER trigger.
-- ============================================================================

-- 1. Fix product_history FK: allow deletion to keep the audit trail
ALTER TABLE public.product_history ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.product_history DROP CONSTRAINT IF EXISTS product_history_product_id_fkey;
ALTER TABLE public.product_history
    ADD CONSTRAINT product_history_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- 2. Recreate the AFTER trigger to handle INSERT and UPDATE only
DROP TRIGGER IF EXISTS trg_product_history ON public.products;
CREATE TRIGGER trg_product_history
    AFTER INSERT OR UPDATE ON public.products
    FOR EACH ROW EXECUTE PROCEDURE public.pms_log_product_change();

-- 3. BEFORE DELETE trigger reuses the same function (DELETE branch inserts
--    with OLD.id while the product row still exists for FK validation)
CREATE TRIGGER trg_product_history_delete
    BEFORE DELETE ON public.products
    FOR EACH ROW EXECUTE PROCEDURE public.pms_log_product_change();

NOTIFY pgrst, 'reload schema';
