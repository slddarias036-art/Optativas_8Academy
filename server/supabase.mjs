// Server-only adapter. The client must use a service-role key, never a public key.
// Reads collect versions; optativa_commit verifies them and applies all writes in
// one PostgreSQL transaction protected by a row lock shared across Edge instances.
export class SupabaseStore {
 constructor(client,{maxAttempts=50}={}){this.client=client;this.maxAttempts=maxAttempts;}
 async rpc(name,args){const {data,error}=await this.client.rpc(name,args);if(error)throw new Error('Database operation failed: '+error.code);return data;}
 async record(c,id){return this.rpc('optativa_get',{p_collection:c,p_id:id});}
 async get(c,id){return (await this.record(c,id))?.data??null;}
 async list(c){return (await this.rpc('optativa_list',{p_collection:c}))||[];}
 async search(seccion,nivel,prefix){return (await this.rpc('optativa_search',{p_section:seccion,p_level:nivel,p_prefix:prefix}))||[];}
 async transaction(fn){
  for(let attempt=0;attempt<this.maxAttempts;attempt++){
   const reads=new Map(),writes=new Map(),key=(c,id)=>c+'\0'+id;
   const result=await fn({
    get:async(c,id)=>{const k=key(c,id);if(!reads.has(k)){const record=await this.record(c,id);reads.set(k,{collection:c,id,version:record?.version??0,data:record?.data??null});}return structuredClone(reads.get(k).data);},
    set:(c,id,data)=>writes.set(key(c,id),{collection:c,id,data,delete:false}),
    delete:(c,id)=>writes.set(key(c,id),{collection:c,id,delete:true})
   });
   const committed=await this.rpc('optativa_commit',{p_reads:[...reads.values()].map(({data,...r})=>r),p_writes:[...writes.values()]});
   if(committed)return result;
   await new Promise(r=>setTimeout(r,Math.min(20+attempt*4,160)+Math.random()*40));
  }
  const e=new Error('Hay muchas solicitudes. Intenta confirmar de nuevo.');e.code='CONTENTION';throw e;
 }
}
