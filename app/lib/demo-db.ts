/** Client for the local Python + SQLite demo API. */
export type Manager = { id: string; name: string; email: string; sid: string };
export const DEMO_SID = 's1234567';
export const DEMO_PASSWORD = 'Welcome123!';

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/demo/${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: body === undefined ? undefined : {'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new Error('The local database is unavailable. Start the app with npm run dev.'); }
  let result: {error?: string};
  try { result = await response.json() as {error?: string}; }
  catch { throw new Error('The Python database API is unavailable. Restart npm run dev.'); }
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result as T;
}

export function signIn(sid: string, password: string): Promise<Manager> { return request('login', {sid, password}); }
export async function currentManager(): Promise<Manager | undefined> {
  const response = await fetch('/api/demo/session', {credentials: 'same-origin'});
  if (response.status === 401) return undefined;
  if (!response.ok) throw new Error('The local database is unavailable. Start the app with npm run dev.');
  return response.json();
}
export async function signOut(): Promise<void> { await request('logout', {}); }
export async function loadWorkspace<T>(managerId: string): Promise<T | undefined> {
  const state = await request<T | null>('workspace');
  if (state !== null) return state;
  const legacy = managerId === 'jordan' ? localStorage.getItem('scotiapath-demo-v1') : null;
  return legacy ? JSON.parse(legacy) as T : undefined;
}
let pendingWorkspaceSave: Promise<unknown> = Promise.resolve();
export async function saveWorkspace<T>(_managerId: string, state: T): Promise<T> {
  const snapshot = JSON.parse(JSON.stringify(state));
  const next = pendingWorkspaceSave.catch(() => {}).then(async () => {
    const saved = await request<unknown>('workspace', snapshot);
    if (!saved || typeof saved !== 'object' ||
        !Array.isArray((saved as {roster?: unknown}).roster) ||
        !(saved as {tasks?: unknown}).tasks || typeof (saved as {tasks?: unknown}).tasks !== 'object' ||
        !Array.isArray((saved as {profiles?: unknown}).profiles)) {
      throw new Error('The database server is running an older version. In the terminal running the app, press Ctrl+C, run npm run dev again, then refresh this page.');
    }
    return saved as T;
  });
  pendingWorkspaceSave = next;
  return next;
}

export type OnboardingEmail = {
  id: string; employee_id: string; employee_name: string; sender: string;
  subject: string; summary: string; body: string; received_at: string; is_read: boolean;
};
export function listEmails(): Promise<OnboardingEmail[]> { return request('emails'); }
export async function markEmailRead(id: string): Promise<void> { await request('emails/read', {id}); }

export type SoftTokenCode = {code: string; expires_at: number; server_time: number};
export function getSoftToken(employeeId: string): Promise<SoftTokenCode> {
  return request(`soft-token?employee_id=${encodeURIComponent(employeeId)}`);
}
