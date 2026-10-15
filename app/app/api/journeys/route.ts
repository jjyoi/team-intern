import { createJourney, type JourneyType } from '@/db/service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const required = [
      'name',
      'email',
      'role',
      'department',
      'manager',
      'targetDate',
      'type',
    ] as const;
    for (const field of required) {
      if (typeof body[field] !== 'string' || !body[field].trim())
        return Response.json(
          { error: `${field} is required.` },
          { status: 400 },
        );
    }
    if (body.type !== 'onboarding' && body.type !== 'offboarding')
      return Response.json(
        { error: 'type must be onboarding or offboarding.' },
        { status: 400 },
      );
    const workspace = await createJourney({
      name: String(body.name).trim(),
      email: String(body.email).trim(),
      role: String(body.role).trim(),
      department: String(body.department).trim(),
      manager: String(body.manager).trim(),
      targetDate: String(body.targetDate).trim(),
      type: body.type as JourneyType,
    });
    return Response.json(workspace, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to create the journey.';
    return Response.json({ error: message }, { status: 500 });
  }
}
