export type AccessProfile = {id?: string; title: string; role?: string; area: string; software?: string[]; access?: string[]};
export type AssignedEmployee = {id: string; role: string; group: string; profileId?: string; software?: string[]; access?: string[]; softTokenEnabled?: boolean; assignmentMode?: 'template' | 'manual'};
export function profileKey(profile: AccessProfile): string { return profile.id || `profile:${profile.area}:${profile.title}`; }
export function mergeProfiles<T extends AccessProfile>(defaults: T[], saved: T[]): T[] {
  const overrides = new Map(saved.map((profile) => [profileKey(profile), profile]));
  const originalKeys = new Set(defaults.map(profileKey));
  return [...defaults.map((profile) => overrides.get(profileKey(profile)) ?? profile), ...saved.filter((profile) => !originalKeys.has(profileKey(profile)))];
}
export function profileFor(employee: AssignedEmployee, profiles: AccessProfile[]): AccessProfile | undefined {
  if (employee.assignmentMode === 'manual') return undefined;
  if (employee.profileId) return profiles.find((profile) => profileKey(profile) === employee.profileId);
  const matching = profiles.filter((profile) => profile.title === employee.role || profile.role === employee.role);
  return matching.find((profile) => profile.area === employee.group) ?? matching[0];
}
export function inheritProfile<T extends AssignedEmployee>(employee: T, profile: AccessProfile): T {
  return {...employee, assignmentMode: 'template', profileId: profileKey(profile), software: [...new Set(profile.software ?? [])], access: [...new Set(profile.access ?? [])], softTokenEnabled: Boolean(profile.access?.includes('Soft Token'))};
}
export function migrateAssignments<T extends AssignedEmployee>(employees: T[], profiles: AccessProfile[]): T[] {
  return employees.map((employee) => {
    const profile = profileFor(employee, profiles);
    const access = [...(employee.access ?? profile?.access ?? [])];
    if (employee.access === undefined && employee.softTokenEnabled === true && !access.includes('Soft Token')) access.push('Soft Token');
    const tokenAssigned = access.includes('Soft Token');
    return {...employee, assignmentMode: employee.assignmentMode ?? (profile ? 'template' : 'manual'), profileId: employee.profileId ?? (profile ? profileKey(profile) : undefined), software: [...(employee.software ?? profile?.software ?? [])], access, softTokenEnabled: tokenAssigned};
  });
}
export function assignedCredentials(employee: AssignedEmployee) {
  return [...new Set(employee.software ?? [])].map((product) => {
    let hash = 2166136261;
    for (const char of `${employee.id}:${product}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    const id = product.toLowerCase().replace(/[^a-z0-9]/g, '');
    return {id, product, request: `RITM${String(hash % 1000000).padStart(6, '0')}`, state: 'Code ready', source: 'Software request', kind: product === 'Microsoft 365' ? 'Temporary password' : 'Activation code', value: `${id.toUpperCase()}-${hash.toString(36).toUpperCase().padStart(7, '0')}`, expires: 'Reset or activate at first sign-in', ready: true};
  });
}
