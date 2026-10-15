"""Allocate stable, unique employee email addresses inside a SQLite transaction."""
import re
import sqlite3
import unicodedata


def email_stem(person):
    parts = str(person.get('name', '')).strip().split()
    first = person.get('firstName') or (parts[0] if parts else '')
    last = person.get('lastName') or ' '.join(parts[1:])
    def clean(value, fallback):
        value = unicodedata.normalize('NFKD', str(value)).encode('ascii', 'ignore').decode().lower()
        return re.sub('[^a-z0-9]', '', value)[:24] or fallback
    return clean(first, 'employee') + '.' + clean(last, 'user')


def ensure_emails(db, manager_id, state, import_existing=False):
    roster = []
    for original in state.get('roster', []):
        if not isinstance(original, dict) or not isinstance(original.get('id'), str):
            roster.append(original)
            continue
        person = dict(original)
        key = (manager_id, person['id'])
        saved = db.execute('SELECT email FROM employee_emails WHERE manager_id=? AND employee_id=?', key).fetchone()
        if saved:
            person['email'] = saved['email']
            roster.append(person)
            continue
        legacy = str(person.get('email') or '').strip().lower()
        legacy = legacy if import_existing and re.fullmatch(r'[a-z0-9][a-z0-9._+-]*@scotiabank\.com', legacy) else None
        stem = email_stem(person)
        number = 1
        while True:
            candidate = legacy or f'{stem}{number if number > 1 else ""}@scotiabank.com'
            try:
                db.execute('INSERT INTO employee_emails (manager_id, employee_id, email) VALUES (?, ?, ?)', (*key, candidate))
                person['email'] = candidate
                break
            except sqlite3.IntegrityError:
                saved = db.execute('SELECT email FROM employee_emails WHERE manager_id=? AND employee_id=?', key).fetchone()
                if saved:
                    person['email'] = saved['email']
                    break
                legacy = None
                number += 1
        roster.append(person)
    return {**state, 'roster': roster}
