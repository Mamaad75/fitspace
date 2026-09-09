import {headers} from 'next/headers';
import {can,DomainError,entitlements,schemas,today,membershipStatus,type Role} from './domain';
import {database,rows,one,stmt,insert,uid} from './db';
export type Context={uid:string,email:string,tenant:any,access:any};
export async function identity(){const h=await headers();const uid=h.get('oai-authenticated-user-id'),email=h.get('oai-authenticated-user-email')?.toLowerCase();if(!uid||!email)throw new DomainError('لطفاً وارد حساب خود شوید.',401);return {uid,email,mode:h.get('x-fitspace-auth-mode')==='standalone'?'standalone':'sites'};}
export async function context(req:Request):Promise<Context>{const u=await identity(),tid=new URL(req.url).searchParams.get('tenant');if(!tid)throw new DomainError('باشگاه انتخاب نشده است.');const access=await one('SELECT * FROM access WHERE tenant_id=? AND email=?',[tid,u.email]);if(!access||access.role==='revoked')throw new DomainError('به این باشگاه دسترسی ندارید.',403);const tenant=await one('SELECT * FROM tenants WHERE id=?',[tid]);return {...u,tenant,access};}
export async function rateLimit(u:string){const bucket=Math.floor(Date.now()/60000);const r=await one('INSERT INTO rate_limits(id,user_id,bucket,count) VALUES(?,?,?,1) ON CONFLICT(user_id,bucket) DO UPDATE SET count=count+1 RETURNING count',[uid(),u,bucket]);if(r.count>100)throw new DomainError('تعداد درخواست زیاد است؛ یک دقیقه صبر کنید.',429);}
export function permit(c:Context,domain:string,write=false){if(!can(c.access.role as Role,domain,write))throw new DomainError('اجازه انجام این کار را ندارید.',403);if(['orders','products'].includes(domain)&&!entitlements(c.tenant).store)throw new DomainError('فروشگاه در پلن حرفه‌ای فعال است.',403);}
export async function member(c:Context,id:string){const m=await one('SELECT * FROM members WHERE tenant_id=? AND id=?',[c.tenant.id,id]);if(!m)throw new DomainError('عضو پیدا نشد.',404);if(c.access.role==='member'&&m.id!==c.access.member_id)throw new DomainError('دسترسی مجاز نیست.',403);if(c.access.role==='trainer'&&m.trainer_id!==c.access.id)throw new DomainError('این عضو به شما اختصاص داده نشده است.',403);if(c.access.branch_id&&c.access.branch_id!==m.branch_id)throw new DomainError('دسترسی این شعبه مجاز نیست.',403);return m;}
export async function scoped(c:Context,table:string,id:string){const r=await one(`SELECT * FROM ${table} WHERE tenant_id=? AND id=?`,[c.tenant.id,id]);if(!r)throw new DomainError('رکورد پیدا نشد.',404);return r;}
export function audit(c:Context,action:string,id:string){return insert('audit_logs',{id:uid(),tenant_id:c.tenant.id,actor:c.email,action,entity_id:id});}
export function notification(c:Context,member_id:string|null,title:string,body:string,dedupe?:string){return insert('notifications',{id:uid(),tenant_id:c.tenant.id,member_id,title,body,dedupe:dedupe||null},true);}
export async function bootstrap(){const u=await identity();const tenants=await rows("SELECT t.*,a.role,a.member_id FROM tenants t JOIN access a ON a.tenant_id=t.id WHERE a.email=? AND a.role<>'revoked' ORDER BY t.created_at",[u.email]);const admin=!!await one('SELECT id FROM platform_admins WHERE user_id=?',[u.uid]);return {user:u,tenants:tenants.map(t=>({...t,entitlements:entitlements(t)})),admin};}
export async function createTenant(req:Request){const u=await identity();await rateLimit(u.uid);const body:any=await req.json();const name=String(body.name||'').trim().slice(0,120);if(!name)throw new DomainError('نام باشگاه را وارد کنید.');const id=uid(),bid=uid();await database().batch([
 insert('tenants',{id,name,owner_id:u.uid,plan:'PRO',trial_until:new Date(Date.now()+14*86400000).toISOString(),timezone:'Asia/Tehran'}),
 insert('branches',{id:bid,tenant_id:id,name:'شعبه اصلی',address:''}),
 insert('access',{id:uid(),tenant_id:id,email:u.email,name:u.email,role:'owner'}),
 // Private first-owner installation bootstrap. The unique singleton prevents races.
 stmt("INSERT OR IGNORE INTO platform_admins(id,user_id,email) VALUES('installation-owner',?,?)",[u.uid,u.email]),
 ...['expiry','inactive','stock','program'].map(kind=>insert('automations',{id:uid(),tenant_id:id,name:kind,kind,enabled:1}))
 ]);return {id};}
const collections=['members','plans','memberships','access','branches','attendance','programs','exercises','measurements','products','orders','payments','notifications','workout_sessions','photos','crm_tasks','automations','audit_logs'];
export function collectionWhere(c:Context,table:string){
 if(!collections.includes(table))throw new DomainError('مسیر پیدا نشد.',404);permit(c,table);
 let filter='r.tenant_id=?',args:any[]=[c.tenant.id];
 const parts=['m.tenant_id=?'],values:any[]=[c.tenant.id];
 if(c.access.role==='member'){parts.push('m.id=?');values.push(c.access.member_id||'');}
 if(c.access.role==='trainer'){parts.push('m.trainer_id=?');values.push(c.access.id);}
 if(c.access.branch_id){parts.push('m.branch_id=?');values.push(c.access.branch_id);}
 if(parts.length>1){if(table==='members'){filter+=` AND r.id IN (SELECT m.id FROM members m WHERE ${parts.join(' AND ')})`;args.push(...values);}
 else if(['memberships','attendance','programs','measurements','orders','payments','workout_sessions','photos','crm_tasks'].includes(table)){filter+=` AND r.member_id IN (SELECT m.id FROM members m WHERE ${parts.join(' AND ')})`;args.push(...values);}}
 if(table==='notifications'){filter+=" AND ((r.member_id=? AND ? IS NOT NULL) OR (r.recipient_email=? AND r.member_id IS NULL) OR (r.member_id IS NULL AND r.recipient_email IS NULL AND ? IN ('owner','manager')))";args.push(c.access.member_id||null,c.access.member_id||null,c.email,c.access.role);}
 return {filter,args};
}
export async function listPage(c:Context,table:string,o:Record<string,string>={}){
 let {filter,args}=collectionWhere(c,table);const limit=Math.min(100,Math.max(1,Math.floor(Number(o.limit))||50));
 const linked=['memberships','attendance','programs','measurements','orders','payments','workout_sessions','photos','crm_tasks'].includes(table);
 if(o.member_id){await member(c,o.member_id);if(table==='members'){filter+=' AND r.id=?';args.push(o.member_id);}else if(linked){filter+=' AND r.member_id=?';args.push(o.member_id);}}
 if(o.branch&&o.branch!=='all'&&(table==='members'||linked)){filter+=table==='members'?' AND r.branch_id=?':' AND r.member_id IN (SELECT id FROM members WHERE tenant_id=? AND branch_id=?)';args.push(...(table==='members'?[o.branch]:[c.tenant.id,o.branch]));}
 if(o.kind&&['programs','payments'].includes(table)){filter+=' AND r.kind=?';args.push(o.kind);}
 const searchFields:Record<string,string[]>={members:['name','phone','email'],products:['name','sku','brand','category'],access:['name','email'],plans:['name'],branches:['name'],programs:['name'],exercises:['name','muscle'],payments:['reference'],notifications:['title','body'],crm_tasks:['title']};
 if(o.q){const like='%'+o.q.slice(0,150).replace(/[!%_]/g,'!$&')+'%';const terms=(searchFields[table]||[]).map(f=>`r.${f} LIKE ? ESCAPE '!'`);args.push(...terms.map(()=>like));if(linked){terms.push("EXISTS (SELECT 1 FROM members m WHERE m.tenant_id=r.tenant_id AND m.id=r.member_id AND (m.name LIKE ? ESCAPE '!' OR m.phone LIKE ? ESCAPE '!'))");args.push(like,like);}if(terms.length)filter+=' AND ('+terms.join(' OR ')+')';}
 const dateField=table==='attendance'?'day':['payments','measurements'].includes(table)?'date':'created_at';
 for(const [key,op] of [['from','>='],['to','<=']])if(o[key]){if(!/^\d{4}-\d{2}-\d{2}$/.test(o[key]))throw new DomainError('تاریخ معتبر نیست.');filter+=` AND substr(r.${dateField},1,10)${op}?`;args.push(o[key]);}
 const total=(await one(`SELECT COUNT(*) n FROM ${table} r WHERE ${filter}`,args)).n;
 if(o.cursor){let cursor;try{cursor=JSON.parse(atob(o.cursor));if(!Array.isArray(cursor)||cursor.length!==2||cursor.some(v=>typeof v!=='string'||v.length>100))throw Error();}catch{throw new DomainError('نشانگر صفحه معتبر نیست.');}filter+=' AND (r.created_at<? OR (r.created_at=? AND r.id<?))';args.push(cursor[0],cursor[0],cursor[1]);}
 let extra=linked?',(SELECT name FROM members m WHERE m.tenant_id=r.tenant_id AND m.id=r.member_id) member_name,(SELECT branch_id FROM members m WHERE m.tenant_id=r.tenant_id AND m.id=r.member_id) member_branch_id':'';
 if(table==='memberships'||table==='orders')extra+=`,r.${table==='orders'?'total':'price'}-COALESCE((SELECT SUM(amount) FROM payments p WHERE p.tenant_id=r.tenant_id AND p.${table==='orders'?'order_id':'membership_id'}=r.id AND p.status='CONFIRMED'),0) balance`;
 const result=await rows(`SELECT r.*${extra} FROM ${table} r WHERE ${filter} ORDER BY r.created_at DESC,r.id DESC LIMIT ?`,[...args,limit+1]);const more=result.length>limit;result.splice(limit);const last=result.at(-1);
 return {items:result.map(r=>table==='memberships'?{...r,status:membershipStatus(r,today(c.tenant.timezone))}:table==='programs'?{...r,content:JSON.parse(r.content)}:r),total,nextCursor:more&&last?btoa(JSON.stringify([last.created_at,last.id])):null};
}
export async function list(c:Context,table:string){return (await listPage(c,table,{limit:'100'})).items;}
export async function save(c:Context,table:string,body:any,id?:string){permit(c,table,true);const schema=schemas[table];if(!schema)throw new DomainError('عملیات پشتیبانی نمی‌شود.');const parsed=schema.safeParse(body);if(!parsed.success)throw new DomainError('مقادیر فرم معتبر نیست: '+parsed.error.issues.map(i=>i.path.join('.')+' '+i.message).join('، '));let data:any=parsed.data;
 if(id&&!['members','plans','products','programs','exercises','branches','access'].includes(table))throw new DomainError('ویرایش این رکورد مجاز نیست.');
 const old=id?await scoped(c,table,id):null;
 if(table==='access'&&old?.role==='owner')throw new DomainError('دسترسی مالک قابل تغییر نیست.',403);
 if(old?.member_id)await member(c,old.member_id);
 if(table==='products'&&old&&body.original_stock!==old.stock)throw new DomainError('موجودی تغییر کرده است؛ محصول را دوباره باز کنید.',409);
 if(data.member_id)await member(c,data.member_id);
 if(data.branch_id)await scoped(c,'branches',data.branch_id);
 if(data.trainer_id){const a=await scoped(c,'access',data.trainer_id);if(a.role!=='trainer')throw new DomainError('مربی معتبر انتخاب کنید.');}
 if(table==='branches'&&!entitlements(c.tenant).branches)throw new DomainError('چندشعبه‌ای در پلن سازمانی فعال است.',403);
 if(table==='members'){
  if(id)await member(c,id);
  if(c.access.branch_id&&c.access.branch_id!==data.branch_id)throw new DomainError('شعبه مجاز نیست.',403);
  if(!id){const count=await one('SELECT count(*) n FROM members WHERE tenant_id=?',[c.tenant.id]);if(count.n>=entitlements(c.tenant).memberLimit)throw new DomainError('ظرفیت اعضای پلن تکمیل است.',403);}
 }
 if(table==='access'&&data.role==='member'&&!data.member_id)throw new DomainError('عضو مرتبط را انتخاب کنید.');
 if(table==='access'&&data.role!=='member')data.member_id=null;
 if(table==='memberships'){const p=await scoped(c,'plans',data.plan_id);if(p.status!=='ACTIVE')throw new DomainError('این پلن غیرفعال است.');const previous=await one("SELECT id FROM memberships WHERE tenant_id=? AND member_id=? AND status NOT IN ('CANCELLED') AND end_date>=? AND start_date<=?",[c.tenant.id,data.member_id,data.start_date,new Date(Date.parse(data.start_date)+(p.duration-1)*86400000).toISOString().slice(0,10)]);if(previous)throw new DomainError('بازه این عضویت با عضویت قبلی هم‌پوشانی دارد.');data={...data,end_date:new Date(Date.parse(data.start_date)+(p.duration-1)*86400000).toISOString().slice(0,10),status:'ACTIVE',price:p.price};}
 if(table==='attendance'){const m=await member(c,data.member_id);if(m.status!=='ACTIVE')throw new DomainError('پروفایل عضو غیرفعال است.');const active=await one("SELECT id FROM memberships WHERE tenant_id=? AND member_id=? AND start_date<=? AND end_date>=? AND status='ACTIVE'",[c.tenant.id,m.id,today(c.tenant.timezone),today(c.tenant.timezone)]);if(!active)throw new DomainError('عضویت فعال برای ورود لازم است.');data={member_id:m.id,branch_id:m.branch_id,day:today(c.tenant.timezone),method:'RECEPTION'};}
 if(table==='programs'&&c.access.role==='trainer'&&!data.member_id)throw new DomainError('برای برنامه مربی، عضو اختصاص‌یافته را انتخاب کنید.');
 if(table==='programs'){if(c.access.role==='trainer'&&old&&old.trainer_id!==c.access.id)throw new DomainError('فقط برنامه‌های خودتان قابل ویرایش‌اند.',403);data={...data,trainer_id:old?.trainer_id||c.access.id,content:JSON.stringify(data.content)};}
 if(table==='workout_sessions'){const p=await scoped(c,'programs',data.program_id);if(p.member_id!==data.member_id||p.kind!=='workout')throw new DomainError('برنامه تمرینی معتبر نیست.');}
 if(table==='orders')return createOrder(c,data);
 if(table==='payments'){if(data.kind!=='ORDER')data.order_id='';if(data.kind!=='MEMBERSHIP')data.membership_id='';return recordPayment(c,data);}
 if(table==='notifications'&&c.access.role==='member')throw new DomainError('دسترسی مجاز نیست.',403);
 for(const field of ['member_id','branch_id','trainer_id'])if(data[field]==='')data[field]=null;
 id=id||uid();let operation;
 if(old){const fields=Object.keys(data);operation=stmt(`UPDATE ${table} SET ${fields.map(f=>f+'=?').join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=?`,[...fields.map(f=>data[f]??null),id,c.tenant.id]);if(table==='products')operation=stmt(`UPDATE products SET ${fields.map(f=>f+'=?').join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=? AND stock=?`,[...fields.map(f=>data[f]??null),id,c.tenant.id,body.original_stock]);}
 else if(table==='members'){const rec={id,tenant_id:c.tenant.id,...data};const keys=Object.keys(rec);operation=stmt(`INSERT INTO members (${keys.join(',')}) SELECT ${keys.map(()=>'?').join(',')} WHERE (SELECT COUNT(*) FROM members WHERE tenant_id=?) < ?`,[...keys.map(k=>rec[k]??null),c.tenant.id,entitlements(c.tenant).memberLimit]);}
 else operation=insert(table,{id,tenant_id:c.tenant.id,...data});
 const ops=[operation,audit(c,`${table}.${old?'updated':'created'}`,id)];
 if(['memberships','programs'].includes(table)&&data.member_id)ops.push(notification(c,data.member_id,table==='memberships'?'عضویت شما ثبت شد':'برنامه جدید شما آماده است',table==='memberships'?`اعتبار تا ${data.end_date}`:data.name));
 const results=await database().batch(ops);if(!results[0].meta.changes)throw new DomainError(old?'اطلاعات هم‌زمان تغییر کرده است؛ دوباره تلاش کنید.':'ظرفیت اعضای پلن تکمیل است.',409);return {id};
}
async function createOrder(c:Context,data:any){const existing=await one('SELECT id FROM orders WHERE tenant_id=? AND idempotency=?',[c.tenant.id,data.idempotency]);if(existing){await member(c,(await scoped(c,'orders',existing.id)).member_id);return existing;}
 const m=await member(c,data.member_id),id=uid();const grouped=new Map<string,number>();for(const i of data.items)grouped.set(i.product_id,(grouped.get(i.product_id)||0)+i.quantity);const items=[];let total=0;
 for(const [pid,quantity] of grouped){const p=await scoped(c,'products',pid);if(p.status!=='ACTIVE'||p.stock<quantity)throw new DomainError(`موجودی ${p.name} کافی نیست.`);items.push({...p,quantity});total+=p.price*quantity;}
 await database().batch([insert('orders',{id,tenant_id:c.tenant.id,member_id:m.id,branch_id:m.branch_id,total,status:'PENDING',idempotency:data.idempotency}),...items.flatMap(p=>[stmt('UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=?',[p.quantity,c.tenant.id,p.id]),insert('order_items',{id:uid(),tenant_id:c.tenant.id,order_id:id,product_id:p.id,name:p.name,quantity:p.quantity,price:p.price})]),audit(c,'orders.created',id),notification(c,m.id,'سفارش ثبت شد','برای پرداخت به پذیرش مراجعه کنید.')]);return {id};}
async function recordPayment(c:Context,data:any){const id=uid();const ops=[];let target:any;
 if(data.order_id){target=await scoped(c,'orders',data.order_id);if(target.member_id!==data.member_id||target.status==='CANCELLED')throw new DomainError('سفارش معتبر نیست.');}
 if(data.membership_id){if(data.order_id)throw new DomainError('فقط یک موضوع پرداخت انتخاب کنید.');target=await scoped(c,'memberships',data.membership_id);if(target.member_id!==data.member_id||target.status==='CANCELLED')throw new DomainError('عضویت معتبر نیست.');}
 if(data.kind==='ORDER'&&!data.order_id||data.kind==='MEMBERSHIP'&&!data.membership_id)throw new DomainError('موضوع پرداخت را انتخاب کنید.');
 // Conditional insertion protects outstanding balance against concurrent receipts.
 const field=data.order_id?'order_id':'membership_id',ref=data.order_id||data.membership_id;
 if(target)ops.push(stmt(`INSERT INTO payments(id,tenant_id,member_id,order_id,membership_id,amount,kind,reference,status,date) SELECT ?,?,?,?,?,?,?,?,'CONFIRMED',? WHERE ? <= ? - COALESCE((SELECT SUM(amount) FROM payments WHERE tenant_id=? AND ${field}=? AND status='CONFIRMED'),0)`,[id,c.tenant.id,data.member_id,data.order_id||null,data.membership_id||null,data.amount,data.kind,data.reference,data.date,data.amount,target.total??target.price,c.tenant.id,ref]));
 else ops.push(insert('payments',{id,tenant_id:c.tenant.id,...data,order_id:null,membership_id:null,status:'CONFIRMED'}));
 if(data.order_id)ops.push(stmt("UPDATE orders SET status='PAID',updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=? AND status='PENDING' AND total <= (SELECT COALESCE(SUM(amount),0) FROM payments WHERE tenant_id=? AND order_id=? AND status='CONFIRMED')",[c.tenant.id,data.order_id,c.tenant.id,data.order_id]));
 const result=await database().batch(ops);if(!result[0].meta.changes)throw new DomainError('مبلغ از مانده قابل پرداخت بیشتر است.');await database().batch([audit(c,'payments.created',id),notification(c,data.member_id,'پرداخت دریافت شد',`${data.amount.toLocaleString('fa-IR')} تومان — ${data.reference}`)]);return {id};}
export async function transition(c:Context,table:string,id:string,body:any){permit(c,table,true);const r=await scoped(c,table,id);if(r.member_id)await member(c,r.member_id);
 if(table==='access'&&body.revoke){if(r.role==='owner')throw new DomainError('دسترسی مالک قابل لغو نیست.',403);await database().batch([stmt("UPDATE access SET role='revoked',updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=?",[c.tenant.id,id]),audit(c,'access.revoked',id)]);return {id};}
 if(table==='notifications'){const visible=collectionWhere(c,'notifications');if(!await one(`SELECT r.id FROM notifications r WHERE ${visible.filter} AND r.id=?`,[...visible.args,id]))throw new DomainError('این اعلان متعلق به شما نیست.',403);await stmt('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=?',[c.tenant.id,id]).run();return {id};}
 if(table==='memberships'){if(!['ACTIVE','SUSPENDED','CANCELLED'].includes(body.status))throw new DomainError('وضعیت معتبر نیست.');await database().batch([stmt('UPDATE memberships SET status=?,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=?',[body.status,c.tenant.id,id]),audit(c,'memberships.'+body.status,id)]);return {id};}
 if(table==='orders'){
  if(c.access.role==='member')throw new DomainError('تغییر وضعیت فقط توسط پذیرش انجام می‌شود.',403);
  const allowed:Record<string,string[]>={PENDING:['CANCELLED'],PAID:['PROCESSING'],PROCESSING:['READY'],READY:['COMPLETED']};if(!allowed[r.status]?.includes(body.status))throw new DomainError('تغییر وضعیت مجاز نیست.');
  const ops=[stmt('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=? AND status=?',[body.status,c.tenant.id,id,r.status])];
  if(body.status==='CANCELLED'){const paid=await one('SELECT SUM(amount) n FROM payments WHERE tenant_id=? AND order_id=?',[c.tenant.id,id]);if(paid.n)throw new DomainError('این سفارش پرداخت دارد و نیاز به فرایند بازپرداخت دارد.');const items=await rows('SELECT * FROM order_items WHERE tenant_id=? AND order_id=?',[c.tenant.id,id]);for(const i of items)ops.unshift(stmt("UPDATE products SET stock=stock+? WHERE tenant_id=? AND id=? AND EXISTS (SELECT 1 FROM orders WHERE tenant_id=? AND id=? AND status='PENDING')",[i.quantity,c.tenant.id,i.product_id,c.tenant.id,id]));}
  ops.push(audit(c,'orders.'+body.status,id),notification(c,r.member_id,'وضعیت سفارش تغییر کرد',body.status));await database().batch(ops);return {id};
 }
 if(table==='crm_tasks'){if(!['OPEN','DONE'].includes(body.status))throw new DomainError('وضعیت معتبر نیست.');await stmt('UPDATE crm_tasks SET status=? WHERE tenant_id=? AND id=?',[body.status,c.tenant.id,id]).run();return {id};}
 if(table==='automations'){await stmt('UPDATE automations SET enabled=? WHERE tenant_id=? AND id=?',[body.enabled?1:0,c.tenant.id,id]).run();return {id};}
 throw new DomainError('عملیات مجاز نیست.');
}
export async function runAutomations(c:Context){permit(c,'automations',true);if(!entitlements(c.tenant).automation)throw new DomainError('اتوماسیون در پلن حرفه‌ای فعال است.',403);const enabled=(await rows('SELECT kind FROM automations WHERE tenant_id=? AND enabled=1',[c.tenant.id])).map(r=>r.kind),day=today(c.tenant.timezone),ops=[];
 if(enabled.includes('expiry')){const ms=await rows("SELECT * FROM memberships WHERE tenant_id=? AND status='ACTIVE' AND end_date<=date(?,'+7 days')",[c.tenant.id,day]);for(const m of ms){const left=Math.ceil((Date.parse(m.end_date)-Date.parse(day))/86400000);if([7,1,0].includes(left)||left<0)ops.push(notification(c,m.member_id,left<0?'عضویت شما منقضی شد':'یادآوری پایان عضویت',`پایان اعتبار: ${m.end_date}`,`expiry:${m.id}:${left<0?'expired':left}`));}}
 if(enabled.includes('inactive')){const ms=await rows("SELECT m.*,MAX(a.day) last_day FROM members m LEFT JOIN attendance a ON a.tenant_id=m.tenant_id AND a.member_id=m.id WHERE m.tenant_id=? AND m.status='ACTIVE' GROUP BY m.id HAVING COALESCE(MAX(a.day),substr(m.created_at,1,10))<=date(?,'-7 days')",[c.tenant.id,day]);for(const m of ms){const idle=Math.floor((Date.parse(day)-Date.parse(m.last_day||m.created_at.slice(0,10)))/86400000);if(idle>=14)ops.push(insert('crm_tasks',{id:uid(),tenant_id:c.tenant.id,member_id:m.id,title:`پیگیری ${m.name}؛ ${idle} روز عدم حضور`,status:'OPEN',dedupe:`inactive:${m.id}:${m.last_day||m.created_at}`},true));if(m.trainer_id){const t=await scoped(c,'access',m.trainer_id);ops.push(insert('notifications',{id:uid(),tenant_id:c.tenant.id,recipient_email:t.email,title:'پیگیری عضو غیرفعال',body:`${m.name}، ${idle} روز عدم حضور`,dedupe:`trainer:${m.id}:${m.last_day||m.created_at}`},true));}}}
 if(enabled.includes('stock'))for(const p of await rows("SELECT * FROM products WHERE tenant_id=? AND stock<=threshold AND status='ACTIVE'",[c.tenant.id]))ops.push(notification(c,null,'موجودی رو به اتمام',`${p.name}: ${p.stock} عدد`,`stock:${p.id}:${day}`));
 if(enabled.includes('program'))for(const p of await rows("SELECT * FROM programs WHERE tenant_id=? AND end_date<>'' AND end_date<=?",[c.tenant.id,day])){const t=await scoped(c,'access',p.trainer_id);ops.push(insert('notifications',{id:uid(),tenant_id:c.tenant.id,recipient_email:t.email,title:'برنامه نیاز به تمدید دارد',body:p.name,dedupe:`program:${p.id}:${p.end_date}`},true));}
 for(let i=0;i<ops.length;i+=50)await database().batch(ops.slice(i,i+50));await audit(c,'automations.run',day).run();return {processed:ops.length};}
