/* ============================================================
   БЛОК 1. ГОСТЕВОЙ РЕЖИМ + СЕССИЯ + ВЫХОД
   ------------------------------------------------------------
   Отвечает за:
     - форму входа / регистрации прямо на странице профиля
     - переключение между этими формами (кнопка внизу)
     - запись и удаление сессии в localStorage
     - класс body.authenticated (по нему CSS скрывает гостевой блок)
     - генерацию события 'auth:change' для Блока 2 и других скриптов
   ============================================================ */
(function () {
    const USERS_KEY = 'app_users';
    const SESSION_KEY = 'app_current_user';

    const authTitle     = document.getElementById('profileAuthTitle');
    const authSubtitle  = document.getElementById('profileAuthSubtitle');
    const loginForm     = document.getElementById('profileLoginForm');
    const registerForm  = document.getElementById('profileRegisterForm');
    const loginError    = document.getElementById('profileLoginError');
    const registerError = document.getElementById('profileRegisterError');
    const switchText    = document.getElementById('profileSwitchText');
    const switchBtn     = document.getElementById('profileSwitchBtn');
    const logoutBtn     = document.getElementById('profileLogoutBtn');

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
        catch (e) { return []; }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function showError(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.hidden = false;
    }

    function hideError(el) {
        if (!el) return;
        el.textContent = '';
        el.hidden = true;
    }

    function emitAuthChange(user) {
        document.dispatchEvent(new CustomEvent('auth:change', {
            detail: { user: user }
        }));
    }

    function persistSession(user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        document.body.classList.add('authenticated');
        emitAuthChange(user);
    }

    /* ----- Переключение вход / регистрация ----- */

    function showLoginMode() {
        if (loginForm)    loginForm.hidden = false;
        if (registerForm) registerForm.hidden = true;
        if (authTitle)    authTitle.textContent = 'Вход';
        if (authSubtitle) authSubtitle.textContent = 'Войдите, чтобы открыть профиль';
        if (switchText)   switchText.textContent = 'Нет аккаунта?';
        if (switchBtn)    switchBtn.textContent = 'Регистрация';
        hideError(loginError);
        hideError(registerError);
    }

    function showRegisterMode() {
        if (loginForm)    loginForm.hidden = true;
        if (registerForm) registerForm.hidden = false;
        if (authTitle)    authTitle.textContent = 'Регистрация';
        if (authSubtitle) authSubtitle.textContent = 'Создайте аккаунт, чтобы открыть профиль';
        if (switchText)   switchText.textContent = 'Уже есть аккаунт?';
        if (switchBtn)    switchBtn.textContent = 'Войти';
        hideError(loginError);
        hideError(registerError);
    }

    if (switchBtn) {
        switchBtn.addEventListener('click', function () {
            if (registerForm && registerForm.hidden) showRegisterMode();
            else showLoginMode();
        });
    }

    /* ----- Вход через форму на странице ----- */

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError(loginError);

            const email    = loginForm.email.value.trim().toLowerCase();
            const password = loginForm.password.value;

            if (!email || !password) {
                showError(loginError, 'Заполните все поля');
                return;
            }

            const user = getUsers().find(function (u) {
                return u.email.toLowerCase() === email && u.password === password;
            });

            if (!user) {
                showError(loginError, 'Неверный email или пароль');
                return;
            }

            loginForm.reset();
            persistSession(user);
        });
    }

    /* ----- Регистрация через форму на странице ----- */

    if (registerForm) {
        registerForm.addEventListener('submit', function (e) {
            e.preventDefault();
            hideError(registerError);

            const name     = registerForm.name.value.trim();
            const email    = registerForm.email.value.trim().toLowerCase();
            const password = registerForm.password.value;

            if (!name || !email || !password) {
                showError(registerError, 'Заполните все поля');
                return;
            }
            if (password.length < 6) {
                showError(registerError, 'Пароль должен быть не короче 6 символов');
                return;
            }

            const users = getUsers();
            if (users.some(function (u) { return u.email.toLowerCase() === email; })) {
                showError(registerError, 'Пользователь с таким email уже существует');
                return;
            }

            const newUser = { email: email, password: password, name: name };
            users.push(newUser);
            saveUsers(users);

            registerForm.reset();
            persistSession(newUser);
        });
    }

    /* ----- Выход (локальная кнопка) ----- */

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            localStorage.removeItem(SESSION_KEY);
            document.body.classList.remove('authenticated');
            showLoginMode();
            emitAuthChange(null);
        });
    }

    /* ----- Стартовое состояние ----- */

    let initialUser = null;
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        initialUser = raw ? JSON.parse(raw) : null;
    } catch (e) { /* ignore */ }

    if (initialUser && initialUser.email) {
        document.body.classList.add('authenticated');
    } else {
        showLoginMode();
    }
})();


/* ============================================================
   БЛОК 2. РЕНДЕР ПРОФИЛЯ
   ------------------------------------------------------------
   Отвечает за:
     - заполнение шапки (имя, бейдж, кнопки "Войти"/"Выйти")
     - заполнение карточки профиля (аватар, заголовок, email)
     - заполнение инлайн-полей (.profile-info-value)
   Слушает событие 'auth:change'.
   ============================================================ */
(function () {
    const SESSION_KEY = 'app_current_user';

    const openAuthBtn = document.getElementById('openAuth');
    const userBadge   = document.getElementById('userBadge');
    const userNameSpan = document.getElementById('userName');

    const avatarEl   = document.getElementById('profileAvatar');
    const nameEl     = document.getElementById('profileName');
    const emailEl    = document.getElementById('profileEmail');

    function readSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function initials(name) {
        if (!name) return '?';
        const parts = String(name).trim().split(/\s+/).slice(0, 2);
        const out = parts.map(function (p) { return p.charAt(0); }).join('');
        return out ? out.toUpperCase() : '?';
    }

    /* ----- Шапка ----- */

    function syncHeader(user) {
        if (user) {
            if (openAuthBtn)  openAuthBtn.hidden = true;
            if (userBadge)    userBadge.hidden = false;
            if (userNameSpan) userNameSpan.textContent = user.name || user.email;
        } else {
            if (openAuthBtn)  openAuthBtn.hidden = false;
            if (userBadge)    userBadge.hidden = true;
            if (userNameSpan) userNameSpan.textContent = '';
        }
    }

    /* ----- Инлайн-поля (используются Блоком 3 для рендера) ----- */

    function renderField(field, value) {
        const p = document.querySelector('.profile-info-value[data-field="' + field + '"]');
        if (!p) return;
        if (p.dataset.editing === '1') return;

        if (value) {
            p.textContent = value;
            p.classList.remove('is-empty');
        } else {
            p.textContent = p.dataset.placeholder || '';
            p.classList.add('is-empty');
        }
    }

    /* ----- Карточка профиля ----- */

    function renderProfile(user) {
        if (user) {
            if (avatarEl) avatarEl.textContent = initials(user.name || user.email);
            if (nameEl)   nameEl.textContent   = user.name || 'Пользователь';
            if (emailEl)  emailEl.textContent  = user.email || '';

            renderField('name',  user.name  || '');
            renderField('about', user.about || '');
            renderField('city',  user.city  || '');
            renderField('job',   user.job   || '');
        }
    }

    document.addEventListener('auth:change', function (e) {
        const user = e.detail ? e.detail.user : null;
        syncHeader(user);
        renderProfile(user);
    });

    /* ----- Стартовое состояние ----- */

    const session = readSession();
    if (session && session.email) {
        syncHeader(session);
        renderProfile(session);
    } else {
        syncHeader(null);
    }
})();


/* ============================================================
   БЛОК 3. ИНЛАЙН-РЕДАКТИРОВАНИЕ ПОЛЕЙ ПРОФИЛЯ
   ------------------------------------------------------------
   Отвечает за:
     - dblclick по .profile-info-value.editable
     - замену <p> на <input>/<textarea> с текущим текстом
     - сохранение по Enter (input) / Enter или Shift+Enter (textarea)
       и по blur (клик вне поля)
     - отмену по Esc
     - запись в localStorage (app_current_user + app_users)
     - генерацию 'auth:change', чтобы Блок 2 обновил шапку и заголовок

   Поля:
     name, about, city, job — редактируемые
     (about — textarea, остальные — input)
   ============================================================ */
(function () {
    const SESSION_KEY = 'app_current_user';
    const USERS_KEY   = 'app_users';

    // Правила для каждого поля. Легко добавить/убрать.
    const FIELD_RULES = {
        name:  { multiline: false },
        about: { multiline: true  },
        city:  { multiline: false },
        job:   { multiline: false }
    };

    /* ----- Работа с хранилищем ----- */

    function readSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function persistField(field, value) {
        const session = readSession();
        if (!session || !session.email) return;

        // 1. сессия
        session[field] = value;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));

        // 2. запись пользователя в app_users
        try {
            const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
            const idx = users.findIndex(function (u) {
                return u.email.toLowerCase() === session.email.toLowerCase();
            });
            if (idx !== -1) {
                users[idx][field] = value;
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
            }
        } catch (e) { /* ignore */ }

        // 3. оповещаем Блок 2 (перерендерит шапку, заголовок, аватар)
        document.dispatchEvent(new CustomEvent('auth:change', {
            detail: { user: session }
        }));
    }

    /* ----- Рендер одного поля ----- */

    function renderField(field, value) {
        const p = document.querySelector('.profile-info-value[data-field="' + field + '"]');
        if (!p) return;

        if (value) {
            p.textContent = value;
            p.classList.remove('is-empty');
        } else {
            p.textContent = p.dataset.placeholder || '';
            p.classList.add('is-empty');
        }
    }

    /* ----- Редактирование одного поля ----- */

    function startEdit(p) {
        if (p.dataset.editing === '1') return;

        const field = p.dataset.field;
        const rule  = FIELD_RULES[field];
        if (!rule) return;

        const wasEmpty = p.classList.contains('is-empty');
        const current  = wasEmpty ? '' : p.textContent;

        p.dataset.editing = '1';

        const editor = document.createElement(rule.multiline ? 'textarea' : 'input');
        editor.className = 'inline-editor';
        editor.value = current;
        if (rule.multiline) editor.rows = 3;
        else editor.type = 'text';
        if (p.dataset.placeholder) editor.placeholder = p.dataset.placeholder;

        p.textContent = '';
        p.appendChild(editor);

        editor.focus();
        if (typeof editor.setSelectionRange === 'function') {
            const len = editor.value.length;
            editor.setSelectionRange(len, len);
        }

        let finished = false;

        function finish(save) {
            if (finished) return;
            finished = true;

            const edited = editor.value.trim();
            const final  = save ? edited : current;

            delete p.dataset.editing;
            renderField(field, final);

            if (save && final !== current) {
                persistField(field, final);
            }
        }

        editor.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                finish(false);
                return;
            }
            if (e.key === 'Enter') {
                // textarea: Shift+Enter — перенос строки, Enter — сохранить
                if (rule.multiline && e.shiftKey) return;
                e.preventDefault();
                finish(true);
            }
        });

        editor.addEventListener('blur', function () {
            finish(true);
        });
    }

    /* ----- Делегирование dblclick ----- */

    document.addEventListener('dblclick', function (e) {
        const p = e.target.closest('.profile-info-value.editable');
        if (!p) return;
        if (e.target !== p) return; // клик по встроенному редактору — не начинаем заново
        startEdit(p);
    });
})();