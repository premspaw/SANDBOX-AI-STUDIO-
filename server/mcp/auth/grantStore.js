// PostgreSQL-backed single-use grants. The in-memory store is only for tests/development.
const local=new Map();let database=null;
export function configureOAuthStorage(client){database=client?.rpc?client:null;}
const check=()=>{if(!database&&process.env.NODE_ENV==='production')throw new Error('Persistent OAuth storage is not configured');};
export const grantStore={
 async put(kind,key,value){check();
  if(database){const {error}=await database.rpc('studio_oauth_put',{p_key:kind+':'+key,p_value:value,p_expires:new Date(value.expiresAt).toISOString()});if(error)throw new Error('OAuth storage unavailable');return;}
  for(const [k,v]of local)if(v.expiresAt<=Date.now())local.delete(k);
  if(local.size>=1000)throw new Error('OAuth capacity reached');local.set(kind+':'+key,value);
 },
 async get(kind,key){check();if(database){const {data,error}=await database.rpc('studio_oauth_get',{p_key:kind+':'+key,p_consume:false});if(error)throw new Error('OAuth storage unavailable');return data;}
  const v=local.get(kind+':'+key);return v?.expiresAt>Date.now()?v:null;
 },
 async consume(kind,key){check();if(database){const {data,error}=await database.rpc('studio_oauth_get',{p_key:kind+':'+key,p_consume:true});if(error)throw new Error('OAuth storage unavailable');return data;}
  const v=await this.get(kind,key);if(!local.delete(kind+':'+key))return null;return v;
 }
};
