'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate, journeyDate, suggestedDates, validateJourneyDates, type JourneySchedule } from '@/lib/journey-dates';

type DateTask = {id: string; title: string; dueISO: string};
export function JourneyDateEditor({person, tasks, disabled, onSave}: {person: JourneySchedule; tasks: DateTask[]; disabled?: boolean; onSave: (date: string, dates: Record<string, string>) => Promise<void>}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(journeyDate(person));
  const [dates, setDates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const label = person.type === 'onboarding' ? 'Start date' : 'Last working day';
  function edit() {
    setDate(journeyDate(person)); setDates(Object.fromEntries(tasks.map(task => [task.id, task.dueISO]))); setError(''); setEditing(true);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    try { validateJourneyDates(person.type, date, dates); setSaving(true); setError(''); await onSave(date, dates); setEditing(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save dates. Try again.'); }
    finally { setSaving(false); }
  }
  return <section aria-label="Journey dates" className="mb-6 rounded-lg border border-black/10 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">Journey dates</h3><p className="mt-1 text-sm text-black/70">{label} · {formatDate(journeyDate(person))}</p></div>{!editing && <Button type="button" variant="outline" disabled={disabled} onClick={edit}>Edit dates</Button>}</div>
    {editing && <form onSubmit={save} className="mt-4 space-y-4" aria-busy={saving}>
      <label className="block space-y-2 text-sm font-medium"><span>{label} (required)</span><Input type="date" required disabled={saving || disabled} value={date} onChange={event => {setDate(event.target.value);setDates(suggestedDates(person.type,event.target.value));}} /></label>
      <p className="text-xs leading-relaxed text-black/70">Changing this date resets task dates to the suggested schedule. Adjust any due dates below before saving. Completed tasks stay complete.</p>
      <div className="grid gap-4 sm:grid-cols-2">{tasks.map(task => <label key={task.id} className="block space-y-2 text-sm font-medium"><span>{task.title} (required)</span><Input type="date" required disabled={saving || disabled} value={dates[task.id] || ''} onChange={event => setDates(current => ({...current,[task.id]:event.target.value}))} /></label>)}</div>
      {error && <p role="alert" className="text-sm text-[#9b1018]">{error}</p>}
      <div className="flex gap-3"><Button type="submit" disabled={saving || disabled}>{saving ? 'Saving…' : 'Save dates'}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button></div>
    </form>}
  </section>;
}
