import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { getWorkspaceSnapshot, recalculateJourneyProgress } from '@/db/service';
import { tasks } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { completed?: boolean };
    if (typeof body.completed !== 'boolean')
      return Response.json(
        { error: 'completed must be a boolean.' },
        { status: 400 },
      );
    const db = getDb();
    const [current] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    if (!current)
      return Response.json({ error: 'Task not found.' }, { status: 404 });
    await db
      .update(tasks)
      .set({ completed: body.completed, updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, id));
    const journey = await recalculateJourneyProgress(current.journeyId);
    return Response.json({ workspace: await getWorkspaceSnapshot(), journey });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to update the task.';
    return Response.json({ error: message }, { status: 500 });
  }
}
