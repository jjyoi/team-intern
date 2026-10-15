"""Integration checks using only Python's standard library."""
import hashlib
import json
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
import server


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        server.DATABASE = Path(self.directory.name) / 'demo.sqlite3'
        server.initialize()
        class QuietHandler(server.Handler):
            def log_message(self, *_args):
                pass
        self.api = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
        self.thread = threading.Thread(target=self.api.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.api.server_port}'

    def tearDown(self):
        self.api.shutdown()
        self.api.server_close()
        self.thread.join()
        self.directory.cleanup()

    def request(self, path, data=None, cookie=None, origin=None, raw=None):
        headers = {'Content-Type': 'application/json'}
        if cookie:
            headers['Cookie'] = cookie
        if origin:
            headers['Origin'] = origin
        body = raw if raw is not None else json.dumps(data).encode() if data is not None else None
        request = Request(self.url + '/api/demo/' + path, data=body, headers=headers)
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read()), response.headers

    def login(self):
        status, account, headers = self.request('login', {'sid': ' S1234567 ', 'password': server.PASSWORD})
        self.assertEqual(status, 200)
        self.assertEqual(account['id'], 'jordan')
        self.assertEqual(account['sid'], server.SID)
        self.assertIn('HttpOnly', headers['Set-Cookie'])
        self.assertIn('SameSite=Strict', headers['Set-Cookie'])
        return headers['Set-Cookie'].split(';')[0]

    def test_login_and_server_session(self):
        self.assertEqual(self.request('session')[0], 401)
        self.assertEqual(self.request('login', {'sid': server.SID, 'password': 'wrong'})[0], 401)
        cookie = self.login()
        self.assertEqual(self.request('session', cookie=cookie)[1]['name'], 'Jordan Wallace')

    def test_login_requires_sid(self):
        for sid in ('manager@example.com', 's123', '12345678', 's12345678'):
            self.assertEqual(self.request('login', {'sid': sid, 'password': server.PASSWORD})[0], 400)
        self.assertEqual(self.request('login', {'email': server.EMAIL, 'password': server.PASSWORD})[0], 400)
        self.assertEqual(self.request('login', {'sid': 's7654321', 'password': server.PASSWORD})[0], 401)

    def test_legacy_manager_migration_preserves_password_and_workspace(self):
        salt = '00' * 16
        digest = hashlib.pbkdf2_hmac('sha256', b'Migrated123!', bytes.fromhex(salt), 200_000).hex()
        with server.connect() as db:
            db.execute('DROP TABLE managers')
            db.execute('CREATE TABLE managers (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, salt TEXT, password_hash TEXT)')
            db.execute('INSERT INTO managers VALUES (?, ?, ?, ?, ?)', ('jordan', 'Jordan Wallace', server.EMAIL, salt, digest))
            db.execute('INSERT INTO workspaces VALUES (?, ?)', ('jordan', '{"roster": [], "tasks": {}, "profiles": []}'))
        server.initialize()
        server.initialize()
        status, account, headers = self.request('login', {'sid': server.SID, 'password': 'Migrated123!'})
        self.assertEqual(status, 200)
        self.assertEqual(account['sid'], server.SID)
        cookie = headers['Set-Cookie'].split(';')[0]
        self.assertEqual(self.request('workspace', cookie=cookie)[1]['roster'], [])
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT password_hash FROM managers').fetchone()[0], digest)

    def test_workspace_persists_in_sqlite(self):
        cookie = self.login()
        self.assertIsNone(self.request('workspace', cookie=cookie)[1])
        state = {'roster': [{'name': 'Taylor'}], 'tasks': {'taylor': ['offer']}, 'profiles': []}
        self.assertEqual(self.request('workspace', state, cookie)[0], 200)
        server.initialize()  # Starting again retains the account, sessions, and records.
        self.assertEqual(self.request('workspace', cookie=cookie)[1], state)
        with server.connect() as db:
            self.assertEqual(json.loads(db.execute('SELECT data FROM workspaces').fetchone()[0]), state)

    def test_sign_out_and_expired_session(self):
        cookie = self.login()
        self.assertEqual(self.request('logout', {}, cookie)[0], 200)
        self.assertEqual(self.request('workspace', cookie=cookie)[0], 401)
        cookie = self.login()
        with server.connect() as db:
            db.execute('UPDATE sessions SET expires=0')
        self.assertEqual(self.request('session', cookie=cookie)[0], 401)

    def test_rejects_bad_and_cross_site_writes(self):
        self.assertEqual(self.request('workspace', {'roster': [], 'tasks': {}, 'profiles': []})[0], 401)
        cookie = self.login()
        self.assertEqual(self.request('workspace', {}, cookie)[0], 400)
        self.assertEqual(self.request('workspace', {}, cookie, origin='https://example.com')[0], 403)
        self.assertEqual(self.request('workspace', raw=b'{', cookie=cookie)[0], 400)
        self.assertEqual(self.request('login', {'sid': [], 'password': None})[0], 400)

    def test_email_inbox_and_read_status(self):
        self.assertEqual(self.request('emails')[0], 401)
        cookie = self.login()
        status, messages, _ = self.request('emails', cookie=cookie)
        self.assertEqual(status, 200)
        self.assertEqual(len(messages), 5)
        self.assertTrue(all(not message['is_read'] for message in messages))
        self.assertTrue(all(message['body'] and message['summary'] for message in messages))
        message_id = messages[0]['id']
        self.assertEqual(self.request('emails/read', {'id': message_id}, cookie)[0], 200)
        server.initialize()
        self.assertEqual(len(self.request('emails', cookie=cookie)[1]), 5)
        self.assertTrue(next(message for message in self.request('emails', cookie=cookie)[1] if message['id'] == message_id)['is_read'])
        self.assertEqual(self.request('emails/read', {'id': 'missing'}, cookie)[0], 404)
        self.assertEqual(self.request('emails/read', {'id': []}, cookie)[0], 400)
        with server.connect() as db:
            db.execute("UPDATE onboarding_emails SET manager_id='other' WHERE id=?", (message_id,))
        self.assertEqual(len(self.request('emails', cookie=cookie)[1]), 4)
        self.assertEqual(self.request('emails/read', {'id': message_id}, cookie)[0], 404)

    def test_soft_token_permission_and_minute_rotation(self):
        self.assertEqual(self.request('soft-token?employee_id=maya')[0], 401)
        cookie = self.login()
        state = {'roster': [{'id': 'maya', 'type': 'onboarding', 'softTokenEnabled': False}], 'tasks': {}, 'profiles': []}
        self.request('workspace', state, cookie)
        self.assertEqual(self.request('soft-token?employee_id=maya', cookie=cookie)[0], 403)
        state['roster'][0]['softTokenEnabled'] = True
        self.request('workspace', state, cookie)
        self.assertEqual(self.request('soft-token?employee_id=maya', cookie=cookie)[0], 403)
        state['roster'][0]['access'] = ['Soft Token']
        self.request('workspace', state, cookie)
        status, token, _ = self.request('soft-token?employee_id=maya', cookie=cookie)
        self.assertEqual(status, 200)
        self.assertRegex(token['code'], r'^\d{6}$')
        self.assertEqual(token['expires_at'] % 60, 0)
        self.assertGreater(token['expires_at'], token['server_time'])
        self.assertEqual(self.request('soft-token?employee_id=other', cookie=cookie)[0], 404)
        secret = b'12345678901234567890'
        self.assertEqual(server.soft_token_code(secret, 60), server.soft_token_code(secret, 119))
        self.assertNotEqual(server.soft_token_code(secret, 119), server.soft_token_code(secret, 120))
        self.assertEqual(server.soft_token_code(secret, 60), '287082')
        state['roster'][0]['type'] = 'offboarding'
        state['tasks']['maya'] = ['departure', 'handover', 'return', 'revoke']
        self.request('workspace', state, cookie)
        self.assertEqual(self.request('soft-token?employee_id=maya', cookie=cookie)[0], 403)
        state['roster'][0]['softTokenEnabled'] = False
        self.request('workspace', state, cookie)
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM soft_tokens').fetchone()[0], 0)

    def test_database_does_not_store_plaintext_password_or_session(self):
        cookie = self.login()
        with server.connect() as db:
            manager = db.execute('SELECT * FROM managers').fetchone()
            self.assertNotEqual(manager['password_hash'], server.PASSWORD)
            self.assertEqual(manager['password_hash'], hashlib.pbkdf2_hmac('sha256', server.PASSWORD.encode(), bytes.fromhex(manager['salt']), 200_000).hex())
            token = db.execute('SELECT token_hash FROM sessions').fetchone()[0]
            self.assertNotEqual(token, cookie.split('=', 1)[1])


if __name__ == '__main__':
    unittest.main()
