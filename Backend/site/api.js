(function () {
    const BASE = '/api';

    async function request(path, options = {}) {
        const res = await fetch(BASE + path, {
            credentials: 'include', // ← чтобы httpOnly-кука ходила
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });

        let data = null;
        try { data = await res.json(); } catch (_) { /* пусто */ }

        if (!res.ok) {
            const msg = (data && data.error) || `Ошибка ${res.status}`;
            const err = new Error(msg);
            err.status = res.status;
            throw err;
        }
        return data;
    }

    window.API = {
        register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
        login:    (payload) => request('/auth/login',    { method: 'POST', body: JSON.stringify(payload) }),
        logout:   ()        => request('/auth/logout',   { method: 'POST' }),
        me:       ()        => request('/auth/me'),
        updateMe: (fields)  => request('/users/me',      { method: 'PATCH', body: JSON.stringify(fields) }),
    };
})();