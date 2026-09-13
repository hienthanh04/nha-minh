"use client";

import { useActionState } from "react";
import { login, logout } from "@/app/login/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return <form action={action} className="space-y-5" aria-busy={pending}>
    <div><label htmlFor="email" className="mb-2 block font-semibold">Email</label>
      <input id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
        required maxLength={320} className="auth-input" readOnly={pending} /></div>
    <div><label htmlFor="password" className="mb-2 block font-semibold">Mật khẩu</label>
      <input id="password" name="password" type="password" autoComplete="current-password"
        required maxLength={4096} className="auth-input" readOnly={pending} /></div>
    {state.error && <p role="alert" className="text-sm text-red-800">{state.error}</p>}
    <button type="submit" className="button button-primary w-full" disabled={pending}>
      {pending ? "Đang đăng nhập…" : "Đăng nhập"}
    </button>
  </form>;
}

export function LogoutForm() {
  const [state, action, pending] = useActionState(logout, { error: "" });
  return <form action={action} aria-busy={pending}>
    {state.error && <p role="alert" className="mb-3 text-sm text-red-800">{state.error}</p>}
    <button className="button button-secondary w-full" type="submit" disabled={pending}>
      {pending ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
  </form>;
}

