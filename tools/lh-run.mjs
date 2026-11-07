#!/usr/bin/env node
// Етап 4: Lighthouse 13.6.0 (accessibility) на авторизованій сесії (WP5).
// Узагальнення result_history/Pipeline_2026-11-04_09-00-00/runtime/04/lh-session.cjs:
// - Chromium (Playwright 1.62.0) з тимчасовим профілем у %TEMP% і --remote-debugging-port=0;
// - cookies і localStorage з storageState ролі (вміст не логується);
// - Lighthouse user flow: navigate для base, snapshot для станів з popup-crawler (--flow);
// - скріншоти з результатів вилучаються (можуть містити персональні дані);
// - профіль видаляється наприкінці.
//
// Використання:
//   node tools/lh-run.mjs --url <url> [--role <роль> | --state <шлях> | --no-auth] [--module <segment>]
//        [--flow --states output/runtime/02/states.json] [--only base,s001]
//        [--out-dir output/runtime/04] [--summary output/scan-lighthouse.json] [--html]
//        [--approvals output/runtime/approvals.json] [--headed]
// Коди: 0 успіх; 2 аргументи; 3 немає стану; 4 сесія недійсна; 5 помилка; 6 поза модулем.
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  parseArgs, fail, resolveState, readExtraHeaders, writeJson, outPath, safeUrl, moduleSegment, inModule, onLoginPage,
  openTarget, replay, withRetry, loadStates, loadApprovals, settle, nowIso,
} from './lib/session.mjs';
import { loadPolicy } from './lib/action-policy.mjs';

const TOOL = 'lh-run';
const require = createRequire(import.meta.url);
const LH_VERSION = JSON.parse(readFileSync(require.resolve('lighthouse/package.json'), 'utf8')).version;

const o = parseArgs(process.argv.slice(2));
if (!o.url) fail(TOOL, 'потрібен --url');
const module = o.module || moduleSegment(o.url);
const outDir = o['out-dir'] || 'output/runtime/04';
const summaryFile = o.summary || 'output/scan-lighthouse.json';
const policy = loadPolicy({ module });
const approvals = loadApprovals(o.approvals);

let statePath;
try {
  statePath = resolveState(o);
} catch (e) {
  fail(TOOL, e.message, 3);
}

let states = [{ id: 'base', label: 'base', path: [] }];
if (o.flow && o.states) {
  const data = loadStates(o.states);
  if (data.states && data.states.length) states = data.states;
}
if (typeof o.only === 'string') {
  const only = new Set(o.only.split(','));
  states = states.filter((s) => only.has(s.id));
}
if (!states.some((s) => s.id === 'base')) states.unshift({ id: 'base', label: 'base', path: [] });

const SCREENSHOT_AUDITS = ['final-screenshot', 'screenshot-thumbnails', 'full-page-screenshot'];
function stripScreenshots(lhr) {
  const copy = { ...lhr, audits: { ...lhr.audits } };
  for (const id of SCREENSHOT_AUDITS) delete copy.audits[id];
  delete copy.fullPageScreenshot;
  return copy;
}

function summarizeLhr(lhr) {
  const cat = lhr.categories && lhr.categories.accessibility;
  const refs = (cat && cat.auditRefs) || [];
  const failed = [];
  const manual = [];
  for (const ref of refs) {
    const a = lhr.audits[ref.id];
    if (!a) continue;
    if (a.scoreDisplayMode === 'manual') manual.push(a.id);
    else if (a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'informative') {
      failed.push({ id: a.id, title: a.title, weight: ref.weight, items: a.details && a.details.items ? a.details.items.length : 0 });
    }
  }
  return {
    score: cat && cat.score !== null ? Math.round(cat.score * 100) : null,
    finalDisplayedUrl: safeUrl(lhr.finalDisplayedUrl),
    gatherMode: lhr.gatherMode,
    failedAudits: failed,
    manualAudits: manual,
    runWarnings: lhr.runWarnings || [],
  };
}

const profile = mkdtempSync(path.join(os.tmpdir(), 'a11y-lh-profile-'));
const { chromium } = await import('playwright');
const puppeteer = (await import('puppeteer-core')).default;
const { startFlow } = await import('lighthouse');

const summary = {
  tool: 'lighthouse',
  version: LH_VERSION,
  runner: 'tools/lh-run.mjs (user flow на авторизованій сесії)',
  node: process.version,
  startedAt: nowIso(),
  target: safeUrl(o.url),
  module,
  role: o.role || null,
  steps: [],
};

let ctx;
let ppBrowser;
let exitCode = 0;
try {
  ctx = await chromium.launchPersistentContext(profile, {
    headless: !o.headed,
    // Новий headless (повний Chromium): headless-shell не віддає події відмальовки (NO_FCP у Lighthouse).
    channel: typeof o.channel === 'string' ? o.channel : 'chromium',
    args: ['--remote-debugging-port=0', '--window-size=1350,940'],
    // Без емуляції viewport від Playwright: інакше Lighthouse не бачить відмальовки (NO_FCP).
    viewport: null,
  });
  const page = ctx.pages()[0] || (await ctx.newPage());

  if (statePath) {
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    const extraHTTPHeaders = readExtraHeaders(statePath);
    if (extraHTTPHeaders) await ctx.setExtraHTTPHeaders(extraHTTPHeaders);
    await ctx.addCookies(state.cookies || []);
    for (const origin of state.origins || []) {
      await page.goto(origin.origin, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.evaluate((items) => {
        for (const { name, value } of items) localStorage.setItem(name, value);
      }, origin.localStorage || []).catch(() => {});
    }
  }

  await openTarget(page, o.url, module);

  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 50 && !existsSync(portFile); i += 1) await new Promise((r) => setTimeout(r, 100));
  const port = Number(readFileSync(portFile, 'utf8').split('\n')[0]);
  ppBrowser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null });
  // Окрема вкладка, створена через CDP (puppeteer), як у Lighthouse CLI з --port.
  // У вкладці, створеній Playwright, Lighthouse не фіксує відмальовку (NO_FCP).
  const pwPagePromise = ctx.waitForEvent('page', { timeout: 15000 });
  const ppPage = await ppBrowser.newPage();
  const lhPage = await pwPagePromise;
  const extraHTTPHeaders = readExtraHeaders(statePath);
  if (extraHTTPHeaders) await ppPage.setExtraHTTPHeaders(extraHTTPHeaders);

  const config = {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['accessibility'],
      formFactor: 'desktop',
      screenEmulation: { disabled: true },
      throttlingMethod: 'provided',
      disableStorageReset: true,
      output: 'json',
    },
  };
  const flow = await startFlow(ppPage, { config, name: `a11y ${module}` });
  const planned = [];

  for (const st of states) {
    const entry = { id: st.id, label: st.label, status: 'ok' };
    try {
      if (st.id === 'base') {
        await flow.navigate(o.url, { name: 'base' });
        if (onLoginPage(ppPage.url())) {
          const e = new Error(`сесія недійсна: редірект на логін (${safeUrl(ppPage.url())})`);
          e.code = 4;
          throw e;
        }
        entry.mode = 'navigation';
      } else {
        await withRetry(async (timeout) => {
          await lhPage.goto('about:blank');
          await openTarget(lhPage, o.url, module);
          await replay(lhPage, st.path, { policy, approvals, stateLabel: st.label, startUrl: o.url, module, timeout });
        });
        await settle(lhPage, 400);
        await flow.snapshot({ name: st.label });
        entry.mode = 'snapshot';
      }
      planned.push(entry);
    } catch (e) {
      entry.status = 'error';
      entry.error = String(e.message || e).split('\n')[0];
      if (e.code === 4 || e.code === 6) exitCode = e.code;
    }
    summary.steps.push(entry);
    process.stderr.write(`[${TOOL}] ${st.id} ${entry.status}\n`);
    if (exitCode) break;
  }

  if (planned.length) {
    const result = await flow.createFlowResult();
    result.steps.forEach((step, i) => {
      const entry = planned[i];
      const lhr = stripScreenshots(step.lhr);
      Object.assign(entry, summarizeLhr(lhr));
      if (lhr.runtimeError) {
        entry.status = 'error';
        entry.error = `Lighthouse runtimeError ${lhr.runtimeError.code}: ${lhr.runtimeError.message}`;
      } else if (entry.mode === 'navigation' && module && !inModule(lhr.finalDisplayedUrl, o.url, module)) {
        entry.status = 'error';
        entry.error = `finalDisplayedUrl поза модулем: ${entry.finalDisplayedUrl}`;
      }
      entry.file = writeJson(path.posix.join(outDir, `${entry.id}.json`), lhr);
    });
    if (o.html) {
      const html = await flow.generateReport();
      const abs = outPath(path.posix.join(outDir, 'flow-report.html'));
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, html, 'utf8');
      summary.htmlReport = path.posix.join(outDir, 'flow-report.html');
    }
  }
} catch (e) {
  summary.error = String(e.message || e).split('\n')[0];
  exitCode = e.code === 4 || e.code === 6 ? e.code : 5;
} finally {
  if (ppBrowser) await ppBrowser.disconnect().catch(() => {});
  if (ctx) await ctx.close().catch(() => {});
  rmSync(profile, { recursive: true, force: true });
}

summary.finishedAt = nowIso();
const base = summary.steps.find((s) => s.id === 'base');
summary.totals = {
  steps: summary.steps.length,
  ok: summary.steps.filter((s) => s.status === 'ok').length,
  errors: summary.steps.filter((s) => s.status === 'error').length,
  baseScore: base && base.score !== undefined ? base.score : null,
};
const file = writeJson(summaryFile, summary);
process.stdout.write(`${JSON.stringify({ summary: file, ...summary.totals, ...(summary.error ? { error: summary.error } : {}) }, null, 2)}\n`);
process.exit(exitCode || (summary.totals.ok === 0 ? 5 : 0));
