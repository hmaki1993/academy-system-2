-- Add Paymob tracking columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid',
ADD COLUMN IF NOT EXISTS gateway_order_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT;

-- Update existing records to 'paid' status
UPDATE payments SET status = 'paid' WHERE status IS NULL;
