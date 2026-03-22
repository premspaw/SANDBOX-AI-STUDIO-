-- AI Cinema Studio: Billing & Subscription History Setup
-- This table tracks actual payments and plan changes in real-time.

CREATE TABLE IF NOT EXISTS public.billing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    plan_name TEXT NOT NULL, -- 'Starter', 'Influencer', 'Director', 'Enterprise', 'Topup'
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'SUCCESS', -- 'SUCCESS', 'PENDING', 'FAILED'
    transaction_id TEXT, -- Razorpay Payment ID or Order ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- 1. Users can read their own billing history
CREATE POLICY "Users browse own billing history" 
ON public.billing_history FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Service role / Admin can insert/manage
-- Note: server.js uses supabaseAdmin (service_role) so it bypasses RLS if needed,
-- but we'll add a check for convenience.
CREATE POLICY "Admin/System Insert Access" 
ON public.billing_history FOR INSERT 
WITH CHECK (true);

-- 3. Update profiles table to include subscription metadata if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE;
