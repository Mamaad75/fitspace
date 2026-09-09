import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export async function rows(sql:string,args:any[]=[]){return (await database().prepare(sql).bind(...args).all()).results as any[];}
export async function one(sql:string,args:any[]=[]){return database().prepare(sql).bind(...args).first() as Promise<any>;}
export function stmt(sql:string,args:any[]=[]){return database().prepare(sql).bind(...args);}
export function insert(table:string,record:Record<string,any>,ignore=false){const keys=Object.keys(record);return stmt(`INSERT ${ignore?'OR IGNORE ':''}INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,keys.map(k=>record[k]??null));}
export const uid=()=>crypto.randomUUID();
