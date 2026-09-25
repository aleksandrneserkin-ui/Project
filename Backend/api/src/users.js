import { Router } from 'express';
import { query } from './db.js';
import { requireAuth } from './auth.js';

const router = Router();

/**
 * БЕЛЫЙ СПИСОК полей, которые пользователь может редактировать.
 * Колонка в SQL собирается ТОЛЬКО из этих ключей —
 * никакого пользовательского ввода в SQL-строку не попадает.
 */
const ALLOWED_FIELDS = {
  name:  100,
  about: 1000,
  city:  100,
  job:   100,
};

const USER_FIELDS_SQL = 'id, email, name, about, city, job';

/* ---------- PATCH /api/users/me ---------- */

router.patch('/me', requireAuth, async (req, res) => {
  // 1. Отбираем и валидируем поля из белого списка
  const updates = {};
  for (const [key, max] of Object.entries(ALLOWED_FIELDS)) {
    if (typeof req.body[key] === 'string') {
      updates[key] = req.body[key].trim().slice(0, max);
    }
  }

  const keys = Object.keys(updates);
  if (keys.length === 0) {
    return res.status(400).json({ error: 'Нет полей для обновления' });
  }

  // 2. Динамический SET — только из ключей белого списка
  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
  const values = keys.map((k) => updates[k]);
  values.push(req.userId);
  const idPlaceholder = `$${values.length}`;

  // 3. Значения — параметры, имена колонок — из ALLOWED_FIELDS.
  //    SQL-инъекция невозможна by design.
  const sql = `
    UPDATE users
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = ${idPlaceholder}
    RETURNING ${USER_FIELDS_SQL}
  `;

  try {
    const { rows } = await query(sql, values);
    if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ user: rows[0] });
  } catch (e) {
    console.error('[users.patch]', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;