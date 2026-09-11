(function () {
    const USERS_KEY = 'app_users';
    const SESSION_KEY = 'app_current_user';

    const modal = document.getElementById('authModal');
    const openBtn = document.getElementById('openAuth');
    const closeBtn = document.getElementById('closeAuth');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');

    const userBadge = document.getElementById('userBadge');
    const userNameEl = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');

    /* ---------- Утилиты ---------- */

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function showError(el, message) {
        el.textContent = message;
        el.hidden = false;
    }

    function hideError(el) {
        el.textContent = '';
        el.hidden = true;
    }

    /* ---------- Состояние входа ---------- */

    function setLoggedIn(user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        document.body.classList.add('authenticated');
        openBtn.hidden = true;
        userBadge.hidden = false;
        userNameEl.textContent = user.name || user.email;
    }

    function setLoggedOut() {
        localStorage.removeItem(SESSION_KEY);
        document.body.classList.remove('authenticated');
        openBtn.hidden = false;
        userBadge.hidden = true;
        userNameEl.textContent = '';
    }

    function restoreSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return;
            const user = JSON.parse(raw);
            if (user && user.email) {
                setLoggedIn(user);
            }
        } catch (e) {
            /* ignore */
        }
    }

    /* ---------- Открытие / закрытие окна ---------- */

    function openModal() {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        hideError(loginError);
        hideError(registerError);
        formLogin.reset();
        formRegister.reset();
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });

    /* ---------- Табы ---------- */

    tabBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const tab = btn.dataset.tab;

            tabBtns.forEach(function (b) {
                b.classList.toggle('active', b === btn);
            });

            formLogin.classList.toggle('active', tab === 'login');
            formRegister.classList.toggle('active', tab === 'register');

            hideError(loginError);
            hideError(registerError);
        });
    });

    /* ---------- Вход ---------- */

    formLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        hideError(loginError);

        const email = formLogin.email.value.trim().toLowerCase();
        const password = formLogin.password.value;

        if (!email || !password) {
            showError(loginError, 'Заполните все поля');
            return;
        }

        const users = getUsers();
        const user = users.find(function (u) {
            return u.email.toLowerCase() === email && u.password === password;
        });

        if (!user) {
            showError(loginError, 'Неверный email или пароль');
            return;
        }

        setLoggedIn(user);
        closeModal();
    });

    /* ---------- Регистрация ---------- */

    formRegister.addEventListener('submit', function (e) {
        e.preventDefault();
        hideError(registerError);

        const name = formRegister.name.value.trim();
        const email = formRegister.email.value.trim().toLowerCase();
        const password = formRegister.password.value;

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

        setLoggedIn(newUser);
        closeModal();
    });

    /* ---------- Выход ---------- */

    logoutBtn.addEventListener('click', function () {
        setLoggedOut();
    });

    /* ---------- Инициализация ---------- */

    restoreSession();
})();