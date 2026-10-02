"""
Flask-сервер с авторизацией и лентой.
"""

from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from pathlib import Path
import json
import random

BASE_DIR = Path(__file__).resolve().parent
USERS_FILE = BASE_DIR / "users.json"
FEED_FILE  = BASE_DIR / "feed.json"

FRONTEND_FILES = {
    "index.html", "feed.html", "profile.html", "placeholder.html",
    "styles.css", "theme.js", "script.js", "profile.js", "feed.js", "popular.js",
}

app = Flask(__name__, static_folder=None)
app.secret_key = "dev-secret-change-me-in-production"
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True


# -------------------------- Хранилища --------------------------

def load_users() -> list[dict]:
    if not USERS_FILE.exists():
        return []
    with USERS_FILE.open("r", encoding="utf-8") as f:
        return json.load(f).get("users", [])


def save_users(users: list[dict]) -> None:
    with USERS_FILE.open("w", encoding="utf-8") as f:
        json.dump({"users": users}, f, ensure_ascii=False, indent=2)


def ensure_passwords_hashed(users: list[dict]) -> bool:
    changed = False
    for u in users:
        pw = u.get("password", "")
        if pw and not (pw.startswith("pbkdf2:") or pw.startswith("scrypt:")):
            u["password"] = generate_password_hash(pw)
            changed = True
    if changed:
        save_users(users)
    return changed


def public_user(user: dict) -> dict:
    return {
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
        "about": user.get("about", ""),
        "city": user.get("city", ""),
        "job": user.get("job", ""),
    }


def find_user(users: list[dict], email: str) -> dict | None:
    email = (email or "").lower()
    for u in users:
        if u.get("email", "").lower() == email:
            return u
    return None


def load_feed() -> list[dict]:
    if not FEED_FILE.exists():
        return []
    with FEED_FILE.open("r", encoding="utf-8") as f:
        return json.load(f).get("items", [])


# ------------------------------ API ------------------------------

@app.post("/api/register")
def api_register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify(error="Заполните все поля"), 400
    if len(password) < 6:
        return jsonify(error="Пароль должен быть не короче 6 символов"), 400

    users = load_users()
    if find_user(users, email):
        return jsonify(error="Пользователь с таким email уже существует"), 409

    new_user = {
        "email": email,
        "password": generate_password_hash(password),
        "name": name,
        "role": "user",
        "about": "",
        "city": "",
        "job": "",
    }
    users.append(new_user)
    save_users(users)

    session["user_email"] = email
    return jsonify(user=public_user(new_user)), 201


@app.post("/api/login")
def api_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify(error="Заполните все поля"), 400

    users = load_users()
    if ensure_passwords_hashed(users):
        users = load_users()

    user = find_user(users, email)
    if not user or not check_password_hash(user.get("password", ""), password):
        return jsonify(error="Неверный email или пароль"), 401

    session["user_email"] = user["email"]
    return jsonify(user=public_user(user))


@app.post("/api/logout")
def api_logout():
    session.pop("user_email", None)
    return jsonify(ok=True)


@app.get("/api/me")
def api_me():
    email = session.get("user_email")
    if not email:
        return jsonify(error="Не авторизован"), 401

    users = load_users()
    user = find_user(users, email)
    if not user:
        session.pop("user_email", None)
        return jsonify(error="Не авторизован"), 401

    return jsonify(user=public_user(user))


ALLOWED_PROFILE_FIELDS = {"name", "about", "city", "job"}


@app.put("/api/profile")
def api_update_profile():
    email = session.get("user_email")
    if not email:
        return jsonify(error="Не авторизован"), 401

    data = request.get_json(silent=True) or {}
    users = load_users()
    user = find_user(users, email)
    if not user:
        return jsonify(error="Не авторизован"), 401

    for key, value in data.items():
        if key in ALLOWED_PROFILE_FIELDS:
            user[key] = (value or "").strip()

    save_users(users)
    return jsonify(user=public_user(user))


# --------------------------- Лента ---------------------------

@app.get("/api/feed")
def api_feed():
    """Постраничная выдача ленты. ?offset=0&limit=8"""
    items = load_feed()
    try:
        offset = max(0, int(request.args.get("offset", 0)))
        limit  = max(1, min(50, int(request.args.get("limit", 8))))
    except (TypeError, ValueError):
        return jsonify(error="Некорректные параметры"), 400

    total = len(items)
    chunk = items[offset:offset + limit]
    return jsonify(
        items=chunk,
        total=total,
        offset=offset,
        limit=limit,
        has_more=(offset + limit) < total,
    )


@app.get("/api/feed/popular")
def api_feed_popular():
    """Несколько случайных ячеек ленты. ?limit=4"""
    items = load_feed()
    try:
        limit = max(1, min(20, int(request.args.get("limit", 4))))
    except (TypeError, ValueError):
        return jsonify(error="Некорректные параметры"), 400

    if not items:
        return jsonify(items=[])

    sample = random.sample(items, min(limit, len(items)))
    return jsonify(items=sample)


# ------------------------------ Статика ------------------------------

@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:filename>")
def static_files(filename):
    if filename not in FRONTEND_FILES:
        return jsonify(error="Not found"), 404
    return send_from_directory(BASE_DIR, filename)


if __name__ == "__main__":
    ensure_passwords_hashed(load_users())
    app.run(host="127.0.0.1", port=3000, debug=True)