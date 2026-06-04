#!/usr/bin/env python3
"""
Crea o actualiza un usuario de prueba en Supabase (Auth Admin + perfil).
Uso:
  python3 scripts/seed-test-user.py --email gatestaff@vitafelix.local --role GATE_STAFF
Requiere en el entorno: SUPABASE_URL, SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_KEY).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

COMPANY_DEMO = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
DEFAULT_PASSWORD = "ChangeMe123!"


def load_dotenv(path: str = ".env") -> None:
    """Carga .env sin depender de variables del shell (evita claves obsoletas)."""
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            k, v = key.strip(), val.strip()
            # .env manda sobre variables del shell (claves legacy rotas).
            if k.startswith("SUPABASE_") or k.startswith("NUXT_"):
                os.environ[k] = v
            else:
                os.environ.setdefault(k, v)


def env(name: str, *aliases: str) -> str:
    for key in (name, *aliases):
        val = os.environ.get(key, "").strip()
        if val:
            return val
    print(f"Falta {name} (o alias {', '.join(aliases)}) en .env", file=sys.stderr)
    sys.exit(1)


def call(method: str, url: str, body: dict | None, headers: dict) -> tuple[int, dict | list | str]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw) if raw else {"message": e.reason}
        except json.JSONDecodeError:
            payload = raw
        return e.code, payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Sembrar usuario de prueba en Supabase")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--role", required=True, choices=[
        "SUPER_ADMIN", "COMPANY_ADMIN", "EVENT_MANAGER", "GATE_STAFF",
    ])
    parser.add_argument("--company-id", default=COMPANY_DEMO)
    parser.add_argument("--full-name", default="Usuario de prueba")
    args = parser.parse_args()

    load_dotenv()
    base = env("SUPABASE_URL").rstrip("/")
    service = env("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_KEY")
    # Con claves nuevas (sb_secret_*), Auth Admin exige service role en apikey y Bearer.
    auth_h = {
        "Authorization": f"Bearer {service}",
        "apikey": service,
        "Content-Type": "application/json",
    }
    rest_h = {
        "Authorization": f"Bearer {service}",
        "apikey": service,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    company_id = None if args.role == "SUPER_ADMIN" else args.company_id

    # Buscar usuario existente por email (list users — paginación simple).
    status, listed = call("GET", f"{base}/auth/v1/admin/users?per_page=200", None, auth_h)
    user_id = None
    if status == 200 and isinstance(listed, dict):
        for u in listed.get("users", []):
            if u.get("email") == args.email:
                user_id = u["id"]
                break

    if user_id:
        print(f"Usuario existente: {user_id}")
        status, updated = call(
            "PUT",
            f"{base}/auth/v1/admin/users/{user_id}",
            {"password": args.password, "email_confirm": True},
            auth_h,
        )
        if status not in (200, 201):
            print("No se pudo actualizar contraseña:", updated, file=sys.stderr)
            sys.exit(1)
    else:
        status, created = call(
            "POST",
            f"{base}/auth/v1/admin/users",
            {
                "email": args.email,
                "password": args.password,
                "email_confirm": True,
                "user_metadata": {"full_name": args.full_name},
            },
            auth_h,
        )
        if status not in (200, 201):
            print("No se pudo crear usuario:", created, file=sys.stderr)
            sys.exit(1)
        user_id = created.get("id") if isinstance(created, dict) else None
        if not user_id:
            print("Respuesta sin id:", created, file=sys.stderr)
            sys.exit(1)
        print(f"Usuario creado: {user_id}")

    profile = {
        "id": user_id,
        "company_id": company_id,
        "role": args.role,
        "full_name": args.full_name,
    }
    status, upserted = call(
        "POST",
        f"{base}/rest/v1/profiles",
        profile,
        {**rest_h, "Prefer": "resolution=merge-duplicates,return=representation"},
    )
    if status not in (200, 201):
        # Fallback: PATCH por id
        status2, patched = call(
            "PATCH",
            f"{base}/rest/v1/profiles?id=eq.{user_id}",
            {k: v for k, v in profile.items() if k != "id"},
            rest_h,
        )
        if status2 not in (200, 204):
            print("No se pudo upsertar perfil:", upserted, patched, file=sys.stderr)
            sys.exit(1)

    print(f"Perfil OK: role={args.role}, company_id={company_id}")
    print(f"Login: {args.email} / {args.password}")


if __name__ == "__main__":
    main()
