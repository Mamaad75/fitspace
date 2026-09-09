import {collectionWhere,type Context} from './service';
import {rows,one} from './db';
import {today,DomainError,can} from './domain';
export async function report(c:Context,o:Record<string,string>={}){
 const day=today(c.tenant.timezone),to=o.to||day;
 if(!Number.isFinite(Date.parse(to)))throw new DomainError('تاریخ معتبر نیست.');
 const from=o.from||new Date(Date.parse(to)-13*86400000).toISOString().slice(0,10);
 const valid=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!valid(from)||!valid(to)||from>to||Date.parse(to)-Date.parse(from)>365*86400000)throw new DomainError('بازه گزارش باید معتبر و حداکثر ۳۶۶ روز باشد.');
 const scope=(table:string)=>{const s=collectionWhere(c,table);if(o.branch&&o.branch!=='all'){s.filter+=table==='members'?' AND r.branch_id=?':' AND r.member_id IN (SELECT id FROM members WHERE tenant_id=? AND branch_id=?)';s.args.push(...(table==='members'?[o.branch]:[c.tenant.id,o.branch]));}return s;};
 const count=async(table:string,expression:string,tail='',args:any[]=[])=>{if(!can(c.access.role,table))return 0;const s=scope(table);return (await one(`SELECT ${expression} n FROM ${table} r WHERE ${s.filter} ${tail}`,[...s.args,...args])).n;};
 const finance=can(c.access.role,'payments');
 const summary={members:await count('members','COUNT(*)'),active:await count('memberships','COUNT(DISTINCT member_id)',"AND status='ACTIVE' AND start_date<=? AND end_date>=?",[day,day]),expiring:await count('memberships','COUNT(*)',"AND status='ACTIVE' AND start_date<=? AND end_date BETWEEN ? AND date(?,'+7 days')",[day,day,day]),attendance:await count('attendance','COUNT(*)','AND day=?',[day]),revenue:finance?await count('payments','COALESCE(SUM(amount),0)',"AND status='CONFIRMED' AND date BETWEEN ? AND ?",[day.slice(0,7)+'-01',day]):0};
 const s=scope('attendance');const attendance=await rows(`SELECT day,COUNT(*) n FROM attendance r WHERE ${s.filter} AND day BETWEEN ? AND ? GROUP BY day`,[...s.args,from,to]);
 let payment:any[]=[];if(finance){const p=scope('payments');payment=await rows(`SELECT date day,SUM(amount) n FROM payments r WHERE ${p.filter} AND status='CONFIRMED' AND date BETWEEN ? AND ? GROUP BY date`,[...p.args,from,to]);}
 const daily=[];for(let d=Date.parse(from);d<=Date.parse(to);d+=86400000){const date=new Date(d).toISOString().slice(0,10);daily.push({date,attendance:attendance.find(r=>r.day===date)?.n||0,revenue:payment.find(r=>r.day===date)?.n||0});}
 return {from,to,summary,daily,finance,rangeRevenue:payment.reduce((s,r)=>s+r.n,0),rangeAttendance:attendance.reduce((s,r)=>s+r.n,0)};
}
