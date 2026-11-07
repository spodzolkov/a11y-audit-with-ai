# SCHEMA — Діаграми пайплайну a11y-audit-pipeline

Схеми потоків даних, машини станів та взаємодії для пайплайну комплексної перевірки доступності (WCAG 2.2 AA). Пайплайн не змінює ціль аудиту і не виконує записів у зовнішні системи; опційний етап 9 експортує структуровані баг-репорти у локальний `.md` файл.

## 1. Загальна архітектура (фази)

Пайплайн згруповано у 4 фази (11 етапів). Фаза B - паралельна. Етап 9 - опційний.

```
                     +------------------------------+
                     |     pipeline-orchestrator     |
                     |  машина станів + журнал +     |
                     |  human-in-the-loop            |
                     +---------------+--------------+
                                     |
                керує фазами A -> B -> C -> D
                                     |
  ФАЗА A          ФАЗА B (ПАРАЛЕЛЬНА)                     ФАЗА C (послідовна)                 ФАЗА D
  +--------+   +-----------------------------------+   +---------------------------------+   +--------+
  | [1]    |-->| [2]RunSim [3]Axe [4]LH            |-->| [8]Cons -> [9]Bugs* -> [10]Rep  |-->| [11]   |
  | Disc   |   | [5]Web [6]Docs [7]MD (разом)      |   |            (* опційний)         |   | Verify |
  +--------+   +-----------------------------------+   +---------------------------------+   +--------+
                  одне спільне ревʼю після групи          ревʼю на кожен етап (8-10)            обовʼязк.
                                     |
                          записи на диск -> output/
```

## 2. Потік даних між фазами

```
[Проект / URL]
      |
      v
=== ФАЗА A ===
[1 Discovery] --01-discovery.md-----------------------------------+
      |   (URL, роль storageState, module segment, scope)          |
      v                                                            |
=== ФАЗА B (паралельно, старт разом) ===                           |
   [2 RunSim] [3 Axe] [4 LH] [5 Web] [6 Docs] [7 MD]               |
    02-*.md    03-*.md  04-*.md 05-*.md 06-*.md  07-*.md            |
      +-----------+-----------+-----+-----+-----------+            |
                  v (БАРʼЄР + одне спільне ревʼю)                  |
=== ФАЗА C ===                                                      |
   [8 Consolidation] <-- усі наявні виходи фази B                   |
        | 08-consolidation.md                                       |
        v                                                           |
   [9 Bug Reports]* --09-bug-reports.md                             |
        v                                                           |
   [10 Report] --10-audit-report.md (+ Баг-репорти, якщо 9 виконаний)|
        |                                                           |
        v                                                           v
=== ФАЗА D ===
   [11 Verify] <---- читає state + journal + 01..10 ---------------+
        |
        v
   11-verification-report.md
        |
        v (фінальна дія: node tools/pipeline-state.mjs archive, копіювання)
   result_history/Pipeline_<startedAt UTC>/
     ├── run-context.md
     └── копія всього output/ (*.md + *.json + runtime/), БЕЗ файлів сесій
```

Етапи фази B незалежні: кожен читає ЛИШЕ scope з етапу 1 і не читає виходи одне одного. Кореляція/дедуплікація між runtime-етапами (2, 3, 4) і ручними ревʼю (5, 6, 7) виконується на етапі 8. Логічно неможливі етапи (немає домену; метод = «тільки код» або немає URL для етапів 2-4; 0 знахідок для етапу 9) автоматично `skipped`.

## 3. Runtime-етапи 2-4: межа модуля і попапи

Спільні правила - skill `runtime-scan-rules.md`.

```
Вхід: 01-discovery.md -> URL, роль (storageState), module segment
      module segment = останнє слово хеш-шляху (напр. /contracts)

[base state] -> знімок/скан
      |
      v
  черга кандидатів на попапи (aria-haspopup, aria-expanded, role=button/combobox/tab/menuitem ...)
      |
      +--> елемент веде за межі модуля?  ТАК -> запис "Out-of-module", БЕЗ переходу
      |
      +--> елемент небезпечний (Підписати/Надіслати/Видалити/Підтвердити ...)?
      |        ТАК -> НЕ натискати; наприкінці окреме явне питання людині по КОЖНОМУ елементу
      |               "Так, натиснути" -> один клік, результат у звіт; інакше пропуск
      |
      +--> безпечний -> відкрити -> знімок/скан стану -> закрити (Esc/Закрити) -> повернути фокус
      |
      v  вкладені попапи: повторити, доки є нові кандидати
```

## 4. Опційний етап 9: експорт баг-репортів у Markdown

```
Етап 9 (Bug Reports)
  вхід: 08-consolidation.md, 01-discovery.md, 02..04, docs/wcag-2.2-checklist.md
  якщо 0 знахідок у консолідації -> skipped
  гранулярність: critical/serious -> 1 баг-репорт на FINDING; moderate/minor -> 1 баг-репорт на критерій WCAG
  мапінг severity: critical->S2, serious->S3, moderate->S4, minor->S5
  вихід: output/09-bug-reports.md (Параметри, Зведення BUG-NNN -> FINDING-NNN, детальні секції Summary + Description)
```

## 5. Наскрізний журнал

```
[Старт] -> node tools/pipeline-state.mjs init  (створює pipeline-state.json + pipeline-journal.md)
   |
   |  на кожному етапі (node tools/pipeline-state.mjs journal <TYPE> --stage N --text ...):
   |    QUESTION -> ПИТАННЯ   -> append
   |    ANSWER   -> ВІДПОВІДЬ -> append
   |    PROBLEM  -> ПРОБЛЕМА  -> append
   |    DECISION -> РІШЕННЯ   -> append
   |  (заголовки фаз/етапів і часові мітки UTC додає інструмент)
   |  (включно з питаннями про небезпечні дії з етапів 2-4)
   v
[Етап 11 Verify] -> фіналізація + перевірка повноти журналу
```

## 6. Машина станів

Стан `output/pipeline-state.json` має `schemaVersion: 2` і змінюється ЛИШЕ інструментом `tools/pipeline-state.mjs` (тести: `node --test tools/tests/`). Інструмент ставить реальні часові мітки (ISO 8601, UTC), відхиляє недозволені переходи (код 1) і перевіряє схему командою `validate`.

### Структура стану (schemaVersion 2)
```json
{
  "schemaVersion": 2,
  "pipelineId": "a11y-<модуль>-<дата>",
  "startedAt": "<ISO UTC>",
  "updatedAt": "<ISO UTC>",
  "finishedAt": "<ISO UTC, після finish>",
  "parameters": {
    "target": {
      "url": "...",
      "gitlab": { "project": "...", "ref": "...", "commit": "..." },
      "github": { "repo": "owner/repo", "ref": "...", "commit": "..." },
      "moduleSegment": "...",
      "authRole": "..."
    },
    "standard": "WCAG 2.2 AA",
    "method": "code|scanners|both",
    "depth": "..."
  },
  "currentStage": 1,
  "currentPhase": "A|B|C|D",
  "status": "idle|running|completed|stopped|failed",
  "stages": [
    { "stage": 1, "phase": "A", "name": "discovery", "optional": false, "status": "pending",
      "startedAt": null, "completedAt": null, "output": "output/01-discovery.md",
      "result": null, "error": null, "humanApproval": null, "humanComment": null }
  ],
  "history": [ { "timestamp": "<ISO UTC>", "phase": "A", "stage": 1, "action": "started", "comment": "..." } ],
  "journalMarks": { "phase": "A", "stage": 1 }
}
```

### Команди і переходи етапу
| Команда `stage <N> ...` | З якого стану | У який стан |
|-------------------------|---------------|-------------|
| `start` | pending | in_progress |
| `await` | in_progress | awaiting_approval |
| `approve` | awaiting_approval | approved |
| `complete` | approved, in_progress | completed |
| `skip` | pending, in_progress | skipped |
| `fail` | in_progress, awaiting_approval | failed |
| `changes` | awaiting_approval, completed | changes_requested |
| `retry` | changes_requested, failed | in_progress |

Інші команди: `init` (з `--clean` / `--clean --force`), `phase`, `journal`, `finish completed|stopped|failed`, `archive [--dry-run]`, `validate`, `show`.

### Пайплайн
```
        start          фази A -> B -> C -> D завершені
[idle] -------> [running] --------------------------> [completed]
                   |
                   |-- user "Зупинити" --> [stopped]
                   |-- error ------------> [failed]
```

### Фаза B (паралельна) - барʼєр і спільне ревʼю
```
[планування: авто-skip неможливих]
        |
        v
[питання Виконати/Пропустити ОКРЕМО по 2,3,4,5,6,7]
        |
        v
[запуск обраних РАЗОМ: усі -> in_progress]
   |    |    |    |    |    |
 [2]  [3]  [4]  [5]  [6]  [7]      (виконуються паралельно)
   |    |    |    |    |    |
   +----+----+----+----+----+
       v (БАРʼЄР: кожен = awaiting_approval | skipped | failed)
       |
       v
[СПІЛЬНЕ РЕВʼЮ: один запит "Так/Ні/Зупинити"]
   |            |               |
  "Так"       "Ні"          "Зупинити"
   |            |               |
 усі успішні  переробити      pipeline
 approved->    конкретний     -> stopped
 completed     етап (changes_
 (failed:      requested ->
  спитати      in_progress ->
  продовжити)  назад у ревʼю)
```

### Етап
```
[pending]
    | start
    v
[in_progress]
    | робота агента завершена
    v
[awaiting_approval]
    |  "Так"            "Ні (зміни)"        "Зупинити"
    +--> [approved]     +--> [changes_       (пайплайн -> stopped)
    |       |                requested]
    |       v                 |
    |   [completed]           +--> назад у [in_progress]
    |
    +--> [skipped]  (пропуск на старті, опційний етап не запрошений, або немає вхідного контенту)
    +--> [failed]   (помилка)
```

## 7. Взаємодія з зовнішніми інструментами

```
[2 Runtime Simulation] --Playwright MCP--> navigate/snapshot/click/press_key/resize (дані не змінюються)
                       --human gate-------> небезпечні елементи тільки за явним "Так, натиснути"

[1..4 перед стартом] --execute_pwsh--> node tools/auth-check.mjs --role <роль> --url <URL>  (valid|missing|expired|error)
                     (якщо missing/expired: node tools/auth-login.mjs --role <роль> --url <URL> -> ручний вхід у браузері -> збереження storageState)

[0 Orchestrator, фаза B, крок 4.2a]
                   --execute_pwsh--> node tools/popup-crawler.mjs -> output/runtime/02/states.json
                                     (BFS, tools/action-policy.json, межа модуля, Escape/фокус)
                   --fs_write------> output/runtime/approvals.json (лише після "Так, натиснути" людини)

[3 Axe Scan]       --execute_pwsh--> node tools/axe-run.mjs --states ... (axe-core 4.14.0, storageState ролі)
                                     -> output/runtime/03/<id>.json + output/scan-axe.json

[4 Lighthouse Scan]--execute_pwsh--> node tools/lh-run.mjs --flow --states ... (Lighthouse 13.6.0 user flow:
                                     navigation для base, snapshot для станів; без скріншотів)
                                     -> output/runtime/04/<id>.json + output/scan-lighthouse.json

[5 Web Review]     --GitLab/GitHub MCP--> gitlab_read tree + graphql repository.blobs або GitHub get_file_contents за SHA (пакети 20-30), без клонування

[5/6/7 Reviews]    --read_file / read_code / grep_search--> (тільки читання; етап 5 без браузера)

[9 Bug Reports]    --read_file / fs_write--> експорт структурованих баг-репортів у output/09-bug-reports.md

[0 Orchestrator]   --execute_pwsh--> node tools/pipeline-state.mjs init|stage|phase|journal|finish|validate

[11 Verify]        --fs_write-----> output/run-context.md
                   --execute_pwsh--> node tools/pipeline-state.mjs validate ; archive --dry-run ; archive
                                     (копіювання в result_history/, файли сесій виключено)
```

Жоден інструмент не запускається у режимі автовиправлення. Немає fixer/remediator-компонентів. Запис на диск - лише в `output/` та `result_history/`; архівування копіює артефакти, оригінали зберігаються. Запис у зовнішні системи відсутній.

## 8. Послідовність з human-in-the-loop

### Послідовні етапи (A, C, D) - підтвердження на кожен етап
```
Оркестратор        Агент етапу N         Користувач
    |                   |                    |
    |-- (крім 1,11) Виконати/Пропустити? --->|
    |<------------- відповідь ---------------|
    | in_progress       |                    |
    |---- активує ------>|                    |
    |                    |-- пише output/NN --|
    | awaiting_approval  |                    |
    |-- Так / Ні / Зупинити? --------------->|
    |<------------- рішення ------------------|
    | approved->completed (або changes/stop)  |
    |---- наступний етап ------------------->|
```

### Паралельна фаза B - окремий пропуск + спільне ревʼю
```
Оркестратор       Агенти 2..7              Користувач
    |                   |                       |
    |-- Виконати/Пропустити? по кожному 2..7 -->|
    |<--------- вибір по кожному ---------------|
    | обрані -> in_progress (РАЗОМ)             |
    |==== активує паралельно ====>|            |
    |     [2][3][4][5][6][7]       |-- кожен пише output/NN
    |     (failed одного не спиняє інших)       |
    |<-- небезпечна дія знайдена (етапи 2-4) ---|
    |-- ОКРЕМЕ питання по кожному елементу ---->|
    |<-- "Так, натиснути" / "Ні" ---------------|
    | БАРʼЄР: усі awaiting/skipped/failed        |
    |-- ЗВЕДЕНИЙ підсумок + Так/Ні/Зупинити? -->|
    |<--------------- рішення ------------------|
    | "Так": усі успішні approved->completed    |
    |        (failed: спитати продовжити?)      |
    | "Ні": переробити конкретний етап -> ревʼю |
    |---- перехід у фазу C -------------------->|
```

Після фази C (етапи 8-10) завжди виконується фаза D - етап 11 (verify), фінальна перевірка цілісності, яка нічого не виправляє.
