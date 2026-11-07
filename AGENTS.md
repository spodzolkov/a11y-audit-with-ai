# AGENTS.md

> Настанови для AI-агентів у цьому репозиторії. Сумісність з AgentRC.

Цей репозиторій містить пайплайн комплексної перевірки доступності (WCAG 2.2 AA), побудований як послідовність AI-агентів з human-in-the-loop для роботи у стандартному VS Code проєкті. Файл дає високорівневі настанови для AI-асистентів, що працюють у цьому проекті.

## Політика: без emoji

Жорстке правило репозиторію: не додавати emoji у згенерований, відредагований чи переглянутий контент (документи, агенти, скіли, звіти, журнали, PR/issue-текст). Замінюй emoji текстовими мітками.

## Політика: read-only (без автовиправлення)

Це аудит-пайплайн. Автоматичне виправлення повністю вилучено.

- Агенти НЕ редагують код, документи чи markdown, що аудіюються.
- Запис на диск під час аудиту дозволено ТІЛЬКИ у теки `output/` та `result_history/` (архів виконань на етапі 11).
- `output/pipeline-state.json` і `output/pipeline-journal.md` змінюються ЛИШЕ через `node tools/pipeline-state.mjs`; часові мітки ставить інструмент (UTC), вигадані мітки неприпустимі.
- Файли станів сесій (storageState, ручний логін) живуть лише в `auth/playwright/.auth/` і ніколи не потрапляють в `output/` чи `result_history/`.
- Код цільового віддаленого репозиторію читається лише через GitLab MCP (`gitlab_read`) або GitHub MCP (читальні дії); клонування заборонене.
- Запис у зовнішні системи повністю відсутній: опційний етап 9 (Bug Reports) лише експортує структуровані баг-репорти у локальний файл `output/09-bug-reports.md`.
- Сканери/лінтери запускаються без прапорців автовиправлення (`--fix`, `--write`); Playwright MCP без `--save-session`.
- Runtime-етапи 2–4 лише відкривають і закривають UI (попапи, меню, діалоги) у межах модуля (останнє слово хеш-шляху URL). Елементи на кшталт "Підписати", "Надіслати", "Видалити", "Підтвердити" НЕ натискаються без окремого явного підтвердження людини на кожен елемент (див. `skills/runtime-scan-rules.md`).
- Знахідки містять рекомендації, але виправлення виконує людина.

## Призначення

Комплексний аудит доступності веб-контенту, документів (Word/Excel/PowerPoint/PDF/ePub) і markdown на відповідність WCAG 2.2 AA. Результат — структуровані знахідки, консолідований звіт і перевірка цілісності. Без внесення змін у цільовий проект.

## Ключові каталоги

| Шлях | Призначення |
|------|-------------|
| `agents/` | Оркестратор + 11 агентів-етапів |
| `skills/` | Правила предметної області (WCAG 2.2 AA, severity, формат знахідок) |
| `.vscode/` | Налаштування VS Code: `settings.json`, `tasks.json`, `extensions.json` та локальний `mcp.json` |
| `output/` | Стан пайплайну, журнал, вихідні файли поточного запуску |
| `result_history/` | Архів завершених запусків: `Pipeline_<дата-час>/` з копією артефактів і `run-context.md` |
| `tools/` | Локальні інструменти (Node.js >= 22.19): `pipeline-state.mjs` (стан, журнал, архів), `auth-login.mjs` (ручний логін у браузері зі збереженням сесії), `auth-check.mjs` (перевірка storageState), `popup-crawler.mjs` / `axe-run.mjs` / `lh-run.mjs` (runtime-етапи 2–4), `action-policy.json` (класифікатор дій), закріплені axe-core 4.14.0 / lighthouse 13.6.0 / playwright 1.62.0, тести `tools/tests/` |
| `docs/mcp.example.json` | Шаблон MCP-конфігу для `.vscode/mcp.json`: `@playwright/mcp` з `--isolated --storage-state --output-dir --output-mode file`, `@modelcontextprotocol/server-gitlab` та `@modelcontextprotocol/server-github` |
| `auth/` | Документація авторизації (`AUTH-SETUP.md`, у git) + `playwright/.auth/<роль>.json` (збережені стани сесій, ігноруються git) |

## Агенти

11 етапів згруповано у 4 фази (A → B → C → D). Фаза B — паралельна: етапи 2–7 запускаються разом, барʼєр перед фазою C, одне спільне ревʼю. Етап 9 опційний.

| Агент | Етап | Фаза | Роль |
|-------|------|------|------|
| A11y Audit Pipeline Orchestrator | 0 | — | Оркестрація фаз, машина станів, журнал, human-in-the-loop |
| A11y Discovery | 1 | A | Визначення scope |
| A11y Runtime Simulation | 2 | B | Симуляція користувача з обмеженими можливостями (Playwright MCP), відкриття всіх попапів у межах модуля |
| A11y Axe Scan | 3 | B | axe-core: CLI на базовому стані + ін'єкція на попапах |
| A11y Lighthouse Scan | 4 | B | Lighthouse accessibility: базовий стан + доступні попапи |
| A11y Web Review | 5 | B | Ревʼю коду веб |
| A11y Documents Review | 6 | B | Ревʼю документів |
| A11y Markdown Review | 7 | B | Ревʼю markdown |
| A11y Consolidation | 8 | C | Барʼєр фази B; дедуплікація + severity scoring |
| A11y Bug Reports | 9 | C (опц.) | Експорт структурованих баг-репортів по знахідках у `.md` файл (`output/09-bug-reports.md`) |
| A11y Report | 10 | C | Фінальний звіт |
| A11y Verify | 11 | D | Перевірка цілісності + архівування виконання у result_history (обовʼязковий останній) |

## Скіли

| Скіл | Призначення |
|------|-------------|
| Accessibility Audit Rules (`a11y-rules.md`) | WCAG 2.2 AA критерії, рівні серйозності, формат знахідок, severity scoring v2 |
| Runtime Scan Rules (`runtime-scan-rules.md`) | Спільні правила етапів 2–4: межа модуля, відкриття попапів, human gate для небезпечних дій, профілі користувачів, авторизація |
| WCAG Bug Report Generator (`wcag-bug-report-generator.md`) | Етап 9: формат структурованих баг-репортів, гранулярність, мапінг severity, структура експорту в `output/09-bug-reports.md` |

## Чек-лист WCAG 2.2

`docs/wcag-2.2-checklist.md` — повний перелік критеріїв успіху WCAG 2.2 рівнів A/AA (55 SC): формулювання, посилання на специфікацію й Understanding, приклади виправлень, позначка `static`/`runtime`/`both` і відповідний етап пайплайну. Усі агенти-етапи (02–07) посилаються на конкретний пункт цього файлу через поле `checklistRef` у знахідці замість переказу критерію своїми словами. Етап 5 (Web Review) — ЛИШЕ статичний аналіз коду; усі runtime/поведінкові перевірки (клавіатура, фокус, модалки, live-regions, реальний контраст, reflow, попапи) виконують етапи 2–4.

## Конвенції

### Формат агента

```yaml
---
name: "Human Readable Name"
description: "Етап N: короткий опис"
inclusion: manual
metadata:
  owner: accessibility-team
  domain: web|document|markdown
  maturity: stable|beta|experimental
  stage: N
  capability-tags: ["wcag-2.2-aa", "..."]
  dispatch-contract: required|optional
  read-only: true
---
```

### Формат скіла

```yaml
---
name: "Skill Name"
description: "Що надає скіл"
inclusion: manual
metadata:
  spec-version: "2026-05"
  compliance-profiles: ["wcag-2.2-aa", "en-301-549"]
  scoring-model: "v2"
  model-compatibility: ["vscode", "copilot", "claude", "gemini"]
  read-only: true
---
```

### Розмітка інструкцій

- Один H1 на файл.
- Кожен агент-етап має секцію `## Acceptance Criteria` (чеклист) для автоматизації/ревʼю.
- Кожен агент-етап завершується запитом підтвердження людини (Так/Ні/Зупинити).
- Приклади вихідних файлів — у fenced code-блоках.
- `inclusion: manual` — агенти й скіли активуються через посилання на файл або контекстний ключ `#Name`.

## Зовнішні MCP-залежності

| MCP | Агент/етап | Режим | Джерело (npm) |
|-----|-----------|-------|---------------|
| Playwright MCP | A11y Runtime Simulation (2), A11y Axe Scan (3), A11y Lighthouse Scan (4), A11y Web Review (5, опційно) | навігація, снапшоти, відкриття/закриття UI-елементів; небезпечні дії тільки за окремим явним підтвердженням людини | [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) |
| GitLab MCP | A11y Discovery (1), A11y Web Review (5) | ТІЛЬКИ `gitlab_read` (без write, без клонування) | [`@modelcontextprotocol/server-gitlab`](https://github.com/modelcontextprotocol/servers) |
| GitHub MCP | A11y Discovery (1), A11y Web Review (5) | ТІЛЬКИ читальні дії (`get_file_contents`, `search_code`, `list_commits`, `list_branches`, `search_repositories`; без write, без клонування) | [`@modelcontextprotocol/server-github`](https://github.com/modelcontextprotocol/servers) |

Усі MCP-сервери встановлюються зі стандартного відкритого реєстру npm (`https://registry.npmjs.org/`) і додаються у workspace `.vscode/mcp.json` (шаблон — `docs/mcp.example.json`) або глобальні налаштування MCP у VS Code. GitLab MCP та GitHub MCP у цьому проекті використовуються виключно для читання репозиторію (інвентаризація файлів на етапі Discovery та статичний аналіз коду на етапі Web Review) — write-дії суперечать read-only політиці пайплайну.

**Playwright MCP.** Стандартний відкритий пакет: `@playwright/mcp`. Шаблон конфігу — `docs/mcp.example.json`.

**Авторизовані сторінки.** Для цілей за автентифікацією (включно з Basic Auth та формою входу) агент самостійно відкриває окремий браузер за допомогою **Playwright MCP** (`browser_navigate` на `<URL>`), користувач проходить авторизацію вручну у відкритому вікні браузера Playwright MCP, після чого агент через `browser_run_code` зберігає лише отриманий стан сесії (`storageState`) у `auth/playwright/.auth/<роль>.json` (як резервний CLI-інструмент використовується `node tools/auth-login.mjs --role <роль> --url <URL> --wait-for-enter`). Перед етапом 1 і кожним runtime-етапом стан перевіряється `node tools/auth-check.mjs --role <роль> --url <URL>`. Повний порядок — у файлі **`auth/AUTH-SETUP.md`**. Збережені стани (`auth/**/*.json`) — секрет, ігноруються git і ніколи не потрапляють в `output/` чи `result_history/`.

## Самоперевірка та обмеження

- Навіть при змінах самого пайплайну файли станів `auth/**/*.json` не редагуються агентом.
- Самоперевірка інструментів: `npm test` (або `node --test tools/tests/`).

## Узгодженість (перевіряти перед комітом)

Назви агентів (`name`), номери етапів (`stage`), імена вихідних файлів (`output/NN-*.md`) та кількість етапів мають збігатися у ВСІХ документах: агенти, `STAGES` у `tools/pipeline-state.mjs`, README.md, SCHEMA.md, INSTRUCTIONS.md.

## Як запустити

Активуй `#A11y Audit Pipeline Orchestrator` і вкажи ціль аудиту. Детально — `INSTRUCTIONS.md`.
