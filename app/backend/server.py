"""Local ScotiaPath demo API. Python standard library only."""
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from pathlib import Path
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from urllib.parse import urlparse

DATABASE = Path(os.environ.get('SCOTIAPATH_DB', Path(__file__).parent / 'data' / 'demo.sqlite3'))
EMAIL = 'manager@example.com'
PASSWORD = 'Welcome123!'
COOKIE = 'scotiapath_session'


@contextmanager
def connect():
    db = sqlite3.connect(DATABASE, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize():
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript('''
            CREATE TABLE IF NOT EXISTS managers (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
                salt TEXT NOT NULL, password_hash TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, manager_id TEXT NOT NULL, expires REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS onboarding_emails (
                id TEXT PRIMARY KEY, manager_id TEXT NOT NULL, employee_id TEXT NOT NULL,
                employee_name TEXT NOT NULL, sender TEXT NOT NULL, subject TEXT NOT NULL,
                summary TEXT NOT NULL, body TEXT NOT NULL, received_at TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS workspaces (
                manager_id TEXT PRIMARY KEY, data TEXT NOT NULL
            );
        ''')
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac('sha256', PASSWORD.encode(), bytes.fromhex(salt), 200_000).hex()
        db.execute('INSERT OR IGNORE INTO managers VALUES (?, ?, ?, ?, ?)',
                   ('jordan', 'Jordan Wallace', EMAIL, salt, digest))

        messages = [
            ('laptop', 'maya', 'Maya Chen', 'Workplace Technology <equipment@example.com>', 'Laptop delivery moved to October 14', 'Maya’s laptop will arrive after her start date. Arrange a loaner before October 12.', 'Hi Jordan,\n\nMaya Chen’s laptop delivery has moved to October 14. Her start date is October 12. Please arrange a loaner laptop with Workplace Technology so she can work on her first day.\n\nRequest: RITM001842\nWorkplace Technology', '2026-10-08T14:30:00Z'),
            ('vpn', 'noah', 'Noah Williams', 'IT Access <access@example.com>', 'Approval needed: Noah’s VPN access', 'Approve Noah’s VPN and permission groups so IT can finish setting up his access.', 'Hi Jordan,\n\nNoah Williams’s VPN request is waiting for manager approval. Please review the permission groups and complete the access task in his onboarding checklist. His start date is October 19.\n\nRequest: RITM001856\nIT Access', '2026-10-08T13:15:00Z'),
            ('background', 'priya', 'Priya Shah', 'HR Onboarding <onboarding@example.com>', 'Priya’s background check is complete', 'Priya’s background check has cleared. You can complete that task in her checklist.', 'Hi Jordan,\n\nPriya Shah’s background check has cleared. Please update her checklist and confirm her equipment request for the November 2 start date.\n\nHR Onboarding', '2026-10-07T16:45:00Z'),
            ('welcome', 'maya', 'Maya Chen', 'HR Onboarding <onboarding@example.com>', 'Maya’s first-week plan', 'Add team introductions and the first-week schedule before Maya starts.', 'Hi Jordan,\n\nPlease prepare Maya Chen’s first-week schedule, name a team buddy, and arrange introductory meetings. Add these details to the welcome task before October 12.\n\nHR Onboarding', '2026-10-07T14:00:00Z'),
            ('equipment', 'eli', 'Eli Martin', 'Workplace Technology <equipment@example.com>', 'Equipment request received for Eli', 'Eli’s laptop request has been received. The delivery date is still pending.', 'Hi Jordan,\n\nWe received the laptop and headset request for Eli Martin. We will send a delivery update once the equipment is assigned. His start date is November 9.\n\nRequest: RITM001901\nWorkplace Technology', '2026-10-06T15:00:00Z'),
        ]
        for message in messages:
            db.execute('INSERT OR IGNORE INTO onboarding_emails (id, manager_id, employee_id, employee_name, sender, subject, summary, body, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', (message[0], 'jordan', *message[1:]))


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data, cookie=None):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(body)

    def manager(self):
        cookies = SimpleCookie()
        try:
            cookies.load(self.headers.get('Cookie', ''))
            token = cookies[COOKIE].value
        except (KeyError, ValueError):
            return None
        with connect() as db:
            return db.execute('''SELECT m.id, m.name, m.email FROM managers m
                JOIN sessions s ON m.id=s.manager_id WHERE s.token_hash=? AND s.expires>?''',
                (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()

    def body(self):
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            raise ValueError('Expected JSON data.')
        length = int(self.headers.get('Content-Length', '0'))
        if not 0 < length <= 1_000_000:
            raise ValueError('The request is empty or too large.')
        data = json.loads(self.rfile.read(length))
        if not isinstance(data, dict):
            raise ValueError('Expected a JSON object.')
        return data

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/api/demo/health':
            return self.reply(200, {'ok': True})
        account = self.manager()
        if not account:
            return self.reply(401, {'error': 'Please sign in.'})
        if path == '/api/demo/session':
            return self.reply(200, dict(account))
        if path == '/api/demo/emails':
            with connect() as db:
                rows = db.execute('SELECT * FROM onboarding_emails WHERE manager_id=? ORDER BY received_at DESC, id', (account['id'],)).fetchall()
            return self.reply(200, [{key: bool(row[key]) if key == 'is_read' else row[key] for key in row.keys() if key != 'manager_id'} for row in rows])
        if path == '/api/demo/workspace':
            with connect() as db:
                row = db.execute('SELECT data FROM workspaces WHERE manager_id=?', (account['id'],)).fetchone()
            return self.reply(200, json.loads(row['data']) if row else None)
        self.reply(404, {'error': 'Endpoint not found.'})

    def do_POST(self):
        # Reject cross-site browser writes. Local development goes through Vite's proxy.
        origin = self.headers.get('Origin')
        allowed = os.environ.get('SCOTIAPATH_ALLOWED_ORIGINS',
            'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173').split(',')
        if origin and origin not in allowed:
            return self.reply(403, {'error': 'This website origin is not allowed.'})
        try:
            data = self.body()
        except (ValueError, UnicodeError):
            return self.reply(400, {'error': 'Invalid JSON request.'})
        path = urlparse(self.path).path
        if path == '/api/demo/login':
            email, password = data.get('email', ''), data.get('password', '')
            if not isinstance(email, str) or not isinstance(password, str):
                return self.reply(400, {'error': 'Email and password must be text.'})
            with connect() as db:
                account = db.execute('SELECT * FROM managers WHERE email=?', (email.strip().lower(),)).fetchone()
                salt = bytes.fromhex(account['salt']) if account else bytes(16)
                digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 200_000).hex()
                if not account or not hmac.compare_digest(digest, account['password_hash']):
                    return self.reply(401, {'error': 'Incorrect email or password.'})
                token = secrets.token_urlsafe(32)
                db.execute('DELETE FROM sessions WHERE expires<=?', (time.time(),))
                db.execute('INSERT INTO sessions VALUES (?, ?, ?)',
                           (hashlib.sha256(token.encode()).hexdigest(), account['id'], time.time() + 8 * 3600))
            return self.reply(200, {key: account[key] for key in ('id', 'name', 'email')},
                              f'{COOKIE}={token}; HttpOnly; SameSite=Strict; Path=/api/demo')
        account = self.manager()
        if not account:
            return self.reply(401, {'error': 'Please sign in.'})
        if path == '/api/demo/logout':
            cookies = SimpleCookie(self.headers.get('Cookie', ''))
            with connect() as db:
                db.execute('DELETE FROM sessions WHERE token_hash=?',
                           (hashlib.sha256(cookies[COOKIE].value.encode()).hexdigest(),))
            return self.reply(200, {'ok': True}, f'{COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/demo; Max-Age=0')
        if path == '/api/demo/emails/read':
            if not isinstance(data.get('id'), str):
                return self.reply(400, {'error': 'Choose a message.'})
            with connect() as db:
                result = db.execute('UPDATE onboarding_emails SET is_read=1 WHERE id=? AND manager_id=?', (data['id'], account['id']))
                if not result.rowcount:
                    return self.reply(404, {'error': 'Message not found.'})
            return self.reply(200, {'ok': True})
        if path == '/api/demo/workspace':
            if not isinstance(data.get('roster'), list) or not isinstance(data.get('tasks'), dict) or not isinstance(data.get('profiles'), list):
                return self.reply(400, {'error': 'Invalid workspace data.'})
            with connect() as db:
                db.execute('INSERT INTO workspaces VALUES (?, ?) ON CONFLICT(manager_id) DO UPDATE SET data=excluded.data',
                           (account['id'], json.dumps(data)))
            return self.reply(200, {'ok': True})
        self.reply(404, {'error': 'Endpoint not found.'})


if __name__ == '__main__':
    initialize()
    port = int(os.environ.get('SCOTIAPATH_API_PORT', '8010'))
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'ScotiaPath SQLite API: http://127.0.0.1:{port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
