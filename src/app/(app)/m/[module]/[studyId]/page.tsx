import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import * as T from "@/db/schema";
import { getCtx } from "@/lib/context";
import { can } from "@/lib/permissions";
import { MODULES, MODULE_SLUG, type GridKey } from "@/lib/grids";
import { actionNumbersForStudy } from "@/lib/queries";
import { fmtSci } from "@/lib/risk";
import { EditableGrid } from "@/components/EditableGrid";
import { PageHead, Flash, Tabs, StatusPill, Empty, fmtDate, actionNo } from "@/components/ui";
import { setStudyStatus, updateStudyInfo, deleteStudy, loadFraTemplate, importLopaCandidates } from "@/app/actions/study";
import type { Row } from "@/app/actions/grid";

type SP = { tab?: string; m?: string; e?: string };

export default async function StudyPage({ params, searchParams }: { params: { module: string; studyId: string }; searchParams: SP }) {
  const module = MODULE_SLUG[params.module];
  if (!module) notFound();
  const ctx = await getCtx();
  const [study] = await db.select().from(T.studies).where(and(eq(T.studies.id, params.studyId), eq(T.studies.orgId, ctx.orgId), eq(T.studies.module, module))).limit(1);
  if (!study) notFound();
  const meta = MODULES[module];
  const editable = can(ctx.role, "edit") && study.status !== "APPROVED";
  const tab = searchParams.tab ?? "worksheet";
  const base = `/m/${params.module}/${study.id}`;
  const actionNums = await actionNumbersForStudy(ctx.orgId, study.id);
  const grid = (key: GridKey, rows: unknown[], parentId?: string, refresh?: boolean) => (
    <EditableGrid gridKey={key} studyId={study.id} parentId={parentId} initialRows={rows as Row[]} cfg={ctx.cfg} editable={editable} actionNumbers={actionNums} refreshOnChange={refresh} />
  );
  const scope = (t: { orgId: PgColumn; studyId: PgColumn }) => and(eq(t.orgId, ctx.orgId), eq(t.studyId, study.id));

  let worksheet: React.ReactNode = null;
  if (tab === "worksheet") {
    if (module === "HAZOP") {
      const nodes = await db.select().from(T.hazopNodes).where(scope(T.hazopNodes)).orderBy(asc(T.hazopNodes.sort));
      const rows = await db.select().from(T.hazopRows).where(scope(T.hazopRows)).orderBy(asc(T.hazopRows.sort));
      worksheet = (
        <div className="space-y-6">
          <section><h2 className="h2 mb-2">Daftar node</h2>{grid("hazopNode", nodes, undefined, true)}</section>
          {nodes.length === 0 && <Empty title="Belum ada node">Tambahkan node dari P&ID: satu design intent yang konsisten per node.</Empty>}
          {nodes.map((n) => (
            <section key={n.id} className="print-break">
              <div className="mb-2 rounded border border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-2"><span className="font-mono text-xs text-accent">{n.code}</span><h3 className="h2">{n.name || "(tanpa nama)"}</h3><span className="text-xs text-slate-500">Mode: {n.mode} · P&ID: {n.drawings || "–"}</span></div>
                <p className="mt-1 text-[13px] text-slate-700"><b>Design intent:</b> {n.designIntent || <span className="text-red-700">belum diisi</span>}</p>
              </div>
              {grid("hazopRow", rows.filter((r) => r.nodeId === n.id), n.id)}
            </section>
          ))}
        </div>
      );
    } else if (module === "LOPA") {
      const rows = await db.select().from(T.lopaScenarios).where(scope(T.lopaScenarios)).orderBy(asc(T.lopaScenarios.sort));
      const hz = await db.select({ id: T.studies.id, code: T.studies.code, title: T.studies.title }).from(T.studies).where(and(eq(T.studies.orgId, ctx.orgId), eq(T.studies.module, "HAZOP")));
      worksheet = (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            {editable && (
              <form action={importLopaCandidates} className="card card-b flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={study.id} />
                <div className="min-w-[220px] flex-1"><label className="label" htmlFor="hz">Impor kandidat LOPA (S ≥ 4) dari studi HAZOP</label>
                  <select id="hz" name="hazopStudyId" className="input" required>{hz.map((h) => <option key={h.id} value={h.id}>{h.code} — {h.title}</option>)}</select></div>
                <button className="btn" disabled={hz.length === 0}>Impor</button>
              </form>
            )}
            <div className="card card-b text-xs text-slate-600">
              <p className="mb-1 font-semibold text-slate-800">TMEL organisasi (per severity)</p>
              <p className="num">{Object.entries(ctx.cfg.tmel).map(([k, v]) => `S${k}: ${fmtSci(v)}`).join(" · ")} /tahun</p>
              <p className="mt-2">Aturan kredit IPL: jangan kreditkan BPCS yang menjadi penyebab; maksimal satu kredit BPCS per skenario; alarm + operator hanya bila sensor independen dan waktu respon cukup. Tulis IPL satu per baris: <code>Nama | PFD</code>.</p>
            </div>
          </div>
          {grid("lopa", rows)}
        </div>
      );
    } else if (module === "FRA") {
      const areas = await db.select().from(T.fireAreas).where(scope(T.fireAreas)).orderBy(asc(T.fireAreas.sort));
      const scen = await db.select().from(T.fireScenarios).where(scope(T.fireScenarios)).orderBy(asc(T.fireScenarios.sort));
      const comp = await db.select().from(T.complianceItems).where(scope(T.complianceItems)).orderBy(asc(T.complianceItems.sort));
      worksheet = (
        <div className="space-y-6">
          {editable && (
            <form action={loadFraTemplate} className="card card-b flex flex-wrap items-center justify-between gap-2">
              <input type="hidden" name="id" value={study.id} />
              <p className="text-[13px] text-slate-700">Muat 14 fire area tipikal PLTU beserta butir kepatuhan awal NFPA 850-2026. Area yang kodenya sudah ada dilewati.</p>
              <button className="btn">Muat template area PLTU</button>
            </form>
          )}
          <section><h2 className="h2 mb-2">Fire area register</h2>{grid("fireArea", areas, undefined, true)}</section>
          {areas.map((a) => {
            const c = comp.filter((x) => x.areaId === a.id);
            const gap = c.filter((x) => x.status === "Gap").length, open = c.filter((x) => x.status === "Belum dinilai").length;
            return (
              <section key={a.id} className="print-break space-y-3">
                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-baseline gap-2"><span className="font-mono text-xs text-accent">{a.code}</span><h3 className="h2">{a.name}</h3>
                    <span className="text-xs text-slate-500">Fire load: {a.fuelLoad || "–"} · Barrier: {a.barriers || <span className="text-red-700">belum diisi</span>}</span>
                    <span className="ml-auto text-xs">{gap > 0 && <span className="chip mr-1 bg-risk-extbg text-risk-ext">{gap} gap</span>}{open > 0 && <span className="chip bg-slate-100 text-slate-700">{open} belum dinilai</span>}</span></div>
                </div>
                <div><h4 className="eyebrow mb-1">Skenario kebakaran</h4>{grid("fireScenario", scen.filter((x) => x.areaId === a.id), a.id)}</div>
                <div><h4 className="eyebrow mb-1">Code compliance (NFPA 850 / regulasi nasional)</h4>{grid("compliance", c, a.id)}</div>
              </section>
            );
          })}
        </div>
      );
    } else {
      const table = { HIRADC: T.hiradcRows, FMEA: T.fmeaRows, COSO: T.cosoRisks }[module];
      const key = ({ HIRADC: "hiradc", FMEA: "fmea", COSO: "coso" } as const)[module];
      const rows = await db.select().from(table).where(scope(table)).orderBy(asc(table.sort));
      worksheet = (
        <div className="space-y-3">
          {module === "FMEA" && <p className="text-xs text-slate-600">Skala S/O/D 1–10. RPN = S×O×D. AP (Action Priority) adalah versi disederhanakan dari logika AIAG-VDA: prioritaskan berdasarkan severity terlebih dahulu, bukan RPN semata.</p>}
          {module === "COSO" && <p className="text-xs text-slate-600">Appetite per kategori (skor maksimum): {Object.entries(ctx.cfg.appetite).map(([k, v]) => `${k} ${v}`).join(" · ")}. Atur di Pengaturan › Matriks.</p>}
          {module === "HIRADC" && <p className="text-xs text-slate-600">Isi pengendalian tambahan mengikuti hirarki: Eliminasi → Substitusi → Rekayasa → Administratif → APD. Risiko sisa dinilai setelah pengendalian tambahan diterapkan.</p>}
          {grid(key, rows)}
        </div>
      );
    }
  }

  let other: React.ReactNode = null;
  if (tab === "info") {
    const siteList = await db.select().from(T.sites).where(eq(T.sites.orgId, ctx.orgId));
    other = (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form action={updateStudyInfo} className="card card-b grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={study.id} />
          <div><label className="label" htmlFor="title">Judul</label><input id="title" name="title" defaultValue={study.title} className="input" disabled={!editable} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="code">Kode</label><input id="code" name="code" defaultValue={study.code} className="input" disabled={!editable} /></div>
            <div><label className="label" htmlFor="siteId">Site</label><select id="siteId" name="siteId" defaultValue={study.siteId ?? ""} className="input" disabled={!editable}><option value="">–</option>{siteList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          </div>
          <div className="md:col-span-2"><label className="label" htmlFor="scope">Lingkup & batas sistem</label><textarea id="scope" name="scope" rows={3} defaultValue={study.scope} className="input" disabled={!editable} /></div>
          <div><label className="label" htmlFor="references">Dokumen acuan (no. gambar / revisi)</label><textarea id="references" name="references" rows={6} defaultValue={study.references} className="input font-mono" disabled={!editable} /></div>
          <div><label className="label" htmlFor="team">Tim & kehadiran (nama — peran — sesi)</label><textarea id="team" name="team" rows={6} defaultValue={study.team} className="input" disabled={!editable} /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="assumptions">Register asumsi</label><textarea id="assumptions" name="assumptions" rows={4} defaultValue={study.assumptions} className="input" disabled={!editable} /></div>
          {editable && <div className="md:col-span-2"><button className="btn btn-primary">Simpan informasi</button></div>}
        </form>
        <div className="space-y-4">
          <div className="card card-b text-[13px]">
            <div className="eyebrow mb-2">Persetujuan</div>
            <p>Status: <StatusPill status={study.status} /> · Rev. {study.version}</p>
            <p className="mt-1 text-slate-600">Disetujui: {study.approvedBy ? `${study.approvedBy}, ${fmtDate(study.approvedAt)}` : "–"}</p>
            <p className="mt-1 text-slate-600">Dibuat: {fmtDate(study.createdAt)} · Diperbarui: {fmtDate(study.updatedAt)}</p>
          </div>
          {can(ctx.role, "manageOrg") && (
            <form action={deleteStudy} className="card card-b space-y-2">
              <input type="hidden" name="id" value={study.id} />
              <div className="eyebrow">Hapus studi</div>
              <p className="text-xs text-slate-600">Seluruh worksheet ikut terhapus. Aksi di tracker tetap tersimpan. Ketik <code>{study.code}</code> untuk konfirmasi.</p>
              <input name="confirm" className="input" aria-label="Konfirmasi kode studi" />
              <button className="btn btn-danger btn-sm">Hapus permanen</button>
            </form>
          )}
        </div>
      </div>
    );
  } else if (tab === "actions") {
    const acts = await db.select().from(T.actions).where(and(eq(T.actions.orgId, ctx.orgId), eq(T.actions.studyId, study.id))).orderBy(desc(T.actions.number));
    other = acts.length === 0 ? <Empty title="Belum ada aksi dari studi ini">Gunakan tombol “→ Aksi” pada baris worksheet yang memiliki rekomendasi.</Empty> : (
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>No.</th><th>Sumber</th><th>Deskripsi</th><th>Pemilik</th><th>Tenggat</th><th>Status</th></tr></thead>
          <tbody>{acts.map((a) => <tr key={a.id}><td className="font-mono text-xs">{actionNo(a.number)}</td><td className="text-xs">{a.sourceLabel}</td><td>{a.description}</td><td>{a.owner || "–"}</td><td className="text-xs">{fmtDate(a.dueDate)}</td><td><StatusPill status={a.status} /></td></tr>)}</tbody>
        </table>
        <div className="p-3 text-right"><Link className="text-xs text-accent" href="/actions">Kelola di tracker rekomendasi →</Link></div>
      </div>
    );
  }

  const canSubmit = can(ctx.role, "edit") && study.status === "DRAFT";
  const canApprove = can(ctx.role, "approve") && study.status === "IN_REVIEW";
  const canRevise = can(ctx.role, "createStudy") && study.status === "APPROVED";
  const op = (o: string, label: string, cls = "btn") => (
    <form action={setStudyStatus}><input type="hidden" name="id" value={study.id} /><input type="hidden" name="op" value={o} /><button className={cls}>{label}</button></form>
  );

  return (
    <>
      <div className="mb-1 text-xs text-slate-500"><Link className="hover:text-accent" href={`/m/${params.module}`}>{meta.label}</Link> / {study.code}</div>
      <PageHead eyebrow={`${meta.standard} · ${study.code} · Rev. ${study.version}`} title={study.title}>
        <StatusPill status={study.status} />
        {canSubmit && op("submit", "Ajukan review", "btn btn-primary")}
        {canApprove && op("approve", "Setujui", "btn btn-primary")}
        {canApprove && op("return", "Kembalikan ke Draft")}
        {canRevise && op("revise", "Buat revisi baru")}
        <Link className="btn" href={`${base}/report`}>Laporan</Link>
        <a className="btn" href={`/api/export/${study.id}`}>Ekspor Excel</a>
      </PageHead>
      <Flash m={searchParams.m} e={searchParams.e} />
      {study.status === "APPROVED" && <p className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">Studi disetujui oleh {study.approvedBy} pada {fmtDate(study.approvedAt)} dan terkunci. Gunakan “Buat revisi baru” untuk perubahan.</p>}
      <Tabs base={base} active={tab} tabs={[{ key: "worksheet", label: "Worksheet" }, { key: "info", label: "Informasi, tim & asumsi" }, { key: "actions", label: "Rekomendasi" }]} />
      {tab === "worksheet" ? worksheet : other}
    </>
  );
}
