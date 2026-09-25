export class FirestoreStore {
 constructor(db){this.db=db;}
 async get(c,id){const s=await this.db.collection(c).doc(id).get();return s.exists?s.data():null;}
 async list(c){return (await this.db.collection(c).get()).docs.map(d=>d.data());}
 async search(seccion,nivel,prefix){return (await this.db.collection('students').where('seccion','==',seccion).where('nivel','==',nivel).orderBy('nombreNormalizado').startAt(prefix).endAt(prefix+'\uf8ff').limit(6).get()).docs.map(d=>d.data());}
 async transaction(fn){return this.db.runTransaction(t=>fn({get:async(c,id)=>{const s=await t.get(this.db.collection(c).doc(id));return s.exists?s.data():null;},set:(c,id,v)=>t.set(this.db.collection(c).doc(id),v),delete:(c,id)=>t.delete(this.db.collection(c).doc(id))}),{maxAttempts:15});}
}
