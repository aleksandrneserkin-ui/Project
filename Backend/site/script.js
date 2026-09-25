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

    function showError(el, msg) { if (!el) return; el.textContent = msg; el.hidden = false; }
    function hideError(el) { if (!el) return; el.textContent = ''; el.hidden = true; }

    function setLoggedIn(user) {
        document.body.classList.add('authenticated');
        if (openBtn)     openBtn.hidden = true;
        if (userBadge)   userBadge.hidden = false;
        if (userNameEl)  userNameEl.textContent = user.name || user.email;
        document.dispatchEvent(new CustomEvent('auth:change', { detail: { user } }));
    }

    function setLoggedOut() {
        document.body.classList.remove('authenticated');
        if (openBtn)    openBtn.hidden = false;
        if (userBadge)  userBadge.hidden = true;
        if (userNameEl) userNameEl.textContent = '';
        document.dispatchEvent(new CustomEvent('auth:change', { detail: { user: null } }));
    }

    async function restoreSession() {
        try {
            const { user } = await window.API.me();
            if (user) setLoggedIn(user);
        } catch (_) {
            // 401 — гость, всё ок
        }
    }

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
        formLogin?.reset();
        formRegister?.reset();
    }

    if (openBtn)  openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal();
    });

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
            formLogin.classList.toggle('active', tab === 'login');
            formRegister.classList.toggle('active', tab === 'register');
            hideError(loginError);
            hideError(registerError);
        });
    });

    formLogin?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(loginError);
        const email    = formLogin.email.value.trim().toLowerCase();
        const password = formLogin.password.value;

        if (!email || !password) return showError(loginError, 'Заполните все поля');

        try {
            const { user } = await window.API.login({ email, password });
            setLoggedIn(user);
            closeModal();
        } catch (err) {
            showError(loginError, err.message);
        }
    });

    formRegister?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(registerError);
        const name     = formRegister.name.value.trim();
        const email    = formRegister.email.value.trim().toLowerCase();
        const password = formRegister.password.value;

        if (!name || !email || !password) return showError(registerError, 'Заполните все поля');
        if (password.length < 6) return showError(registerError, 'Пароль должен быть не короче 6 символов');

        try {
            const { user } = await window.API.register({ name, email, password });
            setLoggedIn(user);
            closeModal();
        } catch (err) {
            showError(registerError, err.message);
        }
    });

    logoutBtn?.addEventListener('click', async () => {
        try { await window.API.logout(); } catch (_) {}
        setLoggedOut();
    });

    restoreSession();
})();