import crypto from 'node:crypto';
import {isValidUuid} from '../utils/validateUuid.js';
// Exact INR prices supported by existing checkout links. Never infer a plan from a price range.
const plans=[
 {prices:[299,300,319,399],credits:400,tier:'STARTER',name:'Starter Fuel'},
 {prices:[999,1000],credits:1000,tier:null,name:'Creator Pro'},
 {prices:[1999,2499,2500],credits:2600,tier:'INFLUENCER',name:'Studio Master'},
 {prices:[3999,4999,5000],credits:5500,tier:'DIRECTOR',name:'Enterprise Bulk'},
 {prices:[7999,9999,10000],credits:11000,tier:'ENTERPRISE',name:'Agency Max'},
];
export function createPaymentWebhook({billing,secret=()=>process.env.RAZORPAY_WEBHOOK_SECRET}){
 return async(req,res)=>{
  const key=secret();if(!key)return res.status(503).json({error:'Payments are not configured'});
  const signature=req.headers['x-razorpay-signature'];
  if(!Buffer.isBuffer(req.body)||typeof signature!=='string'||!/^\w{64}$/.test(signature)||!/^[0-9a-f]+$/i.test(signature))return res.status(401).json({error:'Invalid signature'});
  const expected=crypto.createHmac('sha256',key).update(req.body).digest();
  if(!crypto.timingSafeEqual(Buffer.from(signature,'hex'),expected))return res.status(401).json({error:'Invalid signature'});
  let payload;try{payload=JSON.parse(req.body);}catch{return res.status(400).json({error:'Invalid payload'});}
  if(!['payment.captured','order.paid'].includes(payload.event))return res.json({received:true});
  const payment=payload.payload?.payment?.entity;
  const userId=payment?.notes?.client_id||payment?.notes?.user_id;
  if(!payment||!/^pay_[A-Za-z0-9]+$/.test(payment.id||'')||payment.currency!=='INR'||payment.status!=='captured'
    ||!Number.isSafeInteger(payment.amount)||!isValidUuid(userId))return res.status(422).json({error:'Payment needs reconciliation: invalid identity, currency or status'});
  const plan=plans.find(p=>p.prices.some(price=>price*100===payment.amount));
  if(!plan)return res.status(422).json({error:'Payment needs reconciliation: unsupported price'});
  try{
   const result=await billing.settlePayment({p_payment_id:payment.id,p_user_id:userId,p_amount:payment.amount/100,p_credits:plan.credits,p_plan:plan.name,p_tier:plan.tier});
   return res.json({success:true,duplicate:!!result?.duplicate});
  }catch{return res.status(503).json({error:'Payment settlement unavailable; retry this event'});}
 };
}
