import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import type { AuthSession, AuthUser } from "../types";

interface AuthGateProps {
  children: (auth: { user: AuthUser; csrfToken: string }) => ReactNode;
}

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin" });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || "No fue posible comprobar la sesión.");
  }
  return body;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<AuthSession | null | undefined>();
  const [csrfToken, setCsrfToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadJson<AuthSession | null>("/api/session")
      .then(async (currentSession) => {
        if (!active) return;
        setSession(currentSession);

        const isLocalBypass = currentSession?.user?.id === "local-development";
        if (!isLocalBypass) {
          const csrf = await loadJson<{ csrfToken: string }>("/api/auth/csrf");
          if (active) setCsrfToken(csrf.csrfToken);
        }
      })
      .catch((cause: Error) => {
        if (!active) return;
        setError(cause.message);
        setSession(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Comprobando tu sesión segura…
        </div>
      </div>
    );
  }

  if (session?.user) {
    return <>{children({ user: session.user, csrfToken })}</>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.06] p-7 sm:p-9 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
          Tu Billetera
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Tus gastos siguen siendo privados</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          La dirección de la aplicación es pública, pero el presupuesto y los movimientos solo se muestran después de iniciar sesión con una cuenta de Google autorizada.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100" role="alert">
            {error}
          </div>
        )}

        <form method="post" action="/api/auth/signin/google" className="mt-8">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="callbackUrl" value="/" />
          <button
            type="submit"
            disabled={!csrfToken}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base font-black text-blue-600">G</span>
            Continuar con Google
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">
          Se solicita únicamente tu identidad básica. Las credenciales de Google nunca llegan al navegador de la aplicación.
        </p>
      </section>
    </main>
  );
}
