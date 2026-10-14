'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  FileCheck2,
  Copy,
  Eye,
  EyeOff,
  Headset,
  KeyRound,
  Laptop,
  Mail,
  LayoutDashboard,
  Monitor,
  Plus,
  Search,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  UserMinus,
  UserCog,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';

import { OnboardingEmails } from '@/components/onboarding-emails';
import { ManagerLogin } from '@/components/manager-login';
import { loadWorkspace, saveWorkspace, type Manager } from '@/lib/demo-db';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Section = 'overview' | 'people' | 'profiles' | 'timeline' | 'emails';
type JourneyType = 'onboarding' | 'offboarding';

type RoleProfile = {
  title: string;
  role?: string;
  area: string;
  tasks: number;
  groups: number;
  ready: boolean;
  icon?: typeof Boxes;
  manager?: string;
  hardware?: string;
};

type ProfileDraft = {
  profileName: string;
  businessLine: string;
  manager: string;
  specificRole: string;
  laptop: string;
  headset: boolean;
  software: string[];
  access: string[];
};

type Person = {
  id: string;
  name: string;
  initials: string;
  role: string;
  group: string;
  date: string;
  progress: number;
  status: 'blocked' | 'track' | 'complete' | 'offboarding';
  statusLabel: string;
  next: string;
  type: JourneyType;
  dateISO?: string;
  email?: string;
  manager?: string;
  blockedTasks?: string[];
};

const people: Person[] = [
  { id: 'maya', name: 'Maya Chen', initials: 'MC', role: 'Software Engineer', group: 'Canadian Banking', date: 'Starts Oct 12', progress: 78, status: 'blocked', statusLabel: '1 blocker', next: 'Laptop delivery', type: 'onboarding' },
  { id: 'noah', name: 'Noah Williams', initials: 'NW', role: 'Data Analyst', group: 'Solutions Architecture', date: 'Starts Oct 19', progress: 56, status: 'track', statusLabel: 'On track', next: 'VPN & access', type: 'onboarding' },
  { id: 'priya', name: 'Priya Shah', initials: 'PS', role: 'Business Analyst', group: 'Canadian Banking', date: 'Starts Nov 2', progress: 32, status: 'track', statusLabel: 'On track', next: 'Background check', type: 'onboarding' },
  { id: 'eli', name: 'Eli Martin', initials: 'EM', role: 'Software Developer', group: 'Canadian Banking', date: 'Starts Nov 9', progress: 22, status: 'track', statusLabel: 'On track', next: 'Equipment request', type: 'onboarding' },
  { id: 'sarah', name: 'Sarah Ahmed', initials: 'SA', role: 'Senior Analyst', group: 'Canadian Banking', date: 'Leaves Oct 16', progress: 64, status: 'offboarding', statusLabel: 'Offboarding', next: 'Asset return', type: 'offboarding' },
  { id: 'marcus', name: 'Marcus Lee', initials: 'ML', role: 'Solution Architect', group: 'Solutions Architecture', date: 'Started Sep 21', progress: 100, status: 'complete', statusLabel: 'Ready', next: 'Journey complete', type: 'onboarding' },
];

const taskSeed = [
  { id: 'offer', title: 'Offer and employee profile confirmed', owner: 'HR Onboarding', date: 'Completed Sep 29', done: true, icon: UserRoundCheck },
  { id: 'background', title: 'Background check cleared', owner: 'HR Onboarding', date: 'Completed Oct 1', done: true, icon: ShieldCheck },
  { id: 'equipment', title: 'Laptop and peripherals delivered', owner: 'Workplace Technology', date: 'Due Oct 9', done: false, icon: Laptop, blocked: true },
  { id: 'access', title: 'VPN and permission groups assigned', owner: 'Manager · you', date: 'Due Oct 9', done: false, icon: KeyRound },
  { id: 'welcome', title: 'First-week plan and team welcome', owner: 'Manager · you', date: 'Due Oct 11', done: false, icon: CalendarDays },
];

const businessLines = [
  'Canadian Banking',
  'International Banking',
  'Global Wealth Management',
  'Global Banking and Markets',
  'Enterprise Functions & Strategy',
  'Global Risk Management',
  'Global Finance',
  'Global Operations',
];

const softwareOptions = [
  'Copilot Premium',
  'Microsoft 365',
  'Jira',
  'IntelliJ IDEA',
  'MATLAB',
  'Bloomberg Terminal',
];

const accessOptions = ['ScotiaID', 'PIN', 'VPN access', 'Contract'];

const roleProfiles: RoleProfile[] = [
  { title: 'Software Engineer', area: 'Canadian Banking', tasks: 18, groups: 6, ready: true, icon: Boxes },
  { title: 'Data Analyst', area: 'Solutions Architecture', tasks: 15, groups: 4, ready: true, icon: FileCheck2 },
  { title: 'Business Analyst', area: 'Canadian Banking', tasks: 14, groups: 3, ready: true, icon: Users },
  { title: 'Software Developer', area: 'Canadian Banking', tasks: 17, groups: 6, ready: false, icon: Laptop },
];

export default function Home() {
  return <ManagerLogin>{(manager, logout) => <Workspace key={manager.id} manager={manager} onSignOut={logout} />}</ManagerLogin>;
}

function Workspace({ manager, onSignOut }: { manager: Manager; onSignOut: () => void }) {
  const [section, setSection] = useState<Section>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [customProfiles, setCustomProfiles] = useState<RoleProfile[]>([]);
  const [journeyType, setJourneyType] = useState<JourneyType>('onboarding');
  const [detail, setDetail] = useState<Person | null>(null);
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState<Person[]>(people);
  const [taskProgress, setTaskProgress] = useState<Record<string, string[]>>({maya: ['offer', 'background']});
  const [selectedProfile, setSelectedProfile] = useState('Software Engineer');
  const [storageReady, setStorageReady] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const [storageWarning, setStorageWarning] = useState('');

  useEffect(() => {
    let active = true;
    loadWorkspace<{roster: Person[]; tasks: Record<string, string[]>; profiles: RoleProfile[]}>(manager.id)
      .then((state) => {
        if (!active) return;
        setCanSave(true);
        if (!state) return;
        if (Array.isArray(state.roster) && state.roster.every((person) => typeof person.id === 'string' && typeof person.name === 'string' && typeof person.date === 'string' && typeof person.role === 'string' && typeof person.group === 'string')) setRoster(state.roster);
        if (state.tasks && typeof state.tasks === 'object' && Object.values(state.tasks).every((ids) => Array.isArray(ids) && ids.every((id) => typeof id === 'string'))) setTaskProgress(state.tasks);
        if (Array.isArray(state.profiles) && state.profiles.every((profile) => typeof profile.title === 'string' && typeof profile.area === 'string')) setCustomProfiles(state.profiles.map((profile) => ({...profile, icon: FileCheck2})));
      })
      .catch((reason: unknown) => { if (active) setStorageWarning(reason instanceof Error ? reason.message : 'Saved data could not be loaded.'); })
      .finally(() => { if (active) setStorageReady(true); });
    return () => { active = false; };
  }, [manager.id]);

  useEffect(() => {
    if (!storageReady || !canSave) return;
    let active = true;
    saveWorkspace(manager.id, {roster, tasks: taskProgress, profiles: customProfiles.map(({icon, ...profile}) => profile)})
      .then(() => { if (active) setStorageWarning(''); })
      .catch((reason: unknown) => { if (active) setStorageWarning(reason instanceof Error ? reason.message : 'Changes could not be saved.'); });
    return () => { active = false; };
  }, [manager.id, roster, taskProgress, customProfiles, storageReady, canSave]);

  function navigate(next: Section) {
    setSection(next);
    setSearch('');
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  const visibleRoster = roster.map((person) => {
    const tasks = tasksFor(person);
    const completed = taskProgress[person.id] ?? tasks.filter((task) => task.done).map((task) => task.id);
    const done = tasks.filter((task) => completed.includes(task.id));
    const progress = Math.round(done.length / tasks.length * 100);
    const blockerCount = tasks.filter((task) => task.blocked && !completed.includes(task.id)).length;
    const blocked = blockerCount > 0;
    return {...person, progress, status: progress === 100 ? 'complete' as const : blocked ? 'blocked' as const : person.type === 'offboarding' ? 'offboarding' as const : 'track' as const,
      statusLabel: progress === 100 ? 'Complete' : blocked ? `${blockerCount} ${blockerCount === 1 ? 'blocker' : 'blockers'}` : person.type === 'offboarding' ? 'Offboarding' : 'On track',
      next: tasks.find((task) => !completed.includes(task.id))?.title ?? 'Journey complete'};
  });
  const activeDetail = detail ? visibleRoster.find((person) => person.id === detail.id) ?? detail : null;
  const [notice, setNotice] = useState('');

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? visibleRoster.filter((person) => `${person.name} ${person.role} ${person.group}`.toLowerCase().includes(query)) : visibleRoster;
  }, [search, roster, taskProgress]);

  function launchJourney(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || 'New employee');
    const id = crypto.randomUUID();
    const role = String(form.get('role'));
    const dateISO = String(form.get('date'));
    const type = journeyType;
    const person: Person = {
      id, name, initials: name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
      role, group: String(form.get('area')), email: String(form.get('email')), manager: String(form.get('manager')),
      dateISO, date: `${type === 'onboarding' ? 'Starts' : 'Leaves'} ${new Date(dateISO + 'T12:00:00').toLocaleDateString('en-CA', {month: 'short', day: 'numeric', year: 'numeric'})}`,
      type, progress: 0, status: type === 'offboarding' ? 'offboarding' : 'track', statusLabel: type === 'offboarding' ? 'Offboarding' : 'On track', next: type === 'offboarding' ? 'Confirm departure date' : 'Confirm employee details',
    };
    setRoster((current) => [person, ...current]);
    setTaskProgress((current) => ({...current, [id]: []}));
    setCreateOpen(false);
    navigate('people');
    setNotice(`${type === 'onboarding' ? 'Onboarding' : 'Offboarding'} added for ${name}. Open their card to manage tasks.`);
  }

  function toggleTask(id: string, checked: boolean) {
    if (!activeDetail) return;
    const person = activeDetail;
    setTaskProgress((current) => {
      const existing = current[person.id] ?? tasksFor(person).filter((task) => task.done).map((task) => task.id);
      return {...current, [person.id]: checked ? [...new Set([...existing, id])] : existing.filter((task) => task !== id)};
    });
  }

  function toggleBlocker(taskId: string, flagged: boolean) {
    if (!activeDetail) return;
    setRoster((current) => current.map((person) => {
      if (person.id !== activeDetail.id) return person;
      const existing = person.blockedTasks ?? (person.id === 'maya' ? ['equipment'] : []);
      return {...person, blockedTasks: flagged ? [...new Set([...existing, taskId])] : existing.filter((id) => id !== taskId)};
    }));
  }

  async function removePerson() {
    if (!activeDetail) throw new Error('Choose a person first.');
    const completed = taskProgress[activeDetail.id] ?? tasksFor(activeDetail).filter((task) => task.done).map((task) => task.id);
    if (!canRemovePerson(activeDetail, completed)) throw new Error('Complete all offboarding tasks before removing this person.');
    if (!canSave) throw new Error('The database is unavailable. Try again after reconnecting.');
    const nextRoster = roster.filter((person) => person.id !== activeDetail.id);
    const nextTasks = {...taskProgress};
    delete nextTasks[activeDetail.id];
    await saveWorkspace(manager.id, {roster: nextRoster, tasks: nextTasks, profiles: customProfiles.map(({icon, ...profile}) => profile)});
    setRoster(nextRoster);
    setTaskProgress(nextTasks);
    setDetail(null);
    setNotice(`${activeDetail.name} was removed after completed offboarding.`);
    navigate('people');
  }

  function saveRoleProfile(profile: ProfileDraft) {
    const itemCount = 1 + Number(profile.headset) + profile.software.length + profile.access.length;
    setCustomProfiles((current) => [{
      title: profile.profileName,
      role: profile.specificRole,
      area: profile.businessLine,
      tasks: itemCount,
      groups: profile.access.length,
      ready: true,
      icon: FileCheck2,
      manager: profile.manager,
      hardware: profile.headset ? `${profile.laptop} · Jabra Evolve2 50` : profile.laptop,
    }, ...current]);
    setProfileOpen(false);
    setNotice(`${profile.profileName} role profile saved.`);
  }

  const completedTasks = activeDetail ? taskProgress[activeDetail.id] ?? tasksFor(activeDetail).filter((task) => task.done).map((task) => task.id) : [];
  const detailProgress = activeDetail ? Math.round(completedTasks.length / tasksFor(activeDetail).length * 100) : 0;

  if (!storageReady) return <main className="grid min-h-screen place-items-center"><p role="status">Loading saved journeys…</p></main>;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#191919]">
      <a href="#workspace" className="skip-link">Skip to main content</a>
      <Sidebar section={section} onSection={navigate} onSignOut={onSignOut} />

      <section className="min-h-screen lg:pl-[236px]">
        <TopBar
          emailSearch={section === 'emails'}
          onSignOut={onSignOut}
          search={search}
          onSearch={setSearch}
          onCreate={() => { setSelectedProfile('Software Engineer'); setCreateOpen(true); }}
        />

        <nav className="mobile-nav page-gutter lg:hidden" aria-label="Main navigation">
          {(['overview', 'people', 'profiles', 'timeline', 'emails'] as const).map((item) => <button key={item} onClick={() => navigate(item)} aria-current={section === item ? 'page' : undefined}>{({overview: 'Overview', people: 'People', profiles: 'Role profiles', timeline: 'Timeline', emails: 'Emails'})[item]}</button>)}
        </nav>
        <div id="workspace" ref={headingRef} tabIndex={-1} className="page-shell py-8 scroll-mt-24">
          {storageWarning && <p role="status" className="mb-4 text-sm">{storageWarning}</p>}
          {section === 'overview' && (
            <Overview
              people={filteredPeople}
              taskProgress={taskProgress}
              onOpenPerson={setDetail}
              onSection={navigate}
            />
          )}
          {section === 'people' && <PeopleView onClear={() => setSearch('')} people={filteredPeople} onOpenPerson={setDetail} />}
          {section === 'profiles' && (
            <ProfilesView
              customProfiles={customProfiles}
              onNewProfile={() => setProfileOpen(true)}
              onUseProfile={(profile) => { setSelectedProfile(profile.title); setJourneyType('onboarding'); setCreateOpen(true); }}
            />
          )}
          {section === 'timeline' && <TimelineView people={filteredPeople} onOpenPerson={setDetail} />}
          {section === 'emails' && <OnboardingEmails search={search} onOpenPerson={(id) => { const person = visibleRoster.find((item) => item.id === id); if (person) setDetail(person); }} employees={visibleRoster.map(({id, name}) => ({id, name}))} />}
        </div>
      </section>

      <JourneyDialog profiles={[...customProfiles, ...roleProfiles]} selectedProfile={selectedProfile} open={createOpen} onOpenChange={setCreateOpen} type={journeyType} onType={setJourneyType} onSubmit={launchJourney} />
      <RoleProfileDialog open={profileOpen} onOpenChange={setProfileOpen} onSave={saveRoleProfile} />
      <PersonDialog key={detail?.id ?? 'closed'} person={activeDetail} onClose={() => setDetail(null)} completedTasks={completedTasks} onToggleTask={toggleTask} onToggleBlocker={toggleBlocker} onRemove={removePerson} progress={detailProgress} />

      {notice && (
        <div role="status" className="fixed bottom-4 left-4 right-4 z-[70] flex max-w-sm sm:left-auto items-center gap-3 rounded-xl border border-black/10 bg-[#1c1b1a] px-4 py-3.5 text-sm font-medium text-white shadow-2xl shadow-black/20">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#3baf62]"><Check aria-hidden="true" className="size-4" /></span>
          <span className="leading-relaxed">{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice('')} className="ml-2 grid size-11 shrink-0 place-items-center text-white/75"><X aria-hidden="true" className="size-4" /></button>
        </div>
      )}
    </main>
  );
}

function Sidebar({ section, onSection, onSignOut }: { section: Section; onSection: (section: Section) => void; onSignOut: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[236px] flex-col border-r border-black/[0.07] bg-[#121212] text-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <img src="/scotiabank-logo.svg" alt="Scotiabank" width={36} height={40} className="h-10 w-9 shrink-0 object-contain" />
        <p className="text-lg font-semibold tracking-tight">ScotiaOn</p>
      </div>
      <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
        <NavItem icon={<LayoutDashboard />} label="Overview" active={section === 'overview'} onClick={() => onSection('overview')} />
        <NavItem icon={<Users />} label="People" active={section === 'people'} onClick={() => onSection('people')} />
        <NavItem icon={<FileCheck2 />} label="Role profiles" active={section === 'profiles'} onClick={() => onSection('profiles')} />
        <NavItem icon={<CalendarDays />} label="Timeline" active={section === 'timeline'} onClick={() => onSection('timeline')} />
        <NavItem icon={<Mail />} label="Emails" active={section === 'emails'} onClick={() => onSection('emails')} />
      </nav>
      <div className="px-4 pb-4"><button onClick={onSignOut} className="flex min-h-11 w-full items-center rounded-lg border border-white/20 px-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white">Sign out</button></div>
      <div className="flex items-center gap-3 border-t border-white/10 p-4">
        <div className="grid size-9 place-items-center rounded-md bg-[#5b3f8c] text-sm font-bold">JW</div>
        <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">Jordan Wallace</p><p className="mt-1 break-words text-xs text-white/75">People Manager</p></div>
      </div>
    </aside>
  );
}

function TopBar({ search, onSearch, onCreate, onSignOut, emailSearch }: { emailSearch: boolean; search: string; onSearch: (value: string) => void; onCreate: () => void; onSignOut: () => void }) {
  return (
    <header className="page-gutter sticky top-0 z-10 flex min-h-20 flex-wrap items-center justify-between gap-y-3 py-3 border-b border-black/[0.06] bg-[#f7f7f5]/90 backdrop-blur-xl">
      <div className="relative min-w-0 basis-full sm:basis-auto sm:flex-1 sm:max-w-md"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/70" /><Input type="search" aria-label={emailSearch ? 'Search emails' : 'Search people by name, role or team'} value={search} onChange={(event) => onSearch(event.target.value)} placeholder={emailSearch ? 'Search emails' : 'Search people'} className="h-11 rounded-lg border-black/20 bg-white pl-10 pr-3 text-sm" /></div>
      <Button variant="outline" onClick={onSignOut} className="min-h-11 rounded-lg px-3 text-sm lg:hidden">Sign out</Button>
      <Button onClick={onCreate} className="ml-auto h-11 rounded-lg px-4 text-sm"><Plus aria-hidden="true" /> Add person</Button>
    </header>
  );
}

function Overview({ people, taskProgress, onOpenPerson, onSection }: { people: Person[]; taskProgress: Record<string, string[]>; onOpenPerson: (person: Person) => void; onSection: (section: Section) => void }) {
  const readiness = people.length ? Math.round(people.reduce((total, person) => total + person.progress, 0) / people.length) : 0;
  const completedCount = people.filter((person) => person.progress === 100).length;
  const blockers = people.flatMap((person) => openBlockers(person, taskProgress[person.id]).map((task) => ({person, task})));
  const activePeople = people.filter((person) => person.progress < 100 && person.type === 'onboarding').slice(0, 3);
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your team at a glance.</h1><p className="mt-2 text-sm text-black/70">Here’s what needs your attention across your team.</p></div>
        <button onClick={() => onSection('timeline')} className="flex items-center gap-2 self-start text-sm font-semibold text-black/70 transition hover:text-black sm:self-auto"><CalendarDays aria-hidden="true" className="size-4" /> View team calendar</button>
      </div>

      <div className="mb-6 space-y-4">
        <section aria-labelledby="readiness-heading" className="w-full rounded-xl border border-black/[0.06] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 id="readiness-heading" className="text-lg font-semibold">Team readiness</h2><p className="mt-1 text-sm text-black/70">Average checklist completion across {people.length} journeys</p></div><span className="text-4xl font-semibold tracking-tight">{readiness}%</span></div>
          <Progress aria-label="Average team checklist completion" value={readiness} className="mt-4 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-[#eee] [&_[data-slot=progress-indicator]]:bg-[#36a35d]" />
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-black/10 pt-4">
            <div><dt className="text-xs text-black/70">Completed</dt><dd className="mt-1 text-xl font-semibold">{completedCount}</dd></div>
            <div><dt className="text-xs text-black/70">In progress</dt><dd className="mt-1 text-xl font-semibold">{people.length - completedCount}</dd></div>
            <div><dt className="text-xs text-black/70">Open blockers</dt><dd className="mt-1 text-xl font-semibold">{blockers.length}</dd></div>
          </dl>
        </section>
        <section aria-labelledby="blockers-heading" className="w-full rounded-xl border border-black/10 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 id="blockers-heading" className="text-base font-semibold">Blockers</h2><span className="text-sm font-semibold text-black/70">{blockers.length} open</span></div>
          {blockers.length ? <ul aria-label="Open blockers" tabIndex={0} className="flex snap-x snap-proximity gap-3 overflow-x-auto pb-3">{blockers.map(({person, task}) => <li key={`${person.id}-${task.id}`} className="w-72 max-w-[85vw] shrink-0 snap-start">
            <button onClick={() => onOpenPerson(person)} className="flex h-full w-full items-start gap-3 rounded-lg border-l-2 border-[#c68016] bg-[#fff9ef] p-3 text-left hover:bg-[#fff2dc]">
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{person.name}</span><span className="mt-1 block text-sm leading-relaxed">{person.id === 'maya' && task.id === 'equipment' ? 'Laptop may arrive after day one' : task.title}</span><span className="mt-2 block text-xs leading-relaxed text-black/70">{task.owner} · {task.date}</span></span><ArrowRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-black/60" />
            </button>
          </li>)}</ul> : <p className="flex items-center gap-2 py-3 text-sm text-[#216a3c]"><CheckCircle2 aria-hidden="true" className="size-4" />No open blockers.</p>}
        </section>
      </div>

      <div className="mb-6 rounded-xl border border-black/[0.06] bg-white p-6">
        <div className="mb-6 flex items-center justify-between"><div><h2 className="text-lg font-semibold tracking-tight">Active journeys</h2><p className="mt-1 text-sm text-black/70">The next milestone for each person on your team.</p></div><button onClick={() => onSection('people')} className="text-sm font-semibold text-black/70 transition hover:text-black">View all <ArrowRight aria-hidden="true" className="ml-1 inline size-3.5" /></button></div>
        {activePeople.length ? <div className="grid gap-4 xl:grid-cols-3">{activePeople.map((person) => <PersonCard key={person.id} person={person} onOpen={() => onOpenPerson(person)} />)}</div> : <EmptySearch onClear={() => onSection('people')} />}
      </div>


    </>
  );
}

function PeopleView({ people, onOpenPerson, onClear }: { people: Person[]; onOpenPerson: (person: Person) => void; onClear: () => void }) {
  const [filter, setFilter] = useState<'all' | JourneyType>('all');
  const [completion, setCompletion] = useState<'all' | 'progress' | 'complete'>('all');
  const shown = people.filter((person) => (filter === 'all' || person.type === filter) && (completion === 'all' || (completion === 'complete' ? person.progress === 100 : person.progress < 100)));
  return (
    <>
      <PageHeading title="Your team’s journeys" description="Track start dates, departures, tasks, and requests in one place."  />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div role="group" aria-label="Journey type" className="flex flex-wrap gap-2">{(['all', 'onboarding', 'offboarding'] as const).map((item) => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)} className={`border-b-2 px-4 py-2 text-sm font-semibold capitalize transition ${filter === item ? 'border-[#191919] text-black' : 'border-transparent text-black/70 hover:border-black/30 hover:text-black'}`}>{item}</button>)}</div>
        <label className="flex flex-wrap items-center gap-3 text-sm font-medium">Completion
          <NativeSelect aria-label="Filter by completion" value={completion} onChange={(event) => setCompletion(event.target.value as typeof completion)} className="w-44 bg-white">
            <NativeSelectOption value="all">All statuses</NativeSelectOption><NativeSelectOption value="progress">In progress</NativeSelectOption><NativeSelectOption value="complete">Completed</NativeSelectOption>
          </NativeSelect>
        </label>
      </div>
      <p role="status" className="mb-4 text-sm text-black/70">{shown.length} {shown.length === 1 ? 'journey' : 'journeys'}</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map((person) => <PersonCard key={person.id} person={person} onOpen={() => onOpenPerson(person)} expanded />)}</div>
      {!shown.length && <EmptySearch onClear={() => { setFilter('all'); setCompletion('all'); onClear(); }} />}
    </>
  );
}

function ProfilesView({ customProfiles, onNewProfile, onUseProfile }: { customProfiles: RoleProfile[]; onNewProfile: () => void; onUseProfile: (profile: RoleProfile) => void }) {
  const profiles = [...customProfiles, ...roleProfiles];
  return (
    <>
      <PageHeading title="Reusable role profiles" description="Set the equipment, software, and access each role needs." action={<Button onClick={onNewProfile} className="h-10 rounded-lg bg-[#ec111a] px-4 text-sm"><Plus /> New profile</Button>} />

      <div className="grid gap-4 md:grid-cols-2">{profiles.map((profile, index) => { const Icon = profile.icon ?? FileCheck2; return <article key={`${profile.title}-${profile.area}-${index}`} className="group rounded-xl border border-black/[0.06] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/[0.04]"><div className="flex items-start justify-between"><div className="grid size-11 place-items-center rounded-xl bg-[#f1efec] text-black/70"><Icon aria-hidden="true" className="size-5" /></div><Badge variant="outline" className={`rounded-sm text-xs ${profile.ready ? 'border-[#d4e8d9] bg-[#f0f8f2] text-[#288048]' : 'border-[#f0ddba] bg-[#fff6e6] text-[#9b5c00]'}`}>{profile.ready ? 'Ready to use' : 'Needs review'}</Badge></div><h3 className="mt-5 text-lg font-semibold tracking-tight">{profile.title}</h3><p className="mt-1 text-sm text-black/70">{profile.role ? `${profile.role} · ` : ''}{profile.area}</p>{profile.manager && <p className="mt-3 text-sm text-black/70">Managed by <span className="font-semibold text-black/65">{profile.manager}</span></p>}{profile.hardware && <p className="mt-1 break-words text-sm text-black/70">{profile.hardware}</p>}<div className="mt-6 flex gap-6 border-t border-black/[0.06] pt-4"><div><p className="text-sm font-semibold">{profile.tasks}</p><p className="mt-1 text-xs text-black/70">Profile items</p></div><div><p className="text-sm font-semibold">{profile.groups}</p><p className="mt-1 text-xs text-black/70">Access items</p></div><button onClick={() => onUseProfile(profile)} className="ml-auto self-end text-xs font-semibold text-black/70 transition group-hover:text-black">Use profile <ArrowRight aria-hidden="true" className="ml-1 inline size-3" /></button></div></article>; })}</div>
    </>
  );
}

function TimelineView({ people, onOpenPerson }: { people: Person[]; onOpenPerson: (person: Person) => void }) {
  function dateFor(person: Person) {
    if (person.dateISO) return person.dateISO;
    const month = person.date.includes('Sep') ? '09' : person.date.includes('Nov') ? '11' : '10';
    return `2026-${month}-${person.date.match(/\d+/)?.[0].padStart(2, '0') ?? '01'}`;
  }
  const groups = new Map<string, Person[]>();
  [...people].sort((a, b) => dateFor(a).localeCompare(dateFor(b))).forEach((person) => {
    const date = dateFor(person);
    groups.set(date, [...(groups.get(date) ?? []), person]);
  });
  return <>
    <PageHeading title="Start dates and departures" description="A simple view of who is joining or leaving. Select a person to review their tasks." />
    <ol className="date-rail">{[...groups].map(([date, group]) => {
      const day = new Date(date + 'T12:00:00');
      return <li key={date} className="date-rail-group">
        <time dateTime={date} className="date-rail-date"><span className="text-xs font-medium uppercase tracking-wide text-black/70">{day.toLocaleDateString('en-CA', {month: 'short', year: 'numeric'})}</span><span className="mt-1 block text-2xl font-semibold">{day.getDate()}</span></time>
        <span aria-hidden="true" className="date-rail-dot" />
        <ul className="min-w-0 space-y-3">{group.map((person) => <li key={person.id}>
          <button onClick={() => onOpenPerson(person)} className="flex w-full flex-wrap items-center justify-between gap-4 rounded-lg border border-black/10 bg-white p-5 text-left hover:border-black/30">
            <span className="min-w-0"><span className="block font-semibold">{person.name}</span><span className="mt-1 block text-sm text-black/70">{person.role}</span></span>
            <span className="flex items-center gap-2 text-sm font-medium">{person.type === 'onboarding' ? <UserRoundCheck aria-hidden="true" className="size-4 text-[#288048]" /> : <UserMinus aria-hidden="true" className="size-4 text-[#6952a3]" />}{person.type === 'onboarding' ? 'Joining' : 'Leaving'}<ArrowRight aria-hidden="true" className="ml-2 size-4 text-black/60" /></span>
          </button>
        </li>)}</ul>
      </li>;
    })}</ol>
    {!people.length && <p role="status">No people match your search.</p>}
  </>;
}

function PersonCard({ person, onOpen, expanded = false }: { person: Person; onOpen: () => void; expanded?: boolean }) {
  return (
    <button onClick={onOpen} className={`group rounded-xl border border-black/[0.07] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-lg hover:shadow-black/[0.04] ${expanded ? 'min-h-[220px]' : ''}`}>
      <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f0eeeb] text-sm font-bold text-black/70">{person.initials}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="break-words text-sm font-semibold">{person.name}</h3><StatusBadge status={person.status} label={person.statusLabel} /></div><p className="mt-1 break-words text-xs text-black/70">{person.role} · {person.group}</p></div></div>
      {expanded && <div className="mt-5 flex gap-2"><span className="rounded-lg bg-[#f6f5f2] px-2.5 py-1.5 text-xs font-semibold text-black/70">{person.type === 'onboarding' ? 'Onboarding' : 'Offboarding'}</span><span className="rounded-lg bg-[#f6f5f2] px-2.5 py-1.5 text-xs font-semibold text-black/70">{person.group}</span></div>}
      <div className={`${expanded ? 'mt-6' : 'mt-5'} flex items-center justify-between text-xs`}><span className="font-semibold text-black/70">{person.date}</span><span className="text-black/70">{person.progress}% complete</span></div><Progress aria-label={`${person.name} journey completion`} value={person.progress} className={`mt-2 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-[#eee] ${person.status === 'complete' ? '[&_[data-slot=progress-indicator]]:bg-[#36a35d]' : '[&_[data-slot=progress-indicator]]:bg-[#ec111a]'}`} />
      <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3 text-xs"><span className="text-black/70">Next: <b className="font-semibold text-black/70">{person.next}</b></span><ArrowRight aria-hidden="true" className="size-3.5 text-black/70 transition group-hover:translate-x-0.5 group-hover:text-black" /></div>
    </button>
  );
}

function StatusBadge({ status, label }: { status: Person['status']; label: string }) {
  const style = status === 'blocked' ? 'text-[#855000]' : status === 'complete' ? 'text-[#216a3c]' : status === 'offboarding' ? 'text-[#6952a3]' : 'text-[#326a9d]';
  return <span className={`shrink-0 text-xs font-semibold ${style}`}>{label}</span>;
}


function JourneyDialog({ profiles, selectedProfile, open, onOpenChange, type, onType, onSubmit }: { profiles: RoleProfile[]; selectedProfile: string; open: boolean; onOpenChange: (open: boolean) => void; type: JourneyType; onType: (type: JourneyType) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto rounded-xl p-0 sm:max-w-[640px]">
        <form key={`${selectedProfile}-${open}`} onSubmit={onSubmit}>
          <DialogHeader className="px-6 pb-5 pt-6"><div className="mb-3 grid size-10 place-items-center rounded-lg bg-[#fff0f0] text-[#ec111a]">{type === 'onboarding' ? <UserRoundCheck aria-hidden="true" className="size-5" /> : <UserMinus aria-hidden="true" className="size-5" />}</div><DialogTitle className="text-xl font-semibold tracking-tight">Add a person</DialogTitle><DialogDescription>Create a checklist based on the person’s role and start or departure date.</DialogDescription></DialogHeader>
          <div className="px-6 pb-6"><div role="group" aria-label="Journey type" className="mb-6 grid grid-cols-2 rounded-lg bg-[#f2f1ee] p-1"><button type="button" aria-pressed={type === 'onboarding'} onClick={() => onType('onboarding')} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${type === 'onboarding' ? 'bg-white text-black shadow-sm' : 'text-black/70'}`}>Onboarding</button><button type="button" aria-pressed={type === 'offboarding'} onClick={() => onType('offboarding')} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${type === 'offboarding' ? 'bg-white text-black shadow-sm' : 'text-black/70'}`}>Offboarding</button></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Employee name (required)"><Input required name="name" autoComplete="name" placeholder="e.g. Taylor Morgan" className="h-10 rounded-lg bg-white" /></Field><Field label="Work email (required)"><Input required name="email" autoComplete="email" type="email" placeholder="name@scotiabank.com" className="h-10 rounded-lg bg-white" /></Field><Field label="Business area"><NativeSelect defaultValue={profiles.find((profile) => profile.title === selectedProfile)?.area} name="area" className="w-full [&_select]:h-10 [&_select]:rounded-lg">{[...new Set([...businessLines, 'Solutions Architecture', 'Global Technology'])].map((area) => <NativeSelectOption key={area}>{area}</NativeSelectOption>)}</NativeSelect></Field><Field label="Role profile"><NativeSelect defaultValue={selectedProfile} name="role" className="w-full [&_select]:h-10 [&_select]:rounded-lg">{profiles.map((profile) => <NativeSelectOption key={profile.title} value={profile.title}>{profile.title}</NativeSelectOption>)}</NativeSelect></Field><Field label={type === 'onboarding' ? 'Start date (required)' : 'Last working day (required)'}><Input required name="date" type="date" className="h-10 rounded-lg bg-white" /></Field><Field label="Manager"><Input name="manager" defaultValue="Jordan Wallace" className="h-10 rounded-lg bg-[#f7f7f5]" /></Field></div>
          </div>
          <DialogFooter className="mx-0 mb-0 rounded-none border-black/[0.06] bg-[#f7f7f5] px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 rounded-lg bg-white px-4 text-sm">Cancel</Button><Button type="submit" variant={type === 'offboarding' ? 'destructive' : 'default'} className="h-10 rounded-lg px-4 text-sm">{type === 'offboarding' ? <UserMinus /> : <ArrowRight />}{type === 'offboarding' ? 'Add offboarding' : 'Add onboarding'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleProfileDialog({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (profile: ProfileDraft) => void }) {
  const [laptop, setLaptop] = useState('MacBook M1');
  const [headset, setHeadset] = useState(true);
  const [software, setSoftware] = useState<string[]>(['Microsoft 365']);
  const [access, setAccess] = useState<string[]>(['ScotiaID', 'PIN', 'VPN access', 'Contract']);

  function toggleSelection(item: string, selected: boolean, current: string[], update: (items: string[]) => void) {
    update(selected ? [...new Set([...current, item])] : current.filter((value) => value !== item));
  }

  function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      profileName: String(form.get('profileName')),
      businessLine: String(form.get('businessLine')),
      manager: String(form.get('manager')),
      specificRole: String(form.get('specificRole')),
      laptop,
      headset,
      software,
      access,
    });
  }

  const totalItems = 1 + Number(headset) + software.length + access.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[760px]">
        <form onSubmit={submitProfile}>
          <DialogHeader className="border-b border-black/[0.06] p-6">
            <div className="mb-3 grid size-11 place-items-center rounded-xl bg-[#fff0f0] text-[#ec111a]"><BriefcaseBusiness aria-hidden="true" className="size-5" /></div>
            <DialogTitle className="text-xl font-semibold tracking-tight">Create a role profile</DialogTitle>
            <DialogDescription>Choose the equipment, software licences, and access for this role.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(94dvh-210px)] space-y-6 overflow-y-auto p-6">
            <section>
              <SectionHeading icon={<Building2 />} title="Role details" description="Name the profile and choose its manager." />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Profile name"><Input required name="profileName" placeholder="e.g. Canadian Banking Engineer" className="h-10 rounded-lg bg-white" /></Field>
                <Field label="Business line"><NativeSelect name="businessLine" className="w-full [&_select]:h-10 [&_select]:rounded-lg">{businessLines.map((line) => <NativeSelectOption key={line} value={line}>{line}</NativeSelectOption>)}</NativeSelect></Field>
                <Field label="Manager name"><Input required name="manager" defaultValue="Jordan Wallace" className="h-10 rounded-lg bg-white" /></Field>
                <Field label="Specific role"><Input required name="specificRole" placeholder="e.g. Software Engineer" className="h-10 rounded-lg bg-white" /></Field>
              </div>
            </section>

            <section>
              <SectionHeading icon={<Monitor />} title="Hardware" description="Choose the standard laptop and headset for this role." />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="rounded-xl border border-black/[0.07] bg-[#faf9f7] p-4">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Laptop aria-hidden="true" className="size-4 text-black/70" /> Laptop</span>
                  <NativeSelect value={laptop} onChange={(event) => setLaptop(event.target.value)} className="mt-3 w-full [&_select]:h-10 [&_select]:rounded-lg [&_select]:bg-white">
                    <NativeSelectOption value="MacBook M1">MacBook M1</NativeSelectOption>
                    <NativeSelectOption value="ThinkPad EOOSA00Q65Z">ThinkPad EOOSA00Q65Z</NativeSelectOption>
                  </NativeSelect>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${headset ? 'border-[#efbfc1] bg-[#fff7f7]' : 'border-black/[0.07] bg-[#faf9f7]'}`}>
                  <Checkbox checked={headset} onCheckedChange={(checked) => setHeadset(checked === true)} className="mt-0.5" />
                  <span><span className="flex items-center gap-2 text-sm font-semibold"><Headset aria-hidden="true" className="size-4 text-black/70" /> Jabra Evolve2 50</span><span className="mt-2 block text-sm leading-relaxed text-black/70">Include the standard wired headset in this profile.</span></span>
                </label>
              </div>
            </section>

            <section>
              <SectionHeading icon={<FileCheck2 />} title="Software licences" description="Select every paid or managed application required for the role." />
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{softwareOptions.map((item) => { const selected = software.includes(item); return <label key={item} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition ${selected ? 'border-[#efbfc1] bg-[#fff7f7]' : 'border-black/[0.07] bg-white hover:bg-black/[0.02]'}`}><Checkbox checked={selected} onCheckedChange={(checked) => toggleSelection(item, checked === true, software, setSoftware)} /><span className="text-sm font-medium">{item}</span></label>; })}</div>
            </section>

            <section>
              <SectionHeading icon={<UserCog />} title="Scotia profile" description="Choose the accounts and access this role needs." />
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{accessOptions.map((item) => { const selected = access.includes(item); return <label key={item} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 transition ${selected ? 'border-[#efbfc1] bg-[#fff7f7]' : 'border-black/[0.07] bg-white hover:bg-black/[0.02]'}`}><Checkbox checked={selected} onCheckedChange={(checked) => toggleSelection(item, checked === true, access, setAccess)} /><span className="text-sm font-medium">{item}</span></label>; })}</div>
            </section>

            <div className="flex items-center justify-between rounded-xl bg-[#24201f] px-4 py-3.5 text-white">
              <div><p className="text-sm font-semibold">Profile summary</p><p className="mt-1 text-sm text-white/75">{software.length} software licences · {access.length} Scotia access items</p></div>
              <span className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold">{totalItems} items</span>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none border-black/[0.06] bg-[#f7f7f5] px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 rounded-lg bg-white px-4 text-sm">Cancel</Button>
            <Button type="submit" className="h-10 rounded-lg bg-[#ec111a] px-4 text-sm hover:bg-[#c80d15]"><Save aria-hidden="true" className="size-4" /> Save role profile</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f2f0ed] text-black/70 [&_svg]:size-4">{icon}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-black/70">{description}</p></div></div>;
}

function tasksFor(person: Person) {
  if (person.type === 'offboarding') return [
    {id: 'departure', title: 'Confirm departure date and HR records', owner: 'HR', date: person.date, done: false, icon: UserMinus, blocked: false},
    {id: 'handover', title: 'Complete handover and save team files', owner: 'Manager', date: person.date, done: false, icon: FileCheck2, blocked: false},
    {id: 'return', title: 'Return laptop and other equipment', owner: 'Employee', date: person.date, done: false, icon: Laptop, blocked: false},
    {id: 'revoke', title: 'Remove account and system access', owner: 'IT', date: person.date, done: false, icon: KeyRound, blocked: false},
  ].map((task, index) => ({...task, done: person.id === 'sarah' && index < 2, blocked: (person.blockedTasks ?? []).includes(task.id)}));
  return taskSeed.map((task, index) => ({...(person.id === 'maya' ? task : {...task, date: person.date, done: index < Math.round(person.progress / 100 * taskSeed.length)}), blocked: (person.blockedTasks ?? (person.id === 'maya' ? ['equipment'] : [])).includes(task.id)}));
}

function openBlockers(person: Person, completed?: string[]) {
  const tasks = tasksFor(person);
  const done = completed ?? tasks.filter((task) => task.done).map((task) => task.id);
  return tasks.filter((task) => task.blocked && !done.includes(task.id));
}

function canRemovePerson(person: Person, completed: string[]) {
  return person.type === 'offboarding' && tasksFor(person).every((task) => completed.includes(task.id));
}

function PersonDialog({ person, onClose, completedTasks, onToggleTask, onToggleBlocker, onRemove, progress }: { person: Person | null; onClose: () => void; completedTasks: string[]; onToggleTask: (id: string, checked: boolean) => void; onToggleBlocker: (id: string, flagged: boolean) => void; onRemove: () => Promise<void>; progress: number }) {
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [revealedCodes, setRevealedCodes] = useState<string[]>([]);
  const [remindedDevices, setRemindedDevices] = useState<string[]>([]);
  const [profileNotice, setProfileNotice] = useState('');

  const accessItems = [
    { id: 'jira', product: 'Jira', request: 'RITM001842', state: 'Code ready', source: 'Outlook', kind: 'Activation code', value: 'JIRA-DEMO-4X7Q-92LM', expires: 'Expires in 23 hours', ready: true },
    { id: 'intellij', product: 'IntelliJ IDEA', request: 'RITM001856', state: 'Licence ready', source: 'Outlook', kind: 'Licence key', value: 'IJ-DEMO-82KQ-51NX', expires: 'Valid for 12 months', ready: true },
    { id: 'm365', product: 'Microsoft 365', request: 'RITM001878', state: 'Temporary access', source: 'ServiceNow', kind: 'Temporary password', value: 'Temp-Demo-749!', expires: 'Reset required at first sign-in', ready: true },
    { id: 'bloomberg', product: 'Bloomberg Terminal', request: 'RITM001870', state: 'Awaiting approval', source: 'ServiceNow', kind: 'Manager approval', value: '', expires: 'Submitted Oct 7', ready: false },
  ];

  const devices = person?.id === 'maya'
    ? [
        { id: 'laptop', name: 'MacBook Pro 14-inch', icon: Laptop, asset: 'SCB-LT-04821', current: 'macOS 15.2', latest: 'macOS 15.3', checked: 'Checked 2 hours ago', update: true },
        { id: 'phone', name: 'iPhone 15', icon: Smartphone, asset: 'SCB-MOB-1098', current: 'iOS 18.1', latest: 'iOS 18.2', checked: 'Checked today', update: true },
        { id: 'headset', name: 'Jabra Evolve2 50', icon: Headset, asset: 'SCB-AUD-7714', current: 'Firmware 1.0.9', latest: 'Firmware 1.0.9', checked: 'Checked yesterday', update: false },
      ]
    : [
        { id: 'laptop', name: 'ThinkPad T14', icon: Laptop, asset: 'SCB-LT-05244', current: 'Windows 11 24H2', latest: 'Windows 11 24H2', checked: 'Checked today', update: false },
        { id: 'phone', name: 'iPhone 14', icon: Smartphone, asset: 'SCB-MOB-0862', current: 'iOS 18.1', latest: 'iOS 18.2', checked: 'Checked today', update: true },
        { id: 'headset', name: 'Jabra Evolve2 50', icon: Headset, asset: 'SCB-AUD-6851', current: 'Firmware 1.0.9', latest: 'Firmware 1.0.9', checked: 'Checked yesterday', update: false },
      ];

  async function confirmRemove() {
    if (removing) return;
    setRemoving(true); setRemoveError('');
    try { await onRemove(); }
    catch (reason) { setRemoveError(reason instanceof Error ? reason.message : 'Could not remove this person. Try again.'); }
    finally { setRemoving(false); }
  }

  function flash(message: string) {
    setProfileNotice(message);
  }

  function toggleCode(id: string) {
    setRevealedCodes((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function copyCode(value: string, product: string) {
    try { await navigator.clipboard.writeText(value); flash(`${product} code copied.`); }
    catch { flash('Could not copy the code. Select the revealed code and copy it manually.'); }
  }

  function remind(deviceId: string, deviceName: string) {
    setRemindedDevices((current) => [...new Set([...current, deviceId])]);
    const body = `Hi ${person?.name.split(' ')[0]}, please connect to VPN, install the required update for your ${deviceName}, and restart it. Thank you.`;
    window.location.href = `mailto:${encodeURIComponent(person?.email ?? '')}?subject=${encodeURIComponent('Device update reminder')}&body=${encodeURIComponent(body)}`;
    flash('Email draft opened in your mail app. Review it and send when ready.');
  }

  const updateCount = devices.filter((device) => device.update).length;

  return (
    <Dialog open={Boolean(person)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94dvh] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[900px]">
        {person && <>
          <div className="bg-[#23201f] p-6 text-white">
            <DialogHeader><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10 text-sm font-bold">{person.initials}</div><div className="min-w-0 flex-1"><DialogTitle className="text-xl text-white">{person.name}</DialogTitle><DialogDescription className="mt-1 text-white/75">{person.role} · {person.group}</DialogDescription></div><StatusBadge status={person.status} label={person.statusLabel} /></div></DialogHeader>
          </div>

          <Tabs defaultValue="overview" className="min-h-0 flex-1 gap-0">
            <div className="border-b border-black/[0.06] bg-white px-6">
              <TabsList variant="line" className="min-h-12 w-full justify-start gap-2">
                <TabsTrigger value="overview" className="flex-none px-1 text-sm sm:text-sm">Tasks</TabsTrigger>
                <TabsTrigger value="access" className="flex-none px-1 text-sm sm:text-sm">Access <span className="rounded-md bg-[#edf5ff] px-1.5 py-0.5 text-xs text-[#326a9d]">3</span></TabsTrigger>
                <TabsTrigger value="devices" className="flex-none px-1 text-sm sm:text-sm">Devices {updateCount > 0 && <span className="rounded-md bg-[#fff2dc] px-1.5 py-0.5 text-xs text-[#9b5c00]">{updateCount}</span>}</TabsTrigger>
              </TabsList>
            </div>

            <div className="max-h-[calc(94dvh-205px)] overflow-y-auto bg-[#f7f7f5]">
              <TabsContent value="overview" className="p-6">
                <div className="mb-6 flex items-center justify-between"><div><h3 className="text-base font-semibold">Journey checklist</h3><p className="mt-1 text-sm text-black/70">Check off completed tasks. Changes are saved in SQLite.</p></div><Badge variant="outline" className="text-sm">{person.date}</Badge></div>
                <div className="mb-5 rounded-xl border border-black/[0.06] bg-white p-4"><div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-black/70">Journey progress</span><span className="text-black/70">{progress}% complete</span></div><Progress aria-label="Journey completion" value={progress} className="[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-black/[0.06] [&_[data-slot=progress-indicator]]:bg-[#ec111a]" /></div>
                <div className="space-y-2">{tasksFor(person).map((task) => { const Icon = task.icon; const done = completedTasks.includes(task.id); return <div key={task.id} className={`flex items-start gap-3 rounded-lg border p-3.5 transition ${task.blocked && !done ? 'border-[#f0d5b1] bg-[#fff9ef]' : 'border-black/[0.06] bg-white hover:border-black/15'}`}><Checkbox disabled={removing} aria-label={`Mark ${task.title} complete`} checked={done} onCheckedChange={(checked) => onToggleTask(task.id, checked === true)} className="mt-0.5" /><div className={`grid size-8 shrink-0 place-items-center rounded-lg ${done ? 'bg-[#edf8f0] text-[#288048]' : 'bg-[#f3f2ef] text-black/70'}`}><Icon aria-hidden="true" className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className={`text-sm font-semibold ${done ? 'text-black/70 line-through' : ''}`}>{task.title}</p>{task.blocked && !done && <span className="shrink-0 rounded-md bg-[#fff2dc] px-2 py-0.5 text-xs font-bold uppercase text-[#704500]">Blocked</span>}</div><p className="mt-1 text-sm text-black/70">{task.owner} · {task.date}</p>{!done && <button type="button" disabled={removing} aria-pressed={task.blocked} onClick={() => onToggleBlocker(task.id, !task.blocked)} className="mt-2 min-h-11 text-xs font-semibold underline underline-offset-4">{task.blocked ? 'Clear blocker' : 'Flag blocker'}</button>}</div></div>; })}</div>
                {person.type === 'offboarding' && <section className="mt-6 border-t border-black/10 pt-5" aria-labelledby="remove-person-heading">
                  <h3 id="remove-person-heading" className="text-sm font-semibold">Close offboarding</h3>
                  {!canRemovePerson(person, completedTasks) ? <p className="mt-2 text-sm text-black/70">Complete all offboarding tasks to enable Remove person.</p> : !confirmRemoval ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-black/70">All offboarding tasks are complete.</p><Button variant="destructive" onClick={() => setConfirmRemoval(true)} className="min-h-11 rounded-lg">Remove person</Button></div> : <div className="mt-3 rounded-lg border border-[#e9c4c4] bg-white p-4">
                    <p className="font-semibold">Remove {person.name}?</p><p className="mt-2 text-sm leading-relaxed text-black/70">This deletes the person and their checklist from SQLite. Role profiles and emails are kept. This cannot be undone.</p>
                    {removeError && <p role="alert" className="mt-3 text-sm text-[#9b1018]">{removeError}</p>}
                    <div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" disabled={removing} onClick={() => {setConfirmRemoval(false); setRemoveError('');}}>Cancel</Button><Button variant="destructive" disabled={removing} onClick={() => void confirmRemove()}>{removing ? 'Removing…' : 'Confirm removal'}</Button></div>
                  </div>}
                </section>}
              </TabsContent>

              <TabsContent value="access" className="p-6">
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h3 className="text-base font-semibold">Software access & activation</h3><p className="mt-1 text-sm text-black/70">View software requests and activation codes.</p></div></div>


                <div className="space-y-3">{accessItems.map((item) => { const revealed = revealedCodes.includes(item.id); return <article key={item.id} className="rounded-xl border border-black/[0.06] bg-white p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">{item.product}</h4><span className={`rounded-md px-2 py-1 text-xs font-semibold ${item.ready ? 'bg-[#edf8f0] text-[#288048]' : 'bg-[#fff2dc] text-[#9b5c00]'}`}>{item.state}</span></div><p className="mt-1 text-sm text-black/70">{item.request} · Source: {item.source}</p></div><span className="text-sm text-black/70">{item.expires}</span></div>{item.ready ? <div className="mt-4 flex flex-col gap-2 rounded-lg bg-[#f7f7f5] p-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/70">{item.kind}</p><code className="mt-1 block break-words text-sm font-semibold tracking-wide text-black/75">{revealed ? item.value : '•••• •••• ••••'}</code></div><div className="flex gap-2"><Button type="button" variant="outline" aria-label={`${revealed ? 'Hide' : 'Reveal'} ${item.product} code`} aria-pressed={revealed} onClick={() => toggleCode(item.id)} className="h-8 rounded-lg bg-white px-3 text-sm">{revealed ? <EyeOff /> : <Eye />} {revealed ? 'Hide' : 'Reveal'}</Button>{revealed && <Button type="button" variant="outline" aria-label={`Copy ${item.product} code`} onClick={() => copyCode(item.value, item.product)} className="h-8 rounded-lg bg-white px-3 text-sm"><Copy /> Copy</Button>}</div></div> : <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#fff9ef] p-3 text-sm text-[#704500]"><AlertTriangle aria-hidden="true" className="size-4" /> Waiting for manager approval in ServiceNow.</div>}</article>; })}</div>
              </TabsContent>

              <TabsContent value="devices" className="p-6">
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h3 className="text-base font-semibold">Assigned technology</h3><p className="mt-1 text-sm text-black/70">Devices and required updates for {person.name}.</p></div><span className={`w-fit rounded-md px-3 py-1.5 text-sm font-semibold ${updateCount ? 'bg-[#fff2dc] text-[#9b5c00]' : 'bg-[#edf8f0] text-[#288048]'}`}>{updateCount ? `${updateCount} updates required` : 'All devices current'}</span></div>


                <div className="space-y-3">{devices.map((device) => { const Icon = device.icon; const reminded = remindedDevices.includes(device.id); return <article key={device.id} className={`rounded-xl border bg-white p-4 ${device.update ? 'border-[#f0d5b1]' : 'border-black/[0.06]'}`}><div className="flex items-start gap-3"><div className={`grid size-10 shrink-0 place-items-center rounded-lg ${device.update ? 'bg-[#fff2dc] text-[#9b5c00]' : 'bg-[#edf8f0] text-[#288048]'}`}><Icon aria-hidden="true" className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h4 className="text-sm font-semibold">{device.name}</h4><p className="mt-1 text-sm text-black/70">Asset {device.asset} · {device.checked}</p></div><span className={`w-fit rounded-md px-2.5 py-1 text-xs font-semibold ${device.update ? 'bg-[#fff2dc] text-[#9b5c00]' : 'bg-[#edf8f0] text-[#288048]'}`}>{device.update ? 'Update required' : 'Up to date'}</span></div><div className="mt-4 grid gap-2 rounded-lg bg-[#f7f7f5] p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><div><p className="text-xs uppercase tracking-[0.08em] text-black/70">Installed</p><p className="mt-1 text-sm font-semibold">{device.current}</p></div><span className="hidden text-black/20 sm:block">→</span><div><p className="text-xs uppercase tracking-[0.08em] text-black/70">Required</p><p className="mt-1 text-sm font-semibold">{device.latest}</p></div></div>{device.update && <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="text-sm leading-relaxed text-black/70">Ask {person.name.split(' ')[0]} to connect to VPN, install the update, and restart the device.</p><Button type="button" variant={reminded ? 'secondary' : 'outline'} disabled={reminded} onClick={() => remind(device.id, device.name)} className="h-9 self-start rounded-lg bg-white px-3 text-sm"><Send /> {reminded ? 'Email draft ready' : 'Prepare email'}</Button></div>}</div></div></article>; })}</div>
              </TabsContent>
            </div>
          </Tabs>

          {profileNotice && <div role="status" className="border-t border-black/10 bg-[#1c1b1a] px-4 py-3 text-sm font-medium text-white">{profileNotice}</div>}
        </>}
      </DialogContent>
    </Dialog>
  );
}

function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/70">{description}</p></div>{action}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-2"><span className="block text-xs font-semibold text-black/70">{label}</span>{children}</label>;
}

function NavItem({ icon, label, active, badge, onClick }: { icon: ReactNode; label: string; active?: boolean; badge?: string; onClick: () => void }) {
  return <button aria-current={active ? 'page' : undefined} onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-white/[0.11] text-white' : 'text-white/75 hover:bg-white/[0.06] hover:text-white/80'}`}><span className="[&_svg]:size-4">{icon}</span><span className="flex-1 text-left">{label}</span>{badge && <span className="rounded-md bg-[#ec111a] px-2 py-0.5 text-xs font-bold text-white">{badge}</span>}</button>;
}

function EmptySearch({ onClear }: { onClear: () => void }) {
  return <div className="rounded-xl border border-dashed border-black/10 bg-white p-10 text-center"><Search aria-hidden="true" className="mx-auto size-5 text-black/70" /><p className="mt-3 text-sm font-semibold">No matching journeys</p><button onClick={onClear} className="mt-2 text-xs font-semibold text-[#c80d15]">Clear filters</button></div>;
}

function allPeopleFirst() { return people[0]; }
