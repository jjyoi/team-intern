# team-intern

ScotiaPath onboarding demo. React and Vinext frontend with a Python standard-library API and SQLite.

## Start the app

Requires Node 22.13+ and Python 3.10+. No pip packages are needed.

First-time setup:

```sh
cd app
npm ci
```

Every time you want to open the app:

```sh
npm run dev
```

This starts both the Python API and website. Open http://localhost:3000. Ctrl+C stops both. On Windows use npm.cmd if PowerShell blocks npm.ps1. The launcher uses python3 on macOS/Linux and python on Windows. If needed, set the PYTHON environment variable to your Python executable.

## Demo manager account

- Email: manager@example.com
- Password: Welcome123!

The API stores a salted password hash, an eight-hour session in an HttpOnly cookie, and the manager workspace in SQLite. Sign out invalidates the session. This is a local demo with public credentials, not a production identity system. Use sample employee data.

## Database

`app/backend/data/demo.sqlite3` is created automatically. It stores managers, sessions, and workspace records (people, profiles, checklist progress). Existing browser demo data is imported if the database has no saved workspace. Your records remain after restarting the app.

Python uses only sqlite3, http.server, hashlib, secrets, and other standard-library modules. No external database account, server, or pip install is required. The API binds to 127.0.0.1:8010. Vite proxies /api/demo to it. Local SQLite cannot run inside the existing Cloudflare Worker hosting configuration; hosting this version requires a Python runtime and persistent storage.

The database folder is ignored by Git. To migrate actual demo records, stop the app on both computers and copy demo.sqlite3 into the same folder on the new computer. Exclude it when sharing source code.

## Verification

```sh
cd app
python3 -m unittest discover -s backend -p 'test_*.py'
npm run build
```

On Windows use python instead of python3. Tests cover incorrect credentials, sessions, sign-out, expired sessions, SQLite persistence, invalid requests, and password hashing. `npm run build` builds the website; development API access is provided by npm run dev.

## Interface

The app uses Inter, consistent grid spacing, compact corner radii, one global Add person action, and a minimal date rail for the timeline. Navigation, search, labelled controls, touch targets, keyboard focus, and reduced-motion support remain available. ServiceNow, Outlook, and equipment data are samples.

## Onboarding emails

The Onboarding emails section shows five seeded messages from HR, IT Access, and Workplace Technology. Each message includes a key-update summary and full contents. Search matches sender, employee, subject, summary, and body. Open a message to mark it as read; SQLite retains read status. Messages link to their employee’s checklist when that employee exists in the workspace.

The local API scopes messages to the signed-in manager. It does not retrieve live Outlook mail. A future mail connector can insert real messages into the onboarding_emails table using the same view. Restart npm run dev after updating the Python API so it creates the new table and seeds messages automatically.
