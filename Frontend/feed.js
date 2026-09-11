/**
 * Лента — бесконечный скролл.
 *
 * Логика:
 *   1. При загрузке рисуем 12 карточек (3 ряда по 4).
 *   2. Как только пользователь доскроллит почти до низа —
 *      добавляем ещё одну "порцию" (4 карточки = 1 ряд).
 *   3. Ничего не сохраняем, ничего не грузим с сервера —
 *      это временная заглушка для демонстрации работы области.
 */
(function () {
    const grid = document.getElementById('feedGrid');
    const sentinel = document.getElementById('feedSentinel');
    const loader = document.getElementById('feedLoader');

    const INITIAL_COUNT = 12;      // стартовое количество карточек
    const BATCH_SIZE = 4;          // сколько докидывать за раз (один ряд)

    let counter = 0;

    /* ---------- Создание карточки ---------- */

    function createCard() {
        counter += 1;

        const card = document.createElement('article');
        card.className = 'feed-card';

        card.innerHTML =
            '<div class="feed-card-top">' +
                '<span class="feed-card-index">#' + String(counter).padStart(2, '0') + '</span>' +
                '<span class="feed-card-dot"></span>' +
            '</div>' +
            '<div class="feed-card-body">' +
                '<div class="feed-card-line"></div>' +
                '<div class="feed-card-line short"></div>' +
            '</div>' +
            '<div class="feed-card-footer">' +
                '<span class="feed-card-tag">материал</span>' +
            '</div>';

        return card;
    }

    /* ---------- Добавление партии карточек ---------- */

    function appendBatch(count) {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            fragment.appendChild(createCard());
        }
        grid.appendChild(fragment);
    }

    /* ---------- Первичная отрисовка ---------- */

    appendBatch(INITIAL_COUNT);

    /* ---------- Бесконечный скролл ---------- */

    let isLoading = false;

    function loadMore() {
        if (isLoading) return;
        isLoading = true;

        loader.hidden = false;

        // Небольшая задержка, чтобы имитировать "подгрузку"
        setTimeout(function () {
            appendBatch(BATCH_SIZE);
            loader.hidden = true;
            isLoading = false;
        }, 300);
    }

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                loadMore();
            }
        });
    }, {
        rootMargin: '200px 0px',
        threshold: 0
    });

    observer.observe(sentinel);

    console.log('[feed] Лента запущена. Стартовых карточек:', INITIAL_COUNT);
})();