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
        status, account, headers = self.request('login', {'email': ' MANAGER@EXAMPLE.COM ', 'password': server.PASSWORD})
        self.assertEqual(status, 200)
        self.assertEqual(account['id'], 'jordan')
        self.assertIn('HttpOnly', headers['Set-Cookie'])
        self.assertIn('SameSite=Strict', headers['Set-Cookie'])
        return headers['Set-Cookie'].split(';')[0]

    def test_login_and_server_session(self):
        self.assertEqual(self.request('session')[0], 401)
        self.assertEqual(self.request('login', {'email': server.EMAIL, 'password': 'wrong'})[0], 401)
        cookie = self.login()
        self.assertEqual(self.request('session', cookie=cookie)[1]['name'], 'Jordan Wallace')

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
        self.assertEqual(self.request('login', {'email': [], 'password': None})[0], 400)

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
