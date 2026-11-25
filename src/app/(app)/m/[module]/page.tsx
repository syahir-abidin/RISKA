import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { studies, sites } from "@/db/schema";
import { getCtx } from "@/lib/context";
import { can } from "@/lib/permissions";
import { MODULES, MODULE_SLUG } from "@/lib/grids";
import { createStudy } from "@/app/actions/study";
import { PageHead, Flash, StatusPill, Empty, fmtDate } from "@/components/ui";

export default async function ModuleList({ params, searchParams }: { params: { module: string }; searchParams: { e?: string } }) {
  const module = MODULE_SLUG[params.module];
  if (!module) notFound();
  const ctx = await getCtx();
  const meta = MODULES[module];
  const [list, siteList] = await Promise.all([
    db.select().from(studies).where(and(eq(studies.orgId, ctx.orgId), eq(studies.module, module))).orderBy(desc(studies.updatedAt)),
    db.select().from(sites).where(eq(sites.orgId, ctx.orgId)),
  ]);
  const siteName = new Map(siteList.map((s) => [s.id, s.name]));
  return (
    <>
      <PageHead eyebrow={meta.standard} title={`Studi ${meta.label}`} desc={meta.description} />
      <Flash e={searchParams.e} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-w-0">
          <div className="card-h"><h2 className="h2">Daftar studi</h2><span className="text-xs text-slate-500">{list.length} studi</span></div>
          {list.length === 0 ? <div className="p-4"><Empty title="Belum ada studi">Buat studi pertama melalui formulir di samping.</Empty></div> : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead><tr><th>Kode</th><th>Judul</th><th>Site</th><th>Status</th><th>Versi</th><th>Diperbarui</th></tr></thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs"><Link className="text-accent" href={`/m/${params.module}/${s.id}`}>{s.code}</Link></td>
                      <td><Link className="font-medium hover:text-accent" href={`/m/${params.module}/${s.id}`}>{s.title}</Link></td>
                      <td className="text-xs">{s.siteId ? siteName.get(s.siteId) : "–"}</td>
                      <td><StatusPill status={s.status} /></td>
                      <td className="num">Rev. {s.version}</td>
                      <td className="text-xs text-slate-500">{fmtDate(s.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="card self-start">
          <div className="card-h"><h2 className="h2">Studi baru</h2></div>
          {can(ctx.role, "createStudy") ? (
            <form action={createStudy} className="card-b space-y-3">
              <input type="hidden" name="module" value={module} />
              <div><label className="label" htmlFor="title">Judul studi</label><input id="title" name="title" required minLength={3} className="input" placeholder={`mis. ${meta.label} Deaerator & HP Heater Unit 1`} /></div>
              <div><label className="label" htmlFor="code">Kode (opsional, otomatis bila kosong)</label><input id="code" name="code" className="input" /></div>
              <div><label className="label" htmlFor="siteId">Site</label>
                <select id="siteId" name="siteId" className="input"><option value="">–</option>{siteList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="label" htmlFor="scope">Lingkup</label><textarea id="scope" name="scope" rows={3} className="input" /></div>
              <div><label className="label" htmlFor="references">Dokumen acuan (no. gambar / revisi, satu per baris)</label><textarea id="references" name="references" rows={3} className="input" /></div>
              <button className="btn btn-primary w-full">Buat studi</button>
            </form>
          ) : <p className="card-b text-[13px] text-slate-600">Peran Anda tidak dapat membuat studi. Hubungi Owner, Admin, atau Facilitator.</p>}
        </section>
      </div>
    </>
  );
}
