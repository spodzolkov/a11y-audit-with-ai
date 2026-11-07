#!/usr/bin/env node
// Етап 3: axe-core 4.14.0 на авторизованій сесії, базовий стан + стани з popup-crawler (WP5).
// Read-only: сторінка лише відкривається, попапи відкриваються/закриваються за політикою дій.
//
// Використання:
//   node tools/axe-run.mjs --url <url> [--role <роль> | --state <шлях> | --no-auth]
//        [--module <segment>] [--states output/runtime/02/states.json] [--only base,s001]
//        [--out-dir output/runtime/03] [--summary output/scan-axe.json] [--tags wcag2a,...]
//        [--approvals output/runtime/approvals.json] [--headed]
// Коди: 0 успіх (навіть з violations); 2 аргументи; 4 сесія недійсна; 5 помилка; 6 поза модулем.
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  WCAG_TAGS, parseArgs, fail, resolveState, readExtraHeaders, writeJson, safeUrl, moduleSegment,
  openTarget, replay, withRetry, loadStates, loadApprovals, nowIso,
} from './lib/session.mjs';
import { loadPolicy } from './lib/action-policy.mjs';

const TOOL = 'axe-run';
const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');
const AXE_VERSION = JSON.parse(readFileSync(require.resolve('axe-core/package.json'), 'utf8')).version;

const o = parseArgs(process.argv.slice(2));
if (!o.url) fail(TOOL, 'потрібен --url');

const module = o.module || moduleSegment(o.url);
const tags = typeof o.tags === 'string' ? o.tags.split(',') : WCAG_TAGS;
const outDir = o['out-dir'] || 'output/runtime/03';
const summaryFile = o.summary || 'output/scan-axe.json';
const policy = loadPolicy({ module });
const approvals = loadApprovals(o.approvals);

let statePath;
try {
  statePath = resolveState(o);
} catch (e) {
  fail(TOOL, e.message, 3);
}

let states = [{ id: 'base', label: 'base', path: [] }];
if (o.states) {
  const data = loadStates(o.states);
  states = data.states && data.states.length ? data.states : states;
}
if (typeof o.only === 'string') {
  const only = new Set(o.only.split(','));
  states = states.filter((s) => only.has(s.id));
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

const summary = {
  tool: 'axe-core',
  version: AXE_VERSION,
  runner: 'tools/axe-run.mjs (ін\'єкція axe.min.js у Playwright-контекст)',
  startedAt: nowIso(),
  target: safeUrl(o.url),
  module,
  role: o.role || null,
  tags,
  states: [],
};

let exitCode = 0;
try {
  for (const st of states) {
    const entry = { id: st.id, label: st.label, status: 'ok' };
    try {
      await withRetry(async (timeout) => {
        await page.goto('about:blank');
        await openTarget(page, o.url, module);
        await replay(page, st.path, { policy, approvals, stateLabel: st.label, startUrl: o.url, module, timeout });
      });
      await page.addScriptTag({ path: AXE_PATH });
      const result = await page.evaluate(async (runTags) => {
        // eslint-disable-next-line no-undef
        const r = await axe.run(document, { runOnly: { type: 'tag', values: runTags }, resultTypes: ['violations', 'incomplete'] });
        return { testEngine: r.testEngine, url: r.url, timestamp: r.timestamp, violations: r.violations, incomplete: r.incomplete, passes: r.passes.length, inapplicable: r.inapplicable.length };
      }, tags);
      result.url = safeUrl(result.url);
      entry.file = writeJson(path.posix.join(outDir, `${st.id}.json`), { state: st.label, ...result });
      entry.violations = result.violations.map((v) => ({ id: v.id, impact: v.impact, tags: v.tags.filter((t) => t.startsWith('wcag')), nodes: v.nodes.length, help: v.help }));
      entry.incomplete = result.incomplete.length;
      entry.passes = result.passes;
    } catch (e) {
      entry.status = 'error';
      entry.error = String(e.message || e).split('\n')[0];
      if (e.code === 4 || e.code === 6) {
        exitCode = e.code;
        summary.states.push(entry);
        break;
      }
    }
    summary.states.push(entry);
    process.stderr.write(`[${TOOL}] ${st.id} ${entry.status}${entry.violations ? ` violations=${entry.violations.length}` : ''}\n`);
  }
} finally {
  await browser.close();
}

summary.finishedAt = nowIso();
summary.totals = {
  states: summary.states.length,
  ok: summary.states.filter((s) => s.status === 'ok').length,
  errors: summary.states.filter((s) => s.status === 'error').length,
  violations: summary.states.reduce((n, s) => n + (s.violations ? s.violations.length : 0), 0),
};
const file = writeJson(summaryFile, summary);
process.stdout.write(`${JSON.stringify({ summary: file, ...summary.totals }, null, 2)}\n`);
process.exit(exitCode || (summary.totals.ok === 0 ? 5 : 0));
