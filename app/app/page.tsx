'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileCheck2,
  Headset,
  Headphones,
  HelpCircle,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Mail,
  Monitor,
  PackageCheck,
  Plus,
  Search,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserMinus,
  UserCog,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react';

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

type Section = 'overview' | 'people' | 'profiles' | 'timeline';
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
  const [section, setSection] = useState<Section>('overview');
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [customProfiles, setCustomProfiles] = useState<RoleProfile[]>([]);
  const [journeyType, setJourneyType] = useState<JourneyType>('onboarding');
  const [detail, setDetail] = useState<Person | null>(null);
  const [search, setSearch] = useState('');
  const [blockerHandled, setBlockerHandled] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>(['offer', 'background']);
  const [notice, setNotice] = useState('');

  const filteredPeople = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? people.filter((person) => `${person.name} ${person.role} ${person.group}`.toLowerCase().includes(query)) : people;
  }, [search]);

  function launchJourney(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || 'New employee');
    setCreateOpen(false);
    setNotice(`${journeyType === 'onboarding' ? 'Onboarding' : 'Offboarding'} journey created for ${name}.`);
    window.setTimeout(() => setNotice(''), 3600);
  }

  function toggleTask(id: string, checked: boolean) {
    setCompletedTasks((current) => checked ? [...new Set([...current, id])] : current.filter((task) => task !== id));
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
    window.setTimeout(() => setNotice(''), 3600);
  }

  const detailProgress = Math.round((completedTasks.length / taskSeed.length) * 100);

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#191919]">
      <Sidebar section={section} onSection={setSection} />

      <section className="min-h-screen lg:pl-[236px]">
        <TopBar
          search={search}
          onSearch={setSearch}
          onCreate={() => setCreateOpen(true)}
          hasNotice={!blockerHandled}
        />

        <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 xl:px-11 xl:py-9">
          {section === 'overview' && (
            <Overview
              people={filteredPeople}
              blockerHandled={blockerHandled}
              onHandleBlocker={() => { setBlockerHandled(true); setNotice('Blocker marked as handled. Maya’s journey is back on track.'); window.setTimeout(() => setNotice(''), 3600); }}
              onOpenPerson={setDetail}
              onCreate={() => setCreateOpen(true)}
              onSection={setSection}
            />
          )}
          {section === 'people' && <PeopleView people={filteredPeople} onOpenPerson={setDetail} onCreate={() => setCreateOpen(true)} />}
          {section === 'profiles' && (
            <ProfilesView
              customProfiles={customProfiles}
              onNewProfile={() => setProfileOpen(true)}
              onUseProfile={() => { setJourneyType('onboarding'); setCreateOpen(true); }}
            />
          )}
          {section === 'timeline' && <TimelineView onOpenPerson={setDetail} />}
        </div>
      </section>

      <JourneyDialog open={createOpen} onOpenChange={setCreateOpen} type={journeyType} onType={setJourneyType} onSubmit={launchJourney} />
      <RoleProfileDialog open={profileOpen} onOpenChange={setProfileOpen} onSave={saveRoleProfile} />
      <PersonDialog person={detail} onClose={() => setDetail(null)} completedTasks={completedTasks} onToggleTask={toggleTask} progress={detailProgress} />

      {notice && (
        <div role="status" className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-3 rounded-2xl border border-black/10 bg-[#1c1b1a] px-4 py-3.5 text-xs font-medium text-white shadow-2xl shadow-black/20">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#3baf62]"><Check className="size-4" /></span>
          <span className="leading-relaxed">{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice('')} className="ml-2 text-white/50"><X className="size-4" /></button>
        </div>
      )}
    </main>
  );
}

function Sidebar({ section, onSection }: { section: Section; onSection: (section: Section) => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[236px] flex-col border-r border-black/[0.07] bg-[#121212] text-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="grid size-9 place-items-center rounded-[11px] bg-[#ec111a] text-sm font-black tracking-tight">S</div>
        <div><p className="text-[15px] font-semibold leading-none">ScotiaPath</p><p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">People operations</p></div>
      </div>
      <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
        <NavItem icon={<LayoutDashboard />} label="Overview" active={section === 'overview'} onClick={() => onSection('overview')} />
        <NavItem icon={<Users />} label="My people" badge="6" active={section === 'people'} onClick={() => onSection('people')} />
        <NavItem icon={<FileCheck2 />} label="Role profiles" active={section === 'profiles'} onClick={() => onSection('profiles')} />
        <NavItem icon={<CalendarDays />} label="Timeline" active={section === 'timeline'} onClick={() => onSection('timeline')} />
        <p className="px-3 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Workspace</p>
        <NavItem icon={<HelpCircle />} label="Help centre" onClick={() => onSection('overview')} />
        <NavItem icon={<Settings />} label="Settings" onClick={() => onSection('overview')} />
      </nav>
      <div className="m-4 rounded-2xl bg-white/[0.07] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold"><Sparkles className="size-3.5 text-[#ff777c]" /> Need a hand?</div>
        <p className="text-[11px] leading-relaxed text-white/50">Get a guided walkthrough for your next onboarding.</p>
        <button className="mt-3 text-[11px] font-semibold text-white">Open guide <ArrowRight className="ml-1 inline size-3" /></button>
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 p-4">
        <div className="grid size-9 place-items-center rounded-full bg-[#5b3f8c] text-xs font-bold">JW</div>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">Jordan Wallace</p><p className="mt-1 truncate text-[10px] text-white/40">People Manager</p></div>
        <ChevronDown className="size-4 text-white/40" />
      </div>
    </aside>
  );
}

function TopBar({ search, onSearch, onCreate, hasNotice }: { search: string; onSearch: (value: string) => void; onCreate: () => void; hasNotice: boolean }) {
  return (
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-black/[0.06] bg-[#f7f7f5]/90 px-5 backdrop-blur-xl sm:px-8 xl:px-11">
      <div className="flex items-center gap-3 lg:hidden"><div className="grid size-9 place-items-center rounded-[11px] bg-[#ec111a] text-sm font-black text-white">S</div><span className="font-semibold">ScotiaPath</span></div>
      <div className="relative hidden w-[min(34vw,420px)] lg:block"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-black/35" /><Input aria-label="Search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search people, tasks or role profiles" className="h-10 rounded-xl border-black/[0.08] bg-white pl-10 pr-4 text-xs" /></div>
      <div className="flex items-center gap-2"><button aria-label="Notifications" className="relative grid size-10 place-items-center rounded-xl border border-black/[0.08] bg-white text-black/60 transition hover:bg-black/[0.03]"><Bell className="size-4" />{hasNotice && <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-[#ec111a] ring-2 ring-white" />}</button><Button onClick={onCreate} className="h-10 rounded-xl bg-[#ec111a] px-4 text-xs text-white hover:bg-[#c80d15]"><Plus className="size-4" /> <span className="hidden sm:inline">Start a journey</span><span className="sm:hidden">Start</span></Button></div>
    </header>
  );
}

function Overview({ people, blockerHandled, onHandleBlocker, onOpenPerson, onCreate, onSection }: { people: Person[]; blockerHandled: boolean; onHandleBlocker: () => void; onOpenPerson: (person: Person) => void; onCreate: () => void; onSection: (section: Section) => void }) {
  const activePeople = people.filter((person) => person.progress < 100 && person.type === 'onboarding').slice(0, 3);
  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-xs font-semibold text-[#ec111a]">Friday, October 2</p><h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-[38px]">Good morning, Jordan.</h1><p className="mt-2 text-sm text-black/45">Here’s what needs your attention across your team.</p></div>
        <button onClick={() => onSection('timeline')} className="flex items-center gap-2 self-start text-xs font-semibold text-black/60 transition hover:text-black sm:self-auto"><CalendarDays className="size-4" /> View team calendar</button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-[1.55fr_1fr]">
        {!blockerHandled ? (
          <div className="overflow-hidden rounded-[22px] bg-[#24201f] p-6 text-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:p-7">
            <div className="flex items-start justify-between gap-4"><div className="max-w-xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#ffb8ba]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#ff8d91]"><CircleAlert className="size-3.5" /> Action required</div><h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Maya’s laptop may arrive after day one.</h2><p className="mt-2 max-w-lg text-xs leading-relaxed text-white/50">Delivery is scheduled for Oct 14, two days after her start date. Escalate the request or arrange temporary equipment.</p></div><span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold sm:block">Due today</span></div>
            <div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={() => onOpenPerson(people[0] ?? allPeopleFirst())} className="h-9 rounded-xl bg-white px-4 text-xs text-black hover:bg-white/90">Review blocker <ArrowRight /></Button><button onClick={onHandleBlocker} className="px-2 text-xs font-semibold text-white/55 transition hover:text-white">Mark as handled</button></div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-[#d8eadc] bg-[#edf8f0] p-6 sm:p-7"><div className="flex h-full items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-[#288048] shadow-sm"><CheckCircle2 className="size-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#288048]">All clear</p><h2 className="mt-2 text-xl font-semibold tracking-tight">No urgent blockers right now.</h2><p className="mt-2 text-xs leading-relaxed text-black/45">Your active journeys are on track. We’ll surface anything that needs your attention here.</p></div></div></div>
        )}
        <div className="rounded-[22px] border border-black/[0.06] bg-white p-6 sm:p-7">
          <div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-black/40">Team readiness</p><p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">72%</p></div><div className="grid size-10 place-items-center rounded-xl bg-[#eff8f2] text-[#288048]"><UserRoundCheck className="size-5" /></div></div>
          <Progress value={72} className="mt-5 [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-[#eee] [&_[data-slot=progress-indicator]]:bg-[#36a35d]" />
          <div className="mt-4 flex items-center justify-between text-[11px]"><span className="text-black/40">Across 6 active journeys</span><span className="font-semibold text-[#288048]">+8% this week</span></div>
        </div>
      </div>

      <div className="mb-6 rounded-[22px] border border-black/[0.06] bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-center justify-between"><div><h2 className="text-lg font-semibold tracking-tight">Active journeys</h2><p className="mt-1 text-xs text-black/40">The next milestone for each person on your team.</p></div><button onClick={() => onSection('people')} className="text-xs font-semibold text-black/55 transition hover:text-black">View all <ArrowRight className="ml-1 inline size-3.5" /></button></div>
        {activePeople.length ? <div className="grid gap-3 xl:grid-cols-3">{activePeople.map((person) => <PersonCard key={person.id} person={person} onOpen={() => onOpenPerson(person)} />)}</div> : <EmptySearch onClear={() => window.location.reload()} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[22px] border border-black/[0.06] bg-white p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold tracking-tight">Needs you this week</h2><p className="mt-1 text-xs text-black/40">Tasks that only you can complete.</p></div><span className="rounded-full bg-[#fff0f0] px-2.5 py-1 text-[10px] font-bold text-[#c80d15]">3 tasks</span></div>
          <div className="divide-y divide-black/[0.06]">
            <ActionRow icon={<KeyRound />} title="Approve permission groups" meta="Noah Williams · Due today" />
            <ActionRow icon={<CalendarDays />} title="Add first-week schedule" meta="Maya Chen · Due Oct 9" />
            <ActionRow icon={<PackageCheck />} title="Confirm asset return method" meta="Sarah Ahmed · Due Oct 12" />
          </div>
        </div>
        <div className="rounded-[22px] bg-[#ece9e5] p-6 sm:p-7"><div className="grid size-10 place-items-center rounded-xl bg-white text-[#ec111a] shadow-sm"><Sparkles className="size-5" /></div><h2 className="mt-5 text-lg font-semibold tracking-tight">Bringing someone new onto the team?</h2><p className="mt-2 text-xs leading-relaxed text-black/45">Choose a role profile and Scotiapath will build the right checklist, owners, and target dates.</p><Button onClick={onCreate} variant="outline" className="mt-5 h-9 rounded-xl border-black/10 bg-white px-4 text-xs">Start onboarding <ArrowRight /></Button></div>
      </div>
    </>
  );
}

function PeopleView({ people, onOpenPerson, onCreate }: { people: Person[]; onOpenPerson: (person: Person) => void; onCreate: () => void }) {
  const [filter, setFilter] = useState<'all' | JourneyType>('all');
  const shown = people.filter((person) => filter === 'all' || person.type === filter);
  return (
    <>
      <PageHeading eyebrow="My people" title="Every journey, in one place." description="Track onboarding and offboarding without chasing emails, forms, or separate ticket queues." action={<Button onClick={onCreate} className="h-10 rounded-xl bg-[#ec111a] px-4 text-xs"><Plus /> Start a journey</Button>} />
      <div className="mb-5 flex items-center gap-2">{(['all', 'onboarding', 'offboarding'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${filter === item ? 'bg-[#1c1b1a] text-white' : 'border border-black/[0.07] bg-white text-black/45 hover:text-black'}`}>{item}</button>)}</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map((person) => <PersonCard key={person.id} person={person} onOpen={() => onOpenPerson(person)} expanded />)}</div>
      {!shown.length && <EmptySearch onClear={() => setFilter('all')} />}
    </>
  );
}

function ProfilesView({ customProfiles, onNewProfile, onUseProfile }: { customProfiles: RoleProfile[]; onNewProfile: () => void; onUseProfile: () => void }) {
  const profiles = [...customProfiles, ...roleProfiles];
  return (
    <>
      <PageHeading eyebrow="Role profiles" title="Define it once. Reuse it every time." description="Role profiles package the hardware, software licences, and Scotia access a specific role needs." action={<Button onClick={onNewProfile} className="h-10 rounded-xl bg-[#ec111a] px-4 text-xs"><Plus /> New profile</Button>} />
      <div className="mb-5 rounded-[20px] border border-[#f2d4d5] bg-[#fff7f7] px-5 py-4 sm:flex sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-4 text-[#ec111a]" /><div><p className="text-xs font-semibold">Suggested improvement</p><p className="mt-1 text-[11px] text-black/45">The Software Developer profile is missing an equipment lead time. Add 10 business days to prevent late deliveries.</p></div></div><button className="mt-3 text-[11px] font-semibold text-[#c80d15] sm:mt-0">Review suggestion <ArrowRight className="ml-1 inline size-3" /></button></div>
      <div className="grid gap-4 md:grid-cols-2">{profiles.map((profile, index) => { const Icon = profile.icon ?? FileCheck2; return <article key={`${profile.title}-${profile.area}-${index}`} className="group rounded-[22px] border border-black/[0.06] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/[0.04]"><div className="flex items-start justify-between"><div className="grid size-11 place-items-center rounded-2xl bg-[#f1efec] text-black/60"><Icon className="size-5" /></div><Badge variant="outline" className={`text-[9px] ${profile.ready ? 'border-[#d4e8d9] bg-[#f0f8f2] text-[#288048]' : 'border-[#f0ddba] bg-[#fff6e6] text-[#9b5c00]'}`}>{profile.ready ? 'Ready to use' : 'Needs review'}</Badge></div><h3 className="mt-5 text-lg font-semibold tracking-tight">{profile.title}</h3><p className="mt-1 text-xs text-black/40">{profile.role ? `${profile.role} · ` : ''}{profile.area}</p>{profile.manager && <p className="mt-3 text-xs text-black/45">Managed by <span className="font-semibold text-black/65">{profile.manager}</span></p>}{profile.hardware && <p className="mt-1 truncate text-xs text-black/35">{profile.hardware}</p>}<div className="mt-6 flex gap-6 border-t border-black/[0.06] pt-4"><div><p className="text-sm font-semibold">{profile.tasks}</p><p className="mt-1 text-[10px] text-black/35">Profile items</p></div><div><p className="text-sm font-semibold">{profile.groups}</p><p className="mt-1 text-[10px] text-black/35">Access items</p></div><button onClick={onUseProfile} className="ml-auto self-end text-[11px] font-semibold text-black/50 transition group-hover:text-black">Use profile <ArrowRight className="ml-1 inline size-3" /></button></div></article>; })}</div>
    </>
  );
}

function TimelineView({ onOpenPerson }: { onOpenPerson: (person: Person) => void }) {
  const weeks = [
    { label: 'This week', date: 'Oct 2–9', events: [{ day: 'Today', title: 'Approve Noah’s access', person: people[1], tone: 'red' }, { day: 'Oct 9', title: 'Maya’s equipment due', person: people[0], tone: 'amber' }] },
    { label: 'Next week', date: 'Oct 12–16', events: [{ day: 'Oct 12', title: 'Maya starts', person: people[0], tone: 'green' }, { day: 'Oct 16', title: 'Sarah’s last day', person: people[4], tone: 'dark' }] },
    { label: 'Following', date: 'Oct 19–23', events: [{ day: 'Oct 19', title: 'Noah starts', person: people[1], tone: 'green' }, { day: 'Oct 21', title: 'Noah’s first check-in', person: people[1], tone: 'blue' }] },
  ];
  return (
    <>
      <PageHeading eyebrow="Timeline" title="Know what’s coming before it becomes urgent." description="Key deadlines and milestones across every active people journey." />
      <div className="rounded-[22px] border border-black/[0.06] bg-white p-5 sm:p-7">
        <div className="mb-7 flex items-center justify-between"><div><h2 className="text-lg font-semibold">October 2026</h2><p className="mt-1 text-[11px] text-black/40">Toronto · Eastern time</p></div><div className="flex gap-2"><button className="grid size-8 place-items-center rounded-lg border border-black/[0.08]"><ArrowLeft className="size-3.5" /></button><button className="grid size-8 place-items-center rounded-lg border border-black/[0.08]"><ArrowRight className="size-3.5" /></button></div></div>
        <div className="grid gap-4 lg:grid-cols-3">{weeks.map((week) => <section key={week.label} className="rounded-2xl bg-[#f7f7f5] p-4"><div className="mb-4 flex items-end justify-between"><h3 className="text-xs font-semibold">{week.label}</h3><span className="text-[10px] text-black/35">{week.date}</span></div><div className="space-y-3">{week.events.map((event) => <button key={event.title} onClick={() => onOpenPerson(event.person)} className="w-full rounded-xl border border-black/[0.06] bg-white p-3 text-left transition hover:border-black/15 hover:shadow-sm"><div className="flex items-start gap-3"><span className={`mt-1 size-2 rounded-full ${event.tone === 'red' ? 'bg-[#ec111a]' : event.tone === 'amber' ? 'bg-[#e59b2f]' : event.tone === 'green' ? 'bg-[#36a35d]' : event.tone === 'blue' ? 'bg-[#3d84c6]' : 'bg-[#333]'}`} /><div><p className="text-[10px] font-semibold text-black/35">{event.day}</p><p className="mt-1 text-xs font-semibold leading-snug">{event.title}</p><p className="mt-2 text-[10px] text-black/35">{event.person.name}</p></div></div></button>)}</div></section>)}</div>
      </div>
    </>
  );
}

function PersonCard({ person, onOpen, expanded = false }: { person: Person; onOpen: () => void; expanded?: boolean }) {
  return (
    <button onClick={onOpen} className={`group rounded-2xl border border-black/[0.07] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-lg hover:shadow-black/[0.04] ${expanded ? 'min-h-[220px] p-5' : ''}`}>
      <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f0eeeb] text-xs font-bold text-black/60">{person.initials}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate text-sm font-semibold">{person.name}</h3><StatusBadge status={person.status} label={person.statusLabel} /></div><p className="mt-1 truncate text-[10px] text-black/40">{person.role} · {person.group}</p></div></div>
      {expanded && <div className="mt-5 flex gap-2"><span className="rounded-lg bg-[#f6f5f2] px-2.5 py-1.5 text-[9px] font-semibold text-black/45">{person.type === 'onboarding' ? 'Onboarding' : 'Offboarding'}</span><span className="rounded-lg bg-[#f6f5f2] px-2.5 py-1.5 text-[9px] font-semibold text-black/45">{person.group}</span></div>}
      <div className={`${expanded ? 'mt-7' : 'mt-5'} flex items-center justify-between text-[10px]`}><span className="font-semibold text-black/55">{person.date}</span><span className="text-black/35">{person.progress}% complete</span></div><Progress value={person.progress} className={`mt-2 [&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-[#eee] ${person.status === 'complete' ? '[&_[data-slot=progress-indicator]]:bg-[#36a35d]' : '[&_[data-slot=progress-indicator]]:bg-[#ec111a]'}`} />
      <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3 text-[10px]"><span className="text-black/35">Next: <b className="font-semibold text-black/60">{person.next}</b></span><ArrowRight className="size-3.5 text-black/35 transition group-hover:translate-x-0.5 group-hover:text-black" /></div>
    </button>
  );
}

function StatusBadge({ status, label }: { status: Person['status']; label: string }) {
  const style = status === 'blocked' ? 'bg-[#fff2dc] text-[#9b5c00]' : status === 'complete' ? 'bg-[#edf8f0] text-[#288048]' : status === 'offboarding' ? 'bg-[#f1eeff] text-[#6952a3]' : 'bg-[#edf5ff] text-[#326a9d]';
  return <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${style}`}>{label}</span>;
}

function ActionRow({ icon, title, meta }: { icon: ReactNode; title: string; meta: string }) {
  return <button className="group flex w-full items-center gap-3 py-3.5 text-left"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f5f4f1] text-black/50 [&_svg]:size-4">{icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{title}</span><span className="mt-1 block text-[10px] text-black/35">{meta}</span></span><ArrowRight className="size-3.5 text-black/25 transition group-hover:translate-x-0.5 group-hover:text-black" /></button>;
}

function JourneyDialog({ open, onOpenChange, type, onType, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; type: JourneyType; onType: (type: JourneyType) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-[22px] p-0 sm:max-w-[560px]">
        <form onSubmit={onSubmit}>
          <DialogHeader className="px-6 pb-5 pt-6"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-[#fff0f0] text-[#ec111a]">{type === 'onboarding' ? <UserRoundCheck className="size-5" /> : <UserMinus className="size-5" />}</div><DialogTitle className="text-xl font-semibold tracking-tight">Start a people journey</DialogTitle><DialogDescription>We’ll generate a guided checklist from the person’s role and start or exit date.</DialogDescription></DialogHeader>
          <div className="px-6 pb-6"><div className="mb-6 grid grid-cols-2 rounded-xl bg-[#f2f1ee] p-1"><button type="button" onClick={() => onType('onboarding')} className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${type === 'onboarding' ? 'bg-white text-black shadow-sm' : 'text-black/40'}`}>Onboarding</button><button type="button" onClick={() => onType('offboarding')} className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${type === 'offboarding' ? 'bg-white text-black shadow-sm' : 'text-black/40'}`}>Offboarding</button></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Employee name"><Input required name="name" placeholder="e.g. Taylor Morgan" className="h-10 rounded-xl bg-white" /></Field><Field label="Work email"><Input required name="email" type="email" placeholder="name@scotiabank.com" className="h-10 rounded-xl bg-white" /></Field><Field label="Business area"><NativeSelect name="area" className="w-full"><NativeSelectOption>Canadian Banking</NativeSelectOption><NativeSelectOption>Solutions Architecture</NativeSelectOption><NativeSelectOption>Global Technology</NativeSelectOption></NativeSelect></Field><Field label="Role profile"><NativeSelect name="role" className="w-full"><NativeSelectOption>Software Engineer</NativeSelectOption><NativeSelectOption>Data Analyst</NativeSelectOption><NativeSelectOption>Business Analyst</NativeSelectOption><NativeSelectOption>Software Developer</NativeSelectOption></NativeSelect></Field><Field label={type === 'onboarding' ? 'Start date' : 'Last working day'}><Input required name="date" type="date" className="h-10 rounded-xl bg-white" /></Field><Field label="Manager"><Input name="manager" defaultValue="Jordan Wallace" className="h-10 rounded-xl bg-[#f7f7f5]" /></Field></div>
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#e5e3df] bg-[#faf9f7] p-3.5"><TicketCheck className="mt-0.5 size-4 shrink-0 text-[#ec111a]" /><p className="text-[10px] leading-relaxed text-black/45">This prototype would automatically create the required ServiceNow requests, notify each owner, and work backward from the selected date.</p></div>
          </div>
          <DialogFooter className="mx-0 mb-0 rounded-none border-black/[0.06] bg-[#f7f7f5] px-6 py-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 rounded-xl bg-white px-4 text-xs">Cancel</Button><Button type="submit" className="h-9 rounded-xl bg-[#ec111a] px-4 text-xs hover:bg-[#c80d15]">Create journey <ArrowRight /></Button></DialogFooter>
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
      <DialogContent className="max-h-[94vh] gap-0 overflow-hidden rounded-[24px] p-0 sm:max-w-[760px]">
        <form onSubmit={submitProfile}>
          <DialogHeader className="border-b border-black/[0.06] px-6 pb-5 pt-6 sm:px-7">
            <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-[#fff0f0] text-[#ec111a]"><BriefcaseBusiness className="size-5" /></div>
            <DialogTitle className="text-xl font-semibold tracking-tight">Create a role profile</DialogTitle>
            <DialogDescription>Define the standard equipment, licences, and Scotia access every person in this role should receive.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(94vh-210px)] space-y-7 overflow-y-auto px-6 py-6 sm:px-7">
            <section>
              <SectionHeading icon={<Building2 />} title="Role details" description="Name the reusable profile and identify who owns it." />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Profile name"><Input required name="profileName" placeholder="e.g. Canadian Banking Engineer" className="h-10 rounded-xl bg-white" /></Field>
                <Field label="Business line"><NativeSelect name="businessLine" className="w-full [&_select]:h-10 [&_select]:rounded-xl">{businessLines.map((line) => <NativeSelectOption key={line} value={line}>{line}</NativeSelectOption>)}</NativeSelect></Field>
                <Field label="Manager name"><Input required name="manager" defaultValue="Jordan Wallace" className="h-10 rounded-xl bg-white" /></Field>
                <Field label="Specific role"><Input required name="specificRole" placeholder="e.g. Software Engineer" className="h-10 rounded-xl bg-white" /></Field>
              </div>
            </section>

            <section>
              <SectionHeading icon={<Monitor />} title="Hardware" description="Choose the standard laptop and headset for this role." />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="rounded-2xl border border-black/[0.07] bg-[#faf9f7] p-4">
                  <span className="flex items-center gap-2 text-xs font-semibold"><Laptop className="size-4 text-black/45" /> Laptop</span>
                  <NativeSelect value={laptop} onChange={(event) => setLaptop(event.target.value)} className="mt-3 w-full [&_select]:h-10 [&_select]:rounded-xl [&_select]:bg-white">
                    <NativeSelectOption value="MacBook M1">MacBook M1</NativeSelectOption>
                    <NativeSelectOption value="ThinkPad EOOSA00Q65Z">ThinkPad EOOSA00Q65Z</NativeSelectOption>
                  </NativeSelect>
                </label>
                <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${headset ? 'border-[#efbfc1] bg-[#fff7f7]' : 'border-black/[0.07] bg-[#faf9f7]'}`}>
                  <Checkbox checked={headset} onCheckedChange={(checked) => setHeadset(checked === true)} className="mt-0.5" />
                  <span><span className="flex items-center gap-2 text-xs font-semibold"><Headset className="size-4 text-black/45" /> Jabra Evolve2 50</span><span className="mt-2 block text-xs leading-relaxed text-black/45">Include the standard wired headset in this profile.</span></span>
                </label>
              </div>
            </section>

            <section>
              <SectionHeading icon={<FileCheck2 />} title="Software licences" description="Select every paid or managed application required for the role." />
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{softwareOptions.map((item) => { const selected = software.includes(item); return <label key={item} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition ${selected ? 'border-[#efbfc1] bg-[#fff7f7]' : 'border-black/[0.07] bg-white hover:bg-black/[0.02]'}`}><Checkbox checked={selected} onCheckedChange={(checked) => toggleSelection(item, checked === true, software, setSoftware)} /><span className="text-xs font-medium">{item}</span></label>; })}</div>
            </section>

            <section>
              <SectionHeading icon={<UserCog />} title="Scotia profile" description="Choose the identity and access items that should be created." />
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{accessOptions.map((item) => { const selected = access.includes(item); return <label key={item} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition ${selected ? 'border-[#efbfc1] bg-[#fff7f7]' : 'border-black/[0.07] bg-white hover:bg-black/[0.02]'}`}><Checkbox checked={selected} onCheckedChange={(checked) => toggleSelection(item, checked === true, access, setAccess)} /><span className="text-xs font-medium">{item}</span></label>; })}</div>
            </section>

            <div className="flex items-center justify-between rounded-2xl bg-[#24201f] px-4 py-3.5 text-white">
              <div><p className="text-xs font-semibold">Profile summary</p><p className="mt-1 text-xs text-white/50">{software.length} software licences · {access.length} Scotia access items</p></div>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">{totalItems} items</span>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none border-black/[0.06] bg-[#f7f7f5] px-6 py-4 sm:px-7">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 rounded-xl bg-white px-4 text-xs">Cancel</Button>
            <Button type="submit" className="h-10 rounded-xl bg-[#ec111a] px-4 text-xs hover:bg-[#c80d15]"><Save className="size-4" /> Save role profile</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f2f0ed] text-black/50 [&_svg]:size-4">{icon}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-black/45">{description}</p></div></div>;
}

function PersonDialog({ person, onClose, completedTasks, onToggleTask, progress }: { person: Person | null; onClose: () => void; completedTasks: string[]; onToggleTask: (id: string, checked: boolean) => void; progress: number }) {
  return (
    <Dialog open={Boolean(person)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto rounded-[22px] p-0 sm:max-w-[650px]">
        {person && <><div className="bg-[#23201f] px-6 pb-6 pt-7 text-white"><DialogHeader><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-sm font-bold">{person.initials}</div><div className="min-w-0 flex-1"><DialogTitle className="text-xl text-white">{person.name}</DialogTitle><DialogDescription className="mt-1 text-white/45">{person.role} · {person.group}</DialogDescription></div><StatusBadge status={person.status} label={person.statusLabel} /></div></DialogHeader><div className="mt-6"><div className="mb-2 flex justify-between text-[10px]"><span className="font-semibold text-white/60">Journey progress</span><span className="text-white/40">{person.id === 'maya' ? progress : person.progress}% complete</span></div><Progress value={person.id === 'maya' ? progress : person.progress} className="[&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:bg-white/10 [&_[data-slot=progress-indicator]]:bg-[#ff4c53]" /></div></div>
          <div className="px-6 py-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Journey checklist</h3><p className="mt-1 text-[10px] text-black/40">Owners are notified automatically when a task becomes active.</p></div><Badge variant="outline" className="text-[9px]">{person.date}</Badge></div>
            <div className="space-y-2">{taskSeed.map((task) => { const Icon = task.icon; const done = person.id === 'maya' ? completedTasks.includes(task.id) : task.done; return <label key={task.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${task.blocked && !done && person.id === 'maya' ? 'border-[#f0d5b1] bg-[#fff9ef]' : 'border-black/[0.06] bg-white hover:border-black/15'}`}><Checkbox checked={done} onCheckedChange={(checked) => person.id === 'maya' && onToggleTask(task.id, checked === true)} disabled={person.id !== 'maya'} className="mt-0.5" /><div className={`grid size-8 shrink-0 place-items-center rounded-lg ${done ? 'bg-[#edf8f0] text-[#288048]' : 'bg-[#f3f2ef] text-black/40'}`}><Icon className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className={`text-xs font-semibold ${done ? 'text-black/40 line-through' : ''}`}>{task.title}</p>{task.blocked && !done && person.id === 'maya' && <span className="shrink-0 rounded-full bg-[#f3a62f] px-2 py-0.5 text-[8px] font-bold uppercase text-white">Delayed</span>}</div><p className="mt-1 text-[9px] text-black/35">{task.owner} · {task.date}</p></div></label>; })}</div>
            <div className="mt-5 grid grid-cols-2 gap-3"><button className="flex items-center gap-2 rounded-xl border border-black/[0.07] p-3 text-left"><Mail className="size-4 text-black/40" /><span><span className="block text-[10px] font-semibold">Send update</span><span className="mt-0.5 block text-[9px] text-black/35">Email stakeholders</span></span></button><button className="flex items-center gap-2 rounded-xl border border-black/[0.07] p-3 text-left"><Headphones className="size-4 text-black/40" /><span><span className="block text-[10px] font-semibold">Get help</span><span className="mt-0.5 block text-[9px] text-black/35">Contact support</span></span></button></div>
          </div></>}
      </DialogContent>
    </Dialog>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold text-[#ec111a]">{eyebrow}</p><h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.035em] sm:text-[38px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/45">{description}</p></div>{action}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-2"><span className="block text-[10px] font-semibold text-black/55">{label}</span>{children}</label>;
}

function NavItem({ icon, label, active, badge, onClick }: { icon: ReactNode; label: string; active?: boolean; badge?: string; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition ${active ? 'bg-white/[0.11] text-white' : 'text-white/48 hover:bg-white/[0.06] hover:text-white/80'}`}><span className="[&_svg]:size-4">{icon}</span><span className="flex-1 text-left">{label}</span>{badge && <span className="rounded-full bg-[#ec111a] px-2 py-0.5 text-[9px] font-bold text-white">{badge}</span>}</button>;
}

function EmptySearch({ onClear }: { onClear: () => void }) {
  return <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center"><Search className="mx-auto size-5 text-black/25" /><p className="mt-3 text-xs font-semibold">No matching journeys</p><button onClick={onClear} className="mt-2 text-[10px] font-semibold text-[#c80d15]">Clear filters</button></div>;
}

function allPeopleFirst() { return people[0]; }
