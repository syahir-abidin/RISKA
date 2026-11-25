import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studies, actions } from "@/db/schema";
import { getCtx } from "@/lib/context";
import { riskItems, heatCounts } from "@/lib/queries";
import { MODULES, slugOf } from "@/lib/grids";
import { Heatmap, RiskBadge } from "@/components/risk";
import { PageHead, StatusPill, actionNo, fmtDate } from "@/components/ui";
import type { ModuleKey } from "@/db/schema";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const ctx = await getCtx();
  const [st, acts, items] = await Promise.all([
    db.select().from(studies).where(eq(studies.orgId, ctx.orgId)),
    db.select().from(actions).where(eq(actions.orgId, ctx.orgId)),
    riskItems(ctx.orgId, ctx.cfg),
  ]);
  const now = Date.now();
  const openActs = acts.filter((a) => a.status !== "CLOSED" && a.status !== "REJECTED");
  const overdue = openActs.filter((a) => a.dueDate && a.dueDate.getTime() < now);
  const closed = acts.filter((a) => a.status === "CLOSED").length;
  const high = items.filter((i) => i.zone === "HIGH" || i.zone === "EXTREME").sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const byOwner = new Map<string, { open: number; overdue: number }>();
  for (const a of openActs) {
    const k = a.owner || "(belum ditentukan)";
    const v = byOwner.get(k) ?? { open: 0, overdue: 0 };
    v.open++; if (a.dueDate && a.dueDate.getTime() < now) v.overdue++;
    byOwner.set(k, v);
  }
  // Penutupan aksi 6 bulan terakhir
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return d; });
  const closedPerMonth = months.map((m) => acts.filter((a) => a.closedAt && a.closedAt.getFullYear() === m.getFullYear() && a.closedAt.getMonth() === m.getMonth()).length);
  const maxC = Math.max(1, ...closedPerMonth);

  const tiles = [
    { label: "Studi", value: st.length, sub: `${st.filter((s) => s.status === "APPROVED").length} approved` },
    { label: "Risiko High/Extreme", value: high.length, sub: `dari ${items.filter((i) => i.score).length} risiko bernilai`, warn: high.length > 0 },
    { label: "Aksi terbuka", value: openActs.length, sub: `${overdue.length} lewat tenggat`, warn: overdue.length > 0 },
    { label: "Tingkat penutupan", value: acts.length ? `${Math.round((closed / acts.length) * 100)}%` : "–", sub: `${closed} dari ${acts.length} aksi` },
  ];

  return (
    <>
      <PageHead eyebrow={ctx.orgName} title="Dashboard risiko" desc="Ringkasan seluruh studi dan rekomendasi di organisasi aktif. Risiko memakai nilai residual bila tersedia, selain itu nilai awal." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card card-b">
            <div className="eyebrow">{t.label}</div>
            <div className={`num mt-1 text-2xl font-semibold ${t.warn ? "text-risk-high" : ""}`}>{t.value}</div>
            <div className="text-xs text-slate-500">{t.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="card">
          <div className="card-h"><h2 className="h2">Peta risiko semua modul</h2><Link className="text-xs text-accent" href="/risk-register">Risk register →</Link></div>
          <div className="card-b"><Heatmap counts={heatCounts(items)} cfg={ctx.cfg} /></div>
        </section>
        <section className="card min-w-0">
          <div className="card-h"><h2 className="h2">Studi per modul</h2></div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Modul</th><th>Standar</th><th className="text-right">Draft</th><th className="text-right">In Review</th><th className="text-right">Approved</th></tr></thead>
              <tbody>
                {(Object.keys(MODULES) as ModuleKey[]).map((m) => (
                  <tr key={m}>
                    <td><Link className="font-medium text-accent" href={`/m/${slugOf(m)}`}>{MODULES[m].label}</Link></td>
                    <td className="text-xs text-slate-500">{MODULES[m].standard}</td>
                    {(["DRAFT", "IN_REVIEW", "APPROVED"] as const).map((s) => <td key={s} className="num text-right">{st.filter((x) => x.module === m && x.status === s).length}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="card min-w-0">
          <div className="card-h"><h2 className="h2">10 risiko tertinggi</h2></div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Modul</th><th>Studi</th><th>Referensi</th><th>Risiko</th></tr></thead>
              <tbody>
                {high.slice(0, 10).map((i, k) => (
                  <tr key={k}>
                    <td className="text-xs">{i.module}</td>
                    <td><Link className="text-accent" href={`/m/${slugOf(i.module)}/${i.studyId}`}>{i.studyCode}</Link></td>
                    <td className="max-w-[320px]"><div className="truncate" title={i.description}>{i.ref}</div></td>
                    <td><RiskBadge s={i.s} l={i.l} cfg={ctx.cfg} /> <span className="text-[11px] text-slate-500">{i.basis}</span></td>
                  </tr>
                ))}
                {high.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Tidak ada risiko High/Extreme.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card min-w-0">
          <div className="card-h"><h2 className="h2">Aksi terbuka per pemilik</h2><Link className="text-xs text-accent" href="/actions">Semua aksi →</Link></div>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Pemilik</th><th className="text-right">Terbuka</th><th className="text-right">Lewat tenggat</th></tr></thead>
              <tbody>
                {[...byOwner.entries()].sort((a, b) => b[1].overdue - a[1].overdue || b[1].open - a[1].open).map(([o, v]) => (
                  <tr key={o}><td>{o}</td><td className="num text-right">{v.open}</td><td className={`num text-right ${v.overdue ? "font-semibold text-risk-ext" : ""}`}>{v.overdue}</td></tr>
                ))}
                {byOwner.size === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-500">Tidak ada aksi terbuka.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 p-4">
            <div className="eyebrow mb-2">Aksi ditutup per bulan</div>
            <div className="flex h-24 items-end gap-2">
              {closedPerMonth.map((c, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="num text-[11px] text-slate-600">{c}</span>
                  <div className="w-full rounded-t bg-accent" style={{ height: `${(c / maxC) * 60}px`, minHeight: 2, opacity: c ? 1 : 0.25 }} />
                  <span className="text-[10px] text-slate-500">{months[i].toLocaleDateString("id-ID", { month: "short" })}</span>
                </div>
              ))}
            </div>
          </div>
          {overdue.length > 0 && (
            <div className="border-t border-slate-200 p-4 text-[13px]">
              <div className="eyebrow mb-2">Lewat tenggat</div>
              <ul className="space-y-1">
                {overdue.slice(0, 5).map((a) => <li key={a.id}><span className="font-mono text-xs">{actionNo(a.number)}</span> {a.description.slice(0, 90)} <span className="text-xs text-risk-ext">({fmtDate(a.dueDate)})</span> <StatusPill status={a.status} /></li>)}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
