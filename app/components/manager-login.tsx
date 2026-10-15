'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { currentManager, DEMO_SID, DEMO_PASSWORD, signIn, signOut, type Manager } from '@/lib/demo-db';

export function ManagerLogin({ children }: { children: (manager: Manager, logout: () => void) => ReactNode }) {
  const [manager, setManager] = useState<Manager>();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    currentManager().then((account) => { if (active) setManager(account); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Sign-in is unavailable.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    const sid = form.get('sid');
    const password = form.get('password');
    try { setManager(await signIn(typeof sid === 'string' ? sid : '', typeof password === 'string' ? password : '')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not sign in. Try again.'); }
    finally { setBusy(false); }
  }

  async function logout() {
    try { await signOut(); setManager(undefined); setError(''); requestAnimationFrame(() => document.getElementById('manager-sid')?.focus()); }
    catch { setError('Could not sign out. Try again.'); }
  }

  if (checking) return <main className="grid min-h-screen place-items-center p-6"><output>Opening your workspace…</output></main>;
  if (manager) return <>{children(manager, logout)}{error && <p role="alert" className="fixed bottom-4 left-4 rounded-lg bg-white p-4 text-[#9b1018] shadow-lg">{error}</p>}</>;

  return <main className="grid min-h-screen place-items-center bg-background p-4 sm:p-8">
    <section aria-labelledby="login-heading" className="w-full max-w-md rounded-lg border border-black/10 bg-white p-6 shadow-sm sm:p-8">
      <Image src="/scotiabank-logo.svg" alt="Scotiabank" width={44} height={49} className="mb-6 h-12 w-11 object-contain" />
      <p className="text-sm font-semibold text-[#b00d15]">ScotiaOn</p>
      <h1 id="login-heading" className="mt-2 text-3xl font-semibold tracking-tight">Manager sign-in</h1>
      <p className="mt-3 text-sm leading-relaxed text-black/70">Manage your team’s onboarding tasks, equipment, and access in one place.</p>
      <form onSubmit={submit} aria-busy={busy} className="mt-6 space-y-5">
        <div><label htmlFor="manager-sid" className="mb-2 block text-sm font-semibold">SID (ScotiaID)</label>
          <Input id="manager-sid" name="sid" type="text" pattern="[sS][0-9]{7}" maxLength={8} autoCapitalize="none" spellCheck={false} title="s followed by seven digits" autoComplete="username" required defaultValue={DEMO_SID} aria-describedby="sign-in-details" className="h-11 w-full rounded-lg" /></div>
        <div><label htmlFor="manager-password" className="mb-2 block text-sm font-semibold">Password</label>
          <Input id="manager-password" name="password" type="password" autoComplete="current-password" required aria-describedby={error ? 'login-error' : 'sign-in-details'} aria-invalid={Boolean(error)} className="h-11 w-full rounded-lg" /></div>
        {error && <p id="login-error" role="alert" className="rounded-lg bg-[#fff1f1] p-3 text-sm text-[#9b1018]">{error}</p>}
        <Button type="submit" disabled={busy} className="min-h-11 w-full rounded-lg text-sm"><LogIn aria-hidden="true" />{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <div id="sign-in-details" className="mt-6 rounded-lg bg-[#f5f5f2] p-4 text-sm leading-relaxed text-black/75">
        <p className="font-semibold">Sign-in details</p>
        <p className="mt-1 break-all">SID: {DEMO_SID}</p>
        <p>Password: <code className="select-all font-semibold">{DEMO_PASSWORD}</code></p>
      </div>
    </section>
  </main>;
}
