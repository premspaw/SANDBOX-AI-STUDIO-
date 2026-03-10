-- Transaction log (for history page)
CREATE TABLE IF NOT EXISTS shorts_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  amount int,        -- negative = spent, positive = earned/refund
  reason text,       -- 'image_gen', 'ugc_video', 'product_shoot', 'topup'
  created_at timestamp default now()
);
