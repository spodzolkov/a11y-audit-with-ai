#!/usr/bin/env node
// Перевірка, чи storageState ролі ще дає авторизований доступ до цілі аудиту.
// Вміст стану (cookies, токени) НЕ виводиться і нікуди не копіюється.
//
// Використання:
//   node tools/auth-check.mjs --role <роль> --url <url> [--state <шлях>] [--timeout <мс>]
//                             [--login-hosts host1,host2]
// Вихід: JSON { role, verdict, ageMinutes, earliestCookieExpiryMinutes, finalUrl }
// Коди: 0 valid, 3 missing, 4 expired (редірект на логін), 5 error.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LOGIN_HOSTS, onLoginPage, readExtraHeaders } from './lib/session.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const next = argv[i + 1];
      o[argv[i].slice(2)] = next && !next.startsWith('--') ? (i += 1, next) : true;
    }
  }
  return o;
}

function report(result, code) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(code);
}

// Прибираємо query з URL, щоб у вивід не потрапили токени в параметрах.
const safeUrl = (u) => String(u || '').replace(/\?[^#]*/, '');

const o = args(process.argv.slice(2));
if (!o.role || !o.url) {
  process.stderr.write('usage: node tools/auth-check.mjs --role <роль> --url <url>\n');
  process.exit(2);
}

const statePath = path.resolve(ROOT, o.state || path.join('auth', 'playwright', '.auth', `${o.role}.json`));
const base = { role: o.role, stateFile: path.relative(ROOT, statePath).split(path.sep).join('/') };

if (!existsSync(statePath)) report({ ...base, verdict: 'missing', hint: 'node tools/auth-login.mjs --role <роль> --url "<URL>"' }, 3);

const ageMinutes = Math.round((Date.now() - statSync(statePath).mtimeMs) / 60000);
let earliestCookieExpiryMinutes = null;
try {
  const st = JSON.parse(readFileSync(statePath, 'utf8'));
  const expiries = (st.cookies || []).map((c) => c.expires).filter((e) => typeof e === 'number' && e > 0);
  if (expiries.length) earliestCookieExpiryMinutes = Math.round((Math.min(...expiries) * 1000 - Date.now()) / 60000);
} catch {
  report({ ...base, verdict: 'error', ageMinutes, error: 'стан не є коректним JSON' }, 5);
}

const loginHosts = (typeof o['login-hosts'] === 'string' ? o['login-hosts'].split(',') : DEFAULT_LOGIN_HOSTS).map((h) => h.trim());

let browser;
try {
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: true });
  const extraHTTPHeaders = readExtraHeaders(statePath);
  const context = await browser.newContext({
    storageState: statePath,
    ...(extraHTTPHeaders ? { extraHTTPHeaders } : {}),
  });
  const page = await context.newPage();
  const timeout = Number(o.timeout) || 45000;
  await page.goto(o.url, { waitUntil: 'domcontentloaded', timeout });
  // SPA може переадресувати на логін після завантаження скриптів.
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await page.waitForTimeout(3000);
  const finalUrl = page.url();
  const onLogin = onLoginPage(finalUrl, loginHosts);
  await browser.close();
  report(
    {
      ...base,
      verdict: onLogin ? 'expired' : 'valid',
      ageMinutes,
      earliestCookieExpiryMinutes,
      finalUrl: safeUrl(finalUrl),
      ...(onLogin ? { hint: 'node tools/auth-login.mjs --role <роль> --url "<URL>"' } : {}),
    },
    onLogin ? 4 : 0,
  );
} catch (e) {
  if (browser) await browser.close().catch(() => {});
  report({ ...base, verdict: 'error', ageMinutes, error: String(e && e.message ? e.message : e).split('\n')[0] }, 5);
}
