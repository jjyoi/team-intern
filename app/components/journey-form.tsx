'use client';
import { useState } from 'react';
import { ArrowRight, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MANUAL_PROFILE, validateJourney, type JourneyFields } from '@/lib/journey-fields';
import { profileKey, type AccessProfile } from '@/lib/role-access';

export function JourneyForm({open, onOpenChange, type, onType, profiles, selectedProfile, softwareOptions, accessOptions, businessAreas, managerFirstName, managerLastName, onSubmit}: {
  open: boolean; onOpenChange: (open: boolean) => void; type: 'onboarding' | 'offboarding'; onType: (type: 'onboarding' | 'offboarding') => void;
  profiles: AccessProfile[]; selectedProfile: string; softwareOptions: string[]; accessOptions: string[]; businessAreas: string[];
  managerFirstName: string; managerLastName: string; onSubmit: (fields: JourneyFields) => Promise<void>;
}) {
  const [profileId, setProfileId] = useState(profiles.some((profile) => profileKey(profile) === selectedProfile) ? selectedProfile : '');
  const initialProfile = profiles.find((profile) => profileKey(profile) === selectedProfile);
  const [area, setArea] = useState(initialProfile?.area ?? '');
  const [software, setSoftware] = useState<string[]>([]), [access, setAccess] = useState<string[]>([]);
  const [softwareMode, setSoftwareMode] = useState(''), [accessMode, setAccessMode] = useState('');
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const manual = profileId === MANUAL_PROFILE;
  function toggle(item: string, checked: boolean, items: string[], set: (value: string[]) => void) { set(checked ? [...new Set([...items,item])] : items.filter((value) => value !== item)); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    const fields: JourneyFields = {firstName: text('firstName'), lastName: text('lastName'), email: text('email'), managerFirstName: text('managerFirstName'), managerLastName: text('managerLastName'), date: text('date'), sid: text('sid').toLowerCase(), eid: text('eid'), profileId, businessArea: area, jobTitle: text('jobTitle'), laptop: text('laptop'), headset: text('headset'), softwareMode, accessMode, software: softwareMode === 'assign' ? software : [], access: accessMode === 'assign' ? access : []};
    setError('');
    try { validateJourney(fields, type, profiles.map(profileKey)); setSaving(true); await onSubmit(fields); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save. Try again.'); }
    finally { setSaving(false); }
  }
  function field(label: string, name: string, props: React.ComponentProps<typeof Input> = {}) {
    return <label className="block space-y-2 text-sm font-medium"><span>{label} <span className="text-black/70">(required)</span></span><Input name={name} required disabled={saving} className="min-h-11 w-full rounded-lg bg-white" {...props} /></label>;
  }
  return <Dialog open={open} onOpenChange={(value) => {if (!saving) onOpenChange(value);}}>
    <DialogContent showCloseButton={!saving} className="flex max-h-[94dvh] min-h-0 flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[760px]">
      <form onSubmit={submit} aria-busy={saving} className="flex max-h-[94dvh] min-h-0 flex-col overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-black/10 px-6 py-5"><DialogTitle>{type === 'onboarding' ? 'Add onboarding' : 'Start offboarding'}</DialogTitle><DialogDescription>{type === 'onboarding' ? 'Use a role profile or set up one person manually.' : 'Enter the employee’s identity and last working day. No role profile is needed.'}</DialogDescription></DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          <div role="group" aria-label="Journey type" className="grid grid-cols-2 gap-2">{(['onboarding','offboarding'] as const).map((item) => <button key={item} type="button" disabled={saving} aria-pressed={type === item} onClick={() => {onType(item); setError('');}} className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${type === item ? 'border-black bg-black text-white' : 'border-black/15 bg-white'}`}>{item}</button>)}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('First name','firstName',{autoComplete:'given-name'})}{field('Last name','lastName',{autoComplete:'family-name'})}
            {type === 'offboarding' && <>{field('SID (ScotiaID)','sid',{pattern:'[sS][0-9]{7}',maxLength:8,autoCapitalize:'none',spellCheck:false,placeholder:'s1234567'})}{field('EID (Employee ID)','eid',{pattern:'[0-9]{8}',maxLength:8,inputMode:'numeric',placeholder:'12345678'})}</>}
            {field('Scotiabank email','email',{type:'email',autoComplete:'email',placeholder:'name@scotiabank.com'})}{field(type === 'onboarding' ? 'Start date' : 'Last working day','date',{type:'date'})}
            {field('Manager first name','managerFirstName',{defaultValue:managerFirstName,autoComplete:'off'})}{field('Manager last name','managerLastName',{defaultValue:managerLastName,autoComplete:'off'})}
            {type === 'onboarding' && <>
              <label className="block space-y-2 text-sm font-medium"><span>Role profile (required)</span><NativeSelect required disabled={saving} name="roleProfile" value={profileId} onChange={(event) => {const id=event.target.value;setProfileId(id);const selected=profiles.find((profile)=>profileKey(profile)===id);if(selected)setArea(selected.area);}} className="w-full bg-white"><NativeSelectOption value="" disabled>Choose a role profile</NativeSelectOption>{profiles.map((profile) => <NativeSelectOption key={profileKey(profile)} value={profileKey(profile)}>{profile.title}</NativeSelectOption>)}<NativeSelectOption value={MANUAL_PROFILE}>Custom / Other / Manual</NativeSelectOption></NativeSelect></label>
              <label className="block space-y-2 text-sm font-medium"><span>Business area (required)</span><NativeSelect required disabled={saving} value={area} onChange={(event)=>setArea(event.target.value)} className="w-full bg-white"><NativeSelectOption value="" disabled>Choose a business area</NativeSelectOption>{[...new Set([...businessAreas,...profiles.map(profile=>profile.area)])].map((value)=><NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}</NativeSelect></label>
            </>}
          </div>
          {type === 'onboarding' && manual && <section className="space-y-5 border-t border-black/10 pt-5" aria-label="Custom setup for this person"><div><h3 className="font-semibold">Custom setup</h3><p className="mt-1 text-sm text-black/70">These choices apply only to this employee and do not create a reusable profile.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">{field('Job title','jobTitle',{placeholder:'Enter their job title'})}
              <label className="block space-y-2 text-sm font-medium"><span>Laptop (required)</span><NativeSelect name="laptop" required disabled={saving} defaultValue="" className="w-full bg-white"><NativeSelectOption value="" disabled>Choose equipment</NativeSelectOption><NativeSelectOption>MacBook M1</NativeSelectOption><NativeSelectOption>ThinkPad EOOSA00Q65Z</NativeSelectOption><NativeSelectOption value="None">No laptop needed</NativeSelectOption></NativeSelect></label>
              <label className="block space-y-2 text-sm font-medium"><span>Headset (required)</span><NativeSelect name="headset" required disabled={saving} defaultValue="" className="w-full bg-white"><NativeSelectOption value="" disabled>Choose an option</NativeSelectOption><NativeSelectOption value="yes">Jabra Evolve2 50</NativeSelectOption><NativeSelectOption value="no">No headset needed</NativeSelectOption></NativeSelect></label>
            </div>
            <label className="block space-y-2 text-sm font-medium"><span>Software requirements (required)</span><NativeSelect required disabled={saving} value={softwareMode} onChange={(event)=>setSoftwareMode(event.target.value)} className="w-full bg-white"><NativeSelectOption value="" disabled>Choose requirements</NativeSelectOption><NativeSelectOption value="assign">Assign software</NativeSelectOption><NativeSelectOption value="none">No software needed</NativeSelectOption></NativeSelect></label>
            {softwareMode === 'assign' && <fieldset><legend className="mb-3 text-sm">Select at least one application (required)</legend><div className="grid gap-2 sm:grid-cols-2">{softwareOptions.map(item=><label key={item} className="flex min-h-11 items-center gap-3 rounded-lg border border-black/10 p-3 text-sm"><Checkbox disabled={saving} checked={software.includes(item)} onCheckedChange={checked=>toggle(item,checked===true,software,setSoftware)} />{item}</label>)}</div></fieldset>}
            <label className="block space-y-2 text-sm font-medium"><span>Access requirements (required)</span><NativeSelect required disabled={saving} value={accessMode} onChange={(event)=>setAccessMode(event.target.value)} className="w-full bg-white"><NativeSelectOption value="" disabled>Choose requirements</NativeSelectOption><NativeSelectOption value="assign">Assign access</NativeSelectOption><NativeSelectOption value="none">No access needed</NativeSelectOption></NativeSelect></label>
            {accessMode === 'assign' && <fieldset><legend className="mb-3 text-sm">Select at least one access item (required)</legend><div className="grid gap-2 sm:grid-cols-2">{accessOptions.map(item=><label key={item} className="flex min-h-11 items-center gap-3 rounded-lg border border-black/10 p-3 text-sm"><Checkbox disabled={saving} checked={access.includes(item)} onCheckedChange={checked=>toggle(item,checked===true,access,setAccess)} />{item}</label>)}</div></fieldset>}
          </section>}
        </div>
        <div className="shrink-0 border-t border-black/10 bg-[#f7f7f5]">{error && <p role="alert" className="px-6 pt-4 text-sm text-[#9b1018]">{error}</p>}<DialogFooter className="mx-0 mb-0 flex-row justify-end rounded-none border-0 bg-transparent px-6 py-4"><Button type="button" variant="outline" disabled={saving} onClick={()=>onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving} variant={type === 'offboarding' ? 'destructive' : 'default'}>{type === 'offboarding' ? <UserMinus aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}{saving ? 'Saving…' : type === 'offboarding' ? 'Start offboarding' : 'Create onboarding'}</Button></DialogFooter></div>
      </form>
    </DialogContent>
  </Dialog>;
}
