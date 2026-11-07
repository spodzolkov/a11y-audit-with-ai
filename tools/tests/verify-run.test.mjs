// Тести tools/verify-run.mjs на копії архіву 2026-11-04 (WP13).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARCHIVE = 'result_history/Pipeline_2026-11-04_09-00-00';
const WORK = 'output/runtime/_vtest';

after(() => rmSync(path.join(ROOT, WORK), { recursive: true, force: true }));

function verify(dir) {
  const r = spawnSync(process.execPath, ['tools/verify-run.mjs', '--dir', dir, '--out', `${WORK}/verify.json`], { cwd: ROOT, encoding: 'utf8' });
  return { status: r.status, report: JSON.parse(readFileSync(path.join(ROOT, WORK, 'verify.json'), 'utf8')) };
}

const archiveExists = existsSync(path.join(ROOT, ARCHIVE));

test('архів 2026-11-04: PASSED WITH WARNINGS (стара схема, AAA у score)', { skip: !archiveExists }, () => {
  const { status, report } = verify(ARCHIVE);
  assert.equal(status, 0);
  assert.equal(report.verdict, 'PASSED WITH WARNINGS');
  const warn = report.checks.filter((c) => c.status === 'warn').map((c) => c.id).sort();
  assert.deepEqual(warn, ['consolidation.aaa-out-of-score', 'state.schema']);
});

test('зіпсований score, вигаданий FINDING і файл сесії дають FAILED', { skip: !archiveExists }, () => {
  const dir = `${WORK}/run`;
  cpSync(path.join(ROOT, ARCHIVE), path.join(ROOT, dir), { recursive: true });
  const rep = path.join(ROOT, dir, '10-audit-report.md');
  writeFileSync(rep, readFileSync(rep, 'utf8').replace('Weighted score: 112', 'Weighted score: 100').concat('\n- FINDING-999 — вигадана\n'), 'utf8');
  writeFileSync(path.join(ROOT, dir, 'session-state.json'), '{}', 'utf8');
  const { status, report } = verify(dir);
  assert.equal(status, 1);
  assert.equal(report.verdict, 'FAILED');
  const failed = report.checks.filter((c) => c.status === 'fail').map((c) => c.id).sort();
  assert.deepEqual(failed, ['score.weighted', 'secrets', 'trace.08->10']);
});
