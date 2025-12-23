import { useEffect, useMemo, useRef, useState } from "preact/hooks";

export function SelectAutocomplete({
  options,
  value,
  onChange,
  placeholder = "Ej: unUsuario@...",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value ?? "");
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  useEffect(() => {
    function onDocDown(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    const base = (options ?? []).filter(Boolean);

    if (!q) return base.slice(0, 12);
    return base
      .filter((em) => em.toLowerCase().includes(q))
      .slice(0, 12);
  }, [options, query]);

  const pick = (email) => {
    setQuery(email);
    onChange(email);
    setOpen(false);
    inputRef.current?.blur?.();
  };

  const clear = () => {
    setQuery("");
    onChange("");
    setOpen(false);
    inputRef.current?.focus?.();
  };

  return (
    <div ref={rootRef} class="relative">
      <div class="flex items-center gap-2">
        <div class="flex-1 relative">
          <input
            ref={inputRef}
            value={query}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onInput={(e) => {
              const v = e.currentTarget.value;
              setQuery(v);
              onChange(v);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            class="w-full rounded-xl border border-fame-black/10 bg-white px-3 py-2 text-sm text-fame-black placeholder:text-fame-black/40 focus:outline-none focus:ring-2 focus:ring-fame-black/10"
          />

          {!!query && (
            <button
              type="button"
              onClick={clear}
              class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-extrabold text-fame-black/50 hover:bg-fame-black/5"
              aria-label="Limpiar email"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          class="rounded-xl border border-fame-black/10 bg-white px-3 py-2 text-sm font-extrabold text-fame-black/70 hover:bg-fame-black/5"
          aria-label="Abrir opciones"
        >
          ▾
        </button>
      </div>

      {open && (
        <div class="absolute left-0 right-0 mt-2 rounded-2xl border border-fame-black/10 bg-white shadow-lg overflow-hidden z-20">
          {filtered.length === 0 ? (
            <div class="px-3 py-2 text-sm text-fame-black/60">
              Sin resultados
            </div>
          ) : (
            <div class="max-h-56 overflow-y-auto">
              {filtered.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => pick(em)}
                  class="w-full text-left px-3 py-2 text-sm hover:bg-fame-black/5 transition"
                >
                  <span class="font-semibold text-fame-black">{em}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
