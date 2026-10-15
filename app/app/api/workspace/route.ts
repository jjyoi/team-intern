import { getWorkspaceSnapshot } from '@/db/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await getWorkspaceSnapshot());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load the workspace.';
    return Response.json({ error: message }, { status: 500 });
  }
}
