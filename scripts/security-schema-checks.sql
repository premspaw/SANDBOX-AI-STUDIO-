-- Run after the disposable fixture and security migration, with ON_ERROR_STOP.
set role authenticated;
set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111';
do $$ begin
 if (select count(*) from public.profiles)<>1 or (select count(*) from public.assets)<>1 then
   raise exception 'Cross-user rows were exposed';
 end if;
 begin
   update public.profiles set role='admin';
   raise exception 'Role escalation was accepted';
 exception when insufficient_privilege then null; end;
 begin
   update public.profiles set shorts_balance=999999;
   raise exception 'Credit injection was accepted';
 exception when insufficient_privilege then null; end;
 begin
   update public.profiles set brand_voice='{"fractional_shorts":100}';
   raise exception 'Nested credit injection was accepted';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.profiles(id) values('33333333-3333-3333-3333-333333333333');
   raise exception 'Client profile provisioning was accepted';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.billing_history(user_id,amount) values(auth.uid(),999);
   raise exception 'Forged billing event was accepted';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.camera_angles(id) values('injected');
   raise exception 'Client catalog mutation was accepted';
 exception when insufficient_privilege then null; end;
 update public.profiles set full_name='Allowed name',
   brand_voice=brand_voice||'{"brandColor":"#ffffff"}'::jsonb;
 if (select full_name from public.profiles)<>'Allowed name' then raise exception 'Valid settings edit failed'; end if;
end $$;
reset role;
set role anon;
do $$ begin
 begin
   perform * from public.profiles;
   raise exception 'Anonymous profiles read was accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
update public.profiles set shorts_balance=61 where id='11111111-1111-1111-1111-111111111111';
reset role;
do $$ begin
 if (select shorts_balance from public.profiles where id='11111111-1111-1111-1111-111111111111')<>61 then
   raise exception 'Trusted billing update failed';
 end if;
end $$;
