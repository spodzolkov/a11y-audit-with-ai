---
name: "A11y Axe Scan"
description: "Етап 3: автоматичний read-only скан через axe-core (CLI на базовому стані + ін'єкція axe-core на кожному попапі, виявленому в межах модуля). Лише збір знахідок."
inclusion: manual
metadata:
  owner: accessibility-team
  domain: web
  maturity: stable
  stage: 3
  capability-tags: ["axe-core", "playwright-mcp", "runtime-scan", "wcag-2.2-aa", "read-only"]
  dispatch-contract: optional
  read-only: true
---

# Етап 3 — Axe Scan (автоматичний скан axe-core)

## Мета
Прогнати axe-core проти рендереного DOM у режимі «лише звіт» на базовому стані сторінки і на кожному доступному попапі/стані в межах модуля, на авторизованій сесії ролі з Discovery. Жодних автовиправлень.

## Вхідні дані
- `output/01-discovery.md`: URL, роль (storageState), `module segment`.
- `output/runtime/02/states.json` — інвентар станів від `tools/popup-crawler.mjs` (спільний артефакт runtime-етапів; якщо його немає — етап запускає crawler сам).
- Спільні правила: skill `#Runtime Scan Rules` (межа модуля, виявлення попапів, human gate, авторизація), `#Accessibility Audit Rules` (формат знахідок).
- Чек-лист критеріїв: `docs/wcag-2.2-checklist.md`. Для кожного axe-правила визнач відповідний SC (теги `wcag111`, `wcag143` тощо) і вкажи `checklistRef`; рекомендацію бери з прикладу виправлення в чек-лісті.

> Цей етап належить до фази B. Він читає scope з етапу 1 і спільний інвентар станів `states.json`; виходи етапів 2, 4–7 не читає. Дедуплікація з Runtime Simulation і Web Review — на етапі 8.

## Інструменти
- `execute_pwsh`:
  - `node tools/auth-check.mjs --role <роль> --url "<URL>"` — перед стартом етапу;
  - `node tools/popup-crawler.mjs --url "<URL>" --role <роль> --module <segment>` — лише якщо `output/runtime/02/states.json` відсутній;
  - `node tools/axe-run.mjs --url "<URL>" --role <роль> --module <segment> --states output/runtime/02/states.json [--approvals output/runtime/approvals.json]` — основний запуск.
- `tools/axe-run.mjs`: axe-core **4.14.0** з `tools/node_modules` (закріплена версія), ін'єкція `axe.min.js` у Playwright-контекст з `storageState` ролі; теги `wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa`; для кожного стану — свіже відкриття цілі й відтворення шляху (`path`) з перевіркою політики дій і межі модуля. Вихід:
  - повний сирий JSON на кожен стан: `output/runtime/03/<id>.json` (violations з nodes, incomplete);
  - зведення: `output/scan-axe.json` (версія, стани, violations за правилами, помилки).
  - Коди виходу: 0 успіх; 3 немає стану; 4 сесія недійсна (редірект на логін); 5 помилка; 6 поза модулем.
- **Playwright MCP** (допоміжно): `browser_navigate`, `browser_snapshot` для звірки контексту знахідки (селектор, видимий текст), без кліків по небезпечних елементах.
- `read_file` — читання `output/scan-axe.json` і `output/runtime/03/*.json`.
- Глобальний `npx @axe-core/cli` НЕ використовується (не бачить сесії й попапів, версія не закріплена). Тимчасові npm-теки в `%TEMP%` і раннери в `output/` не створюються.

## Алгоритм виконання
1. Якщо URL відсутній або метод = «тільки код» — зафіксуй обмеження, етап позначається `skipped`.
2. **Сесія.** `auth-check` має дати `valid`; `missing`/`expired` — агент самостійно відкриває окремий браузер через Playwright MCP (`browser_navigate` на `<URL>`) для ручного проходження авторизації людиною та зберігає `storageState` у `auth/playwright/.auth/<роль>.json` (skill `#Runtime Scan Rules`, розділ 5).
3. **Інвентар станів.** Використай `output/runtime/02/states.json`; якщо файлу немає — запусти `popup-crawler.mjs` (той самий файл потім використає етап 4).
4. **Скан.** Запусти `axe-run.mjs` з `--states`. Для частини станів можна `--only base,s001,...` (наприклад, повтор після помилки).
5. **Помилки станів.** Стан зі `status: error` у `scan-axe.json` → `Обмеження` з текстом помилки (крок заблоковано політикою дій, вихід за межі модуля, елемент не знайдено). Код 4 — зупинка етапу, відкриття окремого браузера через Playwright MCP для ручного оновлення сесії людиною та збереження оновленого `storageState` у `auth/playwright/.auth/<роль>.json`, потім повтор.
6. **Нормалізація.** Кожне violation (правило + стан) → знахідка `AXE-NNN` з полем `state` (label стану), `location` (target-селектори з nodes, не більше 5 + "і ще N"), `checklistRef`. `incomplete` → `confidence: low` або `Обмеження`, без вигадування результату.
7. Зафіксуй версію axe-core, кількість станів, помилки та посилання на сирі файли.

## Формат вихідного файлу
```
# Етап 3 — Axe Scan

## Запуск
- Інструмент: tools/axe-run.mjs, axe-core 4.14.0, теги wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa
- Роль / auth-check: <роль> / valid (ageMinutes N)
- Інвентар станів: output/runtime/02/states.json (N станів)
- Зведення: output/scan-axe.json; сирі результати: output/runtime/03/<id>.json

## Оглянуті стани
| id | state | status | violations | incomplete | файл |
|----|-------|--------|------------|------------|------|

## Обмеження
- [напр. "s007: крок заблоковано політикою дій (dangerous-adjacent)"]

## Знахідки
- id: AXE-001
  severity: ...
  wcag: ...
  checklistRef: ...
  domain: web
  source: axe-core
  rule: <axe rule id>
  state: base|popup:...
  location: ...
  issue: ...
  impact: ...
  recommendation: ...
  confidence: ...
```

## Acceptance Criteria
- [ ] `auth-check` = `valid` перед запуском (для цілі за логіном).
- [ ] `axe-run.mjs` виконано на `base` і на всіх станах `states.json`, або для кожного пропущеного стану зафіксовано причину.
- [ ] Версія axe-core (4.14.0) зафіксована зі `scan-axe.json`.
- [ ] Сирі результати збережено в `output/runtime/03/` і зведення в `output/scan-axe.json`.
- [ ] Межа модуля та політика дій дотримані (жоден крок не обійшов `tools/action-policy.json` без схвалення людини).
- [ ] Знахідки нормалізовано (`AXE-NNN`, поля `state`, `rule`, `checklistRef`); обмеження зафіксовано, нічого не вигадано.
- [ ] Жодного прапорця автовиправлення.
- [ ] Файл `output/03-axe-scan.md` створено; цільовий код/дані не змінювались.

## Після завершення
Повідом користувача: "Етап 3 завершено. axe-core прогнано на базовому стані та N станах, зібрано M знахідок. Переглянь output/03-axe-scan.md. Бажаєш внести зміни перед продовженням? (Так/Ні/Зупинити пайплайн)"

## Важливо
- НІКОЛИ не використовувати прапорці автовиправлення.
- Інструменти — лише з `tools/` (закріплені версії); нові пакети не встановлюються, `package.json` цільового проєкту чи `tools/` не змінюються.
- Стан сесії не копіюється в `output/`; у JSON-виводі інструментів query-параметри URL вирізаються.
- Межа модуля та human gate для небезпечних дій — як у skill `#Runtime Scan Rules`.
- Правила та формат знахідок — skill `#Accessibility Audit Rules`.