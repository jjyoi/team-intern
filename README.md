# scotiaon 🌱

one place to help managers welcome new employees and support them when they leave

scotiaon brings employee details and onboarding work into a clear manager dashboard
it tracks tasks equipment software access emails and important dates so managers can see what is ready and what still needs attention

## 💡 why we built it

before someone can start work a manager needs to arrange equipment software and access
these details can end up spread across emails forms and separate systems

leaving a team also needs care
files need to be handed over equipment returned and access removed

our goal is to reduce repeated work and make missing steps easier to spot from the first day to the last

## ✨ what you can do

### see your team at a glance

- view team readiness based on average checklist completion
- see how many journeys are complete or still in progress
- scroll through open blockers below the readiness bar
- open a blocker to go straight to that employee
- review active onboarding journeys and the next task for each person

### manage people and their journeys

- search employees by name role or business area
- filter onboarding and offboarding journeys
- filter completed journeys and work still in progress
- open each employee to see their tasks access and devices
- check off tasks and flag or clear blockers
- keep completed onboarding visible until another journey is started

onboarding covers offer confirmation background checks equipment access and the welcome plan
offboarding covers departure records handover equipment returns and access removal

### use a role profile or a custom setup

reusable role profiles save the equipment software and access needed for a job
managers can create a profile edit it later and use it when adding employees

- choose a laptop and headset
- assign software such as jira microsoft 365 or bloomberg terminal
- choose access items including soft token
- save profile changes and choose whether to update software and access for assigned employees

for a unique job choose **custom / other / manual** during onboarding
this lets the manager set up one employee without adding another reusable profile
forms require all needed fields including a clear choice when no equipment software or access is needed

### keep employee identity consistent

each employee has a sid an eid and a scotiabank email address
selecting one of these fields copies it

- sid uses `s` followed by seven digits
- eid contains eight digits
- new email addresses use `first.last@scotiabank.com`
- matching names receive `first.last2@scotiabank.com` then `first.last3@scotiabank.com`
- managers cannot choose or edit the email address

the server assigns the final email and sqlite enforces unique addresses
existing valid corporate addresses are kept and removed employees keep their address reservation

### move between onboarding and offboarding

to offboard an existing employee enter their sid eid name last working day and manager
the app checks that both identifiers belong to the same record and that the name matches
the email is retrieved automatically

for someone returning choose **onboarding → returning employee**
enter their existing identifiers and name then choose the new start date and role setup

the same record is reused with a fresh checklist
the sid eid email and history stay with that person
view previous journeys in their tasks tab

an employee can be removed only after all offboarding tasks are complete
removal needs confirmation and deletes their record and checklist
keep the record if you want to use the returning employee flow later

### show access based on the actual assignment

employees see software activation values only for the software assigned to them
soft token appears only when that permission is assigned through a role profile or manual setup

soft token generates a six digit code that changes every minute
the python api uses a stored secret and an hmac based time step to generate it
codes can be copied while they are valid
completed offboarding closes token access

### bring useful emails together

- read sample messages from hr it access and workplace technology
- see a short summary or open the full message
- search sender employee subject and message contents
- filter by employee or unread status
- open the related employee checklist
- keep read status after restarting the app

the timeline also groups start dates and departures by date so managers can plan ahead

the devices tab shows assigned equipment sample updates and an option to prepare a follow up email draft

## 🎨 built to feel clear

scotiaon uses inter consistent spacing a shared grid and a simple red white and neutral colour palette
primary actions are easy to find and destructive actions need extra care

accessibility features include keyboard focus labelled controls a skip link responsive layouts and reduced motion support
status text helps explain progress without relying only on colour

## ⚙️ how it works technically

### frontend

react and typescript power the interface
vinext runs on vite and supports the app router structure
tailwind css handles styling with shadcn and base ui components and lucide icons

### local api and database

`npm run dev` starts two processes

- the website on `http://localhost:3000`
- a python http api on `http://127.0.0.1:8010`

the browser sends requests to `/api/demo`
vite forwards them to the python server
python reads and writes sqlite through its built in `sqlite3` module
no pip packages or separate database account are needed

sqlite stores manager accounts sessions workspace data email read status generated addresses and soft token secrets
people role profiles and task progress are saved as a json workspace for each manager

client saves are queued in order
the server returns saved data including its final email assignments

manager sign in uses sid and a password
passwords are stored as salted pbkdf2 hashes
sessions use hashed tokens stored in sqlite with an eight hour expiry and an httponly cookie
signing out invalidates the session

### work from the merged ticket branch

the repository also includes drizzle orm a cloudflare d1 schema sql migrations and api routes for workspaces journeys tasks and tickets
the current manager interface uses python and local sqlite
the d1 ticket routes are separate and are not connected to that interface or its saved records

## 🚀 run it locally

install node.js 22.13 or newer and python 3.10 or newer
npm comes with node.js
project dependencies are downloaded with npm

from the repository root run this once

```sh
cd app
npm ci
```

then start the app

```sh
npm run dev
```

open [localhost:3000](http://localhost:3000)

use the included manager account

```text
sid       s1234567
password  Welcome123!
```

keep the terminal running while using the app
press ctrl+c in that terminal to stop both servers
next time run `npm run dev` from the `app` folder again

on windows use `npm.cmd` if powershell blocks `npm.ps1`
the launcher uses `python` on windows and `python3` on macos or linux

if port 8010 is in use stop the older app process before starting another copy
restart after changing python files so the new backend code loads

## 💾 keep your progress

the database is created automatically at

```text
app/backend/data/demo.sqlite3
```

saved progress stays after closing the browser or restarting
failed saves show an error

when moving to another computer stop the app on both computers and copy this database into the same folder
the database is ignored by git and is not included in the source zip

## 📁 project layout

```text
README.md
package-source.py
app/
  app/                 main page layout styles and api routes
  components/          forms login emails and shared ui
  lib/                 api client identity and role helpers
  backend/             python api and integration tests
    data/              local sqlite database created at runtime
  scripts/             development launcher
  db/                  separate drizzle schema and d1 service
  drizzle/             sql migrations for the d1 workflow
  public/              static assets
```

## 🧪 checks

from the `app` folder

```sh
npx tsc --noEmit
npm run build
python3 -m unittest discover -s backend -p 'test_*.py'
```

on windows replace `python3` with `python`

the python tests cover sign in sessions request validation saved workspaces email uniqueness migration and soft token permissions

## 🛠 challenges and lessons

**keeping one identity across several journeys**
matching by name alone would confuse people with the same name
checking sid and eid together lets the app reuse the right record and keep earlier journey history

**keeping access tied to the role**
a shared list of codes would show access that some employees should not have
saved assignments now control which software values and soft token appear

**saving changes without losing progress**
stable profile ids queued saves and server controlled emails help role edits and checklist updates stay consistent

**handling frontend and backend updates together**
the website can reload while an older python process keeps running
response validation shows a restart message when that server returns an older response format

**bringing branches together**
the sqlite interface and d1 ticket workflow use different data models
we kept the employee flow intact with separate ticket routes
connecting them is future work

## 🌱 what comes next

- connect real email and service request systems
- connect the ticket workflow to the manager interface through one data model
- add company single sign on and stronger permission checks
- add an audit log for important employee and access changes
- test accessibility with more users and assistive tools

this hackathon build uses sample emails equipment records and software activation values
email allocation creates an address in the app and does not create a real mailbox
soft token is a standalone sample and does not connect to scotiabank identity services

## 📦 share the source

from the repository root run

```sh
python3 package-source.py
```

on windows use `python package-source.py`

this creates `team-intern-source.zip`
it leaves out installed dependencies build output local databases and environment files to keep the archive small

after unzipping run `npm ci` inside `app` to download the node dependencies again
