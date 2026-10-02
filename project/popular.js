/**
 * Блок «Популярное» на главной.
 * Показывается только гостям (CSS скрывает его при body.authenticated).
 * Тянет несколько случайных ячеек из /api/feed/popular.
 */
(function () {
    const grid = document.getElementById('popularGrid');
    if (!grid) return;

    function createCard(item) {
        const card = document.createElement('article');
        card.className = 'popular-card';

        card.innerHTML =
            '<div class="popular-card-top">' +
                '<span class="popular-card-tag"></span>' +
                '<span class="popular-card-score"></span>' +
            '</div>' +
            '<h3 class="popular-card-title"></h3>' +
            '<p class="popular-card-text"></p>';

        card.querySelector('.popular-card-tag').textContent   = item.tag || 'материал';
        card.querySelector('.popular-card-score').textContent = '★ ' + (item.popularity || 0);
        card.querySelector('.popular-card-title').textContent = item.title || '';
        card.querySelector('.popular-card-text').textContent  = item.description || '';

        return card;
    }

    fetch('/api/feed/popular?limit=4', { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((data) => {
            const fragment = document.createDocumentFragment();
            (data.items || []).forEach((item) => fragment.appendChild(createCard(item)));
            grid.appendChild(fragment);
        })
        .catch((e) => console.warn('[popular] error:', e));
})();