import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync,existsSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export function storage(root,dataDir){
 mkdirSync(dataDir,{recursive:true,mode:0o700});const db=new DatabaseSync(resolve(dataDir,'fitspace.sqlite'));
 db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS _migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL)');
 for(const name of readdirSync(resolve(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  const sql=readFileSync(resolve(root,'drizzle',name),'utf8'),hash=createHash('sha256').update(sql).digest('hex'),old=db.prepare('SELECT hash FROM _migrations WHERE name=?').get(name);if(old){if(old.hash!==hash)throw Error('Applied migration changed: '+name);continue;}
  db.exec('BEGIN');try{db.exec(sql);db.prepare('INSERT INTO _migrations VALUES(?,?)').run(name,hash);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e;}
 }
 class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args)}async all(){return {results:db.prepare(this.sql).all(...this.args)}}async first(){return db.prepare(this.sql).get(...this.args)||null}runSync(){const r=db.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}}async run(){return this.runSync()}}
 const DB={prepare:sql=>new Statement(sql),batch:async ops=>{db.exec('BEGIN IMMEDIATE');try{const r=ops.map(s=>s.runSync());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}};
 const objectPath=key=>{if(!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(key))throw Error('Invalid object key');return resolve(dataDir,'objects',key)};
 const BUCKET={put:async(key,bytes,options={})=>{const p=objectPath(key);mkdirSync(dirname(p),{recursive:true});const tmp=p+'.'+randomUUID();writeFileSync(tmp,Buffer.from(bytes));renameSync(tmp,p);writeFileSync(p+'.meta',JSON.stringify(options.httpMetadata||{}));},get:async key=>{const p=objectPath(key);if(!existsSync(p))return null;return {body:new Blob([readFileSync(p)]).stream(),httpMetadata:JSON.parse(readFileSync(p+'.meta','utf8'))}},delete:async key=>{const p=objectPath(key);rmSync(p,{force:true});rmSync(p+'.meta',{force:true})}};
 return {db,DB,BUCKET,close:()=>db.close()};
}
