"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV: { href: string; label: string; group?: string }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/m/hazop", label: "HAZOP", group: "Studi" },
  { href: "/m/lopa", label: "LOPA" },
  { href: "/m/fra", label: "FRA" },
  { href: "/m/hiradc", label: "HIRADC" },
  { href: "/m/fmea", label: "FMEA" },
  { href: "/m/coso", label: "COSO ERM" },
  { href: "/risk-register", label: "Risk Register", group: "Register" },
  { href: "/actions", label: "Rekomendasi" },
  { href: "/settings", label: "Pengaturan", group: "Organisasi" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-0.5 text-[13px]">
      {NAV.map((n) => (
        <div key={n.href}>
          {n.group && <div className="eyebrow mb-1 mt-4 px-2">{n.group}</div>}
          <Link href={n.href} className={clsx("block rounded px-2 py-1.5", path === n.href || path.startsWith(n.href + "/") ? "bg-accent-soft font-semibold text-accent" : "text-slate-700 hover:bg-slate-100")}>
            {n.label}
          </Link>
        </div>
      ))}
    </nav>
  );
}
