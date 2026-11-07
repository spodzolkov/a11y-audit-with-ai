---
name: "A11y Discovery"
description: "Етап 1: визначення scope аудиту доступності — стек, файли/URL, набір сканерів, цільовий стандарт. Тільки перевірка."
inclusion: manual
metadata:
  owner: accessibility-team
  domain: web|document|markdown
  maturity: stable
  stage: 1
  capability-tags: ["scope-discovery", "framework-detection", "gitlab-mcp", "github-mcp", "wcag-2.2-aa"]
  dispatch-contract: required
  read-only: true
---

# Етап 1 — Discovery (визначення scope)

## Мета
Зібрати контекст аудиту: що перевіряємо (веб/документи/markdown), яким методом (код і/або сканери), який цільовий стандарт та які файли/URL у scope. Це вхід для всіх наступних етапів.

## Вхідні дані
- Ціль аудиту: локальний каталог АБО репозиторій GitLab / GitHub.
- Опційно URL(и) для runtime-сканування.
- Параметри пайплайну з `output/pipeline-state.json` (`parameters`).

## Інструменти
- `list_directory` / `file_search` — інвентаризація файлів локального проекту.
- `grep_search` — пошук фреймворків, конфігів, CI-сканерів.
- `read_file` — читання package.json, конфігів.
- **GitLab MCP** (`@modelcontextprotocol/server-gitlab`, коли ціль — репозиторій GitLab) — read-only доступ до репозиторію GitLab. Використовуй ТІЛЬКИ читальні дії `gitlab_read` (жодних write): `projects` (знайти проект), `tree` (дерево файлів для інвентаризації), `file` (вміст package.json/конфігів), `branches` (обрати гілку). Налаштування: шаблон `docs/mcp.example.json` ([GitHub](https://github.com/modelcontextprotocol/servers)).
- **GitHub MCP** (`@modelcontextprotocol/server-github`, коли ціль — репозиторій GitHub) — read-only доступ до репозиторію GitHub. Використовуй ТІЛЬКИ читальні дії (`search_repositories`, `list_branches`, `list_commits`, `get_file_contents`, `search_code`), жодних write-дій (`create_or_update_file`, `push_files`, `create_pull_request`, `create_branch`, `create_issue` заборонені). Налаштування: шаблон `docs/mcp.example.json` ([GitHub](https://github.com/modelcontextprotocol/servers)).

## Алгоритм виконання
1. Уточни у користувача (структуровано):
   - ціль аудиту: локальний шлях, URL, або віддалений репозиторій GitLab (проект/гілка) чи GitHub (`owner/repo` + гілка);
   - метод: код / сканери / обидва (дефолт: обидва);
   - глибина: ключові сторінки чи повний обхід;
   - **чи ціль за авторизацією** (доступна лише після логіну): якщо так — уточни роль користувача та який storageState використати (порядок і ролі — `auth/AUTH-SETUP.md`; файл стану — `auth/playwright/.auth/<роль>.json`);
   - цільовий стандарт (дефолт **WCAG 2.2 AA**);
   - для URL з хеш-маршрутом: підтвердь `module segment` (останнє слово шляху) як межу модуля для етапів 2–4.
2. Якщо ціль — віддалений репозиторій (GitLab або GitHub):
   - **GitLab**: через `gitlab_read` знайди проект (`projects`), обери гілку (`branches`), отримай дерево файлів (`tree`) і читай ключові файли (`file` або пакетно `graphql repository.blobs`) для інвентаризації. Клонування заборонене.
     **Перевірка коміту в GitLab** (якщо вказано SHA):
     ```graphql
     query($p: ID!, $sha: String!, $br: String!) {
       project(fullPath: $p) {
         repository {
           commit: tree(ref: $sha) { lastCommit { sha committedDate title } }
           branch: tree(ref: $br) { lastCommit { sha committedDate } }
         }
         pipelines(sha: $sha, first: 10) { nodes { ref sha status } }
       }
     }
     ```
     - `commit.lastCommit.sha` = SHA — коміт існує; інакше ПРОБЛЕМА (high) і питання людині.
   - **GitHub**: через GitHub MCP перевір репозиторій (`search_repositories` / `get_file_contents`), обери гілку (`list_branches`), отримай останній коміт або перевір переданий SHA через `list_commits` (параметр `sha` = гілка або SHA), обійди дерево каталогів і прочитай ключові файли (`get_file_contents` для директорій та `package.json`/конфігів, `search_code` для інвентаризації). Клонування заборонене.
   - **Спільне правило перевірки коміту (GitLab / GitHub)**:
     - Належність гілці: `підтверджено`, якщо SHA = голова гілки або входить в історію гілки / pipeline з `ref` = гілка і цим SHA. Інакше `не підтверджено`: покажи людині `title`/повідомлення коміту, дату коміту і голову гілки, і запитай: аналізувати за SHA чи за головою гілки. Рішення — у журнал (DECISION).
     - Етап 5 читає код за SHA, а не за назвою гілки, щоб результат був відтворюваним.
3. Автовизначення (silent):
   - фреймворк (React/Vue/Angular/Next/Svelte/vanilla) з package.json/конфігів;
   - наявність CI-сканерів (`.github/workflows/*` з axe/lighthouse для GitHub/локального; `.gitlab-ci.yml` для GitLab);
   - наявність документів (.docx/.xlsx/.pptx/.pdf/.epub) та markdown (.md);
   - доступність інструментів: `node -v` (>= 22.19), `npm ls --prefix tools` (axe-core 4.14.0, lighthouse 13.6.0, playwright 1.62.0 без помилок), Playwright MCP, GitLab MCP / GitHub MCP. Глобальні `npx @axe-core/cli` / `npx lighthouse` не перевіряються і не використовуються. Якщо `npm ls --prefix tools` падає — ПРОБЛЕМА в журналі й рекомендація людині виконати `npm install --prefix tools`.
4. **Перевірка авторизації** (лише якщо ціль за логіном і метод включає сканери):
   1. `node tools/auth-check.mjs --role <роль> --url "<URL цілі>"` і зафіксуй результат (`verdict`, `ageMinutes`, `earliestCookieExpiryMinutes`; вміст стану не виводити).
   2. `valid` (код 0) — продовжуй. `missing` (3) / `expired` (4) — **агент самостійно відкриває окремий браузер за допомогою Playwright MCP** (`browser_navigate` на `<URL цілі>`) і просить людину вручну пройти авторизацію (включно з Basic Auth та формою входу) у відкритому вікні браузера Playwright MCP і відповісти "готово" (як резерв за відсутності MCP може використовуватись `node tools/auth-login.mjs --role <роль> --url "<URL цілі>" --wait-for-enter`).
   3. Після відповіді "готово" від людини агент у Playwright MCP фіксує авторизований стан (`browser_snapshot` для перевірки, що сторінка не на логіні) і через `browser_run_code` зберігає лише отриманий `storageState` у `auth/playwright/.auth/<роль>.json` (`await page.context().storageState({ path: 'auth/playwright/.auth/<роль>.json' })`), не закриваючи браузер Playwright MCP, щоб активна сесія (зокрема Basic Auth у пам'яті браузера) залишалась доступною для етапів 2–4; після цього повтори `auth-check`. `error` (5) — ПРОБЛЕМА в журналі, питання людині.
   4. Збережений стан сесії живе тільки в `auth/playwright/.auth/<роль>.json` і ніколи не копіюється в `output/` чи `result_history/`.
5. Зніми базову лінію робочої теки пайплайну (тільки читання): вивід `git status --porcelain --untracked-files=all` збережи у `output/runtime/01/git-status-baseline.txt` (етап 11 порівнює з нею, щоб знайти артефакти поза `output/`).
6. Сформуй перелік файлів/URL по доменах: web / document / markdown.
7. Заповни матрицю «домен → чи є контент → який етап його покриє». Якщо домену немає — познач для автопропуску відповідного етапу.

## Формат вихідного файлу
```
# Етап 1 — Discovery

## Ціль аудиту
- Тип цілі: локальний каталог / URL / репозиторій GitLab / репозиторій GitHub
- Шлях/URL / Репозиторій (GitLab-проект або GitHub owner/repo) + гілка: ...
- Стандарт: WCAG 2.2 AA
- Метод: код / сканери / обидва
- Глибина: ...
- Потрібна авторизація: так/ні
  - Роль / storageState (див. `auth/AUTH-SETUP.md`): auth/playwright/.auth/<роль>.json або "н/д" (ця роль використовується етапами 2–4 без додаткових питань)
  - auth-check: valid / missing / expired / error; ageMinutes: N; earliestCookieExpiryMinutes: N; час перевірки (UTC)
  - Smoke-перевірка Playwright MCP: авторизовано / редірект на логін
- Коміт (GitLab / GitHub): SHA, дата, title; належність гілці: підтверджено / не підтверджено (доказ: голова гілки / історія / pipeline / рішення людини); ref для етапу 5: SHA
- Межа модуля (для runtime-етапів 2–4):
  - Module segment: останнє слово хеш-шляху URL (напр. `/contracts` для `.../main-page/contracts`)
  - Правило: навігація дозволена лише на URL, чий хеш-шлях закінчується на `/<module segment>`; усе інше = out-of-module (фіксується, без переходу)

## Виявлений стек
- Фреймворк: ...
- CI-сканери: ... (`.github/workflows/*` для GitHub, `.gitlab-ci.yml` для GitLab)
- Середовище: Node vX (>= 22.19); `tools/`: axe-core 4.14.0 / lighthouse 13.6.0 / playwright 1.62.0 (OK / помилка)
- Доступні інструменти: Playwright MCP / GitLab MCP / GitHub MCP

## Scope по доменах
### Web
- [файли/URL]
### Documents
- [файли або "немає"]
### Markdown
- [файли або "немає"]

## План покриття етапами
| Домен | Є контент | Етап | Рекомендація |
|-------|-----------|------|--------------|
| Web (runtime: симуляція користувача) | так/ні | 2 | виконати/пропустити |
| Web (runtime: axe-core) | так/ні | 3 | виконати/пропустити |
| Web (runtime: Lighthouse) | так/ні | 4 | виконати/пропустити |
| Web (код) | так/ні | 5 | виконати/пропустити |
| Documents | так/ні | 6 | виконати/пропустити |
| Markdown | так/ні | 7 | виконати/пропустити |
```

## Acceptance Criteria
- [ ] Визначено ціль (локальний шлях / URL / GitLab-репо або GitHub-репо + гілка) і цільовий стандарт (WCAG 2.2 AA).
- [ ] Якщо ціль — GitLab або GitHub: інвентаризацію виконано через read-only інструменти відповідного MCP (`gitlab_read` для GitLab; `search_repositories`/`list_branches`/`list_commits`/`get_file_contents`/`search_code` для GitHub), без write-дій і без клонування.
- [ ] Визначено метод (код / сканери / обидва) і глибину.
- [ ] Виявлено фреймворк і доступні інструменти (включно з Playwright MCP / GitLab MCP / GitHub MCP); перевірено `node -v` і `npm ls --prefix tools`.
- [ ] Для цілі за логіном: `auth-check` дав `valid`, smoke-перевірка MCP без редіректу на логін (або зафіксовано рішення людини).
- [ ] Сформовано scope по доменах (web / documents / markdown).
- [ ] Заповнено план покриття етапами з рекомендацією виконати/пропустити.
- [ ] Файл `output/01-discovery.md` створено; проект не змінювався (read-only).

## Після завершення
Повідом користувача: "Етап 1 завершено. Визначено scope та план покриття. Переглянь output/01-discovery.md. Бажаєш внести зміни перед продовженням? (Так/Ні/Зупинити пайплайн)"

## Важливо
- Це read-only етап: нічого не змінювати в проекті. Для GitLab використовуй ЛИШЕ `gitlab_read`, для GitHub — ЛИШЕ читальні інструменти GitHub MCP (створення/зміна PR/MR, файлів, гілок чи issues заборонені).
- Технічні деталі (точні шляхи, URL, GitLab-проект або GitHub-репозиторій/гілка, назви фреймворків) фіксувати без спотворень — вони потрібні наступним етапам.
- Налаштування доступу: шаблон `docs/mcp.example.json` ([Playwright MCP](https://github.com/microsoft/playwright-mcp), [GitLab MCP / GitHub MCP](https://github.com/modelcontextprotocol/servers)).
- Правила предметної області — див. skill `#Accessibility Audit Rules`.