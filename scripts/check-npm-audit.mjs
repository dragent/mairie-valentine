import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * High and critical advisories that remain after analysis.
 * A major upgrade is not applied here: each entry says why.
 * Any other high or critical advisory, including devDependencies, fails the run.
 */
const waived = new Map([
  [
    'GHSA-vfj7-8cjw-p6xm',
    'braces <=3.0.3 has no patched release (latest is still 3.0.3). It is only reached from eslint-config-next while linting globs. npm offers eslint-config-next 14 as the fix, which cannot lint Next.js 16.',
  ],
]);

const blocking = new Set(['high', 'critical']);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const audit = spawnSync('npm', ['audit', '--json', '--prefix', 'apps/web'], {
  cwd: root,
  encoding: 'utf8',
});

if (!audit.stdout) {
  console.error(audit.stderr || 'npm audit produced no report');
  process.exit(1);
}

const report = JSON.parse(audit.stdout);
const vulnerabilities = report.vulnerabilities ?? {};
const seen = new Set();
const problems = [];

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!blocking.has(vulnerability.severity)) {
    continue;
  }
  if (!explained(name, new Set())) {
    problems.push(name);
  }
}

for (const [id, reason] of waived) {
  if (!seen.has(id)) {
    console.error(`Waived advisory ${id} is no longer reported. Drop it from the allowlist.`);
    console.error(reason);
    problems.push(id);
  }
}

if (problems.length > 0) {
  console.error('Dependency audit failed:', problems.join(', '));
  process.exit(1);
}

console.log('Dependency audit passed. Waived after analysis:', [...seen].join(', '));

function explained(name, stack) {
  if (stack.has(name)) {
    return false;
  }

  const vulnerability = vulnerabilities[name];
  if (!vulnerability || !blocking.has(vulnerability.severity)) {
    return true;
  }

  stack.add(name);
  const vias = Array.isArray(vulnerability.via) ? vulnerability.via : [];
  if (vias.length === 0) {
    return false;
  }

  for (const via of vias) {
    if (typeof via === 'string') {
      if (!explained(via, stack)) {
        return false;
      }
      continue;
    }

    if (!via || typeof via !== 'object' || !blocking.has(via.severity)) {
      continue;
    }

    const id = advisoryId(via);
    if (!waived.has(id)) {
      console.error(`${via.severity} ${id} in ${via.name}: ${via.title}`);
      return false;
    }
    seen.add(id);
  }

  return true;
}

function advisoryId(via) {
  const url = typeof via.url === 'string' ? via.url : '';
  const match = url.match(/GHSA-[0-9a-z-]+/i);

  return match ? match[0] : String(via.source ?? via.name);
}
