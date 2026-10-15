type Identity = {sid?: string; eid?: string};
function digit(): number {
  const value = new Uint8Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= 250);
  return value[0] % 10;
}
function digits(length: number): string { return Array.from({length}, digit).join(''); }
export function assignEmployeeIds<T extends Identity>(employees: T[]): (T & {sid: string; eid: string})[] {
  const sids = new Set<string>(), eids = new Set<string>();
  const reservedSids = new Set(employees.map((person) => person.sid).filter((sid) => /^s\d{7}$/.test(sid ?? '')));
  const reservedEids = new Set(employees.map((person) => person.eid).filter((eid) => /^\d{8}$/.test(eid ?? '')));
  return employees.map((employee) => {
    let sid = employee.sid ?? '', eid = employee.eid ?? '';
    if (!/^s\d{7}$/.test(sid) || sids.has(sid)) {
      do { sid = 's' + digits(7); } while (reservedSids.has(sid) || sids.has(sid));
    }
    if (!/^\d{8}$/.test(eid) || eids.has(eid)) {
      do { let first = digit(); while (!first) first = digit(); eid = String(first) + digits(7); } while (reservedEids.has(eid) || eids.has(eid));
    }
    sids.add(sid); eids.add(eid);
    return {...employee, sid, eid};
  });
}
