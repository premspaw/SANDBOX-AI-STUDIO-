import test from 'node:test';
import assert from 'node:assert/strict';
import { saveOwnedRecord } from '../utils/ownedRecord.js';
import { createWelcomeEmailHandler } from '../services/welcomeEmailHandler.js';
const owner = {id:'owner',email:'owner@example.invalid',email_confirmed_at:'2026-10-01',user_metadata:{name:'Owner'}};
function recordDb(existing, options={}) {
  const mutations=[]; const db={from(table){return {
    select(){return {eq(){return {maybeSingle:async()=>({data:existing,error:options.readError})};}};},
    insert(records){mutations.push({operation:'insert',table,records});return {select:async()=>({data:records})};},
    update(record){const filters=[];mutations.push({operation:'update',table,record,filters});const query={eq(k,v){filters.push([k,v]);return query;},is(k,v){filters.push([k,v]);return query;},select:async()=>({data:options.race?[]:[record]})};return query;}
  };}};return {db,mutations};
}
const denyAdmin=async()=>{throw Object.assign(new Error('Forbidden'),{status:403});};
for (const table of ['characters','storyboards']) {
  test(`${table}: guessed victim ID cannot be reclaimed by proposing own user_id`,async()=>{const {db,mutations}=recordDb({id:'victim-id',user_id:'victim'});await assert.rejects(saveOwnedRecord(db,table,{id:'victim-id',user_id:owner.id},owner,denyAdmin),{status:403});assert.deepEqual(mutations,[]);});
  test(`${table}: new IDs insert, own updates predicate existing owner, and races fail closed`,async()=>{
    const created=recordDb(null);await saveOwnedRecord(created.db,table,{id:'new-id'},owner,denyAdmin);assert.equal(created.mutations[0].operation,'insert');
    const changed=recordDb({id:'own-id',user_id:owner.id});await saveOwnedRecord(changed.db,table,{id:'own-id'},owner,denyAdmin);assert.deepEqual(changed.mutations[0].filters,[['id','own-id'],['user_id',owner.id]]);
    const raced=recordDb({id:'own-id',user_id:owner.id},{race:true});await assert.rejects(saveOwnedRecord(raced.db,table,{id:'own-id'},owner,denyAdmin),{status:409});
  });
}
test('record read failures never become inserts/upserts',async()=>{const {db,mutations}=recordDb(null,{readError:new Error('db unavailable')});await assert.rejects(saveOwnedRecord(db,'characters',{id:'id'},owner,denyAdmin));assert.equal(mutations.length,0);});
const response=()=>({statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}});
function welcome(options={}) {const sends=[];const handler=createWelcomeEmailHandler({requireAuth:options.requireAuth||(async()=>owner),db:{from(){return {select(){return {eq(){return {maybeSingle:async()=>({data:{shorts_balance:17}})};}};}};}},sendWelcomeEmail:async x=>{sends.push(x);return {success:true};}});return {handler,sends};}
test('anonymous and unverified requests cannot send welcome email',async()=>{for(const requireAuth of [async()=>{throw Object.assign(new Error('no auth'),{status:401});},async()=>({...owner,email_confirmed_at:null})]){const {handler,sends}=welcome({requireAuth});const res=response();await handler({body:{email:owner.email}},res);assert([401,403].includes(res.statusCode));assert.equal(sends.length,0);}});
test('welcome recipient, name and balance come only from authenticated account/server profile',async()=>{const {handler,sends}=welcome();let res=response();await handler({body:{email:'third-party@example.invalid'}},res);assert.equal(res.statusCode,403);assert.equal(sends.length,0);res=response();await handler({body:{email:owner.email,name:'Attacker',shortsBalance:999999}},res);assert.equal(res.statusCode,200);assert.deepEqual(sends,[{email:owner.email,name:'Owner',shortsBalance:17}]);});
test('repeated and concurrent welcome requests are coalesced per verified user',async()=>{const {handler,sends}=welcome();await Promise.all(Array.from({length:5},()=>handler({body:{}},response())));assert.equal(sends.length,1);});


test('phone/account confirmation does not substitute for verified email',async()=>{
  const {handler,sends}=welcome({requireAuth:async()=>({...owner,email_confirmed_at:null,confirmed_at:'2026-10-01',phone_confirmed_at:'2026-10-01'})});
  const res=response();await handler({body:{}},res);assert.equal(res.statusCode,403);assert.equal(sends.length,0);
});
