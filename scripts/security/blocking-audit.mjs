import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const allowlistPath = path.join(repoRoot, '.github', 'security', 'npm-audit-allowlist.json');

const auditTargets = [
  { app: 'api', prefix: 'apps/api' },
  { app: 'web', prefix: 'apps/web' },
  { app: 'admin', prefix: 'apps/admin' },
];

function loadAllowlist() {
  if (!fs.existsSync(allowlistPath)) {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  return Array.isArray(parsed.entries) ? parsed.entries : [];
}

function parseAuditJson(rawOutput) {
  const trimmed = rawOutput.trim();
  const firstBrace = trimmed.indexOf('{');

  if (firstBrace === -1) {
    throw new Error('npm audit did not return JSON output.');
  }

  return JSON.parse(trimmed.slice(firstBrace));
}

function collectFindings(vulnerabilities) {
  return Object.entries(vulnerabilities || {})
    .map(([packageName, details]) => ({
      packageName,
      severity: details.severity,
      range: details.range || 'unknown',
      via: Array.isArray(details.via)
        ? details.via
          .map((item) => (typeof item === 'string' ? item : item.title || item.source || item.url || 'unknown advisory'))
          .join('; ')
        : 'unknown advisory',
    }))
    .filter((finding) => finding.severity === 'high' || finding.severity === 'critical');
}

function findAllowlistEntry(app, finding, allowlistEntries) {
  const today = new Date().toISOString().slice(0, 10);

  return allowlistEntries.find((entry) =>
    entry.app === app
    && entry.package === finding.packageName
    && entry.severity === finding.severity
    && typeof entry.expiresAt === 'string'
    && entry.expiresAt >= today,
  );
}

const allowlistEntries = loadAllowlist();
const failures = [];

for (const target of auditTargets) {
  console.log(`\n=== npm audit (${target.app}) ===`);

  const auditRun = spawnSync(
    'npm',
    ['audit', '--json', '--omit=dev', '--prefix', target.prefix],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    },
  );

  if (auditRun.status !== 0 && auditRun.status !== 1) {
    throw new Error(auditRun.stderr || auditRun.stdout || `npm audit failed for ${target.app}.`);
  }

  const audit = parseAuditJson(auditRun.stdout || auditRun.stderr || '');
  const counts = audit.metadata?.vulnerabilities || {};
  const findings = collectFindings(audit.vulnerabilities);

  console.log(
    `production vulnerabilities -> critical: ${counts.critical ?? 0}, high: ${counts.high ?? 0}, moderate: ${counts.moderate ?? 0}, low: ${counts.low ?? 0}`,
  );

  if (findings.length === 0) {
    console.log('No high or critical production vulnerabilities detected.');
    continue;
  }

  for (const finding of findings) {
    console.log(`- ${finding.severity.toUpperCase()} ${finding.packageName} (${finding.range}) :: ${finding.via}`);
  }

  const criticalFindings = findings.filter((finding) => finding.severity === 'critical');
  const unallowlistedHighFindings = findings.filter((finding) =>
    finding.severity === 'high' && !findAllowlistEntry(target.app, finding, allowlistEntries),
  );
  const allowlistedHighFindings = findings.filter((finding) =>
    finding.severity === 'high' && findAllowlistEntry(target.app, finding, allowlistEntries),
  );

  for (const finding of allowlistedHighFindings) {
    const entry = findAllowlistEntry(target.app, finding, allowlistEntries);
    console.log(
      `ALLOWLISTED HIGH ${finding.packageName} until ${entry?.expiresAt}: ${entry?.reason || 'No reason provided.'}`,
    );
  }

  if (criticalFindings.length > 0) {
    failures.push(
      `${target.app}: critical production vulnerabilities detected (${criticalFindings.map((finding) => finding.packageName).join(', ')})`,
    );
  }

  if (unallowlistedHighFindings.length > 0) {
    failures.push(
      `${target.app}: unallowlisted high production vulnerabilities detected (${unallowlistedHighFindings.map((finding) => finding.packageName).join(', ')})`,
    );
  }
}

if (failures.length > 0) {
  console.error('\nDependency audit failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nBlocking production dependency audit passed.');
