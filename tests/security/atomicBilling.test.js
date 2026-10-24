import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createBillingService,withBillingOperation} from '../../server/billing/ledger.js';
const alice='11111111-1111-1111-1111-111111111111';
let db;
before(async()=>{
 db=new PGlite();
 await db.exec(await fs.readFile('scripts/security-schema-fixture.sql','utf8'));
 await db.exec(`ALTER TABLE shorts_transactions ADD COLUMN action_type text, ADD COLUMN reason text, ADD COLUMN created_at timestamptz DEFAULT now(); ALTER TABLE billing_history ADD COLUMN plan_name text,ADD COLUMN status text,ADD COLUMN transaction_id text;`);
 for(const f of ['20261024_security_boundaries.sql','20261025_atomic_billing.sql','20261025_oauth_grants.sql'])await db.exec(await fs.readFile('supabase/migrations/'+f,'utf8'));
});
after(()=>db?.close());
const q=async(sql,params)=>(await db.query(sql,params)).rows;
test('Concurrent attempts cannot debit the same operation twice; fractional refunds replay safely',async()=>{
 const results=await Promise.allSettled([1,2].map(()=>q('select studio_charge($1,$2,$3,$4)',[alice,'charge:duplicate',1.5,'image_generation'])));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 let p=(await q('select shorts_balance,brand_voice from profiles where id=$1',[alice]))[0];assert.equal(p.shorts_balance,59);assert.equal(p.brand_voice.fractional_shorts,0);
 await q('select studio_refund($1,$2)',[alice,'charge:duplicate']);await q('select studio_refund($1,$2)',[alice,'charge:duplicate']);
 p=(await q('select shorts_balance,brand_voice from profiles where id=$1',[alice]))[0];assert.equal(p.shorts_balance,60);assert.equal(p.brand_voice.fractional_shorts,.5);
 assert.equal((await q("select count(*)::int n from shorts_transactions where action_type='server_refund'"))[0].n,1);
});
test('No audit record means no debit; invalid/refunded/foreign charges cannot mint credits',async()=>{
 await db.exec(`CREATE FUNCTION fail_audit_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_type='reject-audit' THEN RAISE EXCEPTION 'fixture rollback'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_audit_fixture BEFORE INSERT ON shorts_transactions FOR EACH ROW EXECUTE FUNCTION fail_audit_fixture();`);
 await assert.rejects(()=>q('select studio_charge($1,$2,$3,$4)',[alice,'charge:rollback',1,'reject-audit']));
 assert.equal((await q("select count(*)::int n from studio_credit_operations where operation_id='charge:rollback'"))[0].n,0);
 await assert.rejects(()=>q('select studio_refund($1,$2)',['22222222-2222-2222-2222-222222222222','charge:duplicate']));
 await assert.rejects(()=>q('select studio_charge($1,$2,$3,$4)',[alice,'charge:negative',-10,'video_generation']));
});
test('Payment replay credits once and API clients cannot invoke billing RPCs',async()=>{
 const params=['pay_fixture',alice,999,1000,'Creator Pro','PRO'];
 await q('select studio_settle_payment($1,$2,$3,$4,$5,$6)',params);await q('select studio_settle_payment($1,$2,$3,$4,$5,$6)',params);
 assert.equal((await q('select shorts_balance from profiles where id=$1',[alice]))[0].shorts_balance,1060);
 await db.exec('SET ROLE authenticated');
 try{await assert.rejects(()=>q('select studio_adjust_credit($1,$2,$3,$4)',[alice,'forged:grant',999,'forged']));}finally{await db.exec('RESET ROLE');}
});
test('Persistent OAuth grants consume once, survive new clients and cannot be read by browsers',async()=>{
 await q('select studio_oauth_put($1,$2,$3)',['code:fixture',{client:'fixture'},new Date(Date.now()+60000).toISOString()]);
 const values=await Promise.all([q('select studio_oauth_get($1,true) v',['code:fixture']),q('select studio_oauth_get($1,true) v',['code:fixture'])]);
 assert.equal(values.filter(v=>v[0].v!==null).length,1);
 await db.exec('SET ROLE authenticated');try{await assert.rejects(()=>q('select * from studio_oauth_grants'));}finally{await db.exec('RESET ROLE');}
});
test('Service refunds require the current verified debit, ignoring caller-supplied credit amounts',async()=>{
 const calls=[];const billing=createBillingService({rpc:async(name,args)=>{calls.push({name,args});return {data:{newBalance:9},error:null};}});
 await withBillingOperation('fixture-operation',async()=>{
  await assert.rejects(()=>billing.refundCredits(alice,999),/reference a charge/);
  await billing.consumeCredits(alice,1.5,'image_generation');await billing.consumeCredits(alice,1.5,'image_generation');
  await assert.rejects(()=>billing.refundCredits(alice,1),/reference a charge/);
  await billing.refundCredits(alice,1.5);
 });
 assert.equal(calls.filter(c=>c.name==='studio_charge').length,1);assert.equal(calls.filter(c=>c.name==='studio_refund').length,1);
 assert.ok(!('p_amount' in calls[1].args));
});
