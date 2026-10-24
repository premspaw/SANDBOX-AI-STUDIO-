import {AsyncLocalStorage} from 'node:async_hooks';
import {createHash,randomUUID} from 'node:crypto';

const operations=new AsyncLocalStorage();
const failure=(message,status=503)=>Object.assign(new Error(message),{status});
const validAmount=n=>Number.isFinite(n)&&n>0&&n<=1000000;
export function getOperationUser(){return operations.getStore()?.user||null;}
export function bindOperationUser(user){const scope=operations.getStore();if(scope)scope.user=user;}
export function withBillingOperation(id,fn){return operations.run({id,receipts:new Map()},fn);}
export function billingRequestContext(req,res,next){
 const key=req.headers['idempotency-key'];
 if(key!==undefined&&(typeof key!=='string'||!/^[A-Za-z0-9._:-]{8,128}$/.test(key)))return res.status(400).json({error:'Invalid idempotency key'});
 return withBillingOperation(`${req.method}:${req.path}:${key||randomUUID()}`,next);
}
export function createBillingService(getClient){
 async function rpc(name,params){
  const client=typeof getClient==='function'?getClient():getClient;
  if(!client?.rpc)throw failure('Billing is unavailable. Configure the database and apply the billing migration.');
  const {data,error}=await client.rpc(name,params);
  if(error){
   if(error.code==='23505')throw failure('This operation was already charged. Check your previous result before retrying.',409);
   if(error.code==='P0001')throw failure('Insufficient credits for this operation.',402);
   if(error.code==='22023')throw failure('Invalid billing operation.',400);
   throw failure('Billing could not be completed. No new generation was started.');
  }
  return Array.isArray(data)?data[0]:data;
 }
 async function consumeCredits(userId,cost,reason='generation'){
  if(!userId)throw failure('Sign in required',401);
  if(!validAmount(cost)||typeof reason!=='string'||reason.length>120)throw failure('Invalid credit amount',400);
  const scope=operations.getStore();
  const label=`${userId}:${reason}:${cost}`;
  if(scope?.receipts.has(label))return scope.receipts.get(label);
  const operationId='charge:'+createHash('sha256').update(`${scope?.id||randomUUID()}:${userId}:${reason}`).digest('hex');
  const receipt=await rpc('studio_charge',{p_user_id:userId,p_operation_id:operationId,p_amount:cost,p_reason:reason});
  const result={...receipt,operationId,userId,amount:cost};
  scope?.receipts.set(label,result);
  return result;
 }
 async function refundCredits(userId,cost){
  if(!validAmount(cost))throw failure('Invalid refund amount',400);
  const receipt=[...(operations.getStore()?.receipts.values()||[])].find(r=>r.userId===userId&&r.amount===cost);
  if(!receipt)throw failure('A refund must reference a charge from this operation.',409);
  return rpc('studio_refund',{p_user_id:userId,p_operation_id:receipt.operationId});
 }
 async function refundFailedRequest(){
  for(const r of operations.getStore()?.receipts.values()||[])await rpc('studio_refund',{p_user_id:r.userId,p_operation_id:r.operationId});
 }
 async function preflight(userId,amount){
  if(!validAmount(amount))throw failure('Invalid credit amount',400);
  return rpc('studio_credit_balance',{p_user_id:userId,p_required:amount});
 }
 const adjustCredits=params=>rpc('studio_adjust_credit',params);
 const settlePayment=params=>rpc('studio_settle_payment',params);
 return {consumeCredits,claimOrCreateSpend:consumeCredits,refundCredits,refundFailedRequest,preflight,adjustCredits,settlePayment};
}
