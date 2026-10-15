'use client';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { deadlineStatus, formatDate } from '@/lib/journey-dates';
import { ticketStatuses, type JourneyTicket, type TicketStatus } from '@/lib/tickets';

export function TicketsPanel({tickets, search = '', today, busy, employeeId, journeyId, onUpdate, onOpenPerson, employees = []}: {
  tickets: JourneyTicket[]; search?: string; today: string; busy: boolean; employeeId?: string; journeyId?: string;
  employees?: {id: string; name: string}[];
  onUpdate: (ticket: JourneyTicket, status: TicketStatus) => Promise<void>; onOpenPerson?: (id: string) => void;
}) {
  const prefix = useId();
  const [personFilter, setPersonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [scope, setScope] = useState('active');
  const [error, setError] = useState('');
  const names = new Map(tickets.map(ticket => [ticket.employee_id, ticket.employee_name]));
  for (const person of employees) names.set(person.id, person.name);
  const query = search.toLowerCase().trim();
  const shown = tickets.filter(ticket => (!employeeId || ticket.employee_id === employeeId) &&
    (scope === 'all' || (scope === 'active' ? ticket.active && (!journeyId || ticket.journey_id === journeyId) : !ticket.active)) &&
    (personFilter === 'all' || ticket.employee_id === personFilter) &&
    (statusFilter === 'all' || (statusFilter === 'open' ? ticket.status !== 'Completed' && ticket.status !== 'Cancelled' : ticket.status === statusFilter)) &&
    (!query || `${ticket.id} ${ticket.employee_name} ${ticket.item} ${ticket.category} ${ticket.assignee}`.toLowerCase().includes(query)))
    .sort((a,b) => a.due_date.localeCompare(b.due_date) || a.item.localeCompare(b.item));
  async function update(ticket: JourneyTicket, status: TicketStatus) {
    setError('');
    try {await onUpdate(ticket,status);}
    catch (reason) {setError(reason instanceof Error ? reason.message : 'Could not save this ticket. Try again.');}
  }
  return <section aria-label="Journey tickets" className="space-y-4">
    <div><h2 className="text-xl font-semibold">Tickets</h2><p className="mt-2 text-sm leading-relaxed text-black/70">Track equipment, software and access requests. Completing every ticket for a checklist item completes that item once.</p></div>
    <div className="flex flex-wrap gap-4">
      {!employeeId && <label className="space-y-2 text-sm font-medium"><span className="block">Employee</span><NativeSelect value={personFilter} onChange={event => setPersonFilter(event.target.value)}><NativeSelectOption value="all">All employees</NativeSelectOption>{[...names].sort((a,b) => a[1].localeCompare(b[1])).map(([id,name]) => <NativeSelectOption value={id} key={id}>{name}</NativeSelectOption>)}</NativeSelect></label>}
      <label className="space-y-2 text-sm font-medium"><span className="block">Journey</span><NativeSelect value={scope} onChange={event => {setScope(event.target.value);setStatusFilter('all');}}><NativeSelectOption value="active">Current journeys</NativeSelectOption><NativeSelectOption value="history">History</NativeSelectOption><NativeSelectOption value="all">All journeys</NativeSelectOption></NativeSelect></label>
      <label className="space-y-2 text-sm font-medium"><span className="block">Status</span><NativeSelect value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><NativeSelectOption value="open">Open requests</NativeSelectOption><NativeSelectOption value="all">All statuses</NativeSelectOption>{[...ticketStatuses,'Cancelled'].map(status => <NativeSelectOption value={status} key={status}>{status}</NativeSelectOption>)}</NativeSelect></label>
    </div>
    {error && <p role="alert" className="rounded-lg border border-[#e8a9ae] bg-[#fff1f2] p-3 text-sm text-[#9b1018]">{error}</p>}
    <p role="status" className="text-sm text-black/70">{shown.length} {shown.length === 1 ? 'ticket' : 'tickets'}</p>
    <ul className="space-y-3">{shown.map(ticket => {
      const urgency = ticket.active ? deadlineStatus(ticket.due_date,ticket.status === 'Completed',today) : null;
      return <li key={ticket.id} className={`rounded-lg border bg-white p-4 ${urgency === 'important' ? 'border-[#e8a9ae]' : 'border-black/10'}`}>
        <article>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1"><p className="text-xs text-black/70"><span title={ticket.id} className="select-all break-all font-mono">{ticket.id}</span> · {ticket.category}</p><h3 className="mt-2 break-words font-semibold">{ticket.item}</h3>
              <p className="mt-1 text-sm text-black/70">{ticket.employee_name} · {ticket.journey_type === 'onboarding' ? 'Onboarding' : 'Offboarding'}{!ticket.active ? ' · History' : ''}</p>
              <p className="mt-2 text-sm text-black/70">Assigned to {ticket.assignee}</p><p className="mt-1 text-sm text-black/70">Due {formatDate(ticket.due_date)}</p>
              {urgency && <p className={`mt-2 text-xs font-bold ${urgency === 'important' ? 'text-[#9b1018]' : 'text-[#855000]'}`}>{urgency === 'important' ? 'IMPORTANT · overdue' : 'WARNING · due soon'}</p>}
            </div>
            {ticket.active ? <label htmlFor={`${prefix}-${ticket.id}`} className="block space-y-2 text-sm font-medium"><span>Status</span><NativeSelect id={`${prefix}-${ticket.id}`} aria-label={`Status for ${ticket.item} for ${ticket.employee_name}`} value={ticket.status} disabled={busy} onChange={event => void update(ticket,event.target.value as TicketStatus)}>{ticketStatuses.map(status => <NativeSelectOption key={status} value={status}>{status}</NativeSelectOption>)}</NativeSelect></label> : <span className="text-sm font-semibold">{ticket.status}</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-black/10 pt-3">
            <details className="min-w-0 flex-1"><summary className="min-h-11 cursor-pointer text-sm font-medium">Status history ({ticket.events.length})</summary><ol className="space-y-3 py-2">{ticket.events.map(event => <li key={event.id} className="text-xs leading-relaxed text-black/70"><p>{event.from_status ? `${event.from_status} → ` : ''}{event.to_status} · {event.actor}</p><p>{event.note}</p><time>{event.created_at} UTC</time></li>)}</ol></details>
            {onOpenPerson && employees.some(person => person.id === ticket.employee_id) && <Button type="button" variant="outline" onClick={() => onOpenPerson(ticket.employee_id)}>Open employee</Button>}
          </div>
        </article>
      </li>;
    })}</ul>
    {!shown.length && <p className="rounded-lg border border-dashed border-black/20 p-5 text-sm text-black/70">No tickets match these filters. Try All statuses or another journey filter.</p>}
  </section>;
}
