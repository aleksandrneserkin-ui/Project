/* ============================================================
   БЛОК 1. АВТОРИЗАЦИЯ (вход / регистрация / выход)
   Все данные — через /api/...; сессия хранится в cookie.
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

    async function api(path, options = {}) {
        const res = await fetch(path, {
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options,
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* ignore */ }
        if (!res.ok) throw new Error((data && data.error) || 'Ошибка запроса');
        return data;
    }

    function showError(el, msg) { if (!el) return; el.textContent = msg; el.hidden = false; }
    function hideError(el)      { if (!el) return; el.textContent = '';  el.hidden = true;  }

    function emitAuthChange(user) {
        document.dispatchEvent(new CustomEvent('auth:change', { detail: { user } }));
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

    if (switchBtn) {
        switchBtn.addEventListener('click', () => {
            if (registerForm && registerForm.hidden) showRegisterMode();
            else showLoginMode();
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(loginError);

            const email    = loginForm.email.value.trim().toLowerCase();
            const password = loginForm.password.value;

            if (!email || !password) {
                showError(loginError, 'Заполните все поля');
                return;
            }

            try {
                const data = await api('/api/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });
                loginForm.reset();
                document.body.classList.add('authenticated');
                emitAuthChange(data.user);
            } catch (err) {
                showError(loginError, err.message);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
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

            try {
                const data = await api('/api/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password }),
                });
                registerForm.reset();
                document.body.classList.add('authenticated');
                emitAuthChange(data.user);
            } catch (err) {
                showError(registerError, err.message);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await api('/api/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
            document.body.classList.remove('authenticated');
            showLoginMode();
            emitAuthChange(null);
        });
    }

    showLoginMode();
})();


/* ============================================================
   БЛОК 2. РЕНДЕР ПРОФИЛЯ
   Слушает 'auth:change' и при загрузке сам спрашивает /api/me.
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

    // Первичная загрузка
    fetch('/api/me', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no session'))))
        .then((data) => {
            document.body.classList.add('authenticated');
            syncHeader(data.user);
            renderProfile(data.user);
        })
        .catch(() => {
            syncHeader(null);
        });
})();


/* ============================================================
   БЛОК 3. ИНЛАЙН-РЕДАКТИРОВАНИЕ ПОЛЕЙ ПРОФИЛЯ
   Сохранение — PUT /api/profile.
   ============================================================ */
(function () {
    const FIELD_RULES = {
        name:  { multiline: false },
        about: { multiline: true  },
        city:  { multiline: false },
        job:   { multiline: false },
    };

    function persistField(field, value) {
        return fetch('/api/profile', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value }),
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Не удалось сохранить');
                document.dispatchEvent(new CustomEvent('auth:change', {
                    detail: { user: data.user },
                }));
            })
            .catch((err) => {
                console.warn('[profile] save error:', err.message);
            });
    }

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

        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                finish(false);
                return;
            }
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