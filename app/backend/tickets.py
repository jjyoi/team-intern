"""Journey requests backed by the same local SQLite database as the workspace."""
from datetime import date, timedelta
import re
import uuid

STATUSES = ('Draft', 'Submitted', 'Awaiting approval', 'In progress', 'Ready', 'Completed')
OFFSETS = {'onboarding': {'equipment': -2, 'access': -1}, 'offboarding': {'return': 0, 'revoke': 0}}


def initialize_tickets(db):
    db.executescript('''
        CREATE TABLE IF NOT EXISTS journey_tickets (
            id TEXT PRIMARY KEY, manager_id TEXT NOT NULL, employee_id TEXT NOT NULL,
            journey_id TEXT NOT NULL, journey_type TEXT NOT NULL, employee_name TEXT NOT NULL,
            item_key TEXT NOT NULL, item TEXT NOT NULL, category TEXT NOT NULL,
            task_id TEXT NOT NULL, assignee TEXT NOT NULL, status TEXT NOT NULL,
            due_date TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(manager_id, journey_id, item_key)
        );
        CREATE TABLE IF NOT EXISTS journey_ticket_events (
            id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, from_status TEXT,
            to_status TEXT NOT NULL, actor TEXT NOT NULL, note TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS tickets_manager ON journey_tickets(manager_id, active);
        CREATE INDEX IF NOT EXISTS ticket_events_ticket ON journey_ticket_events(ticket_id);
    ''')


def event(db, ticket_id, old, new, actor, note):
    db.execute('INSERT INTO journey_ticket_events (id,ticket_id,from_status,to_status,actor,note) VALUES (?,?,?,?,?,?)',
               (uuid.uuid4().hex, ticket_id, old, new, actor, note))


def set_status(db, ticket, status, actor, note):
    if ticket['status'] == status:
        return
    db.execute('UPDATE journey_tickets SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', (status, ticket['id']))
    event(db, ticket['id'], ticket['status'], status, actor, note)


def due_date(person, task):
    custom = person.get('taskDueDates', {}).get(task) if isinstance(person.get('taskDueDates'), dict) else None
    try:
        return date.fromisoformat(custom).isoformat()
    except (TypeError, ValueError):
        pass
    anchor = person.get('dateISO', '')
    try:
        day = date.fromisoformat(anchor)
    except (ValueError, TypeError):
        match = re.search(r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b', person.get('date', ''), re.I)
        if not match:
            return ''
        try:
            month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].index(match[1].lower()) + 1
            day = date(int(match[3] or 2026), month, int(match[2]))
        except ValueError:
            return ''
    offset = OFFSETS.get(person.get('type'), {}).get(task, 0)
    for _ in range(abs(offset)):
        day += timedelta(days=1 if offset > 0 else -1)
        while day.weekday() > 4:
            day += timedelta(days=1 if offset > 0 else -1)
    return day.isoformat()


def requested_items(person):
    if person.get('type') == 'offboarding':
        return [
            ('return', 'Recover assigned equipment', 'Hardware', 'return', 'Workplace Technology'),
            ('licences', 'Recover managed software licences', 'Software', 'revoke', 'Software Asset Management'),
            ('revoke', 'Remove identity and network access', 'Access', 'revoke', 'Identity & Access'),
        ]
    result = []
    if person.get('laptop') and person['laptop'] != 'None':
        result.append(('laptop:' + person['laptop'], person['laptop'], 'Hardware', 'equipment', 'Workplace Technology'))
    if person.get('headset'):
        result.append(('headset', 'Jabra Evolve2 50', 'Hardware', 'equipment', 'Workplace Technology'))
    for field, category, assignee in [('software', 'Software', 'Software Asset Management'), ('access', 'Access', 'Identity & Access')]:
        items = person.get(field, [])
        for item in dict.fromkeys(item for item in items if isinstance(item,str)) if isinstance(items,list) else []:
            if isinstance(item, str) and item.strip():
                result.append((field + ':' + item, item, category, 'access', assignee))
    return result


def sync_task_completion(db, manager_id, state):
    # A linked checklist item is complete only when all its current tickets are complete.
    tasks = state.setdefault('tasks', {})
    for person in state.get('roster', []):
        rows = db.execute('SELECT task_id,status FROM journey_tickets WHERE manager_id=? AND journey_id=? AND active=1',
                          (manager_id, person['journeyId'])).fetchall()
        groups = {}
        for ticket in rows:
            groups.setdefault(ticket['task_id'], []).append(ticket['status'])
        completed = list(tasks.get(person['id'], []))
        for task, statuses in groups.items():
            if all(status == 'Completed' for status in statuses):
                if task not in completed:
                    completed.append(task)
            else:
                completed = [item for item in completed if item != task]
        tasks[person['id']] = completed


def reconcile_tickets(db, manager_id, state, previous=None, actor='System'):
    """Migrate records, create/retire assignment requests and sync explicit checkbox changes."""
    old_people = {person['id']: person for person in (previous or {}).get('roster', [])}
    previous_tasks = (previous or {}).get('tasks', {})
    active_journeys = set()
    for person in state.get('roster', []):
        old_person = old_people.get(person['id'])
        if not isinstance(person.get('journeyId'), str) or not person['journeyId']:
            person['journeyId'] = old_person.get('journeyId') if old_person and old_person.get('type') == person.get('type') else None
            person['journeyId'] = person['journeyId'] or uuid.uuid4().hex
        if old_person and old_person.get('type') != person.get('type') and person['journeyId'] == old_person.get('journeyId'):
            person['journeyId'] = uuid.uuid4().hex
        name = person.get('name') or (' '.join([str(person.get('firstName','')),str(person.get('lastName',''))]).strip()) or 'Employee'
        journey_id = person['journeyId']
        active_journeys.add(journey_id)
        before = db.execute('SELECT * FROM journey_tickets WHERE manager_id=? AND journey_id=?', (manager_id, journey_id)).fetchall()
        known = {row['item_key']: row for row in before}
        defaults = (['departure','handover'] if person['id'] == 'sarah' else []) if person.get('type') == 'offboarding' else (['offer','background'] if person['id'] == 'maya' else ['offer','background','equipment','access','welcome'][:max(0,min(5,int(person.get('progress',0) / 100 * 5 + 0.5)))])
        completed = state.setdefault('tasks', {}).setdefault(person['id'], defaults)
        first_import = not before and (previous is None or not old_person or not old_person.get('journeyId') or old_person['journeyId'] != journey_id)
        requested = requested_items(person)
        desired_keys = {item[0] for item in requested}
        for key, item, category, task, assignee in requested:
            due = due_date(person, task)
            ticket = known.get(key)
            if not ticket:
                ticket_id = 'RITM-' + uuid.uuid4().hex
                status = 'Completed' if first_import and task in completed else 'Submitted'
                db.execute('''INSERT INTO journey_tickets
                    (id,manager_id,employee_id,journey_id,journey_type,employee_name,item_key,item,category,task_id,assignee,status,due_date)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (ticket_id,manager_id,person['id'],journey_id,person.get('type','onboarding'),name,key,item,category,task,assignee,status,due))
                event(db,ticket_id,None,status,actor,'Created from assigned equipment, software or access')
            else:
                if not ticket['active']:
                    status = 'Submitted'
                    db.execute('UPDATE journey_tickets SET active=1 WHERE id=?', (ticket['id'],))
                    set_status(db,ticket,status,actor,'Assignment restored')
                if ticket['due_date'] != due:
                    event(db,ticket['id'],ticket['status'],ticket['status'],actor,'Due date changed to ' + (due or 'not set'))
                if ticket['due_date'] != due or ticket['employee_name'] != name:
                    db.execute('UPDATE journey_tickets SET due_date=?,employee_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', (due,name,ticket['id']))
        for ticket in before:
            if ticket['active'] and ticket['item_key'] not in desired_keys:
                set_status(db,ticket,'Cancelled',actor,'Assignment removed')
                db.execute('UPDATE journey_tickets SET active=0 WHERE id=?', (ticket['id'],))
        # Changing a checklist checkbox updates its linked requests in the same transaction.
        if old_person and old_person.get('journeyId') == journey_id:
            old_completed = previous_tasks.get(person['id'], [])
            linked = db.execute('SELECT * FROM journey_tickets WHERE manager_id=? AND journey_id=? AND active=1', (manager_id,journey_id)).fetchall()
            for ticket in linked:
                task = ticket['task_id']
                if (task in completed) != (task in old_completed):
                    if task in completed:
                        set_status(db,ticket,'Completed',actor,'Linked checklist task completed')
                    elif ticket['status'] == 'Completed':
                        set_status(db,ticket,'Submitted',actor,'Linked checklist task reopened')
    # Old journeys and removed employees stay in history without remaining actionable.
    for ticket in db.execute('SELECT * FROM journey_tickets WHERE manager_id=? AND active=1', (manager_id,)).fetchall():
        if ticket['journey_id'] not in active_journeys:
            if ticket['status'] != 'Completed':
                set_status(db,ticket,'Cancelled',actor,'Journey ended or employee removed')
            db.execute('UPDATE journey_tickets SET active=0 WHERE id=?', (ticket['id'],))
    sync_task_completion(db,manager_id,state)
    return state


def list_tickets(db, manager_id):
    rows = db.execute('SELECT * FROM journey_tickets WHERE manager_id=? ORDER BY active DESC,created_at DESC,id', (manager_id,)).fetchall()
    events = {}
    for row in db.execute('''SELECT e.* FROM journey_ticket_events e JOIN journey_tickets t ON e.ticket_id=t.id
                              WHERE t.manager_id=? ORDER BY e.rowid''', (manager_id,)):
        events.setdefault(row['ticket_id'], []).append(dict(row))
    return [{**{key: bool(row[key]) if key == 'active' else row[key] for key in row.keys() if key != 'manager_id'},
             'events': events.get(row['id'], [])} for row in rows]


def workspace_response(db, manager_id, state):
    return {**state, 'tickets': list_tickets(db,manager_id)}
