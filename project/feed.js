/**
 * Лента — бесконечный скролл поверх /api/feed.
 *
 * Логика:
 *   1. При загрузке страницы тянем первую порцию (BATCH_SIZE штук).
 *   2. Слушаем scroll + resize: как только пользователь приблизился
 *      к низу документа на SCROLL_THRESHOLD пикселей — тянем ещё.
 *   3. Если после подгрузки пользователь всё ещё у низа (например,
 *      карточек мало и они не заполнили экран) — грузим снова,
 *      пока не появится скролл или не закончатся данные.
 */
(function () {
    const grid     = document.getElementById('feedGrid');
    const loader   = document.getElementById('feedLoader');
    if (!grid) return;

    const BATCH_SIZE       = 8;   // сколько карточек за один запрос
    const SCROLL_THRESHOLD = 300; // пикселей до низа, когда начинаем грузить

    let offset    = 0;
    let hasMore   = true;
    let isLoading = false;

    /* ---------- Создание карточки ---------- */

    function createCard(item) {
        const card = document.createElement('article');
        card.className = 'feed-card';

        const num = String(item.id).padStart(2, '0');

        card.innerHTML =
            '<div class="feed-card-top">' +
                '<span class="feed-card-index">#' + num + '</span>' +
                '<span class="feed-card-dot"></span>' +
            '</div>' +
            '<h3 class="feed-card-title"></h3>' +
            '<p class="feed-card-text"></p>' +
            '<div class="feed-card-footer">' +
                '<span class="feed-card-tag"></span>' +
                '<span class="feed-card-author"></span>' +
            '</div>';

        card.querySelector('.feed-card-title').textContent  = item.title || '';
        card.querySelector('.feed-card-text').textContent   = item.description || '';
        card.querySelector('.feed-card-tag').textContent    = item.tag || 'материал';
        card.querySelector('.feed-card-author').textContent = item.author || '';

        return card;
    }

    /* ---------- Загрузка одной порции ---------- */

    async function loadBatch() {
        if (isLoading || !hasMore) return;
        isLoading = true;
        if (loader) loader.hidden = false;

        try {
            const res = await fetch(
                `/api/feed?offset=${offset}&limit=${BATCH_SIZE}`,
                { credentials: 'same-origin' }
            );
            if (!res.ok) throw new Error('HTTP ' + res.status);

            const data = await res.json();
            const items = data.items || [];

            const fragment = document.createDocumentFragment();
            items.forEach((item) => fragment.appendChild(createCard(item)));
            grid.appendChild(fragment);

            offset  += items.length;
            hasMore  = !!data.has_more;

            // если пришло меньше, чем просили — точно больше ничего нет
            if (items.length < BATCH_SIZE) hasMore = false;

        } catch (e) {
            console.warn('[feed] load error:', e);
            hasMore = false; // чтобы не долбить сервер бесконечно
        } finally {
            if (loader) loader.hidden = true;
            isLoading = false;
        }
    }

    /* ---------- Проверка: не пора ли грузить ещё ---------- */

    function nearBottom() {
        return (window.innerHeight + window.scrollY)
            >= (document.documentElement.scrollHeight - SCROLL_THRESHOLD);
    }

    async function tryLoadMore() {
        if (!hasMore || isLoading) return;

        // Пока страница короткая (нет вертикального скролла) — грузим,
        // даже если пользователь не скроллил. Так экран гарантированно
        // заполнится карточками.
        while (hasMore && !isLoading && (nearBottom() || !hasScroll())) {
            await loadBatch();
        }
    }

    function hasScroll() {
        return document.documentElement.scrollHeight > window.innerHeight + 20;
    }

    /* ---------- Слушатели ---------- */

    let ticking = false;
    function onScrollOrResize() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            ticking = false;
            if (nearBottom()) tryLoadMore();
        });
    }

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    /* ---------- Старт ---------- */

    // Первая порция + автодогрузка до появления скролла/конца данных
    (async function init() {
        await tryLoadMore();
    })();

    console.log('[feed] Лента запущена.');
})();