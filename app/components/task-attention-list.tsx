'use client';
import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function TaskAttentionList({count, overdue, dueSoon, blockedOnly, children}: {count: number; overdue: number; dueSoon: number; blockedOnly: number; children: ReactNode}) {
  return <section aria-labelledby="blockers-heading" className="w-full rounded-xl border border-black/10 bg-white p-5">
    <div className="mb-3"><h2 id="blockers-heading" className="text-base font-semibold">Blockers and deadlines</h2><p className="mt-1 text-sm text-black/70">{count} {count === 1 ? 'task needs' : 'tasks need'} attention · {overdue} overdue · {dueSoon} due soon{blockedOnly ? ` · ${blockedOnly} other blocked` : ''}</p></div>
    {count ? <ul id="attention-tasks" aria-label="Blockers and upcoming deadlines" tabIndex={0} className="flex snap-x snap-proximity gap-3 overflow-x-auto pb-3">{children}</ul> : <p className="flex items-center gap-2 py-3 text-sm text-[#216a3c]"><CheckCircle2 aria-hidden="true" className="size-4" />No blockers or tasks due soon.</p>}
  </section>;
}
