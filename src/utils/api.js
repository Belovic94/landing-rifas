import { clearSession } from "./auth";

const API_BASE = import.meta.env.VITE_API_BASE;

const onUnauthorized = () => {
    clearSession();
    const next = encodeURIComponent(window.location.pathname || "/panel");
    window.location.replace(`/login?next=${next}`);
};

export async function fetchJson(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    onUnauthorized?.();
    return null;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`No se pudo cargar ${path} (${res.status}) ${text}`);
  }

  return res.json();
}