-- Create a table to store deleted financial items for restoration
CREATE TABLE IF NOT EXISTS finance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  row_id UUID NOT NULL,
  row_data JSONB NOT NULL,
  action TEXT NOT NULL DEFAULT 'DELETE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Function to handle finance deletion audits
CREATE OR REPLACE FUNCTION audit_finance_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO finance_history (table_name, row_id, row_data, action, created_by)
  VALUES (
    TG_TABLE_NAME,
    OLD.id,
    to_jsonb(OLD),
    'DELETE',
    auth.uid()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to relevant finance tables
DROP TRIGGER IF EXISTS finance_payment_delete_trigger ON payments;
CREATE TRIGGER finance_payment_delete_trigger
BEFORE DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION audit_finance_deletion();

DROP TRIGGER IF EXISTS finance_refund_delete_trigger ON refunds;
CREATE TRIGGER finance_refund_delete_trigger
BEFORE DELETE ON refunds
FOR EACH ROW EXECUTE FUNCTION audit_finance_deletion();

DROP TRIGGER IF EXISTS finance_expense_delete_trigger ON expenses;
CREATE TRIGGER finance_expense_delete_trigger
BEFORE DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION audit_finance_deletion();

-- Enable RLS for the audit table
ALTER TABLE finance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view finance history" ON finance_history
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete from history" ON finance_history
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
