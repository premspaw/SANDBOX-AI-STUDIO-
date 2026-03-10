-- Ensure profiles table has shorts_balance column
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE public.profiles (
      id uuid references auth.users on delete cascade primary key,
      shorts_balance int default 50,
      updated_at timestamp default now()
    );
    
    -- Enable RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Policies
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'shorts_balance') THEN
      ALTER TABLE public.profiles ADD COLUMN shorts_balance int default 50;
    END IF;
  END IF;
END $$;

-- Ensure shorts_transactions exists
CREATE TABLE IF NOT EXISTS public.shorts_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  amount int,        -- negative = spent, positive = earned/refund
  reason text,       -- 'image_gen', 'ugc_video', 'product_shoot', 'topup'
  created_at timestamp default now()
);

-- Enable RLS for transactions
ALTER TABLE public.shorts_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.shorts_transactions FOR SELECT USING (auth.uid() = user_id);
