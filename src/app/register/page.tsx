"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { registerUser, type RegState } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Membuat akun…" : "Buat akun"}</button>;
}

export default function RegisterPage() {
  const [state, action] = useFormState<RegState, FormData>(registerUser, {});
  const router = useRouter();
  useEffect(() => { if (state.ok) router.push(`/login?registered=1&email=${encodeURIComponent(state.email ?? "")}`); }, [state, router]);
  return (
    <AuthShell title="Buat akun">
      <form action={action} className="space-y-3">
        <div><label className="label" htmlFor="name">Nama lengkap</label><input id="name" name="name" required className="input" autoComplete="name" /></div>
        <div><label className="label" htmlFor="email">Email kerja</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
        <div><label className="label" htmlFor="password">Kata sandi (min. 8 karakter)</label><input id="password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" /></div>
        <div><label className="label" htmlFor="orgName">Nama organisasi (opsional)</label><input id="orgName" name="orgName" className="input" placeholder="mis. PT Contoh Power" /></div>
        <label className="flex items-start gap-2 text-[13px] text-slate-700"><input type="checkbox" name="demo" defaultChecked className="mt-0.5 accent-[#0D5C74]" /> Tambahkan organisasi “Demo PLTU” berisi data contoh di semua modul</label>
        <p className="text-xs text-slate-500">Bila Anda diundang ke organisasi, Anda otomatis bergabung setelah mendaftar dengan email yang diundang.</p>
        {state.error && <p className="text-[13px] text-red-700">{state.error}</p>}
        <Submit />
      </form>
      <p className="mt-4 text-[13px] text-slate-600">Sudah punya akun? <Link className="font-medium text-accent" href="/login">Masuk</Link></p>
    </AuthShell>
  );
}
