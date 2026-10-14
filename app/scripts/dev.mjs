import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const port = process.env.SCOTIAPATH_API_PORT || '8010';
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const api = spawn(python, ['backend/server.py'], {stdio: 'inherit'});
let web;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  web?.kill(); api.kill(); process.exitCode = code;
}
api.on('error', () => { console.error(`Could not start ${python}. Install Python 3 or set PYTHON to its executable.`); stop(1); });
api.on('exit', code => { if (!stopping) { console.error('The database API stopped. Check Python and whether port 8010 is in use.'); stop(code || 1); } });
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
try {
  let ready = false;
  for (let attempt = 0; attempt < 40 && !stopping; attempt++) {
    await delay(250);
    try { const response = await fetch(`http://127.0.0.1:${port}/api/demo/health`, {signal: AbortSignal.timeout(1000)}); if (response.ok) {ready = true; break;} } catch {}
  }
  if (!stopping && !ready) { console.error('Database startup timed out.'); stop(1); }
  if (!stopping) {
    web = spawn(process.execPath, ['node_modules/vinext/dist/cli.js', 'dev', ...process.argv.slice(2)], {stdio: 'inherit'});
    web.on('error', error => {console.error(error.message); stop(1);});
    web.on('exit', code => stop(code || 0));
  }
} catch (error) { console.error(error.message); stop(1); }
