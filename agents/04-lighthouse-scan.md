---
name: "A11y Lighthouse Scan"
description: "Етап 4: автоматичний read-only скан через Lighthouse accessibility category на базовому стані та кожному попапі, виявленому в межах модуля. Лише збір знахідок."
inclusion: manual
metadata:
  owner: accessibility-team
  domain: web
  maturity: stable
  stage: 4
  capability-tags: ["lighthouse", "playwright-mcp", "runtime-scan", "wcag-2.2-aa", "read-only"]
  dispatch-contract: optional
  read-only: true
---

# Етап 4 — Lighthouse Scan (автоматичний скан Lighthouse)

## Мета
Прогнати Lighthouse (категорія accessibility) у режимі «лише звіт» на базовому стані сторінки (navigation) і на доступних попапах у межах модуля (snapshot у user flow), на авторизованій сесії ролі з Discovery. Жодних автовиправлень.

## Вхідні дані
- `output/01-discovery.md`: URL, роль (storageState), `module segment`.
- `output/runtime/02/states.json` — інвентар станів від `tools/popup-crawler.mjs` (якщо його немає — етап запускає crawler сам).
- Спільні правила: skill `#Runtime Scan Rules`, `#Accessibility Audit Rules`.
- Чек-лист критеріїв: `docs/wcag-2.2-checklist.md`. Кожен `failed`/`manual` аудит Lighthouse зіставляй з SC і вказуй `checklistRef`; рекомендацію бери з прикладу виправлення в чек-лісті.

> Цей етап належить до фази B. Він читає scope з етапу 1 і спільний інвентар `states.json`; виходи етапів 2, 3, 5–7 не читає. Дедуплікація — на етапі 8.

## Інструменти
- `execute_pwsh`:
  - `node tools/auth-check.mjs --role <роль> --url "<URL>"` — перед стартом етапу;
  - `node tools/popup-crawler.mjs ...` — лише якщо `states.json` відсутній;
  - `node tools/lh-run.mjs --url "<URL>" --role <роль> --module <segment> --flow --states output/runtime/02/states.json [--only base,s001,...] [--html] [--approvals output/runtime/approvals.json]`.
- `tools/lh-run.mjs`: Lighthouse **13.6.0** з `tools/node_modules` (закріплена версія, Node >= 22.19):
  - Chromium (Playwright 1.62.0, новий headless) з тимчасовим профілем у `%TEMP%`, cookies і localStorage зі `storageState` ролі; профіль видаляється наприкінці;
  - user flow: `navigate` для `base` (повний navigation-аудит), `snapshot` для кожного стану з `states.json` після відтворення шляху з перевіркою політики дій і межі модуля;
  - налаштування: `onlyCategories: accessibility`, `formFactor: desktop`, без емуляції екрана й троттлінгу, `disableStorageReset: true`;
  - скріншоти (`final-screenshot`, `screenshot-thumbnails`, `full-page-screenshot`) вилучаються з результатів (можуть містити персональні дані);
  - `finalDisplayedUrl` base перевіряється на належність модулю; `runtimeError` Lighthouse (напр. `NO_FCP`) позначає крок як помилку.
  - Вихід: сирий LHR на кожен крок `output/runtime/04/<id>.json`; зведення `output/scan-lighthouse.json` (score, failed/manual аудити, warnings); з `--html` — `output/runtime/04/flow-report.html`.
  - Коди виходу: 0 успіх; 3 немає стану; 4 сесія недійсна; 5 помилка; 6 поза модулем.
- **Playwright MCP** (допоміжно): звірка контексту знахідки; без кліків по небезпечних елементах.
- `read_file` — читання `output/scan-lighthouse.json` і `output/runtime/04/*.json`.
- Глобальний `npx lighthouse` НЕ використовується (не бачить сесії, версія не закріплена).

## Алгоритм виконання
1. Якщо URL відсутній або метод = «тільки код» — зафіксуй обмеження, етап `skipped`.
2. **Сесія.** `auth-check` = `valid`; якщо `missing`/`expired` — агент самостійно відкриває окремий браузер через Playwright MCP (`browser_navigate` на `<URL>`) для ручного входу людини та зберігає `storageState` у `auth/playwright/.auth/<роль>.json` (skill `#Runtime Scan Rules`, розділ 5).
3. **Інвентар станів.** `output/runtime/02/states.json`; якщо немає — запусти crawler.
4. **Скан.** `lh-run.mjs --flow --states ...`. Для великої кількості станів дозволено обмежити snapshot-кроки (`--only`) — обрані стани й причину вибору фіксуй у звіті; `base` виконується завжди.
5. **Перевір результат.** `base.status = ok`, `finalDisplayedUrl` у модулі, score не `null`. Кроки зі `status: error` → `Обмеження` з текстом помилки. Код 4 — зупинка, відкриття окремого браузера через Playwright MCP для ручного оновлення сесії людиною та збереження `storageState` у `auth/playwright/.auth/<роль>.json`.
6. **Порівняння.** Якщо є попередній архів для того самого модуля (`result_history/Pipeline_*/scan-lighthouse.json`), зафіксуй попередній score base і різницю (довідково, не як знахідку).
7. **Нормалізація.** `failedAudits` (base і snapshot-кроки) → знахідки `LH-NNN` з полем `state`; `manualAudits` → секція «Ручні перевірки» (не знахідки).

## Формат вихідного файлу
```
# Етап 4 — Lighthouse Scan

## Запуск
- Інструмент: tools/lh-run.mjs, Lighthouse 13.6.0, Node vX, user flow (navigation + snapshot)
- Роль / auth-check: <роль> / valid (ageMinutes N)
- Інвентар станів: output/runtime/02/states.json (N станів; у flow: M)
- Зведення: output/scan-lighthouse.json; сирі LHR: output/runtime/04/<id>.json

## Оглянуті стани
| id | state | режим | score | failed audits | status |
|----|-------|-------|-------|---------------|--------|
| base | base | navigation | 94 | ... | ok |

## Порівняння з попереднім запуском
- Pipeline_<мітка>: base score N -> M (довідково)

## Ручні перевірки (manual audits)
- ...

## Обмеження
- ...

## Знахідки
- id: LH-001
  severity: ...
  wcag: ...
  checklistRef: ...
  domain: web
  source: lighthouse
  audit: <audit id>
  state: base|popup:...
  location: ...
  issue: ...
  impact: ...
  recommendation: ...
  confidence: ...
```

## Acceptance Criteria
- [ ] `auth-check` = `valid` перед запуском (для цілі за логіном).
- [ ] `base` проскановано в режимі navigation, score зафіксовано, `finalDisplayedUrl` у межах модуля.
- [ ] Snapshot-кроки виконано для станів `states.json` (або зафіксовано, які стани виключено і чому).
- [ ] Версія Lighthouse (13.6.0) і Node зафіксовані зі `scan-lighthouse.json`.
- [ ] Сирі LHR збережено в `output/runtime/04/` без скріншотів; зведення в `output/scan-lighthouse.json`.
- [ ] Межа модуля та політика дій дотримані.
- [ ] Знахідки нормалізовано (`LH-NNN`, поля `state`, `audit`, `checklistRef`); нічого не вигадано.
- [ ] Жодного прапорця автовиправлення.
- [ ] Файл `output/04-lighthouse-scan.md` створено; цільовий код/дані не змінювались.

## Після завершення
Повідом користувача: "Етап 4 завершено. Lighthouse прогнано на базовому стані (score X/100) та N станах, зібрано M знахідок. Переглянь output/04-lighthouse-scan.md. Бажаєш внести зміни перед продовженням? (Так/Ні/Зупинити пайплайн)"

## Важливо
- Lighthouse не має прапорців автовиправлення; все одно перевіряй команду перед запуском.
- Інструменти — лише з `tools/`; нові пакети не встановлюються.
- Якщо крок не вдався — це явне обмеження в звіті, не підробка результату.
- Межа модуля та human gate — як у skill `#Runtime Scan Rules`.
- Правила та формат знахідок — skill `#Accessibility Audit Rules`.