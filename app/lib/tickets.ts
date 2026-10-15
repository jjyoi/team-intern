export const ticketStatuses = ['Draft','Submitted','Awaiting approval','In progress','Ready','Completed'] as const;
export type TicketStatus = typeof ticketStatuses[number];
export type JourneyTicket = {
  id: string; employee_id: string; employee_name: string; journey_id: string; journey_type: 'onboarding' | 'offboarding';
  item: string; category: string; task_id: string; assignee: string; status: TicketStatus | 'Cancelled';
  due_date: string; active: boolean; created_at: string; updated_at: string;
  events: {id: string; from_status: string | null; to_status: string; actor: string; note: string; created_at: string}[];
};
export type TicketWorkspace = {tickets: JourneyTicket[]};
