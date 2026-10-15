type Identity = {id: string; name: string; firstName?: string; lastName?: string; email?: string};
export function previewEmployeeEmail(first: string, last: string, people: Pick<Identity, 'email'>[]): string {
  const clean = (value: string, fallback: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0,24) || fallback;
  const stem = `${clean(first, 'employee')}.${clean(last, 'user')}`;
  const used = new Set(people.map(person => person.email?.toLowerCase()));
  let number = 1;
  while (used.has(`${stem}${number > 1 ? number : ''}@scotiabank.com`)) number++;
  return `${stem}${number > 1 ? number : ''}@scotiabank.com`;
}
export function reconcileEmails<T extends {id: string; email?: string; journeyId?: string}>(current: T[], saved?: T[] | null): T[] {
  if (!Array.isArray(saved)) return current;
  const identities = new Map(saved.map(person => [person.id, person]));
  let changed = false;
  const next = current.map(person => {
    const identity = identities.get(person.id);
    if (!identity) return person;
    const email = identity.email || person.email;
    const journeyId = identity.journeyId || person.journeyId;
    if (email === person.email && journeyId === person.journeyId) return person;
    changed = true;
    return {...person, email, journeyId};
  });
  return changed ? next : current;
}
