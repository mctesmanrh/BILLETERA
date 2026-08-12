import { LogOut } from "lucide-react";
import type { AuthUser } from "../types";

interface UserMenuProps {
  user: AuthUser;
  csrfToken: string;
}

const CACHE_KEYS = [
  "monthlyBudget",
  "expenses",
  "deletedExpenses",
  "activeMonth",
  "monthlyReports",
];

export default function UserMenu({ user, csrfToken }: UserMenuProps) {
  const localBypass = user.id === "local-development";
  const label = user.name || user.email || "Cuenta de Google";

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-xs">
      {user.image ? (
        <img
          src={user.image}
          alt=""
          referrerPolicy="no-referrer"
          className="h-7 w-7 rounded-full"
        />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
          {label.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="hidden max-w-40 sm:block">
        <p className="truncate text-[11px] font-bold text-slate-700">{label}</p>
        <p className="truncate text-[9px] text-slate-400">
          {localBypass ? "Acceso local" : user.email}
        </p>
      </div>
      {!localBypass && (
        <form
          method="post"
          action="/api/auth/signout"
          onSubmit={() => CACHE_KEYS.forEach((key) => localStorage.removeItem(key))}
        >
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="callbackUrl" value="/" />
          <button
            type="submit"
            disabled={!csrfToken}
            title="Cerrar sesión"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
