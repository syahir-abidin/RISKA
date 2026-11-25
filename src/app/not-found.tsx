import Link from "next/link";
export default function NotFound() {
  return <main className="grid min-h-screen place-items-center px-4"><div className="text-center"><p className="eyebrow">404</p><h1 className="h1 mt-1">Halaman tidak ditemukan</h1><p className="mt-2 text-[13px] text-slate-600">Data mungkin milik organisasi lain atau sudah dihapus.</p><Link className="btn mt-4" href="/dashboard">Ke dashboard</Link></div></main>;
}
