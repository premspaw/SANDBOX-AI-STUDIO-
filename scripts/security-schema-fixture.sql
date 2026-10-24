-- Disposable CI database only; never run this fixture in a deployed database.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema public,auth to anon,authenticated,service_role;
create table public.profiles(id uuid primary key,role text default 'user',shorts_balance integer default 0,
 tier text default 'FREE',email text,full_name text,brand_voice jsonb default '{}');
create table public.assets(id uuid primary key,user_id uuid,name text);
create table public.billing_history(id uuid,user_id uuid,amount numeric);
create table public.shorts_transactions(id uuid,user_id uuid,amount numeric);
create table public.camera_angles(id text,label text);
grant all on all tables in schema public to anon,authenticated,service_role;
alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.billing_history enable row level security;
alter table public.shorts_transactions enable row level security;
create policy old_open_profiles on public.profiles for all using(true) with check(true);
create policy old_open_assets on public.assets for all using(true) with check(true);
create policy old_open_billing on public.billing_history for all using(true) with check(true);
create policy old_open_transactions on public.shorts_transactions for all using(true) with check(true);
insert into profiles(id,role,shorts_balance,brand_voice) values
 ('11111111-1111-1111-1111-111111111111','user',60,'{"fractional_shorts":0.5}'),
 ('22222222-2222-2222-2222-222222222222','admin',100,'{}');
insert into assets values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','own'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222','private');
