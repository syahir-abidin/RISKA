import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { getCtx } from "@/lib/context";
import { riskItems } from "@/lib/queries";
import { slugOf } from "@/lib/grids";
import { RiskBadge } from "@/components/risk";
import { PageHead, Empty } from "@/components/ui";

export const metadata = { title: "Risk Register" };

export default async function RiskRegister({ searchParams }: { searchParams: { module?: string; zone?: string; site?: string } }) {
  const ctx = await getCtx();
  const siteList = await db.select().from(sites).where(eq(sites.orgId, ctx.orgId));
  let items = (await riskItems(ctx.orgId, ctx.cfg)).filter((i) => i.score != null);
  if (searchParams.module) items = items.filter((i) => i.module === searchParams.module);
  if (searchParams.zone) items = items.filter((i) => i.zone === searchParams.zone);
  if (searchParams.site) items = items.filter((i) => i.siteId === searchParams.site);
  items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return (
    <>
      <PageHead eyebrow="Semua modul" title="Risk Register" desc="Gabungan risiko berbasis matriks S×L dari HAZOP (unmitigated), FRA, HIRADC, dan COSO (residual bila tersedia). FMEA (RPN) dan LOPA (frekuensi) dinilai di modulnya." />
      <form className="card card-b mb-4 flex flex-wrap items-end gap-3">
        <div><label className="label" htmlFor="module">Modul</label><select id="module" name="module" defaultValue={searchParams.module ?? ""} className="input"><option value="">Semua</option>{["HAZOP", "FRA", "HIRADC", "COSO"].map((m) => <option key={m}>{m}</option>)}</select></div>
        <div><label className="label" htmlFor="zone">Zona</label><select id="zone" name="zone" defaultValue={searchParams.zone ?? ""} className="input"><option value="">Semua</option>{["EXTREME", "HIGH", "MEDIUM", "LOW"].map((z) => <option key={z}>{z}</option>)}</select></div>
        <div><label className="label" htmlFor="site">Site</label><select id="site" name="site" defaultValue={searchParams.site ?? ""} className="input"><option value="">Semua</option>{siteList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <button className="btn">Terapkan filter</button>
        <Link className="btn" href="/risk-register">Reset</Link>
        <span className="ml-auto text-xs text-slate-500">{items.length} risiko</span>
      </form>
      {items.length === 0 ? <Empty title="Tidak ada risiko yang cocok dengan filter" /> : (
        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Modul</th><th>Studi</th><th>Referensi</th><th>Deskripsi</th><th>S</th><th>L</th><th>Risiko</th><th>Dasar</th></tr></thead>
            <tbody>
              {items.map((i, k) => (
                <tr key={k}>
                  <td className="text-xs">{i.module}</td>
                  <td className="font-mono text-xs"><Link className="text-accent" href={`/m/${slugOf(i.module)}/${i.studyId}`}>{i.studyCode}</Link></td>
                  <td className="max-w-[220px]">{i.ref}</td>
                  <td className="max-w-[420px] text-[13px] text-slate-700">{i.description}</td>
                  <td className="num">{i.s}</td><td className="num">{i.l}</td>
                  <td><RiskBadge s={i.s} l={i.l} cfg={ctx.cfg} /></td>
                  <td className="text-xs text-slate-500">{i.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
