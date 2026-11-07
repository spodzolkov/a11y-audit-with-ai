#!/usr/bin/env node
// Єдиний інструмент зміни стану та журналу пайплайну a11y-audit-pipeline.
// Час завжди береться з системного годинника (ISO 8601, UTC). Ручне редагування
// output/pipeline-state.json та output/pipeline-journal.md не допускається.
//
// Команди:
//   init     --pipeline-id <id> --url <url> [--gitlab <project> | --github <owner/repo>] [--ref <branch>] [--commit <sha>]
//            [--role <role>] [--module <segment>] [--method code|scanners|both] [--depth <text>]
//            [--clean]              очистити output/ від попереднього (заархівованого) запуску
//   stage    <N> <start|await|approve|complete|skip|fail|changes|retry>
//            [--result "..."] [--error "..."] [--comment "..."]
//   phase    <A|B|C|D>
//   journal  <QUESTION|ANSWER|PROBLEM|DECISION> --stage <N> --text "..."
//            [--severity low|medium|high] [--resolution "..."]   (для PROBLEM)
//   finish   <completed|stopped|failed>
//   archive  [--dry-run]            копіювати output/ у result_history/Pipeline_<startedAt>/ без секретів
//   validate                        перевірити схему й узгодженість (exit 1 при помилках)
//   show                            коротке зведення стану
//
// Коди виходу: 0 - успіх; 1 - помилка валідації/переходу; 2 - некоректні аргументи.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, copyFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 2;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'output');
const HISTORY = path.join(ROOT, 'result_history');
const STATE_FILE = path.join(OUTPUT, 'pipeline-state.json');
const JOURNAL_FILE = path.join(OUTPUT, 'pipeline-journal.md');

export const STAGES = [
  { stage: 1, phase: 'A', name: 'discovery', title: 'Discovery', output: 'output/01-discovery.md' },
  { stage: 2, phase: 'B', name: 'runtime-simulation', title: 'Runtime Simulation', output: 'output/02-runtime-simulation.md' },
  { stage: 3, phase: 'B', name: 'axe-scan', title: 'Axe Scan', output: 'output/03-axe-scan.md' },
  { stage: 4, phase: 'B', name: 'lighthouse-scan', title: 'Lighthouse Scan', output: 'output/04-lighthouse-scan.md' },
  { stage: 5, phase: 'B', name: 'web-review', title: 'Web Review', output: 'output/05-web-review.md' },
  { stage: 6, phase: 'B', name: 'documents-review', title: 'Documents Review', output: 'output/06-documents-review.md' },
  { stage: 7, phase: 'B', name: 'markdown-review', title: 'Markdown Review', output: 'output/07-markdown-review.md' },
  { stage: 8, phase: 'C', name: 'consolidation', title: 'Consolidation', output: 'output/08-consolidation.md' },
  { stage: 9, phase: 'C', name: 'bug-reports', title: 'Bug Reports', output: 'output/09-bug-reports.md', optional: true },
  { stage: 10, phase: 'C', name: 'report', title: 'Report', output: 'output/10-audit-report.md' },
  { stage: 11, phase: 'D', name: 'verify', title: 'Verify', output: 'output/11-verification-report.md' },
];

const PHASE_TITLES = {
  A: 'Discovery',
  B: 'Паралельні етапи 2–7',
  C: 'Консолідація та звітність',
  D: 'Verify',
};

// Дозволені переходи стану етапу: дія -> { from: [...], to }.
const ACTIONS = {
  start: { from: ['pending'], to: 'in_progress' },
  await: { from: ['in_progress'], to: 'awaiting_approval' },
  approve: { from: ['awaiting_approval'], to: 'approved' },
  complete: { from: ['approved', 'in_progress'], to: 'completed' },
  skip: { from: ['pending', 'in_progress'], to: 'skipped' },
  fail: { from: ['in_progress', 'awaiting_approval'], to: 'failed' },
  changes: { from: ['awaiting_approval', 'completed'], to: 'changes_requested' },
  retry: { from: ['changes_requested', 'failed'], to: 'in_progress' },
};

const JOURNAL_TYPES = { QUESTION: 'ПИТАННЯ', ANSWER: 'ВІДПОВІДЬ', PROBLEM: 'ПРОБЛЕМА', DECISION: 'РІШЕННЯ' };
const TERMINAL_STAGE = ['completed', 'skipped', 'failed'];
const PIPELINE_STATUSES = ['idle', 'running', 'completed', 'stopped', 'failed'];

// Файли, що НІКОЛИ не архівуються (секрети сесій і службові заглушки).
const ARCHIVE_EXCLUDE = [
  /storage[-_]?state.*\.json$/i,
  /session[-_]?state.*\.json$/i,
  /\.session\.json$/i,
  /^\.gitkeep$/,
];

const now = () => new Date().toISOString();

function fail(message, code = 1) {
  process.stderr.write(`[pipeline-state] ${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        options[key] = true;
      } else {
        options[key] = next;
        i += 1;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}

function readState() {
  if (!existsSync(STATE_FILE)) fail('output/pipeline-state.json не існує; спершу виконай init.');
  return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
}

function writeState(state) {
  state.updatedAt = now();
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function stageDef(n) {
  const def = STAGES.find((s) => s.stage === n);
  if (!def) fail(`невідомий етап: ${n}`, 2);
  return def;
}

function archiveLabel(startedAt) {
  const d = new Date(startedAt);
  if (Number.isNaN(d.getTime())) fail(`некоректний startedAt: ${startedAt}`);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}_${p(d.getUTCHours())}-${p(d.getUTCMinutes())}-${p(d.getUTCSeconds())}`;
}

function listFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

function isExcluded(rel) {
  const name = path.posix.basename(rel);
  return ARCHIVE_EXCLUDE.some((re) => re.test(name));
}

// ---------- journal ----------

function journalHeaderIfNeeded(state, stageNo) {
  const def = stageDef(stageNo);
  const marks = state.journalMarks || { phase: null, stage: null };
  let text = '';
  if (marks.phase !== def.phase) {
    text += `\n---\n\n## Фаза ${def.phase} — ${PHASE_TITLES[def.phase]}\n`;
    marks.phase = def.phase;
  }
  if (marks.stage !== stageNo) {
    text += `\n## Етап ${stageNo} — ${def.title}\n`;
    marks.stage = stageNo;
  }
  state.journalMarks = marks;
  return text;
}

function appendJournal(state, type, stageNo, body) {
  const label = JOURNAL_TYPES[type];
  if (!label) fail(`невідомий тип запису журналу: ${type} (QUESTION|ANSWER|PROBLEM|DECISION)`, 2);
  const header = journalHeaderIfNeeded(state, stageNo);
  appendFileSync(JOURNAL_FILE, `${header}\n### ${now()} — ${label}\n${body.trim()}\n`, 'utf8');
}

// ---------- commands ----------

function cmdInit(options) {
  if (!options['pipeline-id'] || !options.url) fail('init вимагає --pipeline-id і --url', 2);
  mkdirSync(OUTPUT, { recursive: true });

  const existing = listFiles(OUTPUT);
  if (existing.length > 0) {
    if (!existsSync(STATE_FILE)) {
      if (!options.clean || !options.force) {
        fail(`output/ містить файли без pipeline-state.json (${existing.length} шт.). Перевір вручну; для очищення: init ... --clean --force`);
      }
    } else {
      const old = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
      if (['running', 'stopped', 'idle'].includes(old.status)) {
        fail(`попередній запуск ${old.pipelineId} має статус ${old.status}: відновлення або явне рішення людини (finish stopped/failed і archive).`);
      }
      const label = old.startedAt ? archiveLabel(old.startedAt) : null;
      const archiveDir = label ? path.join(HISTORY, `Pipeline_${label}`) : null;
      const archived = archiveDir && existsSync(path.join(archiveDir, 'pipeline-state.json'));
      if (!archived) {
        fail(`попередній запуск ${old.pipelineId} не заархівовано (${archiveDir || 'немає startedAt'}). Спершу: archive.`);
      }
      if (!options.clean) {
        fail(`output/ містить завершений і заархівований запуск ${old.pipelineId} (${archiveDir}). Після підтвердження людини: init ... --clean`);
      }
    }
    for (const entry of readdirSync(OUTPUT)) rmSync(path.join(OUTPUT, entry), { recursive: true, force: true });
  }

  const ts = now();
  const state = {
    schemaVersion: SCHEMA_VERSION,
    pipelineId: options['pipeline-id'],
    startedAt: ts,
    updatedAt: ts,
    parameters: {
      target: {
        url: options.url,
        gitlab: options.gitlab ? { project: options.gitlab, ref: options.ref || null, commit: options.commit || null } : null,
        github: options.github ? { repo: options.github, ref: options.ref || null, commit: options.commit || null } : null,
        moduleSegment: options.module || null,
        authRole: options.role || null,
      },
      standard: 'WCAG 2.2 AA',
      method: options.method || 'both',
      depth: options.depth || null,
    },
    currentStage: 1,
    currentPhase: 'A',
    status: 'running',
    stages: STAGES.map((s) => ({
      stage: s.stage,
      phase: s.phase,
      name: s.name,
      optional: Boolean(s.optional),
      status: 'pending',
      startedAt: null,
      completedAt: null,
      output: s.output,
      result: null,
      error: null,
      humanApproval: null,
      humanComment: null,
    })),
    history: [{ timestamp: ts, phase: 'A', stage: 1, action: 'started', comment: `Пайплайн запущено. Ціль: ${options.url}` }],
    journalMarks: { phase: null, stage: null },
  };
  writeFileSync(
    JOURNAL_FILE,
    `# Журнал виконання пайплайну аудиту доступності\n\nPipeline ID: ${state.pipelineId}\nЗапущено: ${ts}\nСтандарт: WCAG 2.2 AA\n`,
    'utf8',
  );
  writeState(state);
  process.stdout.write(`init: ${state.pipelineId} startedAt=${ts}\n`);
}

function cmdStage(positional, options) {
  const n = Number(positional[0]);
  const action = positional[1];
  if (!Number.isInteger(n) || !ACTIONS[action]) fail('stage <N> <start|await|approve|complete|skip|fail|changes|retry>', 2);
  const state = readState();
  const st = state.stages.find((s) => s.stage === n);
  if (!st) fail(`етап ${n} відсутній у стані`);
  const rule = ACTIONS[action];
  if (!rule.from.includes(st.status)) {
    fail(`недозволений перехід етапу ${n}: ${st.status} -> ${rule.to} (дія ${action}; дозволено з: ${rule.from.join(', ')})`);
  }
  const ts = now();
  st.status = rule.to;
  if (action === 'start' || action === 'retry') st.startedAt = st.startedAt || ts;
  if (['complete', 'skip', 'fail'].includes(action)) st.completedAt = ts;
  if (options.result) st.result = String(options.result);
  if (action === 'fail') st.error = String(options.error || 'не вказано');
  if (action === 'approve') {
    st.humanApproval = 'approved';
    st.humanComment = options.comment ? String(options.comment) : st.humanComment;
  }
  if (action === 'changes') st.humanApproval = 'changes_requested';
  if (action === 'start') {
    state.currentStage = n;
    state.currentPhase = st.phase;
  }
  if (['complete', 'skip', 'fail', 'changes'].includes(action)) {
    state.history.push({
      timestamp: ts,
      phase: st.phase,
      stage: n,
      action: rule.to,
      comment: String(options.comment || options.result || options.error || ''),
    });
  }
  writeState(state);
  process.stdout.write(`stage ${n}: ${rule.to}\n`);
}

function cmdPhase(positional) {
  const phase = positional[0];
  if (!PHASE_TITLES[phase]) fail('phase <A|B|C|D>', 2);
  const state = readState();
  state.currentPhase = phase;
  writeState(state);
  process.stdout.write(`phase: ${phase}\n`);
}

function cmdJournal(positional, options) {
  const type = String(positional[0] || '').toUpperCase();
  const n = Number(options.stage);
  if (!Number.isInteger(n) || !options.text) fail('journal <TYPE> --stage <N> --text "..."', 2);
  const state = readState();
  let body = String(options.text);
  if (type === 'PROBLEM') {
    body = `- Опис: ${body}\n- Критичність: ${options.severity || 'не вказано'}\n- Вирішення: ${options.resolution || 'відкрито'}`;
  }
  appendJournal(state, type, n, body);
  writeState(state);
  process.stdout.write(`journal: ${type} (етап ${n})\n`);
}

function cmdFinish(positional) {
  const status = positional[0];
  if (!['completed', 'stopped', 'failed'].includes(status)) fail('finish <completed|stopped|failed>', 2);
  const state = readState();
  if (status === 'completed') {
    const open = state.stages.filter((s) => !TERMINAL_STAGE.includes(s.status));
    if (open.length) fail(`не можна завершити: етапи без фінального статусу: ${open.map((s) => `${s.stage}=${s.status}`).join(', ')}`);
  }
  const ts = now();
  state.status = status;
  state.finishedAt = ts;
  state.history.push({ timestamp: ts, phase: state.currentPhase, stage: state.currentStage, action: status, comment: `Пайплайн: ${status}` });
  writeState(state);
  process.stdout.write(`finish: ${status}\n`);
}

function cmdArchive(options) {
  const state = readState();
  const label = archiveLabel(state.startedAt);
  const dest = path.join(HISTORY, `Pipeline_${label}`);
  const files = listFiles(OUTPUT);
  const copied = [];
  const skipped = [];
  for (const rel of files) {
    if (isExcluded(rel)) {
      skipped.push(rel);
      continue;
    }
    copied.push(rel);
    if (!options['dry-run']) {
      const target = path.join(dest, rel);
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(path.join(OUTPUT, rel), target);
    }
  }
  process.stdout.write(
    `${JSON.stringify({ dest: path.relative(ROOT, dest).split(path.sep).join('/'), dryRun: Boolean(options['dry-run']), copied, excluded: skipped }, null, 2)}\n`,
  );
}

export function validateState(state) {
  const errors = [];
  if (state.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion=${state.schemaVersion}, очікується ${SCHEMA_VERSION}`);
  for (const key of ['pipelineId', 'startedAt', 'updatedAt', 'status', 'stages', 'history']) {
    if (state[key] === undefined || state[key] === null) errors.push(`відсутнє поле ${key}`);
  }
  if (!PIPELINE_STATUSES.includes(state.status)) errors.push(`некоректний status: ${state.status}`);
  if (Array.isArray(state.stages)) {
    if (state.stages.length !== STAGES.length) errors.push(`кількість етапів ${state.stages.length}, очікується ${STAGES.length}`);
    const statuses = new Set(['pending', 'in_progress', 'awaiting_approval', 'approved', 'completed', 'changes_requested', 'skipped', 'failed']);
    for (const s of state.stages) {
      const def = STAGES.find((d) => d.stage === s.stage);
      if (!def) errors.push(`зайвий етап ${s.stage}`);
      else if (def.phase !== s.phase || def.name !== s.name) errors.push(`етап ${s.stage}: phase/name не відповідають визначенню`);
      if (!statuses.has(s.status)) errors.push(`етап ${s.stage}: некоректний статус ${s.status}`);
      if (s.status === 'completed' && !s.completedAt) errors.push(`етап ${s.stage}: completed без completedAt`);
      if (s.status === 'failed' && !s.error) errors.push(`етап ${s.stage}: failed без error`);
    }
    if (state.status === 'completed') {
      const open = state.stages.filter((s) => !TERMINAL_STAGE.includes(s.status));
      if (open.length) errors.push(`status=completed, але етапи без фінального статусу: ${open.map((s) => s.stage).join(', ')}`);
    }
  }
  for (const key of ['startedAt', 'updatedAt']) {
    if (state[key] && Number.isNaN(new Date(state[key]).getTime())) errors.push(`некоректна дата ${key}`);
  }
  if (Array.isArray(state.history)) {
    let prev = 0;
    for (const h of state.history) {
      const t = new Date(h.timestamp).getTime();
      if (Number.isNaN(t)) errors.push(`history: некоректний timestamp ${h.timestamp}`);
      else if (t < prev) errors.push(`history: порушено хронологію (${h.timestamp})`);
      else prev = t;
    }
  }
  return errors;
}

function cmdValidate() {
  const errors = validateState(readState());
  if (errors.length) {
    process.stdout.write(`INVALID\n- ${errors.join('\n- ')}\n`);
    process.exit(1);
  }
  process.stdout.write('VALID\n');
}

function cmdShow() {
  const s = readState();
  const lines = [`${s.pipelineId} status=${s.status} phase=${s.currentPhase} stage=${s.currentStage} startedAt=${s.startedAt}`];
  for (const st of s.stages) lines.push(`  ${String(st.stage).padStart(2)} ${st.phase} ${st.name.padEnd(20)} ${st.status}`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

// ---------- main ----------

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, options } = parseArgs(rest);
  switch (command) {
    case 'init': cmdInit(options); break;
    case 'stage': cmdStage(positional, options); break;
    case 'phase': cmdPhase(positional); break;
    case 'journal': cmdJournal(positional, options); break;
    case 'finish': cmdFinish(positional); break;
    case 'archive': cmdArchive(options); break;
    case 'validate': cmdValidate(); break;
    case 'show': cmdShow(); break;
    default:
      fail('команда: init | stage | phase | journal | finish | archive | validate | show', 2);
  }
}
