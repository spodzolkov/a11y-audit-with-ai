// Спільна логіка runtime-інструментів (axe-run, lh-run, popup-crawler).
// Вміст storageState (cookies, токени) ніколи не виводиться і не копіюється в output/.
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, CLICKABLE, isApproved } from './action-policy.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_LOGIN_HOSTS = [];
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const next = argv[i + 1];
      o[argv[i].slice(2)] = next !== undefined && !next.startsWith('--') ? (i += 1, next) : true;
    }
  }
  return o;
}

export function fail(tool, message, code = 2) {
  process.stderr.write(`[${tool}] ${message}\n`);
  process.exit(code);
}

/** Шлях до storageState: --state або auth/playwright/.auth/<role>.json; null = без авторизації. */
export function resolveState(o) {
  if (o['no-auth']) return null;
  if (!o.state && !o.role) return null;
  const p = path.resolve(ROOT, o.state || path.join('auth', 'playwright', '.auth', `${o.role}.json`));
  if (!existsSync(p)) throw new Error(`storageState не знайдено: ${path.relative(ROOT, p)} (виконай node tools/auth-login.mjs --role <роль> --url "<URL>")`);
  return p;
}

/** Додаткові HTTP-заголовки сесії (напр. Basic Auth, введений вручну в браузері під час auth-login). */
export function readExtraHeaders(statePath) {
  if (!statePath || !existsSync(statePath)) return undefined;
  try {
    const st = JSON.parse(readFileSync(statePath, 'utf8'));
    return st && st.extraHTTPHeaders && typeof st.extraHTTPHeaders === 'object' ? st.extraHTTPHeaders : undefined;
  } catch {
    return undefined;
  }
}

/** Запис дозволено лише в output/ (read-only політика пайплайну). */
export function outPath(rel) {
  const abs = path.resolve(ROOT, rel);
  const r = path.relative(path.join(ROOT, 'output'), abs);
  if (r.startsWith('..') || path.isAbsolute(r)) throw new Error(`запис дозволено лише в output/: ${rel}`);
  return abs;
}

export function writeJson(rel, data) {
  const abs = outPath(rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

export const safeUrl = (u) => String(u || '').replace(/\/\/[^/@]+@/, '//').replace(/\?[^#]*/, '');

/** Хеш-шлях без query: "#/a/b/orders?x=1" -> "/a/b/orders". */
export function hashPath(url) {
  const h = new URL(url).hash.replace(/^#/, '');
  return h.split('?')[0].replace(/\/+$/, '');
}

/** Module segment = останнє слово хеш-шляху (runtime-scan-rules.md, розділ 1). */
export function moduleSegment(url) {
  const parts = hashPath(url).split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}

export function inModule(url, startUrl, module) {
  try {
    const u = new URL(url);
    const s = new URL(startUrl);
    if (u.origin !== s.origin || u.pathname !== s.pathname) return false;
    return moduleSegment(url) === module;
  } catch {
    return false;
  }
}

export function onLoginPage(url, loginHosts = DEFAULT_LOGIN_HOSTS) {
  try {
    const u = new URL(url);
    if (loginHosts.includes(u.host)) return true;
    const route = `${u.pathname}${u.hash.replace(/^#/, '')}`;
    return /(^|\/)(login|signin|sign-in|auth|sso)(\/|$|\?)/i.test(route);
  } catch {
    return false;
  }
}

export function loadApprovals(file) {
  const p = path.resolve(ROOT, file || 'output/runtime/approvals.json');
  if (!existsSync(p)) return [];
  const data = JSON.parse(readFileSync(p, 'utf8'));
  return Array.isArray(data) ? data : data.approvals || [];
}

export function loadStates(file) {
  const p = path.resolve(ROOT, file);
  if (!existsSync(p)) throw new Error(`файл станів не знайдено: ${file} (спершу node tools/popup-crawler.mjs)`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** Очікування стабілізації SPA після дії. */
export async function settle(page, ms = 600) {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

/** Відкрити ціль і перевірити, що сесія дійсна і ми в межах модуля. */
export async function openTarget(page, url, module, { timeout = 45000, settleMs = 2500 } = {}) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await settle(page, settleMs);
  const finalUrl = page.url();
  if (onLoginPage(finalUrl)) {
    const e = new Error(`сесія недійсна: редірект на логін (${safeUrl(finalUrl)}). Виконай node tools/auth-login.mjs --role <роль> --url "<URL>"`);
    e.code = 4;
    throw e;
  }
  if (module && !inModule(finalUrl, url, module)) {
    const e = new Error(`після завантаження сторінка поза модулем "${module}": ${safeUrl(finalUrl)}`);
    e.code = 6;
    throw e;
  }
  return finalUrl;
}

export function locatorFor(page, step) {
  const loc = page.getByRole(step.role, { name: step.name, exact: true });
  return step.nth ? loc.nth(step.nth) : loc.first();
}

/**
 * Відтворити шлях до стану. Кожен клік перевіряється політикою дій:
 * дозволено лише safe/safe-close або елемент, схвалений людиною (approvals.json).
 */
export async function replay(page, steps, { policy, approvals = [], stateLabel, startUrl, module, timeout = 8000 }) {
  for (const step of steps || []) {
    if (step.action === 'press') {
      await page.keyboard.press(step.key);
      await settle(page, 300);
      continue;
    }
    const verdict = classify(policy, step);
    if (!CLICKABLE.has(verdict.cls) && !isApproved(approvals, step, stateLabel)) {
      throw new Error(`крок заблоковано політикою дій (${verdict.cls}, ${verdict.rule}): ${step.role} "${step.name}"`);
    }
    const loc = locatorFor(page, step);
    await loc.waitFor({ state: 'visible', timeout });
    if (step.action === 'hover') await loc.hover({ timeout });
    else if (step.action === 'focus') await loc.focus({ timeout });
    else await loc.click({ timeout });
    await settle(page);
    if (module && startUrl && !inModule(page.url(), startUrl, module)) {
      throw new Error(`крок "${step.name}" вивів за межі модуля: ${safeUrl(page.url())}`);
    }
  }
}

/** Повторити дію з наростаючим таймаутом (3 спроби). */
export async function withRetry(fn, { attempts = 3, baseTimeout = 8000 } = {}) {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn(baseTimeout * (i + 1), i);
    } catch (e) {
      if (e && (e.code === 4 || /заблоковано політикою|за межі модуля/.test(e.message))) throw e;
      last = e;
    }
  }
  throw last;
}

export const nowIso = () => new Date().toISOString();
