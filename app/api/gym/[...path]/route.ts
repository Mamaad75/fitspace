import {classCalendar,classOptions,listClasses,createClass,bookClass,classRoster,cancelClass,cancelBooking,markClassAttendance} from '@/lib/gym/classes';
import {report} from '@/lib/gym/reporting';
import {env} from 'cloudflare:workers';
import {issueQr,consumeQr} from '@/lib/gym/attendance';
import {bootstrap,createTenant,context,identity,rateLimit,permit,member,scoped,list,listPage,save,transition,runAutomations,audit} from '@/lib/gym/service';
import {database,rows,one,stmt,insert,uid} from '@/lib/gym/db';
import {DomainError,can,entitlements} from '@/lib/gym/domain';
export const dynamic='force-dynamic';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function handle(req:Request){try{
 const path=new URL(req.url).pathname.split('/').filter(Boolean).slice(2),[resource,id]=path;
 if(req.method!=='GET'){
  const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)throw new DomainError('مبدأ درخواست معتبر نیست.',403);
  const u=await identity();await rateLimit(u.uid);
  if(Number(req.headers.get('content-length')||0)>6*1024*1024)throw new DomainError('حجم درخواست بیش از حد است.',413);
 }
 if(resource==='bootstrap'&&req.method==='GET')return json(await bootstrap());
 if(resource==='tenants'&&req.method==='POST')return json(await createTenant(req),201);
 if(resource==='platform'){
  const u=await identity();if(!await one('SELECT id FROM platform_admins WHERE user_id=?',[u.uid]))throw new DomainError('دسترسی مدیر سامانه لازم است.',403);
  if(req.method==='GET')return json({tenants:await rows('SELECT t.*, (SELECT COUNT(*) FROM members m WHERE m.tenant_id=t.id) members FROM tenants t ORDER BY created_at DESC LIMIT 500')});
  const b:any=await req.json();if(!['STARTER','PRO','ENTERPRISE'].includes(b.plan))throw new DomainError('پلن معتبر نیست.');await database().batch([stmt("UPDATE tenants SET plan=?,trial_until='',updated_at=CURRENT_TIMESTAMP WHERE id=?",[b.plan,b.id]),insert('audit_logs',{id:uid(),tenant_id:b.id,actor:u.email,action:'platform.plan_changed:'+b.plan,entity_id:b.id})]);return json({ok:true});
 }
 const c=await context(req);
 if(resource==='class-calendar'&&req.method==='GET')return json(await classCalendar(c,id));
 if(resource==='class-options'&&req.method==='GET')return json(await classOptions(c));
 if(resource==='classes'&&req.method==='GET')return json(await listClasses(c,Object.fromEntries(new URL(req.url).searchParams)));
 if(resource==='classes'&&req.method==='POST')return json(await createClass(c,await req.json()),201);
 if(resource==='class-roster'&&req.method==='GET')return json(await classRoster(c,id,Object.fromEntries(new URL(req.url).searchParams)));
 if(resource==='class-book'&&req.method==='POST')return json(await bookClass(c,id,await req.json()),201);
 if(resource==='class-cancel'&&req.method==='POST')return json(await cancelClass(c,id));
 if(resource==='booking-cancel'&&req.method==='POST')return json(await cancelBooking(c,id));
 if(resource==='class-attendance'&&req.method==='PATCH')return json(await markClassAttendance(c,id,await req.json()));

 if(resource==='page'&&req.method==='GET')return json(await listPage(c,id,Object.fromEntries(new URL(req.url).searchParams)));
 if(resource==='report'&&req.method==='GET')return json(await report(c,Object.fromEntries(new URL(req.url).searchParams)));
 if(resource==='state'&&req.method==='GET'){
  const result:any={tenant:{...c.tenant,entitlements:entitlements(c.tenant)},currentAccess:c.access};
  const tables=['members','plans','memberships','access','branches','attendance','programs','exercises','measurements','products','orders','payments','notifications','workout_sessions','photos','crm_tasks','automations','audit_logs'];
  await Promise.all(tables.map(async t=>{if(can(c.access.role,t)&&(!['products','orders'].includes(t)||entitlements(c.tenant).store))result[t]=await list(c,t);else result[t]=[];}));
  result.reporting=await report(c);result.summary=result.reporting.summary;
  return json(result);
 }
 if(resource==='qr-issue'&&req.method==='POST'){const b:any=await req.json();return json(await issueQr(c,String(b.member_id||c.access.member_id||'')));}
 if(resource==='qr-checkin'&&req.method==='POST'){const b:any=await req.json();return json(await consumeQr(c,String(b.token||'')));}
 if(resource==='automations-run'&&req.method==='POST')return json(await runAutomations(c));
 if(resource==='photos'&&req.method==='POST'){
  permit(c,'photos',true);const form=await req.formData(),mid=String(form.get('member_id')||'');await member(c,mid);const file=form.get('file');if(!(file instanceof File)||file.size>5*1024*1024||file.size<12)throw new DomainError('تصویر باید کمتر از ۵ مگابایت باشد.');
  const bytes=new Uint8Array(await file.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';if(!png&&!jpg&&!webp)throw new DomainError('فقط تصویر PNG، JPEG یا WebP پذیرفته می‌شود.');
  const pid=uid(),key=`${c.tenant.id}/${mid}/${pid}`,mime=png?'image/png':jpg?'image/jpeg':'image/webp';if(!env.BUCKET)throw new Error('Storage unavailable');await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
  try{await database().batch([insert('photos',{id:pid,tenant_id:c.tenant.id,member_id:mid,object_key:key,mime,caption:String(form.get('caption')||'').slice(0,200)}),audit(c,'photos.created',pid)]);}catch(e){await env.BUCKET.delete(key);throw e;}return json({id:pid},201);
 }
 if(resource==='photo'&&req.method==='GET'&&id){const p=await scoped(c,'photos',id);permit(c,'photos');await member(c,p.member_id);const obj=await env.BUCKET?.get(p.object_key);if(!obj)throw new DomainError('تصویر پیدا نشد.',404);return new Response(obj.body,{headers:{'Content-Type':p.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
 if(resource==='order-items'&&req.method==='GET'&&id){permit(c,'orders');const o=await scoped(c,'orders',id);await member(c,o.member_id);return json(await rows('SELECT * FROM order_items WHERE tenant_id=? AND order_id=?',[c.tenant.id,id]));}
 if(req.method==='GET')return json(await list(c,resource));
 const body:any=await req.json();if(req.method==='PATCH')return json(await transition(c,resource,id,body));
 if(req.method==='POST'||req.method==='PUT')return json(await save(c,resource,body,id),req.method==='POST'?201:200);
 throw new DomainError('مسیر پیدا نشد.',404);
 }catch(e){if(e instanceof DomainError)return json({error:e.message},e.status);if(e instanceof SyntaxError)return json({error:'ساختار درخواست معتبر نیست.'},400);const msg=e instanceof Error?e.message:'';const classErrors:Record<string,string>={class_time_conflict:'زمان کلاس با برنامه همین سالن یا مربی تداخل دارد.',class_booking_conflict:'عضو در این ساعت رزرو یا انتظار دیگری دارد.',class_capacity_full:'ظرفیت کلاس تکمیل شده است؛ اطلاعات را تازه کنید.',class_not_eligible:'رزرو نیازمند پروفایل فعال، عضویت معتبر در روز کلاس و کلاس آینده است.'};for(const [key,message] of Object.entries(classErrors))if(msg.includes(key))return json({error:message},409);if(['inactive_membership','membership_overlap','paid_order_cancellation','invalid_order_payment','invalid_membership_payment'].some(k=>msg.includes(k)))return json({error:'این عملیات با وضعیت فعلی عضویت یا پرداخت سازگار نیست؛ اطلاعات را تازه کنید.'},409);if(msg.includes('UNIQUE constraint'))return json({error:'این رکورد قبلاً ثبت شده است؛ شماره مرجع، کد کالا یا ورود امروز را بررسی کنید.'},409);if(msg.includes('CHECK constraint'))return json({error:'عملیات با موجودی یا اعتبار فعلی سازگار نیست؛ صفحه را تازه کنید.'},409);console.error('Gym API failure',e);return json({error:'ذخیره یا دریافت اطلاعات انجام نشد. دوباره تلاش کنید.'},500);}}
export const GET=handle,POST=handle,PUT=handle,PATCH=handle;
