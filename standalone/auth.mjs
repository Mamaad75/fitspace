import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback),hash=v=>createHash('sha256').update(v).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
async function derive(password,salt){return scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024})}
async function passwordHash(password){if(typeof password!=='string'||password.length<12||password.length>128)throw Error('رمز باید بین ۱۲ تا ۱۲۸ نویسه باشد.');const salt=randomBytes(24).toString('hex');return salt+':'+(await derive(password,salt)).toString('hex')}
async function matches(password,stored){const [salt,expected]=stored.split(':');const actual=await derive(password,salt);return timingSafeEqual(actual,Buffer.from(expected,'hex'))}
export function authStore(dataDir){
 mkdirSync(dataDir,{recursive:true,mode:0o700});const db=new DatabaseSync(resolve(dataDir,'accounts.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,is_owner INTEGER NOT NULL DEFAULT 0);
 CREATE UNIQUE INDEX IF NOT EXISTS single_owner ON accounts(is_owner) WHERE is_owner=1;
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS login_limits(key TEXT NOT NULL,bucket INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(key,bucket));`);
 const owner=()=>db.prepare('SELECT id,email,name FROM accounts WHERE is_owner=1').get();
 return {db,owner,
  create:async({email,name,password,isOwner=false})=>{email=String(email||'').trim().toLowerCase();name=String(name||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>120)throw Error('نام و ایمیل معتبر وارد کنید.');const id=randomUUID();db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?)').run(id,email,name,await passwordHash(password),isOwner?1:0);return {id,email,name};},
  login:async(email,password,ip)=>{email=String(email||'').trim().toLowerCase();if(typeof password!=='string'||password.length>128)return null;const bucket=Math.floor(Date.now()/900000);for(const [key,max] of [[hash('email:'+email),10],[hash('ip:'+ip),100]]){const r=db.prepare('INSERT INTO login_limits VALUES(?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET count=count+1 RETURNING count').get(key,bucket);if(r.count>max)throw Object.assign(Error('تلاش‌های ورود زیاد است؛ ۱۵ دقیقه بعد تلاش کنید.'),{status:429});}const a=db.prepare('SELECT * FROM accounts WHERE email=?').get(email);const dummy='0'.repeat(48)+':'+ '0'.repeat(128);if(!await matches(password,a?.password_hash||dummy)||!a)return null;const value=token();db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(value),a.id,token(),Date.now()+12*3600000);return value;},
  session:value=>value?db.prepare('SELECT a.id,a.email,a.name,a.is_owner,s.csrf FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(value),Date.now()):null,
  logout:value=>{if(value)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(value));},
  change:async(id,oldPassword,newPassword)=>{const a=db.prepare('SELECT * FROM accounts WHERE id=?').get(id);if(!a||String(oldPassword).length>128||!await matches(String(oldPassword),a.password_hash))throw Error('رمز فعلی نادرست است.');const encoded=await passwordHash(newPassword);db.exec('BEGIN');try{db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(encoded,id);db.prepare('DELETE FROM sessions WHERE account_id=?').run(id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e;}},
  reset:async(email,password)=>{const a=db.prepare('SELECT id FROM accounts WHERE email=?').get(email.toLowerCase());if(!a)throw Error('حساب پیدا نشد.');const encoded=await passwordHash(password);db.exec('BEGIN');try{db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(encoded,a.id);db.prepare('DELETE FROM sessions WHERE account_id=?').run(a.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e;}},
  cleanup:()=>{db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());db.prepare('DELETE FROM login_limits WHERE bucket<?').run(Math.floor(Date.now()/900000)-1)},close:()=>db.close()};
}
