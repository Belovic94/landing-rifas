import { useMemo, useState } from "preact/hooks";
import {
  LockClosedIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { Footer } from "./Footer";
import { Header } from "./Header";

const API_BASE = import.meta.env.VITE_API_BASE;

function cls(...xs) {
  return xs.filter(Boolean).join(" ");
}

export function LoginPage() {
  const next = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("next") || "/panel.html";
  }, []);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null);

    if (!username.trim() || !password) {
      setErr("Completá usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Credenciales inválidas.");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user || {}));

      window.location.replace(next);
    } catch (e2) {
      setErr(e2?.message || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="min-h-screen flex flex-col">
      <Header variant="withoutImage"/>
			<main className="flex-1 bg-fame-green/10 px-6 py-12">
				<div class="w-full max-w-md mx-auto 	">
					<div class="rounded-3xl border border-fame-black/10 bg-white shadow-sm overflow-hidden">
						<div class="px-6 pt-7 pb-5 border-b border-fame-black/10">
							<div class="flex items-center gap-3">
								<div class="h-12 w-12 rounded-2xl bg-fame-primary/12 text-fame-green-dark flex items-center justify-center ring-1 ring-fame-primary/20">
									<LockClosedIcon class="h-6 w-6" />
								</div>
								<div class="min-w-0">
									<div class="text-xl font-extrabold text-fame-black tracking-tight">
										Panel FAME
									</div>
									<div class="text-sm text-fame-black/60">
										Ingresá con tu usuario y contraseña
									</div>
								</div>
							</div>
						</div>

						<form onSubmit={onSubmit} class="px-6 py-6 space-y-4">
							<div>
								<label class="block text-xs font-semibold text-fame-black/70 mb-2">
									Usuario
								</label>
								<div class="relative">
									<span class="absolute inset-y-0 left-3 flex items-center text-fame-black/40">
										<UserIcon class="h-5 w-5" />
									</span>
									<input
										class={cls(
											"w-full rounded-2xl border bg-white px-10 py-3 text-sm",
											"border-fame-black/15 focus:border-fame-primary/40 focus:outline-none focus:ring-4 focus:ring-fame-primary/10"
										)}
										value={username}
										onInput={(e) => setUsername(e.target.value)}
										placeholder="admin"
										autoComplete="username"
										disabled={loading}
									/>
								</div>
							</div>

							<div>
								<label class="block text-xs font-semibold text-fame-black/70 mb-2">
									Contraseña
								</label>
								<div class="relative">
									<span class="absolute inset-y-0 left-3 flex items-center text-fame-black/40">
										<LockClosedIcon class="h-5 w-5" />
									</span>

									<input
										class={cls(
											"w-full rounded-2xl border bg-white px-10 py-3 text-sm pr-12",
											"border-fame-black/15 focus:border-fame-primary/40 focus:outline-none focus:ring-4 focus:ring-fame-primary/10"
										)}
										type={show ? "text" : "password"}
										value={password}
										onInput={(e) => setPassword(e.target.value)}
										placeholder="••••••••"
										autoComplete="current-password"
										disabled={loading}
									/>

									<button
										type="button"
										onClick={() => setShow((s) => !s)}
										class="absolute inset-y-0 right-2 px-3 flex items-center text-fame-black/50 hover:text-fame-black"
										disabled={loading}
									>
										{show ? <EyeSlashIcon class="h-5 w-5" /> : <EyeIcon class="h-5 w-5" />}
									</button>
								</div>
							</div>

							{err && (
								<div class="rounded-2xl border border-fame-danger/30 bg-fame-danger/10 px-4 py-3 text-sm text-fame-black">
									<span class="font-extrabold">Error:</span> {err}
								</div>
							)}

							<button
								type="submit"
								disabled={loading}
								class={cls(
									"w-full rounded-2xl px-4 py-3 font-extrabold text-sm transition",
									loading
										? "bg-fame-black/10 text-fame-black/50 cursor-not-allowed"
										: "bg-fame-primary text-white hover:opacity-95 active:opacity-90"
								)}
							>
								{loading ? "Ingresando…" : "Ingresar"}
							</button>
						</form>
					</div>
				</div>
			</main>
			<Footer/>
    </div>
  );
}
