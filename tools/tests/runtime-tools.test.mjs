// Тести runtime-інструментів (WP5-WP7) на локальному фікстурі без авторизації.
// Запуск: node --test tools/tests/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPolicy, classify } from '../lib/action-policy.mjs';
import { moduleSegment, inModule } from '../lib/session.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = 'output/runtime/_test';
const FIXTURE = readFileSync(path.join(HERE, 'fixtures', 'module.html'));
const clicks = [];
let server;
let url;

before(async () => {
  server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/clicked') {
      clicks.push(u.searchParams.get('name'));
      res.end('ok');
      return;
    }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(FIXTURE);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}/app.html#/menu/1/module/276/main-page/orders`;
});

after(() => {
  server.close();
  rmSync(path.join(ROOT, OUT), { recursive: true, force: true });
});

// Асинхронний запуск, щоб тестовий HTTP-сервер у цьому процесі продовжував відповідати.
function run(script, args) {
  return new Promise((resolve) => {
    import('node:child_process').then(({ spawn }) => {
      const p = spawn(process.execPath, [path.join(ROOT, 'tools', script), ...args], { cwd: ROOT });
      let stdout = '';
      let stderr = '';
      p.stdout.on('data', (d) => { stdout += d; });
      p.stderr.on('data', (d) => { stderr += d; });
      p.on('close', (status) => resolve({ status, stdout, stderr }));
    });
  });
}

const readOut = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

test('політика дій: класи і збіг з початку слова', () => {
  const p = loadPolicy({ module: '__none__' });
  assert.equal(classify(p, { role: 'button', name: 'Підписати' }).cls, 'dangerous');
  assert.equal(classify(p, { role: 'tab', name: 'Непідтверджені' }).cls, 'safe');
  assert.equal(classify(p, { role: 'button', name: 'Скасувати' }).cls, 'safe-close');
  assert.equal(classify(p, { role: 'button', name: 'Скасувати документ' }).cls, 'dangerous');
  assert.equal(classify(p, { role: 'button', name: 'Створити договір' }).cls, 'dangerous-adjacent');
  assert.equal(classify(p, { role: 'button', name: 'Видалити', hasPopup: true }).cls, 'dangerous');
  assert.equal(classify(p, { role: 'button', name: 'Валюта', hasPopup: true }).cls, 'safe');
  assert.equal(classify(p, { role: 'button', name: 'Готово', type: 'submit' }).cls, 'dangerous');
  assert.equal(classify(p, { role: 'button', name: 'Щось' }).cls, 'unknown');
  const withAllow = { ...p, allow: [{ role: 'button', name: 'Щось', class: 'safe' }] };
  assert.equal(classify(withAllow, { role: 'button', name: 'Щось' }).cls, 'safe');
});

test('межа модуля за останнім словом хеш-шляху', () => {
  const start = 'https://h/redesign/#/menu/1/module/276/main-page/orders';
  assert.equal(moduleSegment(start), 'orders');
  assert.equal(moduleSegment('https://h/#/a/orders?x=1'), 'orders');
  assert.ok(inModule('https://h/redesign/#/menu/1/module/276/main-page/orders?tab=2', start, 'orders'));
  assert.ok(!inModule('https://h/redesign/#/menu/1/module/276/main-page/orders/create', start, 'orders'));
  assert.ok(!inModule('https://other/redesign/#/x/orders', start, 'orders'));
});

test('popup-crawler: попапи, вкладки, межа модуля, небезпечні дії не натискаються', { timeout: 180000 }, async () => {
  const r = await run('popup-crawler.mjs', ['--url', url, '--no-auth', '--out', `${OUT}/states.json`]);
  assert.equal(r.status, 0, r.stderr);
  const s = readOut(`${OUT}/states.json`);
  const labels = s.states.map((x) => x.label);
  assert.ok(labels.includes('base'));
  assert.ok(labels.includes('popup:Фільтр'), labels.join(', '));
  assert.ok(labels.includes('popup:Фільтр > popup:Валюта'), labels.join(', '));
  assert.ok(labels.includes('tab:Архів'), labels.join(', '));
  const filter = s.states.find((x) => x.label === 'popup:Фільтр');
  assert.equal(filter.closeBy, 'Escape');
  assert.equal(filter.focusReturned, true);
  assert.ok(s.outOfModule.some((x) => x.element.name === 'Платежі' && x.action === 'не відкрито'));
  assert.ok(s.dangerous.some((x) => x.element.name === 'Видалити'));
  assert.ok(s.skipped.some((x) => x.element.name === 'Створити договір' && x.class === 'dangerous-adjacent'));
  assert.ok(!clicks.includes('Видалити'), 'небезпечну кнопку натиснуто');
  assert.ok(!clicks.includes('Створити договір'), 'dangerous-adjacent натиснуто');
});

test('axe-run: base і стани краулера, сирий JSON на кожен стан', { timeout: 180000 }, async () => {
  const r = await run('axe-run.mjs', ['--url', url, '--no-auth', '--states', `${OUT}/states.json`, '--out-dir', `${OUT}/03`, '--summary', `${OUT}/scan-axe.json`]);
  assert.equal(r.status, 0, r.stderr);
  const s = readOut(`${OUT}/scan-axe.json`);
  assert.equal(s.version, '4.14.0');
  assert.equal(s.totals.errors, 0, JSON.stringify(s.states.filter((x) => x.error)));
  const base = s.states.find((x) => x.id === 'base');
  assert.ok(base.violations.some((v) => v.id === 'image-alt'));
  for (const st of s.states) assert.ok(readOut(st.file).violations, `немає сирого файлу для ${st.id}`);
  assert.ok(!clicks.includes('Видалити'));
});

test('lh-run: user flow 13.6.0, base navigation + snapshot попапів, без скріншотів', { timeout: 300000 }, async () => {
  const r = await run('lh-run.mjs', ['--url', url, '--no-auth', '--flow', '--states', `${OUT}/states.json`, '--only', 'base,s001', '--out-dir', `${OUT}/04`, '--summary', `${OUT}/scan-lighthouse.json`]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const s = readOut(`${OUT}/scan-lighthouse.json`);
  assert.equal(s.version, '13.6.0');
  const base = s.steps.find((x) => x.id === 'base');
  assert.equal(base.status, 'ok', base.error);
  assert.equal(base.mode, 'navigation');
  assert.equal(typeof base.score, 'number');
  assert.ok(base.failedAudits.some((a) => a.id === 'image-alt'));
  const snap = s.steps.find((x) => x.id === 's001');
  assert.equal(snap.status, 'ok', snap.error);
  assert.equal(snap.mode, 'snapshot');
  const lhr = readOut(base.file);
  assert.equal(lhr.audits['final-screenshot'], undefined);
  assert.equal(lhr.fullPageScreenshot, undefined);
});

test('інструменти відмовляються писати поза output/', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'axe-run.mjs'), '--url', 'http://127.0.0.1:1/#/a/orders', '--no-auth', '--summary', 'README.md'], { cwd: ROOT, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
});
