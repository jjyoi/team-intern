import { asc, eq } from 'drizzle-orm';
import { getDb } from './index';
import {
  employees,
  journeys,
  roleProfileItems,
  roleProfiles,
  tasks,
  ticketEvents,
  tickets,
} from './schema';

export type JourneyType = 'onboarding' | 'offboarding';
export type TicketStatus =
  | 'Draft'
  | 'Submitted'
  | 'Awaiting approval'
  | 'In progress'
  | 'Ready'
  | 'Completed';

const demoPeople = [
  {
    id: 'maya',
    name: 'Maya Chen',
    email: 'maya.chen@scotiabank.com',
    role: 'Software Engineer',
    department: 'Canadian Banking',
    manager: 'Jordan Wallace',
    targetDate: '2026-10-12',
    progress: 78,
    status: 'blocked' as const,
    statusLabel: '1 blocker',
    nextMilestone: 'Laptop delivery',
    type: 'onboarding' as const,
  },
  {
    id: 'noah',
    name: 'Noah Williams',
    email: 'noah.williams@scotiabank.com',
    role: 'Data Analyst',
    department: 'Solutions Architecture',
    manager: 'Jordan Wallace',
    targetDate: '2026-10-19',
    progress: 56,
    status: 'track' as const,
    statusLabel: 'On track',
    nextMilestone: 'VPN & access',
    type: 'onboarding' as const,
  },
  {
    id: 'priya',
    name: 'Priya Shah',
    email: 'priya.shah@scotiabank.com',
    role: 'Business Analyst',
    department: 'Canadian Banking',
    manager: 'Jordan Wallace',
    targetDate: '2026-11-02',
    progress: 32,
    status: 'track' as const,
    statusLabel: 'On track',
    nextMilestone: 'Background check',
    type: 'onboarding' as const,
  },
  {
    id: 'eli',
    name: 'Eli Martin',
    email: 'eli.martin@scotiabank.com',
    role: 'Software Developer',
    department: 'Canadian Banking',
    manager: 'Jordan Wallace',
    targetDate: '2026-11-09',
    progress: 22,
    status: 'track' as const,
    statusLabel: 'On track',
    nextMilestone: 'Equipment request',
    type: 'onboarding' as const,
  },
  {
    id: 'sarah',
    name: 'Sarah Ahmed',
    email: 'sarah.ahmed@scotiabank.com',
    role: 'Senior Analyst',
    department: 'Canadian Banking',
    manager: 'Jordan Wallace',
    targetDate: '2026-10-16',
    progress: 64,
    status: 'offboarding' as const,
    statusLabel: 'Offboarding',
    nextMilestone: 'Asset return',
    type: 'offboarding' as const,
  },
  {
    id: 'marcus',
    name: 'Marcus Lee',
    email: 'marcus.lee@scotiabank.com',
    role: 'Solution Architect',
    department: 'Solutions Architecture',
    manager: 'Jordan Wallace',
    targetDate: '2026-09-21',
    progress: 100,
    status: 'complete' as const,
    statusLabel: 'Ready',
    nextMilestone: 'Journey complete',
    type: 'onboarding' as const,
  },
];

const taskTemplates = [
  {
    key: 'offer',
    title: 'Offer and employee profile confirmed',
    owner: 'HR Onboarding',
    kind: 'profile',
    sortOrder: 1,
  },
  {
    key: 'background',
    title: 'Background check cleared',
    owner: 'HR Onboarding',
    kind: 'security',
    sortOrder: 2,
  },
  {
    key: 'equipment',
    title: 'Laptop and peripherals delivered',
    owner: 'Workplace Technology',
    kind: 'equipment',
    sortOrder: 3,
  },
  {
    key: 'access',
    title: 'VPN and permission groups assigned',
    owner: 'Manager · you',
    kind: 'access',
    sortOrder: 4,
  },
  {
    key: 'welcome',
    title: 'First-week plan and team welcome',
    owner: 'Manager · you',
    kind: 'calendar',
    sortOrder: 5,
  },
];

export function ticketTemplates(role: string, type: JourneyType) {
  if (type === 'offboarding') {
    return [
      {
        item: 'Recover assigned equipment',
        category: 'Offboarding' as const,
        assignee: 'Workplace Technology',
        description: 'Arrange return of all assigned devices and accessories.',
      },
      {
        item: 'Revoke identity and network access',
        category: 'Offboarding' as const,
        assignee: 'Identity & Access',
        description:
          'Disable ScotiaID, VPN, security groups, and shared-drive access.',
      },
      {
        item: 'Recover managed software licences',
        category: 'Offboarding' as const,
        assignee: 'Software Asset Management',
        description: 'Remove the employee from paid software licence pools.',
      },
    ];
  }

  const roleName = role.toLowerCase();
  const isDeveloper =
    roleName.includes('engineer') || roleName.includes('developer');
  const isAnalyst = roleName.includes('analyst');
  return [
    {
      item: isDeveloper
        ? 'MacBook Pro 14-inch and peripherals'
        : 'ThinkPad T14 and peripherals',
      category: 'Hardware' as const,
      assignee: 'Workplace Technology',
      description:
        'Standard laptop, dock, monitor, keyboard, mouse, and headset.',
    },
    {
      item: isDeveloper
        ? 'Engineering software bundle'
        : isAnalyst
          ? 'Analytics software bundle'
          : 'Productivity software bundle',
      category: 'Software' as const,
      assignee: 'Software Asset Management',
      description: isDeveloper
        ? 'Microsoft 365, Jira, Confluence, and IntelliJ IDEA licences.'
        : isAnalyst
          ? 'Microsoft 365, Power BI, and approved analytics tooling.'
          : 'Microsoft 365 and role-specific managed applications.',
    },
    {
      item: isDeveloper
        ? 'VPN and developer access'
        : isAnalyst
          ? 'VPN and data access'
          : 'VPN and business access',
      category: 'Access' as const,
      assignee: 'Identity & Access',
      description:
        'ScotiaID, VPN, security groups, and approved shared-drive access.',
    },
  ];
}

export async function seedDemoData() {
  const db = getDb();
  await db
    .insert(employees)
    .values(
      demoPeople.map((person) => ({
        id: person.id,
        name: person.name,
        email: person.email,
        role: person.role,
        department: person.department,
        manager: person.manager,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(journeys)
    .values(
      demoPeople.map((person) => ({
        id: `journey-${person.id}`,
        employeeId: person.id,
        type: person.type,
        status: person.status,
        statusLabel: person.statusLabel,
        progress: person.progress,
        targetDate: person.targetDate,
        nextMilestone: person.nextMilestone,
      })),
    )
    .onConflictDoNothing();

  const taskRows = demoPeople.flatMap((person) =>
    taskTemplates.map((task, index) => ({
      id: `${person.id}-${task.key}`,
      journeyId: `journey-${person.id}`,
      title:
        person.type === 'offboarding' && task.key === 'equipment'
          ? 'Assigned devices returned'
          : task.title,
      owner: task.owner,
      dueDate: person.targetDate,
      completed:
        person.id === 'marcus' ||
        index < (person.id === 'maya' || person.id === 'noah' ? 2 : 1),
      blocked: person.id === 'maya' && task.key === 'equipment',
      kind: task.kind,
      sortOrder: task.sortOrder,
    })),
  );
  for (const batch of chunks(taskRows, 8)) {
    await db.insert(tasks).values(batch).onConflictDoNothing();
  }

  let ticketNumber = 1842;
  const ticketRows = demoPeople.flatMap((person) =>
    ticketTemplates(person.role, person.type).map((template, index) => {
      const id = `RITM${String(ticketNumber).padStart(6, '0')}`;
      ticketNumber += index === 0 ? 14 : 22;
      const status: TicketStatus =
        person.id === 'marcus'
          ? 'Completed'
          : person.id === 'maya'
            ? (['In progress', 'Ready', 'Awaiting approval'] as TicketStatus[])[
                index
              ]
            : person.id === 'noah'
              ? (['Submitted', 'In progress', 'Submitted'] as TicketStatus[])[
                  index
                ]
              : 'Submitted';
      return {
        id,
        journeyId: `journey-${person.id}`,
        ...template,
        status,
        requestedAt: '2026-10-02T14:00:00.000Z',
        dueDate: person.targetDate,
      };
    }),
  );
  for (const batch of chunks(ticketRows, 6)) {
    await db.insert(tickets).values(batch).onConflictDoNothing();
  }
  const initialEvents = ticketRows.map((ticket) => ({
    id: `event-${ticket.id}-created`,
    ticketId: ticket.id,
    fromStatus: null,
    toStatus: ticket.status,
    note: 'Demo request created from role profile.',
    actor: 'ScotiaPath',
  }));
  for (const batch of chunks(initialEvents, 8)) {
    await db.insert(ticketEvents).values(batch).onConflictDoNothing();
  }

  const profileRows = [
    {
      id: 'profile-software-engineer',
      name: 'Software Engineer',
      role: 'Software Engineer',
      department: 'Canadian Banking',
      manager: 'Jordan Wallace',
      ready: true,
    },
    {
      id: 'profile-data-analyst',
      name: 'Data Analyst',
      role: 'Data Analyst',
      department: 'Solutions Architecture',
      manager: 'Jordan Wallace',
      ready: true,
    },
    {
      id: 'profile-business-analyst',
      name: 'Business Analyst',
      role: 'Business Analyst',
      department: 'Canadian Banking',
      manager: 'Jordan Wallace',
      ready: true,
    },
    {
      id: 'profile-software-developer',
      name: 'Software Developer',
      role: 'Software Developer',
      department: 'Canadian Banking',
      manager: 'Jordan Wallace',
      ready: false,
    },
  ];
  await db.insert(roleProfiles).values(profileRows).onConflictDoNothing();
  const profileItemRows = profileRows.flatMap((profile) =>
    ticketTemplates(profile.role, 'onboarding').map((item, index) => ({
      id: `${profile.id}-${index + 1}`,
      roleProfileId: profile.id,
      category: item.category as 'Hardware' | 'Software' | 'Access',
      name: item.item,
      assignee: item.assignee,
      description: item.description,
      sortOrder: index + 1,
    })),
  );
  for (const batch of chunks(profileItemRows, 8)) {
    await db.insert(roleProfileItems).values(batch).onConflictDoNothing();
  }
}

function chunks<T>(values: T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}

export async function recalculateJourneyProgress(journeyId: string) {
  const db = getDb();
  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.journeyId, journeyId))
    .orderBy(asc(tasks.sortOrder));
  const ticketRows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.journeyId, journeyId));
  const total = taskRows.length + ticketRows.length;
  const completed =
    taskRows.filter((task) => task.completed).length +
    ticketRows.filter((ticket) => ticket.status === 'Completed').length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const nextTask = taskRows.find((task) => !task.completed);
  const nextTicket = ticketRows.find((ticket) => ticket.status !== 'Completed');
  const [journey] = await db
    .select()
    .from(journeys)
    .where(eq(journeys.id, journeyId))
    .limit(1);
  const complete = progress === 100;
  const status = complete
    ? 'complete'
    : journey?.type === 'offboarding'
      ? 'offboarding'
      : journey?.status === 'blocked'
        ? 'blocked'
        : 'track';
  const statusLabel = complete
    ? 'Ready'
    : status === 'offboarding'
      ? 'Offboarding'
      : status === 'blocked'
        ? '1 blocker'
        : 'On track';
  const nextMilestone = complete
    ? 'Journey complete'
    : (nextTask?.title ?? nextTicket?.item ?? 'Journey review');
  await db
    .update(journeys)
    .set({
      progress,
      status,
      statusLabel,
      nextMilestone,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(journeys.id, journeyId));
  return { progress, status, statusLabel, nextMilestone };
}

function humanDate(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00Z`
    : `${value.replace(' ', 'T')}${value.endsWith('Z') ? '' : 'Z'}`;
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(normalized));
}

export async function getWorkspaceSnapshot() {
  await seedDemoData();
  const db = getDb();
  const peopleRows = await db
    .select({ employee: employees, journey: journeys })
    .from(employees)
    .innerJoin(journeys, eq(employees.id, journeys.employeeId))
    .orderBy(asc(journeys.targetDate));
  const taskRows = await db
    .select({ task: tasks, journey: journeys })
    .from(tasks)
    .innerJoin(journeys, eq(tasks.journeyId, journeys.id))
    .orderBy(asc(tasks.sortOrder));
  const ticketRows = await db
    .select({ ticket: tickets, journey: journeys, employee: employees })
    .from(tickets)
    .innerJoin(journeys, eq(tickets.journeyId, journeys.id))
    .innerJoin(employees, eq(journeys.employeeId, employees.id))
    .orderBy(asc(tickets.createdAt));
  const profileRows = await db
    .select()
    .from(roleProfiles)
    .orderBy(asc(roleProfiles.name));
  const profileItemRows = await db
    .select()
    .from(roleProfileItems)
    .orderBy(asc(roleProfileItems.sortOrder));

  return {
    people: peopleRows.map(({ employee, journey }) => ({
      id: employee.id,
      journeyId: journey.id,
      name: employee.name,
      email: employee.email,
      manager: employee.manager,
      initials: employee.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
      role: employee.role,
      group: employee.department,
      date: `${journey.type === 'onboarding' ? (journey.status === 'complete' ? 'Started' : 'Starts') : 'Leaves'} ${humanDate(journey.targetDate)}`,
      targetDate: journey.targetDate,
      progress: journey.progress,
      status: journey.status,
      statusLabel: journey.statusLabel,
      next: journey.nextMilestone,
      type: journey.type,
    })),
    tasks: taskRows.map(({ task, journey }) => ({
      ...task,
      personId: journey.employeeId,
    })),
    tickets: ticketRows.map(({ ticket, journey, employee }) => ({
      id: ticket.id,
      journeyId: ticket.journeyId,
      personId: journey.employeeId,
      employee: employee.name,
      item: ticket.item,
      category: ticket.category,
      status: ticket.status,
      assignee: ticket.assignee,
      requested: humanDate(ticket.requestedAt),
      due: humanDate(ticket.dueDate),
      description: ticket.description,
    })),
    roleProfiles: profileRows.map((profile) => ({
      ...profile,
      items: profileItemRows.filter(
        (item) => item.roleProfileId === profile.id,
      ),
    })),
  };
}

export async function createJourney(input: {
  name: string;
  email: string;
  role: string;
  department: string;
  manager: string;
  targetDate: string;
  type: JourneyType;
}) {
  const db = getDb();
  const employeeId = crypto.randomUUID();
  const journeyId = crypto.randomUUID();
  const templates = ticketTemplates(input.role, input.type);
  await db.insert(employees).values({
    id: employeeId,
    name: input.name,
    email: input.email,
    role: input.role,
    department: input.department,
    manager: input.manager,
  });
  await db.insert(journeys).values({
    id: journeyId,
    employeeId,
    type: input.type,
    status: input.type === 'offboarding' ? 'offboarding' : 'track',
    statusLabel: input.type === 'offboarding' ? 'Offboarding' : 'On track',
    targetDate: input.targetDate,
    nextMilestone: taskTemplates[0].title,
  });
  await db.insert(tasks).values(
    taskTemplates.map((task, index) => ({
      id: crypto.randomUUID(),
      journeyId,
      title:
        input.type === 'offboarding' && task.key === 'equipment'
          ? 'Assigned devices returned'
          : task.title,
      owner: task.owner,
      dueDate: input.targetDate,
      completed: index < 2,
      blocked: false,
      kind: task.kind,
      sortOrder: task.sortOrder,
    })),
  );
  const now = Date.now();
  const newTickets = templates.map((template, index) => ({
    id: `RITM${String(now + index).slice(-6)}`,
    journeyId,
    ...template,
    status: (index === templates.length - 1
      ? 'Awaiting approval'
      : 'Submitted') as TicketStatus,
    dueDate: input.targetDate,
  }));
  await db.insert(tickets).values(newTickets);
  await db.insert(ticketEvents).values(
    newTickets.map((ticket) => ({
      id: crypto.randomUUID(),
      ticketId: ticket.id,
      fromStatus: null,
      toStatus: ticket.status,
      note: 'Request generated from onboarding role profile.',
      actor: 'ScotiaPath',
    })),
  );
  await recalculateJourneyProgress(journeyId);
  return getWorkspaceSnapshot();
}
