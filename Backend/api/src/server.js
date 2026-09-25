import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './auth.js';
import userRoutes from './users.js';

const app = express();

// За nginx — доверяем одному хопу, иначе rate-limit будет видеть один IP
app.set('trust proxy', 1);

// Безопасные HTTP-заголовки
app.use(helmet());

// Ограничиваем размер тела — защита от раздувания
app.use(express.json({ limit: '16kb' }));
app.use(cookieParser());

// Анти-брутфорс на /api
app.use('/api', rateLimit({
  windowMs: 60_000,
  max: 120,               // 120 запросов в минуту на IP
  standardHeaders: true,
  legacyHeaders: false,
}));

// Маршруты
app.use('/api/auth',  authRoutes);
app.use('/api/users', userRoutes);

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// 404 для неизвестных /api/*
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Централизованный обработчик ошибок
app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Ошибка сервера' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`[api] listening on :${PORT}`));