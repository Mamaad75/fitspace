import { z } from 'zod';
export type Role='owner'|'manager'|'trainer'|'staff'|'member';
export class DomainError extends Error { constructor(message:string, public status=400){super(message)} }
export const assert=(ok:unknown,message:string,status=400):asserts ok=>{if(!ok)throw new DomainError(message,status)};
export const today=(zone='Asia/Tehran')=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const daysLeft=(end:string,day=today())=>Math.ceil((Date.parse(end)-Date.parse(day))/86400000);
export const membershipStatus=(m:any,day=today())=> ['SUSPENDED','CANCELLED'].includes(m.status)?m.status:m.start_date>day?'UPCOMING':daysLeft(m.end_date,day)<0?'EXPIRED':daysLeft(m.end_date,day)<=7?'EXPIRING_SOON':'ACTIVE';
export const entitlements=(t:any)=>{const plan=t.plan==='PRO'&&t.trial_until&&t.trial_until<new Date().toISOString()?'STARTER':t.plan;return {plan,memberLimit:plan==='STARTER'?100:1000000,store:plan!=='STARTER',automation:plan!=='STARTER',branches:plan==='ENTERPRISE'};};
export const can=(role:Role,domain:string,write=false)=>{
 if(role==='owner')return true;
 if(!['manager','trainer','staff','member'].includes(role))return false;
 if(['access','branches','settings'].includes(domain))return false;
 if(role==='manager')return true;
 if(role==='staff')return ['dashboard','members','plans','memberships','attendance','products','orders','payments','notifications'].includes(domain);
 if(role==='trainer')return ['dashboard','members','attendance','programs','exercises','measurements','photos','workout_sessions','notifications'].includes(domain)&&(!write||!['members','attendance'].includes(domain));
 return ['dashboard','members','memberships','plans','attendance','programs','measurements','photos','products','orders','payments','notifications','workout_sessions'].includes(domain)&&(!write||['orders','measurements','photos','workout_sessions','notifications'].includes(domain));
};
const str=z.string().trim().max(1000),name=str.min(1).max(120), money=z.coerce.number().int().min(0).max(1000000000000), optional=z.preprocess(v=>v===null?undefined:v,str.optional().default(''));
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s,'تاریخ معتبر وارد کنید');
export const schemas:Record<string,z.ZodTypeAny>={
 members:z.object({name,phone:str.min(5).max(30),email:z.union([z.string().email(),z.literal('')]).default(''),branch_id:name,birth_date:optional,gender:optional,emergency:optional,height:z.coerce.number().min(0).max(260).optional(),goal:optional,level:optional,trainer_id:optional,notes:optional,status:z.enum(['ACTIVE','INACTIVE']).default('ACTIVE')}),
 plans:z.object({name,duration:z.coerce.number().int().min(1).max(3650),price:money,description:optional,features:optional,status:z.enum(['ACTIVE','INACTIVE']).default('ACTIVE')}),
 access:z.object({name,email:z.string().email().transform(s=>s.toLowerCase()),role:z.enum(['manager','trainer','staff','member']),branch_id:optional,member_id:optional}),
 branches:z.object({name,address:optional}),
 memberships:z.object({member_id:name,plan_id:name,start_date:date}),
 attendance:z.object({member_id:name}),
 exercises:z.object({name,muscle:optional,equipment:optional,video:z.union([z.string().url().refine(s=>/^https?:\/\//.test(s),'لینک باید http یا https باشد'),z.literal('')]).default('')}),
 programs:z.object({name,member_id:optional,kind:z.enum(['workout','nutrition']),end_date:z.union([date,z.literal('')]).default(''),content:z.array(z.object({day:name,items:z.array(z.object({name,sets:optional,reps:optional,weight:optional,rest:optional,tempo:optional,notes:optional,calories:z.coerce.number().min(0).max(10000).default(0),protein:z.coerce.number().min(0).max(1000).default(0),carbs:z.coerce.number().min(0).max(1000).default(0),fat:z.coerce.number().min(0).max(1000).default(0),time:optional})).min(1).max(40)})).min(1).max(14)}),
 measurements:z.object({member_id:name,date,weight:z.coerce.number().min(1).max(600),fat:z.coerce.number().min(0).max(100).optional(),chest:z.coerce.number().min(0).max(300).optional(),waist:z.coerce.number().min(0).max(300).optional(),arms:z.coerce.number().min(0).max(150).optional(),legs:z.coerce.number().min(0).max(200).optional(),shoulders:z.coerce.number().min(0).max(300).optional()}),
 products:z.object({name,sku:name,category:name,brand:optional,description:optional,price:money,stock:z.coerce.number().int().min(0).max(1000000),threshold:z.coerce.number().int().min(0).max(1000000).default(5),status:z.enum(['ACTIVE','INACTIVE']).default('ACTIVE')}),
 orders:z.object({member_id:name,idempotency:z.string().uuid(),items:z.array(z.object({product_id:name,quantity:z.coerce.number().int().min(1).max(100)})).min(1).max(30)}),
 payments:z.object({member_id:name,order_id:optional,membership_id:optional,amount:money.refine(v=>v>0),kind:z.enum(['MEMBERSHIP','ORDER','PT','OTHER']),reference:name,date}),
 workout_sessions:z.object({member_id:name,program_id:name,day:name,notes:optional}),
 notifications:z.object({member_id:optional,title:name,body:str.min(1)})
};
