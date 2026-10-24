-- Apply in staging first. User provisioning must run via auth trigger or trusted server.
-- This migration cannot make existing public storage objects private.
begin;

create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
declare
  before_row jsonb;
  after_row jsonb;
  allowed text[] := array['full_name','display_name','avatar_url','website','bio',
    'marketing_emails','security_alerts','updated_at','brand_voice'];
  key text;
begin
  if current_user in ('anon','authenticated') then
    if TG_OP <> 'UPDATE' then
      raise exception 'Profile provisioning and deletion require the server' using errcode='42501';
    end if;
    if auth.uid() is null or NEW.id <> auth.uid() or OLD.id <> auth.uid() then
      raise exception 'Profile owner mismatch' using errcode='42501';
    end if;
    before_row := to_jsonb(OLD);
    after_row := to_jsonb(NEW);
    if (before_row - allowed) is distinct from (after_row - allowed) then
      raise exception 'Account privileges and billing fields are server-managed' using errcode='42501';
    end if;
    foreach key in array array['fractional_shorts','free_image_credits','free_video_credits','free_gpt_images_used','max_free_gpt_images'] loop
      if (before_row->'brand_voice'->key) is distinct from (after_row->'brand_voice'->key) then
        raise exception 'Credit fields are server-managed' using errcode='42501';
      end if;
    end loop;
  end if;
  if TG_OP='DELETE' then return OLD; end if;
  return NEW;
end;
$$;

do $$
declare t text;
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;
    drop trigger if exists guard_profile_privileges on public.profiles;
    create trigger guard_profile_privileges before insert or update or delete on public.profiles
      for each row execute function public.guard_profile_privileges();
    drop policy if exists profiles_owner_boundary on public.profiles;
    create policy profiles_owner_boundary on public.profiles as restrictive for all to authenticated
      using (id=auth.uid()) with check (id=auth.uid());
    revoke all on public.profiles from anon;
  end if;
  foreach t in array array['billing_history','shorts_transactions'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security',t);
      execute format('revoke insert,update,delete on public.%I from anon,authenticated',t);
      execute format('revoke all on public.%I from anon',t);
      execute format('drop policy if exists billing_owner_boundary on public.%I',t);
      execute format('create policy billing_owner_boundary on public.%I as restrictive for select to authenticated using (user_id=auth.uid())',t);
    end if;
  end loop;
  if to_regclass('public.assets') is not null then
    alter table public.assets enable row level security;
    revoke all on public.assets from anon;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='assets' and column_name='user_id') then
      drop policy if exists assets_owner_boundary on public.assets;
      create policy assets_owner_boundary on public.assets as restrictive for all to authenticated
        using (user_id=auth.uid()) with check (user_id=auth.uid());
    else
      -- Legacy schemas need an ownership backfill before browser access is enabled.
      revoke all on public.assets from authenticated;
    end if;
  end if;
  if to_regclass('public.camera_angles') is not null then
    revoke insert,update,delete on public.camera_angles from anon,authenticated;
  end if;
end;
$$;
commit;
