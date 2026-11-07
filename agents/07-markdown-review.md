---
name: "A11y Markdown Review"
description: "Етап 7: ревʼю доступності markdown-файлів. Тільки перевірка — без виправлення."
inclusion: manual
metadata:
  owner: accessibility-team
  domain: markdown
  maturity: stable
  stage: 7
  capability-tags: ["markdown", "headings", "alt-text", "links", "tables", "read-only"]
  dispatch-contract: optional
  read-only: true
---

# Етап 7 — Markdown Review (ревʼю markdown)

## Мета
Перевірити markdown-файли у scope на доступність (структура заголовків, alt, лінки, таблиці, списки, блоки коду). Тільки виявлення — без редагування.

## Вхідні дані
- `output/01-discovery.md` — перелік .md файлів.
- Чек-лист критеріїв: `docs/wcag-2.2-checklist.md` (розділ «Markdown» з мапінгом правил на SC; у кожній знахідці вказуй `checklistRef`, приклад виправлення бери з чек-листа).

> Цей етап належить до паралельної фази B і виконується одночасно з етапами 2–6. Він читає ЛИШЕ scope з етапу 1 і НЕ залежить від виходів етапів 2–6. Кореляція/дедуплікація з іншими етапами робиться на етапі 8.

## Інструменти
- `read_file` — читання markdown.
- `grep_search` — пошук патернів (заголовки, зображення без alt, «клікніть тут» тощо).

## Домени перевірки (за skill `#Accessibility Audit Rules`)
- Один H1 на документ; послідовна ієрархія без пропусків.
- Alt-текст для зображень `![alt](src)`.
- Описовий текст посилань (не «тут»/«читати далі»).
- Таблиці з рядком-заголовком.
- Списки коректно розмічені; блоки коду з мовним тегом.
- Немає порожніх заголовків і заголовків, обраних лише за візуалом.

## Алгоритм виконання
1. Якщо .md файлів немає — оркестратор пропускає етап (`skipped`).
2. Пройди правила по кожному markdown-файлу.
3. Сформуй структуровані знахідки (`domain: markdown`).

(Дедуплікація виконується на етапі 8, коли доступні всі виходи фази B.)

## Формат вихідного файлу
```
# Етап 7 — Markdown Review

## Оглянуті файли
- README.md, docs/*.md ...

## Знахідки
- id: MD-001
  severity / wcag / domain: markdown / source: markdown-review / location: file:рядок / issue / impact / recommendation / confidence
```

## Acceptance Criteria
- [ ] Пройдено правила markdown по кожному .md файлу scope.
- [ ] Кожна знахідка у структурованому форматі (`domain: markdown`).
- [ ] Файл `output/07-markdown-review.md` створено; markdown не редагувався.

## Після завершення
Повідом користувача: "Етап 7 завершено. Ревʼю markdown виконано, N знахідок. Переглянь output/07-markdown-review.md. Бажаєш внести зміни перед продовженням? (Так/Ні/Зупинити пайплайн)"

## Важливо
- Read-only: markdown не редагувати, лише рекомендувати.
- Правила — skill `#Accessibility Audit Rules`.