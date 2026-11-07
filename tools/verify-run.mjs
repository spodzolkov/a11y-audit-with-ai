#!/usr/bin/env node
// Етап 11: програмна перевірка цілісності запуску (WP13). Лише читання артефактів.
// Перевіряє: схему стану, вихідні файли етапів, трасування 02..07 -> 08 -> 10,
// weighted score, BUG -> FINDING, відсутність секретів, артефакти поза output/.
//
// Використання:
//   node tools/verify-run.mjs [--dir output | --dir result_history/Pipeline_<мітка>]
//        [--out output/runtime/11/verify.json]
// Коди: 0 PASSED / PASSED WITH WARNINGS; 1 FAILED; 2 аргументи.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs, fail, writeJson, ROOT, nowIso } from './lib/session.mjs';
import { validateState } from './pipeline-state.mjs';

const TOOL = 'verify-run';
const o = parseArgs(process.argv.slice(2));
const dirRel = typeof o.dir === 'string' ? o.dir : 'output';
const dir = path.resolve(ROOT, dirRel);
if (!existsSync(dir)) fail(TOOL, `тека не існує: ${dirRel}`);
const outFile = typeof o.out === 'string' ? o.out : 'output/runtime/11/verify.json';

const WEIGHTS = { critical: 10, serious: 6, moderate: 3, minor: 1 };
const SECRET = [/storage[-_]?state.*\.json$/i, /session[-_]?state.*\.json$/i, /\.session\.json$/i];
const checks = [];
const add = (id, status, details) => checks.push({ id, status, details });

const read = (name) => {
  const p = path.join(dir, name);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
};
function listFiles(d, base = d) {
  const out = [];
  for (const e of readdirSync(d)) {
    const f = path.join(d, e);
    if (statSync(f).isDirectory()) out.push(...listFiles(f, base));
    else out.push(path.relative(base, f).split(path.sep).join('/'));
  }
  return out;
}
const uniq = (a) => [...new Set(a)];
const ids = (text, re) => uniq([...(text || '').matchAll(re)].map((m) => m[0]));

// Розбити консолідацію на знахідки в межах стандарту і поза ним (WP14: "## Поза цільовим стандартом").
function parseConsolidation(text) {
  const findings = [];
  const out = [];
  let section = '';
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = /^##\s+(.*)/.exec(line);
    if (h) section = h[1].trim();
    const m = /^- id: (FINDING-\d+)(.*)$/.exec(line);
    if (m) {
      cur = { id: m[1], originals: ids(m[2], /\b(RUN|AXE|LH|WEB|DOC|MD)-\d+\b/g), severity: null, wcag: '', outOfScope: /Поза цільовим стандартом/i.test(section) };
      (cur.outOfScope ? out : findings).push(cur);
      continue;
    }
    if (cur) {
      const s = /^\s+severity:\s*(\w+)/.exec(line);
      if (s) cur.severity = s[1].toLowerCase();
      const w = /^\s+wcag:\s*(.*)$/.exec(line);
      if (w) cur.wcag = w[1];
    }
    if (/^##\s+Дедуплікація/.test(line)) cur = null;
  }
  return { findings, outOfScope: out };
}

// ---------- 1. Стан ----------
const stateText = read('pipeline-state.json');
let state = null;
if (!stateText) add('state.schema', 'fail', 'pipeline-state.json відсутній');
else {
  state = JSON.parse(stateText);
  const errors = validateState(state);
  if (!errors.length) add('state.schema', 'pass', 'VALID (schemaVersion 2)');
  else if (state.schemaVersion === undefined) add('state.schema', 'warn', `стан старої схеми (без schemaVersion), створений до tools/pipeline-state.mjs: ${errors.length} розбіжностей`);
  else add('state.schema', 'fail', errors);
}

// ---------- 2. Вихідні файли етапів ----------
if (state && Array.isArray(state.stages)) {
  const missing = [];
  const open = [];
  for (const st of state.stages) {
    if (st.status === 'completed' && st.output && st.stage !== 11) {
      if (!existsSync(path.join(dir, path.basename(st.output)))) missing.push(`${st.stage}: ${path.basename(st.output)}`);
    }
    if (!['completed', 'skipped', 'failed'].includes(st.status) && st.stage !== 11) open.push(`${st.stage}=${st.status}`);
  }
  add('stages.outputs', missing.length ? 'fail' : 'pass', missing.length ? { missing } : 'усі completed етапи мають файл');
  add('stages.final-status', open.length ? 'fail' : 'pass', open.length ? { open } : 'етапи 1-10 мають фінальний статус');
}

// ---------- 3. Трасування 02..07 -> 08 ----------
const stageFiles = readdirSync(dir).filter((f) => /^0[2-7]-.*\.md$/.test(f));
const originalIds = new Set(stageFiles.flatMap((f) => ids(read(f), /(?<=- id: )(RUN|AXE|LH|WEB|DOC|MD)-\d+/g)));
const cons = read('08-consolidation.md');
let consolidation = { findings: [], outOfScope: [] };
if (!cons) add('trace.08', 'warn', '08-consolidation.md відсутній');
else {
  consolidation = parseConsolidation(cons);
  const all = [...consolidation.findings, ...consolidation.outOfScope];
  const lost = all.flatMap((f) => f.originals.filter((x) => !originalIds.has(x)).map((x) => `${f.id}<-${x}`));
  const noOrig = all.filter((f) => !f.originals.length).map((f) => f.id);
  const usedOriginals = new Set(all.flatMap((f) => f.originals));
  const unused = [...originalIds].filter((x) => !usedOriginals.has(x));
  add('trace.02-07->08', lost.length ? 'fail' : noOrig.length ? 'warn' : 'pass', {
    findings: all.length,
    originalsInStages: originalIds.size,
    invented: lost,
    findingsWithoutOriginals: noOrig,
    originalsNotConsolidated: unused,
  });
  const noSev = all.filter((f) => !WEIGHTS[f.severity]).map((f) => f.id);
  if (noSev.length) add('consolidation.severity', 'fail', { invalidSeverity: noSev });
  const aaaInScope = consolidation.findings.filter((f) => /\bAAA\b/.test(f.wcag)).map((f) => f.id);
  add('consolidation.aaa-out-of-score', aaaInScope.length ? 'warn' : 'pass', aaaInScope.length ? { aaaCountedInScore: aaaInScope, hint: 'винести в "## Поза цільовим стандартом" (WP14)' } : 'AAA-знахідки поза score');
}

// ---------- 4. Weighted score ----------
const rep = read('10-audit-report.md');
if (cons) {
  const computed = consolidation.findings.reduce((n, f) => n + (WEIGHTS[f.severity] || 0), 0);
  const declared08 = Number((/Weighted score:\s*(\d+)/i.exec(cons) || [])[1]);
  const declared10 = rep ? Number((/Weighted score:\s*(\d+)/i.exec(rep) || [])[1]) : null;
  const ok = declared08 === computed && (declared10 === null || declared10 === computed);
  add('score.weighted', ok ? 'pass' : 'fail', { computed, declared08, declared10 });
}

// ---------- 5. Трасування 08 -> 10 ----------
if (rep && cons) {
  const inReport = new Set(ids(rep, /FINDING-\d+/g));
  const known = new Set([...consolidation.findings, ...consolidation.outOfScope].map((f) => f.id));
  const invented = [...inReport].filter((x) => !known.has(x));
  const missing = consolidation.findings.map((f) => f.id).filter((x) => !inReport.has(x));
  add('trace.08->10', invented.length || missing.length ? 'fail' : 'pass', { invented, missingInReport: missing });
}

// ---------- 6. BUG -> FINDING ----------
const bugsText = read('09-bug-reports.md');
const bugFindings = new Map();
if (bugsText) {
  for (const line of bugsText.split(/\r?\n/)) {
    const m = /^\|\s*(BUG-\d+)\s*\|(.*)$/.exec(line);
    if (m && !bugFindings.has(m[1])) bugFindings.set(m[1], ids(m[2], /FINDING-\d+/g));
  }
  const known = new Set([...consolidation.findings, ...consolidation.outOfScope].map((f) => f.id));
  const bad = [...bugFindings].flatMap(([b, fs]) => (fs.length ? fs.filter((x) => !known.has(x)).map((x) => `${b}->${x}`) : [`${b}->(немає FINDING)`]));
  add('trace.BUG->FINDING', bad.length ? 'fail' : 'pass', { bugs: bugFindings.size, invalid: bad });
}

// ---------- 7. Секрети ----------
const secrets = listFiles(dir).filter((f) => SECRET.some((re) => re.test(path.posix.basename(f))) && path.posix.basename(f) !== 'pipeline-state.json');
add('secrets', secrets.length ? 'fail' : 'pass', secrets.length ? { sessionFiles: secrets } : 'файлів сесій немає');

// ---------- 8. Артефакти поза output/ (лише для поточного запуску) ----------
if (dirRel === 'output') {
  const baselineFile = path.join(dir, 'runtime', '01', 'git-status-baseline.txt');
  try {
    const now = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
    if (!existsSync(baselineFile)) add('workspace.untouched', 'warn', 'немає базової лінії output/runtime/01/git-status-baseline.txt');
    else {
      const base = new Set(readFileSync(baselineFile, 'utf8').split(/\r?\n/).filter(Boolean));
      const extra = now.filter((l) => !base.has(l));
      add('workspace.untouched', extra.length ? 'fail' : 'pass', extra.length ? { newOrChanged: extra } : 'змін поза output/ немає');
    }
  } catch (e) {
    add('workspace.untouched', 'warn', `git status недоступний: ${String(e.message).split('\n')[0]}`);
  }
}

const verdict = checks.some((c) => c.status === 'fail') ? 'FAILED' : checks.some((c) => c.status === 'warn') ? 'PASSED WITH WARNINGS' : 'PASSED';
const result = { tool: TOOL, checkedAt: nowIso(), dir: dirRel, verdict, checks };
const file = writeJson(outFile, result);
process.stdout.write(`${JSON.stringify({ out: file, verdict, summary: checks.map((c) => `${c.status.toUpperCase()} ${c.id}`) }, null, 2)}\n`);
process.exit(verdict === 'FAILED' ? 1 : 0);
