import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {authStore} from '../standalone/auth.mjs';
import {storage} from '../standalone/storage.mjs';
import {start} from '../standalone/server.mjs';
import {backup,restore} from '../standalone/backup.mjs';
const root=resolve('.'),temp=mkdtempSync(resolve(tmpdir(),'fitspace-test-')),dir=resolve(temp,'data');
let runtime,owner;
test('Native login, real app routes, isolation, CSRF, scheduler and session revocation',async()=>{
 const accounts=authStore(dir);owner=await accounts.create({email:'owner@example.com',name:'Owner',password:'testing-password-123',isOwner:true});await assert.rejects(()=>accounts.create({email:'second@example.com',name:'Second',password:'testing-password-123',isOwner:true}),/UNIQUE/);accounts.close();
 const initial=storage(root,dir);initial.db.prepare("INSERT INTO platform_admins(id,user_id,email) VALUES('installation-owner',?,?)").run(owner.id,owner.email);initial.close();
 runtime=await start({root,dataDir:dir,port:0,origin:'http://localhost:3000',schedule:false});const origin='http://localhost:3000',url='http://127.0.0.1:'+runtime.server.address().port;
 const request=(path,options={})=>fetch(url+path,{redirect:'manual',...options});
 assert.equal((await request('/healthz')).status,200);
 assert.equal((await request('/api/gym/bootstrap',{headers:{'oai-authenticated-user-id':owner.id,'oai-authenticated-user-email':owner.email}})).status,401);
 const form=await request('/login');const loginCookie=form.headers.get('set-cookie').split(';')[0],csrf=(await form.text()).match(/name="csrf" value="([^"]+)"/)[1];
 const login=await request('/auth/login',{method:'POST',headers:{origin,cookie:loginCookie,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email:owner.email,password:'testing-password-123',csrf})});assert.equal(login.status,303);const cookie=login.headers.get('set-cookie').split(';')[0];
 const api=async(path,method='GET',data,extra={})=>request('/api/gym/'+path,{method,headers:{origin,cookie,'Content-Type':'application/json',...extra},body:data?JSON.stringify(data):undefined});
 const home=await request('/',{headers:{cookie}});assert.equal(home.status,200);assert.match(await home.text(),/FitSpace|باشگاه/);
 const boot=await api('bootstrap');assert.equal(boot.status,200);assert.equal((await boot.json()).user.mode,'standalone');
 assert.equal((await api('tenants','POST',{name:'CSRF'},{origin:'https://evil.example'})).status,403);
 const tenantResponse=await api('tenants','POST',{name:'Test Gym'});assert.equal(tenantResponse.status,201);const tenant=(await tenantResponse.json()).id;
 const state=await (await api('state?tenant='+tenant)).json();assert.equal(state.summary.members,0);assert.equal(state.currentAccess.role,'owner');
 const created=await api('members?tenant='+tenant,'POST',{name:'Real Member',phone:'123456789',branch_id:state.branches[0].id});assert.equal(created.status,201);
 const search=await (await api('page/members?tenant='+tenant+'&q=Real')).json();assert.equal(search.total,1);assert.equal(search.items[0].name,'Real Member');
 assert.equal((await api('state?tenant=missing')).status,403);
 const report=await (await api('report?tenant='+tenant)).json();assert.equal(report.summary.members,1);

 // Two concurrent HTTP requests compete for one seat using the production handler and persistent adapter.
 const plan=await (await api('plans?tenant='+tenant,'POST',{name:'Monthly',duration:30,price:300})).json();
 const firstMember=search.items[0].id;
 const secondMember=(await (await api('members?tenant='+tenant,'POST',{name:'Second Member',phone:'987654321',branch_id:state.branches[0].id})).json()).id;
 for(const member_id of [firstMember,secondMember])assert.equal((await api('memberships?tenant='+tenant,'POST',{member_id,plan_id:plan.id,start_date:new Date().toISOString().slice(0,10)})).status,201);
 const sessionResponse=await api('classes?tenant='+tenant,'POST',{name:'Group Strength',room:'Studio',branch_id:state.branches[0].id,starts_at:new Date(Date.now()+86400000).toISOString(),duration:60,capacity:1});assert.equal(sessionResponse.status,201);const sessionId=(await sessionResponse.json()).id;
 const bookings=await Promise.all([firstMember,secondMember].map(member_id=>api('class-book/'+sessionId+'?tenant='+tenant,'POST',{member_id}).then(async r=>{assert.equal(r.status,201);return r.json()})));
 assert.deepEqual(bookings.map(b=>b.status).sort(),['BOOKED','WAITLIST']);
 const booked=bookings.find(b=>b.status==='BOOKED'),waiting=bookings.find(b=>b.status==='WAITLIST');assert.equal((await api('booking-cancel/'+booked.id+'?tenant='+tenant,'POST',{})).status,200);
 const roster=await (await api('class-roster/'+sessionId+'?tenant='+tenant)).json();assert.equal(roster.items.find(b=>b.id===waiting.id).status,'BOOKED');
 await runtime.runScheduled();
 const asset=await request('/standalone/auth.mjs',{headers:{cookie}});assert.notEqual(asset.headers.get('content-type'),'text/javascript');
 const account=await request('/account',{headers:{cookie}});const accountCsrf=(await account.text()).match(/name="csrf" value="([^"]+)"/)[1];
 const changed=await request('/auth/password',{method:'POST',headers:{origin,cookie,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf:accountCsrf,old:'testing-password-123',password:'replacement-password-123'})});assert.equal(changed.status,303);assert.equal((await api('bootstrap')).status,401);
 assert.throws(()=>backup(dir,resolve(temp,'running-backup')),/Stop the server/);
 await runtime.close();runtime=null;
});
test('Backup and restore preserve SQL and objects, reject tampering and clear sessions',async()=>{
 const s=storage(root,dir);await s.BUCKET.put('tenant/member/image',Buffer.from('image-bytes'),{httpMetadata:{contentType:'image/png'}});s.close();
 const a=authStore(dir);const session=await a.login(owner.email,'replacement-password-123','127.0.0.1');assert.ok(a.session(session));a.close();
 const folder=resolve(temp,'backup'),restored=resolve(temp,'restored');backup(dir,folder);restore(folder,restored);
 const data=storage(root,restored);assert.equal(data.db.prepare('SELECT COUNT(*) n FROM members').get().n,2);assert.equal(await new Response((await data.BUCKET.get('tenant/member/image')).body).text(),'image-bytes');data.close();
 const auth=authStore(restored);assert.equal(auth.session(session),undefined);auth.close();
 writeFileSync(resolve(folder,'data/objects/tenant/member/image'),'tampered');assert.throws(()=>restore(folder,resolve(temp,'tampered')),/checksum/);assert.equal(existsSync(resolve(temp,'tampered')),false);
});
test.after(async()=>{if(runtime)await runtime.close();rmSync(temp,{recursive:true,force:true})});

test('Upgrade from 0.2 migrations preserves existing records and adds class tables',()=>{
 const oldRoot=resolve(temp,'old-source'),upgradeDir=resolve(temp,'upgrade-data');mkdirSync(resolve(oldRoot,'drizzle'),{recursive:true});
 for(const file of ['0000_tiresome_night_thrasher.sql','0001_domain_guards.sql','0002_striped_kitty_pryde.sql'])copyFileSync(resolve(root,'drizzle',file),resolve(oldRoot,'drizzle',file));
 const old=storage(oldRoot,upgradeDir);old.db.prepare("INSERT INTO tenants(id,name,owner_id,plan,trial_until,timezone) VALUES('preserved','Existing gym','owner','PRO','','Asia/Tehran')").run();old.close();
 const upgraded=storage(root,upgradeDir);assert.equal(upgraded.db.prepare("SELECT name FROM tenants WHERE id='preserved'").get().name,'Existing gym');assert.equal(upgraded.db.prepare('SELECT COUNT(*) n FROM class_sessions').get().n,0);assert.equal(upgraded.db.prepare('SELECT COUNT(*) n FROM _migrations').get().n,5);upgraded.close();
});
