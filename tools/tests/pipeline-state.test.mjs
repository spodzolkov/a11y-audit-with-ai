// Сценарний тест tools/pipeline-state.mjs в ізольованій копії (у %TEMP%).
// Запуск: node --test tools/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'pipeline-state.mjs');

function sandbox() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pstest-'));
  mkdirSync(path.join(root, 'tools'));
  copyFileSync(SRC, path.join(root, 'tools', 'pipeline-state.mjs'));
  const run = (...args) => {
    const r = spawnSync(process.execPath, [path.join(root, 'tools', 'pipeline-state.mjs'), ...args], { encoding: 'utf8' });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const state = () => JSON.parse(readFileSync(path.join(root, 'output', 'pipeline-state.json'), 'utf8'));
  return { root, run, state, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const INIT = ['init', '--pipeline-id', 'test-1', '--url', 'https://x/#/a/orders', '--module', 'orders', '--role', 'positive_director'];

test('init створює стан schemaVersion 2 з 11 етапами і реальним часом', () => {
  const s = sandbox();
  try {
    const before = Date.now();
    assert.equal(s.run(...INIT).code, 0);
    const st = s.state();
    assert.equal(st.schemaVersion, 2);
    assert.equal(st.stages.length, 11);
    assert.equal(st.status, 'running');
    const t = new Date(st.startedAt).getTime();
    assert.ok(t >= before - 1000 && t <= Date.now() + 1000, 'startedAt має бути поточним часом');
    assert.equal(s.run('validate').code, 0);
  } finally { s.cleanup(); }
});

test('машина станів: дозволені й недозволені переходи', () => {
  const s = sandbox();
  try {
    s.run(...INIT);
    assert.equal(s.run('stage', '1', 'complete').code, 1, 'pending -> completed заборонено');
    assert.equal(s.run('stage', '1', 'start').code, 0);
    assert.equal(s.run('stage', '1', 'approve').code, 1, 'in_progress -> approved заборонено');
    assert.equal(s.run('stage', '1', 'await').code, 0);
    assert.equal(s.run('stage', '1', 'approve', '--comment', 'Так').code, 0);
    assert.equal(s.run('stage', '1', 'complete', '--result', 'ok').code, 0);
    const st1 = s.state().stages[0];
    assert.equal(st1.status, 'completed');
    assert.equal(st1.humanApproval, 'approved');
    assert.ok(st1.completedAt);
    assert.equal(s.run('stage', '2', 'start').code, 0);
    assert.equal(s.run('stage', '2', 'fail').code, 0);
    assert.equal(s.state().stages[1].error, 'не вказано');
    assert.equal(s.run('stage', '2', 'retry').code, 0);
    assert.equal(s.run('stage', '99', 'start').code, 1);
  } finally { s.cleanup(); }
});

test('finish completed відхиляється, доки є незавершені етапи', () => {
  const s = sandbox();
  try {
    s.run(...INIT);
    assert.equal(s.run('finish', 'completed').code, 1);
    for (let n = 1; n <= 11; n += 1) s.run('stage', String(n), 'skip', '--comment', 'test');
    assert.equal(s.run('finish', 'completed').code, 0);
    assert.equal(s.run('validate').code, 0);
    assert.equal(s.state().status, 'completed');
  } finally { s.cleanup(); }
});

test('journal додає заголовки фаз/етапів один раз і форматує PROBLEM', () => {
  const s = sandbox();
  try {
    s.run(...INIT);
    s.run('journal', 'QUESTION', '--stage', '1', '--text', 'Питання 1');
    s.run('journal', 'ANSWER', '--stage', '1', '--text', 'Відповідь 1');
    s.run('journal', 'PROBLEM', '--stage', '2', '--text', 'Збій', '--severity', 'high');
    const j = readFileSync(path.join(s.root, 'output', 'pipeline-journal.md'), 'utf8');
    assert.equal(j.match(/## Етап 1 — Discovery/g).length, 1);
    assert.equal(j.match(/## Фаза B/g).length, 1);
    assert.match(j, /— ПИТАННЯ\nПитання 1/);
    assert.match(j, /- Критичність: high/);
    assert.match(j, /- Вирішення: відкрито/);
    assert.equal(s.run('journal', 'BOGUS', '--stage', '1', '--text', 'x').code, 2);
  } finally { s.cleanup(); }
});

test('archive не копіює секрети; init відмовляє без архіву і очищує лише з --clean', () => {
  const s = sandbox();
  try {
    s.run(...INIT);
    for (let n = 1; n <= 11; n += 1) s.run('stage', String(n), 'skip');
    s.run('finish', 'completed');
    writeFileSync(path.join(s.root, 'output', 'session-state.json'), '{"cookies":[]}');
    writeFileSync(path.join(s.root, 'output', '01-discovery.md'), '# x');

    const r1 = s.run('init', '--pipeline-id', 'test-2', '--url', 'https://x');
    assert.equal(r1.code, 1, 'без архіву init має відмовити');
    assert.match(r1.out, /не заархівовано/);

    assert.equal(s.run('archive').code, 0);
    const hist = path.join(s.root, 'result_history');
    const [dir] = readdirSync(hist);
    const archived = readdirSync(path.join(hist, dir));
    assert.ok(archived.includes('pipeline-state.json'));
    assert.ok(archived.includes('01-discovery.md'));
    assert.ok(!archived.includes('session-state.json'), 'секрет не має архівуватись');

    const r2 = s.run('init', '--pipeline-id', 'test-2', '--url', 'https://x');
    assert.equal(r2.code, 1, 'без --clean init має відмовити');
    assert.equal(s.run('init', '--pipeline-id', 'test-2', '--url', 'https://x', '--clean').code, 0);
    assert.equal(s.state().pipelineId, 'test-2');
    assert.ok(!existsSync(path.join(s.root, 'output', 'session-state.json')));
  } finally { s.cleanup(); }
});

test('init не перезаписує незавершений запуск', () => {
  const s = sandbox();
  try {
    s.run(...INIT);
    const r = s.run('init', '--pipeline-id', 'test-2', '--url', 'https://x', '--clean');
    assert.equal(r.code, 1);
    assert.match(r.out, /running/);
  } finally { s.cleanup(); }
});
