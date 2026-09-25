import {DatabaseSync} from 'node:sqlite';
export class SQLiteStore {
 constructor(path=':memory:'){
  this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=10000;
  CREATE TABLE IF NOT EXISTS docs(collection TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(collection,id));
  CREATE INDEX IF NOT EXISTS student_search ON docs(collection,json_extract(data,'$.seccion'),json_extract(data,'$.nivel'),json_extract(data,'$.nombreNormalizado'));
  `);this.queue=Promise.resolve();
 }
 async get(c,id){const r=this.db.prepare('SELECT data FROM docs WHERE collection=? AND id=?').get(c,id);return r?JSON.parse(r.data):null;}
 set(c,id,value){this.db.prepare('INSERT INTO docs VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data').run(c,id,JSON.stringify(value));}
 delete(c,id){this.db.prepare('DELETE FROM docs WHERE collection=? AND id=?').run(c,id);}
 async list(c){return this.db.prepare('SELECT data FROM docs WHERE collection=? ORDER BY id').all(c).map(r=>JSON.parse(r.data));}
 async search(seccion,nivel,prefix){return this.db.prepare("SELECT data FROM docs WHERE collection='students' AND json_extract(data,'$.seccion')=? AND json_extract(data,'$.nivel')=? AND json_extract(data,'$.nombreNormalizado')>=? AND json_extract(data,'$.nombreNormalizado')<? ORDER BY json_extract(data,'$.nombreNormalizado') LIMIT 6").all(seccion,nivel,prefix,prefix+'\uffff').map(r=>JSON.parse(r.data));}
 async transaction(fn){const run=this.queue.then(async()=>{this.db.exec('BEGIN IMMEDIATE');try{const v=await fn(this);this.db.exec('COMMIT');return v;}catch(e){this.db.exec('ROLLBACK');throw e;}});this.queue=run.catch(()=>{});return run;}
 close(){this.db.close();}
}
