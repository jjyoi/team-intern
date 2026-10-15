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
        state = {'roster': [{'id': 'taylor', 'name': 'Taylor Morgan'}], 'tasks': {'taylor': ['offer']}, 'profiles': []}
        status, state, _ = self.request('workspace', state, cookie)
        self.assertEqual(status, 200)
        server.initialize()  # Starting again retains the account, sessions, and records.
        self.assertEqual(self.request('workspace', cookie=cookie)[1], state)
        with server.connect() as db:
            self.assertEqual(json.loads(db.execute('SELECT data FROM workspaces').fetchone()[0]), {key:value for key,value in state.items() if key != 'tickets'})

    def test_generated_emails_are_unique_stable_and_server_controlled(self):
        cookie = self.login()
        state = {'roster': [
            {'id': 'one', 'firstName': 'Taylor', 'lastName': 'Morgan', 'email': 'chosen@scotiabank.com'},
            {'id': 'two', 'name': 'Taylor Morgan'},
            {'id': 'three', 'name': 'Taylor Morgan'},
            {'id': 'accent', 'firstName': 'Renée', 'lastName': "O’Neil"},
        ], 'tasks': {}, 'profiles': []}
        status, saved, _ = self.request('workspace', state, cookie)
        self.assertEqual(status, 200)
        self.assertEqual([p['email'] for p in saved['roster']], [
            'taylor.morgan@scotiabank.com', 'taylor.morgan2@scotiabank.com',
            'taylor.morgan3@scotiabank.com', 'renee.oneil@scotiabank.com'])
        saved['roster'][0].update(firstName='Different', email='hacked@scotiabank.com', type='offboarding')
        _, saved, _ = self.request('workspace', saved, cookie)
        self.assertEqual(saved['roster'][0]['email'], 'taylor.morgan@scotiabank.com')
        saved['roster'][0]['type'] = 'onboarding'
        _, saved, _ = self.request('workspace', saved, cookie)
        self.assertEqual(saved['roster'][0]['email'], 'taylor.morgan@scotiabank.com')
        saved['roster'] = []
        self.request('workspace', saved, cookie)
        server.initialize()
        saved['roster'] = [{'id': 'four', 'name': 'Taylor Morgan'}]
        _, saved, _ = self.request('workspace', saved, cookie)
        self.assertEqual(saved['roster'][0]['email'], 'taylor.morgan4@scotiabank.com')
        self.assertEqual(self.request('workspace', cookie=cookie)[1], saved)

    def test_existing_workspace_email_migration(self):
        legacy = {'roster': [
            {'id': 'one', 'name': 'Taylor Morgan', 'email': 'existing@scotiabank.com'},
            {'id': 'two', 'name': 'Taylor Morgan', 'email': 'existing@scotiabank.com'},
            {'id': 'three', 'name': 'Alex Chen', 'email': 'personal@example.com'},
            {'id': 'four', 'name': 'Sam Lee'},
        ], 'tasks': {'one': ['offer']}, 'profiles': []}
        with server.connect() as db:
            db.execute('INSERT INTO workspaces VALUES (?, ?)', ('jordan', json.dumps(legacy)))
        server.initialize()
        server.initialize()
        cookie = self.login()
        saved = self.request('workspace', cookie=cookie)[1]
        addresses = [p['email'] for p in saved['roster']]
        self.assertEqual(addresses[0], 'existing@scotiabank.com')
        self.assertEqual(len(set(addresses)), 4)
        self.assertTrue(all(address.endswith('@scotiabank.com') for address in addresses))
        self.assertEqual(saved['tasks']['one'], legacy['tasks']['one'])
        with server.connect() as db:
            other = server.ensure_emails(db, 'another-manager', {'roster': [{'id': 'four', 'name': 'Sam Lee'}]})
        self.assertEqual(other['roster'][0]['email'], 'sam.lee2@scotiabank.com')

    def test_rejects_duplicate_employee_record_ids(self):
        cookie = self.login()
        state = {'roster': [{'id': 'one'}, {'id': 'one'}], 'tasks': {}, 'profiles': []}
        self.assertEqual(self.request('workspace', state, cookie)[0], 400)

    def test_journey_date_edits_and_task_progress_persist(self):
        cookie = self.login()
        state = {'roster': [{'id': 'employee', 'name': 'Taylor Morgan', 'type': 'onboarding',
            'sid': 's7654321', 'eid': '12345678', 'dateISO': '2026-11-02',
            'taskDueDates': {'offer': '2026-10-19', 'background': '2026-10-26', 'equipment': '2026-10-29', 'access': '2026-10-30', 'welcome': '2026-11-02'}}],
            'tasks': {'employee': ['offer', 'background']}, 'profiles': []}
        status, saved, _ = self.request('workspace', state, cookie)
        self.assertEqual(status, 200)
        server.initialize()
        loaded = self.request('workspace', cookie=cookie)[1]
        self.assertEqual(loaded, saved)
        self.assertEqual(loaded['tasks']['employee'], ['offer', 'background'])
        self.assertEqual(loaded['roster'][0]['dateISO'], '2026-11-02')
        self.assertEqual(loaded['roster'][0]['taskDueDates']['access'], '2026-10-30')
        self.assertEqual(loaded['roster'][0]['sid'], 's7654321')

    def ticket_workspace(self, cookie):
        state = {'roster': [{'id':'taylor','name':'Taylor Morgan','sid':'s7654321','eid':'12345678',
            'type':'onboarding','dateISO':'2026-10-19','laptop':'MacBook M1','headset':False,
            'software':['Jira'],'access':['VPN access']}],
            'tasks':{'taylor':['offer','background']},'profiles':[]}
        status, saved, _ = self.request('workspace',state,cookie)
        self.assertEqual(status,200)
        return saved

    def test_ticket_generation_is_assignment_based_and_idempotent(self):
        cookie=self.login()
        saved=self.ticket_workspace(cookie)
        self.assertEqual(len(saved['tickets']),3)
        self.assertEqual({t['item'] for t in saved['tickets']},{'MacBook M1','Jira','VPN access'})
        self.assertTrue(all(t['status']=='Submitted' for t in saved['tickets']))
        self.assertEqual(next(t for t in saved['tickets'] if t['task_id']=='equipment')['due_date'],'2026-10-15')
        self.assertEqual(next(t for t in saved['tickets'] if t['item']=='Jira')['due_date'],'2026-10-16')
        for _ in range(2):
            _, saved_again, _=self.request('workspace',saved,cookie)
            self.assertEqual(saved_again,saved)
        server.initialize()
        self.assertEqual(self.request('workspace',cookie=cookie)[1],saved)
        self.assertEqual(self.request('tickets',cookie=cookie)[1],saved['tickets'])

    def test_ticket_completion_and_checklist_sync_in_both_directions(self):
        cookie=self.login();saved=self.ticket_workspace(cookie)
        access=[t for t in saved['tickets'] if t['task_id']=='access']
        status,saved,_=self.request('tickets/status',{'id':access[0]['id'],'status':'Completed'},cookie)
        self.assertEqual(status,200)
        self.assertNotIn('access',saved['tasks']['taylor'])
        _,saved,_=self.request('tickets/status',{'id':access[1]['id'],'status':'Completed'},cookie)
        self.assertIn('access',saved['tasks']['taylor'])
        _,saved,_=self.request('tickets/status',{'id':access[0]['id'],'status':'In progress'},cookie)
        self.assertNotIn('access',saved['tasks']['taylor'])
        saved['tasks']['taylor'].append('access')
        _,saved,_=self.request('workspace',saved,cookie)
        self.assertTrue(all(t['status']=='Completed' for t in saved['tickets'] if t['task_id']=='access'))
        saved['tasks']['taylor'].remove('access')
        _,saved,_=self.request('workspace',saved,cookie)
        self.assertTrue(all(t['status']=='Submitted' for t in saved['tickets'] if t['task_id']=='access'))
        self.assertTrue(all(t['events'][-1]['actor']=='Jordan Wallace' for t in saved['tickets'] if t['task_id']=='access'))

    def test_ticket_dates_follow_edits_without_resetting_completed_work(self):
        cookie=self.login();saved=self.ticket_workspace(cookie)
        ticket=saved['tickets'][0]
        _,saved,_=self.request('tickets/status',{'id':ticket['id'],'status':'Completed'},cookie)
        saved['roster'][0]['taskDueDates']={'equipment':'2026-10-20','access':'2026-10-21'}
        _,saved,_=self.request('workspace',saved,cookie)
        self.assertEqual({t['due_date'] for t in saved['tickets']},{'2026-10-20','2026-10-21'})
        self.assertEqual(next(t for t in saved['tickets'] if t['id']==ticket['id'])['status'],'Completed')
        self.assertTrue(any('Due date changed' in e['note'] for t in saved['tickets'] for e in t['events']))

    def test_role_assignment_changes_retire_requests_and_reopen_access(self):
        cookie=self.login();saved=self.ticket_workspace(cookie)
        saved['tasks']['taylor'].append('access')
        _,saved,_=self.request('workspace',saved,cookie)
        jira=next(t for t in saved['tickets'] if t['item']=='Jira')
        saved['roster'][0]['software']=['MATLAB']
        _,saved,_=self.request('workspace',saved,cookie)
        self.assertNotIn('access',saved['tasks']['taylor'])
        retired=next(t for t in saved['tickets'] if t['id']==jira['id'])
        self.assertFalse(retired['active']);self.assertEqual(retired['status'],'Cancelled')
        new=next(t for t in saved['tickets'] if t['item']=='MATLAB')
        self.assertTrue(new['active']);self.assertEqual(new['status'],'Submitted')
        self.assertEqual(self.request('tickets/status',{'id':retired['id'],'status':'Completed'},cookie)[0],409)

    def test_journey_transition_rehire_and_removal_keep_ticket_history(self):
        cookie=self.login();saved=self.ticket_workspace(cookie)
        old_ids={t['id'] for t in saved['tickets']}
        person=saved['roster'][0];original_journey=person['journeyId'];email=person['email']
        person['type']='offboarding';saved['tasks']['taylor']=[]
        _,saved,_=self.request('workspace',saved,cookie)
        self.assertNotEqual(saved['roster'][0]['journeyId'],original_journey)
        self.assertEqual(len([t for t in saved['tickets'] if t['active']]),3)
        self.assertTrue(all(not t['active'] for t in saved['tickets'] if t['id'] in old_ids))
        offboard_journey=saved['roster'][0]['journeyId']
        saved['roster'][0]['type']='onboarding';saved['tasks']['taylor']=[]
        _,saved,_=self.request('workspace',saved,cookie)
        self.assertNotEqual(saved['roster'][0]['journeyId'],offboard_journey)
        self.assertEqual(saved['roster'][0]['email'],email)
        self.assertEqual(saved['roster'][0]['sid'],'s7654321')
        self.assertEqual(len([t for t in saved['tickets'] if t['active']]),3)
        saved['roster']=[];saved['tasks']={}
        _,saved,_=self.request('workspace',saved,cookie)
        self.assertEqual(len(saved['tickets']),9)
        self.assertTrue(all(not t['active'] for t in saved['tickets']))

    def test_adding_first_assignment_reopens_a_previously_empty_access_task(self):
        cookie=self.login()
        state={'roster':[{'id':'unique','name':'Alex Chen','type':'onboarding','dateISO':'2026-10-19',
            'laptop':'None','headset':False,'software':[],'access':[]}],
            'tasks':{'unique':['offer','background','equipment','access','welcome']},'profiles':[]}
        _,saved,_=self.request('workspace',state,cookie)
        self.assertEqual(saved['tickets'],[])
        saved['roster'][0]['software']=['Jira']
        _,saved,_=self.request('workspace',saved,cookie)
        self.assertEqual(len(saved['tickets']),1)
        self.assertEqual(saved['tickets'][0]['status'],'Submitted')
        self.assertNotIn('access',saved['tasks']['unique'])

    def test_ticket_routes_enforce_auth_scope_validation_and_stale_updates(self):
        self.assertEqual(self.request('tickets')[0],401)
        self.assertEqual(self.request('tickets/status',{'id':'none','status':'Completed'})[0],401)
        cookie=self.login();saved=self.ticket_workspace(cookie);ticket=saved['tickets'][0]
        for status in ('Cancelled','invalid',[],None):
            self.assertEqual(self.request('tickets/status',{'id':ticket['id'],'status':status},cookie)[0],400)
        self.assertEqual(self.request('tickets/status',{'id':'missing','status':'Completed'},cookie)[0],404)
        self.assertEqual(self.request('tickets/status',{'id':ticket['id'],'status':'Completed','expected_status':'Ready'},cookie)[0],409)
        self.assertEqual(self.request('tickets/status',{'id':ticket['id'],'status':'Completed'},cookie,origin='https://example.com')[0],403)
        with server.connect() as db:
            db.execute("UPDATE journey_tickets SET manager_id='another-manager'")
        self.assertEqual(self.request('tickets',cookie=cookie)[1],[])
        self.assertEqual(self.request('tickets/status',{'id':ticket['id'],'status':'Completed'},cookie)[0],404)

    def test_ticket_migration_keeps_preexisting_completed_journeys(self):
        legacy={'roster':[{'id':'legacy','name':'Sam Lee','type':'onboarding','progress':100,
            'date':'Starts Oct 19','software':['Jira'],'access':['VPN access'],'laptop':'None'}],
            'tasks':{},'profiles':[]}
        with server.connect() as db:
            db.execute('INSERT INTO workspaces VALUES (?,?)',('jordan',json.dumps(legacy)))
        server.initialize();cookie=self.login()
        saved=self.request('workspace',cookie=cookie)[1]
        self.assertEqual(len(saved['tasks']['legacy']),5)
        self.assertTrue(all(t['status']=='Completed' for t in saved['tickets']))
        server.initialize()
        self.assertEqual(self.request('workspace',cookie=cookie)[1],saved)

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
