import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  getWorkspaceSnapshot,
  recalculateJourneyProgress,
  type TicketStatus,
} from '@/db/service';
import { ticketEvents, tickets } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: TicketStatus };
    const statuses: TicketStatus[] = [
      'Draft',
      'Submitted',
      'Awaiting approval',
      'In progress',
      'Ready',
      'Completed',
    ];
    if (!body.status || !statuses.includes(body.status))
      return Response.json(
        { error: 'A valid status is required.' },
        { status: 400 },
      );
    const db = getDb();
    const [current] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);
    if (!current)
      return Response.json({ error: 'Request not found.' }, { status: 404 });
    await db
      .update(tickets)
      .set({ status: body.status, updatedAt: new Date().toISOString() })
      .where(eq(tickets.id, id));
    await db
      .insert(ticketEvents)
      .values({
        id: crypto.randomUUID(),
        ticketId: id,
        fromStatus: current.status,
        toStatus: body.status,
        note: 'Status advanced in the Scotiapath demo.',
        actor: 'Jordan Wallace',
      });
    const journey = await recalculateJourneyProgress(current.journeyId);
    return Response.json({ workspace: await getWorkspaceSnapshot(), journey });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to update the request.';
    return Response.json({ error: message }, { status: 500 });
  }
}
