---
name: "A11y Runtime Simulation"
description: "Етап 2: симуляція користувача з обмеженими можливостями на сторінці (Playwright MCP) — клавіатура, екранний читач, слабкозорий, reduced motion; відкриває всі доступні попапи в межах модуля. Лише збір знахідок."
inclusion: manual
metadata:
  owner: accessibility-team
  domain: web
  maturity: beta
  stage: 2
  capability-tags: ["playwright-mcp", "user-simulation", "popups", "keyboard", "screen-reader", "low-vision", "runtime-scan", "wcag-2.2-aa"]
  dispatch-contract: optional
  read-only: true
---

# Етап 2 — Runtime Simulation (симуляція користувача)

## Мета
Пройти сторінку в ролі користувача з обмеженими можливостями, відкрити ВСІ доступні попапи в межах модуля та зафіксувати порушення WCAG 2.2 AA, які проявляються лише під час реальної взаємодії. Жодних змін коду чи даних.

## Вхідні дані
- `output/01-discovery.md`: URL цілі, роль (storageState), `module segment`.
- Спільні правила: skill `#Runtime Scan Rules` (межа модуля, попапи, human gate, профілі, авторизація) і `#Accessibility Audit Rules` (формат знахідок, severity).
- Чек-лист критеріїв: `docs/wcag-2.2-checklist.md` (перевіряй критерії з позначкою `runtime` та `both`; у кожній знахідці вказуй `checklistRef`, посилання на джерела й приклад виправлення беруться з відповідного пункту чек-листа).

> Цей етап належить до паралельної фази B і виконується одночасно з етапами 3–7. Він читає ЛИШЕ scope з етапу 1 і не читає виходи інших етапів. Дедуплікація з axe/Lighthouse робиться на етапі 8.

## Інструменти
- **Playwright MCP** (`@playwright/mcp`, [GitHub](https://github.com/microsoft/playwright-mcp)): `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_hover`, `browser_press_key`, `browser_type` (лише для навігації клавіатурою, без введення реальних даних), `browser_resize`, `browser_take_screenshot` (за потреби, без персональних даних), `browser_console_messages`, `browser_network_requests`, `browser_navigate_back`, `browser_tabs`.
- `browser_evaluate` / `browser_run_code_unsafe`: ТІЛЬКИ читання стану (computed style, `document.activeElement`) і емуляція `prefers-reduced-motion`; без зміни DOM, даних чи сховищ.
- `read_file` (вхід), `fs_write` (вихід `output/02-runtime-simulation.md` та допоміжні файли в `output/runtime/02/`).
- Авторизація: для ручного входу (Basic Auth та/або форма логіну) агент самостійно відкриває окремий браузер за допомогою **Playwright MCP** (`browser_navigate` на `<URL>`), людина проходить авторизацію вручну у відкритому вікні браузера Playwright MCP, після чого агент зберігає лише результуючий `storageState` у `auth/playwright/.auth/<роль>.json` через `browser_run_code` (див. `auth/AUTH-SETUP.md`, шаблон `docs/mcp.example.json`). Агент сам не вводить паролі і не зберігає токени в `output/`.
- `execute_pwsh`:
  - `node tools/auth-check.mjs --role <роль> --url "<URL>"` — перед стартом етапу;
  - `node tools/auth-login.mjs --role <роль> --url "<URL>" --wait-for-enter` — резервний CLI-інструмент збереження `storageState`, якщо Playwright MCP недоступний;
  - `node tools/popup-crawler.mjs --url "<URL>" --role <роль> [--module <segment>] [--max-depth 3] [--approvals output/runtime/approvals.json]` — детермінований інвентар станів `output/runtime/02/states.json` (BFS за `aria-haspopup`/`aria-expanded`/`aria-controls`/ролями, політика дій `tools/action-policy.json`, межа модуля, сигнатури станів, перевірка закриття Escape і повернення фокусу). Цей файл також використовують етапи 3 і 4.

## Алгоритм виконання
1. **Підготовка.** Прочитай `01-discovery.md`: URL, роль, `module segment`. Якщо URL відсутній або метод = «тільки код» — зафіксуй обмеження й заверши (оркестратор позначить `skipped`).
2. **Перевір сесію**: `auth-check` має дати `valid` (якщо `missing` або `expired` — самостійно відкрий окремий браузер через Playwright MCP на `<URL>` для ручного входу людини та збережи `storageState` за skill `#Runtime Scan Rules`, розділ 5).
3. **Інвентар станів (crawler).** Якщо `output/runtime/02/states.json` ще немає або він старший за поточний запуск — запусти `popup-crawler.mjs`. З результату візьми:
   - `states` — перелік станів (`base`, `popup:...`, `tab:...`, вкладені) з `closeBy` і `focusReturned` — основа таблиці `Інвентар станів`;
   - `outOfModule` — у секцію `Out-of-module`;
   - `dangerous` — кандидати для human gate (крок 9);
   - `skipped` (`dangerous-adjacent`, `unknown`) — в `Обмеження` з класом і правилом;
   - `failures` і `truncated` — в `Обмеження`.
   Код виходу 4 (сесія недійсна) або 6 (поза модулем) — зупинка етапу без вигадування результату.
4. **Відкрий ціль** (`browser_navigate`) у Playwright MCP і зніми `browser_snapshot` базового стану: заголовки, лендмарки, інтерактивні елементи. Попапи відкривай за шляхами (`path`) зі `states.json`; нові кандидати, яких немає в `states.json`, додавай вручну лише за тими самими правилами (політика дій, межа модуля) і познач `source: manual`.
4a. **Профіль «Тільки клавіатура».** Пройди сторінку Tab/Shift+Tab/Enter/Space/Escape/стрілками; перевір порядок, видимий фокус, пастки, досяжність. Відкрий кожен попап клавіатурою (правила розділу 2 skill `#Runtime Scan Rules`), перевір трап і повернення фокусу, Escape.
5. **Профіль «Екранний читач».** Для `base` і кожного попапа проаналізуй accessibility-снапшот: імена, ролі, стани, назви діалогів, заголовки, live-регіони, повідомлення про помилки, порядок читання.
6. **Профіль «Слабкозорий».** `browser_resize` 640x512 (200%) і 320x256 (400%): повтори огляд `base` і ключових попапів на reflow, обрізання, перекриття, цільовий розмір; контраст читай через computed style.
7. **Профіль «Зменшена анімація».** Емулюй `prefers-reduced-motion: reduce`, перевір, чи анімації/переходи зупиняються. Поверни viewport до початкового.
8. **Межа модуля.** Усі переходи тільки в межах модуля. Лінки/кнопки за межі модуля не відкривай; фіксуй у `Out-of-module`.
9. **Небезпечні дії.** Не натискай елементи класу `dangerous` (перелік — `states.json` → `dangerous`, класифікатор `tools/action-policy.json`). Наприкінці безпечного обходу задай ОКРЕМЕ явне питання людині по кожному такому елементу (формат у skill, розділ 3). Лише "Так, натиснути" дозволяє клік: оркестратор записує схвалення в `output/runtime/approvals.json`, після чого crawler можна перезапустити з `--approvals`, щоб дослідити стан після кліку. Результат і відповідь запиши.
10. **Нормалізація.** Для кожного порушення сформуй структуровану знахідку (`RUN-NNN`) з полями `state`, `profile`, `steps`.
11. Якщо інструмент або стан недоступні, зафіксуй обмеження; не вигадуй результати.

## Формат вихідного файлу
```
# Етап 2 — Runtime Simulation

## Параметри запуску
- URL: ...
- Роль / storageState: ... (вміст не логується)
- Module segment: ...
- Профілі: keyboard / screen-reader / low-vision / reduced-motion

## Інвентар станів
Джерело: `output/runtime/02/states.json` (crawler, N станів, max-depth M) + ручні доповнення (`source: manual`).

| id | state | тригер | як відкрито | як закрито (closeBy) | фокус повернуто | джерело |
|----|-------|--------|-------------|----------------------|-----------------|---------|
| base | base | - | - | - | - | crawler |
| s001 | popup:... | ... | click | Escape / not-closed-by-Escape | так/ні | crawler/manual |

## Out-of-module
| елемент | де знайдено | ціль | дія |
|---------|-------------|------|-----|

## Небезпечні дії
| елемент | state | питання задано | відповідь | результат |
|---------|-------|----------------|-----------|-----------|

## Обмеження
- [напр. "попап X не відкрився: елемент неактивний"]

## Знахідки
- id: RUN-001
  severity: ...
  wcag: ...
  domain: web
  source: playwright-simulation
  profile: keyboard|screen-reader|low-vision|reduced-motion
  state: base|popup:...
  location: ...
  steps: ...
  issue: ...
  impact: ...
  recommendation: ...
  confidence: ...
```

## Acceptance Criteria
- [ ] Прочитано роль і `module segment` з `01-discovery.md`; Playwright MCP запущено з відповідним `--storage-state` (секрети сесії не потрапили в `output/`).
- [ ] Виконано всі чотири профілі (клавіатура, екранний читач, слабкозорий, reduced motion) або зафіксовано обмеження.
- [ ] `auth-check` = `valid` перед стартом етапу.
- [ ] `output/runtime/02/states.json` створено `popup-crawler.mjs`; відкрито всі доступні попапи в межах модуля (включно з вкладеними); `Інвентар станів` заповнено з колонками `closeBy` і `focusReturned`.
- [ ] `skipped`/`failures`/`truncated` crawler-а перенесено в `Обмеження`.
- [ ] Жодного переходу за межі модуля; усі такі лінки/кнопки в `Out-of-module`.
- [ ] Жодного кліку по небезпечних елементах без явного окремого "Так, натиснути" від людини; рішення зафіксовано.
- [ ] Знахідки у структурованому форматі з `state`, `profile`, `steps`; результати не вигадано.
- [ ] Файл `output/02-runtime-simulation.md` створено; цільовий код/дані не змінювались.

## Після завершення
Повідом користувача: "Етап 2 завершено. Симуляція користувача виконана, відкрито N станів (попапів), зібрано M знахідок. Переглянь output/02-runtime-simulation.md. Бажаєш внести зміни перед продовженням? (Так/Ні/Зупинити пайплайн)"

## Важливо
- Лише відкривання/закривання UI та зчитування стану. Дані не створювати, не змінювати, не відправляти.
- Межа модуля: останнє слово хеш-шляху URL; все інше = out-of-module, без переходу.
- Небезпечні дії тільки за окремим явним підтвердженням людини (по одному елементу).
- Не вводити реальні дані; не зберігати скріншоти з персональними даними.
- Правила: skills `#Runtime Scan Rules`, `#Accessibility Audit Rules`.