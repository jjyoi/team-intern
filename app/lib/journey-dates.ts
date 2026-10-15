export type JourneySchedule = {type: 'onboarding' | 'offboarding'; dateISO?: string; date?: string; taskDueDates?: Record<string, string>};
export const scheduleOffsets = {
  onboarding: {offer: -10, background: -5, equipment: -2, access: -1, welcome: 0},
  offboarding: {departure: -10, handover: -1, return: 0, revoke: 0},
};
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + 'T12:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function journeyDate(person: JourneySchedule): string {
  if (person.dateISO && validDate(person.dateISO)) return person.dateISO;
  // Original seed records used month/day labels from the 2026 workspace.
  const match = person.date?.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i);
  if (!match) return '';
  const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(match[1].toLowerCase()) + 1;
  const date = `${match[3] || '2026'}-${String(month).padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  return validDate(date) ? date : '';
}
export function businessDayOffset(date: string, offset: number): string {
  if (!validDate(date)) return '';
  const day = new Date(date + 'T12:00:00Z');
  let remaining = Math.abs(offset);
  while (remaining > 0) {
    day.setUTCDate(day.getUTCDate() + Math.sign(offset));
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) remaining--;
  }
  return day.toISOString().slice(0, 10);
}
export function suggestedDates(type: JourneySchedule['type'], date: string): Record<string, string> {
  return Object.fromEntries(Object.entries(scheduleOffsets[type]).map(([id, offset]) => [id, businessDayOffset(date, offset)]));
}
export function taskDueDate(person: JourneySchedule, taskId: string): string {
  const saved = person.taskDueDates?.[taskId];
  return saved && validDate(saved) ? saved : suggestedDates(person.type, journeyDate(person))[taskId] || '';
}
export function formatDate(date: string): string {
  return validDate(date) ? new Date(date + 'T12:00:00Z').toLocaleDateString('en-CA', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'}) : 'Date not set';
}
export function deadlineStatus(due: string, complete: boolean, today = localDate()): 'important' | 'warning' | null {
  if (complete || !validDate(due) || !validDate(today)) return null;
  const days = Math.round((Date.parse(due + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000);
  return days < 0 ? 'important' : days <= 3 ? 'warning' : null;
}
export function validateJourneyDates(type: JourneySchedule['type'], date: string, dates: Record<string, string>) {
  if (!validDate(date)) throw new Error('Enter a valid journey date.');
  if (Object.keys(scheduleOffsets[type]).some(id => !validDate(dates[id] || ''))) throw new Error('Enter a valid due date for every task.');
}
