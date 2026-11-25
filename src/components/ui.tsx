import clsx from "clsx";
import Link from "next/link";

export function Flash({ m, e }: { m?: string; e?: string }) {
  if (!m && !e) return null;
  return (
    <div role="status" className={clsx("mb-4 rounded border px-3 py-2 text-[13px]", e ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
      {e ?? m}
    </div>
  );
}

export function PageHead({ eyebrow, title, desc, children }: { eyebrow?: string; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="h1">{title}</h1>
        {desc && <p className="mt-1 max-w-3xl text-[13px] text-slate-600">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Tabs({ base, tabs, active }: { base: string; tabs: { key: string; label: string }[]; active: string }) {
  return (
    <nav className="no-print mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Tab">
      {tabs.map((t) => (
        <Link key={t.key} href={`${base}?tab=${t.key}`} className={clsx("whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium", active === t.key ? "border-accent text-accent" : "border-transparent text-slate-600 hover:text-slate-900")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

const STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700", IN_REVIEW: "bg-amber-100 text-amber-800", APPROVED: "bg-emerald-100 text-emerald-800",
  OPEN: "bg-sky-100 text-sky-800", IN_PROGRESS: "bg-indigo-100 text-indigo-800", PENDING_VERIFICATION: "bg-amber-100 text-amber-800", CLOSED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-slate-200 text-slate-700",
};
export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", IN_REVIEW: "In Review", APPROVED: "Approved",
  OPEN: "Open", IN_PROGRESS: "In Progress", PENDING_VERIFICATION: "Pending Verification", CLOSED: "Closed", REJECTED: "Rejected",
};
export function StatusPill({ status }: { status: string }) {
  return <span className={clsx("chip", STATUS_CLS[status] ?? "bg-slate-100")}>{STATUS_LABEL[status] ?? status}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {children && <div className="mt-2 text-[13px] text-slate-600">{children}</div>}
    </div>
  );
}

export const fmtDate = (d?: Date | string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "–");
export const actionNo = (n: number) => `A-${String(n).padStart(4, "0")}`;
