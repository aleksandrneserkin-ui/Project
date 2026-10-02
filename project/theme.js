/**
 * Тема — хранение состояния переключателя между вкладками и страницами.
 *
 * Работает в паре с CSS-переключателем (styles.css):
 *   - тёмная тема включается селектором  html[data-theme="dark"]
 *     либо CSS-селектором                    html:has(#theme-toggle:checked)
 *   - выбранная тема хранится в localStorage под ключом app_theme
 *
 * По умолчанию (если пользователь ещё не выбирал тему) — СВЕТЛАЯ.
 * Системная тема игнорируется.
 *
 * Подключается в <head> — чтобы успеть выставить data-theme до первой отрисовки.
 */
(function () {
    var THEME_KEY = 'app_theme';
    var DARK = 'dark';
    var LIGHT = 'light';
    var root = document.documentElement;

    /* ---------- Чтение / запись ---------- */

    function readStoredTheme() {
        try {
            var v = localStorage.getItem(THEME_KEY);
            return (v === DARK || v === LIGHT) ? v : null;
        } catch (e) {
            return null;
        }
    }

    function writeStoredTheme(theme) {
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (e) {
            /* localStorage может быть недоступен */
        }
    }

    /* ---------- Применение темы ---------- */

    function applyTheme(theme) {
        if (theme === DARK) {
            root.setAttribute('data-theme', DARK);
        } else {
            root.setAttribute('data-theme', LIGHT);
        }
    }

    /* ---------- 1. Применяем тему сразу, до отрисовки body ---------- */

    var initialTheme = readStoredTheme() || LIGHT;
    applyTheme(initialTheme);

    /* ---------- 2. После загрузки DOM — синхронизируем чекбокс ---------- */

    document.addEventListener('DOMContentLoaded', function () {
        var toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        // Приводим сам чекбокс в соответствие с применённой темой
        toggle.checked = (root.getAttribute('data-theme') === DARK);

        toggle.addEventListener('change', function () {
            var theme = toggle.checked ? DARK : LIGHT;
            applyTheme(theme);
            writeStoredTheme(theme);
        });
    });

    /* ---------- 3. Синхронизация между вкладками ---------- */

    window.addEventListener('storage', function (e) {
        if (e.key !== THEME_KEY) return;
        if (e.newValue !== DARK && e.newValue !== LIGHT) return;

        applyTheme(e.newValue);

        var toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.checked = (e.newValue === DARK);
    });
})();