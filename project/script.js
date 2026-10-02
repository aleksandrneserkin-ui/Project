(function () {
    const modal          = document.getElementById('authModal');
    const openBtn        = document.getElementById('openAuth');
    const closeBtn       = document.getElementById('closeAuth');
    const tabBtns        = document.querySelectorAll('.tab-btn');
    const formLogin      = document.getElementById('formLogin');
    const formRegister   = document.getElementById('formRegister');
    const loginError     = document.getElementById('loginError');
    const registerError  = document.getElementById('registerError');

    const userBadge  = document.getElementById('userBadge');
    const userNameEl = document.getElementById('userName');
    const logoutBtn  = document.getElementById('logoutBtn');

    /* ---------- Обёртка над fetch ---------- */

    async function api(path, options = {}) {
        const res = await fetch(path, {
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options,
        });
        let data = null;
        try { data = await res.json(); } catch (e) { /* ignore */ }
        if (!res.ok) {
            const err = new Error((data && data.error) || 'Ошибка запроса');
            err.status = res.status;
            throw err;
        }
        return data;
    }

    /* ---------- UI ---------- */

    function showError(el, message) { if (!el) return; el.textContent = message; el.hidden = false; }
    function hideError(el)          { if (!el) return; el.textContent = '';      el.hidden = true;  }

    function setLoggedIn(user) {
        document.body.classList.add('authenticated');
        if (openBtn)    openBtn.hidden = true;
        if (userBadge)  userBadge.hidden = false;
        if (userNameEl) userNameEl.textContent = user.name || user.email;
        document.dispatchEvent(new CustomEvent('auth:change', { detail: { user } }));
    }

    function setLoggedOut() {
        document.body.classList.remove('authenticated');
        if (openBtn)    openBtn.hidden = false;
        if (userBadge)  userBadge.hidden = true;
        if (userNameEl) userNameEl.textContent = '';
        document.dispatchEvent(new CustomEvent('auth:change', { detail: { user: null } }));
    }

    /* ---------- Модалка ---------- */

    function openModal() {
        if (!modal) return;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        hideError(loginError);
        hideError(registerError);
        if (formLogin)    formLogin.reset();
        if (formRegister) formRegister.reset();
    }

    if (openBtn)  openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
        });
    }

    /* ---------- Табы ---------- */

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
            if (formLogin)    formLogin.classList.toggle('active', tab === 'login');
            if (formRegister) formRegister.classList.toggle('active', tab === 'register');
            hideError(loginError);
            hideError(registerError);
        });
    });

    /* ---------- Вход ---------- */

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(loginError);

            const email    = formLogin.email.value.trim().toLowerCase();
            const password = formLogin.password.value;

            if (!email || !password) {
                showError(loginError, 'Заполните все поля');
                return;
            }

            try {
                const data = await api('/api/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });
                setLoggedIn(data.user);
                closeModal();
            } catch (err) {
                showError(loginError, err.message);
            }
        });
    }

    /* ---------- Регистрация ---------- */

    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(registerError);

            const name     = formRegister.name.value.trim();
            const email    = formRegister.email.value.trim().toLowerCase();
            const password = formRegister.password.value;

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
                setLoggedIn(data.user);
                closeModal();
            } catch (err) {
                showError(registerError, err.message);
            }
        });
    }

    /* ---------- Выход ---------- */

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await api('/api/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
            setLoggedOut();
        });
    }

    /* ---------- Стартовое состояние: спрашиваем сервер ---------- */

    (async function restoreSession() {
        try {
            const data = await api('/api/me');
            setLoggedIn(data.user);
        } catch (e) {
            setLoggedOut();
        }
    })();
})();