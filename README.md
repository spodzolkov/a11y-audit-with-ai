# a11y-audit-pipeline — Пайплайн комплексної перевірки доступності

Багатоетапний пайплайн агентів з human-in-the-loop для комплексного аудиту доступності (веб + документи + markdown) на відповідність **WCAG 2.2 AA**.

Побудований за скілом `pipeline-project-architect` на базі проекту `accessibility-agents`.

## Ключова властивість: тільки перевірка (read-only)

Пайплайн **лише перевіряє та звітує**. Уся функціональність автоматичного виправлення (fixer / remediator / «fix mode») навмисно ВИЛУЧЕНА.

- Агенти не редагують код, документи чи markdown, що аудіюються.
- Запис під час аудиту дозволено ТІЛЬКИ у теки `output/` (звіти, стан, журнал) та `result_history/` (архів виконань).
- Скрипти у `tools/` програмно відхиляють запис поза `output/`, а архіватор виключає файли сесій.
- Знахідки містять рекомендації «як виправити», але виправлення виконує людина.

## Структура проекту

```
a11y-audit-pipeline/
├── .vscode/
│   ├── settings.json                  — Налаштування воркспейсу VS Code
│   ├── tasks.json                     — Задачі VS Code (тести, стан, валідація, архів)
│   ├── extensions.json                — Рекомендовані розширення VS Code
│   └── mcp.json                       — Локальний конфіг MCP-серверів (ігнорується git; шаблон у docs/mcp.example.json)
├── agents/
│   ├── pipeline-orchestrator.md       — Оркестратор (машина станів + human-in-the-loop)
│   ├── 01-discovery.md                — Етап 1: визначення scope
│   ├── 02-runtime-simulation.md       — Етап 2: симуляція користувача з обмеженими можливостями (Playwright MCP)
│   ├── 03-axe-scan.md                 — Етап 3: axe-core (CLI + ін'єкція на попапах)
│   ├── 04-lighthouse-scan.md          — Етап 4: Lighthouse accessibility
│   ├── 05-web-review.md               — Етап 5: ревʼю коду веб
│   ├── 06-documents-review.md         — Етап 6: ревʼю документів
│   ├── 07-markdown-review.md          — Етап 7: ревʼю markdown
│   ├── 08-consolidation.md            — Етап 8: консолідація + severity scoring
│   ├── 09-bug-reports.md              — Етап 9 (опційний): експорт баг-репортів у .md файл
│   ├── 10-report.md                   — Етап 10: фінальний звіт
│   └── 11-verify.md                   — Етап 11: перевірка цілісності (обовʼязковий)
├── skills/
│   ├── a11y-rules.md                  — Правила WCAG 2.2 AA, severity, формат знахідок
│   ├── runtime-scan-rules.md          — Спільні правила етапів 2–4 (межа модуля, попапи, human gate)
│   └── wcag-bug-report-generator.md   — Правила генерації та експорту баг-репортів у .md файл (етап 9)
├── docs/
│   ├── wcag-2.2-checklist.md          — Повний чек-лист WCAG 2.2 A/AA: критерії, джерела, приклади виправлень
│   └── mcp.example.json               — Шаблон MCP-конфігу для .vscode/mcp.json (@playwright/mcp, --isolated --storage-state)
├── output/
│   ├── pipeline-state.json            — Машина станів пайплайну
│   ├── pipeline-journal.md            — Наскрізний журнал
│   ├── 01-discovery.md                — Результат етапу 1
│   ├── 02-runtime-simulation.md       — Результат етапу 2
│   ├── 03-axe-scan.md                 — Результат етапу 3
│   ├── 04-lighthouse-scan.md          — Результат етапу 4
│   ├── 05-web-review.md               — Результат етапу 5
│   ├── 06-documents-review.md         — Результат етапу 6
│   ├── 07-markdown-review.md          — Результат етапу 7
│   ├── 08-consolidation.md            — Результат етапу 8
│   ├── 09-bug-reports.md              — Експортовані баг-репорти (опційний етап 9)
│   ├── 10-audit-report.md             — Фінальний звіт аудиту
│   └── 11-verification-report.md      — Результат фінальної перевірки
├── result_history/                    — Архів виконань (створюється на етапі 11)
│   └── Pipeline_<дата-час запуску>/   — Копія всіх артефактів одного запуску
│       ├── run-context.md             — Контекст запуску (параметри, статуси, підсумок)
│       ├── pipeline-state.json        — (копія)
│       ├── pipeline-journal.md        — (копія)
│       ├── 01-discovery.md ... 11-verification-report.md — (копії)
│       └── scan-*.json                — сирі результати сканерів (за наявності)
├── tools/                             — Локальні інструменти пайплайну (Node.js >= 22.19)
│   ├── package.json                   — Закріплені axe-core 4.14.0, lighthouse 13.6.0, playwright 1.62.0
│   ├── pipeline-state.mjs             — Єдиний спосіб змінювати стан і журнал; архівування
│   ├── auth-login.mjs                 — Ручна авторизація в браузері зі збереженням лише storageState
│   ├── auth-check.mjs                 — Перевірка storageState ролі (valid/missing/expired)
│   ├── popup-crawler.mjs              — Етапи 2–4: детермінований обхід попапів -> output/runtime/02/states.json
│   ├── axe-run.mjs                    — Етап 3: axe-core на base і станах -> output/runtime/03/, output/scan-axe.json
│   ├── lh-run.mjs                     — Етап 4: Lighthouse user flow -> output/runtime/04/, output/scan-lighthouse.json
│   ├── verify-run.mjs                 — Етап 11: програмна перевірка трасування, score, BUG, секретів -> output/runtime/11/verify.json
│   ├── action-policy.json             — Класифікатор дій (safe / safe-close / dangerous / dangerous-adjacent / unknown)
│   ├── lib/                           — Спільна логіка (сесія, межа модуля, політика дій)
│   └── tests/                         — node --test tools/tests/ (включно з фікстуром модуля)
├── auth/                              — Авторизація для цілей за логіном (ручний вхід у браузері -> збереження сесії)
│   ├── AUTH-SETUP.md                  — Інструкція ручної авторизації та збереження сесії
│   └── playwright/.auth/<роль>.json   — Збережені стани сесій (секрет, ігнор git)
├── AGENTS.md                          — Настанови для AI-агентів (AgentRC), політики
├── package.json                       — Скрипти запуску інструментів та тестів проєкту
├── README.md
├── SCHEMA.md
└── INSTRUCTIONS.md
```

Кожен агент має frontmatter з `metadata` (owner, domain, maturity, stage, capability-tags, dispatch-contract, read-only) та секцію `## Acceptance Criteria` для автоматизації й ревʼю. Конвенції — у `AGENTS.md`.

## Фази пайплайну

11 етапів згруповано у 4 фази. Фаза B — паралельна. Етап 9 опційний.

| Фаза | Тип | Етапи | Human-in-the-loop |
|------|-----|-------|-------------------|
| A | послідовна | 1 Discovery | підтвердження після етапу |
| B | **паралельна** | 2 Runtime Simulation + 3 Axe Scan + 4 Lighthouse Scan + 5 Web + 6 Documents + 7 Markdown | одне спільне ревʼю після всієї групи |
| C | послідовна | 8 Consolidation → 9 Bug Reports (опц.) → 10 Report | підтвердження після кожного етапу |
| D | послідовна | 11 Verify | обовʼязковий фінал |

Етапи фази B незалежні (кожен читає лише scope з етапу 1, не мають спільних вихідних файлів), тому запускаються разом. Фаза C — барʼєр синхронізації: етап 8 чекає на всі наявні виходи фази B. Етап 9 запускається після 8 і експортує структуровані баг-репорти у `output/09-bug-reports.md`, а Report (10) може враховувати згенеровані баг-репорти.

## Етапи пайплайну

| Етап | Фаза | Агент | Вхід | Інструменти | Вихід |
|------|------|-------|------|-------------|-------|
| 1 | A | A11y Discovery | каталог/URL/GitLab або GitHub-репо | list_directory, file_search, grep_search, read_file, GitLab MCP (`gitlab_read`) / GitHub MCP (читальні дії) | output/01-discovery.md |
| 2 | B | A11y Runtime Simulation | 01-discovery, runtime/02/states.json | `tools/popup-crawler.mjs`, Playwright MCP (симуляція, профілі користувача), read_file | output/02-runtime-simulation.md |
| 3 | B | A11y Axe Scan | 01-discovery, runtime/02/states.json | `tools/axe-run.mjs` (axe-core 4.14.0 на авторизованій сесії), Playwright MCP (допоміжно), read_file | output/03-axe-scan.md + output/runtime/03/ + output/scan-axe.json |
| 4 | B | A11y Lighthouse Scan | 01-discovery, runtime/02/states.json | `tools/lh-run.mjs` (Lighthouse 13.6.0 user flow на авторизованій сесії), Playwright MCP (допоміжно), read_file | output/04-lighthouse-scan.md + output/runtime/04/ + output/scan-lighthouse.json |
| 5 | B | A11y Web Review | 01-discovery | read_code, grep_search, read_file, GitLab MCP (`gitlab_read`) / GitHub MCP (читальні дії, якщо код у віддаленому репо; без клонування) — лише статичний аналіз, без браузера | output/05-web-review.md |
| 6 | B | A11y Documents Review | 01-discovery | read_file, execute_pwsh | output/06-documents-review.md |
| 7 | B | A11y Markdown Review | 01-discovery | read_file, grep_search | output/07-markdown-review.md |
| 8 | C | A11y Consolidation | 02..07 (усі виходи фази B) | read_file | output/08-consolidation.md |
| 9 | C (опц.) | A11y Bug Reports | 08, 01, 02..04, чек-лист | read_file, fs_write | output/09-bug-reports.md |
| 10 | C | A11y Report | 08 (+ 09 за наявності) | read_file | output/10-audit-report.md |
| 11 | D | A11y Verify | state, journal, 01..10, output/*.json | read_file, list_directory, execute_pwsh, fs_write | output/11-verification-report.md + `result_history/Pipeline_<дата-час>/` |

Останній етап — завжди перевірка (verify). Він не виправляє проблеми, лише фіксує та рекомендує. Наприкінці він архівує всі артефакти виконання у `result_history/Pipeline_<дата-час запуску>/` разом із файлом контексту `run-context.md`.

## Стани пайплайну

| status | Значення |
|--------|----------|
| idle | Пайплайн не запущений |
| running | Виконується |
| completed | Успішно завершений |
| stopped | Зупинений користувачем |
| failed | Помилка |

Переходи: `idle → running → completed | stopped | failed`

## Стани етапу

| status | Значення |
|--------|----------|
| pending | Ще не почато |
| in_progress | Виконується |
| awaiting_approval | Чекає ревʼю людини |
| approved | Підтверджено |
| completed | Завершено |
| changes_requested | Запит змін (назад у in_progress) |
| skipped | Пропущено |
| failed | Помилка |

Переходи: `pending → in_progress → awaiting_approval → approved → completed`; гілки: `changes_requested → in_progress`, `failed`, `skipped`.

## Діаграма переходів станів

```
[idle] --start--> [running] --фази A->B->C->D--> [completed]
                     |
                     |--user stop--> [stopped]
                     |--error------> [failed]

Фаза A -> Фаза B (паралельна, барʼєр+спільне ревʼю) -> Фаза C -> Фаза D

Етап: pending -> in_progress -> awaiting_approval -> approved -> completed
                     ^                    |
                     |                    v
                     +---- changes_requested
                     (або) -> skipped / failed
```

Детальні діаграми фаз і барʼєра — у `SCHEMA.md`.

## Як запустити

**Перед першим запуском** встанови ПЗ (Node.js >= 22.19, `npm install --prefix tools`, MCP-сервери зі стандартного реєстру npm) і пройди checklist першого запуску — розділи «Встановлення ПЗ» та «Перший запуск» у `INSTRUCTIONS.md`.

**Повний пайплайн:** активуй оркестратор через контекстний ключ `#A11y Audit Pipeline Orchestrator` і вкажи шлях/URL цілі аудиту.

**Окремий етап:** активуй потрібний агент, напр. `#A11y Web Review` (вхід беруться з відповідних `output/NN-*.md`).

Детально — див. `INSTRUCTIONS.md`.

## Принципи роботи

- **Human-in-the-loop**: пайплайн зупиняється для ревʼю після кожної фази; без підтвердження перехід далі заборонено. Для паралельної фази B — одне спільне ревʼю після всієї групи.
- **Паралельна фаза B**: етапи 2–7 виконуються разом; барʼєр перед фазою C чекає завершення всіх. Помилка одного етапу не зупиняє інші — рішення про продовження ухвалює людина.
- **Read-only щодо цілі аудиту**: жодних змін коду/документів; запис у файловій системі лише у `output/` та `result_history/`.
- **Опційний експорт баг-репортів (етап 9)**: перетворює консолідовані знахідки на готові структуровані баг-репорти та експортує їх у файл `output/09-bug-reports.md` (без записів у зовнішні системи).
- **Runtime-етапи 2–4**: симуляція, axe-core і Lighthouse відкривають усі доступні попапи лише в межах модуля (останнє слово хеш-шляху URL) і ніколи не натискають небезпечні елементи ("Підписати", "Надіслати", "Видалити", "Підтвердити" тощо) без окремого явного підтвердження людини на кожен такий елемент.
- **Архів виконань**: на етапі 11 усі артефакти копіюються у `result_history/Pipeline_<дата-час запуску, UTC>/` разом із `run-context.md` командою `node tools/pipeline-state.mjs archive` (файли сесій виключаються); оригінали в `output/` зберігаються до `init --clean` наступного запуску.
- **Стан і журнал**: змінюються лише через `node tools/pipeline-state.mjs` (валідація переходів, реальні часові мітки UTC); ручне редагування не допускається.
- **Збереження даних**: технічні деталі (шляхи, URL, селектори, WCAG SC, id знахідок) передаються без спотворень; оригінальні id зберігаються для traceability.
- **Наскрізний журнал**: усі питання, відповіді, проблеми та рішення фіксуються в `output/pipeline-journal.md` (записи фази B групуються під заголовком фази).
- **Пропуск етапів**: питання «Виконати/Пропустити» ставиться окремо по кожному етапу (крім 1 і 11); етапи без вхідного контенту пропускаються автоматично.
- **Обовʼязковий фінальний verify**: перевірка цілісності — завжди останній етап.

## Вихідні файли

| Файл | Призначення |
|------|-------------|
| output/pipeline-state.json | Машина станів |
| output/pipeline-journal.md | Наскрізний журнал |
| output/01-discovery.md | Scope та план покриття |
| output/02-runtime-simulation.md | Знахідки симуляції користувача |
| output/03-axe-scan.md | Знахідки axe-core |
| output/04-lighthouse-scan.md | Знахідки Lighthouse |
| output/05-web-review.md | Знахідки веб-ревʼю |
| output/06-documents-review.md | Знахідки документів |
| output/07-markdown-review.md | Знахідки markdown |
| output/08-consolidation.md | Консолідація + scoring |
| output/09-bug-reports.md | Експортовані баг-репорти (опційний етап 9) |
| output/10-audit-report.md | Фінальний звіт аудиту |
| output/11-verification-report.md | Результат фінальної перевірки |
| result_history/Pipeline_<дата-час>/ | Архів усіх артефактів одного запуску |
| result_history/Pipeline_<дата-час>/run-context.md | Контекст запуску (параметри, статуси, підсумок) |

## Зовнішні MCP-залежності

| MCP | Де використовується | Призначення | Джерело (npm) |
|-----|---------------------|-------------|---------------|
| Playwright MCP | Етапи 2–4 (runtime-скан, симуляція, попапи), Етап 5 (опційно) | Браузерна автоматизація на accessibility-снапшотах: навігація, знімки, перевірка клавіатури/фокусу/модалок, відкриття попапів у межах модуля | [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) |
| GitLab MCP | Етап 1 (Discovery), Етап 5 (Web Review, читання коду) | Read-only доступ до репозиторію GitLab (`gitlab_read`: projects/branches/tree/file). Клонування цільового репозиторію заборонено | [`@modelcontextprotocol/server-gitlab`](https://github.com/modelcontextprotocol/servers) |
| GitHub MCP | Етап 1 (Discovery), Етап 5 (Web Review, читання коду) | Read-only доступ до репозиторію GitHub (`get_file_contents`, `search_code`, `list_commits`, `list_branches`, `search_repositories`). Клонування цільового репозиторію заборонено | [`@modelcontextprotocol/server-github`](https://github.com/modelcontextprotocol/servers) |

Playwright MCP, GitLab MCP і GitHub MCP встановлюються зі стандартного відкритого реєстру npm (`https://registry.npmjs.org/`) і додаються у `.vscode/mcp.json` (шаблон `docs/mcp.example.json`) або глобальні налаштування MCP у VS Code. Playwright MCP (`@playwright/mcp`) запускається з `--isolated --storage-state <роль>.json --output-dir output/runtime/mcp --output-mode file`; `--save-session` заборонено. GitLab MCP та GitHub MCP використовуються лише в read-only режимі (жодних write-дій над репозиторієм); Playwright MCP не змінює контент цілі аудиту.

## Стандарт та джерела

Цільовий стандарт: **WCAG 2.2 AA**. Авторитетні джерела перелічені в skill `a11y-rules.md`.
