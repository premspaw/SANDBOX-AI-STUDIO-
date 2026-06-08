-- Add missing profile columns required by Settings + auth bootstrap
alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text default '',
  add column if not exists marketing_emails boolean default true,
  add column if not exists security_alerts boolean default true,
  add column if not exists two_factor_enabled boolean default false,
  add column if not exists tier text default 'FREE',
  add column if not exists brand_voice jsonb default '{}'::jsonb,
  add column if not exists created_at timestamp with time zone default now();

update public.profiles
set
  full_name = coalesce(full_name, ''),
  marketing_emails = coalesce(marketing_emails, true),
  security_alerts = coalesce(security_alerts, true),
  two_factor_enabled = coalesce(two_factor_enabled, false),
  tier = coalesce(tier, 'FREE'),
  brand_voice = coalesce(brand_voice, '{}'::jsonb),
  updated_at = coalesce(updated_at, now())
where true;
