import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const helpers = {};
const sandbox = vm.createContext({exports: helpers});
vm.runInContext(ts.transpile(readFileSync(new URL('../lib/journey-dates.ts', import.meta.url), 'utf8'), {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}), sandbox);
const plain = value => JSON.parse(JSON.stringify(value));

test('suggested onboarding dates skip weekends and can cross a year boundary', () => {
  assert.deepEqual(plain(helpers.suggestedDates('onboarding', '2026-10-19')), {
    offer: '2026-10-05', background: '2026-10-12', equipment: '2026-10-15', access: '2026-10-16', welcome: '2026-10-19',
  });
  assert.equal(helpers.businessDayOffset('2027-01-04', -2), '2026-12-31');
});
test('offboarding puts handover before departure and return and revoke on the last day', () => {
  assert.deepEqual(plain(helpers.suggestedDates('offboarding', '2026-10-19')), {departure:'2026-10-05', handover:'2026-10-16', return:'2026-10-19', revoke:'2026-10-19'});
});
test('deadline severity has clear calendar day boundaries and completed tasks have no alerts', () => {
  for (const [due, expected] of [['2026-10-14','important'],['2026-10-15','warning'],['2026-10-18','warning'],['2026-10-19',null]]) {
    assert.equal(helpers.deadlineStatus(due, false, '2026-10-15'), expected);
    assert.equal(helpers.deadlineStatus(due, true, '2026-10-15'), null);
  }
  assert.equal(helpers.deadlineStatus('2026-03-08', false, '2026-03-09'), 'important');
});
test('invalid dates are rejected including impossible days and missing task dates', () => {
  for (const date of ['', '2026-02-29', '2026-04-31', '2026-10-32', 'not a date']) assert.equal(helpers.validDate(date), false);
  assert.equal(helpers.validDate('2028-02-29'), true);
  assert.throws(() => helpers.validateJourneyDates('onboarding','2026-10-19', {}), /every task/);
  assert.throws(() => helpers.validateJourneyDates('onboarding','2026-02-31', {}), /journey date/);
  assert.equal(helpers.deadlineStatus('', false, '2026-10-15'), null);
});
test('legacy seed dates use their original year and explicit ISO dates take priority', () => {
  assert.equal(helpers.journeyDate({date:'Starts Oct 12'}), '2026-10-12');
  assert.equal(helpers.journeyDate({date:'Leaves Feb 3, 2028'}), '2028-02-03');
  assert.equal(helpers.journeyDate({date:'Starts Oct 12', dateISO:'2027-01-04'}), '2027-01-04');
});
test('custom due dates override suggestions and remain overdue rather than moving to today', () => {
  const person={type:'onboarding', dateISO:'2026-10-19', taskDueDates:{access:'2026-10-20'}};
  assert.equal(helpers.taskDueDate(person,'access'), '2026-10-20');
  assert.equal(helpers.taskDueDate(person,'offer'), '2026-10-05');
  assert.equal(helpers.deadlineStatus(helpers.taskDueDate(person,'offer'),false,'2026-10-21'),'important');
});

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('page.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let saveDates;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'updateJourneyDates') saveDates = node.getText(tree);
  ts.forEachChild(node, visit);
}
visit(tree);
function dateSaveContext(fail = false) {
  const employee = {id:'employee', name:'Taylor Morgan', sid:'s1234567', eid:'12345678', type:'onboarding', dateISO:'2026-10-19', email:'taylor.morgan@scotiabank.com', journeyHistory:[{type:'offboarding'}]};
  const context = {ticketPending:{current:false},setTickets:()=>{},setTaskProgress:()=>{},activeDetail:employee,canSave:true,roster:[employee],taskProgress:{employee:['offer','background']},customProfiles:[], ...helpers,
    saveWorkspace: async (_id, state) => {if (fail) throw Error('offline');context.saved = state;return state;},
    manager:{id:'manager'},setRoster: value => {context.roster=value;},setNotice:()=>{},
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(saveDates,{target:ts.ScriptTarget.ES2022}),context);
  return context;
}
test('actual date save handler preserves identity checklist history and other workspace data', async () => {
  const context=dateSaveContext();const before=context.roster[0];
  const dates=helpers.suggestedDates('onboarding','2026-11-02');
  await context.updateJourneyDates('2026-11-02',dates);
  assert.equal(context.roster[0].dateISO,'2026-11-02');
  assert.equal(context.roster[0].sid,before.sid);
  assert.equal(context.roster[0].email,before.email);
  assert.equal(context.roster[0].journeyHistory,before.journeyHistory);
  assert.deepEqual(plain(context.saved.tasks),{employee:['offer','background']});
  assert.deepEqual(plain(context.roster[0].taskDueDates),plain(dates));
});
test('failed date saves leave the displayed record unchanged and propagate the error', async () => {
  const context=dateSaveContext(true);const before=context.roster;
  await assert.rejects(context.updateJourneyDates('2026-11-02', helpers.suggestedDates('onboarding','2026-11-02')), /offline/);
  assert.equal(context.roster,before);
});
