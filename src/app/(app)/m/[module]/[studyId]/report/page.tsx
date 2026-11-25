import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { studies, actions, sites } from "@/db/schema";
import { getCtx } from "@/lib/context";
import { MODULES, MODULE_SLUG } from "@/lib/grids";
import { studySheets } from "@/lib/study-data";
import { ZONE_LABEL, type Zone } from "@/lib/risk";
import { ZONE_CLS } from "@/components/risk";
import { PrintButton } from "@/components/PrintButton";
import { StatusPill, fmtDate, actionNo, STATUS_LABEL } from "@/components/ui";

const METHOD: Record<string, string> = {
  HAZOP: "Studi dilakukan per node P&ID sesuai IEC 61882:2016. Untuk setiap parameter diterapkan guideword untuk membentuk deviasi; penyebab dicatat di dalam batas node; konsekuensi ditulis tanpa safeguard (unmitigated); safeguard dicatat terpisah dan ditandai kandidat IPL bila independen, spesifik, dapat diandalkan, dan dapat diaudit. Baris dengan severity ≥ 4 diteruskan ke LOPA.",
  LOPA: "Layer of Protection Analysis mengikuti IEC 61511-3 dan pedoman CCPS: frekuensi skenario termitigasi = IEF × Π PFD IPL × modifier kondisional, dibandingkan dengan Target Mitigated Event Likelihood (TMEL). Rasio keduanya (RRF) menentukan kebutuhan SIF dan SIL.",
  FRA: "Fire Risk Assessment berbasis skenario mengikuti NFPA 551 dan NFPA 850 (edisi 2026): fire area ditetapkan, skenario kebakaran kredibel dikembangkan, proteksi eksisting dan keandalannya dievaluasi, risiko dinilai sebelum dan sesudah proteksi, dan kepatuhan terhadap ketentuan NFPA 850 serta regulasi nasional dicatat sebagai bahan Fire Protection Design Basis Document (FPDBD).",
  HIRADC: "Identifikasi bahaya, penilaian dan pengendalian risiko sesuai PP 50/2012 (SMK3) dan ISO 45001: per aktivitas rutin, non-rutin, dan darurat; pengendalian tambahan mengikuti hirarki eliminasi, substitusi, rekayasa, administratif, APD; risiko sisa dinilai ulang.",
  FMEA: "FMEA peralatan dengan skala Severity, Occurrence, Detection 1–10. RPN = S×O×D; Action Priority disederhanakan dari logika AIAG-VDA untuk mendahulukan mode kegagalan bersevere tinggi.",
  COSO: "Register risiko perusahaan mengikuti COSO ERM 2017 dan ISO 31000: risiko dikaitkan dengan sasaran dan kategori, dinilai inheren dan residual, dibandingkan dengan risk appetite per kategori, diberi respons (Accept, Avoid, Reduce, Share), dan dipantau dengan KRI.",
};

export default async function Report({ params }: { params: { module: string; studyId: string } }) {
  const module = MODULE_SLUG[params.module];
  if (!module) notFound();
  const ctx = await getCtx();
  const [study] = await db.select().from(studies).where(and(eq(studies.id, params.studyId), eq(studies.orgId, ctx.orgId))).limit(1);
  if (!study) notFound();
  const sheets = await studySheets(ctx.orgId, study, ctx.cfg);
  const acts = await db.select().from(actions).where(and(eq(actions.orgId, ctx.orgId), eq(actions.studyId, study.id))).orderBy(asc(actions.number));
  const site = study.siteId ? (await db.select().from(sites).where(eq(sites.id, study.siteId)))[0] : null;
  const zoneCount: Record<Zone, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, EXTREME: 0 };
  sheets.forEach((s) => s.zones.forEach((z) => z && zoneCount[z]++));
  const meta = MODULES[module];
  let sec = 0;
  const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 mt-6 text-base font-semibold">{++sec}. {children}</h2>;

  return (
    <article className="mx-auto max-w-[1100px] rounded-md bg-white p-6 shadow-sm print:p-0 print:shadow-none">
      <div className="no-print mb-4 flex flex-wrap gap-2"><Link className="btn" href={`/m/${params.module}/${study.id}`}>← Kembali ke studi</Link><PrintButton /><a className="btn" href={`/api/export/${study.id}`}>Ekspor Excel</a></div>
      <header className="border-b-2 border-slate-900 pb-4">
        <div className="eyebrow">{ctx.orgName}{site ? ` · ${site.name}` : ""}</div>
        <h1 className="mt-1 text-2xl font-bold">Laporan {meta.label}: {study.title}</h1>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] md:grid-cols-4">
          <div><span className="text-slate-500">Kode</span><br /><b>{study.code}</b></div>
          <div><span className="text-slate-500">Revisi</span><br /><b>Rev. {study.version}</b></div>
          <div><span className="text-slate-500">Status</span><br /><StatusPill status={study.status} /></div>
          <div><span className="text-slate-500">Disetujui</span><br /><b>{study.approvedBy ? `${study.approvedBy}, ${fmtDate(study.approvedAt)}` : "Belum"}</b></div>
        </div>
        {ctx.isDemo && <p className="mt-2 text-xs font-semibold text-amber-700">DATA DEMO — bukan data plant nyata.</p>}
      </header>

      <H>Ringkasan eksekutif</H>
      <div className="flex flex-wrap gap-2 text-[13px]">
        {(Object.keys(zoneCount) as Zone[]).map((z) => <span key={z} className={`chip ${ZONE_CLS[z]}`}>{ZONE_LABEL[z]}: {zoneCount[z]}</span>)}
        <span className="chip bg-slate-100 text-slate-700">Rekomendasi: {acts.length} ({acts.filter((a) => a.status === "CLOSED").length} closed)</span>
      </div>
      <p className="mt-2 text-[13px] text-slate-700">Jumlah risiko per zona dihitung dari nilai risiko terakhir pada setiap baris worksheet (residual bila tersedia). Risiko High dan Extreme memerlukan tindakan sesuai kriteria organisasi: {ctx.cfg.zoneActions.HIGH}</p>

      <H>Lingkup dan dokumen acuan</H>
      <p className="whitespace-pre-wrap text-[13px]">{study.scope || "–"}</p>
      <p className="mt-2 text-xs font-semibold text-slate-600">Dokumen acuan</p>
      <p className="whitespace-pre-wrap font-mono text-xs">{study.references || "–"}</p>

      <H>Metodologi dan kriteria risiko</H>
      <p className="text-[13px]">{METHOD[module]}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="tbl text-xs">
          <thead><tr><th>S</th><th>Label</th><th>Manusia</th><th>Aset</th><th>Produksi</th><th>Lingkungan</th><th>Reputasi/regulasi</th></tr></thead>
          <tbody>{ctx.cfg.severity.map((s) => <tr key={s.level}><td>S{s.level}</td><td>{s.label}</td><td>{s.people}</td><td>{s.asset}</td><td>{s.production}</td><td>{s.environment}</td><td>{s.reputation}</td></tr>)}</tbody>
        </table>
        <table className="tbl mt-2 text-xs">
          <thead><tr><th>L</th><th>Label</th><th>Frekuensi</th></tr></thead>
          <tbody>{ctx.cfg.likelihood.map((l) => <tr key={l.level}><td>L{l.level}</td><td>{l.label}</td><td>{l.frequency}</td></tr>)}</tbody>
        </table>
        <p className="mt-1 text-xs text-slate-600">Zona: Low ≤ {ctx.cfg.thresholds.low}; Medium ≤ {ctx.cfg.thresholds.medium}; High ≤ {ctx.cfg.thresholds.high}; Extreme di atasnya.</p>
      </div>

      <H>Tim dan asumsi</H>
      <div className="grid gap-4 md:grid-cols-2 text-[13px]">
        <div><p className="text-xs font-semibold text-slate-600">Tim & kehadiran</p><p className="whitespace-pre-wrap">{study.team || "–"}</p></div>
        <div><p className="text-xs font-semibold text-slate-600">Register asumsi</p><p className="whitespace-pre-wrap">{study.assumptions || "–"}</p></div>
      </div>

      <H>Worksheet</H>
      {sheets.map((s, i) => (
        <section key={i} className="mb-5">
          <h3 className="mb-1 text-[13px] font-semibold">{s.title}{s.group ? ` — ${s.group}` : ""}</h3>
          {s.rows.length === 0 ? <p className="text-xs text-slate-500">Tidak ada baris.</p> : (
            <div className="overflow-x-auto">
              <table className="tbl text-[11px]">
                <thead><tr><th>#</th>{s.headers.map((h) => <th key={h} className="whitespace-normal">{h}</th>)}</tr></thead>
                <tbody>{s.rows.map((r, ri) => <tr key={ri}><td>{ri + 1}</td>{r.map((c, ci) => <td key={ci} className={`whitespace-pre-wrap ${ci === r.length - 1 && s.zones[ri] ? ZONE_CLS[s.zones[ri]!] : ""}`}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <H>Register rekomendasi</H>
      {acts.length === 0 ? <p className="text-[13px] text-slate-500">Belum ada rekomendasi yang dijadikan aksi.</p> : (
        <div className="overflow-x-auto">
          <table className="tbl text-xs">
            <thead><tr><th>No.</th><th>Sumber</th><th>Deskripsi</th><th>Pemilik</th><th>Tenggat</th><th>Prioritas</th><th>Status</th></tr></thead>
            <tbody>{acts.map((a) => <tr key={a.id}><td className="font-mono">{actionNo(a.number)}</td><td>{a.sourceLabel}</td><td>{a.description}</td><td>{a.owner || "–"}</td><td>{fmtDate(a.dueDate)}</td><td>{a.priority}</td><td>{STATUS_LABEL[a.status]}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <p className="mt-6 border-t border-slate-200 pt-2 text-[11px] text-slate-500">Dibuat oleh RISKA pada {fmtDate(new Date())}. Peringkat risiko adalah hasil penilaian tim dan harus dibaca bersama asumsi dan batasan studi.</p>
    </article>
  );
}
