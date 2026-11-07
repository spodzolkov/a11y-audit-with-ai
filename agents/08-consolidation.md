---
name: "A11y Consolidation"
description: "Етап 8: консолідація знахідок усіх етапів, дедуплікація та severity scoring. Тільки перевірка — без виправлення."
inclusion: manual
metadata:
  owner: accessibility-team
  domain: web|document|markdown
  maturity: stable
  stage: 8
  capability-tags: ["deduplication", "severity-scoring", "traceability", "read-only"]
  dispatch-contract: required
  read-only: true
---

# Етап 8 — Consolidation (консолідація та scoring)

## Мета
Зібрати знахідки з етапів 2–7 в єдиний нормалізований перелік, дедуплікувати збіги та порахувати severity score за моделлю v2. Це вхід для фінального звіту.

## Вхідні дані
- `output/02-runtime-simulation.md`
- `output/03-axe-scan.md`
- `output/04-lighthouse-scan.md`
- `output/05-web-review.md`
- `output/06-documents-review.md`
- `output/07-markdown-review.md`
- `docs/wcag-2.2-checklist.md` — довідник SC: дедуплікація виконується за `checklistRef`/SC і локацією; для консолідованої знахідки збережи `checklistRef`.
(пропущені етапи — просто відсутні джерела, це нормально)

> Цей етап відкриває фазу C і є барʼєром синхронізації: він стартує лише після завершення всієї паралельної фази B. Саме тут виконується наскрізна кореляція/дедуплікація між знахідками сканерів (етапи 2–4: runtime-симуляція, axe-core, Lighthouse) і ручних ревʼю (етапи 5–7) — окремі етапи фази B цього не роблять, бо працюють паралельно.

## Інструменти
- `read_file` — читання вихідних файлів попередніх етапів.

## Алгоритм виконання
1. Прочитай усі наявні вихідні файли етапів 2–7.
2. Обʼєднай усі знахідки в один перелік, зберігаючи оригінальні id.
3. **Дедуплікація** (skill `#Accessibility Audit Rules`): однакові проблеми з різних джерел → одна знахідка, найдетальніша локація, `confidence: high`, у `source` перелічити всі джерела; збережи мапінг оригінальних id для traceability.
3a. **Калібрування severity** для знахідок axe/Lighthouse — за таблицею skill `#Accessibility Audit Rules` («Калібрування severity»); відхилення від рівня за замовчуванням — поле `severityRationale`.
3b. **Поза цільовим стандартом**: AAA і best practice без SC A/AA винеси в секцію `## Поза цільовим стандартом` (id `FINDING-NNN` зберігаються).
4. **Severity scoring (v2)**: critical=10, serious=6, moderate=3, minor=1 — лише для знахідок основного переліку. Порахуй total findings, weighted score, розподіл за рівнями та доменами.
5. Визнач **A11y health**: FAIL / AT RISK / NEEDS WORK / PASS (без урахування знахідок поза стандартом).

## Формат вихідного файлу
```
# Етап 8 — Consolidation

## Зведення
- Total findings: N
- Weighted score: X
- A11y health: FAIL | AT RISK | NEEDS WORK | PASS

## Розподіл за серйозністю
| critical | serious | moderate | minor |
|----------|---------|----------|-------|
| ... | ... | ... | ... |

## Розподіл за доменами
| web | document | markdown |
|-----|----------|----------|
| ... | ... | ... |

## Консолідований перелік знахідок
- id: FINDING-001 (source: axe-core + web-review; оригінали: AXE-001, WEB-003)
  severity / wcag / domain / location / issue / impact / recommendation / confidence

## Поза цільовим стандартом
- id: FINDING-0NN (source: ...; оригінали: ...)
  severity / wcag (рівень AAA або best practice) / ... (не входить у score)

## Дедуплікація (traceability)
| FINDING-id | обʼєднані оригінали |
|-----------|---------------------|
```

## Acceptance Criteria
- [ ] Прочитано всі наявні вихідні файли етапів 2–7.
- [ ] Знахідки обʼєднано в один перелік зі збереженням оригінальних id.
- [ ] Виконано дедуплікацію; збережено мапінг оригінальних id (traceability).
- [ ] Severity знахідок сканерів відкалібровано; відхилення мають `severityRationale`.
- [ ] AAA і best practice винесено в `## Поза цільовим стандартом` і не враховано в score.
- [ ] Пораховано total findings, weighted score, розподіли за серйозністю й доменами.
- [ ] Визначено A11y health (FAIL / AT RISK / NEEDS WORK / PASS).
- [ ] Файл `output/08-consolidation.md` створено; код/документи не змінювались.

## Після завершення
Повідом користувача: "Етап 8 завершено. Консолідовано N знахідок, weighted score X, стан [health]. Переглянь output/08-consolidation.md. Бажаєш внести зміни перед продовженням? (Так/Ні/Зупинити пайплайн)"

## Важливо
- Нічого не втрачати при обʼєднанні: усі оригінальні id зберігаються у мапінгу.
- Read-only: код/документи не змінювати.
- Правила scoring і формат — skill `#Accessibility Audit Rules`.