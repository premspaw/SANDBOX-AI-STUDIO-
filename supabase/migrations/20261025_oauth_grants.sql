BEGIN;
CREATE TABLE IF NOT EXISTS public.studio_oauth_grants(key text PRIMARY KEY,value jsonb NOT NULL,expires_at timestamptz NOT NULL);
ALTER TABLE public.studio_oauth_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.studio_oauth_grants FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.studio_oauth_grants TO service_role;
CREATE INDEX IF NOT EXISTS studio_oauth_expiration ON public.studio_oauth_grants(expires_at);
CREATE OR REPLACE FUNCTION public.studio_oauth_put(p_key text,p_value jsonb,p_expires timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF length(p_key)>200 OR octet_length(p_value::text)>16000 OR p_expires<=now() OR p_expires>now()+interval '31 days' THEN RAISE EXCEPTION 'Invalid grant'; END IF;
 PERFORM pg_advisory_xact_lock(20261025);
 DELETE FROM public.studio_oauth_grants WHERE expires_at<=now();
 IF (SELECT count(*) FROM public.studio_oauth_grants)>=10000 THEN RAISE EXCEPTION 'OAuth capacity reached'; END IF;
 INSERT INTO public.studio_oauth_grants VALUES(p_key,p_value,p_expires);
END $$;
CREATE OR REPLACE FUNCTION public.studio_oauth_get(p_key text,p_consume boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 IF p_consume THEN DELETE FROM public.studio_oauth_grants WHERE key=p_key AND expires_at>now() RETURNING value INTO result;
 ELSE SELECT value INTO result FROM public.studio_oauth_grants WHERE key=p_key AND expires_at>now(); END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.studio_oauth_put(text,jsonb,timestamptz),public.studio_oauth_get(text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.studio_oauth_put(text,jsonb,timestamptz),public.studio_oauth_get(text,boolean) TO service_role;
COMMIT;
