"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <AuthShell title="Masuk">
      {sp.get("registered") && <p className="mb-3 rounded bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">Akun dibuat. Silakan masuk.</p>}
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true); setError(null);
          const fd = new FormData(e.currentTarget);
          const r = await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirect: false });
          setBusy(false);
          if (r?.ok) { router.push(sp.get("callbackUrl") || "/dashboard"); router.refresh(); }
          else setError("Email atau kata sandi salah.");
        }}
      >
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="input" defaultValue={sp.get("email") ?? ""} /></div>
        <div><label className="label" htmlFor="password">Kata sandi</label><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></div>
        {error && <p className="text-[13px] text-red-700">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Memproses…" : "Masuk"}</button>
      </form>
      <p className="mt-4 text-[13px] text-slate-600">Belum punya akun? <Link className="font-medium text-accent" href="/register">Daftar</Link></p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
