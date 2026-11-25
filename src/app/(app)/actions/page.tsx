import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { actions, studies, type ActionStatus } from "@/db/schema";
import { getCtx } from "@/lib/context";
import { can } from "@/lib/permissions";
import { slugOf } from "@/lib/grids";
import { ActionRow } from "@/components/ActionRow";
import { PageHead, Empty } from "@/components/ui";

export const metadata = { title: "Rekomendasi" };
const FILTERS: { key: string; label: string }[] = [{ key: "open", label: "Terbuka" }, { key: "overdue", label: "Lewat tenggat" }, { key: "CLOSED", label: "Closed" }, { key: "REJECTED", label: "Rejected" }, { key: "all", label: "Semua" }];

export default async function Actions({ searchParams }: { searchParams: { f?: string } }) {
  const ctx = await getCtx();
  const f = searchParams.f ?? "open";
  const all = await db.select({ a: actions, s: studies }).from(actions).leftJoin(studies, eq(actions.studyId, studies.id)).where(and(eq(actions.orgId, ctx.orgId))).orderBy(desc(actions.number));
  const now = Date.now();
  const isOpen = (s: ActionStatus) => s !== "CLOSED" && s !== "REJECTED";
  const list = all.filter(({ a }) => f === "all" || (f === "open" && isOpen(a.status)) || (f === "overdue" && isOpen(a.status) && a.dueDate && a.dueDate.getTime() < now) || a.status === f);
  const editable = can(ctx.role, "manageActions");
  return (
    <>
      <PageHead eyebrow="Action tracker" title="Rekomendasi" desc="Semua rekomendasi dari HAZOP, LOPA, FRA, HIRADC, FMEA, dan COSO. Status Closed memerlukan bukti dan verifikator; Rejected memerlukan justifikasi teknis tertulis." />
      <nav className="mb-3 flex flex-wrap gap-1" aria-label="Filter status">
        {FILTERS.map((x) => <Link key={x.key} href={`/actions?f=${x.key}`} className={`btn btn-sm ${f === x.key ? "btn-primary" : ""}`}>{x.label}</Link>)}
        <span className="ml-auto self-center text-xs text-slate-500">{list.length} aksi</span>
      </nav>
      {list.length === 0 ? <Empty title="Tidak ada aksi pada filter ini">Aksi dibuat dari tombol “→ Aksi” pada baris worksheet yang memiliki rekomendasi.</Empty> : (
        <div className="card">
          <div className="hidden gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 lg:grid lg:grid-cols-[90px_minmax(0,2.2fr)_minmax(0,1fr)_140px_110px_170px]">
            <span>No.</span><span>Deskripsi & sumber</span><span>Pemilik, bukti, verifikator</span><span>Tenggat & prioritas</span><span>Status</span><span />
          </div>
          {list.map(({ a, s }) => (
            <ActionRow key={a.id + a.updatedAt.getTime()} editable={editable} a={{
              id: a.id, number: a.number, module: a.module, sourceLabel: a.sourceLabel, description: a.description, owner: a.owner,
              dueDate: a.dueDate ? a.dueDate.toISOString().slice(0, 10) : "", priority: a.priority, status: a.status, evidence: a.evidence,
              verifier: a.verifier, justification: a.justification, overdue: isOpen(a.status) && !!a.dueDate && a.dueDate.getTime() < now,
              studyHref: s ? `/m/${slugOf(s.module)}/${s.id}?tab=worksheet` : null,
            }} />
          ))}
        </div>
      )}
    </>
  );
}
