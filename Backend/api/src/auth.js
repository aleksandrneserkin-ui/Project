import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from './db.js';

const router = Router();
const SECRET = process.env.JWT_SECRET;
const COOKIE = 'auth_token';
const MAX_AGE = 7 * 24 * 3600 * 1000; // 7 дней

/* ---------- helpers ---------- */

function setAuthCookie(res, userId) {
  const token = jwt.sign({ uid: userId }, SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Не авторизован' });
  }
}

const USER_FIELDS_SQL = 'id, email, name, about, city, job';

/* ---------- POST /api/auth/register ---------- */

router.post(
  '/register',
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').isLength({ min: 6, max: 128 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }

    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    try {
      const { rows } = await query(
        `INSERT INTO users (email, password_hash, name)
         VALUES ($1, $2, $3)
         RETURNING ${USER_FIELDS_SQL}`,
        [email, hash, name]
      );
      const user = rows[0];
      setAuthCookie(res, user.id);
      res.json({ user });
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Email уже используется' });
      }
      console.error('[register]', e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

/* ---------- POST /api/auth/login ---------- */

router.post(
  '/login',
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').isLength({ min: 1, max: 128 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Некорректные данные' });
    }

    const { email, password } = req.body;

    const { rows } = await query(
      `SELECT id, email, name, about, city, job, password_hash
       FROM users WHERE email = $1`,
      [email]
    );
    const user = rows[0];

    // Один и тот же ответ на «нет юзера» и «неверный пароль» —
    // чтобы нельзя было перебором понять, какие email зарегистрированы.
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    delete user.password_hash;
    setAuthCookie(res, user.id);
    res.json({ user });
  }
);

/* ---------- POST /api/auth/logout ---------- */

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

/* ---------- GET /api/auth/me ---------- */

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT ${USER_FIELDS_SQL} FROM users WHERE id = $1`,
    [req.userId]
  );
  if (!rows[0]) return res.status(401).json({ error: 'Не авторизован' });
  res.json({ user: rows[0] });
});

export default router;