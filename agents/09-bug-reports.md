---
name: "A11y Bug Reports"
description: "Етап 9 (опційний): генерує структуровані баг-репорти для консолідованих знахідок (critical/serious - по одному, moderate/minor - групами за критерієм WCAG) і експортує їх у файл output/09-bug-reports.md. Тільки перевірка та звітування — без запису в зовнішні системи."
inclusion: manual
metadata:
  owner: accessibility-team
  domain: web|document|markdown
  maturity: stable
  stage: 9
  capability-tags: ["bug-report", "wcag-2.2-aa", "markdown-export", "optional", "read-only"]
  dispatch-contract: optional
  read-only: true
---

# Етап 9 — Bug Reports (експорт баг-репортів у Markdown, опційний)

## Мета
Перетворити консолідовані знахідки на готові структуровані баг-репорти (Summary + Description) та експортувати їх у файл `output/09-bug-reports.md`. Етап опційний: оркестратор питає "Виконати/Пропустити". Жодних записів у зовнішні системи не виконується — результат зберігається виключно у `.md` файл.

## Вхідні дані
- `output/08-consolidation.md`: консолідовані знахідки (`FINDING-NNN`, severity, `wcag`, `checklistRef`, `location`, `state`, `steps`, джерела).
- `output/01-discovery.md`: URL, роль, `module segment`, назва модуля.
- `output/02-runtime-simulation.md`, `output/03-axe-scan.md`, `output/04-lighthouse-scan.md`: дані про оточення (браузер/ОС, версії axe-core та Lighthouse), якщо ці етапи виконувались.
- `docs/wcag-2.2-checklist.md`: критерії, посилання (specification, Understanding) і приклади виправлень за `checklistRef`.
- Skill `#WCAG Bug Report Generator` (`skills/wcag-bug-report-generator.md`): формат, гранулярність, мапінг severity, структура вихідного `.md` файлу.

> Запускається після етапу 8 (Consolidation) у фазі C.

## Інструменти
- `read_file`: читання вхідних артефактів і чек-листа.
- `fs_write`: запис `output/09-bug-reports.md`.

## Правила предметної області (ОБОВʼЯЗКОВО)
Дотримуйся skill `#WCAG Bug Report Generator`:
- гранулярність: `critical`/`serious` - один баг на `FINDING-NNN`; `moderate`/`minor` - один баг на критерій WCAG (`checklistRef`) з переліком знахідок групи;
- Summary: `[S{n}] (Модуль / A11y) Опис [WCAG {номери}]`; мапінг `critical->S2`, `serious->S3`, `moderate->S4`, `minor->S5`; `S1` ставить лише людина за запитом під час ревʼю;
- Description за фіксованою структурою секцій; "Допоміжна технологія" = "accessibility-снапшот Playwright (без реального скрінрідера); axe-core <версія>; Lighthouse <версія>" (лише ті інструменти, що реально виконувались); NVDA/JAWS/VoiceOver не вигадувати;
- мова українська.

## Алгоритм виконання
1. Прочитай вхідні файли. Якщо у консолідації 0 знахідок (у межах стандарту WCAG 2.2 AA) — заверши зі статусом `skipped` (причина: немає знахідок), файл не створювати.
2. Визнач дані оточення з артефактів етапів 1–4 (URL, роль, `module segment`, браузер/ОС, версії сканерів). Нічого не вигадуй: якщо версію ОС чи браузера не зафіксовано в артефактах, вкажи це явно.
3. Побудуй список баг-репортів (гранулярність за skill), присвой `BUG-NNN`, згенеруй Summary і Description для кожного. Усі посилання, опис правила та приклад виправлення бери з `docs/wcag-2.2-checklist.md` за `checklistRef`.
4. Експортуй усі сформовані баг-репорти у файл `output/09-bug-reports.md` (Параметри, таблиця Зведення, детальні секції `BUG-NNN`).

## Формат вихідного файлу
Див. skill `#WCAG Bug Report Generator`, розділ 6 (`# Етап 9 — Bug Reports`: Параметри, Зведення, Баг-репорти `BUG-NNN` із `findings`, Summary, Description).

## Acceptance Criteria
- [ ] `critical`/`serious` - по одному баг-репорту на знахідку; `moderate`/`minor` згруповано за критерієм WCAG.
- [ ] Кожен баг має Summary за форматом, Description за структурою, посилання specification/Understanding і приклад best practice з чек-листа.
- [ ] Оточення чесне: без реального скрінрідера; лише реально виконані інструменти.
- [ ] Знахідки поза стандартом (рівень AAA / best practice) не включені в баг-репорти.
- [ ] Файл `output/09-bug-reports.md` створено, кожен баг має `findings` (traceability до `FINDING-NNN`).
- [ ] Жодних записів поза `output/` або у зовнішні системи не виконувалось.

## Після завершення
Повідом користувача: "Етап 9 завершено. Експортовано <N> баг-репортів у output/09-bug-reports.md. Переглянь файл. Бажаєш внести зміни перед продовженням? (Так/Ні/Зупинити пайплайн)"

## Важливо
- Експорт виконується виключно у локальний файл `output/09-bug-reports.md`.
- Не вигадувати оточення або результати перевірок реальним скрінрідером.
- Читати/писати у файловій системі лише в межах `output/` (аудитована ціль не змінюється).
