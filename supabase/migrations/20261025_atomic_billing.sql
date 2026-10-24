-- Apply after 20261024_security_boundaries.sql. All money-like changes happen under a profile row lock.
BEGIN;
ALTER TABLE public.shorts_transactions ALTER COLUMN amount TYPE numeric(18,4) USING amount::numeric;
CREATE TABLE IF NOT EXISTS public.studio_credit_operations (
 operation_id text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 amount numeric(18,4) NOT NULL,
 reason text NOT NULL,
 image_debit numeric(18,4) NOT NULL DEFAULT 0,
 video_debit numeric(18,4) NOT NULL DEFAULT 0,
 gpt_debit integer NOT NULL DEFAULT 0,
 refunded_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.studio_credit_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.studio_credit_operations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.studio_credit_operations TO service_role;
CREATE INDEX IF NOT EXISTS studio_credit_operations_owner ON public.studio_credit_operations(user_id,created_at);

CREATE OR REPLACE FUNCTION public.studio_credit_balance(p_user_id uuid,p_required numeric DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.profiles; balance numeric;
BEGIN
 SELECT * INTO STRICT p FROM public.profiles WHERE id=p_user_id;
 balance=coalesce(p.shorts_balance,0)+coalesce((p.brand_voice->>'fractional_shorts')::numeric,0);
 IF p_required IS NULL OR p_required<0 OR p_required>1000000 OR p_required='NaN'::numeric THEN RAISE EXCEPTION 'Invalid amount' USING ERRCODE='22023'; END IF;
 IF balance<p_required THEN RAISE EXCEPTION 'Insufficient credits' USING ERRCODE='P0001'; END IF;
 RETURN jsonb_build_object('balance',balance,'newBalance',balance);
END $$;

CREATE OR REPLACE FUNCTION public.studio_charge(p_user_id uuid,p_operation_id text,p_amount numeric,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.profiles; b jsonb; balance numeric; image_pool numeric; video_pool numeric; image_spend numeric=0; video_spend numeric=0; gpt_spend integer=0;
BEGIN
 IF p_amount IS NULL OR p_amount<=0 OR p_amount>1000000 OR p_amount='NaN'::numeric OR p_amount<>round(p_amount,4)
 OR length(p_operation_id) NOT BETWEEN 8 AND 160 OR length(p_reason) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid charge' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT p FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.studio_credit_operations WHERE operation_id=p_operation_id) THEN RAISE EXCEPTION 'Duplicate operation' USING ERRCODE='23505'; END IF;
 b=coalesce(p.brand_voice,'{}'::jsonb);
 balance=coalesce(p.shorts_balance,0)+coalesce((b->>'fractional_shorts')::numeric,0);
 IF balance<p_amount THEN RAISE EXCEPTION 'Insufficient credits' USING ERRCODE='P0001'; END IF;
 IF coalesce(lower(p.tier),'free')='free' AND coalesce(p.role,'user')<>'admin' THEN
  IF p_reason LIKE '%gpt%image%' THEN
   IF coalesce((b->>'free_gpt_images_used')::integer,0)>=2 THEN RAISE EXCEPTION 'GPT trial allowance exhausted' USING ERRCODE='P0001'; END IF;
   gpt_spend=1;b=jsonb_set(b,'{free_gpt_images_used}',to_jsonb(coalesce((b->>'free_gpt_images_used')::integer,0)+1));
  END IF;
  IF p_reason LIKE '%image%' THEN
   image_pool=coalesce((b->>'free_image_credits')::numeric,least(10,greatest(0,balance-50)));
   IF image_pool<p_amount THEN RAISE EXCEPTION 'Insufficient image credits' USING ERRCODE='P0001'; END IF;
   image_spend=p_amount;b=jsonb_set(b,'{free_image_credits}',to_jsonb(image_pool-p_amount));
  ELSIF p_reason LIKE '%video%' THEN
   video_pool=coalesce((b->>'free_video_credits')::numeric,least(50,balance));
   IF video_pool<p_amount THEN RAISE EXCEPTION 'Insufficient video credits' USING ERRCODE='P0001'; END IF;
   video_spend=p_amount;b=jsonb_set(b,'{free_video_credits}',to_jsonb(video_pool-p_amount));
  END IF;
 END IF;
 balance=balance-p_amount;b=jsonb_set(b,'{fractional_shorts}',to_jsonb(balance-floor(balance)));
 UPDATE public.profiles SET shorts_balance=floor(balance)::integer,brand_voice=b WHERE id=p_user_id;
 INSERT INTO public.studio_credit_operations(operation_id,user_id,amount,reason,image_debit,video_debit,gpt_debit) VALUES(p_operation_id,p_user_id,-p_amount,p_reason,image_spend,video_spend,gpt_spend);
 INSERT INTO public.shorts_transactions(user_id,amount,action_type,reason) VALUES(p_user_id,-p_amount,p_reason,p_operation_id);
 RETURN jsonb_build_object('newBalance',balance,'operationId',p_operation_id);
END $$;

CREATE OR REPLACE FUNCTION public.studio_refund(p_user_id uuid,p_operation_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.profiles; operation public.studio_credit_operations; b jsonb; balance numeric;
BEGIN
 SELECT * INTO STRICT p FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 SELECT * INTO STRICT operation FROM public.studio_credit_operations WHERE operation_id=p_operation_id AND user_id=p_user_id AND amount<0 FOR UPDATE;
 IF operation.refunded_at IS NOT NULL THEN RETURN jsonb_build_object('duplicate',true); END IF;
 b=coalesce(p.brand_voice,'{}'::jsonb);
 balance=coalesce(p.shorts_balance,0)+coalesce((b->>'fractional_shorts')::numeric,0)-operation.amount;
 b=jsonb_set(b,'{fractional_shorts}',to_jsonb(balance-floor(balance)));
 IF operation.image_debit>0 THEN b=jsonb_set(b,'{free_image_credits}',to_jsonb(coalesce((b->>'free_image_credits')::numeric,0)+operation.image_debit)); END IF;
 IF operation.video_debit>0 THEN b=jsonb_set(b,'{free_video_credits}',to_jsonb(coalesce((b->>'free_video_credits')::numeric,0)+operation.video_debit)); END IF;
 UPDATE public.profiles SET shorts_balance=floor(balance)::integer,brand_voice=b WHERE id=p_user_id;
 IF operation.gpt_debit>0 THEN
  UPDATE public.profiles SET brand_voice=jsonb_set(brand_voice,'{free_gpt_images_used}',to_jsonb(greatest(0,coalesce((brand_voice->>'free_gpt_images_used')::integer,0)-operation.gpt_debit))) WHERE id=p_user_id;
 END IF;
 UPDATE public.studio_credit_operations SET refunded_at=now() WHERE operation_id=p_operation_id;
 INSERT INTO public.shorts_transactions(user_id,amount,action_type,reason) VALUES(p_user_id,-operation.amount,'server_refund',p_operation_id);
 RETURN jsonb_build_object('newBalance',balance);
END $$;

CREATE OR REPLACE FUNCTION public.studio_adjust_credit(p_user_id uuid,p_operation_id text,p_amount numeric,p_reason text,p_exact_balance numeric DEFAULT NULL,p_tier text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p public.profiles; operation public.studio_credit_operations; b jsonb; balance numeric; delta numeric;
BEGIN
 IF p_amount IS NULL OR abs(p_amount)>1000000 OR p_amount='NaN'::numeric OR (p_exact_balance IS NOT NULL AND (p_exact_balance<0 OR p_exact_balance>1000000 OR p_exact_balance='NaN'::numeric))
 OR length(p_operation_id) NOT BETWEEN 8 AND 160 OR length(p_reason) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid adjustment' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT p FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 SELECT * INTO operation FROM public.studio_credit_operations WHERE operation_id=p_operation_id;
 IF FOUND THEN
  IF operation.user_id<>p_user_id THEN RAISE EXCEPTION 'Operation owner mismatch' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('duplicate',true);
 END IF;
 b=coalesce(p.brand_voice,'{}'::jsonb);balance=coalesce(p.shorts_balance,0)+coalesce((b->>'fractional_shorts')::numeric,0);
 delta=round(coalesce(p_exact_balance-balance,p_amount),4);balance=balance+delta;
 IF balance<0 OR balance>2000000000 THEN RAISE EXCEPTION 'Insufficient credits' USING ERRCODE='P0001'; END IF;
 b=jsonb_set(b,'{fractional_shorts}',to_jsonb(balance-floor(balance)));
 UPDATE public.profiles SET shorts_balance=floor(balance)::integer,brand_voice=b,tier=coalesce(p_tier,tier) WHERE id=p_user_id;
 INSERT INTO public.studio_credit_operations(operation_id,user_id,amount,reason) VALUES(p_operation_id,p_user_id,delta,p_reason);
 INSERT INTO public.shorts_transactions(user_id,amount,action_type,reason) VALUES(p_user_id,delta,'server_adjustment',p_reason);
 RETURN jsonb_build_object('newBalance',balance);
END $$;

CREATE OR REPLACE FUNCTION public.studio_settle_payment(p_payment_id text,p_user_id uuid,p_amount numeric,p_credits numeric,p_plan text,p_tier text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb;
BEGIN
 -- Serialize against legacy webhook history as well as the new operation ledger.
 PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.billing_history WHERE transaction_id=p_payment_id) THEN RETURN jsonb_build_object('duplicate',true); END IF;
 result=public.studio_adjust_credit(p_user_id,'payment:'||p_payment_id,p_credits,'Payment: '||p_plan,NULL,p_tier);
 IF coalesce((result->>'duplicate')::boolean,false) THEN RETURN result; END IF;
 INSERT INTO public.billing_history(user_id,plan_name,amount,status,transaction_id) VALUES(p_user_id,p_plan,p_amount,'SUCCESS',p_payment_id);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.studio_credit_balance(uuid,numeric),public.studio_charge(uuid,text,numeric,text),public.studio_refund(uuid,text),public.studio_adjust_credit(uuid,text,numeric,text,numeric,text),public.studio_settle_payment(text,uuid,numeric,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.studio_credit_balance(uuid,numeric),public.studio_charge(uuid,text,numeric,text),public.studio_refund(uuid,text),public.studio_adjust_credit(uuid,text,numeric,text,numeric,text),public.studio_settle_payment(text,uuid,numeric,numeric,text,text) TO service_role;
COMMIT;
