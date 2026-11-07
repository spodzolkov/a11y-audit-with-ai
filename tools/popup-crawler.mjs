#!/usr/bin/env node
// Етап 2: детермінований обхід попапів у межах модуля (WP6).
// BFS від базового стану: кандидати з aria-haspopup / aria-expanded / aria-controls / ролей;
// кожен клік проходить політику дій (tools/action-policy.json); лінки не натискаються;
// вихід за межі модуля фіксується в outOfModule; сигнатури станів запобігають дублям.
// Для кожного стану фіксується закриття Escape і повернення фокусу на тригер.
//
// Використання:
//   node tools/popup-crawler.mjs --url <url> [--role <роль> | --state <шлях> | --no-auth]
//        [--module <segment>] [--max-depth 3] [--max-states 80]
//        [--out output/runtime/02/states.json] [--approvals output/runtime/approvals.json] [--headed]
// Коди: 0 успіх; 2 аргументи; 3 немає стану; 4 сесія недійсна; 5 помилка; 6 поза модулем.
import { createHash } from 'node:crypto';
import {
  parseArgs, fail, resolveState, readExtraHeaders, writeJson, safeUrl, moduleSegment, inModule,
  openTarget, replay, settle, withRetry, loadApprovals, nowIso,
} from './lib/session.mjs';
import { loadPolicy, classify, CLICKABLE, isApproved } from './lib/action-policy.mjs';

const TOOL = 'popup-crawler';
const o = parseArgs(process.argv.slice(2));
if (!o.url) fail(TOOL, 'потрібен --url');

const module = o.module || moduleSegment(o.url);
const maxDepth = Number(o['max-depth'] || 3);
const maxStates = Number(o['max-states'] || 80);
const outFile = o.out || 'output/runtime/02/states.json';
const policy = loadPolicy({ module });
const approvals = loadApprovals(o.approvals);

let statePath;
try {
  statePath = resolveState(o);
} catch (e) {
  fail(TOOL, e.message, 3);
}

const CANDIDATES = [
  'button', '[role=button]', '[role=tab]', '[role=combobox]', '[role=menuitem]', '[role=treeitem]',
  '[aria-haspopup]', '[aria-expanded]', 'summary', 'select', 'a[href]', 'input[type=button]', 'input[type=submit]',
].join(', ');

const key = (el) => `${el.role}|${el.name}`;

function parseAria(line) {
  const m = /^- ([a-z]+)(?: "((?:[^"\\]|\\.)*)")?/.exec(String(line || '').split('\n')[0]);
  return m ? { role: m[1], name: (m[2] || '').replace(/\\"/g, '"') } : null;
}

function signatureOf(snapshot) {
  return createHash('sha1').update(String(snapshot).replace(/\d+/g, '#')).digest('hex').slice(0, 16);
}

async function stateSnapshot(page) {
  return page.locator('body').ariaSnapshot({ timeout: 5000 }).catch(() => '');
}

/** Перелік видимих інтерактивних елементів поточного стану (імена й ролі обчислює Playwright). */
async function listElements(page) {
  const loc = page.locator(CANDIDATES);
  const count = await loc.count();
  const seen = new Map();
  for (let i = 0; i < count; i += 1) {
    const h = loc.nth(i);
    if (!(await h.isVisible().catch(() => false))) continue;
    const aria = parseAria(await h.ariaSnapshot({ timeout: 2000 }).catch(() => ''));
    if (!aria || !aria.name) continue;
    const attrs = await h.evaluate((el) => ({
      hasPopup: el.hasAttribute('aria-haspopup') && el.getAttribute('aria-haspopup') !== 'false',
      expanded: el.hasAttribute('aria-expanded') ? el.getAttribute('aria-expanded') === 'true' : null,
      controls: el.hasAttribute('aria-controls'),
      type: el.getAttribute('type'),
      href: el.tagName === 'A' ? el.getAttribute('href') : null,
      inForm: Boolean(el.closest('form')),
      disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
    })).catch(() => null);
    if (!attrs) continue;
    const el = { role: aria.role, name: aria.name, ...attrs };
    const k = key(el);
    if (seen.has(k)) seen.get(k).duplicates += 1;
    else seen.set(k, { ...el, duplicates: 0 });
  }
  return [...seen.values()];
}

const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: !o.headed });
const extraHTTPHeaders = readExtraHeaders(statePath);
const context = await browser.newContext({
  ...(statePath ? { storageState: statePath } : {}),
  ...(extraHTTPHeaders ? { extraHTTPHeaders } : {}),
  viewport: { width: 1350, height: 940 },
});
const page = await context.newPage();

const result = {
  tool: TOOL,
  startedAt: nowIso(),
  url: safeUrl(o.url),
  module,
  role: o.role || null,
  maxDepth,
  states: [],
  outOfModule: [],
  dangerous: [],
  skipped: [],
  failures: [],
};

const signatures = new Set();
const recordedOut = new Set();
const recordedSkip = new Set();
let exitCode = 0;
let seq = 0;

async function open(path, stateLabel) {
  await withRetry(async (timeout) => {
    await page.goto('about:blank');
    await openTarget(page, o.url, module);
    await replay(page, path, { policy, approvals, stateLabel, startUrl: o.url, module, timeout });
  });
}

try {
  const queue = [{ path: [], label: 'base', depth: 0, parentKeys: new Set(), parentSig: null }];
  while (queue.length && result.states.length < maxStates) {
    const node = queue.shift();
    try {
      await open(node.path, node.label);
    } catch (e) {
      if (e.code === 4 || e.code === 6) throw e;
      const msg = String(e.message || e).split('\n')[0];
      if (/за межі модуля/.test(msg)) {
        const last = node.path[node.path.length - 1];
        result.outOfModule.push({ element: last, state: node.label, target: safeUrl(page.url()), action: 'повернуто назад', note: 'перехід виявлено після кліку' });
      } else {
        result.failures.push({ state: node.label, path: node.path, error: msg });
      }
      continue;
    }

    const snap = await stateSnapshot(page);
    const sig = signatureOf(snap);
    if (node.depth > 0 && (signatures.has(sig) || sig === node.parentSig)) continue;
    signatures.add(sig);

    const elements = await listElements(page);
    const id = node.depth === 0 ? 'base' : `s${String((seq += 1)).padStart(3, '0')}`;
    const state = { id, label: node.label, depth: node.depth, path: node.path, signature: sig, elements: elements.length };

    // Закриття і повернення фокусу (не для base).
    const trigger = node.depth > 0 ? node.path[node.path.length - 1] : null;
    if (trigger && trigger.role === 'tab') {
      // Вкладка не є попапом: Escape не має її закривати.
      state.kind = 'tab';
      state.closeBy = 'n/a';
    } else if (trigger) {
      state.kind = 'popup';
      await page.keyboard.press('Escape');
      await settle(page, 400);
      const afterSig = signatureOf(await stateSnapshot(page));
      state.closeBy = afterSig === node.parentSig ? 'Escape' : 'not-closed-by-Escape';
      state.focusReturned = await page
        .getByRole(trigger.role, { name: trigger.name, exact: true })
        .first()
        .evaluate((el) => el === document.activeElement || el.contains(document.activeElement))
        .catch(() => null);
    }
    result.states.push(state);
    process.stderr.write(`[${TOOL}] ${id} ${node.label} elements=${elements.length}\n`);

    if (node.depth >= maxDepth) continue;
    const keys = new Set(elements.map(key));
    // Однотипні елементи (рядки таблиці "Відкрити заявку 5648, ...") досліджуються одним представником.
    const patterns = new Map();
    for (const el of elements) {
      // У вкладених станах досліджуємо лише нові елементи (яких не було в батьківському стані).
      if (node.parentKeys.has(key(el))) continue;
      if (el.disabled) continue;

      if (el.role === 'link' || el.href) {
        if (el.href) {
          let target = null;
          try {
            target = new URL(el.href, page.url()).toString();
          } catch {
            target = null;
          }
          const out = !target || !inModule(target, o.url, module);
          const k = `${key(el)}|${target}`;
          if (out && !recordedOut.has(k)) {
            recordedOut.add(k);
            result.outOfModule.push({ element: { role: el.role, name: el.name }, state: node.label, target: target ? safeUrl(target) : 'невідомо', action: 'не відкрито' });
          }
        }
        continue;
      }

      const verdict = classify(policy, el);
      const approved = isApproved(approvals, el, node.label);
      if (!CLICKABLE.has(verdict.cls) && !approved) {
        const k = `${key(el)}|${node.label}`;
        if (!recordedSkip.has(k)) {
          recordedSkip.add(k);
          const rec = { element: { role: el.role, name: el.name, type: el.type || undefined }, state: node.label, class: verdict.cls, rule: verdict.rule };
          if (verdict.cls === 'dangerous') result.dangerous.push(rec);
          else result.skipped.push(rec);
        }
        continue;
      }
      if (verdict.cls === 'safe-close') continue;
      if (el.role === 'option') continue;
      const pattern = `${el.role}|${el.name.replace(/\d+/g, '#').split(',')[0].trim()}`;
      if (patterns.has(pattern)) {
        patterns.get(pattern).similar += 1;
        continue;
      }
      const rep = { name: el.name, similar: 0 };
      patterns.set(pattern, rep);

      const step = { action: 'click', role: el.role, name: el.name, hasPopup: el.hasPopup, expanded: el.expanded, controls: el.controls, type: el.type || undefined, inForm: el.inForm };
      const kind = el.role === 'tab' ? 'tab' : 'popup';
      const label = node.depth === 0 ? `${kind}:${el.name}` : `${node.label} > ${kind}:${el.name}`;
      queue.push({ path: [...node.path, step], label, depth: node.depth + 1, parentKeys: keys, parentSig: sig, rep });
    }
    for (const [pattern, rep] of patterns) {
      if (rep.similar) (result.grouped ||= []).push({ state: node.label, pattern, representative: rep.name, similar: rep.similar });
    }
  }
  if (queue.length) result.truncated = { reason: `досягнуто --max-states ${maxStates}`, pending: queue.length };
} catch (e) {
  result.error = String(e.message || e).split('\n')[0];
  exitCode = e.code === 4 || e.code === 6 ? e.code : 5;
} finally {
  await browser.close();
}

result.finishedAt = nowIso();
result.totals = {
  states: result.states.length,
  popups: result.states.filter((s) => s.depth > 0).length,
  outOfModule: result.outOfModule.length,
  dangerous: result.dangerous.length,
  skipped: result.skipped.length,
  failures: result.failures.length,
  escapeNotClosing: result.states.filter((s) => s.closeBy === 'not-closed-by-Escape').length,
  focusNotReturned: result.states.filter((s) => s.focusReturned === false).length,
};
const file = writeJson(outFile, result);
process.stdout.write(`${JSON.stringify({ out: file, ...result.totals, ...(result.error ? { error: result.error } : {}) }, null, 2)}\n`);
process.exit(exitCode);
