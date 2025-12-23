export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function getSession() {
  const token = getToken();
  const user = getUser();

  if (!token || !user) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload?.exp && Date.now() > payload.exp * 1000) {
      clearSession();
      return null;
    }
    return { token, user, payload };
  } catch {
    clearSession();
    return null;
  }
}