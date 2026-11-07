# WCAG 2.2 Checklist (рівні A та AA)

Повний перелік критеріїв успіху (Success Criteria, SC) WCAG 2.2 рівнів A і AA: 55 критеріїв. Цільовий стандарт пайплайну: **WCAG 2.2 AA** (включає всі критерії рівня A).

Для кожного критерію наведено: рівень, спосіб і етап перевірки в пайплайні, посилання на офіційні джерела та приклад типового виправлення. Файл є довідкою для агентів 02–10 (зокрема 09 Bug Reports, який бере із нього посилання на SC і приклади виправлень) і людей; під час аудиту він не змінюється. Формат знахідок, severity і дедуплікація описані в skill `#Accessibility Audit Rules`, правила runtime-етапів у `#Runtime Scan Rules`.

## Як користуватися

- **Перевірка**: `static` (видно в коді, розмітці, документі без браузера), `runtime` (потрібен рендер або взаємодія), `both` (статична частина в коді + підтвердження в рендері).
- **Етапи**: 2 Runtime Simulation, 3 Axe Scan, 4 Lighthouse Scan, 5 Web Review (static), 6 Documents Review, 7 Markdown Review.
- **checklistRef** у знахідці: номер SC з цього файлу, напр. `checklistRef: 2.5.8`.
- Приклади виправлення є рекомендаціями для людини. Пайплайн код не змінює.
- Позначка **(2.2)** означає критерій, доданий у WCAG 2.2.

## Базові джерела

| Джерело | URL |
|---------|-----|
| WCAG 2.2 Specification | <https://www.w3.org/TR/WCAG22/> |
| Understanding WCAG 2.2 (пояснення і приклади до кожного SC) | <https://www.w3.org/WAI/WCAG22/Understanding/> |
| How to Meet WCAG 2.2 (Quick Reference) | <https://www.w3.org/WAI/WCAG22/quickref/> |
| What's New in WCAG 2.2 | <https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/> |
| WAI-ARIA 1.2 | <https://www.w3.org/TR/wai-aria-1.2/> |
| ARIA Authoring Practices Guide (патерни компонентів) | <https://www.w3.org/WAI/ARIA/apg/> |
| axe-core: правила (є розділ WCAG 2.2 Level A & AA) | <https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md> |
| Lighthouse accessibility score | <https://developer.chrome.com/docs/lighthouse/accessibility/> |

Формат посилань для кожного SC: специфікація `https://www.w3.org/TR/WCAG22/#<slug>`, пояснення `https://www.w3.org/WAI/WCAG22/Understanding/<slug>.html`, де `<slug>` наведено в кожному розділі нижче.

## Зведена таблиця

| SC | Назва | Рівень | Перевірка | Етапи |
|----|-------|--------|-----------|-------|
| 1.1.1 | Non-text Content | A | static | 5, 6, 7 |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | static | 5, 6 |
| 1.2.2 | Captions (Prerecorded) | A | static | 5, 6 |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | static | 5, 6 |
| 1.2.4 | Captions (Live) | AA | runtime | 2 |
| 1.2.5 | Audio Description (Prerecorded) | AA | static | 5, 6 |
| 1.3.1 | Info and Relationships | A | both | 3, 4, 5, 6, 7 |
| 1.3.2 | Meaningful Sequence | A | both | 2, 5, 6 |
| 1.3.3 | Sensory Characteristics | A | static | 5, 6, 7 |
| 1.3.4 | Orientation | AA | runtime | 2 |
| 1.3.5 | Identify Input Purpose | AA | static | 5 |
| 1.4.1 | Use of Color | A | both | 2, 5 |
| 1.4.2 | Audio Control | A | runtime | 2 |
| 1.4.3 | Contrast (Minimum) | AA | both | 2, 3, 4, 5 |
| 1.4.4 | Resize Text | AA | runtime | 2 |
| 1.4.5 | Images of Text | AA | static | 5, 6 |
| 1.4.10 | Reflow | AA | runtime | 2 |
| 1.4.11 | Non-text Contrast | AA | both | 2, 3, 5 |
| 1.4.12 | Text Spacing | AA | runtime | 2 |
| 1.4.13 | Content on Hover or Focus | AA | runtime | 2 |
| 2.1.1 | Keyboard | A | runtime | 2 |
| 2.1.2 | No Keyboard Trap | A | runtime | 2 |
| 2.1.4 | Character Key Shortcuts | A | both | 2, 5 |
| 2.2.1 | Timing Adjustable | A | runtime | 2 |
| 2.2.2 | Pause, Stop, Hide | A | runtime | 2 |
| 2.3.1 | Three Flashes or Below Threshold | A | runtime | 2 |
| 2.4.1 | Bypass Blocks | A | both | 2, 3, 5 |
| 2.4.2 | Page Titled | A | both | 3, 5, 7 |
| 2.4.3 | Focus Order | A | runtime | 2 |
| 2.4.4 | Link Purpose (In Context) | A | both | 3, 5, 6, 7 |
| 2.4.5 | Multiple Ways | AA | static | 5 |
| 2.4.6 | Headings and Labels | AA | both | 5, 6, 7 |
| 2.4.7 | Focus Visible | AA | both | 2, 5 |
| 2.4.11 | Focus Not Obscured (Minimum) (2.2) | AA | runtime | 2 |
| 2.5.1 | Pointer Gestures | A | runtime | 2 |
| 2.5.2 | Pointer Cancellation | A | runtime | 2 |
| 2.5.3 | Label in Name | A | both | 3, 5, 6 |
| 2.5.4 | Motion Actuation | A | runtime | 2 |
| 2.5.7 | Dragging Movements (2.2) | AA | runtime | 2 |
| 2.5.8 | Target Size (Minimum) (2.2) | AA | both | 2, 5 |
| 3.1.1 | Language of Page | A | both | 3, 5, 6, 7 |
| 3.1.2 | Language of Parts | AA | static | 5, 6 |
| 3.2.1 | On Focus | A | runtime | 2 |
| 3.2.2 | On Input | A | runtime | 2 |
| 3.2.3 | Consistent Navigation | AA | both | 2, 5 |
| 3.2.4 | Consistent Identification | AA | both | 2, 5 |
| 3.2.6 | Consistent Help (2.2) | A | both | 2, 5 |
| 3.3.1 | Error Identification | A | both | 2, 5, 6 |
| 3.3.2 | Labels or Instructions | A | both | 2, 3, 5, 6 |
| 3.3.3 | Error Suggestion | AA | both | 2, 5, 6 |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | both | 2, 5, 6 |
| 3.3.7 | Redundant Entry (2.2) | A | both | 2, 5 |
| 3.3.8 | Accessible Authentication (Minimum) (2.2) | AA | both | 2, 5 |
| 4.1.2 | Name, Role, Value | A | both | 2, 3, 4, 5 |
| 4.1.3 | Status Messages | AA | both | 2, 5 |

---

## 1. Perceivable

### 1.1.1 Non-text Content (A)
- Slug: `non-text-content`. Перевірка: static. Етапи: 5, 6, 7.
- Що перевіряти: кожне зображення, іконка, графік має текстовий еквівалент; декоративні приховані від AT.
- Джерела: <https://www.w3.org/TR/WCAG22/#non-text-content> · <https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html>
- Виправлення:
  ```html
  <!-- було -->  <img src="chart.png">
  <!-- стало --> <img src="chart.png" alt="Виручка зросла на 12% у третьому кварталі">
  <!-- декоративне --> <img src="divider.png" alt="">
  ```

### 1.2.1 Audio-only and Video-only (Prerecorded) (A)
- Slug: `audio-only-and-video-only-prerecorded`. Перевірка: static. Етапи: 5, 6.
- Що перевіряти: для запису лише з аудіо або лише з відео є текстова альтернатива.
- Джерела: <https://www.w3.org/TR/WCAG22/#audio-only-and-video-only-prerecorded> · <https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html>
- Виправлення: `<audio controls src="podcast.mp3"></audio> <a href="podcast-transcript.html">Текстова версія</a>`

### 1.2.2 Captions (Prerecorded) (A)
- Slug: `captions-prerecorded`. Перевірка: static. Етапи: 5, 6.
- Що перевіряти: відео з звуком має субтитри.
- Джерела: <https://www.w3.org/TR/WCAG22/#captions-prerecorded> · <https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html>
- Виправлення: `<video controls src="v.mp4"><track kind="captions" src="v.uk.vtt" srclang="uk" label="Українська"></video>`

### 1.2.3 Audio Description or Media Alternative (Prerecorded) (A)
- Slug: `audio-description-or-media-alternative-prerecorded`. Перевірка: static. Етапи: 5, 6.
- Що перевіряти: для відео з важливою візуальною інформацією є аудіоопис або повна текстова альтернатива.
- Джерела: <https://www.w3.org/TR/WCAG22/#audio-description-or-media-alternative-prerecorded> · <https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html>
- Виправлення: додати поруч із плеєром повний текстовий сценарій відео з описом дій на екрані.

### 1.2.4 Captions (Live) (AA)
- Slug: `captions-live`. Перевірка: runtime. Етап: 2 (лише якщо на сторінці є пряма трансляція).
- Що перевіряти: у прямих трансляціях з аудіо є субтитри.
- Джерела: <https://www.w3.org/TR/WCAG22/#captions-live> · <https://www.w3.org/WAI/WCAG22/Understanding/captions-live.html>
- Виправлення: увімкнути живі субтитри (CART або автоматичні з перевіркою якості) для трансляцій.

### 1.2.5 Audio Description (Prerecorded) (AA)
- Slug: `audio-description-prerecorded`. Перевірка: static. Етапи: 5, 6.
- Що перевіряти: відео має окрему доріжку аудіоопису.
- Джерела: <https://www.w3.org/TR/WCAG22/#audio-description-prerecorded> · <https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html>
- Виправлення: додати другу звукову доріжку, що описує візуальні події між репліками.

### 1.3.1 Info and Relationships (A)
- Slug: `info-and-relationships`. Перевірка: both. Етапи: 3, 4, 5, 6, 7 (структура), 2 (accessibility-дерево).
- Що перевіряти: структура передана семантикою: заголовки, списки, таблиці, звʼязок label-input, групи полів.
- Джерела: <https://www.w3.org/TR/WCAG22/#info-and-relationships> · <https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html>
- Виправлення:
  ```html
  <!-- було -->  <div class="title">Умови</div>
  <!-- стало --> <h2>Умови</h2>

  <!-- було -->  <span>Email</span><input>
  <!-- стало --> <label for="email">Email</label><input id="email" type="email">
  ```

### 1.3.2 Meaningful Sequence (A)
- Slug: `meaningful-sequence`. Перевірка: both. Етапи: 5 (порядок DOM), 2 (порядок у дереві), 6.
- Що перевіряти: порядок читання в DOM відповідає змістовій послідовності.
- Джерела: <https://www.w3.org/TR/WCAG22/#meaningful-sequence> · <https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html>
- Виправлення: переставити елементи в розмітці, а не лише через CSS `order` або абсолютне позиціювання.

### 1.3.3 Sensory Characteristics (A)
- Slug: `sensory-characteristics`. Перевірка: static. Етапи: 5, 6, 7.
- Що перевіряти: інструкції не спираються лише на форму, колір, розташування, звук.
- Джерела: <https://www.w3.org/TR/WCAG22/#sensory-characteristics> · <https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html>
- Виправлення: "Натисніть зелену кнопку праворуч" замінити на "Натисніть кнопку «Підтвердити»".

### 1.3.4 Orientation (AA)
- Slug: `orientation`. Перевірка: runtime. Етап: 2.
- Що перевіряти: контент не заблокований в одній орієнтації екрана без суттєвої потреби.
- Джерела: <https://www.w3.org/TR/WCAG22/#orientation> · <https://www.w3.org/WAI/WCAG22/Understanding/orientation.html>
- Виправлення: прибрати примусове блокування `screen.orientation.lock()` або CSS-обертання контейнера на весь екран.

### 1.3.5 Identify Input Purpose (AA)
- Slug: `identify-input-purpose`. Перевірка: static. Етап: 5.
- Що перевіряти: поля з персональними даними мають відповідний `autocomplete`.
- Джерела: <https://www.w3.org/TR/WCAG22/#identify-input-purpose> · <https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html>
- Виправлення: `<input type="tel" name="phone" autocomplete="tel">`

### 1.4.1 Use of Color (A)
- Slug: `use-of-color`. Перевірка: both. Етапи: 5 (стилі), 2 (рендер).
- Що перевіряти: інформація не передається лише кольором.
- Джерела: <https://www.w3.org/TR/WCAG22/#use-of-color> · <https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html>
- Виправлення: до червоної рамки поля з помилкою додати іконку і текст `Помилка: вкажіть номер договору`; посилання в тексті підкреслювати.

### 1.4.2 Audio Control (A)
- Slug: `audio-control`. Перевірка: runtime. Етап: 2.
- Що перевіряти: звук, що автоматично відтворюється довше 3 секунд, можна зупинити або приглушити.
- Джерела: <https://www.w3.org/TR/WCAG22/#audio-control> · <https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html>
- Виправлення: не вмикати `autoplay` зі звуком; або додати видимі кнопки Pause та Volume.

### 1.4.3 Contrast (Minimum) (AA)
- Slug: `contrast-minimum`. Перевірка: both. Етапи: 5 (кольори в CSS/токенах), 2–4 (обчислені стилі).
- Що перевіряти: текст 4.5:1; великий текст (від 24px або від 18.66px жирний) 3:1.
- Джерела: <https://www.w3.org/TR/WCAG22/#contrast-minimum> · <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html> · Інструмент розрахунку: <https://webaim.org/resources/contrastchecker/>
- Виправлення:
  ```css
  /* було: #999999 на #FFFFFF = 2.85:1 */  .hint { color: #999999; }
  /* стало: #595959 на #FFFFFF = 7:1 */    .hint { color: #595959; }
  ```

### 1.4.4 Resize Text (AA)
- Slug: `resize-text`. Перевірка: runtime. Етап: 2 (профіль слабкозорого).
- Що перевіряти: при збільшенні тексту до 200% немає втрати контенту чи функцій.
- Джерела: <https://www.w3.org/TR/WCAG22/#resize-text> · <https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html>
- Виправлення: розміри в `rem`/`em` замість фіксованих `px` для контейнерів; у viewport не вказувати `user-scalable=no`.

### 1.4.5 Images of Text (AA)
- Slug: `images-of-text`. Перевірка: static. Етапи: 5, 6.
- Що перевіряти: текст подається як текст, а не як зображення (крім логотипів).
- Джерела: <https://www.w3.org/TR/WCAG22/#images-of-text> · <https://www.w3.org/WAI/WCAG22/Understanding/images-of-text.html>
- Виправлення: замінити банер-картинку з написом на `<h2>` зі стилізацією CSS.

### 1.4.10 Reflow (AA)
- Slug: `reflow`. Перевірка: runtime. Етап: 2 (профіль слабкозорого, 320 CSS px / 400%).
- Що перевіряти: на ширині 320 CSS px немає горизонтального скролу і втрати контенту (крім таблиць, карт, графіків).
- Джерела: <https://www.w3.org/TR/WCAG22/#reflow> · <https://www.w3.org/WAI/WCAG22/Understanding/reflow.html>
- Виправлення: `.container { width: 960px; }` замінити на `.container { max-width: 960px; width: 100%; }`; використовувати media queries.

### 1.4.11 Non-text Contrast (AA)
- Slug: `non-text-contrast`. Перевірка: both. Етапи: 5, 2, 3.
- Що перевіряти: межі полів, іконки, фокус-індикатори, стани компонентів мають контраст не менше 3:1.
- Джерела: <https://www.w3.org/TR/WCAG22/#non-text-contrast> · <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>
- Виправлення: `input { border: 1px solid #767676; }` (3:1+ на білому) замість `#cccccc`.

### 1.4.12 Text Spacing (AA)
- Slug: `text-spacing`. Перевірка: runtime. Етап: 2.
- Що перевіряти: при line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, відступі абзаців 2em контент не обрізається і не перекривається.
- Джерела: <https://www.w3.org/TR/WCAG22/#text-spacing> · <https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html>
- Виправлення: контейнерам тексту не задавати фіксовану `height`; використовувати `min-height`.

### 1.4.13 Content on Hover or Focus (AA)
- Slug: `content-on-hover-or-focus`. Перевірка: runtime. Етап: 2.
- Що перевіряти: контент, що зʼявляється на hover/focus, можна закрити (Esc), навести на нього курсор, він не зникає сам.
- Джерела: <https://www.w3.org/TR/WCAG22/#content-on-hover-or-focus> · <https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html>
- Виправлення: тултіп закривається по Esc, лишається видимим під час наведення на нього, не зникає за таймером.

---

## 2. Operable

### 2.1.1 Keyboard (A)
- Slug: `keyboard`. Перевірка: runtime. Етап: 2.
- Що перевіряти: уся функціональність доступна з клавіатури.
- Джерела: <https://www.w3.org/TR/WCAG22/#keyboard> · <https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html>
- Виправлення:
  ```html
  <!-- було -->  <div onclick="save()">Зберегти</div>
  <!-- стало --> <button type="button" onclick="save()">Зберегти</button>
  ```

### 2.1.2 No Keyboard Trap (A)
- Slug: `no-keyboard-trap`. Перевірка: runtime. Етап: 2.
- Що перевіряти: фокус можна вивести з будь-якого компонента клавіатурою.
- Джерела: <https://www.w3.org/TR/WCAG22/#no-keyboard-trap> · <https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html>
- Виправлення: у кастомному віджеті обробляти Esc і не перехоплювати Tab без потреби; у модальному вікні фокус циклічний, але Esc закриває.

### 2.1.4 Character Key Shortcuts (A)
- Slug: `character-key-shortcuts`. Перевірка: both. Етапи: 5 (обробники keydown), 2.
- Що перевіряти: одноклавішні гарячі клавіші можна вимкнути, перепризначити або вони діють лише при фокусі.
- Джерела: <https://www.w3.org/TR/WCAG22/#character-key-shortcuts> · <https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html>
- Виправлення: замінити `s` на `Ctrl+Alt+S` або активувати шорткат лише коли компонент у фокусі.

### 2.2.1 Timing Adjustable (A)
- Slug: `timing-adjustable`. Перевірка: runtime. Етап: 2.
- Що перевіряти: ліміти часу можна вимкнути, продовжити або збільшити.
- Джерела: <https://www.w3.org/TR/WCAG22/#timing-adjustable> · <https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html>
- Виправлення: за 60 секунд до завершення сесії показати діалог "Продовжити сесію" (не менше 20 секунд на реакцію).

### 2.2.2 Pause, Stop, Hide (A)
- Slug: `pause-stop-hide`. Перевірка: runtime. Етап: 2.
- Що перевіряти: контент, що рухається або оновлюється довше 5 секунд, можна поставити на паузу.
- Джерела: <https://www.w3.org/TR/WCAG22/#pause-stop-hide> · <https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html>
- Виправлення: додати кнопку Pause до каруселі й автооновлюваних блоків.

### 2.3.1 Three Flashes or Below Threshold (A)
- Slug: `three-flashes-or-below-threshold`. Перевірка: runtime. Етап: 2.
- Що перевіряти: немає елементів, що блимають частіше 3 разів на секунду.
- Джерела: <https://www.w3.org/TR/WCAG22/#three-flashes-or-below-threshold> · <https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html>
- Виправлення: прибрати або сповільнити анімацію блимання.

### 2.4.1 Bypass Blocks (A)
- Slug: `bypass-blocks`. Перевірка: both. Етапи: 5 (наявність), 2 (чи працює), 3.
- Що перевіряти: є skip-link або лендмарки для обходу повторюваних блоків.
- Джерела: <https://www.w3.org/TR/WCAG22/#bypass-blocks> · <https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html>
- Виправлення: `<a class="skip-link" href="#main">Перейти до основного змісту</a> ... <main id="main">`

### 2.4.2 Page Titled (A)
- Slug: `page-titled`. Перевірка: both. Етапи: 5, 7, 3.
- Що перевіряти: сторінка має унікальний описовий `<title>`.
- Джерела: <https://www.w3.org/TR/WCAG22/#page-titled> · <https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html>
- Виправлення: `<title>Договори — Корпоративний кабінет</title>`

### 2.4.3 Focus Order (A)
- Slug: `focus-order`. Перевірка: runtime. Етап: 2.
- Що перевіряти: порядок фокуса логічний і відповідає візуальному.
- Джерела: <https://www.w3.org/TR/WCAG22/#focus-order> · <https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html>
- Виправлення: прибрати `tabindex` зі значенням більше 0; змінити порядок елементів у DOM.

### 2.4.4 Link Purpose (In Context) (A)
- Slug: `link-purpose-in-context`. Перевірка: both. Етапи: 5, 6, 7, 3.
- Що перевіряти: мета посилання зрозуміла з його тексту або контексту.
- Джерела: <https://www.w3.org/TR/WCAG22/#link-purpose-in-context> · <https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html>
- Виправлення: `<a href="/doc/12">Докладніше</a>` замінити на `<a href="/doc/12">Докладніше про договір №12</a>`.

### 2.4.5 Multiple Ways (AA)
- Slug: `multiple-ways`. Перевірка: static. Етап: 5.
- Що перевіряти: сторінку можна знайти більш ніж одним способом (меню, пошук, карта сайту).
- Джерела: <https://www.w3.org/TR/WCAG22/#multiple-ways> · <https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways.html>
- Виправлення: додати пошук по модулю на додачу до навігаційного меню.

### 2.4.6 Headings and Labels (AA)
- Slug: `headings-and-labels`. Перевірка: both. Етапи: 5, 6, 7.
- Що перевіряти: заголовки і підписи описують тему або призначення.
- Джерела: <https://www.w3.org/TR/WCAG22/#headings-and-labels> · <https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html>
- Виправлення: `<label for="n">Поле 1</label>` замінити на `<label for="n">Номер договору</label>`.

### 2.4.7 Focus Visible (AA)
- Slug: `focus-visible`. Перевірка: both. Етапи: 5 (CSS), 2 (рендер).
- Що перевіряти: фокус клавіатури видно.
- Джерела: <https://www.w3.org/TR/WCAG22/#focus-visible> · <https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html>
- Виправлення:
  ```css
  /* було */  button:focus { outline: none; }
  /* стало */ button:focus-visible { outline: 2px solid #0b57d0; outline-offset: 2px; }
  ```

### 2.4.11 Focus Not Obscured (Minimum) (AA) (2.2)
- Slug: `focus-not-obscured-minimum`. Перевірка: runtime. Етап: 2.
- Що перевіряти: елемент у фокусі не повністю перекритий контентом автора (sticky header/footer, cookie-банер, чат-віджет).
- Джерела: <https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum> · <https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html>
- Виправлення: `html { scroll-padding-top: 72px; scroll-padding-bottom: 64px; }` (висота sticky-елементів); зробити банер модальним до закриття.

### 2.5.1 Pointer Gestures (A)
- Slug: `pointer-gestures`. Перевірка: runtime. Етап: 2.
- Що перевіряти: жести з кількома пальцями або по траєкторії мають альтернативу одним дотиком.
- Джерела: <https://www.w3.org/TR/WCAG22/#pointer-gestures> · <https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html>
- Виправлення: до свайп-каруселі додати кнопки "Попередній" та "Наступний".

### 2.5.2 Pointer Cancellation (A)
- Slug: `pointer-cancellation`. Перевірка: runtime. Етап: 2.
- Що перевіряти: дія спрацьовує при відпусканні (up-event), її можна скасувати.
- Джерела: <https://www.w3.org/TR/WCAG22/#pointer-cancellation> · <https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html>
- Виправлення: обробляти `click` (або `pointerup`), а не `mousedown`/`touchstart`.

### 2.5.3 Label in Name (A)
- Slug: `label-in-name`. Перевірка: both. Етапи: 5, 3, 6.
- Що перевіряти: доступна назва містить видимий текст мітки.
- Джерела: <https://www.w3.org/TR/WCAG22/#label-in-name> · <https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html>
- Виправлення: `<button aria-label="Відправка">Надіслати</button>` замінити на `<button>Надіслати</button>` (або `aria-label="Надіслати документ"`).

### 2.5.4 Motion Actuation (A)
- Slug: `motion-actuation`. Перевірка: runtime. Етап: 2.
- Що перевіряти: дії від руху пристрою (струс, нахил) мають альтернативу в інтерфейсі і їх можна вимкнути.
- Джерела: <https://www.w3.org/TR/WCAG22/#motion-actuation> · <https://www.w3.org/WAI/WCAG22/Understanding/motion-actuation.html>
- Виправлення: кнопка "Скасувати" замість "струсніть для скасування".

### 2.5.7 Dragging Movements (AA) (2.2)
- Slug: `dragging-movements`. Перевірка: runtime. Етап: 2.
- Що перевіряти: усе, що робиться перетягуванням, можна зробити одним вказівником без перетягування (клік, кнопки).
- Джерела: <https://www.w3.org/TR/WCAG22/#dragging-movements> · <https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html>
- Виправлення: у списку з drag-and-drop додати кнопки "Вгору" та "Вниз" для кожного рядка.

### 2.5.8 Target Size (Minimum) (AA) (2.2)
- Slug: `target-size-minimum`. Перевірка: both. Етапи: 5 (CSS), 2 (рендер).
- Що перевіряти: цілі для вказівника не менше 24×24 CSS px, або достатній відступ (коло діаметром 24px не перетинається з іншими цілями). Винятки: Spacing, Equivalent, Inline, User Agent Control, Essential.
- Джерела: <https://www.w3.org/TR/WCAG22/#target-size-minimum> · <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html>
- Виправлення:
  ```css
  /* було */  .icon-btn { width: 16px; height: 16px; }
  /* стало */ .icon-btn { min-width: 24px; min-height: 24px; }
  ```

---

## 3. Understandable

### 3.1.1 Language of Page (A)
- Slug: `language-of-page`. Перевірка: both. Етапи: 5, 6, 7, 3.
- Що перевіряти: мова сторінки або документа визначена програмно.
- Джерела: <https://www.w3.org/TR/WCAG22/#language-of-page> · <https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html>
- Виправлення: `<html lang="uk">`.

### 3.1.2 Language of Parts (AA)
- Slug: `language-of-parts`. Перевірка: static. Етапи: 5, 6.
- Що перевіряти: фрагменти іншою мовою позначені.
- Джерела: <https://www.w3.org/TR/WCAG22/#language-of-parts> · <https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html>
- Виправлення: `<span lang="en">SWIFT payment</span>`.

### 3.2.1 On Focus (A)
- Slug: `on-focus`. Перевірка: runtime. Етап: 2.
- Що перевіряти: отримання фокуса саме по собі не змінює контекст (не відкриває вікно, не відправляє форму).
- Джерела: <https://www.w3.org/TR/WCAG22/#on-focus> · <https://www.w3.org/WAI/WCAG22/Understanding/on-focus.html>
- Виправлення: прибрати обробник `onfocus`, що навігує або відкриває діалог; використати явну кнопку.

### 3.2.2 On Input (A)
- Slug: `on-input`. Перевірка: runtime. Етап: 2.
- Що перевіряти: зміна значення поля не змінює контекст без попередження.
- Джерела: <https://www.w3.org/TR/WCAG22/#on-input> · <https://www.w3.org/WAI/WCAG22/Understanding/on-input.html>
- Виправлення: замість автопереходу після зміни `<select>` додати кнопку "Застосувати".

### 3.2.3 Consistent Navigation (AA)
- Slug: `consistent-navigation`. Перевірка: both. Етапи: 5, 2.
- Що перевіряти: повторювані навігаційні блоки мають однаковий порядок.
- Джерела: <https://www.w3.org/TR/WCAG22/#consistent-navigation> · <https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html>
- Виправлення: використовувати один спільний компонент меню на всіх сторінках модуля.

### 3.2.4 Consistent Identification (AA)
- Slug: `consistent-identification`. Перевірка: both. Етапи: 5, 2.
- Що перевіряти: однакові функції називаються і позначаються однаково.
- Джерела: <https://www.w3.org/TR/WCAG22/#consistent-identification> · <https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html>
- Виправлення: єдина назва і іконка для "Завантажити" скрізь, а не "Експорт" в одному місці і "Скачати" в іншому.

### 3.2.6 Consistent Help (A) (2.2)
- Slug: `consistent-help`. Перевірка: both. Етапи: 5, 2.
- Що перевіряти: якщо механізм допомоги (контакти, чат, FAQ, посилання на підтримку) повторюється на сторінках, він стоїть в однаковому відносному місці.
- Джерела: <https://www.w3.org/TR/WCAG22/#consistent-help> · <https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html>
- Виправлення: кнопка "Звернутись у підтримку" завжди в шапці праворуч, у спільному шаблоні.

### 3.3.1 Error Identification (A)
- Slug: `error-identification`. Перевірка: both. Етапи: 5, 2, 6.
- Що перевіряти: помилку введення визначено і описано текстом.
- Джерела: <https://www.w3.org/TR/WCAG22/#error-identification> · <https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html>
- Виправлення:
  ```html
  <input id="iban" aria-invalid="true" aria-describedby="iban-err">
  <p id="iban-err">Помилка: IBAN має містити 29 символів.</p>
  ```

### 3.3.2 Labels or Instructions (A)
- Slug: `labels-or-instructions`. Перевірка: both. Етапи: 5, 2, 3, 6.
- Що перевіряти: поля мають підписи та інструкції (формат, обовʼязковість).
- Джерела: <https://www.w3.org/TR/WCAG22/#labels-or-instructions> · <https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html>
- Виправлення: `<label for="d">Дата (дд.мм.рррр)</label>`; обовʼязкове поле: `required` та текстова позначка.

### 3.3.3 Error Suggestion (AA)
- Slug: `error-suggestion`. Перевірка: both. Етапи: 5, 2, 6.
- Що перевіряти: повідомлення про помилку підказує, як виправити.
- Джерела: <https://www.w3.org/TR/WCAG22/#error-suggestion> · <https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html>
- Виправлення: "Невірний формат" замінити на "Невірний формат. Приклад: name@example.com".

### 3.3.4 Error Prevention (Legal, Financial, Data) (AA)
- Slug: `error-prevention-legal-financial-data`. Перевірка: both. Етапи: 5, 2, 6.
- Що перевіряти: для юридичних, фінансових операцій і зміни/видалення даних є одне з: скасування, перевірка з можливістю виправлення, підтвердження перед завершенням.
- Джерела: <https://www.w3.org/TR/WCAG22/#error-prevention-legal-financial-data> · <https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html>
- Виправлення: перед підписанням показати екран підсумку (сума, одержувач) з кнопками "Підтвердити" та "Повернутись до редагування".
- Увага для етапів 2–4: кнопки підтвердження/підпису не натискаються без окремого явного дозволу людини (skill `#Runtime Scan Rules`, розділ 3).

### 3.3.7 Redundant Entry (A) (2.2)
- Slug: `redundant-entry`. Перевірка: both. Етапи: 5, 2.
- Що перевіряти: дані, які користувач уже вводив у цьому процесі, не просять вводити знову (автопідстановка або вибір).
- Джерела: <https://www.w3.org/TR/WCAG22/#redundant-entry> · <https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html>
- Виправлення: на кроці 2 підставити значення з кроку 1; додати чекбокс "Адреса доставки збігається з адресою реєстрації".

### 3.3.8 Accessible Authentication (Minimum) (AA) (2.2)
- Slug: `accessible-authentication-minimum`. Перевірка: both. Етапи: 5, 2.
- Що перевіряти: автентифікація не вимагає когнітивного тесту (памʼятати пароль, розвʼязати пазл, переписати код), якщо немає альтернативи або механізму допомоги.
- Джерела: <https://www.w3.org/TR/WCAG22/#accessible-authentication-minimum> · <https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html>
- Виправлення:
  ```html
  <input type="password" autocomplete="current-password">
  <input type="text" inputmode="numeric" autocomplete="one-time-code">
  ```
  Не блокувати вставку з буфера (`onpaste="return false"`) і підтримувати менеджери паролів.

---

## 4. Robust

### 4.1.2 Name, Role, Value (A)
- Slug: `name-role-value`. Перевірка: both. Етапи: 5 (ARIA в коді), 2, 3, 4 (accessibility-дерево).
- Що перевіряти: кожен інтерактивний компонент має доступну назву, роль і програмно доступний стан.
- Джерела: <https://www.w3.org/TR/WCAG22/#name-role-value> · <https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html> · APG: <https://www.w3.org/WAI/ARIA/apg/>
- Виправлення:
  ```html
  <!-- було -->  <div class="checkbox checked"></div>
  <!-- стало --> <div role="checkbox" aria-checked="true" tabindex="0" aria-label="Погоджуюсь з умовами"></div>
  <!-- краще -->  <input type="checkbox" id="agree" checked><label for="agree">Погоджуюсь з умовами</label>
  ```

### 4.1.3 Status Messages (AA)
- Slug: `status-messages`. Перевірка: both. Етапи: 5 (наявність live-region), 2 (чи анонсується).
- Що перевіряти: статусні повідомлення (збережено, помилка, результати пошуку) доступні AT без переміщення фокуса.
- Джерела: <https://www.w3.org/TR/WCAG22/#status-messages> · <https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html>
- Виправлення: `<div role="status" aria-live="polite" id="toast"></div>` присутній у DOM до появи тексту; для критичних помилок `role="alert"`.

---

## Примітки

### 4.1.1 Parsing
Критерій 4.1.1 видалений з WCAG 2.2 (застарілий). Валідність розмітки (унікальні `id`, коректне вкладення) перевіряється в рамках 4.1.2 і best practice. Валідатор: <https://validator.w3.org/nu/>.

### Рівень AAA
Критерії рівня AAA (наприклад 2.3.3 Animation from Interactions, 2.4.12 Focus Not Obscured (Enhanced), 2.4.13 Focus Appearance, 2.5.5 Target Size (Enhanced)) не входять у цільовий стандарт. Якщо їх порушення виявлено, фіксувати як `severity: minor` з приміткою `AAA, поза цільовим стандартом` і не включати в weighted score. Профіль reduced motion (етап 2) перевіряє `prefers-reduced-motion` як best practice. Опис AAA-критеріїв: <https://www.w3.org/WAI/WCAG22/quickref/?levels=aaa>.

### Документи (Word, Excel, PowerPoint, PDF, ePub)
Етап 6 застосовує ті самі принципи через формат-специфічні стандарти:

| Формат | Стандарт і джерело | Відповідні SC |
|--------|--------------------|---------------|
| PDF | PDF/UA-1 (ISO 14289-1) · Matterhorn Protocol: <https://pdfa.org/resource/pdfua-matterhorn-protocol/> | 1.1.1, 1.3.1, 1.3.2, 2.4.2, 3.1.1, 4.1.2 |
| Word, Excel, PowerPoint | Microsoft Office Accessibility: <https://support.microsoft.com/office/accessibility> | 1.1.1, 1.3.1, 2.4.2, 2.4.6, 3.1.1 |
| ePub | EPUB Accessibility 1.1: <https://www.w3.org/TR/epub-a11y-11/> | 1.1.1, 1.3.1, 2.4.1, 2.4.2, 3.1.1 |

Приклад виправлення (Word): замінити жирний абзац на стиль "Заголовок 2" (1.3.1); задати мову документа (3.1.1); додати альтернативний текст через контекстне меню зображення (1.1.1).

### Markdown
Етап 7 мапить структурні правила на SC:

| Правило | SC | Приклад виправлення |
|---------|----|---------------------|
| Один H1, послідовні рівні | 1.3.1, 2.4.6 | `### Розділ` після `# Назва` замінити на `## Розділ` |
| Alt-текст зображень | 1.1.1 | `![](a.png)` замінити на `![Схема потоку даних](a.png)` |
| Описові посилання | 2.4.4 | `[тут](url)` замінити на `[Інструкція з налаштування](url)` |
| Таблиця з рядком-заголовком | 1.3.1 | додати рядок заголовків і роздільник `\|---\|` |

Правила markdownlint: <https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md> (MD001, MD025, MD045 та інші).

### Мапінг тулів на SC
- axe-core (етап 3): правила з тегами `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`: <https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md>.
- Lighthouse (етап 4): accessibility-аудити, що базуються на правилах axe-core: <https://developer.chrome.com/docs/lighthouse/accessibility/>.
- Автоматичні сканери покривають лише частину SC. Решта критеріїв потребує ручної або runtime-перевірки (етапи 2 і 5).
