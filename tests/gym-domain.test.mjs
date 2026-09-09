import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const dir=new URL('../.gym-test/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const name of ['domain','db','service','attendance','reporting']){
 let src=readFileSync(new URL(`../lib/gym/${name}.ts`,import.meta.url),'utf8');
 src=src.replace("import { env } from 'cloudflare:workers';","const env=globalThis.__gymEnv;").replace("import {headers} from 'next/headers';","const headers=async()=>globalThis.__gymHeaders;").replaceAll("from './domain'","from './domain.mjs'").replaceAll("from './db'","from './db.mjs'").replaceAll("from './service'","from './service.mjs'");
 writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
}
let routeSrc=readFileSync(new URL('../app/api/gym/[...path]/route.ts',import.meta.url),'utf8').replace("import {env} from 'cloudflare:workers';","const env=globalThis.__gymEnv;").replace(/from '@\/lib\/gym\/(\w+)'/g,"from './$1.mjs'");writeFileSync(new URL('route.mjs',dir),ts.transpileModule(routeSrc,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
class Statement{constructor(query,args=[]){this.query=query;this.args=args}bind(...args){return new Statement(this.query,args)}async all(){return {results:sql.prepare(this.query).all(...this.args)}}async first(){return sql.prepare(this.query).get(...this.args)||null}async run(){const r=sql.prepare(this.query).run(...this.args);return {meta:{changes:Number(r.changes)}}}}
globalThis.__gymEnv={DB:{prepare:q=>new Statement(q),batch:async ops=>{sql.exec('BEGIN');try{const results=[];for(const op of ops)results.push(await op.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}}};
globalThis.__gymHeaders=new Headers({'oai-authenticated-user-id':'owner-1','oai-authenticated-user-email':'owner@example.com'});
const svc=await import(new URL('service.mjs',dir)),domain=await import(new URL('domain.mjs',dir));
let a,b,branchA,branchB,memberA,memberB,planA,owner,memberCtx,trainer;
function count(table){return sql.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n}
test('Create independent tenants; stable owner identity and server authorization',async()=>{
 a=(await svc.createTenant(new Request('https://gym.test',{method:'POST',body:JSON.stringify({name:'Alpha'})}))).id;
 b=(await svc.createTenant(new Request('https://gym.test',{method:'POST',body:JSON.stringify({name:'Beta'})}))).id;
 owner=await svc.context(new Request('https://gym.test?tenant='+a));
 branchA=sql.prepare('SELECT id FROM branches WHERE tenant_id=?').get(a).id;branchB=sql.prepare('SELECT id FROM branches WHERE tenant_id=?').get(b).id;
 assert.equal(count('platform_admins'),1);assert.equal(count('tenants'),2);
 memberA=(await svc.save(owner,'members',{name:'Member A',phone:'123456789',branch_id:branchA})).id;
 const cb=await svc.context(new Request('https://gym.test?tenant='+b));memberB=(await svc.save(cb,'members',{name:'Member B',phone:'987654321',branch_id:branchB})).id;
 await assert.rejects(()=>svc.save(owner,'members',{name:'Wrong branch',phone:'12345',branch_id:branchB}),/پیدا نشد/);
 await assert.rejects(()=>svc.member(owner,memberB),/پیدا نشد/);
 assert.equal((await svc.list(owner,'members')).length,1);
 globalThis.__gymHeaders=new Headers({'oai-authenticated-user-id':'stranger','oai-authenticated-user-email':'stranger@example.com'});
 await assert.rejects(()=>svc.context(new Request('https://gym.test?tenant='+a)),e=>e.status===403);
 globalThis.__gymHeaders=new Headers();await assert.rejects(()=>svc.identity(),e=>e.status===401);
});
test('Member and trainer cannot read or change other members',async()=>{
 memberCtx={...owner,email:'member@example.com',access:{role:'member',member_id:memberA}};
 assert.equal((await svc.list(memberCtx,'members')).length,1);
 await assert.rejects(()=>svc.save(memberCtx,'payments',{}),e=>e.status===403);
 await assert.rejects(()=>svc.save(memberCtx,'members',{}),e=>e.status===403);
 const trId=(await svc.save(owner,'access',{name:'Coach',email:'coach@example.com',role:'trainer'})).id;
 trainer={...owner,email:'coach@example.com',access:{role:'trainer',id:trId}};
 assert.equal((await svc.list(trainer,'members')).length,0);
 await assert.rejects(()=>svc.member(trainer,memberA),e=>e.status===403);
 sql.prepare('UPDATE members SET trainer_id=? WHERE id=?').run(trId,memberA);
 assert.equal((await svc.list(trainer,'members')).length,1);
});
test('Membership dates, overlap prevention, active attendance and daily deduplication',async()=>{
 planA=(await svc.save(owner,'plans',{name:'Monthly',duration:30,price:300})).id;
 await assert.rejects(()=>svc.save(owner,'attendance',{member_id:memberA}),/فعال/);
 const m=(await svc.save(owner,'memberships',{member_id:memberA,plan_id:planA,start_date:domain.today()}));
 const row=sql.prepare('SELECT * FROM memberships WHERE id=?').get(m.id);
 assert.equal(domain.daysLeft(row.end_date,row.start_date),29);
 await assert.rejects(()=>svc.save(owner,'memberships',{member_id:memberA,plan_id:planA,start_date:domain.today()}),/هم‌پوشانی/);
 await svc.save(owner,'attendance',{member_id:memberA});await assert.rejects(()=>svc.save(owner,'attendance',{member_id:memberA}),/UNIQUE/);
 await svc.transition(owner,'memberships',m.id,{status:'SUSPENDED'});
 await assert.rejects(()=>svc.save(owner,'attendance',{member_id:memberA}),/فعال/);
 assert.equal(domain.membershipStatus({start_date:'2026-01-01',end_date:'2026-01-01',status:'ACTIVE'},'2026-01-01'),'EXPIRING_SOON');
 assert.equal(domain.membershipStatus({start_date:'2026-01-01',end_date:'2026-01-01',status:'ACTIVE'},'2026-01-02'),'EXPIRED');
});
test('Orders use trusted prices, reserve inventory, reject oversell and deduplicate retries',async()=>{
 const p=(await svc.save(owner,'products',{name:'Protein',sku:'P-1',category:'Supplements',price:100,stock:3})).id;
 const payload={member_id:memberA,idempotency:crypto.randomUUID(),items:[{product_id:p,quantity:2,price:1}]};
 const order=await svc.save(memberCtx,'orders',payload);
 assert.equal(sql.prepare('SELECT total FROM orders WHERE id=?').get(order.id).total,200);
 assert.equal(sql.prepare('SELECT stock FROM products WHERE id=?').get(p).stock,1);
 assert.equal((await svc.save(memberCtx,'orders',payload)).id,order.id);
 await assert.rejects(()=>svc.save(memberCtx,'orders',{...payload,idempotency:crypto.randomUUID()}),/کافی نیست/);
 await assert.rejects(()=>svc.transition(memberCtx,'orders',order.id,{status:'COMPLETED'}),e=>e.status===403);
 await svc.transition(owner,'orders',order.id,{status:'CANCELLED'});
 assert.equal(sql.prepare('SELECT stock FROM products WHERE id=?').get(p).stock,3);
 await assert.rejects(()=>svc.transition(owner,'orders',order.id,{status:'CANCELLED'}));
 assert.equal(sql.prepare('SELECT stock FROM products WHERE id=?').get(p).stock,3);
});
test('Partial payments, overpayment protection, order transitions and references',async()=>{
 const p=sql.prepare('SELECT id FROM products WHERE tenant_id=?').get(a).id;
 const order=await svc.save(owner,'orders',{member_id:memberA,idempotency:crypto.randomUUID(),items:[{product_id:p,quantity:1}]});
 const payment={member_id:memberA,order_id:order.id,kind:'ORDER',reference:'r1',date:domain.today(),amount:60};
 await svc.save(owner,'payments',payment);
 assert.equal(sql.prepare('SELECT status FROM orders WHERE id=?').get(order.id).status,'PENDING');
 await assert.rejects(()=>svc.save(owner,'payments',{...payment,reference:'r2',amount:50}),/بیشتر/);
 await assert.rejects(()=>svc.transition(owner,'orders',order.id,{status:'CANCELLED'}),/بازپرداخت/);
 await svc.save(owner,'payments',{...payment,reference:'r2',amount:40});
 assert.equal(sql.prepare('SELECT status FROM orders WHERE id=?').get(order.id).status,'PAID');
 for(const status of ['PROCESSING','READY','COMPLETED'])await svc.transition(owner,'orders',order.id,{status});
 assert.equal(sql.prepare('SELECT status FROM orders WHERE id=?').get(order.id).status,'COMPLETED');
});
test('Entitlements are enforced on server, input validation rejects invalid dates',async()=>{
 const starter={...owner,tenant:{...owner.tenant,plan:'STARTER'}};
 await assert.rejects(()=>svc.save(starter,'products',{}),e=>e.status===403);
 await assert.rejects(()=>svc.save(owner,'branches',{name:'Second'}),e=>e.status===403);
 assert.equal(domain.entitlements({...owner.tenant,plan:'PRO',trial_until:'2020-01-01'}).plan,'STARTER');
 await assert.rejects(()=>svc.save(owner,'memberships',{member_id:memberA,plan_id:planA,start_date:'2026-02-31'}),/معتبر/);
});
test('Automation notifications are idempotent and scoped',async()=>{
 sql.prepare("UPDATE memberships SET status='ACTIVE',end_date=? WHERE tenant_id=?").run(domain.today(),a);
 await svc.runAutomations(owner);const n=count('notifications');await svc.runAutomations(owner);assert.equal(count('notifications'),n);
 assert.ok((await svc.list(memberCtx,'notifications')).every(n=>n.member_id===memberA));
});

test('API state uses a separate currentAccess object and rejects cross-origin writes',async()=>{
 globalThis.__gymHeaders=new Headers({'oai-authenticated-user-id':'owner-1','oai-authenticated-user-email':'owner@example.com'});
 const route=await import(new URL('route.mjs',dir));
 const bootstrapResponse=await route.GET(new Request('https://gym.test/api/gym/bootstrap'));assert.equal(bootstrapResponse.status,200);assert.equal((await bootstrapResponse.json()).tenants.length,2);
 const response=await route.GET(new Request('https://gym.test/api/gym/state?tenant='+a));assert.equal(response.status,200);
 const state=await response.json();assert.equal(state.currentAccess.role,'owner');assert.ok(Array.isArray(state.access));assert.equal(state.members.length,1);assert.equal(state.summary.members,1);
 const blocked=await route.POST(new Request('https://gym.test/api/gym/members?tenant='+a,{method:'POST',headers:{origin:'https://attacker.test'},body:'{}'}));assert.equal(blocked.status,403);
});
test('QR is short-lived, tenant-bound, one-time and subject to active membership',async()=>{
 const qr=await import(new URL('attendance.mjs',dir));
 sql.prepare('DELETE FROM attendance WHERE tenant_id=?').run(a);
 sql.prepare("UPDATE memberships SET status='ACTIVE' WHERE tenant_id=?").run(a);
 const issued=await qr.issueQr(memberCtx,memberA);assert.ok(issued.expires>Date.now());assert.ok(issued.token.startsWith('FITSPACE:'));
 await assert.rejects(()=>qr.consumeQr({...owner,tenant:{...owner.tenant,id:b}},issued.token),/منقضی/);
 const r=await qr.consumeQr(owner,issued.token);assert.equal(r.name,'Member A');
 await assert.rejects(()=>qr.consumeQr(owner,issued.token),/منقضی/);
 assert.equal(sql.prepare('SELECT method FROM attendance WHERE id=?').get(r.id).method,'QR');
});
test('Database foreign keys reject cross-tenant relations even below service layer',()=>{
 assert.throws(()=>sql.prepare("INSERT INTO memberships(id,tenant_id,member_id,plan_id,start_date,end_date,status,price) VALUES('invalid',?,?,?,?,?,'ACTIVE',1)").run(a,memberB,planA,'2030-01-01','2030-01-02'),/FOREIGN KEY/);
});
test('Revocation immediately closes server-side membership access',async()=>{
 const staff=(await svc.save(owner,'access',{name:'Staff',email:'staff@example.com',role:'staff'})).id;
 await svc.transition(owner,'access',staff,{revoke:true});
 globalThis.__gymHeaders=new Headers({'oai-authenticated-user-id':'staff','oai-authenticated-user-email':'staff@example.com'});
 await assert.rejects(()=>svc.context(new Request('https://gym.test?tenant='+a)),e=>e.status===403);
 assert.equal(domain.can('revoked','members'),false);
});
test.after(()=>{sql.close();rmSync(dir,{recursive:true,force:true})});
test('Cursor pagination finds all 620 records without duplicates and treats wildcard search literally',async()=>{
 const ins=sql.prepare("INSERT INTO members(id,tenant_id,name,phone,branch_id,status) VALUES(?,?,?,?,?,'ACTIVE')");sql.exec('BEGIN');for(let i=0;i<620;i++)ins.run('bulk-'+String(i).padStart(4,'0'),a,'Bulk '+i,'bulk-'+i,branchA);sql.exec('COMMIT');
 let cursor='',ids=[];do{const page=await svc.listPage(owner,'members',{q:'Bulk ',limit:'100',cursor});assert.equal(page.total,620);ids.push(...page.items.map(r=>r.id));cursor=page.nextCursor||'';}while(cursor);
 assert.equal(ids.length,620);assert.equal(new Set(ids).size,620);assert.equal((await svc.listPage(owner,'members',{q:'%'})).total,0);await assert.rejects(()=>svc.listPage(owner,'members',{cursor:'invalid'}),e=>e.status===400);
 const other={...owner,tenant:{...owner.tenant,id:b}};assert.equal((await svc.listPage(other,'members',{q:'Bulk '})).total,0);
});
test('Trainer assignment and branch restrictions both apply; reporting covers every row',async()=>{
 sql.prepare('UPDATE members SET trainer_id=? WHERE id=?').run(trainer.access.id,memberA);
 const scopedTrainer={...trainer,access:{...trainer.access,branch_id:branchB}};assert.equal((await svc.listPage(scopedTrainer,'members')).total,0);
 const reporting=await import(new URL('reporting.mjs',dir));const r=await reporting.report(owner);assert.equal(r.summary.members,621);assert.equal(r.daily.length,14);
 const ins=sql.prepare("INSERT INTO payments(id,tenant_id,member_id,amount,kind,reference,status,date) VALUES(?,?,?,1,'OTHER',?,'CONFIRMED',?)");sql.exec('BEGIN');for(let i=0;i<610;i++)ins.run('bulk-payment-'+i,a,memberA,'bulk-ref-'+i,domain.today());sql.exec('COMMIT');
 const full=await reporting.report(owner,{from:domain.today(),to:domain.today()});const actual=sql.prepare("SELECT SUM(amount) n FROM payments WHERE tenant_id=? AND date=? AND status='CONFIRMED'").get(a,domain.today()).n;assert.equal(full.rangeRevenue,actual);assert.ok(full.rangeRevenue>=610);
 await assert.rejects(()=>reporting.report(owner,{from:'2026-02-31',to:'2026-03-02'}),e=>e.status===400);
 const restricted=await reporting.report(scopedTrainer);assert.equal(restricted.summary.members,0);assert.equal(restricted.rangeRevenue,0);
});
