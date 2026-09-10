import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {defaultLimits,reservationSQL,reservationArgs,dayStart} from '../lib/quota-policy.ts';
if(!isMainThread){const d=new DatabaseSync(workerData.path);d.exec('PRAGMA busy_timeout=10000');parentPort.postMessage(d.prepare(reservationSQL).run(...reservationArgs(crypto.randomUUID(),workerData.user,workerData.now,workerData.limits)).changes);d.close()}
else{
const d=new DatabaseSync(':memory:');d.exec(readFileSync(new URL('../drizzle/0002_complex_vindicator.sql',import.meta.url),'utf8'));
const now=Date.parse('2026-09-09T04:00:00Z');
const reserve=(u='a',time=now,limits=defaultLimits)=>Number(d.prepare(reservationSQL).run(...reservationArgs(crypto.randomUUID(),u,time,limits)).changes);
const finish=()=>d.exec("UPDATE ai_calls SET status='finished'");
assert.equal(reserve(),1);assert.equal(reserve(),0);finish();
for(let i=0;i<4;i++){assert.equal(reserve(),1);finish()}
assert.equal(reserve(),0);assert.equal(reserve('b'),1);finish();
assert.equal(reserve('a',now+60001),1);finish();
d.exec('DELETE FROM ai_calls');
for(let i=0;i<30;i++){assert.equal(reserve('a',now+i*61000),1);finish()}
assert.equal(reserve('a',now+31*61000),0);assert.equal(reserve('b',now+31*61000),1);finish();
assert.equal(reserve('a',dayStart(now)+86400000),1);
d.exec('DELETE FROM ai_calls');
assert.equal(reserve(),1);assert.equal(reserve('a',now+119999),0);assert.equal(reserve('a',now+120001),1);
d.close();
const dir=mkdtempSync(join(tmpdir(),'atom-quota-'));const path=join(dir,'quota.sqlite');
const seed=new DatabaseSync(path);seed.exec(readFileSync(new URL('../drizzle/0002_complex_vindicator.sql',import.meta.url),'utf8'));seed.close();
async function burst(sameUser,cap){return Promise.all(Array.from({length:12},(_,i)=>new Promise((resolve,reject)=>{const w=new Worker(new URL(import.meta.url),{workerData:{path,user:sameUser?'shared':'u'+i,now,limits:{...defaultLimits,globalPerDay:cap}}});w.on('message',resolve);w.on('error',reject)})))}
assert.equal((await burst(false,3)).reduce((a,b)=>a+b,0),3);
const reset=new DatabaseSync(path);reset.exec('DELETE FROM ai_calls');reset.close();
assert.equal((await burst(true,100)).reduce((a,b)=>a+b,0),1);
rmSync(dir,{recursive:true,force:true});
console.log('PASS: rolling minute, per-user day, midnight reset, expired lease, concurrent global cap and per-user single flight');
}
