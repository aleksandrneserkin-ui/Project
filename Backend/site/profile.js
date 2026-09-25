/* ============================================================
   БЛОК 1. ГОСТЕВОЙ РЕЖИМ + СЕССИЯ + ВЫХОД (через API)
   ============================================================ */
(function () {
    const authTitle     = document.getElementById('profileAuthTitle');
    const authSubtitle  = document.getElementById('profileAuthSubtitle');
    const loginForm     = document.getElementById('profileLoginForm');
    const registerForm  = document.getElementById('profileRegisterForm');
    const loginError    = document.getElementById('profileLoginError');
    const registerError = document.getElementById('profileRegisterError');
    const switchText    = document.getElementById('profileSwitchText');
    const switchBtn     = document.getElementById('profileSwitchBtn');
    const logoutBtn     = document.getElementById('profileLogoutBtn');

    function showError(el, msg) { if (!el) return; el.textContent = msg; el.hidden = false; }
    function hideError(el) { if (!el) return; el.textContent = ''; el.hidden = true; }

    function emitAuthChange(user) {
        document.dispatchEvent(new CustomEvent('auth:change', { detail: { user } }));
    }
    function persistSession(user) {
        document.body.classList.add('authenticated');
        emitAuthChange(user);
    }

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

    switchBtn?.addEventListener('click', () => {
        if (registerForm && registerForm.hidden) showRegisterMode();
        else showLoginMode();
    });

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(loginError);
        const email    = loginForm.email.value.trim().toLowerCase();
        const password = loginForm.password.value;
        if (!email || !password) return showError(loginError, 'Заполните все поля');
        try {
            const { user } = await window.API.login({ email, password });
            loginForm.reset();
            persistSession(user);
        } catch (err) {
            showError(loginError, err.message);
        }
    });

    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(registerError);
        const name     = registerForm.name.value.trim();
        const email    = registerForm.email.value.trim().toLowerCase();
        const password = registerForm.password.value;
        if (!name || !email || !password) return showError(registerError, 'Заполните все поля');
        if (password.length < 6) return showError(registerError, 'Пароль должен быть не короче 6 символов');
        try {
            const { user } = await window.API.register({ name, email, password });
            registerForm.reset();
            persistSession(user);
        } catch (err) {
            showError(registerError, err.message);
        }
    });

    logoutBtn?.addEventListener('click', async () => {
        try { await window.API.logout(); } catch (_) {}
        document.body.classList.remove('authenticated');
        showLoginMode();
        emitAuthChange(null);
    });

    // Стартовое состояние — проверяем сессию на сервере
    (async function init() {
        try {
            const { user } = await window.API.me();
            if (user) {
                document.body.classList.add('authenticated');
                // Блок 2 сам отрисует по событию
                emitAuthChange(user);
                return;
            }
        } catch (_) { /* гость */ }
        showLoginMode();
    })();
})();


/* ============================================================
   БЛОК 2. РЕНДЕР ПРОФИЛЯ (без изменений по логике)
   ============================================================ */
(function () {
    const openAuthBtn  = document.getElementById('openAuth');
    const userBadge    = document.getElementById('userBadge');
    const userNameSpan = document.getElementById('userName');

    const avatarEl = document.getElementById('profileAvatar');
    const nameEl   = document.getElementById('profileName');
    const emailEl  = document.getElementById('profileEmail');

    function initials(name) {
        if (!name) return '?';
        const parts = String(name).trim().split(/\s+/).slice(0, 2);
        const out = parts.map((p) => p.charAt(0)).join('');
        return out ? out.toUpperCase() : '?';
    }

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

    function renderProfile(user) {
        if (!user) return;
        if (avatarEl) avatarEl.textContent = initials(user.name || user.email);
        if (nameEl)   nameEl.textContent   = user.name || 'Пользователь';
        if (emailEl)  emailEl.textContent  = user.email || '';

        renderField('name',  user.name  || '');
        renderField('about', user.about || '');
        renderField('city',  user.city  || '');
        renderField('job',   user.job   || '');
    }

    document.addEventListener('auth:change', (e) => {
        const user = e.detail ? e.detail.user : null;
        syncHeader(user);
        renderProfile(user);
    });
})();


/* ============================================================
   БЛОК 3. ИНЛАЙН-РЕДАКТИРОВАНИЕ (сохранение — через API)
   ============================================================ */
(function () {
    const FIELD_RULES = {
        name:  { multiline: false },
        about: { multiline: true  },
        city:  { multiline: false },
        job:   { multiline: false },
    };

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

    async function persistField(field, value) {
        try {
            const { user } = await window.API.updateMe({ [field]: value });
            document.dispatchEvent(new CustomEvent('auth:change', { detail: { user } }));
        } catch (err) {
            // Откат к предыдущему значению, если сервер не принял
            console.warn('[profile] не удалось сохранить:', err.message);
            throw err;
        }
    }

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

        async function finish(save) {
            if (finished) return;
            finished = true;

            const edited = editor.value.trim();
            const final  = save ? edited : current;

            delete p.dataset.editing;
            renderField(field, final);

            if (save && final !== current) {
                try {
                    await persistField(field, final);
                } catch (_) {
                    // Не удалось — вернём прежнее значение
                    renderField(field, current);
                }
            }
        }

        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { e.preventDefault(); finish(false); return; }
            if (e.key === 'Enter') {
                if (rule.multiline && e.shiftKey) return;
                e.preventDefault();
                finish(true);
            }
        });
        editor.addEventListener('blur', () => finish(true));
    }

    document.addEventListener('dblclick', (e) => {
        const p = e.target.closest('.profile-info-value.editable');
        if (!p) return;
        if (e.target !== p) return;
        startEdit(p);
    });
})();