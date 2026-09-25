-- pgcrypto даёт crypt() + gen_salt('bf') — совместимо с bcrypt-форматом $2a$
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT '',
    about         TEXT NOT NULL DEFAULT '',
    city          TEXT NOT NULL DEFAULT '',
    job           TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Тестовые пользователи. Пароли хэшируются прямо в СУБД (bcrypt, cost=10).
-- Открытых паролей в БД нет.
INSERT INTO users (email, password_hash, name, about, city, job) VALUES
    ('test@example.com',
     crypt('test123', gen_salt('bf', 10)),
     'Тестовый пользователь',
     'Привет! Это тестовый аккаунт.',
     'Москва',
     'Разработчик'),
    ('demo@example.com',
     crypt('demo123', gen_salt('bf', 10)),
     'Demo',
     '',
     '',
     '')
ON CONFLICT (email) DO NOTHING;