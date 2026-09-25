/**
 * Тестовые данные.
 * При первом запуске создаёт в localStorage список пользователей,
 * который использует страница для проверки логина/пароля.
 *
 * Тестовые учётные данные:
 *   Email:    test@example.com
 *   Пароль:   test123
 */
(function () {
    const USERS_KEY = 'app_users';

    if (!localStorage.getItem(USERS_KEY)) {
        const testUsers = [
            {
                email: 'test@example.com',
                password: 'test123',
                name: 'Тестовый пользователь'
            },
            {
                email: 'demo@example.com',
                password: 'demo123',
                name: 'Demo'
            }
        ];

        localStorage.setItem(USERS_KEY, JSON.stringify(testUsers));
        console.log('[test-data] Тестовые пользователи добавлены в localStorage:');
        console.table(testUsers);
    } else {
        console.log('[test-data] Пользователи уже есть в localStorage, пропускаем.');
    }
})();