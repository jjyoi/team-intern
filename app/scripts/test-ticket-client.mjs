import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

function client(fetch) {
  const context={exports:{},fetch};
  vm.createContext(context);
  for (const file of ['../lib/demo-db.ts','../lib/employee-email.ts']) {
    vm.runInContext(ts.transpile(readFileSync(new URL(file,import.meta.url),'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}),context);
  }
  return context.exports;
}
const state={roster:[{id:'one',journeyId:'journey-one',email:'one@scotiabank.com'}],tasks:{one:[]},profiles:[],tickets:[]};
const response = data => ({ok:true,json:async()=>data});
test('workspace and ticket writes share a queue so an earlier autosave completes before a ticket update', async () => {
  const requests=[];let release;
  const api=client(async (url,options) => {
    requests.push({url,body:JSON.parse(options.body)});
    if (requests.length===1) await new Promise(resolve=>{release=resolve;});
    return response(state);
  });
  const save=api.saveWorkspace('manager',state);
  const update=api.updateTicket('ticket-one','Completed','Submitted');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(requests.length,1);
  release();await save;await update;
  assert.equal(requests[1].url,'/api/demo/tickets/status');
  assert.deepEqual(requests[1].body,{id:'ticket-one',status:'Completed',expected_status:'Submitted'});
});
test('old server responses produce a restart message instead of corrupting ticket state', async () => {
  const api=client(async()=>response({roster:[],tasks:{},profiles:[]}));
  await assert.rejects(api.saveWorkspace('manager',state),/older version/);
});
test('failed ticket updates propagate and do not stop later workspace saves', async () => {
  let attempts=0;
  const api=client(async()=>++attempts===1 ? {ok:false,json:async()=>({error:'Ticket changed. Refresh.'})} : response(state));
  await assert.rejects(api.updateTicket('one','Completed','Submitted'),/Ticket changed/);
  assert.deepEqual(await api.saveWorkspace('manager',state),state);
});
test('server journey ids are retained without triggering an endless autosave loop', () => {
  const api=client(()=>{});
  const before=[{id:'one',email:'one@scotiabank.com'}];
  const saved=[{...before[0],journeyId:'journey-one'}];
  const reconciled=api.reconcileEmails(before,saved);
  assert.equal(reconciled[0].journeyId,'journey-one');
  assert.equal(api.reconcileEmails(reconciled,saved),reconciled);
});
