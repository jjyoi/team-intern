'use client';
import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSoftToken, type SoftTokenCode } from '@/lib/demo-db';

export function EmployeeIdentifiers({sid, eid, email}: {sid?: string; eid?: string; email?: string}) {
  const [notice, setNotice] = useState('');
  async function copy(label: string, value: string) {
    try { await navigator.clipboard.writeText(value); setNotice(`${label} copied.`); }
    catch { setNotice('Could not copy. Select the value and copy it manually.'); }
  }
  return <section aria-label="Employee identifiers" className="mb-6 rounded-lg border border-black/10 bg-white p-4">
    <h3 className="text-sm font-semibold">Employee details</h3><p className="mt-1 text-xs text-black/70">Select a field to copy it.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {([['SID (ScotiaID)', sid], ['EID (Employee ID)', eid], ['Scotiabank email', email]] as const).map(([label, value]) => <button key={label} type="button" disabled={!value} onClick={() => void copy(label, value!)} aria-label={`Copy ${label}${value ? `: ${value}` : ', not set'}`} className={`flex min-h-16 items-center justify-between gap-3 rounded-lg border border-black/10 p-3 text-left enabled:hover:border-black/30 ${label === 'Scotiabank email' ? 'sm:col-span-2' : ''}`}>
        <span className="min-w-0"><span className="block text-xs text-black/70">{label}</span><span className="mt-1 block select-text break-all text-sm font-semibold">{value || 'Not set'}</span></span><Copy aria-hidden="true" className="size-4 shrink-0 text-black/60" />
      </button>)}
    </div>
    <p role="status" className="mt-2 text-xs text-black/70">{notice}</p>
  </section>;
}

export function SoftTokenAccess({employeeId, completedOffboarding}: {employeeId: string; completedOffboarding: boolean}) {
  const [token, setToken] = useState<SoftTokenCode | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const available = !completedOffboarding;
  useEffect(() => {
    setToken(null); setRemaining(0); setError(''); setNotice('');
    if (!available) return;
    let active = true, fetching = false, failed = false, expires = 0, offset = 0;
    async function refresh() {
      if (fetching) return;
      fetching = true;
      try {
        const result = await getSoftToken(employeeId);
        if (!active) return;
        offset = result.server_time - Date.now() / 1000;
        expires = result.expires_at;
        setToken(result); setError('');
        setDeadline(Date.now() + (result.expires_at - result.server_time) * 1000);
        setRemaining(Math.max(0, Math.ceil(expires - (Date.now() / 1000 + offset))));
      } catch (reason) { if (active) {failed = true; setToken(null); setError(reason instanceof Error ? reason.message : 'Could not load token.');} }
      finally { fetching = false; }
    }
    void refresh();
    const timer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil(expires - (Date.now() / 1000 + offset)));
      setRemaining(seconds);
      if (!seconds && !failed) void refresh();
    }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [employeeId, available, reload]);
  async function copyToken() {
    if (!token || remaining <= 0) return;
    if (Date.now() >= deadline) { setRemaining(0); setReload((value) => value + 1); setNotice('Refreshing code. Copy the new code when it appears.'); return; }
    try { await navigator.clipboard.writeText(token.code); setNotice('Soft Token copied.'); }
    catch { setNotice('Could not copy. Select the code and copy it manually.'); }
  }
  return <section aria-labelledby="soft-token-heading" className="mb-6 rounded-lg border border-black/10 bg-white p-4">
    <h3 id="soft-token-heading" className="text-base font-semibold">Soft Token</h3>
    {completedOffboarding ? <p className="mt-3 text-sm text-black/70">Access is closed after completed offboarding.</p> : available && <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#f7f7f5] p-4"><div><span aria-label="Current Soft Token" className="select-all text-3xl font-semibold tracking-[0.2em] tabular-nums">{token && remaining > 0 ? token.code : '••••••'}</span><p className="mt-2 text-xs text-black/70">{token && remaining > 0 ? `Refreshes in ${remaining}s` : 'Loading new code…'}</p></div><Button type="button" variant="outline" disabled={!token || remaining <= 0} onClick={() => void copyToken()}><Copy aria-hidden="true" />Copy token</Button></div>}
    {error && <div role="alert" className="mt-3 text-sm text-[#9b1018]">{error}{available && <button type="button" onClick={() => setReload((value) => value + 1)} className="ml-3 min-h-11 underline">Retry</button>}</div>}
    <p role="status" className="mt-2 text-xs text-black/70">{notice}</p>
  </section>;
}
