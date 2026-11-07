#!/usr/bin/env node
// Ручна авторизація через браузер зі збереженням лише отриманого стану сесії (storageState).
// Користувач сам проходить логін у відкритому вікні Chromium; скрипт не приймає, не логує
// і не зберігає жодних паролів чи ключів — лише результуючий storageState у auth/playwright/.auth/<роль>.json.
//
// Використання:
//   node tools/auth-login.mjs --role <роль> --url <url> [--state <шлях>] [--timeout <сек>]
//                             [--login-hosts host1,host2] [--wait-for-enter]
// Коди виходу: 0 успіх (valid); 2 некоректні аргументи; 4 після закриття/Enter сторінка все ще на хості логіну; 5 помилка/таймаут.
import { mkdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { DEFAULT_LOGIN_HOSTS, parseArgs, fail, ROOT, safeUrl, onLoginPage, nowIso } from './lib/session.mjs';

const TOOL = 'auth-login';
const o = parseArgs(process.argv.slice(2));
if (!o.role || !o.url) {
  fail(TOOL, 'використання: node tools/auth-login.mjs --role <роль> --url <url> [--timeout <сек>] [--wait-for-enter]');
}

const statePath = path.resolve(ROOT, typeof o.state === 'string' ? o.state : path.join('auth', 'playwright', '.auth', `${o.role}.json`));
const stateRel = path.relative(ROOT, statePath).split(path.sep).join('/');
const r = path.relative(path.join(ROOT, 'auth', 'playwright', '.auth'), statePath);
if (r.startsWith('..') || path.isAbsolute(r)) {
  fail(TOOL, `збереження стану сесії дозволено лише в auth/playwright/.auth/: ${stateRel}`);
}

const loginHosts = (typeof o['login-hosts'] === 'string' ? o['login-hosts'].split(',') : DEFAULT_LOGIN_HOSTS).map((h) => h.trim()).filter(Boolean);
const timeoutMs = (Number(o.timeout) || 300) * 1000;

let targetOrigin = null;
try {
  targetOrigin = new URL(o.url).origin;
} catch {
  fail(TOOL, `некоректний URL: ${o.url}`);
}

mkdirSync(path.dirname(statePath), { recursive: true });

const { chromium } = await import('playwright');
let browser;
try {
  browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1350, height: 940 } });
  const page = await context.newPage();
  let capturedAuthHeader = null;
  page.on('request', async (req) => {
    try {
      if (new URL(req.url()).origin === targetOrigin) {
        const all = await req.allHeaders();
        if (all && all.authorization) capturedAuthHeader = all.authorization;
      }
    } catch {
      // ignore
    }
  });

  process.stderr.write(`[${TOOL}] Відкриваю браузер: ${safeUrl(o.url)}\n`);
  process.stderr.write(`[${TOOL}] Увійди вручну в браузері (таймаут ${Math.round(timeoutMs / 1000)} с).\n`);

  await page.goto(o.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});

  if (o['wait-for-enter']) {
    process.stderr.write(`[${TOOL}] Після входу натисни Enter у терміналі, щоб зберегти сесію...\n`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    await new Promise((resolve) => rl.once('line', resolve));
    rl.close();
  } else {
    process.stderr.write(`[${TOOL}] Очікую завершення входу та переходу на цільовий домен (${targetOrigin})...\n`);
    const deadline = Date.now() + timeoutMs;
    let sawLogin = onLoginPage(page.url(), loginHosts);
    while (Date.now() < deadline) {
      if (page.isClosed()) fail(TOOL, 'вікно браузера закрито до збереження сесії', 5);
      const cur = page.url();
      if (onLoginPage(cur, loginHosts)) sawLogin = true;
      let curOrigin = null;
      try { curOrigin = new URL(cur).origin; } catch { curOrigin = null; }
      const backOnTarget = curOrigin === targetOrigin && !onLoginPage(cur, loginHosts);
      if (backOnTarget && sawLogin) {
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(3000);
        if (!onLoginPage(page.url(), loginHosts)) break;
      } else if (backOnTarget && !sawLogin) {
        // Дамо SPA час переадресувати на SSO/логін, якщо сесії немає.
        await page.waitForTimeout(4000);
        if (onLoginPage(page.url(), loginHosts)) {
          sawLogin = true;
          continue;
        }
      }
      await page.waitForTimeout(1000);
    }
    if (Date.now() >= deadline) {
      fail(TOOL, 'перевищено час очікування авторизації в браузері', 5);
    }
  }

  const finalUrl = page.url();
  if (onLoginPage(finalUrl, loginHosts)) {
    await browser.close();
    process.stdout.write(`${JSON.stringify({ role: o.role, stateFile: stateRel, verdict: 'expired', finalUrl: safeUrl(finalUrl) }, null, 2)}\n`);
    process.exit(4);
  }

  await context.storageState({ path: statePath });
  if (capturedAuthHeader) {
    const saved = JSON.parse(readFileSync(statePath, 'utf8'));
    saved.extraHTTPHeaders = { Authorization: capturedAuthHeader };
    writeFileSync(statePath, `${JSON.stringify(saved, null, 2)}\n`, 'utf8');
  }
  await browser.close();

  const stat = statSync(statePath);
  process.stdout.write(
    `${JSON.stringify({ role: o.role, stateFile: stateRel, savedAt: nowIso(), sizeBytes: stat.size, finalUrl: safeUrl(finalUrl), verdict: 'valid' }, null, 2)}\n`,
  );
  process.exit(0);
} catch (e) {
  if (browser) await browser.close().catch(() => {});
  fail(TOOL, String(e && e.message ? e.message : e).split('\n')[0], 5);
}

