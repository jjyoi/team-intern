'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { listEmails, markEmailRead, type OnboardingEmail } from '@/lib/demo-db';

function received(value: string) {
  return new Date(value).toLocaleString('en-CA', {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'});
}

export function OnboardingEmails({ search, employees, onOpenPerson }: { search: string; employees: {id: string; name: string}[]; onOpenPerson: (id: string) => void }) {
  const [messages, setMessages] = useState<OnboardingEmail[]>([]);
  const [selected, setSelected] = useState<OnboardingEmail | null>(null);
  const [personId, setPersonId] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    listEmails().then((items) => { if (active) setMessages(items); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load messages.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  async function open(message: OnboardingEmail) {
    setSelected(message);
    if (message.is_read) return;
    try {
      await markEmailRead(message.id);
      setMessages((current) => current.map((item) => item.id === message.id ? {...item, is_read: true} : item));
      setSelected((current) => current?.id === message.id ? {...current, is_read: true} : current);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save read status.'); }
  }

  const query = search.trim().toLowerCase();
  const activePersonId = employees.some((person) => person.id === personId) ? personId : 'all';
  const visible = messages.filter((item) => (activePersonId === 'all' || item.employee_id === activePersonId) && (!unreadOnly || !item.is_read) && `${item.subject} ${item.sender} ${item.employee_name} ${item.summary} ${item.body}`.toLowerCase().includes(query));
  const unread = visible.filter((item) => !item.is_read).length;

  return <section aria-labelledby="emails-heading">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 id="emails-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">Emails</h1><p className="mt-2 text-sm leading-relaxed text-black/70">Read the key update, then open the message for full details.</p></div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-3 text-sm font-medium">Person
          <NativeSelect aria-label="Filter emails by managed person" value={activePersonId} onChange={(event) => setPersonId(event.target.value)} className="w-48 bg-white">
            <NativeSelectOption value="all">All people</NativeSelectOption>
            {[...employees].sort((a, b) => a.name.localeCompare(b.name)).map((person) => <NativeSelectOption key={person.id} value={person.id}>{person.name}</NativeSelectOption>)}
          </NativeSelect>
        </label>
      <label className="flex items-center gap-3 text-sm font-medium">Show
        <NativeSelect aria-label="Filter emails" value={unreadOnly ? 'unread' : 'all'} onChange={(event) => setUnreadOnly(event.target.value === 'unread')} className="w-40 bg-white"><NativeSelectOption value="all">All messages</NativeSelectOption><NativeSelectOption value="unread">Unread</NativeSelectOption></NativeSelect>
      </label>
      </div>
    </div>
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#e9c4c4] bg-white p-4"><p className="text-sm text-[#9b1018]">{error}</p><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Retry</Button></div>}
    {loading ? <p role="status" className="py-8 text-sm">Loading messages…</p> : <>
      <p role="status" className="mb-4 text-sm text-black/70">{visible.length} {visible.length === 1 ? 'message' : 'messages'} · {unread} unread</p>
      <ul className="space-y-3">{visible.map((message) => <li key={message.id}>
        <button onClick={() => void open(message)} className="flex w-full items-start gap-4 rounded-lg border border-black/10 bg-white p-5 text-left hover:border-black/30">
          <Mail aria-hidden="true" className={`mt-1 hidden size-5 shrink-0 sm:block ${message.is_read ? 'text-black/45' : 'text-[#b00d15]'}`} />
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-black/70">{message.employee_name}</span><span className="text-xs text-black/70">{received(message.received_at)}</span></span>
            <span className={`mt-2 block text-base ${message.is_read ? 'font-medium' : 'font-semibold'}`}>{message.subject}</span><span className="mt-2 block text-sm leading-relaxed text-black/70">{message.summary}</span><span className="mt-3 block break-words text-xs text-black/70">{message.sender}{!message.is_read && <span className="ml-3 font-semibold text-[#b00d15]">Unread</span>}</span>
          </span><ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-black/60" />
        </button>
      </li>)}</ul>
      {!visible.length && <p className="rounded-lg border border-dashed border-black/20 p-8 text-sm text-black/70">{query || activePersonId !== 'all' || unreadOnly ? 'No messages match these filters.' : 'No emails yet.'}</p>}
    </>}
    <Dialog open={Boolean(selected)} onOpenChange={(isOpen) => { if (!isOpen) setSelected(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-xl p-6 sm:max-w-2xl">
        {selected && <><DialogHeader><DialogTitle className="text-xl leading-snug">{selected.subject}</DialogTitle><DialogDescription className="break-words">From: {selected.sender}<br />For: {selected.employee_name}<br />Received: {received(selected.received_at)}</DialogDescription></DialogHeader>
          <div className="border-l-2 border-[#ec111a] bg-[#f7f7f5] p-4"><h2 className="text-sm font-semibold">Key update</h2><p className="mt-2 text-sm leading-relaxed">{selected.summary}</p></div>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{selected.body}</div>
          {employees.some((person) => person.id === selected.employee_id) && <Button variant="outline" onClick={() => { onOpenPerson(selected.employee_id); setSelected(null); }} className="min-h-11 justify-self-start rounded-lg">View employee checklist <ArrowRight aria-hidden="true" /></Button>}
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
