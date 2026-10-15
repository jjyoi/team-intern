export const MANUAL_PROFILE = '__manual__';
export type JourneyFields = {
  returning?: boolean; firstName: string; lastName: string; email: string; managerFirstName: string; managerLastName: string;
  date: string; profileId: string; businessArea: string; jobTitle: string; sid: string; eid: string;
  laptop: string; headset: string; softwareMode: string; accessMode: string; software: string[]; access: string[];
};
export function splitName(value = ''): {firstName: string; lastName: string} {
  const [firstName = '', ...rest] = value.trim().split(/\s+/);
  return {firstName, lastName: rest.join(' ')};
}
export function fullName(first: string, last: string): string { return `${first.trim()} ${last.trim()}`.trim().replace(/\s+/g, ' '); }
export function validateJourney(fields: JourneyFields, type: 'onboarding' | 'offboarding', profileIds: string[]) {
  const required = ['firstName', 'lastName', 'managerFirstName', 'managerLastName', 'date'] as const;
  if (required.some((key) => !fields[key]?.trim())) throw new Error('Complete every required field.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date) || !Number.isFinite(Date.parse(fields.date + 'T12:00:00')) || new Date(fields.date + 'T12:00:00Z').toISOString().slice(0,10) !== fields.date) throw new Error('Enter a valid date.');
  if (type === 'offboarding' || fields.returning) {
    if (!/^s\d{7}$/.test(fields.sid.trim().toLowerCase())) throw new Error('SID must be s followed by seven digits.');
    if (!/^\d{8}$/.test(fields.eid.trim())) throw new Error('EID must contain eight digits.');
    if (type === 'offboarding') return;
  }
  if (!fields.businessArea.trim()) throw new Error('Choose a business area.');
  if (fields.profileId !== MANUAL_PROFILE) {
    if (!profileIds.includes(fields.profileId)) throw new Error('Choose a role profile or Custom / Other / Manual.');
    return;
  }
  if (!fields.jobTitle.trim() || !fields.laptop || !['yes','no'].includes(fields.headset)) throw new Error('Complete the custom job title and hardware choices.');
  if (!['assign','none'].includes(fields.softwareMode) || !['assign','none'].includes(fields.accessMode)) throw new Error('Choose software and access requirements, including None when not needed.');
  if (fields.softwareMode === 'assign' && !fields.software.length) throw new Error('Select at least one software application, or choose No software needed.');
  if (fields.accessMode === 'assign' && !fields.access.length) throw new Error('Select at least one access item, or choose No access needed.');
}
