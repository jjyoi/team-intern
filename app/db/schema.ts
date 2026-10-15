import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const employees = sqliteTable('employees', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  department: text('department').notNull(),
  manager: text('manager').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const journeys = sqliteTable('journeys', {
  id: text('id').primaryKey(),
  employeeId: text('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['onboarding', 'offboarding'] }).notNull(),
  status: text('status', {
    enum: ['blocked', 'track', 'complete', 'offboarding'],
  })
    .notNull()
    .default('track'),
  statusLabel: text('status_label').notNull().default('On track'),
  progress: integer('progress').notNull().default(0),
  targetDate: text('target_date').notNull(),
  nextMilestone: text('next_milestone').notNull().default('Journey review'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  journeyId: text('journey_id')
    .notNull()
    .references(() => journeys.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  owner: text('owner').notNull(),
  dueDate: text('due_date').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  blocked: integer('blocked', { mode: 'boolean' }).notNull().default(false),
  kind: text('kind').notNull().default('general'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  journeyId: text('journey_id')
    .notNull()
    .references(() => journeys.id, { onDelete: 'cascade' }),
  item: text('item').notNull(),
  category: text('category', {
    enum: ['Hardware', 'Software', 'Access', 'Offboarding'],
  }).notNull(),
  status: text('status', {
    enum: [
      'Draft',
      'Submitted',
      'Awaiting approval',
      'In progress',
      'Ready',
      'Completed',
    ],
  })
    .notNull()
    .default('Submitted'),
  assignee: text('assignee').notNull(),
  requestedAt: text('requested_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  dueDate: text('due_date').notNull(),
  description: text('description').notNull().default(''),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const ticketEvents = sqliteTable('ticket_events', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  note: text('note').notNull().default(''),
  actor: text('actor').notNull().default('Jordan Wallace'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const roleProfiles = sqliteTable('role_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  department: text('department').notNull(),
  manager: text('manager').notNull(),
  ready: integer('ready', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const roleProfileItems = sqliteTable('role_profile_items', {
  id: text('id').primaryKey(),
  roleProfileId: text('role_profile_id')
    .notNull()
    .references(() => roleProfiles.id, { onDelete: 'cascade' }),
  category: text('category', {
    enum: ['Hardware', 'Software', 'Access'],
  }).notNull(),
  name: text('name').notNull(),
  assignee: text('assignee').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
});
